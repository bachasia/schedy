"use client";

import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
        <Avatar name={name ?? email ?? undefined} src={image} />
        <span className="hidden max-w-[120px] truncate text-xs font-medium text-zinc-900 dark:text-zinc-50 sm:inline">
          {name ?? email ?? "User"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">
              {name ?? "Signed in"}
            </span>
            {email ? (
              <span className="truncate text-xs text-zinc-500">{email}</span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-red-600 focus:text-red-600 dark:text-red-400"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


