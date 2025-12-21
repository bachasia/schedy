/**
 * Admin endpoint to manually trigger post publishing
 * Useful for testing and manual retries
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPostToQueue } from "@/lib/queue";
import { PostStatus } from "@prisma/client";

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

    const { id: postId } = await params;

    // Get post with profile information
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        profile: {
          select: {
            id: true,
            platform: true,
            platformUsername: true,
            isActive: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify ownership
    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if post is already published
    if (post.status === PostStatus.PUBLISHED && post.publishedAt) {
      return NextResponse.json(
        {
          error: "Post is already published",
          post: {
            id: post.id,
            status: post.status,
            publishedAt: post.publishedAt,
            platformPostId: post.platformPostId,
          },
        },
        { status: 400 }
      );
    }

    // Check if post is currently publishing
    if (post.status === PostStatus.PUBLISHING) {
      return NextResponse.json(
        {
          error: "Post is currently being published",
          message: "Please wait for the current publishing attempt to complete",
        },
        { status: 409 }
      );
    }

    // Check if profile is active
    if (!post.profile.isActive) {
      return NextResponse.json(
        {
          error: "Profile is not active",
          message: "Please reconnect the social media profile",
        },
        { status: 400 }
      );
    }

    console.log(
      `[Admin] Manually triggering publish for post ${postId} by user ${session.user.id}`
    );

    // Reset error state if this is a retry
    if (post.status === PostStatus.FAILED) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.SCHEDULED,
          failedAt: null,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

      console.log(`[Admin] Reset failed post ${postId} to SCHEDULED status`);
    }

    // Add to queue for immediate processing
    const jobId = await addPostToQueue(post.id, post.userId, new Date());

    console.log(
      `[Admin] Successfully queued post ${postId} for publishing (job ID: ${jobId})`
    );

    return NextResponse.json({
      success: true,
      message: "Post has been queued for publishing",
      data: {
        postId: post.id,
        jobId: jobId,
        platform: post.platform,
        profile: {
          id: post.profile.id,
          username: post.profile.platformUsername,
        },
        queuedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Admin] Error triggering manual publish:", error);

    return NextResponse.json(
      {
        error: "Failed to queue post for publishing",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Get publishing status for a post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;

    // Get post with detailed information
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            platform: true,
            platformUsername: true,
            isActive: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify ownership
    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build response with publishing details
    const response: any = {
      id: post.id,
      status: post.status,
      platform: post.platform,
      profile: post.profile,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    // Add status-specific information
    if (post.status === PostStatus.PUBLISHED) {
      response.publishedAt = post.publishedAt;
      response.platformPostId = post.platformPostId;
      response.metadata = post.metadata;
    } else if (post.status === PostStatus.FAILED) {
      response.failedAt = post.failedAt;
      response.errorMessage = post.errorMessage;
      response.canRetry = true;
    } else if (post.status === PostStatus.SCHEDULED) {
      response.scheduledAt = post.scheduledAt;
    } else if (post.status === PostStatus.PUBLISHING) {
      response.message = "Post is currently being published";
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Admin] Error getting post status:", error);

    return NextResponse.json(
      {
        error: "Failed to get post status",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}







