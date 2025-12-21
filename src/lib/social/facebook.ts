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
}

interface InstagramPublishResponse {
  id: string;
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

  // Prepare post data
  const postData: any = {
    message: content,
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
            headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
  if (!mediaUrls || mediaUrls.length === 0) {
    throw new Error("Instagram posts require at least one media file");
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

  if (mediaUrls.length === 1) {
    // Single photo or video
    const mediaUrl = mediaUrls[0];
    const isVideoPost = isVideo(mediaUrl);

    // Step 1: Create container
    const containerData: any = {
      caption: content,
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
    } else {
      containerData.image_url = mediaUrl;
    }

    const containerResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerData),
    });

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Failed to create Instagram container: ${error.error?.message || containerResponse.statusText}`);
    }

    const container: InstagramContainerResponse = await containerResponse.json();

    // Step 2: Publish container
    const publishData = {
      creation_id: container.id,
      access_token: accessToken,
    };

    const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishData),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish Instagram post: ${error.error?.message || publishResponse.statusText}`);
    }

    return publishResponse.json();
  } else {
    // Carousel post (multiple images)
    const carouselItems: string[] = [];

    // Create containers for each item
    for (const mediaUrl of mediaUrls.slice(0, 10)) {
      // Instagram carousel max 10 items
      const itemData = {
        image_url: mediaUrl,
        is_carousel_item: true,
        access_token: accessToken,
      };

      const itemResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (!itemResponse.ok) {
        const error = await itemResponse.json();
        throw new Error(`Failed to create carousel item: ${error.error?.message || itemResponse.statusText}`);
      }

      const itemContainer = await itemResponse.json();
      carouselItems.push(itemContainer.id);
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(carouselData),
    });

    if (!carouselResponse.ok) {
      const error = await carouselResponse.json();
      throw new Error(`Failed to create carousel container: ${error.error?.message || carouselResponse.statusText}`);
    }

    const carouselContainer = await carouselResponse.json();

    // Publish carousel
    const publishData = {
      creation_id: carouselContainer.id,
      access_token: accessToken,
    };

    const publishResponse = await fetch(`${FACEBOOK_GRAPH_URL}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishData),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish carousel: ${error.error?.message || publishResponse.statusText}`);
    }

    return publishResponse.json();
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
  
  const reelData: any = {
    file_url: videoUrl,
    description: description,
    video_format_type: "reels",
    access_token: accessToken,
  };

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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








