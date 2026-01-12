// Load environment variables
require("dotenv").config();

console.log("=== Facebook/Meta Configuration Debug ===\n");
console.log("FACEBOOK_APP_ID:", process.env.FACEBOOK_APP_ID || "NOT SET");
console.log(
  "FACEBOOK_APP_SECRET:",
  process.env.FACEBOOK_APP_SECRET
    ? "***SET (length: " + process.env.FACEBOOK_APP_SECRET.length + ")***"
    : "NOT SET",
);
console.log(
  "FACEBOOK_REDIRECT_URI:",
  process.env.FACEBOOK_REDIRECT_URI || "NOT SET",
);
console.log("");

if (process.env.FACEBOOK_APP_ID) {
  const appId = process.env.FACEBOOK_APP_ID;
  console.log("✅ Facebook App ID is configured");
  console.log("   First 6 chars:", appId.substring(0, 6) + "...");
  console.log("   Length:", appId.length);
} else {
  console.log("❌ FACEBOOK_APP_ID is not set in .env file");
  console.log("   Please add: FACEBOOK_APP_ID=your-app-id");
}

console.log("\n=== Current Server Port ===");
console.log("Server running on port 3100, but REDIRECT_URI might use 3001");
console.log(
  "Make sure your .env FACEBOOK_REDIRECT_URI uses the correct port (3100)",
);
console.log("Expected: http://localhost:3100/api/social/facebook/callback");
