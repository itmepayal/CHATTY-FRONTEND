import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";
import {
  playMessageSound,
  triggerVibration,
} from "../services/notificationService.js";
import { useNotificationSettingsStore } from "./useNotificationSettingsStore.js";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  categoryCounts: {
    message: 0,
    group: 0,
    call: 0,
    contact: 0,
    story: 0,
    security: 0,
    system: 0,
  },
  loading: false,
  error: null,
  page: 1,
  limit: 20,
  totalPages: 1,
  categoryFilter: "all",
  activeTab: "all", // "all" | "unread"
  searchQuery: "",
  isDropdownOpen: false,
  isCenterModalOpen: false,

  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setCenterModalOpen: (open) => set({ isCenterModalOpen: open }),
  setCategoryFilter: (category) => {
    set({ categoryFilter: category, page: 1 });
    get().fetchNotifications({ category, page: 1 });
  },
  setActiveTab: (tab) => {
    set({ activeTab: tab, page: 1 });
    get().fetchNotifications({ unreadOnly: tab === "unread", page: 1 });
  },
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  fetchNotifications: async (overrides = {}) => {
    set({ loading: true, error: null });
    const { categoryFilter, activeTab, searchQuery, page, limit } = get();

    const category =
      overrides.category !== undefined ? overrides.category : categoryFilter;
    const unreadOnly =
      overrides.unreadOnly !== undefined
        ? overrides.unreadOnly
        : activeTab === "unread";
    const q = overrides.search !== undefined ? overrides.search : searchQuery;
    const p = overrides.page || page || 1;

    try {
      const params = {
        page: p,
        limit,
      };
      if (category && category !== "all") params.category = category;
      if (unreadOnly) params.unreadOnly = true;
      if (q && q.trim()) params.search = q.trim();

      const res = await axiosInstance.get("/notifications", { params });
      const data = res?.data?.data || res?.data || {};

      set({
        notifications: data.items || [],
        total: data.total || 0,
        page: data.page || p,
        totalPages: data.totalPages || 1,
        unreadCount: data.unreadCount ?? get().unreadCount,
        categoryCounts: {
          ...get().categoryCounts,
          ...(data.categoryCounts || {}),
        },
        loading: false,
      });
    } catch (err) {
      console.warn("[notificationStore] fetch error:", err?.message);
      set({
        loading: false,
        error: err?.message || "Failed to fetch notifications",
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await axiosInstance.get("/notifications/unread-count");
      const data = res?.data?.data || res?.data || {};
      set({
        unreadCount: data.count || 0,
        categoryCounts: {
          ...get().categoryCounts,
          ...(data.categoryCounts || {}),
        },
      });
    } catch (err) {
      console.warn("[notificationStore] fetchUnreadCount error:", err?.message);
    }
  },

  markAsRead: async (notificationId) => {
    if (!notificationId) return;

    // Optimistic local update
    set((state) => {
      const target = state.notifications.find(
        (n) => n.id === notificationId || n._id === notificationId,
      );
      if (!target || target.isRead) return state;

      const cat = target.category || "system";
      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId || n._id === notificationId
            ? { ...n, isRead: true }
            : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        categoryCounts: {
          ...state.categoryCounts,
          [cat]: Math.max(0, (state.categoryCounts[cat] || 1) - 1),
        },
      };
    });

    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
    } catch (err) {
      console.warn("[notificationStore] markAsRead error:", err?.message);
    }
  },

  markAsUnread: async (notificationId) => {
    if (!notificationId) return;

    // Optimistic local update
    set((state) => {
      const target = state.notifications.find(
        (n) => n.id === notificationId || n._id === notificationId,
      );
      if (!target || !target.isRead) return state;

      const cat = target.category || "system";
      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId || n._id === notificationId
            ? { ...n, isRead: false }
            : n,
        ),
        unreadCount: state.unreadCount + 1,
        categoryCounts: {
          ...state.categoryCounts,
          [cat]: (state.categoryCounts[cat] || 0) + 1,
        },
      };
    });

    try {
      await axiosInstance.patch(`/notifications/${notificationId}/unread`);
    } catch (err) {
      console.warn("[notificationStore] markAsUnread error:", err?.message);
    }
  },

  markAllAsRead: async (category = null) => {
    // Optimistic local update
    set((state) => {
      const isFiltered = category && category !== "all";
      const clearedCount = isFiltered
        ? state.categoryCounts[category] || 0
        : state.unreadCount;

      return {
        notifications: state.notifications.map((n) =>
          !isFiltered || n.category === category ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - clearedCount),
        categoryCounts: isFiltered
          ? { ...state.categoryCounts, [category]: 0 }
          : Object.keys(state.categoryCounts).reduce((acc, k) => {
              acc[k] = 0;
              return acc;
            }, {}),
      };
    });

    try {
      const params = category && category !== "all" ? { category } : {};
      await axiosInstance.patch("/notifications/read-all", {}, { params });
      toast.success("Marked notifications as read");
    } catch (err) {
      console.warn("[notificationStore] markAllAsRead error:", err?.message);
      toast.error("Failed to mark all as read");
    }
  },

  clearReadNotifications: async (category = null) => {
    // Optimistic clear read notifications
    set((state) => ({
      notifications: state.notifications.filter((n) => {
        if (!n.isRead) return true;
        if (category && category !== "all" && n.category !== category)
          return true;
        return false;
      }),
    }));

    try {
      const params = category && category !== "all" ? { category } : {};
      await axiosInstance.delete("/notifications/clear-read", { params });
      toast.success("Read notifications cleared");
    } catch (err) {
      console.warn(
        "[notificationStore] clearReadNotifications error:",
        err?.message,
      );
      toast.error("Failed to clear read notifications");
    }
  },

  deleteNotification: async (notificationId) => {
    if (!notificationId) return;

    const current = get().notifications.find(
      (n) => n.id === notificationId || n._id === notificationId,
    );
    const wasUnread = current && !current.isRead;
    const cat = current?.category || "system";

    // Optimistic removal
    set((state) => ({
      notifications: state.notifications.filter(
        (n) => n.id !== notificationId && n._id !== notificationId,
      ),
      unreadCount: wasUnread
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
      categoryCounts: wasUnread
        ? {
            ...state.categoryCounts,
            [cat]: Math.max(0, (state.categoryCounts[cat] || 1) - 1),
          }
        : state.categoryCounts,
    }));

    try {
      await axiosInstance.delete(`/notifications/${notificationId}`);
    } catch (err) {
      console.warn(
        "[notificationStore] deleteNotification error:",
        err?.message,
      );
      toast.error("Failed to delete notification");
    }
  },

  clearAllNotifications: async (category = null) => {
    // Optimistic clear
    set((state) => ({
      notifications:
        category && category !== "all"
          ? state.notifications.filter((n) => n.category !== category)
          : [],
      unreadCount:
        category && category !== "all"
          ? Math.max(
              0,
              state.unreadCount - (state.categoryCounts[category] || 0),
            )
          : 0,
      categoryCounts:
        category && category !== "all"
          ? { ...state.categoryCounts, [category]: 0 }
          : Object.keys(state.categoryCounts).reduce((acc, k) => {
              acc[k] = 0;
              return acc;
            }, {}),
    }));

    try {
      const params = category && category !== "all" ? { category } : {};
      await axiosInstance.delete("/notifications/clear-all", { params });
      toast.success("Notifications cleared");
    } catch (err) {
      console.warn(
        "[notificationStore] clearAllNotifications error:",
        err?.message,
      );
      toast.error("Failed to clear notifications");
    }
  },

  // Socket event binding
  bindSocketEvents: (socket) => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      const settingsStore = useNotificationSettingsStore.getState();
      const settings = settingsStore?.settings || {};
      const preferences = settingsStore?.preferences || {};

      const isSecurity = notification?.category === "security";
      const isMasterDisabled =
        settings.masterEnabled === false || preferences.masterEnabled === false;

      // In-app notifications list update
      if (settings.inAppNotifications !== false || isSecurity) {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
          categoryCounts: {
            ...state.categoryCounts,
            [notification.category]:
              (state.categoryCounts[notification.category] || 0) + 1,
          },
        }));
      }

      // Check sound and vibration if not silent
      if (!notification.silent) {
        const canAlert = !isMasterDisabled || isSecurity;

        if (canAlert && settings.soundEnabled) {
          playMessageSound({
            volume: settings.soundVolume,
            soundEnabled: true,
            masterEnabled: true,
            force: isSecurity,
          });
        }

        if (canAlert && settings.vibrationEnabled) {
          triggerVibration();
        }
      }
    };

    const handleCountUpdated = ({ count, categoryCounts }) => {
      set((state) => ({
        unreadCount: typeof count === "number" ? count : state.unreadCount,
        categoryCounts: categoryCounts
          ? { ...state.categoryCounts, ...categoryCounts }
          : state.categoryCounts,
      }));
    };

    const handleNotificationRead = ({ id }) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id || n._id === id ? { ...n, isRead: true } : n,
        ),
      }));
    };

    const handleNotificationUnread = ({ id }) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id || n._id === id ? { ...n, isRead: false } : n,
        ),
      }));
    };

    const handleNotificationDeleted = ({ id }) => {
      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n.id !== id && n._id !== id,
        ),
      }));
    };

    const handleNotificationCleared = ({ category }) => {
      set((state) => ({
        notifications:
          category && category !== "all"
            ? state.notifications.filter((n) => n.category !== category)
            : [],
      }));
    };

    socket.off("notification:new", handleNewNotification);
    socket.off("notification:count:updated", handleCountUpdated);
    socket.off("notification:read", handleNotificationRead);
    socket.off("notification:unread", handleNotificationUnread);
    socket.off("notification:deleted", handleNotificationDeleted);
    socket.off("notification:cleared", handleNotificationCleared);

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:count:updated", handleCountUpdated);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:unread", handleNotificationUnread);
    socket.on("notification:deleted", handleNotificationDeleted);
    socket.on("notification:cleared", handleNotificationCleared);
  },
}));
