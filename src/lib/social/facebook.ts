/**
 * Facebook Graph API Integration
 * Handles OAuth flow and publishing to Facebook Pages and Instagram Business Accounts
 */

import { prisma } from "@/lib/prisma";

// Facebook Graph API configuration
const FACEBOOK_API_VERSION = "v18.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// OAuth URLs
export const FACEBOOK_OAUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
export const FACEBOOK_TOKEN_URL = `${FACEBOOK_GRAPH_URL}/oauth/access_token`;

// Required permissions
export const FACEBOOK_PERMISSIONS = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_show_list",
].join(",");

export const INSTAGRAM_PERMISSIONS = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_read_engagement",
  "pages_show_list",
].join(",");

interface FacebookConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookPageResponse {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface InstagramAccountResponse {
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

interface InstagramContainerResponse {
  id: string;
  status_code?: string;
  status?: string;
}

interface InstagramPublishResponse {
  id: string;
  shortcode?: string;
  media_type?: string;
}

interface InstagramMediaInfo {
  id: string;
  shortcode?: string;
  media_type?: string;
}

/**
 * Get Facebook OAuth configuration from environment variables
 */
function getFacebookConfig(): FacebookConfig {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3001/api/social/facebook/callback";

  if (!appId || !appSecret) {
    throw new Error("Facebook App ID and Secret are required. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env");
  }

  return { appId, appSecret, redirectUri };
}

/**
 * Generate Facebook OAuth URL for user authorization
 * @param state - Random state parameter for CSRF protection
 * @param type - 'facebook' or 'instagram' to request appropriate permissions
 */
export function generateFacebookAuthUrl(state: string, type: "facebook" | "instagram" = "facebook"): string {
  const config = getFacebookConfig();
  const permissions = type === "instagram" ? INSTAGRAM_PERMISSIONS : FACEBOOK_PERMISSIONS;

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state,
    scope: permissions,
    response_type: "code",
  });

  return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from OAuth callback
 */
export async function exchangeCodeForToken(code: string): Promise<FacebookTokenResponse> {
  const config = getFacebookConfig();

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to exchange code for token: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get long-lived user access token (60 days)
 * @param shortLivedToken - Short-lived access token from OAuth
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
  const config = getFacebookConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/oauth/access_token?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get long-lived token: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get user's Facebook Pages
 * @param userAccessToken - User access token
 */
export async function getUserPages(userAccessToken: string): Promise<FacebookPageResponse[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token,category,picture`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get user pages: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Instagram Business Account connected to a Facebook Page
 * @param pageId - Facebook Page ID
 * @param pageAccessToken - Page access token
 */
export async function getInstagramAccount(
  pageId: string,
  pageAccessToken: string,
): Promise<InstagramAccountResponse> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageAccessToken}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get Instagram account: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Publish a post to Facebook Page
 * @param profileId - Profile ID from database
 * @param content - Post content/message
 * @param mediaUrls - Array of media URLs (optional)
 * @param postFormat - Post format (POST or REEL)
 */
export async function publishToFacebook(
  profileId: string,
  content: string,
  mediaUrls?: string[],
  postFormat: "POST" | "REEL" = "POST",
): Promise<FacebookPostResponse> {
  // Get profile with access token
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      platformUserId: true,
      accessToken: true,
      platform: true,
    },
  });

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  if (profile.platform !== "FACEBOOK") {
    throw new Error(`Profile ${profileId} is not a Facebook profile`);
  }

  const pageId = profile.platformUserId;
  const accessToken = profile.accessToken;

  // Prepare post data - ensure content is properly preserved
  // Log content for debugging (truncated for long content)
  const contentPreview = content.length > 100 ? content.substring(0, 100) + "..." : content;
  console.log(`[Facebook API] Content preview:`, contentPreview);
  console.log(`[Facebook API] Content length:`, content.length);
  console.log(`[Facebook API] Content has emojis:`, /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content));

  const postData: any = {
    message: content, // Content is sent as-is, JSON.stringify will handle UTF-8 encoding
    access_token: accessToken,
  };

  // Handle media
  console.log(`[Facebook API] Media URLs received:`, mediaUrls);
  console.log(`[Facebook API] Media count:`, mediaUrls?.length || 0);
  console.log(`[Facebook API] Post format:`, postFormat);

  if (mediaUrls && mediaUrls.length > 0) {
    console.log(`[Facebook API] Processing media post with ${mediaUrls.length} file(s)`);
    if (mediaUrls.length === 1) {
      // Single image or video
      const mediaUrl = mediaUrls[0];
      console.log(`[Facebook API] Single media URL:`, mediaUrl);
      if (isVideo(mediaUrl)) {
        // Video post or Reel
        if (postFormat === "REEL") {
          // Publish as Reel
          console.log(`[Facebook API] Publishing as Reel`);
          return await publishFacebookReel(pageId, accessToken, mediaUrl, content);
        } else {
          // Regular video post
          postData.file_url = mediaUrl;
          const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/videos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(postData),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to publish video: ${error.error?.message || response.statusText}`);
          }

