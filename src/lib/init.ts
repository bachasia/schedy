/**
 * Application Initialization
 * Sets up background jobs, cron tasks, and other startup procedures
 */

import { scheduleTokenRefreshJob } from "@/lib/cron/token-refresh-job";
import { schedulePostsSyncJob } from "@/lib/cron/posts-sync-job";

let initialized = false;

/**
 * Initialize background services
 * Call this once on server startup
 */
export function initializeApp(): void {
  if (initialized) {
    console.log("[Init] App already initialized, skipping");
    return;
  }

  console.log("[Init] Initializing application...");

  try {
    // Schedule token refresh cron job
    scheduleTokenRefreshJob();

    // Schedule posts sync cron job
    schedulePostsSyncJob();

    // Mark as initialized
    initialized = true;

    console.log("[Init] Application initialized successfully");
  } catch (error) {
    console.error("[Init] Failed to initialize application:", error);
    throw error;
  }
}

/**
 * Check if app is initialized
 */
export function isInitialized(): boolean {
  return initialized;
}







