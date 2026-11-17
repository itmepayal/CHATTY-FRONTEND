import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";
import { useAuthStore } from "./useAuthStore.js";

export const PRIVACY_BOOL_KEYS = [
  "showOnlineStatus",
  "readReceipts",
  "typingIndicator",
  "silenceUnknownCallers",
  "appLockEnabled",
];

export const PRIVACY_VIS_KEYS = [
  "lastSeenVisibility",
  "onlineStatusVisibility",
  "profilePhotoVisibility",
  "aboutVisibility",
  "statusVisibility",
  "groupAddPermission",
  "whoCanAddMeToGroups",
];

export const PRIVACY_ARRAY_KEYS = [
  "lastSeenExceptions",
  "profilePhotoExceptions",
  "aboutExceptions",
  "statusExceptions",
  "statusIncluded",
  "groupAddExceptions",
  "lockedChats",
];

export const VALID_VISIBILITY = [
  "everyone",
  "contacts",
  "contacts_except",
  "nobody",
  "same_as_last_seen",
  "only_share_with",
];

export const DEFAULT_PRIVACY = {
  showOnlineStatus: true,
  onlineStatusVisibility: "everyone",
  readReceipts: true,
  typingIndicator: true,
  silenceUnknownCallers: false,
  appLockEnabled: false,
  appLockTimeout: "immediately",
  appLockPinHash: null,
  lastSeenVisibility: "everyone",
  profilePhotoVisibility: "everyone",
  aboutVisibility: "everyone",
  statusVisibility: "contacts",
  groupAddPermission: "everyone",
  lastSeenExceptions: [],
  profilePhotoExceptions: [],
  aboutExceptions: [],
  statusExceptions: [],
  statusIncluded: [],
  groupAddExceptions: [],
  lockedChats: [],
};

const toList = (arr) => (Array.isArray(arr) ? arr.map(String) : []);

export const cleanPrivacy = (p = {}) => {
  const onlineStatusVisibility =
    p.onlineStatusVisibility ??
    (p.showOnlineStatus === false ? "nobody" : "everyone");
  return {
    showOnlineStatus: onlineStatusVisibility !== "nobody",
    onlineStatusVisibility,
    readReceipts: p.readReceipts !== false,
    typingIndicator: p.typingIndicator !== false,
    silenceUnknownCallers: Boolean(p.silenceUnknownCallers),
    appLockEnabled: Boolean(p.appLockEnabled),
    appLockTimeout: p.appLockTimeout || "immediately",
    appLockPinHash: p.appLockPinHash || null,
    lastSeenVisibility: p.lastSeenVisibility ?? "everyone",
    profilePhotoVisibility: p.profilePhotoVisibility ?? "everyone",
    aboutVisibility: p.aboutVisibility ?? "everyone",
    statusVisibility: p.statusVisibility ?? "contacts",
    groupAddPermission: p.groupAddPermission ?? "everyone",
    lastSeenExceptions: toList(p.lastSeenExceptions),
    profilePhotoExceptions: toList(p.profilePhotoExceptions),
    aboutExceptions: toList(p.aboutExceptions),
    statusExceptions: toList(p.statusExceptions),
    statusIncluded: toList(p.statusIncluded),
    groupAddExceptions: toList(p.groupAddExceptions),
    lockedChats: toList(p.lockedChats),
  };
};

export const usePrivacyStore = create((set, get) => ({
  privacy: DEFAULT_PRIVACY,
  isLoading: false,
  isSaving: false,

  fetchPrivacy: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/privacy");
      const data = res?.data?.data ?? {};
      const next = cleanPrivacy(data);
      set({ privacy: next });
      import("./useAppLockStore.js")
        .then(({ useAppLockStore }) => {
          const authUser = useAuthStore.getState().authUser;
          const uid = authUser?._id ?? authUser?.id;
          useAppLockStore.getState().initAppLock(next, uid ? String(uid) : undefined);
        })
        .catch(() => {});
    } catch (err) {
      console.error("[privacy] fetch failed:", err?.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setPrivacy: async (keyOrPatch, value) => {
    let patch = {};
    if (typeof keyOrPatch === "string") {
      patch = { [keyOrPatch]: value };
    } else if (typeof keyOrPatch === "object" && keyOrPatch !== null) {
      patch = { ...keyOrPatch };
    } else {
      return false;
    }

    if (get().isSaving) return false;

    const prev = get().privacy;
    const next = { ...prev, ...patch };
    set({ privacy: next, isSaving: true });

    try {
      const res = await axiosInstance.patch("/users/privacy", patch);
      const saved = res?.data?.data ?? {};
      set({ privacy: cleanPrivacy(saved) });

      const socket = useAuthStore.getState().socket;
      if (socket?.connected) {
        socket.emit("privacy:update");
      }
      return true;
    } catch (err) {
      set({ privacy: prev });
      toast.error(
        err?.response?.data?.message || "Failed to save privacy setting.",
      );
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  updateExceptions: async (key, ids = []) => {
    return get().setPrivacy(key, ids);
  },

  updateMultiplePrivacy: async (updates = {}) => {
    const valid = {};
    for (const [k, v] of Object.entries(updates)) {
      if (PRIVACY_BOOL_KEYS.includes(k) && typeof v === "boolean") {
        valid[k] = v;
      } else if (PRIVACY_VIS_KEYS.includes(k) && VALID_VISIBILITY.includes(v)) {
        valid[k] = v;
      } else if (PRIVACY_ARRAY_KEYS.includes(k) && Array.isArray(v)) {
        valid[k] = v;
      } else if (k === "appLockTimeout" || k === "appLockPinHash") {
        valid[k] = v;
      }
    }

    if (!Object.keys(valid).length) return;

    const prev = get().privacy;
    const next = { ...prev, ...valid };

    set({ privacy: next, isSaving: true });

    try {
      const res = await axiosInstance.patch("/users/privacy", valid);
      const saved = res?.data?.data ?? {};
      set({ privacy: cleanPrivacy(saved) });

      const socket = useAuthStore.getState().socket;
      if (socket?.connected) {
        socket.emit("privacy:update");
      }
    } catch (err) {
      set({ privacy: prev });
      toast.error(
        err?.response?.data?.message || "Failed to update privacy settings.",
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
      user.typingIndicator === undefined &&
      user.lastSeenVisibility === undefined
    ) {
      get().fetchPrivacy();
      return;
    }
    const current = get().privacy || {};
    const nextLocked =
      user.lockedChats !== undefined
        ? toList(user.lockedChats)
        : current.lockedChats || [];

    const next = cleanPrivacy({
      ...current,
      ...user,
      lockedChats: nextLocked,
    });
    set({ privacy: next });
    if (user.lockedChats === undefined) {
      get().fetchPrivacy();
    }
    import("./useAppLockStore.js")
      .then(({ useAppLockStore }) => {
        const authUser = useAuthStore.getState().authUser;
        const uid = authUser?._id ?? authUser?.id;
        useAppLockStore.getState().initAppLock(next, uid ? String(uid) : undefined);
      })
      .catch(() => {});
    if (next.typingIndicator === false) {
      import("./useChatStore.js")
        .then(({ useChatStore }) => {
          useChatStore.getState().emitTyping(false);
        })
        .catch(() => {});
      import("./useGroupStore.js")
        .then(({ useGroupStore }) => {
          useGroupStore.getState().emitTyping(false);
        })
        .catch(() => {});
    }
  },
}));
