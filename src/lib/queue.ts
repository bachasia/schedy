import Queue from "bull";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";
import {
  publishToFacebook as publishToFacebookAPI,
  publishToInstagram as publishToInstagramAPI,
  handleFacebookError,
} from "@/lib/social/facebook";
import {
  publishToTikTok as publishToTikTokAPI,
  handleTikTokError,
} from "@/lib/social/tiktok";
import {
  publishToTwitter as publishToTwitterAPI,
  handleTwitterError,
} from "@/lib/social/twitter";
import {
  publishToYouTube as publishToYouTubeAPI,
  handleYouTubeError,
} from "@/lib/social/youtube";
import { ensureValidToken } from "@/lib/social/token-manager";

// Redis connection configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
};

// Job data interface
interface PostJobData {
  postId: string;
  userId: string;
}

// Create Bull queue for social media posts
// Handle Redis connection errors gracefully (especially during build time)
let socialPostsQueue: InstanceType<typeof Queue<PostJobData>>;

try {
  socialPostsQueue = new Queue<PostJobData>("social-posts", {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3, // Retry failed jobs up to 3 times
      backoff: {
        type: "exponential",
        delay: 2000, // Start with 2 second delay, then 4s, 8s
      },
      removeOnComplete: false, // Keep completed jobs for monitoring
      removeOnFail: false, // Keep failed jobs for debugging
    },
  });

  // Handle connection errors gracefully
  socialPostsQueue.on("error", (error: any) => {
    // Suppress errors during build time
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

    if (isBuildTime) {
      // Silently ignore during build - Redis is not available
      return;
    }

    // In runtime, only log if it's a connection error and Redis might not be ready yet
    // Don't spam logs if Redis is temporarily unavailable
    if (error?.code === "ECONNREFUSED") {
      // Only log once per minute to avoid spam
      const lastLogTime = (global as any).__lastQueueErrorLog || 0;
      const now = Date.now();
      if (now - lastLogTime > 60000) { // Log max once per minute
        console.warn("[Queue] Redis connection refused - queue operations will retry automatically");
        (global as any).__lastQueueErrorLog = now;
      }
      return;
    }

    // Log other errors
    console.error("[Queue] Queue error:", error);
  });
} catch (error) {
  // During build time, Redis may not be available - this is OK
  // Create a minimal mock queue for build time
  console.warn("[Queue] Queue initialization skipped (OK during build)");
  socialPostsQueue = {
    add: () => Promise.resolve({ id: "dummy" } as any),
    process: () => { },
    on: () => { },
    getJob: () => Promise.resolve(null),
    remove: () => Promise.resolve(true),
    getJobs: () => Promise.resolve([]),
    getJobCounts: () => Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    clean: () => Promise.resolve([]),
  } as any;
}

export { socialPostsQueue };

/**
 * Process a post publishing job
 */
