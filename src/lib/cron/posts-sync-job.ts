/**
 * Scheduled Posts Sync Job
 * Ensures scheduled posts are in the queue
 * Runs periodically to recover from server restarts or queue failures
 */

import { prisma } from "@/lib/prisma";
import { addPostToQueue } from "@/lib/queue";

/**
 * Sync scheduled posts to queue
 * This ensures all SCHEDULED posts are in the queue
 */
export async function syncScheduledPosts(): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ postId: string; error: string }>;
}> {
    console.log(`[Cron] Starting scheduled posts sync at ${new Date().toISOString()}`);

    try {
        // Find all scheduled posts that haven't been published yet
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
                userId: true,
                scheduledAt: true,
            },
        });

        console.log(`[Cron] Found ${scheduledPosts.length} scheduled posts to sync`);

        let synced = 0;
        let failed = 0;
        const errors: Array<{ postId: string; error: string }> = [];

        for (const post of scheduledPosts) {
            try {
                if (!post.scheduledAt) {
                    console.warn(`[Cron] Post ${post.id} has no scheduledAt, skipping`);
                    continue;
                }

                // Check if scheduled time is in the future
                const scheduledTime = new Date(post.scheduledAt);
                const now = new Date();

                if (scheduledTime <= now) {
                    // Scheduled time has passed, publish immediately
                    console.log(`[Cron] Post ${post.id} scheduled time has passed, queuing for immediate publish`);
                    await addPostToQueue(post.id, post.userId, now);
                } else {
                    // Scheduled time is in the future, add to queue with delay
                    console.log(`[Cron] Adding post ${post.id} to queue (scheduled for ${scheduledTime.toISOString()})`);
                    await addPostToQueue(post.id, post.userId, scheduledTime);
                }

                synced++;
            } catch (error) {
                failed++;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error(`[Cron] Failed to sync post ${post.id}:`, errorMessage);
                errors.push({ postId: post.id, error: errorMessage });
            }
        }

        console.log(`[Cron] Scheduled posts sync completed: ${synced} synced, ${failed} failed`);

        if (errors.length > 0) {
            console.warn(`[Cron] Failed posts:`, errors);
        }

        return { synced, failed, errors };
    } catch (error) {
        console.error(`[Cron] Scheduled posts sync job failed:`, error);
        throw error;
    }
}

/**
 * Schedule the sync job to run periodically
 */
export function schedulePostsSyncJob(): void {
    console.log(`[Cron] Scheduling posts sync job`);

    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
        // Development: Run sync every 5 minutes
        console.log(`[Cron] Development mode: Running posts sync every 5 minutes`);

        // Run immediately on startup
        syncScheduledPosts().catch((error) => {
            console.error(`[Cron] Initial posts sync failed:`, error);
        });

        // Then run every 5 minutes
        setInterval(() => {
            syncScheduledPosts().catch((error) => {
                console.error(`[Cron] Posts sync job error:`, error);
            });
        }, 5 * 60 * 1000); // 5 minutes
    } else {
        // Production: Run sync every 10 minutes
        console.log(`[Cron] Production mode: Running posts sync every 10 minutes`);

        // Run immediately on startup
        syncScheduledPosts().catch((error) => {
            console.error(`[Cron] Initial posts sync failed:`, error);
        });

        // Then run every 10 minutes
        setInterval(() => {
            syncScheduledPosts().catch((error) => {
                console.error(`[Cron] Posts sync job error:`, error);
            });
        }, 10 * 60 * 1000); // 10 minutes
    }
}
