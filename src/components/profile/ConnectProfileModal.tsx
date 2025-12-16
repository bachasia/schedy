"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Facebook, Instagram, Twitter, Video, ExternalLink } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

const connectProfileSchema = z.object({
  name: z.string().min(2, "Profile name must be at least 2 characters"),
  platformUserId: z.string().min(1, "Platform user ID is required"),
  platformUsername: z.string().min(1, "Username is required"),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
});

type ConnectProfileFormValues = z.infer<typeof connectProfileSchema>;

interface ConnectProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PLATFORM_INFO: Record<
  Platform,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    docs: string;
    instructions: string[];
  }
> = {
  FACEBOOK: {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    docs: "https://developers.facebook.com/docs/facebook-login/access-tokens",
    instructions: [
      "Go to Facebook Graph API Explorer",
      "Generate a User Access Token with required permissions",
      "Copy the token and your User ID",
    ],
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    docs: "https://developers.facebook.com/docs/instagram-basic-display-api",
    instructions: [
      "Create an Instagram Basic Display app",
      "Generate a User Access Token",
      "Copy the token and your Instagram User ID",
    ],
  },
  TIKTOK: {
    name: "TikTok",
    icon: Video,
    color: "text-emerald-500",
    docs: "https://developers.tiktok.com/doc/login-kit-web",
    instructions: [
      "Register your app on TikTok for Developers",
      "Use Login Kit to get user authorization",
      "Copy the access token and user ID",
    ],
  },
  TWITTER: {
    name: "Twitter",
    icon: Twitter,
    color: "text-sky-500",
    docs: "https://developer.twitter.com/en/docs/authentication/oauth-2-0",
    instructions: [
      "Create a Twitter/X developer app",
      "Generate OAuth 2.0 tokens",
      "Copy the access token and user ID",
    ],
  },
};

export function ConnectProfileModal({
  open,
  onOpenChange,
  onSuccess,
}: ConnectProfileModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConnectProfileFormValues>({
    resolver: zodResolver(connectProfileSchema),
  });

  const handleClose = () => {
    setSelectedPlatform(null);
    reset();
    setError(null);
    onOpenChange(false);
  };

  const onSubmit = async (values: ConnectProfileFormValues) => {
    if (!selectedPlatform) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post("/api/profiles", {
        name: values.name,
        platform: selectedPlatform,
        platformUserId: values.platformUserId,
        platformUsername: values.platformUsername,
        accessToken: values.accessToken,
        refreshToken: values.refreshToken || undefined,
      });

      reset();
      setSelectedPlatform(null);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Failed to connect profile. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformInfo = selectedPlatform
    ? PLATFORM_INFO[selectedPlatform]
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedPlatform ? `Connect ${platformInfo?.name}` : "Connect Social Profile"}
          </DialogTitle>
          <DialogDescription>
            {selectedPlatform
              ? "Enter your profile credentials manually or use OAuth (Phase 2)."
              : "Choose a platform to connect to your account."}
          </DialogDescription>
        </DialogHeader>

        {!selectedPlatform ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {(Object.keys(PLATFORM_INFO) as Platform[]).map((platform) => {
              const info = PLATFORM_INFO[platform];
              const Icon = info.icon;
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800",
                      info.color,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {/* OAuth Connect (for Facebook, Instagram, and TikTok) */}
            {(selectedPlatform === "FACEBOOK" || selectedPlatform === "INSTAGRAM" || selectedPlatform === "TIKTOK") && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Recommended: Connect with OAuth
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    className={cn(
                      "w-full gap-2",
                      selectedPlatform === "FACEBOOK" && "bg-blue-600 hover:bg-blue-700",
                      selectedPlatform === "INSTAGRAM" && "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
                      selectedPlatform === "TIKTOK" && "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
                    )}
                    onClick={() => {
                      if (selectedPlatform === "TIKTOK") {
                        window.location.href = "/api/social/tiktok/connect";
                      } else {
                        window.location.href = `/api/social/facebook/connect?type=${selectedPlatform.toLowerCase()}`;
                      }
                    }}
                  >
                    <ExternalLink className="h-5 w-5" />
                    Connect {platformInfo?.name} via OAuth
                  </Button>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Secure OAuth flow - automatically imports your {selectedPlatform === "TIKTOK" ? "account" : "pages/accounts"}
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-300 dark:border-zinc-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                      Or enter manually
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Instructions */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  <ExternalLink className="h-4 w-4" />
                  Getting Your Credentials
                </h4>
                <ol className="ml-4 list-decimal space-y-1 text-xs text-blue-800 dark:text-blue-400">
                  {platformInfo?.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ol>
                <a
                  href={platformInfo?.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Business Account"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="platformUsername">Username</Label>
                <Input
                  id="platformUsername"
                  placeholder={`Your ${platformInfo?.name} username`}
                  {...register("platformUsername")}
                />
                {errors.platformUsername && (
                  <p className="text-xs text-red-600">
                    {errors.platformUsername.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="platformUserId">Platform User ID</Label>
                <Input
                  id="platformUserId"
                  placeholder="e.g., 123456789"
                  {...register("platformUserId")}
                />
                {errors.platformUserId && (
                  <p className="text-xs text-red-600">
                    {errors.platformUserId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Paste your access token here"
                  {...register("accessToken")}
                />
                {errors.accessToken && (
                  <p className="text-xs text-red-600">
                    {errors.accessToken.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshToken">
                  Refresh Token{" "}
                  <span className="text-xs text-zinc-500">(Optional)</span>
                </Label>
                <Input
                  id="refreshToken"
                  type="password"
                  placeholder="Paste refresh token if available"
                  {...register("refreshToken")}
                />
              </div>
            </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPlatform(null)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Connecting..." : "Connect Profile"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

