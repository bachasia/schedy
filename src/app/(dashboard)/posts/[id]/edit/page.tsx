"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Image as ImageIcon,
  Calendar,
  Save,
  ArrowRight,
  Facebook,
  Instagram,
  Twitter,
  Video,
  Play,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "@/components/post/MediaUpload";
import { PostPreview } from "@/components/post/PostPreview";
import { ScheduleForm } from "@/components/post/ScheduleForm";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "YOUTUBE";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
  isActive: boolean;
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  status: string;
  platform: Platform;
  profileId: string;
  profile: {
    id: string;
    name: string | null;
    platform: Platform;
    platformUsername: string | null;
  };
}

const PLATFORM_LIMITS: Record<Platform, number> = {
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  TWITTER: 280,
  TIKTOK: 2200,
  YOUTUBE: 5000,
};

const PLATFORM_INFO: Record<
  Platform,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  FACEBOOK: { name: "Facebook", icon: Facebook, color: "text-blue-600" },
  INSTAGRAM: { name: "Instagram", icon: Instagram, color: "text-pink-500" },
  TWITTER: { name: "Twitter", icon: Twitter, color: "text-sky-500" },
  TIKTOK: { name: "TikTok", icon: Video, color: "text-emerald-500" },
  YOUTUBE: { name: "YouTube", icon: Play, color: "text-red-600" },
};

const postSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(63206, "Content is too long"),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("content");
  const [isSaving, setIsSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: "",
    },
  });

  const content = watch("content");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        const postData = res.data.post;
        setPost(postData);
        setValue("content", postData.content);

        // Load existing media
        if (postData.mediaUrls && postData.mediaUrls.length > 0) {
          const existingMedia = postData.mediaUrls.map((url: string, idx: number) => ({
            id: `existing-${idx}`,
            preview: url,
            url,
            type: url.includes("video") ? "video" : "image",
          }));
          setMediaFiles(existingMedia);
        }
      } catch (error) {
        console.error("Failed to fetch post:", error);
        alert("Failed to load post.");
        router.push("/posts");
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      void fetchPost();
    }
  }, [postId, router, setValue]);

  const characterLimit = post ? PLATFORM_LIMITS[post.platform] : 63206;
  const characterCount = content.length;
  const isOverLimit = characterCount > characterLimit;

  const onSaveChanges = async (data: PostFormValues) => {
    if (!post) return;

    setIsSaving(true);
    try {
      const mediaUrls = mediaFiles
        .filter((f) => f.url)
        .map((f) => f.url as string);

      await axios.patch(`/api/posts/${postId}`, {
        content: data.content,
        mediaUrls,
        mediaType: mediaFiles.some((f) => f.type === "video")
          ? "VIDEO"
          : "IMAGE",
      });

      router.push("/posts");
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onSchedulePost = async (scheduledAt: Date | null) => {
    if (!post) return;

    setIsSaving(true);
    try {
      const mediaUrls = mediaFiles
        .filter((f) => f.url)
        .map((f) => f.url as string);

      const status = scheduledAt ? "SCHEDULED" : "PUBLISHED";

      await axios.patch(`/api/posts/${postId}`, {
        content,
        mediaUrls,
        mediaType: mediaFiles.some((f) => f.type === "video")
          ? "VIDEO"
          : "IMAGE",
        status,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
      });

      router.push("/posts");
    } catch (error) {
      console.error("Failed to schedule post:", error);
      alert("Failed to schedule post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-zinc-500">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const selectedProfile = post.profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Edit Post
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Update your post for {PLATFORM_INFO[post.platform].name}.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/posts")}>
          Cancel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="flex items-center gap-2"
            disabled={!content.trim()}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="space-y-6">
              {/* Platform Info */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {React.createElement(PLATFORM_INFO[post.platform].icon, {
                      className: cn("h-5 w-5", PLATFORM_INFO[post.platform].color),
                    })}
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {selectedProfile.name || PLATFORM_INFO[post.platform].name}
                    </div>
                    {selectedProfile.platformUsername && (
                      <div className="text-xs text-zinc-500">
                        @{selectedProfile.platformUsername}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content" className="text-base font-semibold">
                    Post Content
                  </Label>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isOverLimit
                        ? "text-red-600"
                        : characterCount > characterLimit * 0.9
                          ? "text-orange-600"
                          : "text-zinc-500",
                    )}
                  >
                    {characterCount} / {characterLimit}
                  </div>
                </div>

                <Textarea
                  id="content"
                  placeholder="What's on your mind?"
                  className="min-h-[200px] resize-none"
                  {...register("content")}
                />

                {isOverLimit && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Content exceeds the character limit for this platform
                  </div>
                )}

                {errors.content && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.content.message}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmit(onSaveChanges)}
                  disabled={isSaving || !content.trim() || isOverLimit}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("media")}
                >
                  Continue to Media
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Preview</Label>
              <PostPreview
                content={content}
                mediaFiles={mediaFiles}
                selectedPlatforms={[post.platform]}
                profileName={selectedProfile.name || "Your Profile"}
                profileUsername={
                  selectedProfile.platformUsername || "username"
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Edit Media
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Update images or videos for your post.
              </p>
            </div>

            <MediaUpload
              selectedPlatforms={[post.platform]}
              onMediaChange={setMediaFiles}
            />

            <div className="flex items-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setActiveTab("content")}
              >
                Back to Content
              </Button>
              <Button
                onClick={handleSubmit(onSaveChanges)}
                disabled={
                  isSaving || mediaFiles.some((f) => f.uploading)
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <ScheduleForm
            content={content}
            profiles={post ? [post.profile] : []}
            mediaFiles={mediaFiles}
            onSchedule={onSchedulePost}
            onBack={() => setActiveTab("media")}
            isSubmitting={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