socialPostsQueue.process(async (job) => {
  const { postId, userId } = job.data as PostJobData;

  // Log retry attempts
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts || 3;

  console.log(
    `[Queue] Processing post ${postId} for user ${userId} (attempt ${attemptNumber}/${maxAttempts})`
  );

  try {
    // 1. Load post from database with profile information
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        profile: true,
        user: true,
      },
    });

    if (!post) {
      // Post may have been deleted - mark job as completed to avoid retries
      console.warn(`[Queue] Post ${postId} not found - may have been deleted. Skipping.`);
      return {
        success: false,
        skipped: true,
        reason: "Post not found (may have been deleted)"
      };
    }

    // Verify ownership
    if (post.userId !== userId) {
      throw new Error(`User ${userId} does not own post ${postId}`);
    }

    // Check if post is in correct status for publishing
    // If status is PUBLISHING, it might be from a previous failed attempt - reset to SCHEDULED
    if (post.status === PostStatus.PUBLISHING) {
      console.log(
        `[Queue] Post ${postId} is in PUBLISHING status (likely from previous attempt), resetting to SCHEDULED`
      );
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.SCHEDULED,
          updatedAt: new Date(),
        },
      });
      // Continue processing
    } else if (post.status !== PostStatus.SCHEDULED && post.status !== PostStatus.PUBLISHED) {
      console.log(
        `[Queue] Post ${postId} cannot be published (status: ${post.status}), skipping`,
      );
      return { skipped: true, reason: `Post status is ${post.status}` };
    }

    // If already published, skip
    if (post.publishedAt) {
      console.log(
        `[Queue] Post ${postId} already published at ${post.publishedAt}, skipping`,
      );
      return { skipped: true, reason: "Post already published" };
    }

    // 2. Update status to PUBLISHING
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHING,
        updatedAt: new Date(),
      },
    });

    console.log(`[Queue] Publishing post ${postId} to ${post.platform}...`);

    // 3. Get profile credentials
    const { profile } = post;

    if (!profile.isActive) {
      throw new Error(`Profile ${profile.id} is not active`);
    }

    // 4. Check and refresh token if needed (pre-publish check)
    console.log(`[Queue] Checking token validity for profile ${profile.id}...`);
    const tokenValid = await ensureValidToken(profile.id);

    if (!tokenValid) {
      throw new Error(
        `Token validation failed for profile ${profile.id}. ` +
        `The profile may have been marked inactive. Please re-authenticate.`
      );
    }

    // 5. Call appropriate social media API based on platform
    const result = await publishToSocialMedia(post, profile);

    // 6. Handle success
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
        metadata: result.metadata || {},
        updatedAt: new Date(),
      },
    });

    console.log(
      `[Queue] Successfully published post ${postId} (platform ID: ${result.platformPostId})`,
    );

    return {
      success: true,
      platformPostId: result.platformPostId,
      publishedAt: new Date().toISOString(),
    };
  } catch (error) {
    // 7. Handle failure
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check if error is non-retryable (e.g., spam_risk, invalid token)
    const isNonRetryable = (error as any)?.isNonRetryable === true;
    const isLastAttempt = attemptNumber >= maxAttempts || isNonRetryable;

    console.error(
      `[Queue] Failed to publish post ${postId} (attempt ${attemptNumber}/${maxAttempts}):`,
      errorMessage
    );

    if (isNonRetryable) {
      console.error(
        `[Queue] Non-retryable error for post ${postId}: ${errorMessage}. Marking as FAILED immediately.`
      );
    }

    if (isLastAttempt) {
      // Final failure - update post status
      console.error(`[Queue] All retry attempts exhausted for post ${postId}`);

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
          failedAt: new Date(),
          errorMessage: isNonRetryable
            ? `${errorMessage} (non-retryable error)`
            : `${errorMessage} (after ${maxAttempts} attempts)`,
          updatedAt: new Date(),
        },
      });
    } else {
      // Will retry - reset status to SCHEDULED so it can be retried
      const nextAttempt = attemptNumber + 1;
      const nextDelay = Math.pow(2, attemptNumber) * 2000; // Exponential backoff: 2s, 4s, 8s

      console.log(
        `[Queue] Will retry post ${postId} in ${nextDelay}ms (attempt ${nextAttempt}/${maxAttempts})`
      );

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.SCHEDULED, // Reset to SCHEDULED for retry
          errorMessage: `${errorMessage} (attempt ${attemptNumber}/${maxAttempts}, retrying...)`,
          updatedAt: new Date(),
        },
      });
    }

    throw error; // Re-throw to mark job as failed and trigger retry
  }
});

/**
 * Publish post to social media platform
 */
