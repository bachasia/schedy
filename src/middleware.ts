import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes based on authentication and role
 * Note: We can't use auth() directly in middleware in Next.js 16
 * Instead, we'll check for session cookie and redirect if needed
 */
export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/api/auth'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for session cookie (NextAuth session token)
    const sessionToken = request.cookies.get('authjs.session-token') ||
        request.cookies.get('__Secure-authjs.session-token');

    if (!sessionToken) {
        // Redirect to login if not authenticated
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Admin-only routes - we'll do additional checks in the page components
    // since we can't easily access session data in middleware
    const adminRoutes = ['/admin/users'];
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    if (isAdminRoute) {
        // Additional role check will be done in the page component
        // Here we just ensure they're authenticated
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
