/**
 * Profile Token Refresh Endpoint
 * Allows users to manually refresh a specific profile's token
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshToken } from "@/lib/social/token-manager";

/**
 * POST - Refresh token for a specific profile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: profileId } = await params;

    // Get profile and verify ownership
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        platform: true,
        platformUsername: true,
        tokenExpiresAt: true,
        isActive: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      `[API] User ${session.user.id} manually refreshing token for profile ${profileId} (${profile.platform})`
    );

    // Attempt token refresh
    const result = await refreshToken(profileId);

    if (result.success) {
      console.log(`[API] Successfully refreshed token for profile ${profileId}`);

      // Re-activate profile if it was inactive
      if (!profile.isActive) {
        await prisma.profile.update({
          where: { id: profileId },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        });

        console.log(`[API] Reactivated profile ${profileId} after successful token refresh`);
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          profileId: profile.id,
          platform: profile.platform,
          username: profile.platformUsername,
          expiresAt: result.expiresAt,
          wasReactivated: !profile.isActive,
        },
      });
    } else {
      console.error(`[API] Failed to refresh token for profile ${profileId}: ${result.message}`);

      return NextResponse.json(
        {
          success: false,
          error: "Token refresh failed",
          message: result.message,
          recommendation:
            "Please try reconnecting your account through the OAuth flow for a fresh token.",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[API] Error refreshing profile token:", error);

    return NextResponse.json(
      {
        error: "Failed to refresh token",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}





