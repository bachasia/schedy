"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
}

interface DeleteProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess?: () => void;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TWITTER: "Twitter",
};

export function DeleteProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: DeleteProfileDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isDeleting) return;
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!profile) return;

    setIsDeleting(true);
    setError(null);

    try {
      await axios.delete(`/api/profiles/${profile.id}`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Failed to delete profile. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  const displayName =
    profile.name ||
    (profile.platformUsername
      ? `@${profile.platformUsername}`
      : PLATFORM_LABELS[profile.platform]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>Delete Profile</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{displayName}</span> (
              {PLATFORM_LABELS[profile.platform]})?
            </p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>All scheduled posts for this profile will be deleted</li>
              <li>Historical post data will be removed</li>
              <li>You&apos;ll need to reconnect if you want to use this profile again</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
            >
              {isDeleting ? "Deleting..." : "Delete Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}






