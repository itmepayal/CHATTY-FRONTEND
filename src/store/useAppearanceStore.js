import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";
import { THEME } from "../constants/index.js";

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
  density: new Set(["comfortable", "compact", "cozy"]),
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
  appearance: { ...APPEARANCE_DEFAULTS, theme: getCachedTheme() },
  isLoading: false,
  isSaving: false,

  fetchAppearance: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/appearance", {
        withCredentials: true,
      });
      const data = res?.data?.data?.appearance ?? res?.data?.data ?? {};
      if (data.density === "cozy") data.density = "comfortable";
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

  setAppearance: async (key, value) => {
    let normalized = value;
    if (key === "density" && normalized === "cozy") {
      normalized = "comfortable";
    }
    if (!VALID_VALUES[key]?.has(normalized)) return;

    const revision = ++revisions[key];

    set({ appearance: { ...get().appearance, [key]: normalized } });
    if (key === "theme") applyTheme(normalized);

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      const res = await queueSave(key, normalized);
      const saved = res?.data?.data?.appearance ?? res?.data?.data ?? {};
      if (revisions[key] === revision) {
        const savedVal = saved[key] === "cozy" ? "comfortable" : (saved[key] ?? normalized);
        confirmedAppearance = {
          ...confirmedAppearance,
          [key]: savedVal,
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

  resetAppearance: async () => {
    Object.keys(revisions).forEach((k) => revisions[k]++);

    const previous = { ...confirmedAppearance };
    const defaults = { ...APPEARANCE_DEFAULTS };
    set({ appearance: defaults });
    applyTheme(defaults.theme);

    pendingSaves += 1;
    set({ isSaving: true });
    try {
      const res = await axiosInstance.patch("/users/appearance", defaults);
      const saved = res?.data?.data?.appearance ?? res?.data?.data ?? {};
      confirmedAppearance = { ...defaults, ...saved };
      set({ appearance: confirmedAppearance });
      applyTheme(confirmedAppearance.theme);
    } catch (err) {
      confirmedAppearance = previous;
      set({ appearance: previous });
      applyTheme(previous.theme);
      toast.error(err?.response?.data?.message || "Couldn't reset appearance.");
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
      set({ isSaving: pendingSaves > 0 });
    }
  },

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
    document.documentElement.setAttribute("data-theme", theme);
  },

  initFromUser: (user) => {
    if (!user) return;

    const rawTheme = user.theme ?? user.appearanceTheme;
    if (rawTheme === undefined) {
      get().fetchAppearance();
      return;
    }

    const rawFontSize = user.fontSize ?? user.appearanceFontSize;
    const rawBubbleStyle = user.bubbleStyle ?? user.appearanceBubbleStyle;
    const rawDensity = user.density ?? user.appearanceDensity;
    const rawTimestamps = user.showTimestamps ?? user.appearanceTimestamps;
    const rawTimeFormat = user.timeFormat ?? user.appearanceTimeFormat;

    const normalizedDensity =
      rawDensity === "cozy" ? "comfortable" : rawDensity;

    const merged = {
      theme: VALID_THEMES.has(rawTheme)
        ? rawTheme
        : APPEARANCE_DEFAULTS.theme,
      fontSize: VALID_VALUES.fontSize.has(rawFontSize)
        ? rawFontSize
        : APPEARANCE_DEFAULTS.fontSize,
      bubbleStyle: VALID_VALUES.bubbleStyle.has(rawBubbleStyle)
        ? rawBubbleStyle
        : APPEARANCE_DEFAULTS.bubbleStyle,
      density: VALID_VALUES.density.has(normalizedDensity)
        ? (normalizedDensity === "cozy" ? "comfortable" : normalizedDensity)
        : APPEARANCE_DEFAULTS.density,
      showTimestamps: rawTimestamps !== false,
      timeFormat: VALID_VALUES.timeFormat.has(rawTimeFormat)
        ? rawTimeFormat
        : APPEARANCE_DEFAULTS.timeFormat,
    };
    confirmedAppearance = merged;
    set({ appearance: merged });
    applyTheme(merged.theme);
  },
}));
