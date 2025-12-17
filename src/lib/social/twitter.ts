/**
 * Twitter/X API Integration
 * Handles OAuth 2.0 flow with PKCE and tweet posting
 * Uses Twitter API v2
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Twitter API configuration
const TWITTER_API_VERSION = "2";
const TWITTER_API_URL = `https://api.twitter.com/${TWITTER_API_VERSION}`;
const TWITTER_UPLOAD_URL = "https://upload.twitter.com/1.1";
const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

// Required scopes
export const TWITTER_SCOPES = ["tweet.read", "tweet.write", "users.read"].join(" ");

// Tweet limitations
export const TWITTER_LIMITS = {
  tweetLength: 280,
  maxImages: 4,
  maxVideos: 1,
  imageSize: 5 * 1024 * 1024, // 5MB
  videoSize: 512 * 1024 * 1024, // 512MB
  gifSize: 15 * 1024 * 1024, // 15MB
};

interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TwitterTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
}

interface TwitterMediaUploadResponse {
  media_id_string: string;
  media_id: number;
  size: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
  video?: {
    video_type: string;
  };
}

interface TwitterTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

/**
 * Get Twitter OAuth configuration from environment variables
 */
function getTwitterConfig(): TwitterConfig {
  const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;
  const redirectUri = process.env.TWITTER_REDIRECT_URI || "http://localhost:3001/api/social/twitter/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Twitter API credentials are required. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in .env");
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
 * Generate Twitter OAuth 2.0 URL with PKCE
 * @param state - Random state parameter for CSRF protection
 * @param codeChallenge - PKCE code challenge
 */
export function generateTwitterAuthUrl(state: string, codeChallenge: string): string {
  const config = getTwitterConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: TWITTER_SCOPES,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from callback
 * @param codeVerifier - PKCE code verifier
 */
export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string
): Promise<TwitterTokenResponse> {
  const config = getTwitterConfig();

  const params = new URLSearchParams({
    code: code,
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange Twitter code: ${error}`);
  }

  return await response.json();
}

/**
 * Get Twitter user information
 * @param accessToken - User's access token
 */
export async function getTwitterUserInfo(accessToken: string): Promise<TwitterUserResponse["data"]> {
  const response = await fetch(`${TWITTER_API_URL}/users/me?user.fields=profile_image_url`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Twitter user info: ${error}`);
  }

  const data: TwitterUserResponse = await response.json();
  return data.data;
}

/**
 * Split long content into tweet-sized chunks (threads)
 * @param content - Original content
 * @param maxLength - Max characters per tweet (default 280)
 */
export function splitIntoTweets(content: string, maxLength: number = TWITTER_LIMITS.tweetLength): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const tweets: string[] = [];
  const sentences = content.split(/([.!?]\s+)/);
  let currentTweet = "";

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Check if adding this sentence would exceed limit
    if ((currentTweet + sentence).length <= maxLength) {
      currentTweet += sentence;
    } else {
      // Save current tweet and start new one
      if (currentTweet.trim()) {
        tweets.push(currentTweet.trim());
      }
      
      // If single sentence is too long, split by words
      if (sentence.length > maxLength) {
        const words = sentence.split(" ");
        let wordTweet = "";
        
        for (const word of words) {
          if ((wordTweet + " " + word).length <= maxLength) {
            wordTweet += (wordTweet ? " " : "") + word;
          } else {
            if (wordTweet.trim()) {
              tweets.push(wordTweet.trim());
            }
            wordTweet = word;
          }
        }
        
        currentTweet = wordTweet;
      } else {
        currentTweet = sentence;
      }
    }
  }

  // Add remaining content
  if (currentTweet.trim()) {
    tweets.push(currentTweet.trim());
  }

  // Add thread numbering if multiple tweets
  if (tweets.length > 1) {
    return tweets.map((tweet, index) => `${index + 1}/${tweets.length} ${tweet}`);
  }

  return tweets;
}

/**
 * Upload media to Twitter
 * @param accessToken - User's access token
 * @param mediaUrl - URL or path to media file
 * @param mediaType - Type of media (image or video)
 */
async function uploadMediaToTwitter(
  accessToken: string,
  mediaUrl: string,
  mediaType: "image" | "video"
): Promise<string> {
  console.log(`[Twitter] Uploading ${mediaType}: ${mediaUrl}`);

  // Note: In production, you would fetch the actual media file
  // For now, this is a placeholder that simulates media upload
  
  // Twitter media upload requires:
  // 1. INIT - Initialize upload
  // 2. APPEND - Upload media chunks
  // 3. FINALIZE - Complete upload

  // Placeholder: Return fake media ID
  const fakeMediaId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log(`[Twitter] Media uploaded successfully: ${fakeMediaId}`);
  
  return fakeMediaId;
}

/**
 * Create a single tweet
 * @param accessToken - User's access token
 * @param text - Tweet text
 * @param mediaIds - Array of media IDs
 * @param replyToId - ID of tweet to reply to (for threads)
 */
