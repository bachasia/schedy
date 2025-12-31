"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "YOUTUBE";
type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
}

interface Post {
  id: string;
  content: string;
  status: PostStatus;
  platform: Platform;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  profile: Profile;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Post;
}

// Setup the localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Platform colors
const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; border: string }> = {
  FACEBOOK: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  INSTAGRAM: {
    bg: "bg-pink-50 dark:bg-pink-950/20",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  TWITTER: {
    bg: "bg-sky-50 dark:bg-sky-950/20",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  TIKTOK: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  YOUTUBE: {
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
};

export default function SchedulePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<PostStatus[]>(["SCHEDULED"]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, []);

  // Get unique profiles
  const profiles = useMemo(() => {
    const uniqueProfiles = new Map<string, Profile>();
    posts.forEach((post) => {
      if (!uniqueProfiles.has(post.profile.id)) {
        uniqueProfiles.set(post.profile.id, post.profile);
      }
    });
    return Array.from(uniqueProfiles.values());
  }, [posts]);

  // Filter and transform posts to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return posts
      .filter((post) => {
        // Filter by status
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(post.status)) {
          return false;
        }

        // Filter by platform
        if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(post.platform)) {
          return false;
        }

        // Filter by profile
        if (selectedProfiles.length > 0 && !selectedProfiles.includes(post.profile.id)) {
          return false;
        }

        // Only show posts with dates
        return post.scheduledAt || post.publishedAt;
      })
      .map((post) => {
        const dateStr = post.scheduledAt || post.publishedAt;
        if (!dateStr) return null;

        const date = new Date(dateStr);
        const endDate = new Date(date.getTime() + 30 * 60 * 1000); // 30 minutes duration

        return {
          id: post.id,
          title: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
          start: date,
          end: endDate,
          resource: post,
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  }, [posts, selectedPlatforms, selectedStatuses, selectedProfiles]);

  // Handle event click
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(`/posts/${event.id}/edit`);
    },
    [router],
  );

  // Custom event style
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const platform = event.resource.platform;
    const colors = PLATFORM_COLORS[platform];

    return {
      className: cn(
        "rounded-md border px-2 py-1 text-xs font-medium",
        colors.bg,
        colors.text,
        colors.border,
      ),
    };
  }, []);

  // Toggle filter
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const toggleStatus = (status: PostStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const toggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId) ? prev.filter((p) => p !== profileId) : [...prev, profileId],
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedPlatforms([]);
    setSelectedStatuses(["SCHEDULED"]);
    setSelectedProfiles([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Schedule Calendar
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            View and manage your scheduled posts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchPosts()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => router.push("/posts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(["SCHEDULED", "PUBLISHED", "FAILED"] as PostStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    selectedStatuses.includes(status)
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {(["FACEBOOK", "INSTAGRAM", "TWITTER", "TIKTOK", "YOUTUBE"] as Platform[]).map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    selectedPlatforms.includes(platform)
                      ? cn(
                          "border-current",
                          PLATFORM_COLORS[platform].bg,
                          PLATFORM_COLORS[platform].text,
                        )
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Filter */}
          {profiles.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Profile
              </label>
              <div className="flex flex-wrap gap-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => toggleProfile(profile.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      selectedProfiles.includes(profile.id)
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
                    )}
                  >
                    {profile.name || profile.platformUsername || profile.platform}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Count */}
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing {events.length} of {posts.length} posts
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Legend:</span>
        {(Object.keys(PLATFORM_COLORS) as Platform[]).map((platform) => (
          <div key={platform} className="flex items-center gap-2">
            <div
              className={cn(
                "h-3 w-3 rounded-full border",
                PLATFORM_COLORS[platform].bg,
                PLATFORM_COLORS[platform].border,
              )}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{platform}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? (
          <div className="flex h-[600px] items-center justify-center">
            <div className="text-sm text-zinc-500">Loading calendar...</div>
          </div>
        ) : (
          <div className="calendar-container h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={["month", "week", "day", "agenda"]}
              toolbar={true}
              popup={true}
              style={{ height: "100%" }}
              components={{
                toolbar: (props) => <CustomToolbar {...props} />,
              }}
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <CalendarIcon className="mb-4 h-12 w-12 text-zinc-400" />
          <p className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">No posts to display</p>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {posts.length === 0
              ? "Create your first scheduled post to see it here."
              : "No posts match the current filters."}
          </p>
          {posts.length === 0 ? (
            <Button onClick={() => router.push("/posts/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          ) : (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Custom toolbar component
function CustomToolbar({ label, onNavigate, onView, view }: any) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate("TODAY")}>
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
      </div>

      {/* View Selector */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {["month", "week", "day", "agenda"].map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium capitalize transition",
              view === v
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

