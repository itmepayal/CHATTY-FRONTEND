import { create } from "zustand";
import { persist } from "zustand/middleware";

// NOTE: appearance options (theme, fontSize, bubbleStyle, density,
// showTimestamps, timeFormat) live in useAppearanceStore (backend-authoritative).
// enterToSend / largeEmoji / autoScroll live in useChatPrefsStore.
// showOnlineStatus / readReceipts / typingIndicator live in usePrivacyStore.
export const SETTINGS_DEFAULTS = {
  messageSound: true,
  soundVolume: 60,
  desktopNotifications: false,
  messagePreview: true,

  aiEnabled: true,
  aiDefaultTone: "friendly",
  aiShowChanges: true,

  reduceMotion: false,
};

// Keys that used to be stored here and must be dropped from old localStorage data.
const LEGACY_KEYS = [
  "fontSize",
  "bubbleStyle",
  "density",
  "showTimestamps",
  "timeFormat",
  "enterToSend",
  "largeEmoji",
  "autoScroll",
];

export const useSettingsStore = create(
  persist(
    (set) => ({
      settings: SETTINGS_DEFAULTS,

      setSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),

      resetSettings: () => set({ settings: SETTINGS_DEFAULTS }),
    }),
    {
      name: "chatty-settings",
      version: 2,
      migrate: (persisted) => {
        const old = { ...(persisted?.settings || {}) };
        LEGACY_KEYS.forEach((k) => delete old[k]);
        return { settings: { ...SETTINGS_DEFAULTS, ...old } };
      },
      merge: (persisted, current) => {
        const saved = { ...(persisted?.settings || {}) };
        LEGACY_KEYS.forEach((k) => delete saved[k]);
        return { ...current, settings: { ...SETTINGS_DEFAULTS, ...saved } };
      },
    },
  ),
);
