import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-slate-50 to-zinc-100 px-4 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        {children}
      </div>
    </div>
  );
}



