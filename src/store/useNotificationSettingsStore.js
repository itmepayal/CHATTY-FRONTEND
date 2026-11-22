import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const NOTIFICATION_SETTINGS_DEFAULTS = {
  masterEnabled: true,
  soundEnabled: true,
  soundVolume: 60,
  desktopNotifications: false,
  showPreview: true,
  inAppNotifications: true,
  pushNotifications: true,
  previewPrivacy: "full", // "full" | "sender_only" | "hidden"
  vibrationEnabled: true,
  ringtone: "default",
};

const getDetectedTimezone = () => {
  try {
    return (
      (typeof Intl !== "undefined" &&
        Intl.DateTimeFormat &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "UTC"
    );
  } catch {
    return "UTC";
  }
};

export const NOTIFICATION_PREFERENCES_DEFAULTS = {
  masterEnabled: true,
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
  storiesReplies: true,
  storiesReactions: true,
  storiesMentions: true,
  storiesFavorites: true,
  securityNewDevice: true,
  securityDeviceLinking: true,
  securityCredentialChanges: true,
  securityE2EEAlerts: true,
  systemAnnouncements: true,
  systemMaintenance: true,
  systemAlerts: true,
  dndEnabled: false,
  dndUntil: null,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  quietHoursDays: [0, 1, 2, 3, 4, 5, 6],
  quietHoursTimezone: getDetectedTimezone(),
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
        ...state.settings,
        masterEnabled:
          ns.masterEnabled !== undefined
            ? Boolean(ns.masterEnabled)
            : state.settings.masterEnabled,
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
        inAppNotifications:
          ns.inAppNotifications !== undefined
            ? Boolean(ns.inAppNotifications)
            : state.settings.inAppNotifications,
        pushNotifications:
          ns.pushNotifications !== undefined
            ? Boolean(ns.pushNotifications)
            : state.settings.pushNotifications,
        previewPrivacy: ns.previewPrivacy || state.settings.previewPrivacy,
        vibrationEnabled:
          ns.vibrationEnabled !== undefined
            ? Boolean(ns.vibrationEnabled)
            : state.settings.vibrationEnabled,
        ringtone: ns.ringtone || state.settings.ringtone,
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
          masterEnabled:
            data.masterEnabled !== undefined
              ? Boolean(data.masterEnabled)
              : NOTIFICATION_SETTINGS_DEFAULTS.masterEnabled,
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
          inAppNotifications:
            data.inAppNotifications !== undefined
              ? Boolean(data.inAppNotifications)
              : NOTIFICATION_SETTINGS_DEFAULTS.inAppNotifications,
          pushNotifications:
            data.pushNotifications !== undefined
              ? Boolean(data.pushNotifications)
              : NOTIFICATION_SETTINGS_DEFAULTS.pushNotifications,
          previewPrivacy:
            data.previewPrivacy || NOTIFICATION_SETTINGS_DEFAULTS.previewPrivacy,
          vibrationEnabled:
            data.vibrationEnabled !== undefined
              ? Boolean(data.vibrationEnabled)
              : NOTIFICATION_SETTINGS_DEFAULTS.vibrationEnabled,
          ringtone: data.ringtone || NOTIFICATION_SETTINGS_DEFAULTS.ringtone,
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
      set({
        loading: false,
        error: err?.message || "Failed to load notification settings",
      });
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

        await get().persistPartial(
          { soundVolume: valToPersist },
          { soundVolume: current.soundVolume },
        );
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
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to save setting",
      }));
      toast.error(
        err?.response?.data?.message || "Failed to update notification setting",
      );
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
      const res = await axiosInstance.patch(
        "/settings/notifications/preferences",
        {
          [key]: value,
        },
      );
      const updated = res?.data?.preferences || { [key]: value };
      set((state) => ({
        preferences: { ...state.preferences, ...updated },
        saving: false,
      }));
    } catch (err) {
      console.error(
        "[notificationSettings] preference update failed:",
        err?.message,
      );
      set({
        preferences: previous,
        saving: false,
        error: err?.response?.data?.message || "Failed to update preference",
      });
      toast.error("Failed to update notification preference");
    }
  },

  /**
   * Updates multiple preferences at once.
   */
  updatePreferences: async (partialPreferences) => {
    const previous = { ...get().preferences };
    set((state) => ({
      preferences: { ...state.preferences, ...partialPreferences },
      saving: true,
    }));

    try {
      const res = await axiosInstance.patch(
        "/settings/notifications/preferences",
        partialPreferences,
      );
      const updated = res?.data?.preferences || partialPreferences;
      set((state) => ({
        preferences: { ...state.preferences, ...updated },
        saving: false,
      }));
    } catch (err) {
      console.error(
        "[notificationSettings] preference batch update failed:",
        err?.message,
      );
      set({
        preferences: previous,
        saving: false,
        error: err?.response?.data?.message || "Failed to update preferences",
      });
      toast.error("Failed to update notification preferences");
    }
  },

  /**
   * Master Toggle: enables or disables all notifications across the application.
   */
  toggleMasterNotifications: async (enabled) => {
    const previousSettings = { ...get().settings };
    const previousPreferences = { ...get().preferences };

    set((state) => ({
      settings: { ...state.settings, masterEnabled: enabled },
      preferences: { ...state.preferences, masterEnabled: enabled },
      saving: true,
    }));

    try {
      await Promise.all([
        axiosInstance.patch("/settings/notifications", {
          masterEnabled: enabled,
        }),
        axiosInstance.patch("/settings/notifications/preferences", {
          masterEnabled: enabled,
        }),
      ]);
      toast.success(
        enabled ? "All notifications enabled" : "All notifications paused",
      );
    } catch (err) {
      set({
        settings: previousSettings,
        preferences: previousPreferences,
        error: err?.message,
      });
      toast.error("Failed to update master notification toggle");
    } finally {
      set({ saving: false });
    }
  },

  enableAllNotifications: async () => {
    return get().toggleMasterNotifications(true);
  },

  disableAllNotifications: async () => {
    return get().toggleMasterNotifications(false);
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
      toast.success(
        `${type === "group" ? "Group" : "Chat"} notifications muted`,
      );
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
      toast.success(
        `${type === "group" ? "Group" : "Chat"} notifications unmuted`,
      );
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
        ...state.settings,
        ...incoming,
      },
    }));
  },

  handleSocketPreferencesUpdate: (payload) => {
    const prefs = payload?.preferences || payload;
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
