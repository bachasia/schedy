"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  Pause,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

interface Job {
  id: string;
  data: {
    postId: string;
    userId: string;
  };
  attemptsMade?: number;
  processedOn?: number;
  finishedOn?: number;
  timestamp?: number;
  delay?: number;
  failedReason?: string;
  stacktrace?: string[];
}

interface QueueData {
  stats: QueueStats;
  jobs: {
    waiting: Job[];
    active: Job[];
    completed: Job[];
    failed: Job[];
    delayed: Job[];
  };
  timestamp: string;
}

export default function QueueAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchQueueStats = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/queue-stats", { cache: "no-store" });
      
      if (!res.ok) {
        throw new Error("Failed to fetch queue stats");
      }

      const data = await res.json();
      setData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load queue statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQueueStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void fetchQueueStats();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error || "Failed to load queue data"}
        </p>
        <Button onClick={() => void fetchQueueStats()}>Retry</Button>
      </div>
    );
  }

  const { stats, jobs, timestamp } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Queue Management
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Monitor post publishing queue and job status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Auto-Refresh
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchQueueStats()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Delayed"
          value={stats.delayed}
          icon={Clock}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          label="Waiting"
          value={stats.waiting}
          icon={Loader2}
          color="text-yellow-600"
          bgColor="bg-yellow-50 dark:bg-yellow-950/20"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={Activity}
          color="text-orange-600"
          bgColor="bg-orange-50 dark:bg-orange-950/20"
          animated
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-950/20"
        />
      </div>

      {/* Last Updated */}
      <div className="text-xs text-zinc-500">
        Last updated: {new Date(timestamp).toLocaleString()}
        {autoRefresh && " (auto-refreshing every 5s)"}
      </div>

      {/* Job Lists */}
      <div className="space-y-4">
        {stats.delayed > 0 && (
          <JobList
            title="Scheduled Posts"
            jobs={jobs.delayed}
            emptyMessage="No scheduled posts"
            icon={Clock}
            iconColor="text-blue-600"
          />
        )}

        {stats.active > 0 && (
          <JobList
            title="Publishing Now"
            jobs={jobs.active}
            emptyMessage="No active jobs"
            icon={Activity}
            iconColor="text-orange-600"
          />
        )}

        {stats.failed > 0 && (
          <JobList
            title="Failed Posts"
            jobs={jobs.failed}
            emptyMessage="No failed jobs"
            icon={AlertTriangle}
            iconColor="text-red-600"
            showRetry
          />
        )}

        {stats.completed > 0 && jobs.completed.length > 0 && (
          <JobList
            title="Recently Published"
            jobs={jobs.completed.slice(0, 5)}
            emptyMessage="No completed jobs"
            icon={CheckCircle2}
            iconColor="text-green-600"
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  animated = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  animated?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className={cn("rounded-full p-2", bgColor)}>
          <Icon className={cn("h-5 w-5", color, animated && "animate-spin")} />
        </div>
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {value}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
}

function JobList({
  title,
  jobs,
  emptyMessage,
  icon: Icon,
  iconColor,
  showRetry = false,
}: {
  title: string;
  jobs: Job[];
  emptyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  showRetry?: boolean;
}) {
  const router = useRouter();

  const handleRetry = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/retry`, { method: "POST" });
      if (res.ok) {
        alert("Post queued for retry!");
        router.refresh();
      } else {
        alert("Failed to retry post");
      }
    } catch (error) {
      console.error(error);
      alert("Error retrying post");
    }
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconColor)} />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <span className="text-sm text-zinc-500">({jobs.length})</span>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex-1">
              <div className="font-mono text-xs text-zinc-500">
                Post ID: {job.data.postId}
              </div>
              {job.delay !== undefined && job.delay > 0 && (
                <div className="mt-1 text-xs text-zinc-400">
                  Scheduled for:{" "}
                  {new Date(
                    (job.timestamp || Date.now()) + job.delay,
                  ).toLocaleString()}
                </div>
              )}
              {job.finishedOn && (
                <div className="mt-1 text-xs text-zinc-400">
                  Completed: {new Date(job.finishedOn).toLocaleString()}
                </div>
              )}
              {job.failedReason && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Error: {job.failedReason}
                </div>
              )}
              {job.attemptsMade !== undefined && job.attemptsMade > 0 && (
                <div className="mt-1 text-xs text-zinc-400">
                  Attempts: {job.attemptsMade}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/posts/${job.data.postId}/edit`)}
              >
                View
              </Button>
              {showRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetry(job.data.postId)}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}