async function publishToSocialMedia(
  post: any,
  profile: any,
): Promise<{ platformPostId: string; metadata?: any }> {
  const { platform, content, mediaUrls, postFormat } = post;
  const format = postFormat || "POST";

  // Log postFormat for debugging
  console.log(`[Queue] Post ${post.id} - postFormat from database:`, postFormat);
  console.log(`[Queue] Post ${post.id} - Using format:`, format);
  console.log(`[Queue] Post ${post.id} - Platform:`, platform);

  try {
    switch (platform) {
      case "FACEBOOK":
        return await publishToFacebook(post.id, profile.id, content, mediaUrls, format);

      case "INSTAGRAM":
        return await publishToInstagram(post.id, profile.id, content, mediaUrls, format);

      case "TWITTER":
        return await publishToTwitter(post.id, profile.id, content, mediaUrls);

      case "TIKTOK":
        return await publishToTikTok(post.id, profile.id, content, mediaUrls);

      case "YOUTUBE":
        return await publishToYouTube(post.id, profile.id, content, mediaUrls, format);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error: any) {
    // Handle platform-specific errors
    if (platform === "FACEBOOK" || platform === "INSTAGRAM") {
      const errorMessage = handleFacebookError(error);
      throw new Error(errorMessage);
    } else if (platform === "TIKTOK") {
      const errorMessage = handleTikTokError(error);
      throw new Error(errorMessage);
    } else if (platform === "TWITTER") {
      const errorMessage = handleTwitterError(error);
      throw new Error(errorMessage);
    } else if (platform === "YOUTUBE") {
      const errorMessage = handleYouTubeError(error);
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Facebook API integration
 */
async function publishToFacebook(
  postId: string,
  profileId: string,
  content: string,
  mediaUrls: string,
  postFormat: "POST" | "REEL" = "POST",
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Facebook] Publishing post ${postId} to profile ${profileId}`);
  console.log(`[Facebook] Post format:`, postFormat);
  console.log(`[Facebook] Raw mediaUrls string:`, mediaUrls);

  // Parse media URLs (stored as comma-separated string in SQLite)
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];
  console.log(`[Facebook] Parsed mediaArray:`, mediaArray);
  console.log(`[Facebook] Media count:`, mediaArray.length);

  if (mediaArray.length > 0) {
    console.log(`[Facebook] First media URL:`, mediaArray[0]);
    // Verify URL is accessible
    try {
      const testResponse = await fetch(mediaArray[0], { method: "HEAD" });
      console.log(`[Facebook] Media URL accessibility check:`, testResponse.status, testResponse.statusText);
    } catch (error) {
      console.error(`[Facebook] Error checking media URL:`, error);
    }
  }

  // Add delay for Reels when posting to multiple accounts to avoid rate limiting
  if (postFormat === "REEL") {
    // Add a small random delay (1-3 seconds) to space out requests
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    console.log(`[Facebook] Adding ${delay}ms delay for Reel to avoid rate limiting`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Call real Facebook API with postFormat
  const result = await publishToFacebookAPI(profileId, content, mediaArray, postFormat);

  console.log(`[Facebook] Successfully published to Facebook. Post ID: ${result.id}`);

  return {
    platformPostId: result.id,
    metadata: {
      platform: "facebook",
      publishedAt: new Date().toISOString(),
      postId: result.post_id,
    },
  };
}

/**
 * Instagram API integration
 */
async function publishToInstagram(
  postId: string,
  profileId: string,
  content: string,
  mediaUrls: string,
  postFormat: "POST" | "REEL" = "POST",
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Instagram] Publishing post ${postId} to profile ${profileId}`);
  console.log(`[Instagram] Post format:`, postFormat);

  // Parse media URLs
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

  // Instagram API requires media for all post types (POST and REEL)
  if (mediaArray.length === 0) {
    throw new Error("Instagram posts require at least one media file");
  }

  // Add delay for Reels when posting to multiple accounts to avoid rate limiting
  // This helps prevent the "Invalid parameter" error when multiple accounts try to access the same video URL
  if (postFormat === "REEL") {
    // Check if there are other Instagram Reel posts being processed
    // Add a small random delay (1-3 seconds) to space out requests
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    console.log(`[Instagram] Adding ${delay}ms delay for Reel to avoid rate limiting`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Call real Instagram API with postFormat
  const result = await publishToInstagramAPI(profileId, content, mediaArray, postFormat);

  console.log(`[Instagram] Successfully published to Instagram. Post ID: ${result.id}`);

  return {
    platformPostId: result.shortcode || result.id, // Use shortcode if available, fallback to media ID
    metadata: {
      platform: "instagram",
      publishedAt: new Date().toISOString(),
      shortcode: result.shortcode,
      mediaId: result.id,
      media_type: result.media_type,
      postFormat: postFormat,
    },
  };
}

/**
 * Twitter API integration
 */
async function publishToTwitter(
  postId: string,
  profileId: string,
  content: string,
  mediaUrls: string,
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Twitter] Publishing post ${postId} to profile ${profileId}`);

  // Call real Twitter API
  const result = await publishToTwitterAPI(profileId, postId, content, mediaUrls);

  console.log(`[Twitter] Successfully published to Twitter. Tweet ID: ${result.platformPostId}`);

  return result;
}

/**
 * TikTok API integration
 */
async function publishToTikTok(
  postId: string,
  profileId: string,
  content: string,
  mediaUrls: string,
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[TikTok] Publishing post ${postId} to profile ${profileId}`);

  // Parse media URLs
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

  if (mediaArray.length === 0) {
    throw new Error("TikTok posts require at least one video file");
  }

  // TikTok only supports single video
  if (mediaArray.length > 1) {
    console.warn(`[TikTok] Multiple media files provided, using first video only`);
  }

  const videoUrl = mediaArray[0];

  // Call real TikTok API
  const result = await publishToTikTokAPI(profileId, postId, content, videoUrl);

  console.log(`[TikTok] Successfully published to TikTok. Publish ID: ${result.platformPostId}`);

  return result;
}

/**
 * YouTube API integration
 */
async function publishToYouTube(
  postId: string,
  profileId: string,
  content: string,
  mediaUrls: string,
  postFormat: "POST" | "REEL" | "SHORT" | "STORY" = "POST",
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[YouTube] Publishing post ${postId} to profile ${profileId}`);
  console.log(`[YouTube] Post format: ${postFormat}`);

  // Parse media URLs
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

  if (mediaArray.length === 0) {
    throw new Error("YouTube posts require at least one video file");
  }

  // YouTube only supports single video
  if (mediaArray.length > 1) {
    console.warn(`[YouTube] Multiple media files provided, using first video only`);
  }

  const videoUrl = mediaArray[0];

  // For SHORT format, we'll add #Shorts to the title instead of description
  // This is more reliable for YouTube Shorts detection
  let videoTitle: string;
  let finalContent = content;

  if (postFormat === "SHORT") {
    // Extract title from content (first line or first 100 chars)
    const titleMatch = content.match(/^(.+?)(?:\n|$)/);
    const baseTitle = titleMatch ? titleMatch[1].substring(0, 92) : content.substring(0, 92) || "Untitled";

    // Add #Shorts to title if not already present
    if (!baseTitle.includes("#Shorts") && !baseTitle.includes("#shorts")) {
      videoTitle = `${baseTitle.trim()} #Shorts`;
      console.log(`[YouTube] Added #Shorts tag to title for SHORT format`);
    } else {
      videoTitle = baseTitle.trim();
    }
  } else {
    // For regular videos, extract title normally
    const titleMatch = content.match(/^(.+?)(?:\n|$)/);
    videoTitle = titleMatch ? titleMatch[1].substring(0, 100) : content.substring(0, 100) || "Untitled Video";
  }

  // Call real YouTube API - pass mediaUrls as comma-separated string and title separately
  const result = await publishToYouTubeAPI(profileId, postId, finalContent, mediaUrls, videoTitle);

  console.log(`[YouTube] Successfully published to YouTube. Video ID: ${result.platformPostId}`);

  return result;

}

