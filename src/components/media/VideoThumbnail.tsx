"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoThumbnailProps {
  src: string;
  className?: string;
  alt?: string;
}

export function VideoThumbnail({ src, className, alt = "Video thumbnail" }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const generateThumbnail = () => {
      try {
        // Set video to first frame
        video.currentTime = 0.1;
      } catch (err) {
        console.error("Error setting video time:", err);
        setError(true);
        setLoading(false);
      }
    };

    const captureFrame = () => {
      try {
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setThumbnailUrl(url);
              setLoading(false);
            } else {
              setError(true);
              setLoading(false);
            }
          },
          "image/jpeg",
          0.8
        );
      } catch (err) {
        console.error("Error capturing frame:", err);
        setError(true);
        setLoading(false);
      }
    };

    const handleLoadedMetadata = () => {
      generateThumbnail();
    };

    const handleSeeked = () => {
      captureFrame();
    };

    const handleError = () => {
      setError(true);
      setLoading(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    // Load video
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [src, thumbnailUrl]);

  if (error || loading) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-black/50",
          className
        )}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        ) : (
          <Video className="h-12 w-12 text-white" />
        )}
      </div>
    );
  }

  return (
    <>
      <video ref={videoRef} src={src} className="hidden" crossOrigin="anonymous" />
      <canvas ref={canvasRef} className="hidden" />
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
        />
      )}
    </>
  );
}

