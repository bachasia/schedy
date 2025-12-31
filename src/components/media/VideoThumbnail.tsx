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
  const [useCanvas, setUseCanvas] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video) return;

    // Set timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn("Video thumbnail timeout, using video element");
        setUseCanvas(false);
        setLoading(false);
      }
    }, 5000); // 5 seconds timeout

    const captureFrame = () => {
      if (!useCanvas || !canvas) {
        setLoading(false);
        return;
      }

      try {
        // Check if video has valid dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          setUseCanvas(false);
          setLoading(false);
          return;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setUseCanvas(false);
          setLoading(false);
          return;
        }

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setThumbnailUrl(url);
              setLoading(false);
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
            } else {
              setUseCanvas(false);
              setLoading(false);
            }
          },
          "image/jpeg",
          0.8
        );
      } catch (err) {
        console.error("Error capturing frame:", err);
        setUseCanvas(false);
        setLoading(false);
      }
    };

    const handleLoadedData = () => {
      try {
        if (video.readyState >= 2) {
          video.currentTime = 0.1;
        }
      } catch (err) {
        captureFrame();
      }
    };

    const handleSeeked = () => {
      if (useCanvas) {
        captureFrame();
      } else {
        setLoading(false);
      }
    };

    const handleCanPlay = () => {
      if (loading && !thumbnailUrl && video.currentTime === 0) {
        try {
          video.currentTime = 0.1;
        } catch (err) {
          captureFrame();
        }
      }
    };

    const handleError = () => {
      // Try without crossOrigin
      if (video.crossOrigin) {
        video.crossOrigin = null;
        video.load();
        return;
      }
      setError(true);
      setUseCanvas(false);
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    // Try with crossOrigin first
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    video.src = src;
    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [src, loading, thumbnailUrl, useCanvas]);

  // Show loading state
  if (loading) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-black/50",
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Use video element directly if canvas failed or not used
  if (!useCanvas || error) {
    return (
      <div
        className={cn(
          "w-full h-full relative overflow-hidden bg-black/50",
          className
        )}
      >
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => {
            const video = videoRef.current;
            if (video && video.readyState >= 2) {
              video.currentTime = 0.1;
            }
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Video className="h-8 w-8 text-white/80" />
        </div>
      </div>
    );
  }

  // Show thumbnail if available
  return (
    <>
      <video ref={videoRef} src={src} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center bg-black/50",
            className
          )}
        >
          <Video className="h-12 w-12 text-white" />
        </div>
      )}
    </>
  );
}

