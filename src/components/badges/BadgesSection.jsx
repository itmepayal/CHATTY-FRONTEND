import React, { useEffect, useState, useRef } from "react";
import {
  Award,
  Sparkles,
  Shield,
  Eye,
  CheckCircle2,
  Lock,
  Coins,
  ChevronRight,
  ChevronLeft,
  Filter,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  History,
  PlusCircle,
  Flame,
  Search,
  Trophy,
  Target,
  Zap,
} from "lucide-react";
import { useBadgeStore } from "../../store/useBadgeStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import BadgePill, { RARITY_STYLES } from "./BadgePill.jsx";
import BadgeDetailModal from "./BadgeDetailModal.jsx";
import BadgeIcon from "./BadgeIcon.jsx";
import IllustratedBadge from "./IllustratedBadge.jsx";
import AchievementCard from "./AchievementCard.jsx";

const RARITY_OPTIONS = ["all", "common", "uncommon", "rare", "epic", "legendary", "mythic"];

const CATEGORY_OPTIONS = [
  { id: "all", label: "All Categories" },
  { id: "messaging", label: "Messaging" },
  { id: "social", label: "Social" },
  { id: "group", label: "Groups" },
  { id: "community", label: "Communities" },
  { id: "creator", label: "Stories & Creator" },
  { id: "engagement", label: "Engagement" },
  { id: "special_event", label: "Special Events" },
  { id: "official", label: "Official" },
];

