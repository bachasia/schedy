/**
 * Token Management System
 * Handles token refresh, expiration checking, and proactive maintenance
 * for all social media platforms
 */

import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import {
  getLongLivedToken as getFacebookLongLivedToken,
  handleFacebookError,
} from "@/lib/social/facebook";
import {
  refreshTikTokAccessToken,
  handleTikTokError,
} from "@/lib/social/tiktok";
import {
  refreshTwitterToken as refreshTwitterTokenAPI,
  handleTwitterError,
} from "@/lib/social/twitter";

// Token refresh threshold: refresh if expires within 24 hours
const TOKEN_REFRESH_THRESHOLD_HOURS = 24;
const TOKEN_REFRESH_THRESHOLD_MS = TOKEN_REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;

/**
 * Check if a token is expiring soon
 */
export function isTokenExpiringSoon(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return false; // No expiration date means long-lived token
  }

  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD_MS;
}

/**
 * Check if a token is already expired
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return false; // No expiration date means long-lived token
  }

  const now = new Date();
  return expiresAt.getTime() <= now.getTime();
}

/**
 * Get time until token expires (in hours)
 */
export function getTimeUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  return Math.floor(timeUntilExpiry / (1000 * 60 * 60)); // Convert to hours
}

/**
 * Refresh Facebook access token
 * Facebook uses long-lived tokens (60 days)
 */
export async function refreshFacebookToken(profileId: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  console.log(`[TokenManager] Refreshing Facebook token for profile ${profileId}`);

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        platform: true,
        accessToken: true,
        platformUserId: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    if (profile.platform !== Platform.FACEBOOK) {
      throw new Error(`Profile ${profileId} is not a Facebook profile`);
    }

    if (!profile.accessToken) {
      throw new Error(`Profile ${profileId} has no access token`);
    }

    // Exchange short-lived token for long-lived token
    const longLivedToken = await getFacebookLongLivedToken(profile.accessToken);

    // Calculate expiration (60 days from now, or use default if expires_in is not provided)
    const expiresIn = longLivedToken.expires_in || 60 * 24 * 60 * 60; // Default to 60 days in seconds
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Update profile with new token
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        accessToken: longLivedToken.access_token,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(
      `[TokenManager] Successfully refreshed Facebook token for profile ${profileId} (expires: ${expiresAt.toISOString()})`
    );

    return {
      success: true,
      message: `Token refreshed successfully. Expires in ${Math.floor(expiresIn / 86400)} days.`,
      expiresAt,
    };
  } catch (error: any) {
    const errorMessage = handleFacebookError(error);
    console.error(`[TokenManager] Failed to refresh Facebook token for profile ${profileId}:`, errorMessage);

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Refresh TikTok access token
 * TikTok uses refresh tokens (valid for 1 year)
 */
export async function refreshTikTokToken(profileId: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  console.log(`[TokenManager] Refreshing TikTok token for profile ${profileId}`);

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        platform: true,
        refreshToken: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    if (profile.platform !== Platform.TIKTOK) {
      throw new Error(`Profile ${profileId} is not a TikTok profile`);
    }

    if (!profile.refreshToken) {
      throw new Error(`Profile ${profileId} has no refresh token. Please re-authenticate.`);
    }

    // Use TikTok refresh token
    const tokenResponse = await refreshTikTokAccessToken(profile.refreshToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Update profile with new tokens
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token, // TikTok provides new refresh token
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(
      `[TokenManager] Successfully refreshed TikTok token for profile ${profileId} (expires: ${expiresAt.toISOString()})`
    );

    return {
      success: true,
      message: `Token refreshed successfully. Expires in ${Math.floor(tokenResponse.expires_in / 86400)} days.`,
      expiresAt,
    };
  } catch (error: any) {
    const errorMessage = handleTikTokError(error);
    console.error(`[TokenManager] Failed to refresh TikTok token for profile ${profileId}:`, errorMessage);

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Refresh Twitter access token
 * Twitter OAuth 2.0 uses refresh tokens
 */
export async function refreshTwitterToken(profileId: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  console.log(`[TokenManager] Refreshing Twitter token for profile ${profileId}`);

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        platform: true,
        refreshToken: true,
      },
    });

    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    if (profile.platform !== Platform.TWITTER) {
      throw new Error(`Profile ${profileId} is not a Twitter profile`);
    }

    if (!profile.refreshToken) {
      throw new Error(`Profile ${profileId} has no refresh token. Please re-authenticate.`);
    }

    // Use Twitter refresh token
    const tokenResponse = await refreshTwitterTokenAPI(profile.refreshToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Update profile with new tokens
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || profile.refreshToken, // Keep old if not provided
        tokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(
      `[TokenManager] Successfully refreshed Twitter token for profile ${profileId} (expires: ${expiresAt.toISOString()})`
    );

    return {
      success: true,
      message: `Token refreshed successfully. Expires in ${Math.floor(tokenResponse.expires_in / 86400)} days.`,
      expiresAt,
    };
  } catch (error: any) {
    const errorMessage = handleTwitterError(error);
    console.error(`[TokenManager] Failed to refresh Twitter token for profile ${profileId}:`, errorMessage);

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Refresh token for any platform
 */
export async function refreshToken(profileId: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { platform: true },
  });

  if (!profile) {
    return {
      success: false,
      message: `Profile ${profileId} not found`,
    };
  }

  switch (profile.platform) {
    case Platform.FACEBOOK:
    case Platform.INSTAGRAM:
      // Instagram uses same tokens as Facebook
      return await refreshFacebookToken(profileId);

    case Platform.TIKTOK:
      return await refreshTikTokToken(profileId);

    case Platform.TWITTER:
      return await refreshTwitterToken(profileId);

    default:
      return {
        success: false,
        message: `Token refresh not supported for platform: ${profile.platform}`,
      };
  }
}

