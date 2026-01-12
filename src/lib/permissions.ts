/**
 * Role-based permission system for Schedy
 * Defines permissions and access control for ADMIN, MANAGER, and EMPLOYEE roles
 */

export enum Permission {
    // User Management
    MANAGE_USERS = 'manage_users',
    VIEW_USERS = 'view_users',

    // Post Management
    MANAGE_ALL_POSTS = 'manage_all_posts',
    MANAGE_OWN_POSTS = 'manage_own_posts',
    VIEW_ALL_POSTS = 'view_all_posts',
    VIEW_OWN_POSTS = 'view_own_posts',

    // Profile Management
    MANAGE_ALL_PROFILES = 'manage_all_profiles',
    MANAGE_OWN_PROFILES = 'manage_own_profiles',
    VIEW_ALL_PROFILES = 'view_all_profiles',
    VIEW_OWN_PROFILES = 'view_own_profiles',

    // Queue Management
    VIEW_QUEUE_STATS = 'view_queue_stats',
    MANAGE_QUEUE = 'manage_queue',

    // System
    VIEW_ADMIN_PANEL = 'view_admin_panel',
}

export enum Role {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

/**
 * Permission matrix mapping roles to their allowed permissions
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.ADMIN]: [
        // Full access to everything
        Permission.MANAGE_USERS,
        Permission.VIEW_USERS,
        Permission.MANAGE_ALL_POSTS,
        Permission.VIEW_ALL_POSTS,
        Permission.MANAGE_ALL_PROFILES,
        Permission.VIEW_ALL_PROFILES,
        Permission.VIEW_QUEUE_STATS,
        Permission.MANAGE_QUEUE,
        Permission.VIEW_ADMIN_PANEL,
    ],

    [Role.MANAGER]: [
        // Can manage all posts and profiles, view queue stats
        Permission.VIEW_USERS,
        Permission.MANAGE_ALL_POSTS,
        Permission.VIEW_ALL_POSTS,
        Permission.MANAGE_ALL_PROFILES,
        Permission.VIEW_ALL_PROFILES,
        Permission.VIEW_QUEUE_STATS,
    ],

    [Role.EMPLOYEE]: [
        // Can only manage their own posts and profiles
        Permission.MANAGE_OWN_POSTS,
        Permission.VIEW_OWN_POSTS,
        Permission.MANAGE_OWN_PROFILES,
        Permission.VIEW_OWN_PROFILES,
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Route access control configuration
 */
export const PROTECTED_ROUTES = {
    // Admin-only routes
    admin: {
        paths: ['/admin', '/admin/users'],
        requiredPermission: Permission.VIEW_ADMIN_PANEL,
    },

    // Manager and Admin routes
    allPosts: {
        paths: ['/posts'],
        requiredPermission: Permission.VIEW_ALL_POSTS,
    },

    // All authenticated users
    ownPosts: {
        paths: ['/posts/new', '/posts/[id]/edit'],
        requiredPermission: Permission.MANAGE_OWN_POSTS,
    },
} as const;

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(role: Role, path: string): boolean {
    // Admin has access to everything
    if (role === Role.ADMIN) return true;

    // Check specific route permissions
    for (const route of Object.values(PROTECTED_ROUTES)) {
        const matchesPath = route.paths.some(routePath => {
            // Simple path matching (can be enhanced with regex for dynamic routes)
            return path.startsWith(routePath.replace('[id]', ''));
        });

        if (matchesPath) {
            return hasPermission(role, route.requiredPermission);
        }
    }

    // Default: allow access if not explicitly protected
    return true;
}

/**
 * Check if a user can manage another user's resource
 */
export function canManageResource(
    userRole: Role,
    resourceOwnerId: string,
    currentUserId: string
): boolean {
    // Admin can manage everything
    if (userRole === Role.ADMIN) return true;

    // Manager can manage all resources
    if (userRole === Role.MANAGER) return true;

    // Employee can only manage their own resources
    return resourceOwnerId === currentUserId;
}
