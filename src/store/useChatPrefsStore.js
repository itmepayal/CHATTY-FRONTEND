/**
 * useChatPrefsStore — backend-authoritative chat UI preferences.
 *
 * Three booleans mirror identical fields in the User MongoDB document:
 *   enterToSend  (default true)  — Enter sends, Shift+Enter newlines
 *   largeEmoji   (default true)  — emoji-only messages render large
 *   autoScroll   (default true)  — auto-scroll when near the bottom
 *
 * Pattern:
 *  • optimistic local update
 *  • PATCH to /users/chat-prefs
 *  • partial update safety (updating one key does not overwrite another)
 *  • revert key on failure
 *  • init from the authUser object (fetched on login / checkAuth)
 */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

const CHAT_PREF_KEYS = ["enterToSend", "largeEmoji", "autoScroll"];

export const DEFAULT_PREFS = {
  enterToSend: true,
  largeEmoji: true,
  autoScroll: true,
};

let pendingSaves = 0;

export const useChatPrefsStore = create((set, get) => ({
  prefs: DEFAULT_PREFS,
  isLoading: false,
  isSaving: false,

  /** Fetch from server. Called once when Settings page mounts. */
  fetchChatPrefs: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/chat-prefs");
      const data = res?.data?.data ?? {};
      set((state) => ({
        prefs: {
          enterToSend: data.enterToSend !== undefined ? Boolean(data.enterToSend) : state.prefs.enterToSend,
          largeEmoji: data.largeEmoji !== undefined ? Boolean(data.largeEmoji) : state.prefs.largeEmoji,
          autoScroll: data.autoScroll !== undefined ? Boolean(data.autoScroll) : state.prefs.autoScroll,
        },
      }));
    } catch (err) {
      console.error("[chatPrefs] fetch failed:", err?.message);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Persist one preference key.
   * Optimistically updates the store; reverts only that key on server failure.
   */
  setChatPref: async (key, value) => {
    if (!CHAT_PREF_KEYS.includes(key)) return;
    if (typeof value !== "boolean") return;

    const prevValue = get().prefs[key];

    // Optimistic update
    set((state) => ({ prefs: { ...state.prefs, [key]: value } }));

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      const res = await axiosInstance.patch("/users/chat-prefs", { [key]: value });
      const saved = res?.data?.data ?? {};
      if (saved[key] !== undefined) {
        set((state) => ({
          prefs: {
            ...state.prefs,
            [key]: Boolean(saved[key]),
          },
        }));
      }
    } catch (err) {
      // Revert only the failed key
      set((state) => ({
        prefs: {
          ...state.prefs,
          [key]: prevValue,
        },
      }));
      toast.error(err?.response?.data?.message || "Failed to save chat preference.");
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
      set({ isSaving: pendingSaves > 0 });
    }
  },

  /** Batch update multiple preferences simultaneously */
  setChatPrefs: async (updates) => {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) return;

    const validUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (CHAT_PREF_KEYS.includes(k) && typeof v === "boolean") {
        validUpdates[k] = v;
      }
    }
    if (!Object.keys(validUpdates).length) return;

    const prevPrefs = { ...get().prefs };
    set((state) => ({ prefs: { ...state.prefs, ...validUpdates } }));

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      const res = await axiosInstance.patch("/users/chat-prefs", validUpdates);
      const saved = res?.data?.data ?? {};
      set((state) => ({
        prefs: {
          ...state.prefs,
          ...saved,
        },
      }));
    } catch (err) {
      set({ prefs: prevPrefs });
      toast.error(err?.response?.data?.message || "Failed to save chat preferences.");
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
      set({ isSaving: pendingSaves > 0 });
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

  /** Clean reset (used on logout) */
  reset: () => {
    pendingSaves = 0;
    set({ prefs: DEFAULT_PREFS, isLoading: false, isSaving: false });
  },
}));
