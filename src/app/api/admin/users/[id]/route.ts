import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireRole, canManageUser } from '@/lib/rbac';
import { Role } from '@/lib/permissions';

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
    isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/users/[id]
 * Get user details (admin only)
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireRole([Role.ADMIN]);

        const params = await context.params;

        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        posts: true,
                        profiles: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error('Error fetching user:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user (admin only)
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireRole([Role.ADMIN]);

        const params = await context.params;

        // Check if admin can manage this user
        const canManage = await canManageUser(params.id);
        if (!canManage) {
            return NextResponse.json(
                { error: 'Cannot modify your own account or insufficient permissions' },
                { status: 403 }
            );
        }

        const json = await request.json();
        const parsed = updateUserSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parsed.error.errors },
                { status: 400 }
            );
        }

        const data: any = {};

        if (parsed.data.name !== undefined) {
            data.name = parsed.data.name;
        }

        if (parsed.data.email !== undefined) {
            // Check if email is already taken
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: parsed.data.email,
                    id: { not: params.id },
                },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'Email already in use' },
                    { status: 409 }
                );
            }

            data.email = parsed.data.email;
        }

        if (parsed.data.password !== undefined) {
            data.password = await bcrypt.hash(parsed.data.password, 10);
        }

        if (parsed.data.role !== undefined) {
            data.role = parsed.data.role;
        }

        if (parsed.data.isActive !== undefined) {
            data.isActive = parsed.data.isActive;
        }

        const user = await prisma.user.update({
            where: { id: params.id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error('Error updating user:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/users/[id]
 * Soft delete user by setting isActive to false (admin only)
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireRole([Role.ADMIN]);

        const params = await context.params;

        // Check if admin can manage this user
        const canManage = await canManageUser(params.id);
        if (!canManage) {
            return NextResponse.json(
                { error: 'Cannot delete your own account or insufficient permissions' },
                { status: 403 }
            );
        }

        // Soft delete by setting isActive to false
        await prisma.user.update({
            where: { id: params.id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
