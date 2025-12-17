import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardFooter } from "@/components/dashboard-footer";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <Sidebar userName={user.name ?? user.email} />
      <div className="flex min-h-screen flex-1 flex-col md:ml-60">
        {/* Header */}
        <header className="hidden items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:flex">
          <DashboardBreadcrumbs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              image={(user as typeof user & { image?: string | null }).image}
            />
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-6xl space-y-4">{children}</div>
        </main>
        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}


