/**
 * YouTube OAuth 2.0 Callback Endpoint
 * Handles OAuth callback and stores user credentials
 */

import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils/url";
import { auth } from "@/lib/auth";
import {
  exchangeYouTubeCode,
  getYouTubeUserInfo,
  getYouTubeChannelInfo,
} from "@/lib/social/youtube";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth();

    if (!session?.user?.id) {
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    // Get OAuth parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Get base URL for redirects
    const baseUrl = getBaseUrl(request);

    // Check for OAuth errors
    if (error) {
      console.error(`[YouTube] OAuth error: ${error}`);
      const errorUrl = new URL("/profiles", baseUrl);
      errorUrl.searchParams.set("error", `YouTube authorization failed: ${error}`);
      return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("[YouTube] Missing code or state parameter");
      const errorUrl = new URL("/profiles", baseUrl);
      errorUrl.searchParams.set("error", "Invalid YouTube callback parameters");
      return NextResponse.redirect(errorUrl);
    }

    // Extract userId for TypeScript type narrowing
    const userId = session.user.id;

    // Log for debugging
    console.log(`[YouTube] Looking for OAuthState with state: ${state}, userId: ${userId}`);

    // Verify state and get code verifier using Prisma client
    const storedState = await prisma.oAuthState.findFirst({
      where: {
        userId: userId,
        state: state,
        platform: "YOUTUBE",
        expiresAt: {
          gt: new Date(), // Greater than current time
        },
      },
      select: {
        codeVerifier: true,
        expiresAt: true,
      },
    });

    if (!storedState) {
      // Log more details for debugging
      const allStates = await prisma.oAuthState.findMany({
        where: {
          userId: userId,
          platform: "YOUTUBE",
        },
        select: {
          state: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      console.error("[YouTube] Invalid or expired state parameter");
      console.error(`[YouTube] State received: ${state}`);
      console.error(`[YouTube] Found ${allStates.length} OAuthState records for this user/platform`);
      allStates.forEach((s, i) => {
        console.error(`[YouTube] State ${i + 1}: ${s.state}, expiresAt: ${s.expiresAt}, createdAt: ${s.createdAt}`);
      });
      
      const errorUrl = new URL("/profiles", baseUrl);
      errorUrl.searchParams.set("error", "Invalid or expired YouTube authorization state");
      return NextResponse.redirect(errorUrl);
    }

    const codeVerifier = storedState.codeVerifier;
    console.log(`[YouTube] Found valid OAuthState, expiresAt: ${storedState.expiresAt}`);

    // Exchange code for access token
    console.log(`[YouTube] Exchanging code for access token...`);
    const tokenData = await exchangeYouTubeCode(code, codeVerifier);

    // Get user information
    console.log(`[YouTube] Fetching user information...`);
    const userInfo = await getYouTubeUserInfo(tokenData.access_token);

    // Get YouTube channel information
    console.log(`[YouTube] Fetching channel information...`);
    const channelInfo = await getYouTubeChannelInfo(tokenData.access_token);

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokenData.expires_in);

    // Use channel ID as platformUserId, or fallback to Google user ID
    const platformUserId = channelInfo?.id || userInfo.id;
    const platformUsername = channelInfo?.snippet?.customUrl || channelInfo?.snippet?.title || userInfo.name;
    const profileName = channelInfo?.snippet?.title || userInfo.name;

    // Store or update profile in database
    console.log(`[YouTube] Saving profile for user ${platformUsername}...`);
    
    // Check if profile already exists for this user
    const existingProfile = await prisma.profile.findFirst({
      where: {
        userId: userId,
        platform: "YOUTUBE",
        platformUserId: platformUserId,
      },
    });

    if (existingProfile) {
      // Update existing profile
      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          name: profileName,
          platformUsername: platformUsername,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiresAt: tokenExpiresAt,
          isActive: true,
          metadata: JSON.stringify({
            email: userInfo.email,
            picture: userInfo.picture,
            channelId: channelInfo?.id,
            channelTitle: channelInfo?.snippet?.title,
            channelDescription: channelInfo?.snippet?.description,
            channelThumbnail: channelInfo?.snippet?.thumbnails?.high?.url,
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new profile
      await prisma.profile.create({
        data: {
          userId: userId,
          name: profileName,
          platform: "YOUTUBE",
          platformUserId: platformUserId,
          platformUsername: platformUsername,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiresAt: tokenExpiresAt,
          isActive: true,
          metadata: JSON.stringify({
            email: userInfo.email,
            picture: userInfo.picture,
            channelId: channelInfo?.id,
            channelTitle: channelInfo?.snippet?.title,
            channelDescription: channelInfo?.snippet?.description,
            channelThumbnail: channelInfo?.snippet?.thumbnails?.high?.url,
          }),
        },
      });
    }

    // Clean up OAuth state
    await prisma.$executeRaw`
      DELETE FROM OAuthState
      WHERE userId = ${userId}
        AND state = ${state}
    `;

    console.log(`[YouTube] Profile connected successfully: ${platformUsername}`);

    // Redirect to profiles page with success message
    const successUrl = new URL("/profiles", baseUrl);
    successUrl.searchParams.set("success", `YouTube account ${platformUsername} connected successfully!`);
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error("[YouTube] Error in OAuth callback:", error);
    
    // Get base URL for error redirect
    const baseUrl = getBaseUrl(request);
    const errorUrl = new URL("/profiles", baseUrl);
    errorUrl.searchParams.set(
      "error",
      `Failed to connect YouTube account: ${error.message || "Unknown error"}`
    );
    return NextResponse.redirect(errorUrl);
  }
}

