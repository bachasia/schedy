"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  PenSquare,
  UserCircle2,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  userName?: string | null;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profiles", label: "Profiles", icon: UserCircle2 },
  { href: "/posts", label: "Posts", icon: PenSquare },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/admin/queue", label: "Queue", icon: Activity },
];

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 flex-col border-r border-zinc-200 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/80 md:flex">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Schedy
          </span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                  active &&
                    "bg-zinc-900 text-zinc-50 shadow-sm hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <div className="mb-2 truncate">Signed in as {userName ?? "User"}</div>
          <Button
            variant="outline"
            size="sm"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Schedy
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserCircle2 className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </div>
      </div>
      {open ? (
        <div className="border-b border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    active &&
                      "bg-zinc-900 text-zinc-50 shadow-sm hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900",
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 flex w-full items-center justify-center gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </nav>
        </div>
      ) : null}
    </>
  );
}


