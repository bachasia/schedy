-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "idx_oauth_state_user_platform" ON "OAuthState"("userId", "platform");

-- CreateIndex
CREATE INDEX "idx_oauth_state_state" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "idx_oauth_state_expires" ON "OAuthState"("expiresAt");