export default function BadgesSection() {
  const { authUser } = useAuthStore();
  const isAdmin = authUser?.role === "admin";

  const {
    catalog = [],
    myBadges = [],
    achievements = [],
    achieved = [],
    inProgress = [],
    stats = {},
    featuredBadge = null,
    badgeVisibility = "public",
    auditLogs = [],
    loading = false,
    achievementsLoading = false,
    fetchCatalog,
    fetchMyBadges,
    fetchMyAchievements,
    fetchAuditLogs,
    setFeaturedBadge,
    updateVisibility,
    adminAwardBadge,
    adminRevokeBadge,
    adminCreateBadge,
  } = useBadgeStore();

  const [activeTab, setActiveTab] = useState("in_progress"); // "in_progress" | "achieved" | "all" | "admin"
  const [rarityFilter, setRarityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(null);

  const carouselRef = useRef(null);

  // Admin form state
  const [adminUserId, setAdminUserId] = useState("");
  const [adminSelectedBadge, setAdminSelectedBadge] = useState("");
  const [adminReason, setAdminReason] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Create badge form state
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeSlug, setNewBadgeSlug] = useState("");
  const [newBadgeDesc, setNewBadgeDesc] = useState("");
  const [newBadgeCat, setNewBadgeCat] = useState("official");
  const [newBadgeRarity, setNewBadgeRarity] = useState("rare");
  const [newBadgeIcon, setNewBadgeIcon] = useState("Award");
  const [newBadgeCoins, setNewBadgeCoins] = useState(50);

  useEffect(() => {
    fetchMyAchievements();
    fetchMyBadges();
    fetchCatalog();
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [fetchMyAchievements, fetchMyBadges, fetchCatalog, fetchAuditLogs, isAdmin]);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const distance = 260;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const earnedBadgeIds = new Set(
    (myBadges || [])
      .map((b) => b?.badge?._id || b?.badge?.id || b?.badgeId || b?.badgeSlug || b?.slug)
      .filter(Boolean),
  );

  // Filtered achievements for "In Progress" view
  const activeInProgress = (inProgress.length > 0 ? inProgress : (achievements || []).filter((a) => !a.isUnlocked))
    .filter((ach) => {
      if (!ach) return false;
      if (rarityFilter !== "all" && ach.rarity?.toLowerCase() !== rarityFilter) return false;
      if (categoryFilter !== "all" && ach.category?.toLowerCase() !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ach.name?.toLowerCase().includes(q) ||
          ach.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });

  // Filtered earned badges for "Achieved" view
  const activeEarned = (myBadges || []).filter((item) => {
    if (!item) return false;
    const b = item.badge || item;
    const r = (b.rarity || item.rarity || "common").toLowerCase();
    const c = (b.category || item.category || "activity").toLowerCase();
    if (rarityFilter !== "all" && r !== rarityFilter) return false;
    if (categoryFilter !== "all" && c !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered catalog for "All" view
  const activeAll = (achievements.length > 0 ? achievements : catalog).filter((item) => {
    if (!item) return false;
    const r = (item.rarity || "common").toLowerCase();
    const c = (item.category || "messaging").toLowerCase();
    if (rarityFilter !== "all" && r !== rarityFilter) return false;
    if (categoryFilter !== "all" && c !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unlockedCount = stats?.unlockedCount ?? myBadges.length;
  const inProgressCount = stats?.inProgressCount ?? activeInProgress.length;
  const totalCount = stats?.totalBadges ?? (catalog.length || achievements.length || 18);
  const completionPercent =
    stats?.completionPercentage ??
    stats?.totalCompletionPercent ??
    (totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0);
  const streakDays = stats?.streak ?? stats?.activityStreak ?? 1;

  const handleAdminAward = async () => {
    if (!adminUserId.trim() || !adminSelectedBadge) {
      alert("Please provide a User ID and select a Badge");
      return;
    }
    setAdminActionLoading(true);
    await adminAwardBadge({
      userId: adminUserId.trim(),
      badgeSlug: adminSelectedBadge,
      reason: adminReason.trim() || "Admin Awarded",
    });
    setAdminActionLoading(false);
    setAdminReason("");
  };

  const handleAdminRevoke = async () => {
    if (!adminUserId.trim() || !adminSelectedBadge) {
      alert("Please provide a User ID and select a Badge to revoke");
      return;
    }
    setAdminActionLoading(true);
    await adminRevokeBadge({
      userId: adminUserId.trim(),
      badgeSlug: adminSelectedBadge,
      reason: adminReason.trim() || "Admin Revocation",
    });
    setAdminActionLoading(false);
    setAdminReason("");
  };

  const handleCreateBadge = async (e) => {
    e.preventDefault();
    if (!newBadgeName.trim() || !newBadgeSlug.trim()) {
      alert("Name and Slug are required");
      return;
    }

    await adminCreateBadge({
      name: newBadgeName.trim(),
      slug: newBadgeSlug.trim().toLowerCase(),
      description: newBadgeDesc.trim(),
      category: newBadgeCat,
      rarity: newBadgeRarity,
      icon: newBadgeIcon.trim() || "Award",
      rewards: { coins: Number(newBadgeCoins) || 0 },
      criteria: { type: "admin_grant", threshold: 1 },
      color: "#38bdf8",
      order: 99,
    });

    setNewBadgeName("");
    setNewBadgeSlug("");
    setNewBadgeDesc("");
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER / SHOWCASE CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-base-200 via-base-100 to-base-200 border border-base-300 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center shadow-md shrink-0">
              {featuredBadge ? (
                <IllustratedBadge
                  badge={featuredBadge}
                  size="md"
                  showRibbon={true}
                  isFeatured={true}
                />
              ) : (
                <IllustratedBadge
                  slug="first_message"
                  size="md"
                  isLocked={true}
                  showRibbon={false}
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Featured Badge
                </span>
                {featuredBadge && (
                  <BadgePill badge={featuredBadge} size="xs" showLabel={false} />
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-base-content mt-0.5">
                {featuredBadge ? featuredBadge.name : "No Featured Badge Selected"}
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5 max-w-md">
                {featuredBadge
                  ? featuredBadge.description
                  : "Complete achievements and choose an earned medal to showcase beside your name across Chatty."}
              </p>
            </div>
          </div>

          {/* Visibility Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto bg-base-100 border border-base-300 rounded-2xl p-1.5 shadow-sm">
            <Eye className="w-4 h-4 text-base-content/60 ml-2" />
            <select
              value={badgeVisibility}
              onChange={(e) => updateVisibility(e.target.value)}
              className="select select-ghost select-sm text-xs font-medium focus:outline-none"
            >
              <option value="public">Public (Everyone)</option>
              <option value="contacts">Contacts Only</option>
              <option value="private">Private (Only Me)</option>
            </select>
          </div>
        </div>

        {/* 5-Column Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-base-300/60 text-center">
          <div>
            <div className="text-2xl font-black text-primary tabular-nums">
              {unlockedCount}
            </div>
            <div className="text-[11px] text-base-content/60 font-semibold uppercase tracking-wider mt-0.5">
              Earned Badges
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-warning tabular-nums">
              {inProgressCount}
            </div>
            <div className="text-[11px] text-base-content/60 font-semibold uppercase tracking-wider mt-0.5">
              In Progress
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-base-content tabular-nums">
              {totalCount}
            </div>
            <div className="text-[11px] text-base-content/60 font-semibold uppercase tracking-wider mt-0.5">
              Total Badges
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-500 tabular-nums">
              {completionPercent}%
            </div>
            <div className="text-[11px] text-base-content/60 font-semibold uppercase tracking-wider mt-0.5">
              Completion
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1 tabular-nums">
              <Flame className="size-5 text-amber-500 fill-amber-500" />
              {streakDays}d
            </div>
            <div className="text-[11px] text-base-content/60 font-semibold uppercase tracking-wider mt-0.5">
              Daily Streak
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION A — ACHIEVED BADGES CAROUSEL (Always visible on top of dashboard) */}
      <div className="rounded-3xl border border-base-300/80 bg-base-100 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4.5 text-amber-500" />
            <h3 className="text-sm sm:text-base font-extrabold text-base-content tracking-wide">
              Achieved Badges Collection
            </h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {myBadges.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              aria-label="Scroll left"
              className="p-1.5 rounded-xl border border-base-300 hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              aria-label="Scroll right"
              className="p-1.5 rounded-xl border border-base-300 hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {myBadges.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-base-300 bg-base-200/30">
            <Award className="size-8 text-base-content/30 mx-auto mb-2" />
            <p className="text-xs font-bold text-base-content">
              No medals unlocked yet
            </p>
            <p className="text-[11px] text-base-content/60 mt-0.5">
              Start chatting or explore the In Progress goals below to claim your first medal!
            </p>
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          >
            {myBadges.map((item) => {
              const b = item.badge || item;
              const isCurrentFeatured =
                featuredBadge?._id === b._id || featuredBadge?.slug === b.slug;

              return (
                <div
                  key={item._id || b.slug}
                  onClick={() => setSelectedBadge(b)}
                  className={`group/card flex flex-col items-center justify-between p-3.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer shrink-0 w-32 sm:w-36 h-44 hover:shadow-md ${
                    isCurrentFeatured
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-base-200/40 border-base-300 hover:border-primary/40 hover:bg-base-200/70"
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
                    {item.unlockedAt && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MAIN DASHBOARD TABS & FILTERS */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex p-1 rounded-2xl bg-base-200 border border-base-300 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("in_progress")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "in_progress"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <Target className="size-3.5 text-warning" />
              In Progress ({activeInProgress.length})
            </button>
            <button
              onClick={() => setActiveTab("achieved")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "achieved"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <Trophy className="size-3.5 text-amber-500" />
              My Badges ({myBadges.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <Award className="size-3.5 text-primary" />
              All Achievements ({catalog.length || achievements.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "admin"
                    ? "bg-warning text-warning-content shadow-sm"
                    : "text-warning hover:bg-warning/10"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                Admin Console
              </button>
            )}
          </div>

          {/* Quick Search */}
          {activeTab !== "admin" && (
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-base-content/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search achievements..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-base-100 border border-base-300 text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Filters Row (Rarity + Category) */}
        {activeTab !== "admin" && (
          <div className="flex flex-col gap-2.5 pt-1">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    categoryFilter === cat.id
                      ? "bg-base-content text-base-100 border-base-content"
                      : "bg-base-100 border-base-300 text-base-content/70 hover:bg-base-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Rarity Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {RARITY_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${
                    rarityFilter === r
                      ? "bg-primary text-primary-content border-primary"
                      : "bg-base-100 border-base-300 text-base-content/70 hover:bg-base-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. SECTION B — IN PROGRESS ACHIEVEMENTS (The Primary Focus Section) */}
      {activeTab === "in_progress" && (
        <div className="space-y-3.5">
          {achievementsLoading ? (
            <div className="py-16 text-center text-sm text-base-content/50">
              Loading your active achievements...
            </div>
          ) : activeInProgress.length === 0 ? (
            <div className="py-16 text-center text-sm text-base-content/50 rounded-3xl border border-dashed border-base-300 bg-base-100">
              <Sparkles className="size-8 text-primary/40 mx-auto mb-2" />
              <p className="font-bold text-base-content">
                No active goals matching your filters
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                All achievements in this category are completed or check "All Achievements" to explore!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeInProgress.map((ach) => {
                const isCompleted = Boolean(ach.isUnlocked || ach.progress?.isCompleted);
                const target = ach.targetProgress ?? ach.criteria?.threshold ?? ach.criteria?.target ?? ach.progress?.target ?? 1;
                const current = isCompleted ? target : (ach.currentProgress ?? ach.progress?.current ?? 0);
                const percent = isCompleted ? 100 : (ach.percentage ?? ach.progress?.percent ?? (target > 0 ? Math.round((current / target) * 100) : 0));
                const isCurrentFeatured = featuredBadge?._id === ach._id || featuredBadge?.slug === ach.slug;

                return (
                  <AchievementCard
                    key={ach.slug}
                    badge={ach}
                    state={isCompleted ? "unlocked" : "in_progress"}
                    currentProgress={current}
                    targetProgress={target}
                    percentage={percent}
                    isFeatured={isCurrentFeatured}
                    onClick={() => setSelectedBadge(ach)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SECTION C — MY ACHIEVED BADGES GRID */}
      {activeTab === "achieved" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-base-content/50">
              Loading earned badges...
            </div>
          ) : activeEarned.length === 0 ? (
            <div className="py-16 text-center text-sm text-base-content/50 rounded-3xl border border-dashed border-base-300 bg-base-100">
              <Award className="size-8 text-base-content/30 mx-auto mb-2" />
              <p className="font-bold text-base-content">No earned medals match this filter</p>
              <p className="text-xs text-base-content/60 mt-0.5">
                Try selecting "All Categories" or complete goals in "In Progress"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activeEarned.map((item) => {
                const b = item.badge || item;
                const isCurrentFeatured =
                  featuredBadge?._id === b._id || featuredBadge?.slug === b.slug;
                const target = b.criteria?.threshold ?? b.criteria?.target ?? 1;

                return (
                  <AchievementCard
                    key={item._id || b.slug}
                    badge={b}
                    state="unlocked"
                    currentProgress={target}
                    targetProgress={target}
                    percentage={100}
                    unlockedAt={item.unlockedAt || b.unlockedAt}
                    isFeatured={isCurrentFeatured}
                    onClick={() => setSelectedBadge(b)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. SECTION D — ALL ACHIEVEMENTS COLLECTION */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeAll.map((b) => {
              const isOwned = earnedBadgeIds.has(b._id) || earnedBadgeIds.has(b.slug);
              const matchedAch = achievements.find((a) => a.slug === b.slug || a._id === b._id);
              const target = b.criteria?.threshold ?? b.criteria?.target ?? b.targetProgress ?? matchedAch?.targetProgress ?? 1;
              const current = isOwned ? target : (matchedAch?.currentProgress ?? 0);
              const percent = isOwned ? 100 : (matchedAch?.percentage ?? (target > 0 ? Math.round((current / target) * 100) : 0));
              const state = isOwned ? "unlocked" : current > 0 ? "in_progress" : "locked";
              const isCurrentFeatured = featuredBadge?._id === b._id || featuredBadge?.slug === b.slug;
              const earnedRecord = myBadges.find((m) => (m.badge?._id === b._id || m.badge?.slug === b.slug || m.badgeSlug === b.slug));

              return (
                <AchievementCard
                  key={b.slug}
                  badge={b}
                  state={state}
                  currentProgress={current}
                  targetProgress={target}
                  percentage={percent}
                  unlockedAt={earnedRecord?.unlockedAt || b.unlockedAt}
                  isFeatured={isCurrentFeatured}
                  onClick={() => setSelectedBadge(b)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 7. SECTION E — ADMIN CONSOLE (For Admins Only) */}
      {activeTab === "admin" && isAdmin && (
        <div className="space-y-6">
          {/* Sub-panel 1: Award / Revoke */}
          <div className="p-5 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <UserCheck className="size-4 text-primary" />
              Manual Badge Award & Revocation
            </h3>
            <p className="text-xs text-base-content/60">
              Directly grant or revoke an achievement medal from any registered user account with audit logging.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Recipient User ID *
                </label>
                <input
                  type="text"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  placeholder="e.g. 64b8f... or user MongoDB _id"
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Badge *
                </label>
                <select
                  value={adminSelectedBadge}
                  onChange={(e) => setAdminSelectedBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                >
                  <option value="">Select a badge...</option>
                  {catalog.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name} ({b.rarity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Audit Reason
                </label>
                <input
                  type="text"
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="Reason for manual action..."
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleAdminRevoke}
                disabled={adminActionLoading}
                className="btn btn-error btn-sm rounded-xl font-bold text-white flex items-center gap-1.5"
              >
                <UserX className="size-4" /> Revoke Badge
              </button>
              <button
                onClick={handleAdminAward}
                disabled={adminActionLoading}
                className="btn btn-success btn-sm rounded-xl font-bold text-white flex items-center gap-1.5"
              >
                <UserCheck className="size-4" /> Award Badge
              </button>
            </div>
          </div>

          {/* Sub-panel 2: Create Custom Badge */}
          <form
            onSubmit={handleCreateBadge}
            className="p-5 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <PlusCircle className="size-4 text-emerald-500" />
              Create Custom Badge Definition
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Badge Name *
                </label>
                <input
                  type="text"
                  value={newBadgeName}
                  onChange={(e) => {
                    setNewBadgeName(e.target.value);
                    if (!newBadgeSlug) {
                      setNewBadgeSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                    }
                  }}
                  placeholder="e.g. Community Hero"
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={newBadgeSlug}
                  onChange={(e) => setNewBadgeSlug(e.target.value)}
                  placeholder="community_hero"
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Category
                </label>
                <select
                  value={newBadgeCat}
                  onChange={(e) => setNewBadgeCat(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                >
                  <option value="official">Official</option>
                  <option value="admin_awarded">Admin Awarded</option>
                  <option value="special_event">Special Event</option>
                  <option value="activity">Activity</option>
                  <option value="community">Community</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Rarity
                </label>
                <select
                  value={newBadgeRarity}
                  onChange={(e) => setNewBadgeRarity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                >
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                  <option value="mythic">Mythic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newBadgeDesc}
                  onChange={(e) => setNewBadgeDesc(e.target.value)}
                  placeholder="What is this badge awarded for?"
                  className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                    Icon / Emblem
                  </label>
                  <input
                    type="text"
                    value={newBadgeIcon}
                    onChange={(e) => setNewBadgeIcon(e.target.value)}
                    placeholder="Award or Lucide Icon"
                    className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-base-content/70 block mb-1">
                    Coin Reward
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newBadgeCoins}
                    onChange={(e) => setNewBadgeCoins(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 text-base-content focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm rounded-xl font-bold px-6"
              >
                Create Badge
              </button>
            </div>
          </form>

          {/* Sub-panel 3: Audit Logs */}
          <div className="p-5 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <History className="size-4 text-base-content/60" />
              Administrative Audit Logs
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-base-content/50 py-4 text-center">
                No administrative badge actions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs w-full text-base-content">
                  <thead>
                    <tr className="border-b border-base-300 text-base-content/60">
                      <th>Action</th>
                      <th>Badge</th>
                      <th>Target User</th>
                      <th>Admin</th>
                      <th>Reason</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="border-b border-base-300/40">
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.action === "manual_award"
                                ? "bg-success/15 text-success"
                                : log.action === "manual_revoke"
                                  ? "bg-error/15 text-error"
                                  : "bg-primary/15 text-primary"
                            }`}
                          >
                            {log.action?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="font-semibold">{log.badgeSlug || log.badgeId?.name}</td>
                        <td>{log.userId?.fullName || log.userId?.username || String(log.userId || "")}</td>
                        <td>{log.adminId?.fullName || "Admin"}</td>
                        <td className="text-base-content/70 italic">{log.reason || "—"}</td>
                        <td className="text-base-content/50">
                          {new Date(log.createdAt).toLocaleDateString()}{" "}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. BADGE DETAIL MODAL */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          isOwned={
            earnedBadgeIds.has(selectedBadge._id) ||
            earnedBadgeIds.has(selectedBadge.slug)
          }
          isFeatured={
            featuredBadge?._id === selectedBadge._id ||
            featuredBadge?.slug === selectedBadge.slug
          }
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}
