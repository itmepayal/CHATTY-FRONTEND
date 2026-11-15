import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";

export const NOTIFICATION_SETTINGS_DEFAULTS = {
  soundEnabled: true,
  soundVolume: 60,
  desktopNotifications: false,
  showPreview: true,
};

let debounceTimer = null;
let pendingVolumeValue = null;
let inFlightUpdateCount = 0;

export const useNotificationSettingsStore = create((set, get) => ({
  settings: { ...NOTIFICATION_SETTINGS_DEFAULTS },
  loading: false,
  saving: false,
  error: null,
  isLoaded: false,

  /**
   * Initializes settings from authenticated user object.
   */
  initFromUser: (userData) => {
    const ns = userData?.notificationSettings || userData || {};
    set((state) => ({
      settings: {
        soundEnabled:
          ns.soundEnabled !== undefined
            ? Boolean(ns.soundEnabled)
            : state.settings.soundEnabled,
        soundVolume:
          typeof ns.soundVolume === "number" && !Number.isNaN(ns.soundVolume)
            ? Math.max(0, Math.min(100, Math.round(ns.soundVolume)))
            : state.settings.soundVolume,
        desktopNotifications:
          ns.desktopNotifications !== undefined
            ? Boolean(ns.desktopNotifications)
            : state.settings.desktopNotifications,
        showPreview:
          ns.showPreview !== undefined
            ? Boolean(ns.showPreview)
            : state.settings.showPreview,
      },
      isLoaded: true,
    }));
  },

  /**
   * Loads settings from backend API.
   */
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get("/settings/notifications");
      const data = res?.data?.settings || res?.data?.data || {};
      set({
        settings: {
          soundEnabled:
            data.soundEnabled !== undefined
              ? Boolean(data.soundEnabled)
              : NOTIFICATION_SETTINGS_DEFAULTS.soundEnabled,
          soundVolume:
            typeof data.soundVolume === "number" && !Number.isNaN(data.soundVolume)
              ? Math.max(0, Math.min(100, Math.round(data.soundVolume)))
              : NOTIFICATION_SETTINGS_DEFAULTS.soundVolume,
          desktopNotifications:
            data.desktopNotifications !== undefined
              ? Boolean(data.desktopNotifications)
              : NOTIFICATION_SETTINGS_DEFAULTS.desktopNotifications,
          showPreview:
            data.showPreview !== undefined
              ? Boolean(data.showPreview)
              : NOTIFICATION_SETTINGS_DEFAULTS.showPreview,
        },
        loading: false,
        isLoaded: true,
      });
    } catch (err) {
      console.warn("[notificationSettings] fetch error:", err?.message);
      set({ loading: false, error: err?.message || "Failed to load notification settings" });
    }
  },

  /**
   * Updates a single setting with optimistic UI update and server persistence.
   * Debounces soundVolume by 400ms.
   */
  updateSetting: async (key, value) => {
    const current = get().settings;
    if (current[key] === value) return;

    // Handle debounced volume slider
    if (key === "soundVolume") {
      pendingVolumeValue = value;
      // Optimistic update immediately
      set((state) => ({
        settings: { ...state.settings, soundVolume: value },
      }));

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        const valToPersist = pendingVolumeValue;
        pendingVolumeValue = null;
        debounceTimer = null;

        await get().persistPartial({ soundVolume: valToPersist }, { soundVolume: current.soundVolume });
      }, 400);

      return;
    }

    // Direct optimistic update for booleans
    const previous = { ...current };
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));

    await get().persistPartial({ [key]: value }, previous);
  },

  /**
   * Updates multiple settings at once.
   */
  updateSettings: async (partialSettings) => {
    const previous = { ...get().settings };
    set((state) => ({
      settings: { ...state.settings, ...partialSettings },
    }));

    await get().persistPartial(partialSettings, previous);
  },

  /**
   * Core persistence helper with automatic rollback on server error.
   */
  persistPartial: async (partial, rollbackState) => {
    inFlightUpdateCount++;
    set({ saving: true, error: null });

    try {
      const res = await axiosInstance.patch("/settings/notifications", partial);
      const updated = res?.data?.settings || res?.data?.data || partial;

      set((state) => ({
        settings: { ...state.settings, ...updated },
      }));
    } catch (err) {
      console.error("[notificationSettings] update failed:", err?.message);
      // Rollback to previous state
      set((state) => ({
        settings: { ...state.settings, ...rollbackState },
        error: err?.response?.data?.message || err?.message || "Failed to save setting",
      }));
      toast.error(err?.response?.data?.message || "Failed to update notification setting");
    } finally {
      inFlightUpdateCount = Math.max(0, inFlightUpdateCount - 1);
      if (inFlightUpdateCount === 0) {
        set({ saving: false });
      }
    }
  },

  /**
   * Handles real-time socket updates from other devices/tabs.
   */
  handleSocketUpdate: (payload) => {
    const incoming = payload?.settings || payload;
    if (!incoming || typeof incoming !== "object") return;

    set((state) => ({
      settings: {
        soundEnabled:
          incoming.soundEnabled !== undefined
            ? Boolean(incoming.soundEnabled)
            : state.settings.soundEnabled,
        soundVolume:
          typeof incoming.soundVolume === "number" && !Number.isNaN(incoming.soundVolume)
            ? Math.max(0, Math.min(100, Math.round(incoming.soundVolume)))
            : state.settings.soundVolume,
        desktopNotifications:
          incoming.desktopNotifications !== undefined
            ? Boolean(incoming.desktopNotifications)
            : state.settings.desktopNotifications,
        showPreview:
          incoming.showPreview !== undefined
            ? Boolean(incoming.showPreview)
            : state.settings.showPreview,
      },
    }));
  },

  /**
   * Resets settings to defaults and cancels any pending debounced timers.
   */
  resetSettings: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingVolumeValue = null;
    inFlightUpdateCount = 0;

    set({
      settings: { ...NOTIFICATION_SETTINGS_DEFAULTS },
      loading: false,
      saving: false,
      error: null,
      isLoaded: false,
    });
  },
}));

// Preferred interface requested by prompt
export const useNotificationSettings = useNotificationSettingsStore;

export default useNotificationSettingsStore;
