import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPostToQueue, removePostFromQueue } from "@/lib/queue";

const updatePostSchema = z.object({
  content: z.string().min(1).max(63206).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "CAROUSEL"]).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"]).optional(),
  scheduledAt: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          platform: true,
          platformUsername: true,
        },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse mediaUrls from comma-separated string to array
  const postData = {
    ...post,
    mediaUrls: post.mediaUrls ? post.mediaUrls.split(",").filter(Boolean) : [],
  };

  return NextResponse.json({ post: postData });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if post exists and belongs to user
  const existingPost = await prisma.post.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existingPost.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = updatePostSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const updateData: {
    content?: string;
    mediaUrls?: string;
    mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
    status?: "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
    scheduledAt?: Date | null;
    updatedAt?: Date;
  } = {
    updatedAt: new Date(),
  };

  if (parsed.data.content !== undefined) {
    updateData.content = parsed.data.content;
  }

  if (parsed.data.mediaUrls !== undefined) {
    // Convert array to comma-separated string for Prisma
    updateData.mediaUrls = parsed.data.mediaUrls.join(",");
  }

  if (parsed.data.mediaType !== undefined) {
    updateData.mediaType = parsed.data.mediaType;
  }

  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
  }

  if (parsed.data.scheduledAt !== undefined) {
    updateData.scheduledAt = parsed.data.scheduledAt
      ? new Date(parsed.data.scheduledAt)
      : null;
  }

  const post = await prisma.post.update({
    where: { id },
    data: updateData,
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          platform: true,
          platformUsername: true,
        },
      },
    },
  });

  // Handle queue management for status/scheduling changes
  if (parsed.data.status !== undefined || parsed.data.scheduledAt !== undefined) {
    // Remove from queue if exists
    await removePostFromQueue(id);

    // Re-add to queue if scheduled or set to publish
    if (post.status === "SCHEDULED" && post.scheduledAt) {
      await addPostToQueue(post.id, session.user.id, post.scheduledAt);
      console.log(`Rescheduled post ${post.id} for ${post.scheduledAt}`);
    } else if (post.status === "PUBLISHED" && !post.publishedAt) {
      // Only queue if not already published
      await addPostToQueue(post.id, session.user.id);
      console.log(`Queued post ${post.id} for immediate publishing`);
    }
  }

  return NextResponse.json({ post });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if post exists and belongs to user
  const existingPost = await prisma.post.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (existingPost.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remove from queue if scheduled
  await removePostFromQueue(id);
  console.log(`Removed post ${id} from queue (if existed)`);

  // Delete post from database
  await prisma.post.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

