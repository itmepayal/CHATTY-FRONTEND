import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const NOTIFICATION_SETTINGS_DEFAULTS = {
  soundEnabled: true,
  soundVolume: 60,
  desktopNotifications: false,
  showPreview: true,
};

export const NOTIFICATION_PREFERENCES_DEFAULTS = {
  messagesPersonal: true,
  messagesGroup: true,
  messageReplies: true,
  messageMentions: true,
  messageReactions: true,
  mediaNotifications: true,
  callsVoice: true,
  callsVideo: true,
  callsMissed: true,
  callsGroup: true,
  contactRequests: true,
  contactAcceptance: true,
  groupInvitations: true,
  groupMembershipEvents: true,
  securityNewDevice: true,
  securityDeviceLinking: true,
  securityCredentialChanges: true,
  securityE2EEAlerts: true,
  systemAnnouncements: true,
  systemMaintenance: true,
  systemAlerts: true,
  dndEnabled: false,
  dndUntil: null,
  mutedConversations: [],
  mutedGroups: [],
};

let debounceTimer = null;
let pendingVolumeValue = null;
let inFlightUpdateCount = 0;

export const useNotificationSettingsStore = create((set, get) => ({
  settings: { ...NOTIFICATION_SETTINGS_DEFAULTS },
  preferences: { ...NOTIFICATION_PREFERENCES_DEFAULTS },
  loading: false,
  saving: false,
  error: null,
  isLoaded: false,

  /**
   * Initializes settings and preferences from authenticated user object.
   */
  initFromUser: (userData) => {
    const ns = userData?.notificationSettings || {};
    const np = userData?.notificationPreferences || {};
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
      preferences: {
        ...state.preferences,
        ...np,
      },
      isLoaded: true,
    }));
  },

  /**
   * Loads settings and preferences from backend API.
   */
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get("/settings/notifications");
      const data = res?.data?.settings || res?.data?.data || {};
      const prefs = res?.data?.preferences || {};

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
        preferences: {
          ...NOTIFICATION_PREFERENCES_DEFAULTS,
          ...prefs,
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

    if (key === "soundVolume") {
      pendingVolumeValue = value;
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
   * Updates granular notification category preferences or DND.
   */
  updatePreference: async (key, value) => {
    const current = get().preferences;
    if (current[key] === value) return;

    const previous = { ...current };
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
      saving: true,
    }));

    try {
      const res = await axiosInstance.patch("/settings/notifications/preferences", {
        [key]: value,
      });
      const updated = res?.data?.preferences || { [key]: value };
      set((state) => ({
        preferences: { ...state.preferences, ...updated },
        saving: false,
      }));
    } catch (err) {
      console.error("[notificationSettings] preference update failed:", err?.message);
      set({
        preferences: previous,
        saving: false,
        error: err?.response?.data?.message || "Failed to update preference",
      });
      toast.error("Failed to update notification preference");
    }
  },

  /**
   * Mutes a user or group conversation.
   */
  muteChat: async (targetId, type = "user") => {
    try {
      const res = await axiosInstance.post("/settings/notifications/mute", {
        targetId,
        type,
      });
      const updated = res?.data?.preferences;
      if (updated) {
        set((state) => ({ preferences: { ...state.preferences, ...updated } }));
      }
      toast.success(`${type === "group" ? "Group" : "Chat"} notifications muted`);
    } catch (err) {
      toast.error("Failed to mute notifications");
    }
  },

  /**
   * Unmutes a user or group conversation.
   */
  unmuteChat: async (targetId, type = "user") => {
    try {
      const res = await axiosInstance.delete("/settings/notifications/mute", {
        data: { targetId, type },
      });
      const updated = res?.data?.preferences;
      if (updated) {
        set((state) => ({ preferences: { ...state.preferences, ...updated } }));
      }
      toast.success(`${type === "group" ? "Group" : "Chat"} notifications unmuted`);
    } catch (err) {
      toast.error("Failed to unmute notifications");
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

  handleSocketPreferencesUpdate: (payload) => {
    const prefs = payload?.preferences;
    if (prefs && typeof prefs === "object") {
      set((state) => ({
        preferences: { ...state.preferences, ...prefs },
      }));
    }
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
      preferences: { ...NOTIFICATION_PREFERENCES_DEFAULTS },
      loading: false,
      saving: false,
      error: null,
      isLoaded: false,
    });
  },
}));

export const useNotificationSettings = useNotificationSettingsStore;
export default useNotificationSettingsStore;
