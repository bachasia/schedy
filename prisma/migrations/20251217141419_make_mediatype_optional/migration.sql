-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT NOT NULL,
    "mediaType" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    "platformPostId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("content", "createdAt", "errorMessage", "failedAt", "id", "mediaType", "mediaUrls", "metadata", "platform", "platformPostId", "profileId", "publishedAt", "scheduledAt", "status", "updatedAt", "userId") SELECT "content", "createdAt", "errorMessage", "failedAt", "id", "mediaType", "mediaUrls", "metadata", "platform", "platformPostId", "profileId", "publishedAt", "scheduledAt", "status", "updatedAt", "userId" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "idx_post_user_id" ON "Post"("userId");
CREATE INDEX "idx_post_profile_id" ON "Post"("profileId");
CREATE INDEX "idx_post_status_scheduled_at" ON "Post"("status", "scheduledAt");
CREATE INDEX "idx_post_platform_status" ON "Post"("platform", "status");
CREATE UNIQUE INDEX "ux_post_platform_post_id" ON "Post"("platform", "platformPostId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
