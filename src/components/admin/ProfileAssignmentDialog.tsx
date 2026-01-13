"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, CheckSquare, Square, Facebook, Instagram, Twitter, Youtube, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Profile {
    id: string;
    name: string | null;
    platform: string;
    platformUsername: string | null;
    isActive: boolean;
}

interface AssignedProfile extends Profile {
    assignedAt: string;
}

interface ProfileAssignmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    } | null;
}

const PLATFORM_COLORS = {
    FACEBOOK: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    INSTAGRAM:
        "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    TIKTOK:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    TWITTER:
        "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    YOUTUBE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PLATFORM_ICONS = {
    FACEBOOK: Facebook,
    INSTAGRAM: Instagram,
    TIKTOK: Music,
    TWITTER: Twitter,
    YOUTUBE: Youtube,
};

export function ProfileAssignmentDialog({
    open,
    onClose,
    onSuccess,
    user,
}: ProfileAssignmentDialogProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [assignedProfiles, setAssignedProfiles] = useState<AssignedProfile[]>(
        []
    );
    const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
        new Set()
    );

    // Fetch all profiles and assigned profiles
    useEffect(() => {
        if (open && user) {
            fetchData();
        }
    }, [open, user]);

    const fetchData = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch all profiles
            const profilesRes = await fetch("/api/profiles");
            if (!profilesRes.ok) throw new Error("Failed to fetch profiles");
            const profilesData = await profilesRes.json();

            // Fetch assigned profiles
            const assignedRes = await fetch(`/api/admin/users/${user.id}/profiles`);
            if (!assignedRes.ok) throw new Error("Failed to fetch assignments");
            const assignedData = await assignedRes.json();

            setAllProfiles(profilesData.profiles || []);
            setAssignedProfiles(assignedData.assignedProfiles || []);

            // Initialize selected IDs with currently assigned profiles
            const assignedIds = new Set<string>(
                assignedData.assignedProfiles.map((p: AssignedProfile) => p.id)
            );
            setSelectedProfileIds(assignedIds);
        } catch (err: any) {
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleProfile = (profileId: string) => {
        const newSelected = new Set(selectedProfileIds);
        if (newSelected.has(profileId)) {
            newSelected.delete(profileId);
        } else {
            newSelected.add(profileId);
        }
        setSelectedProfileIds(newSelected);
    };

    const handleSelectAll = () => {
        const allIds = new Set(filteredProfiles.map((p) => p.id));
        setSelectedProfileIds(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedProfileIds(new Set());
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setError(null);

        try {
            const currentlyAssigned = new Set(assignedProfiles.map((p) => p.id));
            const toAssign = Array.from(selectedProfileIds).filter(
                (id) => !currentlyAssigned.has(id)
            );
            const toRemove = Array.from(currentlyAssigned).filter(
                (id) => !selectedProfileIds.has(id)
            );

            // Assign new profiles
            if (toAssign.length > 0) {
                const assignRes = await fetch(`/api/admin/users/${user.id}/profiles`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileIds: toAssign }),
                });

                if (!assignRes.ok) {
                    const errorData = await assignRes.json();
                    throw new Error(errorData.error || "Failed to assign profiles");
                }
            }

            // Remove profiles
            if (toRemove.length > 0) {
                const removeRes = await fetch(
                    `/api/admin/users/${user.id}/profiles`,
                    {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ profileIds: toRemove }),
                    }
                );

                if (!removeRes.ok) {
                    const errorData = await removeRes.json();
                    throw new Error(errorData.error || "Failed to remove profiles");
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const filteredProfiles = allProfiles.filter((profile) => {
        const searchLower = search.toLowerCase();
        return (
            profile.name?.toLowerCase().includes(searchLower) ||
            profile.platformUsername?.toLowerCase().includes(searchLower) ||
            profile.platform.toLowerCase().includes(searchLower)
        );
    });

    // Group profiles by platform
    const profilesByPlatform = filteredProfiles.reduce(
        (acc, profile) => {
            if (!acc[profile.platform]) {
                acc[profile.platform] = [];
            }
            acc[profile.platform].push(profile);
            return acc;
        },
        {} as Record<string, Profile[]>
    );

    if (!open || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Assign Profiles
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {user.name || user.email} ({user.role})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search and Bulk Actions */}
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-full rounded-md border border-zinc-200 bg-transparent pl-9 pr-4 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={loading || filteredProfiles.length === 0}
                            className="flex items-center gap-1.5"
                        >
                            <CheckSquare className="h-3.5 w-3.5" />
                            Select All
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDeselectAll}
                            disabled={loading || selectedProfileIds.size === 0}
                            className="flex items-center gap-1.5"
                        >
                            <Square className="h-3.5 w-3.5" />
                            Deselect All
                        </Button>
                    </div>
                </div>

                {/* Profile List */}
                <div className="flex-1 overflow-y-auto border border-zinc-200 rounded-lg dark:border-zinc-800">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-500">
                            Loading profiles...
                        </div>
                    ) : Object.keys(profilesByPlatform).length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            No profiles found
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {Object.entries(profilesByPlatform).map(
                                ([platform, profiles]) => (
                                    <div key={platform} className="p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            {(() => {
                                                const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS];
                                                return Icon ? <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" /> : null;
                                            })()}
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {platform}
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {profiles.map((profile) => (
                                                <label
                                                    key={profile.id}
                                                    className="flex items-center gap-3 rounded-md p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProfileIds.has(profile.id)}
                                                        onChange={() => handleToggleProfile(profile.id)}
                                                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                                            {profile.name || "Unnamed Profile"}
                                                        </div>
                                                        {profile.platformUsername && (
                                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                @{profile.platformUsername}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[
                                                            profile.platform as keyof typeof PLATFORM_COLORS
                                                        ]
                                                            }`}
                                                    >
                                                        {profile.platform}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                        {selectedProfileIds.size} profile(s) selected
                    </p>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
