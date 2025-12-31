/**
 * YouTube OAuth 2.0 Connect Endpoint
 * Initiates YouTube OAuth flow with PKCE
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateYouTubeAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
} from "@/lib/social/youtube";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate PKCE parameters
    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete only expired OAuthState records for this user/platform to avoid accumulation
    // Don't delete active states as they might be in use
    await prisma.oAuthState.deleteMany({
      where: {
        userId: session.user.id,
        platform: "YOUTUBE",
        expiresAt: {
          lt: new Date(), // Less than current time (expired)
        },
      },
    });

    // Store state and code verifier temporarily
    const oauthState = await prisma.oAuthState.create({
      data: {
        userId: session.user.id,
        state: state,
        codeVerifier: codeVerifier,
        platform: "YOUTUBE",
        expiresAt: expiresAt,
      },
    });

    console.log(`[YouTube] OAuthState created:`, {
      id: oauthState.id,
      state: oauthState.state,
      userId: oauthState.userId,
      platform: oauthState.platform,
      expiresAt: oauthState.expiresAt,
      createdAt: oauthState.createdAt,
    });

    // Generate YouTube OAuth URL
    const authUrl = generateYouTubeAuthUrl(state, codeChallenge);

    console.log(`[YouTube] Redirecting user ${session.user.id} to YouTube OAuth`);
    console.log(`[YouTube] Auth URL: ${authUrl}`);

    // Redirect to YouTube authorization page
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("[YouTube] Error initiating OAuth:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate YouTube connection" },
      { status: 500 }
    );
  }
}

