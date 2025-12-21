-- AlterTable
ALTER TABLE "Post" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "idx_post_group_id" ON "Post"("groupId");
