import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retryFailedPost } from "@/lib/queue";

/**
 * Retry a failed post
 * POST /api/posts/[id]/retry
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if post exists and belongs to user
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (post.status !== "FAILED") {
    return NextResponse.json(
      { error: "Only failed posts can be retried" },
      { status: 400 },
    );
  }

  // Retry the post
  const jobId = await retryFailedPost(id);

  if (!jobId) {
    return NextResponse.json(
      { error: "Failed to retry post" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Post queued for retry",
    jobId,
  });
}


