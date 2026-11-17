import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

const BASE = "/calls";

export const useCallHistoryStore = create((set, get) => ({
  calls: [],
  isLoading: false,
  isViewingCalls: false,
  _subscribed: false,
  _socketHandlers: null,

  setViewingCalls: (isViewing) => {
    const viewing = Boolean(isViewing);
    set({ isViewingCalls: viewing });
    if (
      viewing &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      get().markCallsAsSeen();
    }
  },

  fetchCalls: async (limit = 50) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`${BASE}/history`, {
        params: { limit },
      });
      set({ calls: res.data?.data ?? [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load call history");
    } finally {
      set({ isLoading: false });
    }
  },

  markCallsAsSeen: async ({ callerId = null, callIds = null } = {}) => {
    // Avoid marking as seen while tab is hidden
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    const prevCalls = get().calls;
    const hasUnseen = prevCalls.some((c) => {
      if (c.direction !== "incoming" || c.seen) return false;
      const otherId = String(c.user?.id || c.callerId || "");
      if (callerId && otherId !== String(callerId)) return false;
      if (Array.isArray(callIds) && callIds.length > 0) {
        return callIds.some((id) => String(id) === String(c.id || c._id));
      }
      return true;
    });

    if (!hasUnseen) return;

    // Optimistic update: mark all matching incoming calls as seen
    const nowIso = new Date().toISOString();
    set({
      calls: prevCalls.map((c) => {
        if (c.direction !== "incoming" || c.seen) return c;
        const otherId = String(c.user?.id || c.callerId || "");
        if (callerId && otherId !== String(callerId)) return c;
        if (Array.isArray(callIds) && callIds.length > 0) {
          const match = callIds.some((id) => String(id) === String(c.id || c._id));
          if (!match) return c;
        }
        return { ...c, seen: true, seenAt: nowIso };
      }),
    });

    try {
      await axiosInstance.patch(`${BASE}/mark-seen`, { callerId, callIds });
    } catch (err) {
      console.error("[callHistory] failed to mark calls as seen, reverting:", err);
      // Revert optimistic update on failure
      set({ calls: prevCalls });
    }
  },

  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket || get()._subscribed) return;

    const onCallEnded = async () => {
      await get().fetchCalls();
      if (
        get().isViewingCalls &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        get().markCallsAsSeen();
      }
    };

    const onMissedCleared = ({ callerId } = {}) => {
      set((s) => ({
        calls: s.calls.map((c) => {
          if (c.direction !== "incoming" || c.seen) return c;
          const otherId = String(c.user?.id || c.callerId || "");
          if (callerId && otherId !== String(callerId)) return c;
          return { ...c, seen: true };
        }),
      }));
    };

    socket.on("call:ended", onCallEnded);
    socket.on("call:missed:cleared", onMissedCleared);

    set({
      _subscribed: true,
      _socketHandlers: { onCallEnded, onMissedCleared },
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    const handlers = get()._socketHandlers;
    if (socket && handlers) {
      socket.off("call:ended", handlers.onCallEnded);
      socket.off("call:missed:cleared", handlers.onMissedCleared);
    }
    set({ _subscribed: false, _socketHandlers: null });
  },

  clear: () => set({ calls: [], isLoading: false, isViewingCalls: false }),
}));
