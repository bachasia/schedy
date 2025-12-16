/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring
 */

import { NextResponse } from "next/server";
import { socialPostsQueue } from "@/lib/queue";

export async function GET() {
  try {
    // Check Redis connection via queue
    const queueHealth = await socialPostsQueue.client.ping();
    const isRedisHealthy = queueHealth === "PONG";

    // Get queue stats
    const stats = await socialPostsQueue.getJobCounts();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        app: "ok",
        redis: isRedisHealthy ? "ok" : "error",
        queue: {
          status: "ok",
          stats: {
            waiting: stats.waiting,
            active: stats.active,
            completed: stats.completed,
            failed: stats.failed,
            delayed: stats.delayed,
          },
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}
