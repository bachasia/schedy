import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { Role } from '@/lib/permissions';

const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: Request) {
    try {
        // Require ADMIN role
        await requireRole([Role.ADMIN]);

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const isActive = searchParams.get('isActive');
        const search = searchParams.get('search');

        const where: any = {};

        if (role) {
            where.role = role;
        }

        if (isActive !== null && isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (search) {
            where.OR = [
                { email: { contains: search } },
                { name: { contains: search } },
            ];
        }

        const users = await prisma.user.findMany({
            where,
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ users });
    } catch (error: any) {
        console.error('Error fetching users:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: Request) {
    try {
        // Require ADMIN role
        const currentUser = await requireRole([Role.ADMIN]);

        const json = await request.json();
        const parsed = createUserSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: parsed.error.errors },
                { status: 400 }
            );
        }

        const { name, email, password, role, isActive } = parsed.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                isActive,
                createdBy: currentUser.id,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating user:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
