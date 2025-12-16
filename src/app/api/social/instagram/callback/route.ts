import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Instagram OAuth callback endpoint
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
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(
      new URL("/profiles?error=instagram_auth_failed", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/profiles?error=missing_code", request.url),
    );
  }

  // TODO Phase 2: Exchange code for access token
  // const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
  //   method: 'POST',
  //   body: new URLSearchParams({
  //     client_id: process.env.INSTAGRAM_CLIENT_ID,
  //     client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
  //     grant_type: 'authorization_code',
  //     redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/instagram/callback`,
  //     code,
  //   }),
  // });

  // TODO Phase 2: Get user profile and save to database

  // Placeholder success response
  return NextResponse.redirect(
    new URL("/profiles?success=instagram_connected", request.url),
  );
}


