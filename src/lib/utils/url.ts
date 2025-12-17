import { NextRequest } from "next/server";

/**
 * Get base URL for redirects
 * Uses NEXTAUTH_URL from environment, or falls back to request URL
 * Replaces 0.0.0.0 with localhost for local development
 */
export function getBaseUrl(request: NextRequest): string {
  // Use NEXTAUTH_URL if available (production)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Fallback to request URL, but extract proper hostname
  const url = new URL(request.url);
  // Replace 0.0.0.0 with localhost for local development
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return url.origin;
}
