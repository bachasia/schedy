import Queue from "bull";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";
import {
  publishToFacebook as publishToFacebookAPI,
  publishToInstagram as publishToInstagramAPI,
  handleFacebookError,
} from "@/lib/social/facebook";

// Redis connection configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
};

// Create Bull queue for social media posts
export const socialPostsQueue = new Queue("social-posts", {
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

// Job data interface
interface PostJobData {
  postId: string;
  userId: string;
}

/**
 * Process a post publishing job
 */
socialPostsQueue.process(async (job) => {
  const { postId, userId } = job.data as PostJobData;

  console.log(`[Queue] Processing post ${postId} for user ${userId}`);

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
      throw new Error(`Post ${postId} not found`);
    }

    // Verify ownership
    if (post.userId !== userId) {
      throw new Error(`User ${userId} does not own post ${postId}`);
    }

    // Check if post is in correct status
    if (post.status !== PostStatus.SCHEDULED) {
      console.log(
        `[Queue] Post ${postId} is not scheduled (status: ${post.status}), skipping`,
      );
      return { skipped: true, reason: "Post is not scheduled" };
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

    // 4. Call appropriate social media API based on platform
    const result = await publishToSocialMedia(post, profile);

    // 5. Handle success
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
    // 6. Handle failure
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[Queue] Failed to publish post ${postId}:`, errorMessage);

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      },
    });

    throw error; // Re-throw to mark job as failed
  }
});

/**
 * Publish post to social media platform
 */
async function publishToSocialMedia(
  post: any,
  profile: any,
): Promise<{ platformPostId: string; metadata?: any }> {
  const { platform, content, mediaUrls } = post;

  try {
    switch (platform) {
      case "FACEBOOK":
        return await publishToFacebook(post.id, profile.id, content, mediaUrls);

      case "INSTAGRAM":
        return await publishToInstagram(post.id, profile.id, content, mediaUrls);

      case "TWITTER":
        return await publishToTwitter(content, mediaUrls);

      case "TIKTOK":
        return await publishToTikTok(content, mediaUrls);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error: any) {
    // Handle platform-specific errors
    if (platform === "FACEBOOK" || platform === "INSTAGRAM") {
      const errorMessage = handleFacebookError(error);
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
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Facebook] Publishing post ${postId} to profile ${profileId}`);

  // Parse media URLs (stored as comma-separated string in SQLite)
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

  // Call real Facebook API
  const result = await publishToFacebookAPI(profileId, content, mediaArray);

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
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Instagram] Publishing post ${postId} to profile ${profileId}`);

  // Parse media URLs
  const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

  if (mediaArray.length === 0) {
    throw new Error("Instagram posts require at least one media file");
  }

  // Call real Instagram API
  const result = await publishToInstagramAPI(profileId, content, mediaArray);

  console.log(`[Instagram] Successfully published to Instagram. Post ID: ${result.id}`);

  return {
    platformPostId: result.id,
    metadata: {
      platform: "instagram",
      publishedAt: new Date().toISOString(),
    },
  };
}

/**
 * Twitter API integration (placeholder)
 */
async function publishToTwitter(
  content: string,
  mediaUrls: string,
  accessToken: string,
): Promise<{ platformPostId: string; metadata?: any }> {
  // TODO: Implement Twitter API v2 call
  console.log(
    `[Twitter] Publishing: "${content.substring(0, 50)}..." (${content.length} chars)`,
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    platformPostId: `tw_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    metadata: {
      platform: "twitter",
      publishedAt: new Date().toISOString(),
    },
  };
}

/**
 * TikTok API integration (placeholder)
 */
async function publishToTikTok(
  content: string,
  mediaUrls: string,
  accessToken: string,
): Promise<{ platformPostId: string; metadata?: any }> {
  // TODO: Implement TikTok API call
  console.log(`[TikTok] Publishing video with caption: "${content.substring(0, 50)}..."`);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    platformPostId: `tt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    metadata: {
      platform: "tiktok",
      publishedAt: new Date().toISOString(),
    },
  };
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

// Event listeners for monitoring
socialPostsQueue.on("completed", (job, result) => {
  console.log(`[Queue] Job ${job.id} completed:`, result);
});

socialPostsQueue.on("failed", (job, error) => {
  console.error(`[Queue] Job ${job?.id} failed:`, error.message);
});

socialPostsQueue.on("stalled", (job) => {
  console.warn(`[Queue] Job ${job.id} stalled`);
});

// Export queue for external use
export default socialPostsQueue;

