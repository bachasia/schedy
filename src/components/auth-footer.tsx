import { Heart } from "lucide-react";

export function AuthFooter() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 py-4 text-center">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        2025 © Schedy | Crafted with{" "}
        <Heart className="inline h-3 w-3 fill-red-500 text-red-500" />{" "}
        by DTC Team
      </p>
    </footer>
  );
}
