-- CreateTable
CREATE TABLE "ProfileAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfileAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_assignment_manager" ON "ProfileAssignment"("managerId");

-- CreateIndex
CREATE INDEX "idx_assignment_profile" ON "ProfileAssignment"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ux_profile_assignment" ON "ProfileAssignment"("managerId", "profileId");
