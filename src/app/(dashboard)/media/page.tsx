"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type MediaItem = {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType?: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/mov"];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/media");
      setMedia(response.data.media || []);
    } catch (err) {
      console.error("Error fetching media:", err);
      setError("Failed to load media. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const errors: string[] = [];

    for (const file of fileArray) {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        errors.push(`"${file.name}" is not a supported file type.`);
        continue;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        errors.push(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        errors.push(`"${file.name}" exceeds 100MB limit.`);
        continue;
      }
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (const file of fileArray) {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", isImage ? "image" : "video");

        await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // Refresh media list
      await fetchMedia();
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Failed to upload file. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDelete = async (item: MediaItem) => {
    try {
      await axios.delete("/api/media", {
        data: { key: item.key },
      });
      setMedia(media.filter((m) => m.key !== item.key));
      setDeleteItem(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete file. Please try again.");
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getMediaType = (item: MediaItem): "image" | "video" => {
    if (item.contentType === "video") return "video";
    if (item.url.match(/\.(mp4|mov|quicktime)$/i)) return "video";
    return "image";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Media Library</h1>
        <p className="text-muted-foreground">
          Upload and manage your media files
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          "mb-8 border-2 border-dashed rounded-lg p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-4">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-medium mb-1">
              {uploading ? "Uploading..." : "Drag and drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse (Images: max 10MB, Videos: max 100MB)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              Select Files
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime,video/mov"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No media files yet. Upload your first file to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => {
            const mediaType = getMediaType(item);
            return (
              <div
                key={item.key}
                className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setPreviewItem(item)}
              >
                {mediaType === "image" ? (
                  <img
                    src={item.url}
                    alt="Media"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/50">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.url, "_blank");
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteItem(item);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">
                    {formatFileSize(item.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Media Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {getMediaType(previewItem) === "image" ? (
                <img
                  src={previewItem.url}
                  alt="Preview"
                  className="w-full rounded-lg"
                />
              ) : (
                <video
                  src={previewItem.url}
                  controls
                  className="w-full rounded-lg"
                />
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Size: {formatFileSize(previewItem.size)}</span>
                  <span>Uploaded: {formatDate(previewItem.lastModified)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(previewItem.url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(previewItem.url);
                    }}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this media file? This action
              cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItem && handleDelete(deleteItem)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

