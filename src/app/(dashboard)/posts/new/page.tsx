"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
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
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload } from "@/components/post/MediaUpload";
import { PostPreview } from "@/components/post/PostPreview";
import { ScheduleForm } from "@/components/post/ScheduleForm";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
  isActive: boolean;
}

const PLATFORM_LIMITS: Record<Platform, number> = {
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  TWITTER: 280,
  TIKTOK: 2200,
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
};

const postSchema = z.object({
  content: z.string().min(1, "Content is required").max(63206, "Content is too long"),
  profileIds: z
    .array(z.string())
    .min(1, "Please select at least one profile to post to"),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function NewPostPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [activeTab, setActiveTab] = useState("content");
  const [isSaving, setIsSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [postFormat, setPostFormat] = useState<"POST" | "REEL">("POST");

  // Wrapper to log media changes - memoized to prevent unnecessary re-renders
  const handleMediaChange = useCallback((files: any[]) => {
    console.log("[NewPost] handleMediaChange called with files:", files);
    console.log("[NewPost] Files with URLs:", files.filter(f => f.url).map(f => ({ id: f.id, url: f.url })));
    setMediaFiles(files);
  }, []);

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
      profileIds: [],
    },
  });

  const content = watch("content");
  const selectedProfileIds = watch("profileIds");

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch("/api/profiles");
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.profiles.filter((p: Profile) => p.isActive));
        }
      } catch (error) {
        console.error("Failed to load profiles:", error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    void fetchProfiles();
  }, []);

  const selectedProfiles = profiles.filter((p) =>
    selectedProfileIds.includes(p.id),
  );

  const getCharacterLimit = () => {
    if (selectedProfiles.length === 0) return PLATFORM_LIMITS.FACEBOOK;
    return Math.min(...selectedProfiles.map((p) => PLATFORM_LIMITS[p.platform]));
  };

  const characterLimit = getCharacterLimit();
  const characterCount = content.length;
  const isOverLimit = characterCount > characterLimit;

  const handleProfileToggle = (profileId: string) => {
    const current = selectedProfileIds;
    if (current.includes(profileId)) {
      setValue(
        "profileIds",
        current.filter((id) => id !== profileId),
      );
    } else {
      setValue("profileIds", [...current, profileId]);
    }
  };

  const onSaveDraft = async (data: PostFormValues) => {
    setIsSaving(true);
    try {
      // Check if any media is still uploading
      const uploadingFiles = mediaFiles.filter((f) => f.uploading);
      if (uploadingFiles.length > 0) {
        alert("Please wait for media uploads to complete before saving.");
        setIsSaving(false);
        return;
      }

      // Check if there are media files with errors
      const errorFiles = mediaFiles.filter((f) => f.error);
      if (errorFiles.length > 0) {
        alert("Some media files failed to upload. Please remove them or try again.");
        setIsSaving(false);
        return;
      }

      // Validate Reel requirements
      if (postFormat === "REEL") {
        const videoFiles = mediaFiles.filter((f) => f.type === "video");
        if (videoFiles.length === 0) {
          alert("Reels require at least one video file. Please upload a video.");
          setIsSaving(false);
          return;
        }
        if (videoFiles.length > 1) {
          alert("Reels can only have one video. Please remove extra videos.");
          setIsSaving(false);
          return;
        }
        if (mediaFiles.some((f) => f.type === "image")) {
          alert("Reels cannot include images. Please remove images or switch to Post format.");
          setIsSaving(false);
          return;
        }
      }

      const mediaUrls = mediaFiles
        .filter((f) => f.url)
        .map((f) => f.url as string);

      console.log("[NewPost] Saving draft - mediaFiles:", mediaFiles);
      console.log("[NewPost] Saving draft - mediaUrls:", mediaUrls);

      // Only set mediaType if there are actual media URLs
      const mediaType = mediaUrls.length > 0
        ? (mediaFiles.some((f) => f.type === "video") ? "VIDEO" : mediaUrls.length > 1 ? "CAROUSEL" : "IMAGE")
        : undefined;

      await axios.post("/api/posts", {
        content: data.content,
        profileIds: data.profileIds,
        mediaUrls,
        mediaType,
        status: "DRAFT",
      });

      router.push("/posts");
    } catch (error: any) {
      console.error("Failed to save draft:", error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || error.message || "Failed to save draft";
      const errorDetails = error.response?.data?.details || "";
      const errorHint = error.response?.data?.hint || "";
      
      const fullMessage = [
        errorMessage,
        errorDetails && `Details: ${errorDetails}`,
        errorHint && `Hint: ${errorHint}`
      ].filter(Boolean).join("\n");
      
      alert(fullMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const onSchedulePost = async (scheduledAt: Date | null) => {
    setIsSaving(true);
    try {
      // Check if any media is still uploading
      const uploadingFiles = mediaFiles.filter((f) => f.uploading);
      if (uploadingFiles.length > 0) {
        alert("Please wait for media uploads to complete before publishing.");
        setIsSaving(false);
        return;
      }

      // Check if there are media files with errors
      const errorFiles = mediaFiles.filter((f) => f.error);
      if (errorFiles.length > 0) {
        alert("Some media files failed to upload. Please remove them or try again.");
        setIsSaving(false);
        return;
      }

      // Validate Reel requirements
      if (postFormat === "REEL") {
        const videoFiles = mediaFiles.filter((f) => f.type === "video");
        if (videoFiles.length === 0) {
          alert("Reels require at least one video file. Please upload a video.");
          setIsSaving(false);
          return;
        }
        if (videoFiles.length > 1) {
          alert("Reels can only have one video. Please remove extra videos.");
          setIsSaving(false);
          return;
        }
        if (mediaFiles.some((f) => f.type === "image")) {
          alert("Reels cannot include images. Please remove images or switch to Post format.");
          setIsSaving(false);
          return;
        }
      }

      const mediaUrls = mediaFiles
        .filter((f) => f.url)
        .map((f) => f.url as string);

      console.log("[NewPost] Scheduling post - mediaFiles:", mediaFiles);
      console.log("[NewPost] Scheduling post - mediaUrls:", mediaUrls);

      // Only set mediaType if there are actual media URLs
      const mediaType = mediaUrls.length > 0
        ? (mediaFiles.some((f) => f.type === "video") ? "VIDEO" : mediaUrls.length > 1 ? "CAROUSEL" : "IMAGE")
        : undefined;

      const status = scheduledAt ? "SCHEDULED" : "PUBLISHED";

      const response = await axios.post("/api/posts", {
        content,
        profileIds: selectedProfileIds,
        mediaUrls,
        mediaType,
        postFormat,
        status,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
      });

      // Check queue status
      const queueStatus = response.data.queueStatus;
      if (queueStatus?.error) {
        // Queue failed but post was created
        alert(
          `⚠️ Post Created with Warning\n\n` +
          `${queueStatus.message}\n\n` +
          `${queueStatus.action}\n\n` +
          `Details: ${queueStatus.details}`
        );
      }

      router.push("/posts");
    } catch (error: any) {
      console.error("Failed to schedule post:", error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || error.message || "Failed to schedule post";
      const errorDetails = error.response?.data?.details || "";
      const errorHint = error.response?.data?.hint || "";
      
      const fullMessage = [
        errorMessage,
        errorDetails && `Details: ${errorDetails}`,
        errorHint && `Hint: ${errorHint}`
      ].filter(Boolean).join("\n");
      
      alert(fullMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const onContinue = () => {
    if (!content.trim()) {
      return;
    }
    if (selectedProfileIds.length === 0) {
      return;
    }
    setActiveTab("media");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create New Post
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Compose and schedule content for your social profiles.
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
          <TabsTrigger value="schedule" className="flex items-center gap-2" disabled={!content.trim() || selectedProfileIds.length === 0}>
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="space-y-6">
              {/* Profile Selector */}
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Select Profiles
                  </Label>
                  <span className="text-xs text-zinc-500">
                    {selectedProfileIds.length} selected
                  </span>
                </div>

                {loadingProfiles ? (
                  <div className="py-4 text-center text-sm text-zinc-500">
                    Loading profiles...
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No active profiles found.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push("/profiles")}
                    >
                      Connect a Profile
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((profile) => {
                      const Icon = PLATFORM_INFO[profile.platform].icon;
                      const isSelected = selectedProfileIds.includes(profile.id);

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => handleProfileToggle(profile.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                            isSelected
                              ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full",
                              isSelected
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-100 dark:bg-zinc-800",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                isSelected
                                  ? "text-white dark:text-zinc-900"
                                  : PLATFORM_INFO[profile.platform].color,
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {profile.name || PLATFORM_INFO[profile.platform].name}
                            </div>
                            {profile.platformUsername && (
                              <div className="text-xs text-zinc-500">
                                @{profile.platformUsername}
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border-2",
                              isSelected
                                ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                                : "border-zinc-300 dark:border-zinc-700",
                            )}
                          >
                            {isSelected && (
                              <svg
                                className="h-full w-full text-white dark:text-zinc-900"
                                fill="currentColor"
                                viewBox="0 0 12 12"
                              >
                                <path d="M10 3L4.5 8.5L2 6" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {errors.profileIds && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.profileIds.message}
                  </div>
                )}
              </div>

              {/* Post Format Selector */}
              {selectedProfiles.length > 0 && selectedProfiles.some(p => p.platform === "FACEBOOK" || p.platform === "INSTAGRAM") && (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <Label className="text-base font-semibold">
                    Post Format
                  </Label>
                  <Select
                    value={postFormat}
                    onValueChange={(value: "POST" | "REEL") => {
                      setPostFormat(value);
                      // If switching to REEL and no video, show warning
                      if (value === "REEL" && !mediaFiles.some(f => f.type === "video")) {
                        // Will be validated on submit
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">Post</SelectItem>
                      <SelectItem value="REEL">Reel</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">
                    {postFormat === "REEL" 
                      ? "Reels require a single vertical video (9:16, 15-90 seconds)"
                      : "Regular posts can include text, images, or videos"}
                  </p>
                  {postFormat === "REEL" && mediaFiles.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                      {mediaFiles.some(f => f.type === "video") 
                        ? "✓ Video detected. Make sure it's vertical (9:16) and 15-90 seconds."
                        : "⚠ Reels require a video file. Please upload a video in the Media tab."}
                    </div>
                  )}
                </div>
              )}

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
                    Content exceeds the character limit for selected platforms
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
                  variant="outline"
                  onClick={handleSubmit(onSaveDraft)}
                  disabled={isSaving || !content.trim()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  onClick={onContinue}
                  disabled={
                    !content.trim() ||
                    selectedProfileIds.length === 0 ||
                    isOverLimit
                  }
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
                selectedPlatforms={selectedProfiles.map((p) => p.platform)}
                profileName={selectedProfiles[0]?.name || "Your Profile"}
                profileUsername={selectedProfiles[0]?.platformUsername || "username"}
              />
            </div>
          </div>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Add Media
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Upload images or videos to accompany your post.
              </p>
            </div>

            <MediaUpload
              selectedPlatforms={selectedProfiles.map((p) => p.platform)}
              onMediaChange={handleMediaChange}
            />

            <div className="flex items-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setActiveTab("content")}
              >
                Back to Content
              </Button>
              <Button
                onClick={() => setActiveTab("schedule")}
                disabled={mediaFiles.some(f => f.uploading)}
              >
                Continue to Schedule
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <ScheduleForm
            content={content}
            profiles={selectedProfiles}
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

