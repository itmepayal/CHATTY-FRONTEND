import React, { useRef } from "react";
import {
  Trophy,
  ChevronRight,
  Flame,
  Award,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import IllustratedBadge from "../../badges/IllustratedBadge.jsx";
import BadgePill from "../../badges/BadgePill.jsx";
import { useBadgeStore } from "../../../store/useBadgeStore.js";

export default function ProfileAchievementsShowcase({
  onNavigateBadges = null,
  onSelectBadge = null,
  className = "",
}) {
  const {
    myBadges = [],
    achievements = [],
    catalog = [],
    stats = {},
    featuredBadge = null,
    loading = false,
  } = useBadgeStore();

  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = 240;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const unlockedCount = stats?.unlockedCount ?? myBadges.length;
  const totalCount = stats?.totalBadges ?? (catalog.length || achievements.length || 13);
  const completionPercent = stats?.completionPercentage ?? stats?.totalCompletionPercent ?? (totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0);
  const streakDays = stats?.streak ?? stats?.activityStreak ?? 1;

  return (
    <div
      className={`rounded-3xl border border-base-300/80 bg-base-100 p-5 sm:p-6 shadow-sm space-y-4 ${className}`}
      aria-label="Profile achievements showcase"
    >
      {/* Header Row: MY ACHIEVEMENTS + VIEW ALL */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-base-200/80">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Trophy className="size-4.5" />
          </span>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-base-content tracking-wide uppercase flex items-center gap-2">
              My Achievements
              {featuredBadge && (
                <BadgePill badge={featuredBadge} size="xs" showLabel={false} />
              )}
            </h3>
            <p className="text-xs text-base-content/60">
              {unlockedCount > 0
                ? `${unlockedCount} of ${totalCount} medals unlocked`
                : "Earn medals by completing messaging milestones"}
            </p>
          </div>
        </div>

        {onNavigateBadges && (
          <button
            type="button"
            onClick={onNavigateBadges}
            className="group flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1 px-2.5 rounded-xl hover:bg-primary/5 active:scale-95"
          >
            <span>VIEW ALL</span>
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-base-200/50 border border-base-300/60">
        <div className="p-1">
          <span className="text-[10px] uppercase font-bold text-base-content/50 block">
            Earned
          </span>
          <span className="text-sm sm:text-base font-extrabold text-primary tabular-nums">
            {unlockedCount}
          </span>
        </div>
        <div className="p-1">
          <span className="text-[10px] uppercase font-bold text-base-content/50 block">
            Total
          </span>
          <span className="text-sm sm:text-base font-extrabold text-base-content tabular-nums">
            {totalCount}
          </span>
        </div>
        <div className="p-1">
          <span className="text-[10px] uppercase font-bold text-base-content/50 block">
            Progress
          </span>
          <span className="text-sm sm:text-base font-extrabold text-emerald-500 tabular-nums">
            {completionPercent}%
          </span>
        </div>
        <div className="p-1">
          <span className="text-[10px] uppercase font-bold text-base-content/50 block flex items-center justify-center gap-0.5">
            <Flame className="size-2.5 text-amber-500 shrink-0" />
            Streak
          </span>
          <span className="text-sm sm:text-base font-extrabold text-amber-500 tabular-nums">
            {streakDays}d
          </span>
        </div>
      </div>

      {/* Horizontal Carousel Shelf */}
      <div className="relative group/shelf">
        {myBadges.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll achievements left"
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-base-100/90 border border-base-300 shadow-md backdrop-blur flex items-center justify-center text-base-content/70 hover:text-base-content opacity-0 group-hover/shelf:opacity-100 transition-opacity"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll achievements right"
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-base-100/90 border border-base-300 shadow-md backdrop-blur flex items-center justify-center text-base-content/70 hover:text-base-content opacity-0 group-hover/shelf:opacity-100 transition-opacity"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        {loading ? (
          <div className="flex gap-3 overflow-x-hidden py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-28 h-32 rounded-2xl bg-base-200/60 animate-pulse shrink-0"
              />
            ))}
          </div>
        ) : myBadges.length === 0 ? (
          /* Empty State */
          <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-base-300 bg-base-200/30 space-y-2">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Award className="size-6" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-base-content">
              No Medals Earned Yet
            </h4>
            <p className="text-[11px] text-base-content/60 max-w-xs mx-auto">
              Send your first message or connect with friends to unlock your first illustrated badge!
            </p>
            {onNavigateBadges && (
              <button
                type="button"
                onClick={onNavigateBadges}
                className="btn btn-xs btn-primary rounded-xl font-bold mt-1"
              >
                View Available Achievements
              </button>
            )}
          </div>
        ) : (
          /* Horizontal Shelf of Achieved Badges */
          <div
            ref={scrollRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          >
            {myBadges.map((item) => {
              const b = item.badge || item;
              const isCurrentFeatured =
                featuredBadge?._id === b._id || featuredBadge?.slug === b.slug;

              return (
                <div
                  key={item._id || b.slug}
                  onClick={() => onSelectBadge && onSelectBadge(b)}
                  className={`group/card flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer shrink-0 w-28 sm:w-32 h-36 ${
                    isCurrentFeatured
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "bg-base-200/40 border-base-300 hover:border-primary/40 hover:bg-base-200/70 hover:shadow-xs"
                  }`}
                >
                  <div className="mt-1">
                    <IllustratedBadge
                      badge={b}
                      size="sm"
                      showRibbon={true}
                      isFeatured={isCurrentFeatured}
                    />
                  </div>

                  <div className="w-full min-w-0 mt-2">
                    <p className="text-xs font-bold text-base-content truncate group-hover/card:text-primary transition-colors">
                      {b.name}
                    </p>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-base-content/50 block mt-0.5 capitalize">
                      {b.rarity || "common"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
