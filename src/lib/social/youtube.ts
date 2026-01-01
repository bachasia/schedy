/**
 * YouTube API Integration
 * Handles OAuth 2.0 flow and video publishing to YouTube
 * Uses YouTube Data API v3
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// YouTube API configuration
const YOUTUBE_API_VERSION = "v3";
const YOUTUBE_API_URL = `https://www.googleapis.com/youtube/${YOUTUBE_API_VERSION}`;
const YOUTUBE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Required scopes for video posting
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

// Video upload limitations
export const YOUTUBE_VIDEO_LIMITS = {
  formats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
  maxSize: 128 * 1024 * 1024 * 1024, // 128GB
  minSize: 1, // 1 byte
  maxDuration: 12 * 60 * 60, // 12 hours
  minDuration: 1, // 1 second
};

interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface YouTubeTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface YouTubeUserResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
  }>;
}

/**
 * Get YouTube OAuth configuration from environment variables
 */
function getYouTubeConfig(): YouTubeConfig {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3001/api/social/youtube/callback";

  if (!clientId || !clientSecret) {
    throw new Error("YouTube API credentials are required. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate code challenge from verifier for PKCE
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * Generate YouTube OAuth 2.0 URL with PKCE
 * @param state - Random state parameter for CSRF protection
 * @param codeChallenge - PKCE code challenge
 */
export function generateYouTubeAuthUrl(state: string, codeChallenge: string): string {
  const config = getYouTubeConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPES,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline", // Required to get refresh token
    prompt: "consent", // Force consent screen to get refresh token
  });

  return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from callback
 * @param codeVerifier - PKCE code verifier
 */
export async function exchangeYouTubeCode(
  code: string,
  codeVerifier: string
): Promise<YouTubeTokenResponse> {
  const config = getYouTubeConfig();

  const params = new URLSearchParams({
    code: code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange YouTube code: ${error}`);
  }

  return await response.json();
}

/**
 * Get YouTube user information (Google account)
 * @param accessToken - User's access token
 */
export async function getYouTubeUserInfo(accessToken: string): Promise<YouTubeUserResponse> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get YouTube user info: ${error}`);
  }

  return await response.json();
}

/**
 * Get YouTube channel information
 * @param accessToken - User's access token
 */
export async function getYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelResponse["items"][0] | null> {
  const response = await fetch(`${YOUTUBE_API_URL}/channels?part=snippet&mine=true`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get YouTube channel info: ${error}`);
  }

  const data: YouTubeChannelResponse = await response.json();
  return data.items && data.items.length > 0 ? data.items[0] : null;
}

/**
 * Refresh expired access token
 * @param refreshToken - User's refresh token
 */
export async function refreshYouTubeToken(refreshToken: string): Promise<YouTubeTokenResponse> {
  const config = getYouTubeConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh YouTube token: ${error}`);
  }

  return await response.json();
}

/**
 * Publish video to YouTube
 * @param profileId - Profile ID from database
 * @param postId - Post ID from database
 * @param content - Video description/caption
 * @param mediaUrls - Comma-separated media URLs (video file)
 * @param title - Video title (optional, defaults to content preview)
 */
/**
 * Download video file from URL
 */
async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[YouTube] Downloading video from: ${videoUrl}`);
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Initialize resumable upload session
 */
async function initializeResumableUpload(
  accessToken: string,
  videoMetadata: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: "public" | "private" | "unlisted";
  },
  contentLength: number
): Promise<string> {
  // YouTube limits: title max 100 chars, description max 5000 chars
  const title = videoMetadata.title.substring(0, 100).trim();
  const description = videoMetadata.description.substring(0, 5000).trim();

  // Ensure title is not empty
  if (!title) {
    throw new Error("Video title cannot be empty");
  }

  // Clean tags - max 500 chars total, max 30 tags, each tag max 30 chars
  const tags = (videoMetadata.tags || [])
    .map(tag => tag.substring(0, 30).trim())
    .filter(tag => tag.length > 0)
    .slice(0, 30);

  // Build snippet with all required fields
  const snippet: any = {
    title: title,
    description: description || "",
    categoryId: videoMetadata.categoryId || "22", // People & Blogs - required field
  };

  // Only add tags if we have any (optional field)
  if (tags.length > 0) {
    snippet.tags = tags;
  }

  const metadata = {
    snippet: snippet,
    status: {
      privacyStatus: videoMetadata.privacyStatus || "public",
      selfDeclaredMadeForKids: false,
    },
  };

  // Remove any undefined values from metadata to avoid issues
  const cleanMetadata = JSON.parse(JSON.stringify(metadata));

  console.log(`[YouTube] Upload metadata:`, JSON.stringify(cleanMetadata, null, 2));

  const response = await fetch(
    `${YOUTUBE_API_URL}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": contentLength.toString(),
      },
      body: JSON.stringify(cleanMetadata),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = errorText;
    }

    console.error(`[YouTube] Upload initialization failed:`);
    console.error(`[YouTube] Status: ${response.status} ${response.statusText}`);
    console.error(`[YouTube] Error response:`, errorData);

    // Try to extract more detailed error information
    if (errorData?.error?.errors) {
      errorData.error.errors.forEach((err: any, idx: number) => {
        console.error(`[YouTube] Error ${idx + 1}:`, {
          message: err.message,
          domain: err.domain,
          reason: err.reason,
          location: err.location,
          locationType: err.locationType
        });
      });
    }

    // Log the exact metadata that was sent for debugging
    console.error(`[YouTube] Metadata sent:`, JSON.stringify(cleanMetadata, null, 2));

    throw new Error(`Failed to initialize upload: ${errorText}`);
  }

  const uploadUrl = response.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from YouTube");
  }

  return uploadUrl;
}

