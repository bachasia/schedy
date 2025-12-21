import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils/url";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  exchangeTikTokCode, 
  getTikTokUserInfo,
  handleTikTokError 
} from "@/lib/social/tiktok";

/**
 * Handle TikTok OAuth callback
 * GET /api/social/tiktok/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("[TikTok Callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/profiles?error=${encodeURIComponent(`TikTok authorization failed: ${error}`)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[TikTok Callback] Missing code or state parameter");
    return NextResponse.redirect(
      new URL("/profiles?error=Invalid+callback+parameters", request.url)
    );
  }

  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error("[TikTok Callback] No session found");
      return NextResponse.redirect(
        new URL("/login?error=Please+login+first", getBaseUrl(request))
      );
    }

    // Decode and verify state
    const stateData = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    );
    
    const { userId, timestamp, nonce } = stateData;

    // Verify userId matches session
    if (userId !== session.user.id) {
      console.error(`[TikTok Callback] User ID mismatch: state=${userId}, session=${session.user.id}`);
      return NextResponse.redirect(
        new URL("/profiles?error=Invalid+authorization+state", getBaseUrl(request))
      );
    }

    // Verify state timestamp (prevent replay attacks)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (timestamp < fiveMinutesAgo) {
      throw new Error("Authorization state expired. Please try again.");
    }

    console.log(`[TikTok Callback] Processing callback for user ${userId}`);

    // Step 1: Exchange code for access token
    console.log("[TikTok Callback] Exchanging authorization code for access token...");
    const tokenData = await exchangeTikTokCode(code);
    
    const {
      access_token,
      expires_in,
      refresh_token,
      refresh_expires_in,
      open_id,
    } = tokenData;

    // Step 2: Get user information
    console.log("[TikTok Callback] Fetching user information...");
    const userInfo = await getTikTokUserInfo(access_token);

    // Step 3: Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    
    console.log("[TikTok Callback] User info:", {
      openId: userInfo.open_id,
      displayName: userInfo.display_name,
      tokenExpiresAt,
    });

    // Step 4: Check if profile already exists
    const existingProfile = await prisma.profile.findFirst({
      where: {
        userId: userId,
        platform: "TIKTOK",
        platformUserId: userInfo.open_id,
      },
    });

    if (existingProfile) {
      // Update existing profile
      console.log(`[TikTok Callback] Updating existing profile ${existingProfile.id}`);
      
      const updatedProfile = await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          name: userInfo.display_name,
          platformUsername: userInfo.display_name, // TikTok doesn't provide @ username in basic API
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt,
          isActive: true,
          metadata: {
            unionId: userInfo.union_id,
            avatarUrl: userInfo.avatar_url,
            refreshExpiresIn: refresh_expires_in,
          },
          updatedAt: new Date(),
        },
      });

      console.log("[TikTok Callback] Profile updated successfully:", {
        id: updatedProfile.id,
        platform: updatedProfile.platform,
        userId: updatedProfile.userId,
        isActive: updatedProfile.isActive,
      });
    } else {
      // Create new profile
      console.log("[TikTok Callback] Creating new TikTok profile");
      
      const newProfile = await prisma.profile.create({
        data: {
          userId: userId,
          platform: "TIKTOK",
          platformUserId: userInfo.open_id,
          platformUsername: userInfo.display_name,
          name: userInfo.display_name,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt,
          isActive: true,
          metadata: {
            unionId: userInfo.union_id,
            avatarUrl: userInfo.avatar_url,
            refreshExpiresIn: refresh_expires_in,
          },
        },
      });

      console.log("[TikTok Callback] Profile created successfully:", {
        id: newProfile.id,
        platform: newProfile.platform,
        userId: newProfile.userId,
        isActive: newProfile.isActive,
        platformUserId: newProfile.platformUserId,
      });
    }

    // Verify profile was created/updated correctly
    const verifyProfile = await prisma.profile.findFirst({
      where: {
        userId: userId,
        platform: "TIKTOK",
        platformUserId: userInfo.open_id,
      },
    });

    if (!verifyProfile) {
      throw new Error("Failed to verify profile creation");
    }

    console.log("[TikTok Callback] Profile verification successful:", {
      id: verifyProfile.id,
      isActive: verifyProfile.isActive,
    });

    // Redirect to profiles page with success message
    return NextResponse.redirect(
      new URL("/profiles?success=TikTok+connected+successfully", getBaseUrl(request))
    );
  } catch (error) {
    console.error("[TikTok Callback] Error processing callback:", error);
    
    const errorMessage = handleTikTokError(error);
    const baseUrl = getBaseUrl(request);
    
    return NextResponse.redirect(
      new URL(
        `/profiles?error=${encodeURIComponent(errorMessage)}`,
        baseUrl
      )
    );
  }
}
