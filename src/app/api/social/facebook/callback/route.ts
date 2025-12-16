import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramAccount,
} from "@/lib/social/facebook";

/**
 * Handle Facebook OAuth callback
 * GET /api/social/facebook/callback?code=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("Facebook OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("Facebook connection was cancelled or denied")}`,
          request.url,
        ),
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("Invalid OAuth callback parameters")}`,
          request.url,
        ),
      );
    }

    // Decode and validate state
    let stateData: { userId: string; type: "facebook" | "instagram"; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch (e) {
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("Invalid state parameter")}`,
          request.url,
        ),
      );
    }

    // Verify state timestamp (prevent replay attacks - 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("OAuth session expired. Please try again.")}`,
          request.url,
        ),
      );
    }

    const { userId, type } = stateData;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("User not found")}`,
          request.url,
        ),
      );
    }

    // Step 1: Exchange code for short-lived token
    const shortLivedTokenData = await exchangeCodeForToken(code);

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedTokenData = await getLongLivedToken(shortLivedTokenData.access_token);
    const userAccessToken = longLivedTokenData.access_token;
    const tokenExpiresIn = longLivedTokenData.expires_in || 60 * 24 * 60 * 60; // 60 days default

    // Step 3: Get user's Facebook Pages
    const pages = await getUserPages(userAccessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL(
          `/profiles?error=${encodeURIComponent("No Facebook Pages found. Please create a Facebook Page first.")}`,
          request.url,
        ),
      );
    }

    // Step 4: Save profiles to database
    let profilesCreated = 0;

    for (const page of pages) {
      if (type === "facebook") {
        // Save Facebook Page profile
        const existingProfile = await prisma.profile.findFirst({
          where: {
            userId,
            platform: "FACEBOOK",
            platformUserId: page.id,
          },
        });

        if (existingProfile) {
          // Update existing profile with new token
          await prisma.profile.update({
            where: { id: existingProfile.id },
            data: {
              accessToken: page.access_token, // Page access token (never expires)
              refreshToken: userAccessToken, // User token for refreshing
              tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
              isActive: true,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new profile
          await prisma.profile.create({
            data: {
              userId,
              name: page.name,
              platform: "FACEBOOK",
              platformUserId: page.id,
              platformUsername: page.name,
              accessToken: page.access_token,
              refreshToken: userAccessToken,
              tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
              isActive: true,
              metadata: {
                category: page.category,
                picture: page.picture?.data?.url,
              },
            },
          });
          profilesCreated++;
        }
      } else if (type === "instagram") {
        // Get Instagram Business Account connected to this page
        try {
          const instagramData = await getInstagramAccount(page.id, page.access_token);

          if (instagramData.instagram_business_account) {
            const igAccount = instagramData.instagram_business_account;

            const existingProfile = await prisma.profile.findFirst({
              where: {
                userId,
                platform: "INSTAGRAM",
                platformUserId: igAccount.id,
              },
            });

            if (existingProfile) {
              // Update existing profile
              await prisma.profile.update({
                where: { id: existingProfile.id },
                data: {
                  accessToken: page.access_token, // Use page token for Instagram API
                  refreshToken: userAccessToken,
                  tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
                  isActive: true,
                  updatedAt: new Date(),
                },
              });
            } else {
              // Create new Instagram profile
              await prisma.profile.create({
                data: {
                  userId,
                  name: igAccount.username || page.name,
                  platform: "INSTAGRAM",
                  platformUserId: igAccount.id,
                  platformUsername: igAccount.username,
                  accessToken: page.access_token,
                  refreshToken: userAccessToken,
                  tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
                  isActive: true,
                  metadata: {
                    connectedPageId: page.id,
                    connectedPageName: page.name,
                  },
                },
              });
              profilesCreated++;
            }
          }
        } catch (error) {
          console.error(`Failed to get Instagram account for page ${page.id}:`, error);
          // Continue with other pages
        }
      }
    }

    // Redirect back to profiles page with success message
    const successMessage =
      profilesCreated > 0
        ? `Successfully connected ${profilesCreated} ${type === "facebook" ? "Facebook Page" : "Instagram"} profile${profilesCreated !== 1 ? "s" : ""}!`
        : `${type === "facebook" ? "Facebook Page" : "Instagram"} profiles updated successfully!`;

    return NextResponse.redirect(
      new URL(
        `/profiles?success=${encodeURIComponent(successMessage)}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("Error in Facebook OAuth callback:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect Facebook account";

    return NextResponse.redirect(
      new URL(
        `/profiles?error=${encodeURIComponent(errorMessage)}`,
        request.url,
      ),
    );
  }
}
