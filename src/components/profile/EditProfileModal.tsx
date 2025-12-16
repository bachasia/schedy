"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
  isActive: boolean;
}

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess?: () => void;
}

const editProfileSchema = z.object({
  name: z.string().min(2, "Profile name must be at least 2 characters"),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  isActive: z.boolean(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TWITTER: "Twitter",
};

export function EditProfileModal({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: EditProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenFields, setShowTokenFields] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
  });

  useEffect(() => {
    if (profile && open) {
      setValue("name", profile.name || "");
      setValue("isActive", profile.isActive);
      setShowTokenFields(false);
      setError(null);
    }
  }, [profile, open, setValue]);

  const handleClose = () => {
    reset();
    setError(null);
    setShowTokenFields(false);
    onOpenChange(false);
  };

  const onSubmit = async (values: EditProfileFormValues) => {
    if (!profile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: {
        name: string;
        isActive: boolean;
        accessToken?: string;
        refreshToken?: string;
      } = {
        name: values.name,
        isActive: values.isActive,
      };

      // Only include token fields if they were shown and filled
      if (showTokenFields) {
        if (values.accessToken) {
          updateData.accessToken = values.accessToken;
        }
        if (values.refreshToken) {
          updateData.refreshToken = values.refreshToken;
        }
      }

      await axios.patch(`/api/profiles/${profile.id}`, updateData);

      reset();
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update settings for your {PLATFORM_LABELS[profile.platform]} profile
            {profile.platformUsername && ` (@${profile.platformUsername})`}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Profile Name</Label>
            <Input
              id="edit-name"
              placeholder="My Profile"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-isActive">Status</Label>
            <div className="flex items-center gap-2">
              <input
                id="edit-isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                {...register("isActive")}
              />
              <label
                htmlFor="edit-isActive"
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                Profile is active
              </label>
            </div>
            <p className="text-xs text-zinc-500">
              Inactive profiles won&apos;t be used for posting.
            </p>
          </div>

          {/* Token refresh section */}
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Refresh Tokens</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTokenFields(!showTokenFields)}
              >
                {showTokenFields ? "Cancel" : "Update Tokens"}
              </Button>
            </div>
            {showTokenFields && (
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-accessToken" className="text-xs">
                    New Access Token
                  </Label>
                  <Input
                    id="edit-accessToken"
                    type="password"
                    placeholder="Paste new access token"
                    {...register("accessToken")}
                  />
                  {errors.accessToken && (
                    <p className="text-xs text-red-600">
                      {errors.accessToken.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-refreshToken" className="text-xs">
                    New Refresh Token{" "}
                    <span className="text-zinc-500">(Optional)</span>
                  </Label>
                  <Input
                    id="edit-refreshToken"
                    type="password"
                    placeholder="Paste new refresh token"
                    {...register("refreshToken")}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


