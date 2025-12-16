import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTikTokAuthUrl } from "@/lib/social/tiktok";
import crypto from "crypto";

/**
 * Initiate TikTok OAuth flow
 * GET /api/social/tiktok/connect
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");
    
    // Store state in session/database for verification in callback
    // For now, we'll encode userId in state (in production, use proper session storage)
    const stateData = {
      userId: session.user.id,
      timestamp: Date.now(),
      nonce: state,
    };
    
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64");
    
    // Generate TikTok authorization URL
    const authUrl = generateTikTokAuthUrl(encodedState);
    
    console.log(`[TikTok OAuth] Redirecting user ${session.user.id} to TikTok authorization`);
    
    // Redirect to TikTok authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[TikTok OAuth] Error initiating OAuth:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to connect TikTok account",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

