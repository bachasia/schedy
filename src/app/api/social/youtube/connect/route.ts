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

    // Store state and code verifier temporarily
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO OAuthState (userId, state, codeVerifier, platform, expiresAt)
      VALUES (
        ${session.user.id},
        ${state},
        ${codeVerifier},
        'YOUTUBE',
        datetime('now', '+10 minutes')
      )
    `;

    // Generate YouTube OAuth URL
    const authUrl = generateYouTubeAuthUrl(state, codeChallenge);

    console.log(`[YouTube] Redirecting user ${session.user.id} to YouTube OAuth`);

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

