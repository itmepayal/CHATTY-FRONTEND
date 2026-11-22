import React from "react";
import { Sparkles, Coins, Quote, Play } from "lucide-react";
import { useGiftStore } from "../../../store/useGiftStore.js";
import GiftArtwork from "./GiftArtwork.jsx";
import { getCategoryTheme, getRarityTheme } from "./giftUIHelpers.js";

/**
 * GiftMessageBubble
 * Theme-aware gift message renderer inside chat conversations.
 * Adapts strictly to the CURRENT VIEWER'S ACTIVE THEME (both 1:1 and Group chats).
 * Never inherits or leaks sender's computed colors.
 */
const GiftMessageBubble = ({
  gift,
  isMine = false,
  senderName = "",
  timestamp = null,
}) => {
  const { setCelebrationGift } = useGiftStore();

  // Defensive parsing for legacy JSON string gifts
  const parsedGift =
    typeof gift === "string"
      ? (() => {
          try {
            return JSON.parse(gift);
          } catch {
            return null;
          }
        })()
      : gift;

  if (!parsedGift?.name) return null;

  const categoryTheme = getCategoryTheme(parsedGift.category);
  const rarityTheme = getRarityTheme(parsedGift.rarity);

  return (
    <div
      onClick={() => setCelebrationGift(parsedGift)}
      title="Click to view full-screen gift celebration"
      className={`relative my-1.5 overflow-hidden rounded-3xl border transition-all duration-200 select-none cursor-pointer group hover:scale-[1.01] hover:shadow-xl ${
        isMine
          ? "border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-base-100 text-base-content shadow-md hover:border-primary/60"
          : "border-base-300 bg-gradient-to-br from-base-200 via-base-200/80 to-base-100 text-base-content shadow-md hover:border-base-content/25"
      } p-3.5 sm:p-4 max-w-[300px] sm:max-w-[340px]`}
    >
      {/* Subtle Ambient Category Aura */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity"
        style={{ background: categoryTheme.glow }}
      />

      {/* Top Header Tag Row */}
      <div className="relative z-[1] flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isMine
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-base-300/80 text-base-content/80 border-base-300"
          }`}
        >
          <Sparkles className="size-3 text-amber-500" />
          {parsedGift.category || "Special"} Gift
        </span>

        {parsedGift.coinPrice ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
            <Coins className="size-3 text-amber-500" />
            {parsedGift.coinPrice}
          </span>
        ) : (
          <span className="text-[10px] text-base-content/60 font-medium">
            {isMine ? "Sent with joy" : `${senderName || "A friend"} sent a gift`}
          </span>
        )}
      </div>

      {/* Main Artwork & Details Container */}
      <div className="relative z-[1] flex items-center gap-3 my-1">
        {/* Dedicated Artwork Box with Category Backdrop */}
        <div
          className="flex h-20 w-20 sm:h-22 sm:w-22 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-xs border border-base-300 bg-base-100 transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `radial-gradient(circle at center, ${categoryTheme.accent}20 0%, transparent 80%)`,
          }}
        >
          <GiftArtwork
            gift={parsedGift}
            className="w-full h-full"
            imgClassName="w-full h-full object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
            fallbackSize="text-4xl"
            glow={false}
          />
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <h4 className="text-base sm:text-lg font-black text-base-content leading-tight truncate group-hover:text-primary transition-colors">
            {parsedGift.name}
          </h4>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {parsedGift.rarity && (
              <span
                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${rarityTheme.badgeBorder} ${rarityTheme.badgeText} ${rarityTheme.badgeBg}`}
              >
                {parsedGift.rarity}
              </span>
            )}
            {parsedGift.isAnimated && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                ANIM
              </span>
            )}
          </div>

          <p className="text-xs text-base-content/60 mt-1 line-clamp-1">
            {parsedGift.message || (isMine ? "You sent a digital gift" : `Gift from ${senderName || "a friend"}`)}
          </p>
        </div>
      </div>

      {/* Personal Note Quote Box (if present) */}
      {parsedGift.message && (
        <div className="relative z-[1] mt-2.5 rounded-2xl px-3 py-2 text-xs italic bg-base-200/70 border border-base-300/70 text-base-content/90 flex items-start gap-1.5">
          <Quote className="size-3.5 text-primary shrink-0 mt-0.5 opacity-80" />
          <span className="line-clamp-2">"{parsedGift.message}"</span>
        </div>
      )}

      {/* Footer: Replay Action Pill & Timestamp */}
      <div className="relative z-[1] mt-2.5 pt-1.5 border-t border-base-300/60 flex items-center justify-between text-[10px]">
        <span className="text-base-content/50 font-medium">
          {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-primary group-hover:underline">
          <Play className="size-2.5 fill-current" />
          Tap to view celebration
        </span>
      </div>
    </div>
  );
};

export default GiftMessageBubble;
