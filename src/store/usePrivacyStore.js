import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

const PRIVACY_KEYS = ["showOnlineStatus", "readReceipts", "typingIndicator"];

const DEFAULT_PRIVACY = {
  showOnlineStatus: true,
  readReceipts: true,
  typingIndicator: true,
};

const cleanPrivacy = (p = {}) => ({
  showOnlineStatus: p.showOnlineStatus !== false,
  readReceipts: p.readReceipts !== false,
  typingIndicator: p.typingIndicator !== false,
});

export const usePrivacyStore = create((set, get) => ({
  privacy: DEFAULT_PRIVACY,
  isLoading: false, // fetching on page load
  isSaving: false, // currently persisting a change

  /** Fetch persisted values from the server. Called once on mount. */
  fetchPrivacy: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/privacy");
      const data = res?.data?.data ?? {};
      set({ privacy: cleanPrivacy(data) });
    } catch (err) {
      console.error("[privacy] fetch failed:", err?.message);
      // Keep defaults — do not toast; silent fallback
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Persist a single privacy key to the backend.
   * Optimistically updates the store, reverts on failure.
   *
   * ORDER MATTERS: pehle DB (PATCH), phir socket "privacy:update".
   * Server DB se dobara padhta hai, isliye emit DB save ke baad hona chahiye,
   * warna server purani value padh leta hai (race condition).
   */
  setPrivacy: async (key, value) => {
    if (!PRIVACY_KEYS.includes(key)) return;
    if (typeof value !== "boolean") return;

    const prev = get().privacy;
    const next = { ...prev, [key]: value };

    // Optimistic update
    set({ privacy: next });

    set({ isSaving: true });
    try {
      const res = await axiosInstance.patch("/users/privacy", { [key]: value });
      const saved = res?.data?.data ?? {};

      // Accept server-confirmed values
      set({ privacy: cleanPrivacy(saved) });

      // DB save ho chuka hai -> ab server ko batao (payload ki zaroorat nahi)
      const socket = useAuthStore.getState().socket;
      if (socket?.connected) socket.emit("privacy:update");
    } catch (err) {
      // Revert on failure (DB badla hi nahi, to socket ko kuch batane ki zaroorat nahi)
      set({ privacy: prev });
      toast.error(
        err?.response?.data?.message || "Failed to save privacy setting.",
      );
    } finally {
      set({ isSaving: false });
    }
  },

  initFromUser: (user) => {
    if (!user) return;

    if (
      user.readReceipts === undefined &&
      user.showOnlineStatus === undefined &&
      user.typingIndicator === undefined
    ) {
      get().fetchPrivacy();
      return;
    }

    set({ privacy: cleanPrivacy(user) });
  },
}));