/**
 * Upload video using resumable upload protocol
 * Returns the final response which contains the video ID
 */
async function uploadVideoResumable(
  uploadUrl: string,
  videoBuffer: Buffer
): Promise<Response> {
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  const totalSize = videoBuffer.length;
  let uploadedBytes = 0;
  let finalResponse: Response | null = null;

  while (uploadedBytes < totalSize) {
    const chunkEnd = Math.min(uploadedBytes + chunkSize, totalSize);
    const chunk = videoBuffer.slice(uploadedBytes, chunkEnd);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.length.toString(),
        "Content-Range": `bytes ${uploadedBytes}-${chunkEnd - 1}/${totalSize}`,
      },
      body: chunk,
    });

    if (response.status === 308) {
      // Resume upload - get next byte position from Range header
      const rangeHeader = response.headers.get("Range");
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match) {
          uploadedBytes = parseInt(match[1]) + 1;
        } else {
          uploadedBytes = chunkEnd;
        }
      } else {
        uploadedBytes = chunkEnd;
      }
      console.log(`[YouTube] Upload progress: ${uploadedBytes}/${totalSize} bytes (${Math.round((uploadedBytes / totalSize) * 100)}%)`);
    } else if (response.ok) {
      // Upload complete - save the final response
      finalResponse = response;
      console.log(`[YouTube] Upload completed: ${totalSize} bytes`);
      break;
    } else {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }
  }

  if (!finalResponse) {
    throw new Error("Upload did not complete successfully");
  }

  return finalResponse;
}

/**
 * Get uploaded video ID from upload response
 * After successful upload, YouTube returns the video resource in the response body
 */
async function getVideoIdFromUploadResponse(
  uploadResponse: Response
): Promise<string> {
  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const data = await uploadResponse.json();

  if (data.id) {
    return data.id;
  }

  throw new Error("Video ID not found in upload response");
}


