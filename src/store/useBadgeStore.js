import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useBadgeStore = create((set, get) => ({
  catalog: [],
  categories: [],
  myBadges: [],
  achievements: [],
  achieved: [],
  inProgress: [],
  stats: {
    totalBadges: 0,
    unlockedCount: 0,
    inProgressCount: 0,
    completionPercentage: 0,
    totalCompletionPercent: 0,
    streak: 1,
    activityStreak: 1,
    featuredBadge: null,
    badgeVisibility: "public",
  },
  userBadgesMap: {}, // userId -> { badges: [], featuredBadge: null }
  featuredBadge: null,
  badgeVisibility: "public",
  loading: false,
  achievementsLoading: false,
  selectedBadge: null,
  unlockedCelebration: null, // { badge, rewardCoins }

  // Admin audit state
  auditLogs: [],
  auditLogsPagination: { page: 1, limit: 20, total: 0, totalPages: 1 },

  setSelectedBadge: (badge) => set({ selectedBadge: badge }),
  setUnlockedCelebration: (item) => set({ unlockedCelebration: item }),
  dismissCelebration: () => set({ unlockedCelebration: null }),

  fetchCatalog: async () => {
    try {
      const res = await axiosInstance.get("/badges");
      if (res.data?.success) {
        set({
          catalog: res.data.data.badges || [],
          categories: res.data.data.categories || [],
        });
      }
    } catch (err) {
      console.error("fetchCatalog error:", err);
    }
  },

  fetchMyBadges: async () => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get("/badges/my");
      if (res.data?.success) {
        set({
          myBadges: res.data.data.badges || [],
          featuredBadge: res.data.data.featuredBadge || null,
          badgeVisibility: res.data.data.badgeVisibility || "public",
        });
      }
    } catch (err) {
      console.error("fetchMyBadges error:", err);
    } finally {
      set({ loading: false });
    }
  },

  fetchMyAchievements: async () => {
    set({ achievementsLoading: true });
    try {
      const res = await axiosInstance.get("/badges/achievements");
      if (res.data?.success) {
        const rawAchievements = res.data.data.achievements || [];
        const achieved = res.data.data.achieved || rawAchievements.filter((a) => a.isUnlocked);
        const inProgress = res.data.data.inProgress || rawAchievements.filter((a) => !a.isUnlocked);
        set({
          achievements: rawAchievements,
          achieved,
          inProgress,
          stats: res.data.data.stats || get().stats,
          featuredBadge: res.data.data.stats?.featuredBadge || get().featuredBadge,
          badgeVisibility: res.data.data.stats?.badgeVisibility || get().badgeVisibility,
        });
      }
    } catch (err) {
      console.error("fetchMyAchievements error:", err);
    } finally {
      set({ achievementsLoading: false });
    }
  },

  fetchUserBadges: async (userId) => {
    if (!userId) return null;
    try {
      const res = await axiosInstance.get(`/badges/user/${userId}`);
      if (res.data?.success) {
        const data = res.data.data;
        set((state) => ({
          userBadgesMap: {
            ...state.userBadgesMap,
            [userId]: data,
          },
        }));
        return data;
      }
    } catch (err) {
      console.error(`fetchUserBadges for ${userId} error:`, err);
    }
    return null;
  },

  setFeaturedBadge: async (badgeId) => {
    try {
      const targetId = badgeId || "none";
      const res = await axiosInstance.post(`/badges/featured/${targetId}`);
      if (res.data?.success) {
        const newFeatured = res.data.data.featuredBadge || null;
        set((state) => ({
          featuredBadge: newFeatured,
          stats: {
            ...state.stats,
            featuredBadge: newFeatured,
          },
        }));
        toast.success(
          newFeatured
            ? `Featured badge updated to "${newFeatured.name}"`
            : "Featured badge cleared",
        );
        return true;
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update featured badge";
      toast.error(msg);
      return false;
    }
  },

  updateVisibility: async (visibility) => {
    try {
      const res = await axiosInstance.patch("/badges/visibility", { visibility });
      if (res.data?.success) {
        set((state) => ({
          badgeVisibility: visibility,
          stats: { ...state.stats, badgeVisibility: visibility },
        }));
        toast.success(`Badge visibility set to ${visibility}`);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update visibility");
      return false;
    }
  },

  handleRealtimeUnlock: (payload) => {
    if (!payload?.badge) return;
    set((state) => {
      const exists = state.myBadges.some(
        (b) => b.badge?.slug === payload.badge.slug || b.badge?._id === payload.badge._id,
      );
      const updatedMyBadges = exists
        ? state.myBadges
        : [
            {
              _id: payload.userBadge?._id || `ub-${Date.now()}`,
              badge: payload.badge,
              badgeSlug: payload.badge.slug,
              isFeatured: false,
              unlockedAt: payload.unlockedAt || new Date().toISOString(),
            },
            ...state.myBadges,
          ];

      return {
        myBadges: updatedMyBadges,
        unlockedCelebration: {
          badge: payload.badge,
          rewardCoins: payload.rewardCoins || 0,
        },
      };
    });
  },

  handleRealtimeProgress: (progressData) => {
    if (!progressData?.badgeSlug) return;
    const current = progressData.current ?? progressData.currentProgress ?? 0;
    const target = progressData.target ?? progressData.targetProgress ?? 1;
    const percent = progressData.percent ?? progressData.percentage ?? (target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0);
    const isCompleted = progressData.isCompleted ?? (current >= target);

    set((state) => {
      const nextAchievements = state.achievements.map((ach) => {
        if (ach.slug === progressData.badgeSlug) {
          return {
            ...ach,
            currentProgress: current,
            targetProgress: target,
            percentage: percent,
            isUnlocked: isCompleted,
            progress: {
              current,
              target,
              percent,
              isCompleted,
            },
          };
        }
        return ach;
      });
      return { achievements: nextAchievements };
    });
  },

  fetchAuditLogs: async (page = 1) => {
    try {
      const res = await axiosInstance.get("/badges/admin/audit-logs", { params: { page } });
      if (res.data?.success) {
        set({
          auditLogs: res.data.data.logs || [],
          auditLogsPagination: res.data.data.pagination || get().auditLogsPagination,
        });
      }
    } catch (err) {
      console.error("fetchAuditLogs error:", err);
    }
  },

  adminAwardBadge: async ({ userId, badgeSlug, reason }) => {
    try {
      const res = await axiosInstance.post("/badges/admin/award", { userId, badgeSlug, reason });
      if (res.data?.success) {
        toast.success("Badge awarded successfully!");
        get().fetchAuditLogs();
        get().fetchCatalog();
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to award badge");
      return false;
    }
  },

  adminRevokeBadge: async ({ userId, badgeSlug, reason }) => {
    try {
      const res = await axiosInstance.post("/badges/admin/revoke", { userId, badgeSlug, reason });
      if (res.data?.success) {
        toast.success("Badge revoked successfully.");
        get().fetchAuditLogs();
        get().fetchCatalog();
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke badge");
      return false;
    }
  },

  adminCreateBadge: async (badgeData) => {
    try {
      const res = await axiosInstance.post("/badges/admin/create", badgeData);
      if (res.data?.success) {
        toast.success(`Badge "${badgeData.name}" created!`);
        get().fetchCatalog();
        get().fetchAuditLogs();
        return res.data.data;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create badge");
      return null;
    }
  },
}));
