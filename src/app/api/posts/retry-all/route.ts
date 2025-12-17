import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPostToQueue } from "@/lib/queue";

/**
 * Retry all "published" posts that weren't actually published
 * This helps fix posts that have PUBLISHED status but no publishedAt date
 */
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract userId for TypeScript type narrowing
  const userId = session.user.id;

  try {
    // Find all posts with PUBLISHED status but no publishedAt date
    const stuckPosts = await prisma.post.findMany({
      where: {
        userId: userId,
        status: "PUBLISHED",
        publishedAt: null,
      },
      select: {
        id: true,
        content: true,
        platform: true,
      },
    });

    console.log(`[Retry] Found ${stuckPosts.length} stuck posts to retry`);

    if (stuckPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No posts need to be retried",
        count: 0,
      });
    }

    // Update them to SCHEDULED status and add to queue
    const results = await Promise.allSettled(
      stuckPosts.map(async (post) => {
        // Update status to SCHEDULED
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "SCHEDULED",
            updatedAt: new Date(),
          },
        });

        // Add to queue for immediate processing
        const jobId = await addPostToQueue(post.id, userId);
        
        console.log(`[Retry] Queued post ${post.id} (job: ${jobId})`);
        
        return { postId: post.id, jobId };
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      message: `Retrying ${successful} posts`,
      stats: {
        total: stuckPosts.length,
        successful,
        failed,
      },
      posts: stuckPosts.map((p) => ({
        id: p.id,
        content: p.content.substring(0, 50),
        platform: p.platform,
      })),
    });
  } catch (error) {
    console.error("[Retry] Error retrying posts:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}





