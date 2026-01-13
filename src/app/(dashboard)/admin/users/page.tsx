import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/rbac';
import { Role } from '@/lib/permissions';
import UsersPageClient from './UsersPageClient';

export default async function UsersPage() {
    // Server-side role check
    const user = await getCurrentUser();

    console.log('[DEBUG] UsersPage - Current user:', user);
    console.log('[DEBUG] UsersPage - User role:', user?.role);
    console.log('[DEBUG] UsersPage - Expected role:', Role.ADMIN);

    if (!user || user.role !== Role.ADMIN) {
        console.log('[DEBUG] UsersPage - Redirecting to /posts because user is not ADMIN');
        redirect('/posts');
    }

    console.log('[DEBUG] UsersPage - User is ADMIN, rendering UsersPageClient');
    return <UsersPageClient />;
}