/**
 * Check and refresh token if needed before publishing
 * Returns true if token is valid and ready, false if refresh failed
 */
export async function ensureValidToken(profileId: string): Promise<boolean> {
  console.log(`[TokenManager] Checking token validity for profile ${profileId}`);

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        platform: true,
        tokenExpiresAt: true,
        isActive: true,
      },
    });

    if (!profile) {
      console.error(`[TokenManager] Profile ${profileId} not found`);
      return false;
    }

    if (!profile.isActive) {
      console.error(`[TokenManager] Profile ${profileId} is not active`);
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(profile.tokenExpiresAt)) {
      console.warn(`[TokenManager] Token for profile ${profileId} is EXPIRED, attempting refresh`);
      
      const result = await refreshToken(profileId);
      
      if (!result.success) {
        console.error(`[TokenManager] Failed to refresh expired token for profile ${profileId}`);
        await markProfileInactive(profileId, "Token expired and refresh failed");
        return false;
      }
      
      console.log(`[TokenManager] Successfully refreshed expired token for profile ${profileId}`);
      return true;
    }

    // Check if token is expiring soon
    if (isTokenExpiringSoon(profile.tokenExpiresAt)) {
      const hoursUntilExpiry = getTimeUntilExpiry(profile.tokenExpiresAt);
      console.warn(
        `[TokenManager] Token for profile ${profileId} expires in ${hoursUntilExpiry}h, proactively refreshing`
      );

      const result = await refreshToken(profileId);

      if (!result.success) {
        console.warn(
          `[TokenManager] Failed to refresh token for profile ${profileId}, but still valid for ${hoursUntilExpiry}h`
        );
        // Don't mark inactive if token is still valid, just log warning
        return true;
      }

      console.log(`[TokenManager] Proactively refreshed token for profile ${profileId}`);
      return true;
    }

    // Token is valid and not expiring soon
    const hoursUntilExpiry = getTimeUntilExpiry(profile.tokenExpiresAt);
    if (hoursUntilExpiry !== null) {
      console.log(`[TokenManager] Token for profile ${profileId} is valid (expires in ${hoursUntilExpiry}h)`);
    } else {
      console.log(`[TokenManager] Token for profile ${profileId} is valid (long-lived)`);
    }

    return true;
  } catch (error) {
    console.error(`[TokenManager] Error checking token validity for profile ${profileId}:`, error);
    return false;
  }
}

