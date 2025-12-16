/**
 * Token Refresh Cron Job
 * Runs daily to proactively refresh expiring tokens
 */

import { refreshExpiringTokens } from "@/lib/social/token-manager";

/**
 * Run the token refresh job
 * This should be called by a cron scheduler
 */
export async function runTokenRefreshJob(): Promise<void> {
  console.log(`[Cron] Starting daily token refresh job at ${new Date().toISOString()}`);

  try {
    const result = await refreshExpiringTokens();

    console.log(`[Cron] Token refresh job completed:`);
    console.log(`  - Total profiles checked: ${result.total}`);
    console.log(`  - Successfully refreshed: ${result.refreshed}`);
    console.log(`  - Failed: ${result.failed}`);

    // Log individual failures
    if (result.failed > 0) {
      console.warn(`[Cron] Failed refreshes:`);
      result.results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.warn(`  - ${r.platform} @${r.username}: ${r.message}`);
        });
    }

    // Alert if high failure rate
    if (result.total > 0 && result.failed / result.total > 0.5) {
      console.error(
        `[Cron] WARNING: High token refresh failure rate: ${result.failed}/${result.total} (${Math.round((result.failed / result.total) * 100)}%)`
      );
      // TODO: Send alert to admins
    }
  } catch (error) {
    console.error(`[Cron] Token refresh job failed:`, error);
    throw error;
  }
}

/**
 * Schedule token refresh job
 * Call this on server startup
 */
export function scheduleTokenRefreshJob(): void {
  // Run immediately on startup
  console.log(`[Cron] Scheduling token refresh job`);
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (isDevelopment) {
    console.log(`[Cron] Development mode: Running token refresh every hour`);
    // In development, run every hour for testing
    setInterval(() => {
      runTokenRefreshJob().catch((error) => {
        console.error(`[Cron] Token refresh job error:`, error);
      });
    }, 60 * 60 * 1000); // 1 hour
  } else {
    console.log(`[Cron] Production mode: Running token refresh daily at 2 AM`);
    // In production, run daily at 2 AM
    const runDaily = () => {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(2, 0, 0, 0); // 2:00 AM

      // If already past 2 AM today, schedule for tomorrow
      if (now > scheduledTime) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const timeUntilRun = scheduledTime.getTime() - now.getTime();
      console.log(`[Cron] Next token refresh scheduled for ${scheduledTime.toISOString()}`);

      setTimeout(() => {
        runTokenRefreshJob()
          .catch((error) => {
            console.error(`[Cron] Token refresh job error:`, error);
          })
          .finally(() => {
            // Schedule next run
            runDaily();
          });
      }, timeUntilRun);
    };

    runDaily();
  }
}

