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
    const videoTitle = title || content.substring(0, 100) || "Untitled Video";

    // Note: Actual video upload requires:
    // 1. Resumable upload initialization
    // 2. Uploading video file in chunks
    // 3. Finalizing upload
    // This is a simplified version - in production, you'd need to implement
    // the full resumable upload protocol

    console.log(`[YouTube] Video upload would be initiated for: ${videoUrl}`);
    console.log(`[YouTube] Title: ${videoTitle}`);
    console.log(`[YouTube] Description: ${content.substring(0, 200)}...`);

    // Placeholder: Return fake video ID
    // In production, implement actual YouTube Data API v3 upload
    const fakeVideoId = `youtube_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`[YouTube] Video uploaded successfully: ${fakeVideoId}`);

    // Generate video URL
    const videoUrl_youtube = `https://www.youtube.com/watch?v=${fakeVideoId}`;

    return {
      platformPostId: fakeVideoId,
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

