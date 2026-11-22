import React from "react";
import { Sparkles, Award } from "lucide-react";
import BadgeIcon from "./BadgeIcon.jsx";

export const RARITY_STYLES = {
  common: {
    badgeBg: "bg-slate-500/15 dark:bg-slate-700/30",
    badgeBorder: "border-slate-400/30 dark:border-slate-600/40",
    text: "text-slate-700 dark:text-slate-300",
    glow: "shadow-sm",
    ring: "ring-slate-400/20",
    gradient: "from-slate-500/20 to-slate-600/10",
  },
  uncommon: {
    badgeBg: "bg-emerald-500/15 dark:bg-emerald-950/40",
    badgeBorder: "border-emerald-500/40 dark:border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    glow: "shadow-emerald-500/10 shadow-sm",
    ring: "ring-emerald-500/20",
    gradient: "from-emerald-500/20 to-teal-600/10",
  },
  rare: {
    badgeBg: "bg-sky-500/15 dark:bg-sky-950/40",
    badgeBorder: "border-sky-500/40 dark:border-sky-500/30",
    text: "text-sky-700 dark:text-sky-400",
    glow: "shadow-sky-500/15 shadow-sm",
    ring: "ring-sky-500/30",
    gradient: "from-sky-500/20 to-blue-600/10",
  },
  epic: {
    badgeBg: "bg-purple-500/15 dark:bg-purple-950/40",
    badgeBorder: "border-purple-500/40 dark:border-purple-500/30",
    text: "text-purple-700 dark:text-purple-300",
    glow: "shadow-purple-500/20 shadow-md",
    ring: "ring-purple-500/30",
    gradient: "from-purple-500/25 to-indigo-600/15",
  },
  legendary: {
    badgeBg: "bg-amber-500/15 dark:bg-amber-950/40",
    badgeBorder: "border-amber-500/50 dark:border-amber-500/40",
    text: "text-amber-700 dark:text-amber-400",
    glow: "shadow-amber-500/25 shadow-md",
    ring: "ring-amber-500/40",
    gradient: "from-amber-500/25 to-orange-600/15",
  },
  mythic: {
    badgeBg: "bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 dark:from-rose-950/50 dark:to-purple-950/50",
    badgeBorder: "border-rose-500/50 dark:border-rose-400/40",
    text: "text-rose-700 dark:text-rose-300 font-extrabold",
    glow: "shadow-rose-500/30 shadow-lg animate-pulse",
    ring: "ring-rose-500/40",
    gradient: "from-rose-500/30 via-purple-500/20 to-amber-500/20",
  },
};

export default function BadgePill({
  badge,
  size = "sm",
  showLabel = true,
  onClick,
  className = "",
}) {
  if (!badge) return null;

  const rarity = (badge.rarity || "common").toLowerCase();
  const theme = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size] || "px-2 py-0.5 text-xs gap-1.5";

  const iconSizes = {
    xs: "w-3 h-3 text-xs",
    sm: "w-3.5 h-3.5 text-xs",
    md: "w-4 h-4 text-sm",
    lg: "w-5 h-5 text-base",
  }[size] || "w-3.5 h-3.5 text-xs";

  const numericIconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
  }[size] || 14;

  return (
    <span
      onClick={onClick}
      title={`${badge.name} (${rarity.toUpperCase()}) - ${badge.description || ""}`}
      className={`inline-flex items-center font-medium rounded-full border transition-all duration-200 select-none ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      } ${theme.badgeBg} ${theme.badgeBorder} ${theme.text} ${theme.glow} ${sizeClasses} ${className}`}
    >
      <BadgeIcon
        icon={badge.icon}
        size={numericIconSizes}
        className="shrink-0"
        aria-hidden="true"
      />

      {showLabel && (
        <span className="truncate max-w-[120px] font-semibold leading-none">
          {badge.name}
        </span>
      )}
    </span>
  );
}
