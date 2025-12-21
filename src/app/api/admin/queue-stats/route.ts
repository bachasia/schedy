import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQueueStats, socialPostsQueue } from "@/lib/queue";

/**
 * Get queue statistics and job information
 * Protected endpoint for admin monitoring
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get overall statistics
    const stats = await getQueueStats();

    // Get recent jobs (last 20 of each type)
    const [waitingJobs, activeJobs, completedJobs, failedJobs, delayedJobs] =
      await Promise.all([
        socialPostsQueue.getWaiting(0, 19),
        socialPostsQueue.getActive(0, 19),
        socialPostsQueue.getCompleted(0, 19),
        socialPostsQueue.getFailed(0, 19),
        socialPostsQueue.getDelayed(0, 19),
      ]);

    // Format job data
    const formatJob = (job: any) => ({
      id: job.id,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp,
      delay: job.opts?.delay,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    });

    return NextResponse.json({
      stats,
      jobs: {
        waiting: waitingJobs.map(formatJob),
        active: activeJobs.map(formatJob),
        completed: completedJobs.map(formatJob),
        failed: failedJobs.map(formatJob),
        delayed: delayedJobs.map(formatJob),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return NextResponse.json(
      { error: "Failed to get queue statistics" },
      { status: 500 },
    );
  }
}








