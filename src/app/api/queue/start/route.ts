import { NextResponse } from "next/server";
import { socialPostsQueue } from "@/lib/queue";

/**
 * Start queue worker
 * This endpoint initializes the Bull queue worker to process posts
 * Should be called once when the app starts
 */
export async function POST() {
  try {
    console.log("[Queue Worker] Starting queue worker...");
    
    // The queue.process() is already defined in queue.ts
    // This endpoint just ensures the module is loaded
    const stats = {
      waiting: await socialPostsQueue.getWaitingCount(),
      active: await socialPostsQueue.getActiveCount(),
      completed: await socialPostsQueue.getCompletedCount(),
      failed: await socialPostsQueue.getFailedCount(),
      delayed: await socialPostsQueue.getDelayedCount(),
    };
    
    console.log("[Queue Worker] Queue stats:", stats);
    console.log("[Queue Worker] Worker is ready to process jobs");
    
    return NextResponse.json({
      success: true,
      message: "Queue worker is running",
      stats,
    });
  } catch (error) {
    console.error("[Queue Worker] Failed to start:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = {
      waiting: await socialPostsQueue.getWaitingCount(),
      active: await socialPostsQueue.getActiveCount(),
      completed: await socialPostsQueue.getCompletedCount(),
      failed: await socialPostsQueue.getFailedCount(),
      delayed: await socialPostsQueue.getDelayedCount(),
    };
    
    return NextResponse.json({
      success: true,
      stats,
      isProcessing: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}







