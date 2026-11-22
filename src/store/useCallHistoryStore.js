import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

const BASE = "/calls";

export const useCallHistoryStore = create((set, get) => ({
  calls: [],
  isLoading: false,
  isViewingCalls: false,
  filter: "all", // all | missed | incoming | outgoing
  typeFilter: "all", // all | audio | video
  selectedCallIds: [],
  isSelectionMode: false,
  _subscribed: false,
  _socketHandlers: null,

  setFilter: (filter) => {
    set({ filter });
  },

  setTypeFilter: (typeFilter) => {
    set({ typeFilter });
  },

  setIsSelectionMode: (isSelectionMode) => {
    set({
      isSelectionMode,
      selectedCallIds: isSelectionMode ? get().selectedCallIds : [],
    });
  },

  enterSelectionMode: (initialCallId = null) => {
    const ids = initialCallId ? [String(initialCallId)] : [];
    set({ isSelectionMode: true, selectedCallIds: ids });
  },

  exitSelectionMode: () => {
    set({ isSelectionMode: false, selectedCallIds: [] });
  },

  toggleSelectCall: (callId) => {
    const cid = String(callId);
    const prev = get().selectedCallIds;
    const isSelected = prev.includes(cid);
    const next = isSelected ? prev.filter((id) => id !== cid) : [...prev, cid];
    set({
      selectedCallIds: next,
      isSelectionMode: next.length > 0 ? true : get().isSelectionMode,
    });
  },

  selectAllCalls: (callIds) => {
    const ids = Array.isArray(callIds)
      ? callIds.map(String)
      : get().calls.map((c) => String(c.id || c.callId));
    set({ selectedCallIds: Array.from(new Set(ids)), isSelectionMode: true });
  },

  deselectAllCalls: () => {
    set({ selectedCallIds: [] });
  },

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

  fetchCalls: async (params = {}) => {
    const limit = typeof params === "number" ? params : params.limit || 50;
    const { status, direction, type } = typeof params === "object" ? params : {};
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`${BASE}/history`, {
        params: { limit, status, direction, type },
      });
      set({ calls: res.data?.data ?? [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load call history");
    } finally {
      set({ isLoading: false });
    }
  },

  deleteCall: async (callId) => {
    const cid = String(callId);
    const prevCalls = get().calls;
    const prevSelected = get().selectedCallIds;
    // Optimistic removal matching either id or callId
    set({
      calls: prevCalls.filter(
        (c) => String(c.id) !== cid && String(c.callId) !== cid,
      ),
      selectedCallIds: prevSelected.filter((id) => id !== cid),
    });
    try {
      await axiosInstance.delete(`${BASE}/history/${callId}`);
      toast.success("Call removed from history");
    } catch (err) {
      console.error("[callHistory] failed to delete call:", err);
      set({ calls: prevCalls, selectedCallIds: prevSelected });
      toast.error("Failed to delete call entry");
    }
  },

  deleteBulkCalls: async (callIdsParam = null) => {
    const idsToDelete = (callIdsParam || get().selectedCallIds || []).map(String);
    if (!idsToDelete.length) return;

    const prevCalls = get().calls;
    const prevSelected = get().selectedCallIds;
    const prevSelectionMode = get().isSelectionMode;

    const idSet = new Set(idsToDelete);
    // Optimistic removal matching either id or callId
    set({
      calls: prevCalls.filter(
        (c) => !idSet.has(String(c.id)) && !idSet.has(String(c.callId)),
      ),
      selectedCallIds: [],
      isSelectionMode: false,
    });

    try {
      await axiosInstance.post(`${BASE}/history/bulk-delete`, {
        callIds: idsToDelete,
      });
      toast.success(`${idsToDelete.length} call${idsToDelete.length > 1 ? "s" : ""} removed`);
    } catch (err) {
      console.error("[callHistory] failed to bulk delete calls:", err);
      set({
        calls: prevCalls,
        selectedCallIds: prevSelected,
        isSelectionMode: prevSelectionMode,
      });
      toast.error("Failed to delete selected calls");
    }
  },

  clearAllCalls: async () => {
    const prevCalls = get().calls;
    const prevSelected = get().selectedCallIds;
    const prevSelectionMode = get().isSelectionMode;

    set({ calls: [], selectedCallIds: [], isSelectionMode: false });
    try {
      await axiosInstance.delete(`${BASE}/history`);
      toast.success("Call history cleared");
    } catch (err) {
      console.error("[callHistory] failed to clear calls:", err);
      set({
        calls: prevCalls,
        selectedCallIds: prevSelected,
        isSelectionMode: prevSelectionMode,
      });
      toast.error("Failed to clear call history");
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

    // Real-time synchronization events across user's devices
    const onHistoryDeleted = ({ callId } = {}) => {
      if (!callId) return;
      const cid = String(callId);
      set((s) => ({
        calls: s.calls.filter(
          (c) => String(c.id) !== cid && String(c.callId) !== cid,
        ),
        selectedCallIds: s.selectedCallIds.filter((id) => id !== cid),
      }));
    };

    const onHistoryBulkDeleted = ({ callIds } = {}) => {
      if (!Array.isArray(callIds) || !callIds.length) return;
      const setOfIds = new Set(callIds.map(String));
      set((s) => ({
        calls: s.calls.filter(
          (c) => !setOfIds.has(String(c.id)) && !setOfIds.has(String(c.callId)),
        ),
        selectedCallIds: s.selectedCallIds.filter((id) => !setOfIds.has(id)),
      }));
    };

    const onHistoryCleared = () => {
      set({ calls: [], selectedCallIds: [], isSelectionMode: false });
    };

    socket.on("call:ended", onCallEnded);
    socket.on("call:missed:cleared", onMissedCleared);
    socket.on("call:history:deleted", onHistoryDeleted);
    socket.on("call:history:bulk-deleted", onHistoryBulkDeleted);
    socket.on("call:history:cleared", onHistoryCleared);

    set({
      _subscribed: true,
      _socketHandlers: {
        onCallEnded,
        onMissedCleared,
        onHistoryDeleted,
        onHistoryBulkDeleted,
        onHistoryCleared,
      },
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    const handlers = get()._socketHandlers;
    if (socket && handlers) {
      socket.off("call:ended", handlers.onCallEnded);
      socket.off("call:missed:cleared", handlers.onMissedCleared);
      socket.off("call:history:deleted", handlers.onHistoryDeleted);
      socket.off("call:history:bulk-deleted", handlers.onHistoryBulkDeleted);
      socket.off("call:history:cleared", handlers.onHistoryCleared);
    }
    set({ _subscribed: false, _socketHandlers: null });
  },

  clear: () =>
    set({
      calls: [],
      isLoading: false,
      isViewingCalls: false,
      selectedCallIds: [],
      isSelectionMode: false,
    }),
}));
