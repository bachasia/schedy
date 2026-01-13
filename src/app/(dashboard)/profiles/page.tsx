"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BadgeCheck,
  Clock,
  Plus,
  RefreshCcw,
  Unplug,
  Pencil,
  Facebook,
  Instagram,
  Twitter,
  Video,
  Play,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

import axios from "axios";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectProfileModal } from "@/components/profile/ConnectProfileModal";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { DeleteProfileDialog } from "@/components/profile/DeleteProfileDialog";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "YOUTUBE";

type Profile = {
  id: string;
  userId: string;
  name: string | null;
  platform: Platform;
  platformUserId: string;
  platformUsername: string | null;
  isActive: boolean;
  updatedAt: string;
  tokenExpiresAt?: string | null;
};

type TokenStatus = {
  isValid: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  errorMessage: string | null;
} | null;

type ApiResponse = {
  profiles: Profile[];
};

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TWITTER: "Twitter",
  YOUTUBE: "YouTube",
};

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case "FACEBOOK":
      return <Facebook className="h-3.5 w-3.5 text-blue-600" />;
    case "INSTAGRAM":
      return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
    case "TWITTER":
      return <Twitter className="h-3.5 w-3.5 text-sky-500" />;
    case "TIKTOK":
      return <Video className="h-3.5 w-3.5 text-emerald-500" />;
    case "YOUTUBE":
      return <Play className="h-3.5 w-3.5 text-red-600" />;
    default:
      return null;
  }
}

export default function ProfilesPage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [platformFilter, setPlatformFilter] = useState<Platform | "ALL">(
    "ALL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [tokenStatuses, setTokenStatuses] = useState<Record<string, TokenStatus>>({});
  const [checkingToken, setCheckingToken] = useState<string | null>(null);

  // Check if user can add profiles (ADMIN or MANAGER only)
  const canAddProfile = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  const filteredProfiles = useMemo(() => {
    if (platformFilter === "ALL") return profiles;
    return profiles.filter((p) => p.platform === platformFilter);
  }, [profiles, platformFilter]);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load profiles");
      }
      const data: ApiResponse = await res.json();
      setProfiles(
        data.profiles.map((p) => ({
          ...p,
          updatedAt: p.updatedAt,
        })),
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfiles();
  }, []);

  const handleAddProfile = () => {
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    void fetchProfiles();
  };

  const handleEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditModalOpen(true);
  };

  const handleDelete = (profile: Profile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const handleEditSuccess = () => {
    void fetchProfiles();
    setSelectedProfile(null);
  };

  const handleDeleteSuccess = () => {
    void fetchProfiles();
    setSelectedProfile(null);
  };

  const checkTokenStatus = async (profileId: string) => {
    setCheckingToken(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/check-token`);
      const data = await res.json();

      if (res.ok && data.tokenStatus) {
        setTokenStatuses(prev => ({
          ...prev,
          [profileId]: data.tokenStatus
        }));
      }
    } catch (error) {
      console.error("Failed to check token:", error);
    } finally {
      setCheckingToken(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profiles
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Manage your connected social profiles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchProfiles()}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          {canAddProfile && (
            <Button size="sm" onClick={handleAddProfile}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Profile
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip
          label="All"
          active={platformFilter === "ALL"}
          onClick={() => setPlatformFilter("ALL")}
        />
        {(["FACEBOOK", "INSTAGRAM", "TIKTOK", "TWITTER", "YOUTUBE"] as Platform[]).map(
          (platform) => (
            <FilterChip
              key={platform}
              label={PLATFORM_LABELS[platform]}
              active={platformFilter === platform}
              onClick={() => setPlatformFilter(platform)}
            />
          ),
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5 animate-spin" />
          <span>Loading profiles...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchProfiles()}
          >
            Retry
          </Button>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <BadgeCheck className="mb-2 h-5 w-5 text-zinc-400" />
          <p className="mb-1.5 font-medium text-sm">No profiles yet</p>
          <p className="mb-3 max-w-sm text-xs text-zinc-500">
            {canAddProfile
              ? "Connect your social media profiles to start scheduling and publishing content."
              : "No profiles have been assigned to you yet. Contact your administrator to get access to social media profiles."}
          </p>
          {canAddProfile && (
            <Button size="sm" onClick={handleAddProfile}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add your first profile
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
            >
              {/* Header with icon and name */}
              <div className="mb-3 flex items-start gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <PlatformIcon platform={profile.platform} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {profile.name || PLATFORM_LABELS[profile.platform]}
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    {PLATFORM_LABELS[profile.platform]}
                  </p>
                </div>
                {/* Status badge */}
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-medium",
                    profile.isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  <span className="mr-1 h-1 w-1 rounded-full bg-current" />
                  {profile.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Username */}
              <div className="mb-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Username
                </p>
                <p className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {profile.platformUsername ? (
                    <span>@{profile.platformUsername}</span>
                  ) : (
                    <span className="text-zinc-400">No username</span>
                  )}
                </p>
              </div>

              {/* Token Status */}
              {tokenStatuses[profile.id] && (
                <div className="mb-3">
                  {tokenStatuses[profile.id]?.isValid ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Token Valid</span>
                      {tokenStatuses[profile.id]?.daysUntilExpiry !== null && (
                        <span className="text-zinc-500">
                          ({tokenStatuses[profile.id]?.daysUntilExpiry}d left)
                        </span>
                      )}
                    </div>
                  ) : tokenStatuses[profile.id]?.isExpired ? (
                    <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3 w-3" />
                      <span>Token Expired - Reconnect</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Token Invalid - Reconnect</span>
                    </div>
                  )}
                </div>
              )}

              {/* Last updated */}
              <div className="mb-3 flex items-center gap-1 text-[10px] text-zinc-500">
                <Clock className="h-2.5 w-2.5" />
                <span>
                  {new Date(profile.updatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() => checkTokenStatus(profile.id)}
                    disabled={checkingToken === profile.id}
                  >
                    {checkingToken === profile.id ? (
                      <>
                        <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Check Token
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() => handleEdit(profile)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() => handleDelete(profile)}
                  >
                    <Unplug className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectProfileModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleModalSuccess}
      />

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        profile={selectedProfile}
        onSuccess={handleEditSuccess}
      />

      <DeleteProfileDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        profile={selectedProfile}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
      )}
    >
      {label}
    </button>
  );
}


