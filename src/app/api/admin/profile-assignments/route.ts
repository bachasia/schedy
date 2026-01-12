import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Role } from "@/lib/permissions";

const assignProfileSchema = z.object({
  managerId: z.string().cuid(),
  profileId: z.string().cuid(),
});

/**
 * GET /api/admin/profile-assignments
 * Get all profile assignments or assignments for a specific manager
 */
export async function GET(request: Request) {
  try {
    // Require ADMIN role
    await requireRole([Role.ADMIN]);

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("managerId");

    const where: any = {};
    if (managerId) {
      where.managerId = managerId;
    }

    const assignments = await (prisma as any).profileAssignment.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        profile: {
          select: {
            id: true,
            name: true,
            platform: true,
            platformUsername: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error("Error fetching profile assignments:", error);

    if (
      error.message?.includes("Unauthorized") ||
      error.message?.includes("Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to fetch profile assignments" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/profile-assignments
 * Assign a profile to a manager
 */
export async function POST(request: Request) {
  try {
    // Require ADMIN role
    const currentUser = await requireRole([Role.ADMIN]);

    const json = await request.json();
    const parsed = assignProfileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { managerId, profileId } = parsed.data;

    // Verify the manager exists and has MANAGER role
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    if (manager.role !== Role.MANAGER) {
      return NextResponse.json(
        { error: "User is not a manager" },
        { status: 400 },
      );
    }

    // Verify the profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Create the assignment
    const assignment = await (prisma as any).profileAssignment.create({
      data: {
        managerId,
        profileId,
        assignedBy: currentUser.id,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating profile assignment:", error);

    if (
      error.message?.includes("Unauthorized") ||
      error.message?.includes("Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Check for unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Profile is already assigned to this manager" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create profile assignment" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/profile-assignments/[id]
 * Remove a profile assignment
 */
export async function DELETE(request: Request) {
  try {
    // Require ADMIN role
    await requireRole([Role.ADMIN]);

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const assignmentId = pathParts[pathParts.length - 1];

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 },
      );
    }

    await (prisma as any).profileAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting profile assignment:", error);

    if (
      error.message?.includes("Unauthorized") ||
      error.message?.includes("Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete profile assignment" },
      { status: 500 },
    );
  }
}
