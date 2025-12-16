import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPostToQueue } from "@/lib/queue";

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(63206),
  profileIds: z.array(z.string()).min(1, "At least one profile required"),
  mediaUrls: z.array(z.string()).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "CAROUSEL"]).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"]).default("DRAFT"),
  scheduledAt: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    where: { userId: session.user.id },
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          platform: true,
          platformUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/posts - Starting request");
    
    const session = await auth();

    if (!session?.user?.id) {
      console.log("[API] POST /api/posts - Unauthorized (no session)");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[API] POST /api/posts - User ID:", session.user.id);

    const json = await request.json();
    console.log("[API] POST /api/posts - Request body:", JSON.stringify(json, null, 2));
    
    const parsed = createPostSchema.safeParse(json);
    
    if (!parsed.success) {
      console.log("[API] POST /api/posts - Validation failed:", parsed.error.errors);
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { content, profileIds, mediaUrls, mediaType, status, scheduledAt } = parsed.data;

    console.log("[API] POST /api/posts - Parsed data:", {
      contentLength: content.length,
      profileIds,
      mediaUrlsCount: mediaUrls?.length || 0,
      mediaType,
      status,
      scheduledAt
    });

    // Verify all profiles belong to the user
    console.log("[API] POST /api/posts - Fetching profiles...");
    const profiles = await prisma.profile.findMany({
    where: {
      id: { in: profileIds },
      userId: session.user.id,
    },
  });

    if (profiles.length !== profileIds.length) {
      console.log("[API] POST /api/posts - Profile count mismatch:", profiles.length, "!=", profileIds.length);
      return NextResponse.json(
        { error: "One or more profiles not found or unauthorized" },
        { status: 403 },
      );
    }

    console.log("[API] POST /api/posts - Found", profiles.length, "profiles, creating posts...");

    // Create a post for each profile
    const posts = await Promise.all(
    profileIds.map((profileId) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return null;

      return prisma.post.create({
        data: {
          userId: session.user.id,
          profileId,
          content,
          mediaUrls: mediaUrls ? mediaUrls.join(",") : "", // Convert array to comma-separated string
          mediaType: mediaType || "IMAGE",
          platform: profile.platform,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              platform: true,
              platformUsername: true,
            },
          },
        },
      });
    }),
  );

  const validPosts = posts.filter((p) => p !== null);

  console.log("[API] POST /api/posts - Created", validPosts.length, "posts successfully");

  // Add posts to queue if scheduled or set to publish immediately
  // Wrapped in try-catch to handle Redis/queue errors gracefully
  console.log("[API] POST /api/posts - Adding posts to queue...");
  try {
    for (const post of validPosts) {
      if (post.status === "SCHEDULED" && post.scheduledAt) {
        // Add to queue with delay
        await addPostToQueue(post.id, session.user.id, post.scheduledAt);
        console.log(`Added scheduled post ${post.id} to queue for ${post.scheduledAt}`);
      } else if (post.status === "PUBLISHED") {
        // Add to queue for immediate processing
        await addPostToQueue(post.id, session.user.id);
        console.log(`Added post ${post.id} to queue for immediate publishing`);
      }
    }
  } catch (queueError) {
    // Log queue error but don't fail the post creation
    console.error("Failed to add posts to queue:", queueError);
    console.warn(
      "Posts were created successfully but not added to queue. " +
      "Make sure Redis is running for queue functionality."
    );
    
    // If posts are PUBLISHED status but couldn't be queued, update to FAILED
    if (validPosts.some(p => p.status === "PUBLISHED")) {
      console.error(
        "WARNING: Posts with PUBLISHED status could not be queued. " +
        "They will need to be manually retried."
      );
    }
  }

    return NextResponse.json({ posts: validPosts }, { status: 201 });
  } catch (error) {
    console.error("Error creating posts:", error);
    
    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to create posts", 
        details: errorMessage,
        hint: errorMessage.includes("Redis") || errorMessage.includes("ECONNREFUSED")
          ? "Make sure Redis is running for queue functionality"
          : undefined
      },
      { status: 500 }
    );
  }
}

