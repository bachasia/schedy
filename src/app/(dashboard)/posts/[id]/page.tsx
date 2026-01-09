"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Facebook,
  Instagram,
  Twitter,
  Video,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { PostPreview } from "@/components/post/PostPreview";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "YOUTUBE";
type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface Post {
  id: string;
  content: string;
  mediaUrls: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL";
  postFormat?: "POST" | "REEL" | "SHORT" | "STORY";
  status: PostStatus;
  platform: Platform;
  scheduledAt: string | null;
  publishedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  platformPostId: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    name: string | null;
    platform: Platform;
    platformUsername: string | null;
  };
}

const STATUS_INFO: Record<PostStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  DRAFT: { label: "Draft", icon: FileText, color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800" },
  SCHEDULED: { label: "Scheduled", icon: Calendar, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
  PUBLISHING: { label: "Publishing", icon: Clock, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
  PUBLISHED: { label: "Published", icon: CheckCircle2, color: "text-green-600 bg-green-50 dark:bg-green-950/40" },
  FAILED: { label: "Failed", icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
};

const PLATFORM_INFO: Record<Platform, { name: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  FACEBOOK: { name: "Facebook", icon: Facebook, color: "text-blue-600" },
  INSTAGRAM: { name: "Instagram", icon: Instagram, color: "text-pink-500" },
  TWITTER: { name: "Twitter", icon: Twitter, color: "text-sky-500" },
  TIKTOK: { name: "TikTok", icon: Video, color: "text-emerald-500" },
  YOUTUBE: { name: "YouTube", icon: Play, color: "text-red-600" },
};

// Generate social media post URL
function getPostUrl(
  platform: Platform,
  platformPostId: string,
  username?: string,
  metadata?: any,
  postFormat?: "POST" | "REEL" | "SHORT" | "STORY",
): string {
  switch (platform) {
    case "FACEBOOK":
      return `https://www.facebook.com/${platformPostId}`;
    case "INSTAGRAM":
      // Use shortcode from metadata if available, otherwise use platformPostId
      const shortcode = metadata?.shortcode || platformPostId;
      // Check if it's a Reel based on postFormat or media_type
      const isReel = postFormat === "REEL" || metadata?.media_type === "REELS";
      return isReel
        ? `https://www.instagram.com/reel/${shortcode}/`
        : `https://www.instagram.com/p/${shortcode}/`;
    case "TWITTER":
      return username
        ? `https://twitter.com/${username}/status/${platformPostId}`
        : `https://twitter.com/i/web/status/${platformPostId}`;
    case "TIKTOK":
      return username
        ? `https://www.tiktok.com/@${username}/video/${platformPostId}`
        : `https://www.tiktok.com/`;
    case "YOUTUBE":
      // YouTube video URL format: https://www.youtube.com/watch?v={video-id}
      return `https://www.youtube.com/watch?v=${platformPostId}`;
    default:
      return "#";
  }
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        setPost(res.data.post);
      } catch (error) {
        console.error("Failed to fetch post:", error);
        router.push("/posts");
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      void fetchPost();
    }
  }, [postId, router]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/posts/${postId}`);
      router.push("/posts");
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="py-12 text-center text-sm text-zinc-500">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">Post not found</p>
          <Button className="mt-4" onClick={() => router.push("/posts")}>
            Go to Posts
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_INFO[post.status].icon;
  const PlatformIcon = PLATFORM_INFO[post.platform].icon;
  // Handle mediaUrls as either string (from database) or array (from API)
  const mediaUrls = typeof post.mediaUrls === 'string'
    ? (post.mediaUrls ? post.mediaUrls.split(",").filter(Boolean) : [])
    : (post.mediaUrls || []);
  const mediaFiles = mediaUrls.map((url, idx) => ({
    id: `media-${idx}`,
    preview: url,
    url,
    type: (url.includes("video") || post.mediaType === "VIDEO" ? "video" : "image") as "image" | "video",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Post Details
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              View and manage your post
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.status === "PUBLISHED" && post.platformPostId && (
            <Button
              variant="outline"
              onClick={() => {
                const url = getPostUrl(
                  post.platform,
                  post.platformPostId!,
                  post.profile.platformUsername || undefined,
                  post.metadata,
                  post.postFormat
                );
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on {PLATFORM_INFO[post.platform].name}
            </Button>
          )}
          {post.status !== "PUBLISHED" && (
            <Button
              variant="outline"
              onClick={() => router.push(`/posts/${post.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status and Platform Info */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <PlatformIcon className={cn("h-5 w-5", PLATFORM_INFO[post.platform].color)} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {PLATFORM_INFO[post.platform].name}
            </p>
            <p className="text-xs text-zinc-500">
              {post.profile.name || post.profile.platformUsername || "Profile"}
              {post.profile.platformUsername && ` (@${post.profile.platformUsername})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              STATUS_INFO[post.status].color,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {STATUS_INFO[post.status].label}
          </span>
        </div>
      </div>

      {/* Post Preview */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Post Preview
        </h2>
        <PostPreview
          content={post.content}
          mediaFiles={mediaFiles}
          selectedPlatforms={[post.platform]}
          profileName={post.profile.name || undefined}
          profileUsername={post.profile.platformUsername || undefined}
        />
      </div>

      {/* Post Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Content
            </h3>
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {post.content || <span className="text-zinc-400 italic">No content</span>}
            </p>
            {post.mediaType && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <ImageIcon className="h-3 w-3" />
                <span>
                  {post.mediaType === "CAROUSEL" && `${mediaUrls.length} images`}
                  {post.mediaType === "IMAGE" && "1 image"}
                  {post.mediaType === "VIDEO" && "1 video"}
                </span>
              </div>
            )}
          </div>

          {/* Error Message (if failed) */}
          {post.status === "FAILED" && post.errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                Error Message
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{post.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Created:</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              {post.scheduledAt && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Scheduled:</span>
                  <span>{new Date(post.scheduledAt).toLocaleString()}</span>
                </div>
              )}
              {post.publishedAt && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Published:</span>
                  <span>{new Date(post.publishedAt).toLocaleString()}</span>
                </div>
              )}
              {post.failedAt && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Failed:</span>
                  <span>{new Date(post.failedAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Last Updated:</span>
                <span>{new Date(post.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Platform Post ID */}
          {post.platformPostId && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Platform Post ID
              </h3>
              <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {post.platformPostId}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-2 text-lg font-semibold">Delete Post</h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void handleDelete();
                  setDeleteDialogOpen(false);
                }}
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


