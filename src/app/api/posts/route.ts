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

    // Extract userId for TypeScript type narrowing
    const userId = session.user.id;

    console.log("[API] POST /api/posts - User ID:", userId);

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
      userId: userId,
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
          userId: userId,
          profileId,
          content,
          mediaUrls: mediaUrls && mediaUrls.length > 0 ? mediaUrls.join(",") : "", // Convert array to comma-separated string
          mediaType: mediaUrls && mediaUrls.length > 0 ? (mediaType || "IMAGE") : null, // Only set mediaType if there are media URLs
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
  let queueError = null;
  
  try {
    for (const post of validPosts) {
      if (post.status === "SCHEDULED" && post.scheduledAt) {
        // Add to queue with delay
        await addPostToQueue(post.id, userId, post.scheduledAt);
        console.log(`[API] Added scheduled post ${post.id} to queue for ${post.scheduledAt}`);
      } else if (post.status === "PUBLISHED") {
        // Add to queue for immediate processing
        await addPostToQueue(post.id, userId);
        console.log(`[API] Added post ${post.id} to queue for immediate publishing`);
      }
    }
    console.log("[API] POST /api/posts - Successfully added all posts to queue");
  } catch (error) {
    // Log queue error but don't fail the post creation
    queueError = error;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to add posts to queue:", errorMessage);
    console.warn(
      "[API] Posts were created successfully but not added to queue. " +
      "Make sure Redis is running for queue functionality."
    );
    
    // If posts are PUBLISHED status but couldn't be queued, update to DRAFT so user can retry
    if (validPosts.some(p => p.status === "PUBLISHED")) {
      console.error(
        "[API] WARNING: Posts with PUBLISHED status could not be queued. " +
        "Updating status to DRAFT for manual retry."
      );
      
      // Update posts to DRAFT status
      await Promise.all(
        validPosts
          .filter(p => p.status === "PUBLISHED")
          .map(p => 
            prisma.post.update({
              where: { id: p.id },
              data: { 
                status: "DRAFT",
                errorMessage: "Failed to queue: " + errorMessage 
              }
            })
          )
      );
    }
  }

    // Return response with queue status
    return NextResponse.json({ 
      posts: validPosts,
      queueStatus: queueError ? {
        error: true,
        message: "Posts created but queue is unavailable. Redis may not be running.",
        details: queueError instanceof Error ? queueError.message : "Unknown error",
        action: "Posts have been saved as drafts. Please retry publishing when Redis is available."
      } : {
        error: false,
        message: "Posts successfully queued for publishing"
      }
    }, { status: 201 });
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

