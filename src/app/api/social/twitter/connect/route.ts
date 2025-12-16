/**
 * Twitter OAuth 2.0 Connect Endpoint
 * Initiates Twitter OAuth flow with PKCE
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateTwitterAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
} from "@/lib/social/twitter";
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
    // In production, use Redis or encrypted session storage
    // For now, we'll use database with short TTL
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO OAuthState (userId, state, codeVerifier, platform, expiresAt)
      VALUES (
        ${session.user.id},
        ${state},
        ${codeVerifier},
        'TWITTER',
        datetime('now', '+10 minutes')
      )
    `;

    // Generate Twitter OAuth URL
    const authUrl = generateTwitterAuthUrl(state, codeChallenge);

    console.log(`[Twitter] Redirecting user ${session.user.id} to Twitter OAuth`);

    // Return redirect URL
    return NextResponse.json({
      url: authUrl,
    });
  } catch (error: any) {
    console.error("[Twitter] Error initiating OAuth:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Twitter connection" },
      { status: 500 }
    );
  }
}