          return response.json();
        }
      } else {
        // Photo post
        postData.url = mediaUrl;
        const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to publish photo: ${error.error?.message || response.statusText}`);
        }

        return response.json();
      }
    } else {
      // Multiple photos (album/carousel)
      // First upload all photos
      const photoIds: string[] = [];
      for (const mediaUrl of mediaUrls) {
        const photoResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            url: mediaUrl,
            published: false,
            access_token: accessToken,
          }),
        });

        if (!photoResponse.ok) {
          const error = await photoResponse.json();
          throw new Error(`Failed to upload photo: ${error.error?.message || photoResponse.statusText}`);
        }

        const photoData = await photoResponse.json();
        photoIds.push(photoData.id);
      }

      // Create album post with all photos
      const albumData = {
        message: content,
        attached_media: photoIds.map((id) => ({ media_fbid: id })),
        access_token: accessToken,
      };

      const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(albumData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to publish album: ${error.error?.message || response.statusText}`);
      }

      return response.json();
    }
  } else {
    // Text-only post
    console.log(`[Facebook API] Publishing text-only post to ${pageId}/feed`);
    const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[Facebook API] Text post publish failed:`, error);
      throw new Error(`Failed to publish post: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Facebook API] Text post published successfully:`, result);
    return result;
  }
}

/**
 * Publish a post to Instagram Business Account
 * @param profileId - Profile ID from database
 * @param content - Post caption
 * @param mediaUrls - Array of media URLs (required for Instagram)
 * @param postFormat - Post format (POST or REEL)
 */
export async function publishToInstagram(
  profileId: string,
  content: string,
  mediaUrls?: string[],
  postFormat: "POST" | "REEL" = "POST",
): Promise<InstagramPublishResponse> {
  // Instagram API requires media for all post types (POST and REEL)
  // Text-only posts are not supported by Instagram Graph API
  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error(
      "Instagram posts require at least one media file. " +
      "The Instagram API does not support text-only posts."
    );
  }

  // Get profile with access token
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      platformUserId: true,
      accessToken: true,
      platform: true,
    },
  });

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  if (profile.platform !== "INSTAGRAM") {
    throw new Error(`Profile ${profileId} is not an Instagram profile`);
  }

  const igAccountId = profile.platformUserId;
  const accessToken = profile.accessToken;

  // Instagram requires a two-step process:
  // 1. Create media container
  // 2. Publish the container

  // Log content for debugging
  const contentPreview = content.length > 100 ? content.substring(0, 100) + "..." : content;
  console.log(`[Instagram API] Content preview:`, contentPreview);
  console.log(`[Instagram API] Content length:`, content.length);
  console.log(`[Instagram API] Content has emojis:`, /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content));
  console.log(`[Instagram API] Post format received:`, postFormat);
  console.log(`[Instagram API] Media URLs:`, mediaUrls);

  if (mediaUrls.length === 1) {
    // Single photo or video
    const mediaUrl = mediaUrls[0];
    const isVideoPost = isVideo(mediaUrl);

    // Step 1: Create container
    const containerData: any = {
      caption: content, // Content is sent as-is, JSON.stringify will handle UTF-8 encoding
      access_token: accessToken,
    };

    if (isVideoPost) {
      // Determine media type based on post format
      if (postFormat === "REEL") {
        containerData.media_type = "REELS";
        console.log(`[Instagram API] Publishing as Reel`);
      } else {
        containerData.media_type = "VIDEO";
        console.log(`[Instagram API] Publishing as regular video`);
      }
      containerData.video_url = mediaUrl;

      // Validate video URL format
      if (!mediaUrl.startsWith("https://")) {
        throw new Error(`Instagram video URL must use HTTPS. Got: ${mediaUrl.substring(0, 50)}...`);
      }

      // Validate video URL accessibility before creating container
      // This helps prevent errors when multiple accounts try to access the same URL simultaneously
      console.log(`[Instagram API] Validating video URL accessibility: ${mediaUrl}`);
      try {
        const urlCheckResponse = await fetch(mediaUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!urlCheckResponse.ok) {
          console.warn(`[Instagram API] Video URL returned status ${urlCheckResponse.status}, but continuing...`);
        } else {
          console.log(`[Instagram API] Video URL is accessible (status: ${urlCheckResponse.status})`);
        }
      } catch (urlError: any) {
        // Log but don't fail - URL might still be accessible from Facebook's servers
        console.warn(`[Instagram API] Could not validate video URL accessibility: ${urlError.message}`);
        console.log(`[Instagram API] Continuing with container creation (URL may still be accessible from Facebook servers)`);
      }

      console.log(`[Instagram API] Video URL: ${mediaUrl}`);
    } else {
      containerData.image_url = mediaUrl;
      console.log(`[Instagram API] Image URL: ${mediaUrl}`);
    }

    // Validate caption length (Instagram limit: 2200 characters)
    if (content.length > 2200) {
      console.warn(`[Instagram API] Caption is ${content.length} characters, Instagram limit is 2200. Truncating...`);
      containerData.caption = content.substring(0, 2197) + "...";
    }

    // Log request data (without access token for security)
    const logData = { ...containerData };
    if (logData.access_token) {
      logData.access_token = "***REDACTED***";
    }
    console.log(`[Instagram API] Creating container with data:`, JSON.stringify(logData, null, 2));

    // Retry logic for container creation (especially important for Reels with multiple accounts)
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add small delay between retries to avoid rate limiting
        if (attempt > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
          console.log(`[Instagram API] Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const containerResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(containerData),
        });

        if (containerResponse.ok) {
          const container: InstagramContainerResponse = await containerResponse.json();
          const containerId = container.id;
          console.log(`[Instagram API] Created container ${containerId} on attempt ${attempt}, status: ${container.status_code || container.status}`);

          // Continue with container processing
          // We'll need to handle the rest of the function differently
          // Let me check the rest of the code...

          // Store container for later use
          (containerData as any).__containerId = containerId;
          (containerData as any).__container = container;
          break; // Success, exit retry loop
        }

        // Handle error response
        const errorText = await containerResponse.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText };
        }

        const errorCode = error.error?.code || error.code;
        const errorSubcode = error.error?.error_subcode;

        // Check if this is a retryable error
        const isRetryable = errorCode === 100 ||
          errorCode === 4 || // Rate limit
          errorCode === 17 || // User request limit
          containerResponse.status === 429 || // Too many requests
          containerResponse.status >= 500; // Server errors

        if (!isRetryable || attempt === maxRetries) {
          // Non-retryable error or last attempt - throw error
          console.error(`[Instagram API] Container creation failed (attempt ${attempt}/${maxRetries}):`, {
            status: containerResponse.status,
            statusText: containerResponse.statusText,
            error: error,
            requestData: logData,
          });

          // Extract detailed error message
          const errorMessage = error.error?.message || error.message || containerResponse.statusText;

          let fullErrorMessage = `Failed to create Instagram container: ${errorMessage}`;
          if (errorCode) {
            fullErrorMessage += ` (code: ${errorCode})`;
          }
          if (errorSubcode) {
            fullErrorMessage += ` (subcode: ${errorSubcode})`;
          }

          // Add helpful hints for common errors
          if (errorCode === 100 || errorMessage?.toLowerCase().includes("invalid parameter")) {
            fullErrorMessage += `. Common causes: video URL not accessible, invalid video format, or missing required parameters.`;
            if (errorSubcode === 2207067) {
              fullErrorMessage += ` This error often occurs when multiple accounts try to access the same video URL simultaneously. Try scheduling posts with a delay between accounts.`;
            }
          }

          throw new Error(fullErrorMessage);
        }

        // Retryable error - store and continue to next attempt
        lastError = error;
        console.warn(`[Instagram API] Container creation failed (attempt ${attempt}/${maxRetries}), will retry:`, {
          status: containerResponse.status,
          errorCode,
          errorSubcode,
          message: error.error?.message || error.message,
        });

      } catch (fetchError: any) {
        // Network or other errors
        if (attempt === maxRetries) {
          throw new Error(`Failed to create Instagram container after ${maxRetries} attempts: ${fetchError.message}`);
        }
        lastError = fetchError;
        console.warn(`[Instagram API] Container creation error (attempt ${attempt}/${maxRetries}), will retry:`, fetchError.message);
      }
    }

    // If we get here without a container, something went wrong
    if (!(containerData as any).__container) {
      throw new Error(`Failed to create Instagram container after ${maxRetries} attempts`);
    }

    const container: InstagramContainerResponse = (containerData as any).__container;
    const containerId = (containerData as any).__containerId;

    console.log(`[Instagram API] Created container ${containerId}, status: ${container.status_code || container.status}`);

    // Step 2: Wait for container to be ready
    // Poll container status until it's ready
    // Videos/Reels need longer polling, images are usually faster
    const isImagePost = !isVideoPost;
    const maxAttempts = isVideoPost ? 30 : 5; // Videos: 60s, Images: 5s
    const pollInterval = isVideoPost ? 2000 : 1000; // Videos: 2s, Images: 1s

    if (isVideoPost) {
      console.log(`[Instagram API] Waiting for video container to be processed...`);
    } else {
      console.log(`[Instagram API] Waiting for image container to be processed...`);
    }

    let containerReady = false;
    let attempts = 0;

    while (!containerReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;

      try {
        const statusResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${containerId}?fields=status_code&access_token=${accessToken}`,
        );

        if (statusResponse.ok) {
          const statusData: InstagramContainerResponse = await statusResponse.json();
          const statusCode = statusData.status_code || statusData.status;

          console.log(`[Instagram API] Container ${containerId} status check ${attempts}/${maxAttempts}: ${statusCode}`);

          if (statusCode === "FINISHED") {
            containerReady = true;
            console.log(`[Instagram API] Container ${containerId} is ready for publishing`);
          } else if (statusCode === "ERROR") {
            throw new Error(`Container processing failed with status: ${statusCode}`);
          }
          // If status is "IN_PROGRESS" or other, continue polling
        } else {
          console.warn(`[Instagram API] Failed to check container status: ${statusResponse.statusText}`);
        }
      } catch (error) {
        console.warn(`[Instagram API] Error checking container status:`, error);
        // Continue polling on error
      }
    }

    if (!containerReady) {
      throw new Error(
        `Container ${containerId} did not become ready after ${maxAttempts * (pollInterval / 1000)} seconds. ` +
        `${isVideoPost ? "This may indicate the video is too large or there's an issue with the media file." : "This may indicate there's an issue with the image file."}`
      );
    }

    // Step 3: Publish container
    const publishData = {
      creation_id: containerId,
      access_token: accessToken,
    };

    console.log(`[Instagram API] Publishing container ${containerId}...`);

    const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(publishData),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish Instagram post: ${error.error?.message || publishResponse.statusText}`);
    }

    const publishResult: InstagramPublishResponse = await publishResponse.json();
    const mediaId = publishResult.id;

    // Query media info to get shortcode
    try {
      const mediaInfoResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode,media_type&access_token=${accessToken}`,
      );
      if (mediaInfoResponse.ok) {
        const mediaInfo: InstagramMediaInfo = await mediaInfoResponse.json();
        return {
          id: mediaId,
          shortcode: mediaInfo.shortcode,
          media_type: mediaInfo.media_type,
        };
      }
    } catch (error) {
      console.warn(`[Instagram] Failed to fetch shortcode for media ${mediaId}:`, error);
    }

    return publishResult;
  } else {
    // Carousel post (multiple images)
    const carouselItems: string[] = [];

    // Create containers for each item
    for (let i = 0; i < mediaUrls.slice(0, 10).length; i++) {
      const mediaUrl = mediaUrls[i];
      // Instagram carousel max 10 items
      const itemData = {
        image_url: mediaUrl,
        is_carousel_item: true,
        access_token: accessToken,
      };

      const itemResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(itemData),
      });

      if (!itemResponse.ok) {
        const error = await itemResponse.json();
        throw new Error(`Failed to create carousel item: ${error.error?.message || itemResponse.statusText}`);
      }

      const itemContainer: InstagramContainerResponse = await itemResponse.json();
      const itemContainerId = itemContainer.id;

      console.log(`[Instagram API] Created carousel item ${i + 1} container ${itemContainerId}`);

      // Wait for carousel item to be ready (usually quick for images, but we should check)
      let itemReady = false;
      let itemAttempts = 0;
      const maxItemAttempts = 10; // 10 attempts * 1 second = 10 seconds max per item
      const itemPollInterval = 1000; // 1 second (images are usually faster)

      while (!itemReady && itemAttempts < maxItemAttempts) {
        await new Promise((resolve) => setTimeout(resolve, itemPollInterval));
        itemAttempts++;

        try {
          const itemStatusResponse = await fetch(
            `${FACEBOOK_GRAPH_URL}/${itemContainerId}?fields=status_code&access_token=${accessToken}`,
          );

          if (itemStatusResponse.ok) {
            const itemStatusData: InstagramContainerResponse = await itemStatusResponse.json();
            const itemStatusCode = itemStatusData.status_code || itemStatusData.status;

            if (itemStatusCode === "FINISHED") {
              itemReady = true;
              console.log(`[Instagram API] Carousel item ${i + 1} container ${itemContainerId} is ready`);
            } else if (itemStatusCode === "ERROR") {
              throw new Error(`Carousel item ${i + 1} processing failed with status: ${itemStatusCode}`);
            }
          }
        } catch (error) {
          console.warn(`[Instagram API] Error checking carousel item ${i + 1} status:`, error);
        }
      }

      if (!itemReady) {
        console.warn(`[Instagram API] Carousel item ${i + 1} container ${itemContainerId} did not become ready, but continuing...`);
        // Continue anyway - sometimes items are ready even if status check fails
      }

      carouselItems.push(itemContainerId);
    }

    // Create carousel container
    const carouselData = {
      media_type: "CAROUSEL",
      caption: content,
      children: carouselItems.join(","),
      access_token: accessToken,
    };

    const carouselResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(carouselData),
    });

    if (!carouselResponse.ok) {
      const error = await carouselResponse.json();
      throw new Error(`Failed to create carousel container: ${error.error?.message || carouselResponse.statusText}`);
    }

    const carouselContainer = await carouselResponse.json();
    const carouselContainerId = carouselContainer.id;

    console.log(`[Instagram API] Created carousel container ${carouselContainerId}, status: ${carouselContainer.status_code || carouselContainer.status}`);

    // Wait for carousel container to be ready
    console.log(`[Instagram API] Waiting for carousel container to be processed...`);
    let containerReady = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max wait
    const pollInterval = 2000; // 2 seconds

    while (!containerReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;

      try {
        const statusResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${carouselContainerId}?fields=status_code&access_token=${accessToken}`,
        );

        if (statusResponse.ok) {
          const statusData: InstagramContainerResponse = await statusResponse.json();
          const statusCode = statusData.status_code || statusData.status;

          console.log(`[Instagram API] Carousel container ${carouselContainerId} status check ${attempts}/${maxAttempts}: ${statusCode}`);

          if (statusCode === "FINISHED") {
            containerReady = true;
            console.log(`[Instagram API] Carousel container ${carouselContainerId} is ready for publishing`);
          } else if (statusCode === "ERROR") {
            throw new Error(`Carousel container processing failed with status: ${statusCode}`);
          }
          // If status is "IN_PROGRESS" or other, continue polling
        } else {
          console.warn(`[Instagram API] Failed to check carousel container status: ${statusResponse.statusText}`);
        }
      } catch (error) {
        console.warn(`[Instagram API] Error checking carousel container status:`, error);
        // Continue polling on error
      }
    }

    if (!containerReady) {
      throw new Error(
        `Carousel container ${carouselContainerId} did not become ready after ${maxAttempts * (pollInterval / 1000)} seconds. ` +
        `This may indicate there's an issue with the media files.`
      );
    }

    // Publish carousel
    const publishData = {
      creation_id: carouselContainerId,
      access_token: accessToken,
    };

    console.log(`[Instagram API] Publishing carousel container ${carouselContainerId}...`);

    const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(publishData),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish carousel: ${error.error?.message || publishResponse.statusText}`);
    }

    const publishResult: InstagramPublishResponse = await publishResponse.json();
    const mediaId = publishResult.id;

    // Query media info to get shortcode
    try {
      const mediaInfoResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode,media_type&access_token=${accessToken}`,
      );
      if (mediaInfoResponse.ok) {
        const mediaInfo: InstagramMediaInfo = await mediaInfoResponse.json();
        return {
          id: mediaId,
          shortcode: mediaInfo.shortcode,
          media_type: mediaInfo.media_type,
        };
      }
    } catch (error) {
      console.warn(`[Instagram] Failed to fetch shortcode for carousel ${mediaId}:`, error);
    }

    return publishResult;
  }
}

