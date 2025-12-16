import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateFacebookAuthUrl } from "@/lib/social/facebook";

/**
 * Initiate Facebook OAuth flow
 * GET /api/social/facebook/connect?type=facebook|instagram
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = (searchParams.get("type") || "facebook") as "facebook" | "instagram";

    // Generate random state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        type,
        timestamp: Date.now(),
      }),
    ).toString("base64");

    // Generate Facebook OAuth URL
    const authUrl = generateFacebookAuthUrl(state, type);

    // Redirect user to Facebook login
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Facebook OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Facebook connection" },
      { status: 500 },
    );
  }
}


