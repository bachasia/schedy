/**
 * Admin endpoint for manual token refresh
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshExpiringTokens, getProfilesNeedingRefresh } from "@/lib/social/token-manager";

/**
 * POST - Manually trigger token refresh for all expiring tokens
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Admin] Manual token refresh triggered by user ${session.user.id}`);

    // Run token refresh
    const result = await refreshExpiringTokens();

    return NextResponse.json({
      success: true,
      message: `Token refresh completed: ${result.refreshed} refreshed, ${result.failed} failed out of ${result.total} total`,
      data: {
        total: result.total,
        refreshed: result.refreshed,
        failed: result.failed,
        results: result.results,
      },
    });
  } catch (error: any) {
    console.error("[Admin] Token refresh error:", error);

    return NextResponse.json(
      {
        error: "Failed to refresh tokens",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get list of profiles that need token refresh
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profiles needing refresh
    const profiles = await getProfilesNeedingRefresh();

    return NextResponse.json({
      success: true,
      count: profiles.length,
      profiles: profiles.map((p) => ({
        id: p.id,
        platform: p.platform,
        username: p.platformUsername,
        tokenExpiresAt: p.tokenExpiresAt,
        hoursUntilExpiry: p.hoursUntilExpiry,
        isExpired: (p.hoursUntilExpiry || 0) <= 0,
      })),
    });
  } catch (error: any) {
    console.error("[Admin] Error getting profiles needing refresh:", error);

    return NextResponse.json(
      {
        error: "Failed to get profiles",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}