/**
 * Add a post to the publishing queue with timeout
 * @param postId - ID of the post to publish
 * @param userId - ID of the user who owns the post
 * @param scheduledAt - When to publish the post (optional, defaults to immediate)
 * @returns Job ID
 */
export async function addPostToQueue(
  postId: string,
  userId: string,
  scheduledAt?: Date,
): Promise<string> {
  const delay = scheduledAt
    ? Math.max(0, scheduledAt.getTime() - Date.now())
    : 0;

  // Add timeout to prevent hanging if Redis is down
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(
        "Queue operation timed out. Please ensure Redis is running and accessible. " +
        `Check connection at ${redisConfig.host}:${redisConfig.port}`
      ));
    }, 5000); // 5 second timeout
  });

  try {
    const job = await Promise.race([
      socialPostsQueue.add(
        { postId, userId },
        {
          delay,
          jobId: `post-${postId}`, // Use post ID as job ID for easy lookup
        },
      ),
      timeoutPromise
    ]);

    console.log(
      `[Queue] Added post ${postId} to queue (job ID: ${job.id}, delay: ${delay}ms)`,
    );

    return job.id?.toString() || "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown queue error";
    console.error(`[Queue] Failed to add post ${postId} to queue:`, errorMessage);
    throw new Error(`Queue error: ${errorMessage}`);
  }
}

/**
 * Remove a post from the publishing queue
 * @param postId - ID of the post to remove
 * @returns True if job was removed, false if not found
 */
export async function removePostFromQueue(postId: string): Promise<boolean> {
  const jobId = `post-${postId}`;

  try {
    const job = await socialPostsQueue.getJob(jobId);

    if (!job) {
      console.log(`[Queue] Job ${jobId} not found`);
      return false;
    }

    await job.remove();
    console.log(`[Queue] Removed job ${jobId} from queue`);
    return true;
  } catch (error) {
    console.error(`[Queue] Error removing job ${jobId}:`, error);
    return false;
  }
}

