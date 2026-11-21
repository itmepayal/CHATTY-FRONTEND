import React from "react";
import { Sparkles, Coins, Quote, Play } from "lucide-react";
import { useGiftStore } from "../../../store/useGiftStore.js";
import GiftArtwork from "./GiftArtwork.jsx";
import { getCategoryTheme, getRarityTheme } from "./giftUIHelpers.js";

const GiftMessageBubble = ({
  gift,
  isMine = false,
  senderName = "",
  timestamp = null,
}) => {
  const { setCelebrationGift } = useGiftStore();

  if (!gift?.name) return null;

  const categoryTheme = getCategoryTheme(gift.category);
  const rarityTheme = getRarityTheme(gift.rarity);

  return (
    <div
      onClick={() => setCelebrationGift(gift)}
      title="Click to view full-screen gift celebration"
      className={`relative my-1.5 overflow-hidden rounded-3xl border transition-all duration-200 select-none cursor-pointer group hover:scale-[1.01] hover:shadow-2xl ${
        isMine
          ? "border-sky-500/35 bg-gradient-to-br from-[#1E293B] to-[#151F32] text-slate-100 shadow-[0_10px_25px_-5px_rgba(56,189,248,0.15)]"
          : "border-white/15 bg-gradient-to-br from-[#151F32] to-[#111827] text-slate-100 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]"
      } p-3.5 sm:p-4 max-w-[300px] sm:max-w-[340px]`}
    >
      {/* Subtle Ambient Category Aura */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-35 blur-2xl group-hover:opacity-60 transition-opacity"
        style={{ background: categoryTheme.glow }}
      />

      {/* Top Header Tag Row */}
      <div className="relative z-[1] flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isMine
              ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
              : "bg-white/10 text-slate-300 border-white/15"
          }`}
        >
          <Sparkles className="size-3 text-amber-400" />
          {gift.category || "Special"} Gift
        </span>

        {gift.coinPrice ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
            <Coins className="size-3 text-amber-500" />
            {gift.coinPrice}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">
            {isMine ? "Sent with joy" : `${senderName || "A friend"} sent you a gift`}
          </span>
        )}
      </div>

      {/* Main Artwork & Details Container */}
      <div className="relative z-[1] flex items-center gap-3 my-1">
        {/* Dedicated Artwork Box with Category Backdrop */}
        <div
          className={`flex h-20 w-20 sm:h-22 sm:w-22 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-md border transition-transform duration-300 group-hover:scale-105 ${
            isMine
              ? "bg-slate-900/60 border-sky-500/25 shadow-black/40"
              : "bg-slate-900/60 border-white/10"
          }`}
          style={{
            background: `radial-gradient(circle at center, ${categoryTheme.accent}20 0%, rgba(15,23,42,0.85) 80%)`,
          }}
        >
          <GiftArtwork
            gift={gift}
            className="w-full h-full"
            imgClassName="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            fallbackSize="text-4xl"
            glow={false}
          />
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <h4 className="text-base sm:text-lg font-black text-white leading-tight truncate group-hover:text-sky-300 transition-colors">
            {gift.name}
          </h4>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {gift.rarity && (
              <span
                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${rarityTheme.badgeBorder} ${rarityTheme.badgeText} ${rarityTheme.badgeBg}`}
              >
                {gift.rarity}
              </span>
            )}
            {gift.isAnimated && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ANIM
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {gift.message || (isMine ? "You sent a digital gift" : `Gift from ${senderName || "a friend"}`)}
          </p>
        </div>
      </div>

      {/* Personal Note Quote Box (if present) */}
      {gift.message && (
        <div className="relative z-[1] mt-2.5 rounded-2xl px-3 py-2 text-xs italic bg-black/30 border border-white/10 text-slate-200 flex items-start gap-1.5">
          <Quote className="size-3.5 text-sky-400 shrink-0 mt-0.5 opacity-80" />
          <span className="line-clamp-2">"{gift.message}"</span>
        </div>
      )}

      {/* Footer: Replay Action Pill & Timestamp */}
      <div className="relative z-[1] mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
        <span className="text-slate-400 font-medium">
          {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-sky-400 group-hover:underline">
          <Play className="size-2.5 fill-sky-400" />
          Tap to view celebration
        </span>
      </div>
    </div>
  );
};

export default GiftMessageBubble;