/**
 * Publish a Facebook Reel
 * @param pageId - Facebook Page ID
 * @param accessToken - Page access token
 * @param videoUrl - URL to the video file
 * @param description - Reel description/caption
 */
async function publishFacebookReel(
  pageId: string,
  accessToken: string,
  videoUrl: string,
  description: string,
): Promise<FacebookPostResponse> {
  console.log(`[Facebook API] Publishing Reel to page ${pageId}`);

  // Facebook Reels can be published using /videos endpoint with video_format_type parameter
  // Alternative: Use /video_reels endpoint with 3-phase upload (more complex, requires direct file upload)
  // For now, we'll use the simpler approach with video_format_type

  // Log content for debugging
  const contentPreview = description.length > 100 ? description.substring(0, 100) + "..." : description;
  console.log(`[Facebook API] Reel description preview:`, contentPreview);
  console.log(`[Facebook API] Reel description length:`, description.length);
  console.log(`[Facebook API] Reel description has emojis:`, /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(description));

  const reelData: any = {
    file_url: videoUrl,
    description: description, // Content is sent as-is, JSON.stringify will handle UTF-8 encoding
    video_format_type: "reels",
    access_token: accessToken,
  };

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(reelData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`[Facebook API] Reel publish failed:`, error);

    // If video_format_type doesn't work, try without it (fallback to regular video)
    if (error.error?.code === 100 || error.error?.message?.includes("video_format_type")) {
      console.log(`[Facebook API] Falling back to regular video post`);
      reelData.video_format_type = undefined;
      const fallbackResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(reelData),
      });

      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.json();
        throw new Error(`Failed to publish Reel: ${fallbackError.error?.message || fallbackResponse.statusText}`);
      }

      return fallbackResponse.json();
    }

    throw new Error(`Failed to publish Reel: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  console.log(`[Facebook API] Reel published successfully:`, result);
  return result;
}

/**
 * Check if a URL is a video file
 */
function isVideo(url: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".wmv", ".flv", ".webm"];
  const urlLower = url.toLowerCase();
  return videoExtensions.some((ext) => urlLower.includes(ext));
}

/**
 * Verify and refresh access token if needed
 * @param accessToken - Access token to verify
 */
export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/me?access_token=${accessToken}`,
      {
        method: "GET",
      },
    );

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Handle Facebook API errors
 */
export function handleFacebookError(error: any): string {
  if (error.error) {
    const fbError = error.error;

    // Token expiration
    if (fbError.code === 190 || fbError.type === "OAuthException") {
      return "Access token has expired. Please reconnect your Facebook account.";
    }

    // Rate limiting
    if (fbError.code === 32 || fbError.code === 4) {
      return "Rate limit exceeded. Please try again later.";
    }

    // Invalid media
    if (fbError.code === 1 || fbError.message?.includes("media")) {
      return "Invalid media format. Please check your image/video file.";
    }

    // Permission error
    if (fbError.code === 200 || fbError.message?.includes("permission")) {
      return "Insufficient permissions. Please reconnect with required permissions.";
    }

    return fbError.message || "Facebook API error occurred";
  }

  return error.message || "Unknown error occurred";
}








