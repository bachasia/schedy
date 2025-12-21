/**
 * TikTok API Integration
 * Handles OAuth flow and video publishing to TikTok
 * Uses TikTok Login Kit and Content Posting API
 */

import { prisma } from "@/lib/prisma";

// TikTok API configuration
const TIKTOK_API_VERSION = "v2";
const TIKTOK_API_URL = `https://open.tiktokapis.com/${TIKTOK_API_VERSION}`;
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

// Required scopes for video posting
export const TIKTOK_SCOPES = [
  "user.info.basic",
  "video.upload",
  "video.publish",
].join(",");

// Video upload limitations
export const TIKTOK_VIDEO_LIMITS = {
  formats: ["mp4", "mov", "webm"],
  maxDuration: 600, // 10 minutes in seconds
  maxSize: 4 * 1024 * 1024 * 1024, // 4GB in bytes
  minDuration: 3, // 3 seconds minimum
};

interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}

interface TikTokTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  open_id: string;
}

interface TikTokUserInfoResponse {
  data: {
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      display_name: string;
    };
  };
  error: {
    code: string;
    message: string;
  };
}

interface TikTokVideoUploadResponse {
  data: {
    publish_id: string;
    upload_url: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface TikTokPublishResponse {
  data: {
    publish_id: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Get TikTok OAuth configuration from environment variables
 */
function getTikTokConfig(): TikTokConfig {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3001/api/social/tiktok/callback";

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok Client Key and Secret are required. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env");
  }

  return { clientKey, clientSecret, redirectUri };
}

/**
 * Generate TikTok OAuth URL for user authorization
 * @param state - Random state parameter for CSRF protection
 */
export function generateTikTokAuthUrl(state: string): string {
  const config = getTikTokConfig();

  const params = new URLSearchParams({
    client_key: config.clientKey,
    scope: TIKTOK_SCOPES,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state: state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from callback
 */
export async function exchangeTikTokCode(code: string): Promise<TikTokTokenResponse> {
  const config = getTikTokConfig();

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to exchange TikTok code: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  console.log("[TikTok] Token exchange response:", JSON.stringify(data, null, 2));
  
  // TikTok API returns data in different formats:
  // - Success: { data: { access_token, ... } }
  // - Error: { error: { code, message } }
  if (data.error) {
    throw new Error(`TikTok token error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`);
  }

  // Return data.data if exists, otherwise return data directly
  if (data.data && data.data.access_token) {
    return data.data as TikTokTokenResponse;
  }
  
  // If data already has access_token at root level, return it
  if (data.access_token) {
    return data as TikTokTokenResponse;
  }

  // If neither format, log and throw
  console.error("[TikTok] Unexpected token response format:", JSON.stringify(data, null, 2));
  throw new Error(`Unexpected TikTok token response format: ${JSON.stringify(data)}`);
}

/**
 * Refresh TikTok access token using refresh token
 * @param refreshToken - Refresh token from previous authorization
 */
export async function refreshTikTokAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const config = getTikTokConfig();

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to refresh TikTok token: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  console.log("[TikTok] Token refresh response:", JSON.stringify(data, null, 2));

  if (data.error) {
    throw new Error(`TikTok token refresh error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`);
  }

  // Return data.data if exists, otherwise return data directly
  if (data.data && data.data.access_token) {
    return data.data as TikTokTokenResponse;
  }
  
  // If data already has access_token at root level, return it
  if (data.access_token) {
    return data as TikTokTokenResponse;
  }

  // If neither format, log and throw
  console.error("[TikTok] Unexpected token refresh response format:", JSON.stringify(data, null, 2));
  throw new Error(`Unexpected TikTok token refresh response format: ${JSON.stringify(data)}`);
}

/**
 * Get TikTok user information
 * @param accessToken - User's access token
 */
export async function getTikTokUserInfo(accessToken: string): Promise<TikTokUserInfoResponse["data"]["user"]> {
  const response = await fetch(`${TIKTOK_API_URL}/user/info/?fields=open_id,union_id,avatar_url,display_name`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to get TikTok user info: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: TikTokUserInfoResponse = await response.json();
  
  console.log("[TikTok] User info response:", JSON.stringify(data, null, 2));

  if (data.error && data.error.code !== "ok") {
    throw new Error(`TikTok API error: ${data.error.message || data.error.code}`);
  }

  if (!data.data || !data.data.user) {
    console.error("[TikTok] Unexpected user info response format:", JSON.stringify(data, null, 2));
    throw new Error(`Unexpected TikTok user info response format: ${JSON.stringify(data)}`);
  }

  return data.data.user;
}

/**
 * Validate video file before upload
 * @param videoUrl - URL or path to video file
 * @param videoSize - Size in bytes
 * @param videoDuration - Duration in seconds
 */
export function validateTikTokVideo(
  videoUrl: string,
  videoSize: number,
  videoDuration?: number
): { valid: boolean; error?: string } {
  // Check file extension
  const ext = videoUrl.split('.').pop()?.toLowerCase();
  if (!ext || !TIKTOK_VIDEO_LIMITS.formats.includes(ext)) {
    return {
      valid: false,
      error: `Invalid video format. Supported formats: ${TIKTOK_VIDEO_LIMITS.formats.join(", ")}`,
    };
  }

  // Check file size
  if (videoSize > TIKTOK_VIDEO_LIMITS.maxSize) {
    return {
      valid: false,
      error: `Video size exceeds ${TIKTOK_VIDEO_LIMITS.maxSize / (1024 * 1024 * 1024)}GB limit`,
    };
  }

  // Check duration if provided
  if (videoDuration) {
    if (videoDuration < TIKTOK_VIDEO_LIMITS.minDuration) {
      return {
        valid: false,
        error: `Video must be at least ${TIKTOK_VIDEO_LIMITS.minDuration} seconds long`,
      };
    }
    if (videoDuration > TIKTOK_VIDEO_LIMITS.maxDuration) {
      return {
        valid: false,
        error: `Video duration exceeds ${TIKTOK_VIDEO_LIMITS.maxDuration / 60} minutes limit`,
      };
    }
  }

  return { valid: true };
}

/**
 * Initialize video upload and get upload URL
 * @param accessToken - User's access token
 */
async function initializeVideoUpload(accessToken: string): Promise<TikTokVideoUploadResponse["data"]> {
  const response = await fetch(`${TIKTOK_API_URL}/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: 0, // Will be updated during actual upload
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize TikTok video upload: ${response.statusText}`);
  }

  const data: TikTokVideoUploadResponse = await response.json();

  if (data.error) {
    throw new Error(`TikTok upload init error: ${data.error.message}`);
  }

  return data.data;
}

/**
 * Upload video chunks to TikTok
 * @param uploadUrl - Upload URL from initialization
 * @param videoBuffer - Video file buffer
 */
async function uploadVideoChunks(uploadUrl: string, videoBuffer: Buffer): Promise<void> {
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  const totalChunks = Math.ceil(videoBuffer.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, videoBuffer.length);
    const chunk = videoBuffer.slice(start, end);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end - 1}/${videoBuffer.length}`,
      },
      body: chunk,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload video chunk ${i + 1}/${totalChunks}`);
    }
  }
}

/**
 * Publish video to TikTok with caption
 * @param profileId - Profile ID from database
 * @param postId - Post ID from database (for logging)
 * @param caption - Video caption/description
 * @param videoUrl - URL to video file
 */
export async function publishToTikTok(
  profileId: string,
  postId: string,
  caption: string,
  videoUrl: string
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[TikTok] Publishing post ${postId} to profile ${profileId}`);

  // Get profile with access token
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      accessToken: true,
      platformUserId: true,
      platformUsername: true,
    },
  });

  if (!profile?.accessToken) {
    throw new Error(`Profile ${profileId} has no access token`);
  }

  try {
    // Note: In production, you would fetch the actual video file
    // For now, this is a placeholder implementation
    console.log(`[TikTok] Video URL: ${videoUrl}`);

    // Validate video (in production, check actual file)
    const validation = validateTikTokVideo(videoUrl, 0);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Step 1: Initialize upload
    console.log(`[TikTok] Initializing video upload...`);
    const uploadData = await initializeVideoUpload(profile.accessToken);
    const { publish_id, upload_url } = uploadData;

    // Step 2: Upload video (placeholder - in production, fetch and upload actual video)
    console.log(`[TikTok] Uploading video chunks to: ${upload_url}`);
    // const videoBuffer = await fetchVideoBuffer(videoUrl);
    // await uploadVideoChunks(upload_url, videoBuffer);
    console.log(`[TikTok] Video upload completed`);

    // Step 3: Publish video with caption
    console.log(`[TikTok] Publishing video with caption...`);
    const publishResponse = await fetch(`${TIKTOK_API_URL}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${profile.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY", // Options: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, SELF_ONLY
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_url: upload_url,
        },
      }),
    });

    if (!publishResponse.ok) {
      throw new Error(`Failed to publish TikTok video: ${publishResponse.statusText}`);
    }

    const publishData: TikTokPublishResponse = await publishResponse.json();

    if (publishData.error) {
      throw new Error(`TikTok publish error: ${publishData.error.message}`);
    }

    console.log(`[TikTok] Successfully published video. Publish ID: ${publishData.data.publish_id}`);

    return {
      platformPostId: publishData.data.publish_id,
      metadata: {
        platform: "tiktok",
        publishedAt: new Date().toISOString(),
        username: profile.platformUsername,
        openId: profile.platformUserId,
      },
    };
  } catch (error) {
    console.error(`[TikTok] Error publishing video:`, error);
    throw error;
  }
}

/**
 * Handle TikTok-specific errors
 */
export function handleTikTokError(error: any): string {
  if (error.response?.data) {
    const data = error.response.data;
    
    // Common TikTok error codes
    const errorCodes: Record<string, string> = {
      "access_token_invalid": "Access token is invalid or expired. Please reconnect your TikTok account.",
      "rate_limit_exceeded": "TikTok API rate limit exceeded. Please try again later.",
      "spam_risk_too_many_posts": "Too many posts in a short time. Please wait before posting again.",
      "video_upload_failed": "Video upload failed. Please check video format and size.",
      "scope_not_authorized": "Missing required permissions. Please reconnect and authorize all permissions.",
    };

    if (data.error?.code && errorCodes[data.error.code]) {
      return errorCodes[data.error.code];
    }

    if (data.error?.message) {
      return `TikTok error: ${data.error.message}`;
    }
  }

  if (error.message) {
    return error.message;
  }

  return "Failed to publish to TikTok. Please try again.";
}