/**
 * Retry a failed post by re-adding it to the queue
 * @param postId - ID of the failed post
 * @returns Job ID if successful, null if post not found or not failed
 */
export async function retryFailedPost(postId: string): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      status: true,
      scheduledAt: true,
    },
  });

  if (!post) {
    console.log(`[Queue] Post ${postId} not found`);
    return null;
  }

  if (post.status !== PostStatus.FAILED) {
    console.log(`[Queue] Post ${postId} is not failed (status: ${post.status})`);
    return null;
  }

  // Reset post status to SCHEDULED
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.SCHEDULED,
      failedAt: null,
      errorMessage: null,
      updatedAt: new Date(),
    },
  });

  // Re-add to queue (publish immediately or at original scheduled time)
  const scheduledAt = post.scheduledAt || new Date();
  const jobId = await addPostToQueue(post.id, post.userId, scheduledAt);

  console.log(`[Queue] Retrying post ${postId} (job ID: ${jobId})`);

  return jobId;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    socialPostsQueue.getWaitingCount(),
    socialPostsQueue.getActiveCount(),
    socialPostsQueue.getCompletedCount(),
    socialPostsQueue.getFailedCount(),
    socialPostsQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean old completed jobs (keep last 24 hours)
 */
export async function cleanOldJobs() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  await socialPostsQueue.clean(oneDayAgo, "completed");
  await socialPostsQueue.clean(oneDayAgo, "failed");

  console.log(`[Queue] Cleaned jobs older than 24 hours`);
}

/**
 * Manually publish a post immediately (bypass queue, for testing/admin)
 * @param postId - ID of the post to publish
 * @returns Result of publishing attempt
 */
export async function publishPostImmediately(postId: string): Promise<{
  success: boolean;
  platformPostId?: string;
  error?: string;
}> {
  console.log(`[Queue] Manually publishing post ${postId} immediately`);

  try {
    // Load post with profile
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        profile: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (!post.profile.isActive) {
      throw new Error(`Profile ${post.profile.id} is not active`);
    }

    // Update status to PUBLISHING
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHING,
        updatedAt: new Date(),
      },
    });

    // Publish to social media
    const result = await publishToSocialMedia(post, post.profile);

    // Update to PUBLISHED
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
        metadata: result.metadata || {},
        updatedAt: new Date(),
      },
    });

    console.log(
      `[Queue] Successfully published post ${postId} immediately (platform ID: ${result.platformPostId})`
    );

    return {
      success: true,
      platformPostId: result.platformPostId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[Queue] Failed to publish post ${postId} immediately:`, errorMessage);

    // Update to FAILED
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Event listeners for monitoring
socialPostsQueue.on("completed", (job, result) => {
  const attemptsMade = job.attemptsMade;
  if (attemptsMade > 1) {
    console.log(
      `[Queue] Job ${job.id} completed after ${attemptsMade} attempts:`,
      result
    );
  } else {
    console.log(`[Queue] Job ${job.id} completed:`, result);
  }
});

socialPostsQueue.on("failed", (job, error) => {
  if (job) {
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;
    const willRetry = attemptsMade < maxAttempts;

    if (willRetry) {
      console.warn(
        `[Queue] Job ${job.id} failed (attempt ${attemptsMade}/${maxAttempts}), will retry:`,
        error.message
      );
    } else {
      console.error(
        `[Queue] Job ${job.id} failed after ${attemptsMade} attempts (final):`,
        error.message
      );
    }
  } else {
    console.error(`[Queue] Job failed:`, error.message);
  }
});

socialPostsQueue.on("stalled", (job) => {
  console.warn(
    `[Queue] Job ${job.id} stalled (may have been picked up by another worker)`
  );
});

socialPostsQueue.on("error", (error) => {
  console.error("[Queue] Queue error:", error);
});

socialPostsQueue.on("waiting", (jobId) => {
  console.log(`[Queue] Job ${jobId} is waiting to be processed`);
});

socialPostsQueue.on("active", (job) => {
  console.log(`[Queue] Job ${job.id} is now active and being processed`);
});

socialPostsQueue.on("progress", (job, progress) => {
  console.log(`[Queue] Job ${job.id} progress: ${progress}%`);
});

// Export queue for external use
export default socialPostsQueue;

