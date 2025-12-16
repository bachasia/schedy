-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformUsername" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "idx_user_created_at" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "idx_profile_user_id" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "idx_profile_platform_user" ON "Profile"("platform", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ux_profile_platform_user_id" ON "Profile"("platform", "platformUserId");

-- CreateIndex
CREATE INDEX "idx_post_user_id" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "idx_post_profile_id" ON "Post"("profileId");

-- CreateIndex
CREATE INDEX "idx_post_status_scheduled_at" ON "Post"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "idx_post_platform_status" ON "Post"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ux_post_platform_post_id" ON "Post"("platform", "platformPostId");
