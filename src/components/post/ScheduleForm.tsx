"use client";

import { useState, useMemo } from "react";
import { format, addMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Globe, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface Profile {
  id: string;
  name: string | null;
  platform: Platform;
  platformUsername: string | null;
}

interface MediaFile {
  id: string;
  type: "image" | "video";
  url?: string;
}

interface ScheduleFormProps {
  content: string;
  profiles: Profile[];
  mediaFiles: MediaFile[];
  onSchedule: (scheduledAt: Date | null) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export function ScheduleForm({
  content,
  profiles,
  mediaFiles,
  onSchedule,
  onBack,
  isSubmitting = false,
}: ScheduleFormProps) {
  const [scheduleType, setScheduleType] = useState<"now" | "later">("later");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timezone, setTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get minimum date (today)
  const minDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Get minimum time (current time + 5 minutes if today)
  const minTime = useMemo(() => {
    if (selectedDate === minDate) {
      const now = new Date();
      const minDateTime = addMinutes(now, 5);
      return format(minDateTime, "HH:mm");
    }
    return "00:00";
  }, [selectedDate, minDate]);

  // Validate scheduled time
  const scheduledDateTime = useMemo(() => {
    if (scheduleType === "now" || !selectedDate || !selectedTime) {
      return null;
    }

    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      const minAllowed = addMinutes(now, 5);

      if (isBefore(dateTime, minAllowed)) {
        return null; // Invalid: past date
      }

      return dateTime;
    } catch {
      return null;
    }
  }, [scheduleType, selectedDate, selectedTime]);

  const isValid =
    scheduleType === "now" ||
    (scheduleType === "later" && scheduledDateTime !== null);

  const handleSchedule = () => {
    if (scheduleType === "now") {
      setShowConfirmation(true);
    } else if (scheduledDateTime) {
      setShowConfirmation(true);
    }
  };

  const handleConfirm = () => {
    if (scheduleType === "now") {
      onSchedule(null);
    } else if (scheduledDateTime) {
      onSchedule(scheduledDateTime);
    }
  };

  const imageCount = mediaFiles.filter((f) => f.type === "image").length;
  const videoCount = mediaFiles.filter((f) => f.type === "video").length;

  return (
    <div className="space-y-6">
      {/* Schedule Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">When to publish?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setScheduleType("now")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
              scheduleType === "now"
                ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  scheduleType === "now"
                    ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                    : "border-zinc-300 dark:border-zinc-700",
                )}
              >
                {scheduleType === "now" && (
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-zinc-900" />
                )}
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                Post Immediately
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Publish your post right away to all selected profiles.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setScheduleType("later")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
              scheduleType === "later"
                ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  scheduleType === "later"
                    ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                    : "border-zinc-300 dark:border-zinc-700",
                )}
              >
                {scheduleType === "later" && (
                  <div className="h-2 w-2 rounded-full bg-white dark:bg-zinc-900" />
                )}
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                Schedule for Later
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Choose a specific date and time to publish your post.
            </p>
          </button>
        </div>
      </div>

      {/* Date/Time Picker (only show if scheduling for later) */}
      {scheduleType === "later" && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                min={minTime}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Timezone Selector */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone
            </Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Messages */}
          {selectedDate && selectedTime && !scheduledDateTime && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>
                Scheduled time must be at least 5 minutes in the future.
              </span>
            </div>
          )}

          {scheduledDateTime && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Scheduled for{" "}
                {format(scheduledDateTime, "MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Review Section */}
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Review Your Post
        </h3>

        <div className="space-y-2 text-sm">
          {/* Profiles */}
          <div className="flex items-start gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Profiles:
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} (
              {profiles.map((p) => p.name || p.platform).join(", ")})
            </span>
          </div>

          {/* Content Preview */}
          <div className="flex items-start gap-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Content:
            </span>
            <span className="line-clamp-2 text-zinc-600 dark:text-zinc-400">
              {content}
            </span>
          </div>

          {/* Media */}
          {mediaFiles.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Media:
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {imageCount > 0 && `${imageCount} image${imageCount !== 1 ? "s" : ""}`}
                {imageCount > 0 && videoCount > 0 && ", "}
                {videoCount > 0 && `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
              </span>
            </div>
          )}

          {/* Scheduled Time */}
          {scheduleType === "later" && scheduledDateTime && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Scheduled:
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {format(scheduledDateTime, "MMMM d, yyyy 'at' h:mm a")} ({timezone})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back to Media
        </Button>
        <Button onClick={handleSchedule} disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? "Scheduling..."
            : scheduleType === "now"
              ? "Post Now"
              : "Schedule Post"}
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-2 text-lg font-semibold">
              {scheduleType === "now" ? "Post Immediately?" : "Schedule Post?"}
            </h3>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {scheduleType === "now"
                ? `Your post will be published immediately to ${profiles.length} profile${profiles.length !== 1 ? "s" : ""}.`
                : `Your post will be scheduled for ${scheduledDateTime ? format(scheduledDateTime, "MMMM d, yyyy 'at' h:mm a") : ""}.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






