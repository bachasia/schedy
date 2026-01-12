/**
 * Role-Based Access Control (RBAC) utilities
 * Server-side helpers for authentication and authorization
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/permissions';

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    isActive: boolean;
}

/**
 * Get the current authenticated user with role information
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        return null;
    }

    return user as AuthUser;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized: Authentication required');
    }

    return user;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthUser> {
    const user = await requireAuth();

    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Forbidden: Required role(s): ${allowedRoles.join(', ')}`);
    }

    return user;
}

/**
 * Check if current user can manage another user
 * Only ADMIN can manage users
 */
export async function canManageUser(targetUserId: string): Promise<boolean> {
    const currentUser = await getCurrentUser();

    if (!currentUser) return false;

    // Only ADMIN can manage users
    if (currentUser.role !== Role.ADMIN) return false;

    // ADMIN cannot deactivate themselves
    if (currentUser.id === targetUserId) return false;

    return true;
}

/**
 * Check if current user can access a resource owned by another user
 */
export async function canAccessResource(resourceOwnerId: string): Promise<boolean> {
    const currentUser = await getCurrentUser();

    if (!currentUser) return false;

    // ADMIN and MANAGER can access all resources
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER) {
        return true;
    }

    // EMPLOYEE can only access their own resources
    return currentUser.id === resourceOwnerId;
}

/**
 * Check if current user can modify a resource owned by another user
 */
export async function canModifyResource(resourceOwnerId: string): Promise<boolean> {
    const currentUser = await getCurrentUser();

    if (!currentUser) return false;

    // ADMIN and MANAGER can modify all resources
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER) {
        return true;
    }

    // EMPLOYEE can only modify their own resources
    return currentUser.id === resourceOwnerId;
}
