import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQueueStats, socialPostsQueue } from "@/lib/queue";
import { syncScheduledPosts } from "@/lib/cron/posts-sync-job";

/**
 * GET /api/admin/queue/status
 * Get queue status and scheduled posts info
 */
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get queue statistics
        const queueStats = await getQueueStats();

        // Get scheduled posts from database
        const scheduledPosts = await prisma.post.findMany({
            where: {
                status: "SCHEDULED",
                scheduledAt: {
                    not: null,
                },
                publishedAt: null,
            },
            select: {
                id: true,
                content: true,
                scheduledAt: true,
                platform: true,
                profile: {
                    select: {
                        name: true,
                        platformUsername: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: "asc",
            },
        });

        // Get delayed jobs from queue
        const delayedJobs = await socialPostsQueue.getDelayed(0, 100);

        return NextResponse.json({
            queue: queueStats,
            scheduledPosts: {
                total: scheduledPosts.length,
                posts: scheduledPosts,
            },
            delayedJobs: {
                total: delayedJobs.length,
                jobs: delayedJobs.map((job) => ({
                    id: job.id,
                    postId: job.data.postId,
                    delay: job.opts.delay,
                    processAt: job.processedOn ? new Date(job.processedOn) : null,
                })),
            },
        });
    } catch (error) {
        console.error("[Admin] Failed to get queue status:", error);
        return NextResponse.json(
            { error: "Failed to get queue status", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/queue/sync
 * Manually trigger sync of scheduled posts to queue
 */
export async function POST() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await syncScheduledPosts();

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error("[Admin] Failed to sync scheduled posts:", error);
        return NextResponse.json(
            { error: "Failed to sync scheduled posts", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
