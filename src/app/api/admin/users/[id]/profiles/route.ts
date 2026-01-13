import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Role } from "@/lib/permissions";

// Schema for assigning/removing profiles
const profileIdsSchema = z.object({
    profileIds: z.array(z.string()).min(1, "At least one profile ID is required"),
});

/**
 * GET /api/admin/users/[id]/profiles
 * Get all profiles assigned to a user
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Only ADMIN can manage profile assignments
        await requireRole([Role.ADMIN]);

        const userId = params.id;

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get assigned profiles with details
        const assignments = await (prisma as any).profileAssignment.findMany({
            where: { managerId: userId },
            include: {
                profile: {
                    select: {
                        id: true,
                        name: true,
                        platform: true,
                        platformUsername: true,
                        isActive: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const assignedProfiles = assignments.map((a: any) => ({
            id: a.profile.id,
            name: a.profile.name,
            platform: a.profile.platform,
            platformUsername: a.profile.platformUsername,
            isActive: a.profile.isActive,
            assignedAt: a.createdAt,
        }));

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            assignedProfiles,
            total: assignedProfiles.length,
        });
    } catch (error) {
        console.error("Error fetching assigned profiles:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

/**
 * POST /api/admin/users/[id]/profiles
 * Assign profiles to a user
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Only ADMIN can manage profile assignments
        const currentUser = await requireRole([Role.ADMIN]);

        const userId = params.id;

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only allow assigning profiles to MANAGER and EMPLOYEE
        if (user.role === Role.ADMIN) {
            return NextResponse.json(
                { error: "Cannot assign profiles to ADMIN users" },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const parsed = profileIdsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.errors },
                { status: 400 }
            );
        }

        const { profileIds } = parsed.data;

        // Verify all profiles exist
        const profiles = await prisma.profile.findMany({
            where: { id: { in: profileIds } },
            select: { id: true },
        });

        if (profiles.length !== profileIds.length) {
            return NextResponse.json(
                { error: "One or more profile IDs are invalid" },
                { status: 400 }
            );
        }

        // Create assignments (skip if already exists)
        const assignments = await Promise.all(
            profileIds.map((profileId) =>
                (prisma as any).profileAssignment.upsert({
                    where: {
                        ux_profile_assignment: {
                            managerId: userId,
                            profileId: profileId,
                        },
                    },
                    create: {
                        managerId: userId,
                        profileId: profileId,
                        assignedBy: currentUser.id,
                    },
                    update: {
                        assignedBy: currentUser.id,
                        updatedAt: new Date(),
                    },
                })
            )
        );

        return NextResponse.json({
            success: true,
            message: `Assigned ${assignments.length} profile(s) to user`,
            assignedCount: assignments.length,
        });
    } catch (error) {
        console.error("Error assigning profiles:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/users/[id]/profiles
 * Remove profile assignments from a user
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Only ADMIN can manage profile assignments
        await requireRole([Role.ADMIN]);

        const userId = params.id;

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Parse and validate request body
        const body = await request.json();
        const parsed = profileIdsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.errors },
                { status: 400 }
            );
        }

        const { profileIds } = parsed.data;

        // Delete assignments
        const result = await (prisma as any).profileAssignment.deleteMany({
            where: {
                managerId: userId,
                profileId: { in: profileIds },
            },
        });

        return NextResponse.json({
            success: true,
            message: `Removed ${result.count} profile assignment(s)`,
            removedCount: result.count,
        });
    } catch (error) {
        console.error("Error removing profile assignments:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
