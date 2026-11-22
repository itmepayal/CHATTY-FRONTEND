import React from "react";
import { CheckCircle2, Lock, Target, Coins, Sparkles } from "lucide-react";
import { RARITY_STYLES } from "./BadgePill.jsx";
import IllustratedBadge from "./IllustratedBadge.jsx";

/**
 * AchievementCard Component
 * 
 * Premium gaming-grade card displaying:
 * - Unique badge artwork
 * - Badge name, rarity, category
 * - Detailed achievement description
 * - Coin reward callout
 * - Progress stats (current, target, percentage)
 * - Themed progress track
 * - Distinct Unlocked / In-Progress / Locked state indicators
 */
export default function AchievementCard({
  badge,
  state = "locked", // "unlocked" | "in_progress" | "locked"
  currentProgress = 0,
  targetProgress = 1,
  percentage = 0,
  unlockedAt = null,
  isFeatured = false,
  onClick = null,
  className = "",
}) {
  if (!badge) return null;

  const rarity = (badge.rarity || "common").toLowerCase();
  const theme = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const isUnlocked = state === "unlocked";
  const isInProgress = state === "in_progress";
  const isLocked = state === "locked";

  // Clean numeric values
  const current = isUnlocked ? targetProgress : Math.max(0, currentProgress);
  const target = Math.max(1, targetProgress);
  const percent = isUnlocked ? 100 : Math.min(100, Math.max(0, percentage));
  const coins = badge.rewards?.coins || badge.rewards?.bonusCoins || 0;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-3xl border transition-all duration-300 select-none ${
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.99]" : ""
      } ${
        isUnlocked
          ? isFeatured
            ? "bg-gradient-to-br from-base-100 via-primary/5 to-base-100 border-primary shadow-md hover:border-primary"
            : "bg-base-100/90 border-base-300 hover:border-primary/50 hover:shadow-lg"
          : isInProgress
          ? "bg-base-100/95 border-amber-500/30 hover:border-amber-500/60 hover:shadow-md"
          : "bg-base-200/40 border-base-300/80 opacity-75 hover:opacity-100 hover:border-base-content/20"
      } ${className}`}
    >
      {/* Top Background Gradient Highlight */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-30 ${
          isUnlocked
            ? `bg-gradient-to-br ${theme.gradient}`
            : isInProgress
            ? "bg-amber-500/20"
            : "bg-slate-500/10"
        }`}
      />

      {/* Main Top Section */}
      <div className="flex items-start gap-3.5 sm:gap-4 relative z-10">
        {/* Unique Illustrated Badge Artwork */}
        <div className="shrink-0 mt-0.5">
          <IllustratedBadge
            badge={badge}
            size="md"
            showRibbon={true}
            isLocked={isLocked}
            isInProgress={isInProgress}
            isFeatured={isFeatured}
          />
        </div>

        {/* Card Info Column */}
        <div className="min-w-0 flex-1">
          {/* Header Row: Rarity + Category + Status */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeBorder} ${theme.text}`}
              >
                {rarity}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-base-content/50 uppercase tracking-wider capitalize">
                {badge.category}
              </span>
            </div>

            {/* Status Pill */}
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="size-3" />
                Unlocked
              </span>
            ) : isInProgress ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Target className="size-3" />
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-base-content/40 bg-base-300/40 border border-base-300 px-2 py-0.5 rounded-full">
                <Lock className="size-2.5" />
                Locked
              </span>
            )}
          </div>

          {/* Badge Name */}
          <h4 className="text-sm sm:text-base font-extrabold text-base-content mt-1 truncate group-hover:text-primary transition-colors">
            {badge.name}
          </h4>

          {/* Badge Description */}
          <p className="text-xs text-base-content/70 mt-0.5 line-clamp-2 leading-relaxed">
            {badge.description}
          </p>

          {/* Rewards & Unlock Date Info */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {coins > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                <Coins className="size-3 text-amber-500" />
                <span>+{coins} Coins</span>
              </span>
            )}

            {isUnlocked && unlockedAt && (
              <span className="text-[10px] text-base-content/50 font-medium">
                Unlocked {new Date(unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}

            {isFeatured && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                ★ Featured on Profile
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar Section */}
      <div className="mt-3.5 pt-3 border-t border-base-200/80 relative z-10">
        <div className="flex items-center justify-between text-xs font-semibold text-base-content/70 mb-1.5">
          <span>
            {isUnlocked ? (
              <strong className="text-emerald-500 font-bold">Goal Completed</strong>
            ) : (
              <>
                Progress: <strong className="text-base-content">{current.toLocaleString()}</strong> / {target.toLocaleString()}
              </>
            )}
          </span>
          <span
            className={`font-black tabular-nums ${
              isUnlocked
                ? "text-emerald-500"
                : isInProgress
                ? "text-primary"
                : "text-base-content/40"
            }`}
          >
            {percent}% COMPLETED
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-base-200/90 border border-base-300/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlocked
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                : isInProgress
                ? "bg-primary shadow-sm shadow-primary/40"
                : "bg-base-content/20"
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
