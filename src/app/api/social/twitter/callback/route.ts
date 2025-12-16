import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Twitter/X OAuth callback endpoint
 * Phase 2: Will handle OAuth 2.0 flow and exchange code for access token
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
    console.error("Twitter OAuth error:", error);
    return NextResponse.redirect(
      new URL("/profiles?error=twitter_auth_failed", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/profiles?error=missing_code", request.url),
    );
  }

  // TODO Phase 2: Exchange code for access token
  // const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //     'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
  //   },
  //   body: new URLSearchParams({
  //     code,
  //     grant_type: 'authorization_code',
  //     redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/twitter/callback`,
  //     code_verifier: 'challenge', // PKCE code verifier from session
  //   }),
  // });

  // TODO Phase 2: Get user profile and save to database

  // Placeholder success response
  return NextResponse.redirect(
    new URL("/profiles?success=twitter_connected", request.url),
  );
}


