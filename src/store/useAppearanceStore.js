import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { THEME } from "../constants";

const VALID_THEMES = new Set(THEME);

export const APPEARANCE_DEFAULTS = {
  theme: "light",
  fontSize: "md",
  bubbleStyle: "rounded",
  density: "comfortable",
  showTimestamps: true,
  timeFormat: "12h",
};

const VALID_VALUES = {
  theme: VALID_THEMES,
  fontSize: new Set(["sm", "md", "lg"]),
  bubbleStyle: new Set(["rounded", "soft", "sharp"]),
  density: new Set(["comfortable", "compact"]),
  showTimestamps: new Set([true, false]),
  timeFormat: new Set(["12h", "24h"]),
};

const THEME_CACHE_KEY = "chatty-theme";

// Last used theme from localStorage (falls back to default if missing/invalid)
const getCachedTheme = () => {
  try {
    const t = localStorage.getItem(THEME_CACHE_KEY);
    return VALID_THEMES.has(t) ? t : APPEARANCE_DEFAULTS.theme;
  } catch {
    return APPEARANCE_DEFAULTS.theme;
  }
};

const revisions = Object.fromEntries(
  Object.keys(APPEARANCE_DEFAULTS).map((key) => [key, 0]),
);
const saveQueues = Object.create(null);
let confirmedAppearance = { ...APPEARANCE_DEFAULTS, theme: getCachedTheme() };
let pendingSaves = 0;

export const applyTheme = (theme) => {
  if (!VALID_THEMES.has(theme)) return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {}
};

const queueSave = (key, value) => {
  const request = (saveQueues[key] ?? Promise.resolve())
    .catch(() => {})
    .then(() => axiosInstance.patch("/users/appearance", { [key]: value }));
  saveQueues[key] = request;
  return request;
};

export const useAppearanceStore = create((set, get) => ({
  // Start from the cached theme so logout / login / landing never flash "light"
  appearance: { ...APPEARANCE_DEFAULTS, theme: getCachedTheme() },
  isLoading: false,
  isSaving: false,

  fetchAppearance: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/appearance", {
        withCredentials: true,
      });
      const data = res?.data?.data ?? {};
      const merged = { ...APPEARANCE_DEFAULTS, ...data };
      confirmedAppearance = merged;
      set({ appearance: merged });
      applyTheme(merged.theme);
    } catch (err) {
      console.error("[appearance] fetch failed:", err?.message);
    } finally {
      set({ isLoading: false });
    }
  },

  /** Persist one preference. Optimistic; reverts to the last confirmed value on failure. */
  setAppearance: async (key, value) => {
    if (!VALID_VALUES[key]?.has(value)) return;

    const revision = ++revisions[key];

    set({ appearance: { ...get().appearance, [key]: value } });
    if (key === "theme") applyTheme(value);

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      const res = await queueSave(key, value);
      const saved = res?.data?.data ?? {};
      if (revisions[key] === revision) {
        confirmedAppearance = {
          ...confirmedAppearance,
          [key]: saved[key] ?? value,
        };
        const appearance = {
          ...get().appearance,
          [key]: confirmedAppearance[key],
        };
        set({ appearance });
        if (key === "theme") applyTheme(appearance.theme);
      }
    } catch (err) {
      if (revisions[key] === revision) {
        const appearance = {
          ...get().appearance,
          [key]: confirmedAppearance[key],
        };
        set({ appearance });
        if (key === "theme") applyTheme(appearance.theme);
        toast.error(
          err?.response?.data?.message || "Failed to save appearance setting.",
        );
      }
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
      set({ isSaving: pendingSaves > 0 });
    }
  },

  /** Restore every appearance option to its default, locally and on the server. */
  resetAppearance: async () => {
    Object.keys(revisions).forEach((k) => revisions[k]++);

    const defaults = { ...APPEARANCE_DEFAULTS };
    set({ appearance: defaults });
    applyTheme(defaults.theme);

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      await Promise.all(
        Object.entries(defaults).map(([k, v]) => queueSave(k, v)),
      );
      confirmedAppearance = { ...defaults };
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't reset appearance.");
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
      set({ isSaving: pendingSaves > 0 });
    }
  },

  /**
   * Local-only reset (logout / delete account). Does NOT call the server.
   * Keeps the cached theme and does NOT overwrite localStorage.
   */
  reset: () => {
    Object.keys(revisions).forEach((k) => revisions[k]++);
    Object.keys(saveQueues).forEach((k) => delete saveQueues[k]);
    const theme = getCachedTheme();
    confirmedAppearance = { ...APPEARANCE_DEFAULTS, theme };
    pendingSaves = 0;
    set({
      appearance: { ...APPEARANCE_DEFAULTS, theme },
      isSaving: false,
      isLoading: false,
    });
    // Do not use applyTheme here: it would write to the cache.
    document.documentElement.setAttribute("data-theme", theme);
  },

  /** Bootstrap from authUser (login / register / checkAuth / 2FA). */
  initFromUser: (user) => {
    if (!user) return;

    // Server response had no appearance fields -> don't overwrite the real
    // saved theme with defaults; load it from the server instead.
    if (user.appearanceTheme === undefined) {
      get().fetchAppearance();
      return;
    }

    const merged = {
      theme: VALID_THEMES.has(user.appearanceTheme)
        ? user.appearanceTheme
        : APPEARANCE_DEFAULTS.theme,
      fontSize: VALID_VALUES.fontSize.has(user.appearanceFontSize)
        ? user.appearanceFontSize
        : APPEARANCE_DEFAULTS.fontSize,
      bubbleStyle: VALID_VALUES.bubbleStyle.has(user.appearanceBubbleStyle)
        ? user.appearanceBubbleStyle
        : APPEARANCE_DEFAULTS.bubbleStyle,
      density: VALID_VALUES.density.has(user.appearanceDensity)
        ? user.appearanceDensity
        : APPEARANCE_DEFAULTS.density,
      showTimestamps: user.appearanceTimestamps !== false,
      timeFormat: VALID_VALUES.timeFormat.has(user.appearanceTimeFormat)
        ? user.appearanceTimeFormat
        : APPEARANCE_DEFAULTS.timeFormat,
    };
    confirmedAppearance = merged;
    set({ appearance: merged });
    applyTheme(merged.theme);
  },
}));