export async function publishToYouTube(
  profileId: string,
  postId: string,
  content: string,
  mediaUrls: string,
  title?: string
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[YouTube] Publishing post ${postId} to profile ${profileId}`);

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

  // Verify user has a YouTube channel
  try {
    const channelInfo = await getYouTubeChannelInfo(profile.accessToken);
    if (!channelInfo) {
      throw new Error(
        `No YouTube channel found for this account. ` +
        `Please create a YouTube channel at https://www.youtube.com/create_channel before uploading videos.`
      );
    }
    console.log(`[YouTube] Channel verified: ${channelInfo.snippet.title}`);
  } catch (error) {
    console.error(`[YouTube] Failed to verify channel:`, error);
    throw new Error(
      `Failed to verify YouTube channel. ` +
      `Please ensure you have a YouTube channel created and the access token has the required permissions.`
    );
  }

  try {
    // Parse media URLs
    const mediaArray = mediaUrls ? mediaUrls.split(",").filter(Boolean) : [];

    if (mediaArray.length === 0) {
      throw new Error("YouTube requires a video file to upload");
    }

    // YouTube only supports one video per upload
    if (mediaArray.length > 1) {
      console.warn(`[YouTube] Multiple media files provided, using first one: ${mediaArray[0]}`);
    }

    const videoUrl = mediaArray[0];

    // Generate video title from content if not provided
    // For Shorts, prefer title from first line of content, otherwise use provided title
    let videoTitle = title;
    if (!videoTitle && content) {
      // Extract first line or first 100 chars
      const firstLine = content.split('\n')[0].trim();
      videoTitle = firstLine.substring(0, 100) || "Untitled Video";
    }
    if (!videoTitle) {
      videoTitle = "Untitled Video";
    }

    // Ensure title is not empty and within limits
    videoTitle = videoTitle.trim().substring(0, 100);
    if (!videoTitle) {
      videoTitle = "Untitled Video";
    }

    // Ensure description is not empty - YouTube API requires non-empty description
    let videoDescription = content.trim();
    if (!videoDescription) {
      videoDescription = videoTitle; // Use title as description if content is empty
      console.log(`[YouTube] Content is empty, using title as description`);
    }

    console.log(`[YouTube] Starting video upload for: ${videoUrl}`);
    console.log(`[YouTube] Title: ${videoTitle} (${videoTitle.length} chars)`);
    console.log(`[YouTube] Description: ${videoDescription.substring(0, 200)}... (${videoDescription.length} chars)`);

    // Step 1: Download video file
    console.log(`[YouTube] Step 1: Downloading video file...`);
    const videoBuffer = await downloadVideo(videoUrl);
    console.log(`[YouTube] Video downloaded: ${videoBuffer.length} bytes`);

    // Step 2: Initialize resumable upload with content length
    console.log(`[YouTube] Step 2: Initializing resumable upload...`);
    const uploadUrl = await initializeResumableUpload(
      profile.accessToken,
      {
        title: videoTitle,
        description: videoDescription,
        privacyStatus: "public",
      },
      videoBuffer.length
    );
    console.log(`[YouTube] Upload URL obtained: ${uploadUrl.substring(0, 100)}...`);

    // Step 3: Upload video in chunks
    console.log(`[YouTube] Step 3: Uploading video in chunks...`);
    const uploadResponse = await uploadVideoResumable(uploadUrl, videoBuffer);

    // Step 4: Get video ID from response
    console.log(`[YouTube] Step 4: Getting video ID from response...`);
    const videoId = await getVideoIdFromUploadResponse(uploadResponse);
    console.log(`[YouTube] Video uploaded successfully. Video ID: ${videoId}`);

    // Generate video URL
    const videoUrl_youtube = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      platformPostId: videoId,
      metadata: {
        platform: "youtube",
        publishedAt: new Date().toISOString(),
        channelId: profile.platformUserId,
        channelName: profile.platformUsername,
        videoUrl: videoUrl_youtube,
        title: videoTitle,
        description: content,
      },
    };
  } catch (error) {
    console.error(`[YouTube] Error publishing video:`, error);
    throw error;
  }
}

/**
 * Handle YouTube-specific errors
 */
export function handleYouTubeError(error: any): string {
  if (error.response?.data) {
    const data = error.response.data;

    // Common YouTube error types
    const errorTypes: Record<string, string> = {
      "invalid_client": "Invalid YouTube API credentials. Please check your app settings.",
      "invalid_grant": "YouTube authorization expired. Please reconnect your account.",
      "access_denied": "YouTube authorization was denied. Please try again.",
      "quotaExceeded": "YouTube API quota exceeded. Please wait before trying again.",
      "forbidden": "You don't have permission to perform this action. Check your YouTube channel settings.",
      "uploadLimitExceeded": "Video file is too large. YouTube has size and duration limits.",
      "invalidVideoFormat": "Video format is not supported by YouTube.",
    };

    if (data.error && errorTypes[data.error]) {
      return errorTypes[data.error];
    }

    if (data.error?.message) {
      return `YouTube error: ${data.error.message}`;
    }

    if (data.message) {
      return `YouTube error: ${data.message}`;
    }
  }

  if (error.message) {
    return error.message;
  }

  return "Failed to publish to YouTube. Please try again.";
}

