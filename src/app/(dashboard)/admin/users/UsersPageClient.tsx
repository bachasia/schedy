import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/rbac';
import { Role } from '@/lib/permissions';
import UsersPageClient from './UsersPageClient';

export default async function UsersPage() {
    // Server-side role check
    const user = await getCurrentUser();

    if (!user || user.role !== Role.ADMIN) {
        redirect('/posts');
    }

    return <UsersPageClient />;
}
