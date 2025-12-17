import { Heart } from "lucide-react";

export function DashboardFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          2025 © Schedy | Crafted with{" "}
          <Heart className="inline h-3 w-3 fill-red-500 text-red-500" />{" "}
          by DTC Team
        </p>
      </div>
    </footer>
  );
}
