import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createProfileSchema = z.object({
  name: z.string().min(1).optional(),
  platform: z.nativeEnum(Platform),
  platformUserId: z.string().min(1),
  platformUsername: z.string().min(1).optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userRole = (session.user as any).role;

  let profiles;

  if (userRole === "EMPLOYEE") {
    // For EMPLOYEE: Get profiles assigned to them via ProfileAssignment
    const assignments = await (prisma as any).profileAssignment.findMany({
      where: { managerId: userId },
      include: {
        profile: true,
      },
    });

    profiles = assignments.map((assignment: any) => assignment.profile);
  } else {
    // For ADMIN/MANAGER: Get all profiles they own
    profiles = await prisma.profile.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createProfileSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, platform, platformUserId, platformUsername, accessToken, refreshToken } = parsed.data;

  const profile = await prisma.profile.create({
    data: {
      userId: session.user.id,
      name: name ?? platformUsername ?? platformUserId,
      platform,
      platformUserId,
      platformUsername: platformUsername ?? null,
      accessToken,
      refreshToken: refreshToken ?? null,
      tokenExpiresAt: null,
      isActive: true,
      metadata: {},
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}


