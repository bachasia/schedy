import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Check if a profile's access token is still valid
 * GET /api/profiles/[id]/check-token
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        platform: true,
        platformUsername: true,
        accessToken: true,
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

    // Check token expiration
    const now = new Date();
    const isExpired = profile.tokenExpiresAt ? new Date(profile.tokenExpiresAt) < now : false;
    const daysUntilExpiry = profile.tokenExpiresAt 
      ? Math.floor((new Date(profile.tokenExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Try to validate token with platform API (for Facebook/Instagram)
    let isValid = false;
    let errorMessage = null;

    if (profile.platform === "FACEBOOK" || profile.platform === "INSTAGRAM") {
      try {
        // Test Facebook token with a simple API call
        const testResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${profile.accessToken}`
        );
        
        if (testResponse.ok) {
          isValid = true;
        } else {
          const error = await testResponse.json();
          isValid = false;
          errorMessage = error.error?.message || "Token is invalid";
        }
      } catch (error) {
        isValid = false;
        errorMessage = "Failed to validate token";
      }
    } else {
      // For other platforms, just check expiration date
      isValid = !isExpired;
    }

    return NextResponse.json({
      profileId: profile.id,
      platform: profile.platform,
      username: profile.platformUsername,
      isActive: profile.isActive,
      tokenStatus: {
        isValid,
        isExpired,
        expiresAt: profile.tokenExpiresAt,
        daysUntilExpiry,
        errorMessage,
      },
      recommendation: isExpired || !isValid
        ? "Token is expired or invalid. Please reconnect this profile."
        : daysUntilExpiry !== null && daysUntilExpiry < 7
        ? `Token will expire in ${daysUntilExpiry} days. Consider reconnecting soon.`
        : "Token is valid and active.",
    });
  } catch (error) {
    console.error("Error checking token:", error);
    return NextResponse.json(
      {
        error: "Failed to check token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