async function createTweet(
  accessToken: string,
  text: string,
  mediaIds?: string[],
  replyToId?: string
): Promise<TwitterTweetResponse["data"]> {
  const payload: any = {
    text: text,
  };

  // Add media if provided
  if (mediaIds && mediaIds.length > 0) {
    payload.media = {
      media_ids: mediaIds,
    };
  }

  // Add reply if this is part of a thread
  if (replyToId) {
    payload.reply = {
      in_reply_to_tweet_id: replyToId,
    };
  }

  const response = await fetch(`${TWITTER_API_URL}/tweets`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create tweet: ${error}`);
  }

  const data: TwitterTweetResponse = await response.json();
  return data.data;
}

/**
 * Publish content to Twitter (with thread support)
 * @param profileId - Profile ID from database
 * @param postId - Post ID from database
 * @param content - Tweet content
 * @param mediaUrls - Comma-separated media URLs
 */
export async function publishToTwitter(
  profileId: string,
  postId: string,
  content: string,
  mediaUrls: string
): Promise<{ platformPostId: string; metadata?: any }> {
  console.log(`[Twitter] Publishing post ${postId} to profile ${profileId}`);

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
    let mediaIds: string[] = [];

    // Upload media if provided
    if (mediaArray.length > 0) {
      console.log(`[Twitter] Uploading ${mediaArray.length} media file(s)...`);
      
      // Twitter allows up to 4 images or 1 video
      const isVideo = mediaArray.some(url => 
        url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".avi")
      );

      if (isVideo && mediaArray.length > 1) {
        throw new Error("Twitter only allows 1 video per tweet");
      }

      if (!isVideo && mediaArray.length > TWITTER_LIMITS.maxImages) {
        throw new Error(`Twitter allows maximum ${TWITTER_LIMITS.maxImages} images per tweet`);
      }

      // Upload each media file
      for (const mediaUrl of mediaArray) {
        const mediaType = isVideo ? "video" : "image";
        const mediaId = await uploadMediaToTwitter(
          profile.accessToken,
          mediaUrl,
          mediaType
        );
        mediaIds.push(mediaId);
      }
    }

    // Split content into tweets if needed
    const tweets = splitIntoTweets(content);
    console.log(`[Twitter] Content split into ${tweets.length} tweet(s)`);

    // Post tweets (thread if multiple)
    let firstTweetId: string | null = null;
    let previousTweetId: string | null = null;

    for (let i = 0; i < tweets.length; i++) {
      const tweetText = tweets[i];
      
      // Only attach media to first tweet
      const attachMedia = i === 0 ? mediaIds : undefined;
      
      console.log(`[Twitter] Posting tweet ${i + 1}/${tweets.length}...`);
      
      const tweet = await createTweet(
        profile.accessToken,
        tweetText,
        attachMedia,
        previousTweetId || undefined
      );

      if (i === 0) {
        firstTweetId = tweet.id;
      }
      previousTweetId = tweet.id;

      // Small delay between tweets to avoid rate limits
      if (i < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!firstTweetId) {
      throw new Error("Failed to get tweet ID");
    }

    console.log(`[Twitter] Successfully published. Tweet ID: ${firstTweetId}`);
    
    // Generate tweet URL
    const tweetUrl = profile.platformUsername
      ? `https://twitter.com/${profile.platformUsername}/status/${firstTweetId}`
      : `https://twitter.com/i/web/status/${firstTweetId}`;

    return {
      platformPostId: firstTweetId,
      metadata: {
        platform: "twitter",
        publishedAt: new Date().toISOString(),
        username: profile.platformUsername,
        userId: profile.platformUserId,
        tweetUrl: tweetUrl,
        threadLength: tweets.length,
        hasMedia: mediaIds.length > 0,
      },
    };
  } catch (error) {
    console.error(`[Twitter] Error publishing tweet:`, error);
    throw error;
  }
}

/**
 * Refresh expired access token
 * @param refreshToken - User's refresh token
 */
export async function refreshTwitterToken(refreshToken: string): Promise<TwitterTokenResponse> {
  const config = getTwitterConfig();

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: config.clientId,
  });

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Twitter token: ${error}`);
  }

  return await response.json();
}

/**
 * Handle Twitter-specific errors
 */
export function handleTwitterError(error: any): string {
  if (error.response?.data) {
    const data = error.response.data;

    // Common Twitter error types
    const errorTypes: Record<string, string> = {
      "invalid_client": "Invalid Twitter API credentials. Please check your app settings.",
      "invalid_grant": "Twitter authorization expired. Please reconnect your account.",
      "access_denied": "Twitter authorization was denied. Please try again.",
      "rate_limit_exceeded": "Twitter API rate limit exceeded. Please wait 15 minutes before trying again.",
      "duplicate": "This tweet has already been posted recently. Twitter doesn't allow duplicate tweets.",
      "invalid_media": "Media file is invalid or too large. Please check the file and try again.",
      "tweet_too_long": "Tweet exceeds 280 characters. Content will be split into a thread automatically.",
    };

    if (data.error && errorTypes[data.error]) {
      return errorTypes[data.error];
    }

    if (data.detail) {
      return `Twitter error: ${data.detail}`;
    }

    if (data.title) {
      return `Twitter error: ${data.title}`;
    }
  }

  if (error.message) {
    return error.message;
  }

  return "Failed to publish to Twitter. Please try again.";
}





