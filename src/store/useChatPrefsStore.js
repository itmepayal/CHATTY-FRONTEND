/**
 * useChatPrefsStore — backend-authoritative chat UI preferences.
 *
 * Three booleans mirror identical fields in the User MongoDB document:
 *   enterToSend  (default true)  — Enter sends, Shift+Enter newlines
 *   largeEmoji   (default true)  — emoji-only messages render large
 *   autoScroll   (default true)  — auto-scroll when near the bottom
 *
 * Pattern is identical to usePrivacyStore:
 *  • optimistic local update
 *  • PATCH to /users/chat-prefs
 *  • revert on failure
 *  • init from the authUser object (already fetched on login / checkAuth)
 */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";

const CHAT_PREF_KEYS = ["enterToSend", "largeEmoji", "autoScroll"];

const DEFAULT_PREFS = {
  enterToSend: true,
  largeEmoji: true,
  autoScroll: true,
};

export const useChatPrefsStore = create((set, get) => ({
  prefs: DEFAULT_PREFS,
  isLoading: false, // fetching on page load
  isSaving: false,  // persisting a change

  /** Fetch from server. Called once when the Settings > Chat page mounts. */
  fetchChatPrefs: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/chat-prefs");
      const data = res?.data?.data ?? {};
      set({
        prefs: {
          enterToSend: data.enterToSend !== false,
          largeEmoji: data.largeEmoji !== false,
          autoScroll: data.autoScroll !== false,
        },
      });
    } catch (err) {
      console.error("[chatPrefs] fetch failed:", err?.message);
      // Keep defaults — silent fallback
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Persist one preference key.
   * Optimistically updates the store; reverts on server failure.
   */
  setChatPref: async (key, value) => {
    if (!CHAT_PREF_KEYS.includes(key)) return;
    if (typeof value !== "boolean") return;

    const prev = get().prefs;
    const next = { ...prev, [key]: value };

    // Optimistic update
    set({ prefs: next });

    set({ isSaving: true });
    try {
      const res = await axiosInstance.patch("/users/chat-prefs", { [key]: value });
      const saved = res?.data?.data ?? {};
      // Accept server-confirmed values
      set({
        prefs: {
          enterToSend: saved.enterToSend !== false,
          largeEmoji: saved.largeEmoji !== false,
          autoScroll: saved.autoScroll !== false,
        },
      });
    } catch (err) {
      // Revert on failure
      set({ prefs: prev });
      toast.error(err?.response?.data?.message || "Failed to save chat preference.");
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Initialise from the authUser object (returned by login / checkAuth).
   * Called by useAuthStore so no extra network request is needed on first load.
   */
  initFromUser: (user) => {
    if (!user) return;
    set({
      prefs: {
        enterToSend: user.enterToSend !== false,
        largeEmoji: user.largeEmoji !== false,
        autoScroll: user.autoScroll !== false,
      },
    });
  },
}));
