/**
 * Role-Based Access Control (RBAC) utilities
 * Server-side helpers for authentication and authorization
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/permissions";

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
    throw new Error("Unauthorized: Authentication required");
  }

  return user;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Required role(s): ${allowedRoles.join(", ")}`);
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
export async function canAccessResource(
  resourceOwnerId: string,
): Promise<boolean> {
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
export async function canModifyResource(
  resourceOwnerId: string,
): Promise<boolean> {
  const currentUser = await getCurrentUser();

  if (!currentUser) return false;

  // ADMIN and MANAGER can modify all resources
  if (currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER) {
    return true;
  }

  // EMPLOYEE can only modify their own resources
  return currentUser.id === resourceOwnerId;
}

/**
 * Check if current user can access a specific profile
 * - ADMIN: can access all profiles
 * - MANAGER: can access assigned profiles only
 * - EMPLOYEE: can access own profiles only
 */
export async function canAccessProfile(profileId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();

  if (!currentUser) return false;

  // ADMIN can access all profiles
  if (currentUser.role === Role.ADMIN) {
    return true;
  }

  // Get the profile
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });

  if (!profile) return false;

  // EMPLOYEE can only access their own profiles
  if (currentUser.role === Role.EMPLOYEE) {
    return profile.userId === currentUser.id;
  }

  // MANAGER can access profiles they own or are assigned to them
  if (currentUser.role === Role.MANAGER) {
    // Check if it's their own profile
    if (profile.userId === currentUser.id) {
      return true;
    }

    // Check if the profile is assigned to them
    const assignment = await (prisma as any).profileAssignment.findUnique({
      where: {
        ux_profile_assignment: {
          managerId: currentUser.id,
          profileId: profileId,
        },
      },
    });

    return !!assignment;
  }

  return false;
}

/**
 * Check if current user can modify a specific profile
 * Same logic as canAccessProfile for now
 */
export async function canModifyProfile(profileId: string): Promise<boolean> {
  return canAccessProfile(profileId);
}

/**
 * Get all profile IDs that a manager can access
 * Returns all profile IDs for ADMIN, assigned profiles for MANAGER, own profiles for EMPLOYEE
 */
export async function getAccessibleProfileIds(): Promise<string[]> {
  const currentUser = await getCurrentUser();

  if (!currentUser) return [];

  // ADMIN can access all profiles
  if (currentUser.role === Role.ADMIN) {
    const profiles = await prisma.profile.findMany({
      select: { id: true },
    });
    return profiles.map((p) => p.id);
  }

  // EMPLOYEE can only access their own profiles
  if (currentUser.role === Role.EMPLOYEE) {
    const profiles = await prisma.profile.findMany({
      where: { userId: currentUser.id },
      select: { id: true },
    });
    return profiles.map((p) => p.id);
  }

  // MANAGER can access their own profiles and assigned profiles
  if (currentUser.role === Role.MANAGER) {
    const [ownProfiles, assignedProfiles] = await Promise.all([
      prisma.profile.findMany({
        where: { userId: currentUser.id },
        select: { id: true },
      }),
      (prisma as any).profileAssignment.findMany({
        where: { managerId: currentUser.id },
        select: { profileId: true },
      }),
    ]);

    const ownProfileIds = ownProfiles.map((p) => p.id);
    const assignedProfileIds = assignedProfiles.map((a: any) => a.profileId);

    return [...new Set([...ownProfileIds, ...assignedProfileIds])];
  }

  return [];
}
