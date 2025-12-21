"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  XCircle,
  Edit,
  Trash2,
  Facebook,
  Instagram,
  Twitter,
  Video,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";
type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface Post {
  id: string;
  content: string;
  mediaUrls?: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";
  status: PostStatus;
  platform: Platform;
  scheduledAt: string | null;
  publishedAt: string | null;
  platformPostId: string | null;
  metadata?: any;
  postFormat?: "POST" | "REEL" | "SHORT" | "STORY";
  createdAt: string;
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
      // Facebook post URL format: https://www.facebook.com/{page-id}/posts/{post-id}
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
      // Twitter post URL format: https://twitter.com/{username}/status/{tweet-id}
      return username 
        ? `https://twitter.com/${username}/status/${platformPostId}`
        : `https://twitter.com/i/web/status/${platformPostId}`;
    case "TIKTOK":
      // TikTok post URL format: https://www.tiktok.com/@{username}/video/{video-id}
      return username
        ? `https://www.tiktok.com/@${username}/video/${platformPostId}`
        : `https://www.tiktok.com/`;
    default:
      return "#";
  }
}

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "ALL">("ALL");
  const [platformFilter, setPlatformFilter] = useState<Platform | "ALL">("ALL");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter !== "ALL" && post.status !== statusFilter) return false;
      if (platformFilter !== "ALL" && post.platform !== platformFilter) return false;
      return true;
    });
  }, [posts, statusFilter, platformFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/posts");
      setPosts(res.data.posts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/posts/${id}`);
      setPosts(posts.filter((p) => p.id !== id));
      setDeleteDialogId(null);
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Posts
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Manage your scheduled and published content.
          </p>
        </div>
        <Button onClick={() => router.push("/posts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      {posts.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <button
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                statusFilter === "ALL"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              All
            </button>
            {(["DRAFT", "SCHEDULED", "PUBLISHED"] as PostStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  statusFilter === status
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
                )}
              >
                {STATUS_INFO[status].label}
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPlatformFilter("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                platformFilter === "ALL"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              All Platforms
            </button>
            {(["FACEBOOK", "INSTAGRAM", "TWITTER", "TIKTOK"] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  platformFilter === platform
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
                )}
              >
                {PLATFORM_INFO[platform].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Loading posts...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
            <Plus className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {posts.length === 0 ? "No posts yet" : "No posts match your filters"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            {posts.length === 0
              ? "Get started by creating your first post."
              : "Try adjusting your filters to see more posts."}
          </p>
          {posts.length === 0 && (
            <Button className="mt-6" onClick={() => router.push("/posts/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Post
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const StatusIcon = STATUS_INFO[post.status].icon;
            const PlatformIcon = PLATFORM_INFO[post.platform].icon;
            const mediaUrls = post.mediaUrls ? post.mediaUrls.split(",").filter(Boolean) : [];
            const firstMediaUrl = mediaUrls[0];
            const isVideo = post.mediaType === "VIDEO" || (firstMediaUrl && firstMediaUrl.includes("video"));

            return (
              <div
                key={post.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start gap-4">
                  {/* Platform Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <PlatformIcon className={cn("h-5 w-5", PLATFORM_INFO[post.platform].color)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Status & Platform */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                          STATUS_INFO[post.status].color,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_INFO[post.status].label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {PLATFORM_INFO[post.platform].name}
                      </span>
                      {post.profile.platformUsername && (
                        <span className="text-xs text-zinc-500">
                          @{post.profile.platformUsername}
                        </span>
                      )}
                    </div>

                    {/* Content Preview */}
                    <p className="mb-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {post.content}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      {post.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.scheduledAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Published {new Date(post.publishedAt).toLocaleDateString()}
                          {post.platformPostId && (
                            <button
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
                              className="ml-1 inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                            >
                              View
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </span>
                      )}
                      {!post.scheduledAt && !post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {firstMediaUrl && (
                    <div className="flex-shrink-0">
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                        {isVideo ? (
                          <>
                            <video
                              src={firstMediaUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <img
                            src={firstMediaUrl}
                            alt="Post thumbnail"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="flex h-full w-full items-center justify-center"><svg class="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>`;
                              }
                            }}
                          />
                        )}
                        {post.mediaType === "CAROUSEL" && mediaUrls.length > 1 && (
                          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                            +{mediaUrls.length - 1}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {post.status === "PUBLISHED" && post.platformPostId && (
                      <Button
                        variant="outline"
                        size="sm"
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
                        title="View on social media"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/posts/${post.id}`)}
                      title="View post details"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    {post.status !== "PUBLISHED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/posts/${post.id}/edit`)}
                        title="Edit post"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialogId(post.id)}
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-2 text-lg font-semibold">Delete Post</h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogId(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDelete(deleteDialogId)}
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

