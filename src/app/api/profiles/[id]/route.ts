import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Profile name is required").optional(),
  accessToken: z.string().min(1, "Access token is required").optional(),
  refreshToken: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if profile exists and belongs to user
  const existingProfile = await prisma.profile.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (existingProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = updateProfileSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const updateData: {
    name?: string;
    accessToken?: string;
    refreshToken?: string | null;
    isActive?: boolean;
    updatedAt?: Date;
  } = {
    updatedAt: new Date(),
  };

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
  }

  if (parsed.data.accessToken !== undefined) {
    updateData.accessToken = parsed.data.accessToken;
  }

  if (parsed.data.refreshToken !== undefined) {
    updateData.refreshToken = parsed.data.refreshToken || null;
  }

  if (parsed.data.isActive !== undefined) {
    updateData.isActive = parsed.data.isActive;
  }

  const profile = await prisma.profile.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ profile });
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

  // Check if profile exists and belongs to user
  const existingProfile = await prisma.profile.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (existingProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete profile (cascade delete of posts is handled by Prisma schema)
  await prisma.profile.delete({
    where: { id },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}


