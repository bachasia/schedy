/**
 * Twitter OAuth 2.0 Callback Endpoint
 * Handles OAuth callback and stores user credentials
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  exchangeTwitterCode,
  getTwitterUserInfo,
} from "@/lib/social/twitter";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get OAuth parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error(`[Twitter] OAuth error: ${error}`);
      const errorUrl = new URL("/profiles", request.url);
      errorUrl.searchParams.set("error", `Twitter authorization failed: ${error}`);
      return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("[Twitter] Missing code or state parameter");
      const errorUrl = new URL("/profiles", request.url);
      errorUrl.searchParams.set("error", "Invalid Twitter callback parameters");
      return NextResponse.redirect(errorUrl);
    }

    // Verify state and get code verifier
    const storedState = await prisma.$queryRaw<Array<{
      codeVerifier: string;
      expiresAt: string;
    }>>`
      SELECT codeVerifier, expiresAt
      FROM OAuthState
      WHERE userId = ${session.user.id}
        AND state = ${state}
        AND platform = 'TWITTER'
        AND expiresAt > datetime('now')
      LIMIT 1
    `;

    if (!storedState || storedState.length === 0) {
      console.error("[Twitter] Invalid or expired state parameter");
      const errorUrl = new URL("/profiles", request.url);
      errorUrl.searchParams.set("error", "Invalid or expired Twitter authorization state");
      return NextResponse.redirect(errorUrl);
    }

    const codeVerifier = storedState[0].codeVerifier;

    // Exchange code for access token
    console.log(`[Twitter] Exchanging code for access token...`);
    const tokenData = await exchangeTwitterCode(code, codeVerifier);

    // Get user information
    console.log(`[Twitter] Fetching user information...`);
    const userInfo = await getTwitterUserInfo(tokenData.access_token);

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokenData.expires_in);

    // Store or update profile in database
    console.log(`[Twitter] Saving profile for user ${userInfo.username}...`);
    
    await prisma.profile.upsert({
      where: {
        userId_platform_platformUserId: {
          userId: session.user.id,
          platform: "TWITTER",
          platformUserId: userInfo.id,
        },
      },
      create: {
        userId: session.user.id,
        name: userInfo.name,
        platform: "TWITTER",
        platformUserId: userInfo.id,
        platformUsername: userInfo.username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenExpiresAt,
        isActive: true,
        metadata: JSON.stringify({
          profileImageUrl: userInfo.profile_image_url,
        }),
      },
      update: {
        name: userInfo.name,
        platformUsername: userInfo.username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenExpiresAt,
        isActive: true,
        metadata: JSON.stringify({
          profileImageUrl: userInfo.profile_image_url,
        }),
        updatedAt: new Date(),
      },
    });

    // Clean up OAuth state
    await prisma.$executeRaw`
      DELETE FROM OAuthState
      WHERE userId = ${session.user.id}
        AND state = ${state}
    `;

    console.log(`[Twitter] Profile connected successfully: @${userInfo.username}`);

    // Redirect to profiles page with success message
    const successUrl = new URL("/profiles", request.url);
    successUrl.searchParams.set("success", `Twitter account @${userInfo.username} connected successfully!`);
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error("[Twitter] Error in OAuth callback:", error);
    
    const errorUrl = new URL("/profiles", request.url);
    errorUrl.searchParams.set(
      "error",
      `Failed to connect Twitter account: ${error.message || "Unknown error"}`
    );
    return NextResponse.redirect(errorUrl);
  }
}
