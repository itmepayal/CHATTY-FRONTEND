import React from "react";
import { Heart, Package } from "lucide-react";
import { useStickerStore } from "../../store/useStickerStore.js";
import StickerImage from "./StickerImage.jsx";

export default function StickerMessageBubble({
  sticker,
  isMine = false,
  onOpenPack,
  className = "",
}) {
  const { favoriteStickerIds, toggleFavorite } = useStickerStore();

  const stickerObj = typeof sticker === "string" ? { url: sticker } : sticker;
  const stickerUrl = stickerObj?.url || stickerObj?.imageUrl || "";

  if (!stickerUrl) return null;

  const stickerId = String(
    stickerObj._id || stickerObj.id || stickerObj.stickerId || "",
  );
  const isFavorite = stickerId ? favoriteStickerIds.has(stickerId) : false;

  return (
    <div
      className={`relative group inline-block my-1 select-none transition-transform duration-200 hover:scale-105 ${className}`}
    >
      <div className="relative p-1 max-w-[170px] sm:max-w-[200px] max-h-[200px] flex items-center justify-center">
        <StickerImage
          src={stickerUrl}
          alt={stickerObj.name || "Sticker"}
          loading="lazy"
          isAnimated={Boolean(
            stickerObj.isAnimated ||
              stickerObj.format === "gif" ||
              stickerUrl.endsWith(".gif"),
          )}
          className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
        />

        {/* Floating Quick Action Overlay on Hover */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-base-100/90 backdrop-blur-md border border-base-300 rounded-full p-1 shadow-md">
          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(stickerObj);
            }}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            className={`p-1 rounded-full transition-colors ${
              isFavorite
                ? "text-rose-500 hover:bg-rose-500/10"
                : "text-base-content/40 hover:text-rose-500 hover:bg-base-200"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`}
            />
          </button>

          {/* View Pack button (if pack info exists) */}
          {(stickerObj.packId || stickerObj.pack) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenPack) onOpenPack(stickerObj.packId || stickerObj.pack);
              }}
              title="View Sticker Pack"
              className="p-1 rounded-full text-base-content/40 hover:text-primary hover:bg-base-200 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