/**
 * Mark profile as inactive and store reason
 */
export async function markProfileInactive(
  profileId: string,
  reason: string
): Promise<void> {
  console.log(`[TokenManager] Marking profile ${profileId} as inactive: ${reason}`);

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      isActive: false,
      metadata: {
        deactivatedAt: new Date().toISOString(),
        deactivationReason: reason,
      },
      updatedAt: new Date(),
    },
  });
}

/**
 * Refresh all tokens expiring within threshold
 * This should be called by a cron job daily
 */
export async function refreshExpiringTokens(): Promise<{
  total: number;
  refreshed: number;
  failed: number;
  results: Array<{
    profileId: string;
    platform: string;
    username: string | null;
    success: boolean;
    message: string;
  }>;
}> {
  console.log(`[TokenManager] Starting proactive token refresh job`);

  // Get all active profiles with tokens expiring soon
  const profiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      tokenExpiresAt: {
        not: null,
        lte: new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_MS),
      },
    },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      tokenExpiresAt: true,
      userId: true,
    },
  });

  console.log(`[TokenManager] Found ${profiles.length} profiles with expiring tokens`);

  const results: Array<{
    profileId: string;
    platform: string;
    username: string | null;
    success: boolean;
    message: string;
  }> = [];

  let refreshed = 0;
  let failed = 0;

  for (const profile of profiles) {
    const hoursUntilExpiry = getTimeUntilExpiry(profile.tokenExpiresAt);
    console.log(
      `[TokenManager] Refreshing token for ${profile.platform} profile ${profile.platformUsername} (expires in ${hoursUntilExpiry}h)`
    );

    const result = await refreshToken(profile.id);

    results.push({
      profileId: profile.id,
      platform: profile.platform,
      username: profile.platformUsername,
      success: result.success,
      message: result.message,
    });

    if (result.success) {
      refreshed++;
      console.log(`[TokenManager] ✓ Successfully refreshed token for ${profile.platformUsername}`);
    } else {
      failed++;
      console.error(`[TokenManager] ✗ Failed to refresh token for ${profile.platformUsername}: ${result.message}`);

      // Mark profile as inactive if refresh failed
      await markProfileInactive(profile.id, `Token refresh failed: ${result.message}`);

      // TODO: Send notification to user
      // await sendTokenRefreshFailureNotification(profile.userId, profile);
    }

    // Rate limit: wait 1 second between refresh attempts
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `[TokenManager] Proactive token refresh completed: ${refreshed} refreshed, ${failed} failed out of ${profiles.length} total`
  );

  return {
    total: profiles.length,
    refreshed,
    failed,
    results,
  };
}

/**
 * Get all profiles that need token refresh
 */
export async function getProfilesNeedingRefresh(): Promise<
  Array<{
    id: string;
    platform: Platform;
    platformUsername: string | null;
    tokenExpiresAt: Date | null;
    hoursUntilExpiry: number | null;
    userId: string;
  }>
> {
  const profiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      tokenExpiresAt: {
        not: null,
        lte: new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_MS),
      },
    },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      tokenExpiresAt: true,
      userId: true,
    },
    orderBy: {
      tokenExpiresAt: "asc",
    },
  });

  return profiles.map((profile) => ({
    ...profile,
    hoursUntilExpiry: getTimeUntilExpiry(profile.tokenExpiresAt),
  }));
}

/**
 * Send notification to user about token refresh failure
 * TODO: Implement email or in-app notification
 */
export async function sendTokenRefreshFailureNotification(
  userId: string,
  profile: {
    id: string;
    platform: Platform;
    platformUsername: string | null;
  }
): Promise<void> {
  console.log(
    `[TokenManager] TODO: Send notification to user ${userId} about failed token refresh for ${profile.platform} profile ${profile.platformUsername}`
  );

  // Implementation ideas:
  // 1. Send email via SendGrid/AWS SES
  // 2. Create in-app notification
  // 3. Send push notification
  // 4. Log to notification queue

  // For now, just log
  console.log(`[TokenManager] User ${userId} needs to re-authenticate ${profile.platform} profile`);
}

