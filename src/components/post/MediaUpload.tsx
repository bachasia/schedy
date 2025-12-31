"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Video, AlertCircle, FolderOpen } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaLibraryModal } from "./MediaLibraryModal";

type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "YOUTUBE";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  url?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface MediaUploadProps {
  selectedPlatforms: Platform[];
  onMediaChange: (files: MediaFile[]) => void;
  maxImages?: number;
  maxVideos?: number;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/mov"];

const PLATFORM_LIMITS: Record<Platform, { maxImages: number; maxVideos: number; maxImageDimension: number }> = {
  FACEBOOK: { maxImages: 10, maxVideos: 1, maxImageDimension: 8000 },
  INSTAGRAM: { maxImages: 10, maxVideos: 1, maxImageDimension: 8000 },
  TWITTER: { maxImages: 4, maxVideos: 1, maxImageDimension: 4096 },
  TIKTOK: { maxImages: 0, maxVideos: 1, maxImageDimension: 0 },
  YOUTUBE: { maxImages: 0, maxVideos: 1, maxImageDimension: 0 },
};

export function MediaUpload({
  selectedPlatforms,
  onMediaChange,
  maxImages = 10,
  maxVideos = 1,
}: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const getStrictestLimits = () => {
    if (selectedPlatforms.length === 0) {
      return { maxImages, maxVideos: 1 };
    }
    return {
      maxImages: Math.min(...selectedPlatforms.map(p => PLATFORM_LIMITS[p].maxImages)),
      maxVideos: Math.min(...selectedPlatforms.map(p => PLATFORM_LIMITS[p].maxVideos)),
    };
  };

  const limits = getStrictestLimits();

  const validateFile = async (file: File): Promise<string | null> => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return "Invalid file type. Please upload jpg, png, gif, webp, mp4, or mov files.";
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return `Image "${file.name}" exceeds 10MB limit.`;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return `Video "${file.name}" exceeds 100MB limit.`;
    }

    // Check video limit
    const videoCount = mediaFiles.filter(f => f.type === "video").length;
    if (isVideo && videoCount >= limits.maxVideos) {
      return `You can only upload ${limits.maxVideos} video for selected platforms.`;
    }

    // Check image limit
    const imageCount = mediaFiles.filter(f => f.type === "image").length;
    if (isImage && imageCount >= limits.maxImages) {
      return `You can only upload ${limits.maxImages} images for selected platforms.`;
    }

    // Validate dimensions for images
    if (isImage && selectedPlatforms.length > 0) {
      const maxDimension = Math.min(
        ...selectedPlatforms.map(p => PLATFORM_LIMITS[p].maxImageDimension),
      );

      const dimensions = await getImageDimensions(file);
      if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
        return `Image dimensions (${dimensions.width}x${dimensions.height}) exceed ${maxDimension}px limit for selected platforms.`;
      }
    }

    return null;
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newErrors: string[] = [];
    const validFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = await validateFile(file);

      if (error) {
        newErrors.push(error);
      } else {
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
        const mediaFile: MediaFile = {
          id: `${Date.now()}-${i}`,
          file,
          preview: URL.createObjectURL(file),
          type: isVideo ? "video" : "image",
          uploading: false,
          progress: 0,
        };
        validFiles.push(mediaFile);
      }
    }

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const updatedFiles = [...mediaFiles, ...validFiles];
      setMediaFiles(updatedFiles);
      // Notify parent immediately when files are added
      onMediaChange(updatedFiles);

      // Auto-upload files
      validFiles.forEach(file => uploadFile(file));
    }
  };

  const uploadFile = async (mediaFile: MediaFile) => {
    const formData = new FormData();
    formData.append("file", mediaFile.file);
    formData.append("type", mediaFile.type);

    setMediaFiles(prev =>
      prev.map(f =>
        f.id === mediaFile.id ? { ...f, uploading: true, progress: 0 } : f,
      ),
    );

    try {
      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setMediaFiles(prev =>
            prev.map(f => (f.id === mediaFile.id ? { ...f, progress } : f)),
          );
        },
      });

      // Use functional update to ensure we have the latest state
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f =>
          f.id === mediaFile.id
            ? { ...f, uploading: false, url: response.data.url }
            : f,
        );
        console.log("[MediaUpload] Upload successful - URL:", response.data.url);
        console.log("[MediaUpload] Updated files:", updatedFiles);
        console.log("[MediaUpload] Files with URLs:", updatedFiles.filter(f => f.url).map(f => ({ id: f.id, url: f.url })));
        // Notify parent with updated files
        console.log("[MediaUpload] Notifying parent with updated files:", updatedFiles);
        onMediaChange(updatedFiles);
        return updatedFiles;
      });
    } catch (error) {
      console.error("Upload error:", error);
      // Use functional update to ensure we have the latest state
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f =>
          f.id === mediaFile.id
            ? { ...f, uploading: false, error: "Upload failed. Please try again." }
            : f,
        );
        // Notify parent when upload fails
        onMediaChange(updatedFiles);
        return updatedFiles;
      });
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = mediaFiles.filter(f => f.id !== id);
    setMediaFiles(updatedFiles);
    // Notify parent when file is removed
    onMediaChange(updatedFiles);
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
        handleFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [mediaFiles, selectedPlatforms],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const imageCount = mediaFiles.filter(f => f.type === "image").length;
  const videoCount = mediaFiles.filter(f => f.type === "video").length;
  const canAddImages = imageCount < limits.maxImages;
  const canAddVideos = videoCount < limits.maxVideos;

  const handleSelectFromLibrary = (mediaItems: Array<{ url: string; contentType?: string }>) => {
    const newMediaFiles: MediaFile[] = mediaItems.map((item) => {
      const isVideo = item.contentType === "video" || item.url.match(/\.(mp4|mov|quicktime)$/i);
      return {
        id: `${Date.now()}-${item.url}`,
        file: new File([], ""), // Empty file, we already have URL
        preview: item.url,
        type: isVideo ? "video" : "image",
        url: item.url,
        uploading: false,
        progress: 100,
      };
    });

    const updatedFiles = [...mediaFiles, ...newMediaFiles];
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
  };

  const selectedMediaUrls = mediaFiles.map(f => f.url || f.preview).filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
          !canAddImages && !canAddVideos && "opacity-50 cursor-not-allowed",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={!canAddImages && !canAddVideos}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
            <Upload className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {isDragging ? "Drop files here" : "Drag and drop files here"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              or{" "}
              <button
                type="button"
                onClick={() => setLibraryModalOpen(true)}
                className="font-medium text-zinc-900 underline dark:text-zinc-50"
                disabled={!canAddImages && !canAddVideos}
              >
                browse from library
              </button>
              {" or "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-zinc-900 underline dark:text-zinc-50"
                disabled={!canAddImages && !canAddVideos}
              >
                upload new
              </button>
            </p>
          </div>

          <div className="text-xs text-zinc-500">
            <p>
              Images: jpg, png, gif, webp (max {limits.maxImages}, 10MB each)
            </p>
            <p>Videos: mp4, mov (max {limits.maxVideos}, 100MB)</p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          {errors.map((error, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {mediaFiles.map((media) => (
            <div
              key={media.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Preview */}
              {media.type === "image" ? (
                <img
                  src={media.preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Video className="h-12 w-12 text-zinc-400" />
                </div>
              )}

              {/* Upload Progress */}
              {media.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <div className="text-xs font-medium text-white">
                      {media.progress}%
                    </div>
                    <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${media.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {media.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/90 p-2">
                  <p className="text-center text-xs text-white">{media.error}</p>
                </div>
              )}

              {/* Remove Button */}
              {!media.uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(media.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Type Badge */}
              <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1">
                {media.type === "image" ? (
                  <ImageIcon className="h-3 w-3 text-white" />
                ) : (
                  <Video className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {mediaFiles.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {imageCount > 0 && <span>{imageCount} image(s)</span>}
          {imageCount > 0 && videoCount > 0 && <span className="mx-2">•</span>}
          {videoCount > 0 && <span>{videoCount} video(s)</span>}
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        open={libraryModalOpen}
        onOpenChange={setLibraryModalOpen}
        onSelectMedia={handleSelectFromLibrary}
        selectedMediaUrls={selectedMediaUrls}
        maxImages={limits.maxImages}
        maxVideos={limits.maxVideos}
        currentImageCount={imageCount}
        currentVideoCount={videoCount}
      />
    </div>
  );
}








