"use client";

import { useMemo } from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  Video,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  ThumbsUp,
  Send,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface MediaFile {
  id: string;
  preview: string;
  type: "image" | "video";
  url?: string;
}

interface PostPreviewProps {
  content: string;
  mediaFiles: MediaFile[];
  selectedPlatforms: Platform[];
  profileName?: string;
  profileUsername?: string;
}

const PLATFORM_COLORS = {
  FACEBOOK: "bg-blue-600",
  INSTAGRAM: "bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500",
  TWITTER: "bg-sky-500",
  TIKTOK: "bg-black",
};

export function PostPreview({
  content,
  mediaFiles,
  selectedPlatforms,
  profileName = "Your Profile",
  profileUsername = "username",
}: PostPreviewProps) {
  // Format content with highlighting
  const formatContent = (text: string, platform: Platform) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex to match hashtags, mentions, and URLs
    const regex = /(#\w+)|(@\w+)|(https?:\/\/[^\s]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const [fullMatch] = match;

      if (fullMatch.startsWith("#")) {
        // Hashtag
        parts.push(
          <span key={match.index} className="font-medium text-blue-600 dark:text-blue-400">
            {fullMatch}
          </span>,
        );
      } else if (fullMatch.startsWith("@")) {
        // Mention
        parts.push(
          <span key={match.index} className="font-medium text-blue-600 dark:text-blue-400">
            {fullMatch}
          </span>,
        );
      } else {
        // URL
        parts.push(
          <span key={match.index} className="text-blue-600 underline dark:text-blue-400">
            {fullMatch}
          </span>,
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <span className="whitespace-pre-wrap break-words">
        {parts.length > 0 ? parts : text}
      </span>
    );
  };

  const firstImage = mediaFiles.find((f) => f.type === "image");
  const hasVideo = mediaFiles.some((f) => f.type === "video");

  if (selectedPlatforms.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Select platforms to see preview
      </div>
    );
  }

  // Remove duplicates from selectedPlatforms
  const uniquePlatforms = Array.from(new Set(selectedPlatforms));

  return (
    <Tabs defaultValue={uniquePlatforms[0]} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${uniquePlatforms.length}, 1fr)` }}>
        {uniquePlatforms.map((platform) => {
          const Icon =
            platform === "FACEBOOK"
              ? Facebook
              : platform === "INSTAGRAM"
                ? Instagram
                : platform === "TWITTER"
                  ? Twitter
                  : Video;
          return (
            <TabsTrigger key={platform} value={platform} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {platform === "FACEBOOK"
                  ? "Facebook"
                  : platform === "INSTAGRAM"
                    ? "Instagram"
                    : platform === "TWITTER"
                      ? "Twitter"
                      : "TikTok"}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Facebook Preview */}
      {uniquePlatforms.includes("FACEBOOK") && (
        <TabsContent value="FACEBOOK" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                <Facebook className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {profileName}
                </div>
                <div className="text-xs text-zinc-500">Just now · 🌎</div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-zinc-500" />
            </div>

            {/* Content */}
            {content && (
              <div className="px-4 pb-3 text-sm text-zinc-700 dark:text-zinc-300">
                {formatContent(content, "FACEBOOK")}
              </div>
            )}

            {/* Media */}
            {mediaFiles.length > 0 && (
              <div className="relative bg-zinc-100 dark:bg-zinc-900">
                {firstImage ? (
                  <img
                    src={firstImage.preview}
                    alt="Post media"
                    className="w-full"
                    style={{ maxHeight: "500px", objectFit: "contain" }}
                  />
                ) : hasVideo ? (
                  <div className="flex h-96 items-center justify-center">
                    <Video className="h-16 w-16 text-zinc-400" />
                  </div>
                ) : null}
                {mediaFiles.length > 1 && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                    +{mediaFiles.length - 1} more
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
              <div className="flex items-center justify-around text-sm">
                <button className="flex flex-1 items-center justify-center gap-2 rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-zinc-600 dark:text-zinc-400">Like</span>
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-zinc-600 dark:text-zinc-400">Comment</span>
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Share2 className="h-4 w-4" />
                  <span className="text-zinc-600 dark:text-zinc-400">Share</span>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      )}

      {/* Instagram Preview */}
      {uniquePlatforms.includes("INSTAGRAM") && (
        <TabsContent value="INSTAGRAM" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 text-white">
                <Instagram className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {profileUsername}
                </div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
            </div>

            {/* Media */}
            {mediaFiles.length > 0 && (
              <div className="relative bg-zinc-100 dark:bg-zinc-900">
                {firstImage ? (
                  <img
                    src={firstImage.preview}
                    alt="Post media"
                    className="w-full"
                    style={{ maxHeight: "500px", objectFit: "cover", aspectRatio: "1/1" }}
                  />
                ) : hasVideo ? (
                  <div className="flex aspect-square items-center justify-center">
                    <Video className="h-16 w-16 text-zinc-400" />
                  </div>
                ) : (
                  <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
                )}
                {mediaFiles.length > 1 && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
                    <span className="text-xs text-white">+{mediaFiles.length - 1}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <Heart className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
                <MessageCircle className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
                <Send className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
              </div>
              <Bookmark className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
            </div>

            {/* Content */}
            {content && (
              <div className="px-3 pb-3">
                <div className="text-sm text-zinc-900 dark:text-zinc-50">
                  <span className="font-semibold">{profileUsername}</span>{" "}
                  {formatContent(content, "INSTAGRAM")}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      )}

      {/* Twitter Preview */}
      {uniquePlatforms.includes("TWITTER") && (
        <TabsContent value="TWITTER" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {/* Header */}
            <div className="flex gap-3 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                <Twitter className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    {profileName}
                  </span>
                  <span className="text-zinc-500">@{profileUsername}</span>
                  <span className="text-zinc-500">· now</span>
                </div>

                {/* Content */}
                {content && (
                  <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
                    {formatContent(content, "TWITTER")}
                  </div>
                )}

                {/* Media */}
                {mediaFiles.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    {mediaFiles.length === 1 ? (
                      firstImage ? (
                        <img
                          src={firstImage.preview}
                          alt="Post media"
                          className="w-full"
                          style={{ maxHeight: "500px", objectFit: "cover" }}
                        />
                      ) : hasVideo ? (
                        <div className="flex h-96 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                          <Video className="h-16 w-16 text-zinc-400" />
                        </div>
                      ) : null
                    ) : (
                      <div className="grid grid-cols-2 gap-0.5">
                        {mediaFiles.slice(0, 4).map((media, idx) => (
                          <div key={media.id} className="relative aspect-square">
                            {media.type === "image" ? (
                              <img
                                src={media.preview}
                                alt={`Media ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                                <Video className="h-8 w-8 text-zinc-400" />
                              </div>
                            )}
                            {idx === 3 && mediaFiles.length > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <span className="text-2xl font-bold text-white">
                                  +{mediaFiles.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between text-zinc-500">
                  <button className="flex items-center gap-2 hover:text-sky-500">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">0</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-green-500">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs">0</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-pink-500">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">0</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-sky-500">
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      )}

      {/* TikTok Preview */}
      {uniquePlatforms.includes("TIKTOK") && (
        <TabsContent value="TIKTOK" className="mt-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black shadow-sm dark:border-zinc-800">
            <div className="relative aspect-[9/16] max-h-[600px] bg-zinc-900">
              {/* Video or Placeholder */}
              {hasVideo ? (
                <div className="flex h-full items-center justify-center">
                  <Video className="h-24 w-24 text-white/60" />
                </div>
              ) : firstImage ? (
                <img
                  src={firstImage.preview}
                  alt="Post media"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-white/60">No media</span>
                </div>
              )}

              {/* Overlay UI */}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                {/* Content */}
                {content && (
                  <div className="mb-4 text-sm text-white">
                    {formatContent(content, "TIKTOK")}
                  </div>
                )}

                {/* Profile Info */}
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <Video className="h-4 w-4 text-black" />
                  </div>
                  <span className="font-semibold text-white">@{profileUsername}</span>
                </div>
              </div>

              {/* Side Actions */}
              <div className="absolute bottom-20 right-4 flex flex-col items-center gap-6">
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-white">0</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-white">0</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80">
                    <Bookmark className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-white">0</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs text-white">0</span>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

