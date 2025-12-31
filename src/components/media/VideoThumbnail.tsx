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
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      try {
        // Seek to first frame
        if (video.readyState >= 2) {
          video.currentTime = 0.1;
        }
      } catch (err) {
        console.error("Error seeking video:", err);
        setLoaded(true);
      }
    };

    const handleSeeked = () => {
      setLoaded(true);
    };

    const handleCanPlay = () => {
      if (!loaded && video.currentTime === 0) {
        try {
          video.currentTime = 0.1;
        } catch (err) {
          setLoaded(true);
        }
      }
    };

    const handleError = () => {
      setError(true);
      setLoaded(true);
    };

    // Configure video
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = null; // Don't use crossOrigin to avoid CORS issues

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
    };
  }, [src, loaded]);

  return (
    <div
      className={cn(
        "w-full h-full relative overflow-hidden bg-black/50",
        className
      )}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "w-full h-full object-cover",
          !loaded && "opacity-0"
        )}
        muted
        playsInline
        preload="metadata"
        onLoadedData={() => {
          const video = videoRef.current;
          if (video && video.readyState >= 2 && !loaded) {
            try {
              video.currentTime = 0.1;
            } catch (err) {
              setLoaded(true);
            }
          }
        }}
        onSeeked={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Video className="h-8 w-8 text-white/80" />
        </div>
      )}
      {loaded && !error && (
        <div className="absolute top-2 right-2">
          <div className="rounded bg-black/60 p-1">
            <Video className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

