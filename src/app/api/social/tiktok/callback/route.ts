import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * TikTok OAuth callback endpoint
 * Phase 2: Will handle OAuth flow and exchange code for access token
 * Phase 1: Placeholder that returns success
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("TikTok OAuth error:", error);
    return NextResponse.redirect(
      new URL("/profiles?error=tiktok_auth_failed", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/profiles?error=missing_code", request.url),
    );
  }

  // TODO Phase 2: Exchange code for access token
  // const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     client_key: process.env.TIKTOK_CLIENT_KEY,
  //     client_secret: process.env.TIKTOK_CLIENT_SECRET,
  //     code,
  //     grant_type: 'authorization_code',
  //     redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/tiktok/callback`,
  //   }),
  // });

  // TODO Phase 2: Get user profile and save to database

  // Placeholder success response
  return NextResponse.redirect(
    new URL("/profiles?success=tiktok_connected", request.url),
  );
}


