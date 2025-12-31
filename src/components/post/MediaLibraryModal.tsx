"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  Image as ImageIcon,
  Video,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoThumbnail } from "@/components/media/VideoThumbnail";

type MediaItem = {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType?: string;
};

type MediaFile = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  url?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
};

interface MediaLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (mediaItems: MediaItem[]) => void;
  selectedMediaUrls: string[];
  maxImages: number;
  maxVideos: number;
  currentImageCount: number;
  currentVideoCount: number;
}

const ITEMS_PER_PAGE = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/mov"];

function getMediaType(item: MediaItem): "image" | "video" {
  if (item.contentType === "video") return "video";
  if (item.url.match(/\.(mp4|mov|quicktime)$/i)) return "video";
  return "image";
}

export function MediaLibraryModal({
  open,
  onOpenChange,
  onSelectMedia,
  selectedMediaUrls,
  maxImages,
  maxVideos,
  currentImageCount,
  currentVideoCount,
}: MediaLibraryModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(selectedMediaUrls));
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (open) {
      fetchMedia();
      setSelectedItems(new Set(selectedMediaUrls));
    }
  }, [open, selectedMediaUrls]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/media");
      setMedia(response.data.media || []);
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploading(true);

    try {
      for (const file of fileArray) {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) continue;
        if (isImage && file.size > MAX_IMAGE_SIZE) continue;
        if (isVideo && file.size > MAX_VIDEO_SIZE) continue;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", isImage ? "image" : "video");

        await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      await fetchMedia();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }, []);

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

  const toggleSelection = (item: MediaItem) => {
    const mediaType = getMediaType(item);
    const isSelected = selectedItems.has(item.url);

    if (isSelected) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.url);
        return newSet;
      });
    } else {
      // Check limits
      if (mediaType === "image" && currentImageCount >= maxImages) {
        return;
      }
      if (mediaType === "video" && currentVideoCount >= maxVideos) {
        return;
      }

      setSelectedItems((prev) => new Set(prev).add(item.url));
    }
  };

  const handleConfirm = () => {
    const selectedMedia = media.filter((item) => selectedItems.has(item.url));
    onSelectMedia(selectedMedia);
    onOpenChange(false);
  };

  // Pagination
  const totalPages = Math.ceil(media.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMedia = media.slice(startIndex, endIndex);

  const canAddImages = currentImageCount < maxImages;
  const canAddVideos = currentVideoCount < maxVideos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-muted p-3">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1">
                  {uploading ? "Uploading..." : "Drag and drop files here"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  or click to browse
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || (!canAddImages && !canAddVideos)}
                  variant="outline"
                  size="sm"
                >
                  Upload Files
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Images: max {maxImages} ({currentImageCount}/{maxImages}) • Videos: max {maxVideos} ({currentVideoCount}/{maxVideos})
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime,video/mov"
              onChange={(e) => {
                handleFileSelect(e.target.files);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
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
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {paginatedMedia.map((item) => {
                  const mediaType = getMediaType(item);
                  const isSelected = selectedItems.has(item.url);
                  const canSelect =
                    (mediaType === "image" && canAddImages) ||
                    (mediaType === "video" && canAddVideos);

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer transition-all",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:ring-2 hover:ring-primary/50",
                        !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => canSelect && toggleSelection(item)}
                    >
                      {mediaType === "image" ? (
                        <img
                          src={item.url}
                          alt="Media"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <VideoThumbnail
                          src={item.url}
                          className="w-full h-full"
                          alt="Video thumbnail"
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="rounded-full bg-primary p-2">
                            <Check className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {mediaType === "image" ? (
                          <ImageIcon className="h-4 w-4 text-white drop-shadow-lg" />
                        ) : (
                          <Video className="h-4 w-4 text-white drop-shadow-lg" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {selectedItems.size} item(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Select ({selectedItems.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

