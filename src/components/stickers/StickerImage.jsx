import React, { useState, useEffect } from "react";
import { Sparkles, Image as ImageIcon } from "lucide-react";

/**
 * Resolves a sticker asset URL to be fully accessible.
 * Handles relative backend assets (/assets/..., /public/...) as well as external URLs.
 * Also normalizes full backend localhost URLs to local relative paths.
 */
export function resolveStickerAssetUrl(url) {
  if (!url || typeof url !== "string") return "";

  // Normalize localhost backend URLs to relative paths so they resolve via frontend static assets
  const normalized = url.replace(
    /^http:\/\/(localhost|127\.0\.0\.1):(8080|5000)\/assets\//,
    "/assets/",
  );

  // If already full http(s) or data URL or blob
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  // If relative path, ensure leading slash
  const cleanPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return cleanPath;
}

/**
 * StickerAsset / StickerImage Component
 *
 * Production-ready image renderer with:
 * - High-performance lazy loading
 * - Shimmer skeleton loading state
 * - Automatic format fallback (e.g. .webp -> .png)
 * - Professional fallback UI matching Chatty theme (never displays broken icons or technical errors)
 * - Animated WebP / GIF badge and playback
 * - Aspect ratio preservation and transparent backgrounds
 */
export function StickerAsset({
  src,
  alt = "Sticker",
  className = "w-full h-full object-contain filter drop-shadow-sm",
  containerClassName = "w-full h-full relative flex items-center justify-center",
  fallbackText = "",
  fallbackIcon = null,
  isAnimated = false,
  loading = "lazy",
}) {
  const [currentSrc, setCurrentSrc] = useState(() =>
    resolveStickerAssetUrl(src),
  );
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  // Update when src prop changes
  useEffect(() => {
    const resolved = resolveStickerAssetUrl(src);
    setCurrentSrc(resolved);
    setHasError(!resolved);
    setIsLoading(Boolean(resolved));
    setFallbackAttempted(false);
  }, [src]);

  const handleImageError = () => {
    // If WebP fails and hasn't tried PNG fallback yet
    if (!fallbackAttempted && currentSrc?.endsWith(".webp")) {
      setFallbackAttempted(true);
      setCurrentSrc(currentSrc.replace(/\.webp$/, ".png"));
      return;
    }

    // If GIF fails and hasn't tried WebP fallback yet
    if (!fallbackAttempted && currentSrc?.endsWith(".gif")) {
      setFallbackAttempted(true);
      setCurrentSrc(currentSrc.replace(/\.gif$/, ".webp"));
      return;
    }

    setIsLoading(false);
    setHasError(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // If URL is missing or both primary and fallback failed, show sleek Chatty sticker card
  if (!currentSrc || hasError) {
    return (
      <div
        className={`${containerClassName} bg-base-200/60 rounded-2xl p-2 select-none border border-base-300/80 hover:border-primary/40 transition-colors`}
        title={alt || "Sticker"}
      >
        <div className="flex flex-col items-center justify-center text-center gap-1">
          {fallbackIcon || (
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <span className="text-[10px] font-semibold text-base-content/60 tracking-wide truncate max-w-[85px]">
            {fallbackText || alt || "Sticker"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 rounded-2xl bg-base-200/50 animate-pulse flex items-center justify-center border border-base-300/40">
          <ImageIcon className="w-4 h-4 text-base-content/20 animate-pulse" />
        </div>
      )}

      {/* Actual Sticker Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${className} transition-opacity duration-200 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Animated Sticker Tag */}
      {(isAnimated || currentSrc?.endsWith(".gif")) && !isLoading && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-black/70 text-primary border border-primary/30 text-[8px] font-black tracking-wider uppercase backdrop-blur-xs select-none pointer-events-none shadow-xs">
          GIF
        </span>
      )}
    </div>
  );
}

export default StickerAsset;
