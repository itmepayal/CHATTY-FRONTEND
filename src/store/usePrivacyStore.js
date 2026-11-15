import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const PRIVACY_BOOL_KEYS = [
  "showOnlineStatus",
  "readReceipts",
  "typingIndicator",
];

export const PRIVACY_VIS_KEYS = [
  "lastSeenVisibility",
  "onlineStatusVisibility",
  "profilePhotoVisibility",
  "aboutVisibility",
  "groupAddPermission",
];

export const VALID_VISIBILITY = ["everyone", "contacts", "nobody"];

export const DEFAULT_PRIVACY = {
  showOnlineStatus: true,
  onlineStatusVisibility: "everyone",
  readReceipts: true,
  typingIndicator: true,
  lastSeenVisibility: "contacts",
  profilePhotoVisibility: "everyone",
  aboutVisibility: "contacts",
  groupAddPermission: "contacts",
};

export const cleanPrivacy = (p = {}) => {
  const onlineStatusVisibility =
    p.onlineStatusVisibility ??
    (p.showOnlineStatus === false ? "nobody" : "everyone");
  return {
    showOnlineStatus: onlineStatusVisibility !== "nobody",
    onlineStatusVisibility,
    readReceipts: p.readReceipts !== false,
    typingIndicator: p.typingIndicator !== false,
    lastSeenVisibility: p.lastSeenVisibility ?? "contacts",
    profilePhotoVisibility: p.profilePhotoVisibility ?? "everyone",
    aboutVisibility: p.aboutVisibility ?? "contacts",
    groupAddPermission: p.groupAddPermission ?? "contacts",
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
      set({ privacy: cleanPrivacy(data) });
    } catch (err) {
      console.error("[privacy] fetch failed:", err?.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setPrivacy: async (key, value) => {
    const isBool = PRIVACY_BOOL_KEYS.includes(key);
    const isVis = PRIVACY_VIS_KEYS.includes(key);

    if (!isBool && !isVis) return;
    if (isBool && typeof value !== "boolean") return;
    if (isVis && !VALID_VISIBILITY.includes(value)) return;

    if (get().isSaving) return;

    const prev = get().privacy;
    if (prev[key] === value) return;

    const next = { ...prev, [key]: value };

    // Optimistic update
    set({ privacy: next, isSaving: true });

    try {
      const res = await axiosInstance.patch("/users/privacy", { [key]: value });
      const saved = res?.data?.data ?? {};
      set({ privacy: cleanPrivacy(saved) });

      const socket = useAuthStore.getState().socket;
      if (socket?.connected) {
        socket.emit("privacy:update");
      }
    } catch (err) {
      set({ privacy: prev });
      toast.error(
        err?.response?.data?.message || "Failed to save privacy setting.",
      );
    } finally {
      set({ isSaving: false });
    }
  },

  updateMultiplePrivacy: async (updates = {}) => {
    const valid = {};
    for (const [k, v] of Object.entries(updates)) {
      if (PRIVACY_BOOL_KEYS.includes(k) && typeof v === "boolean") {
        valid[k] = v;
      } else if (PRIVACY_VIS_KEYS.includes(k) && VALID_VISIBILITY.includes(v)) {
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
    const next = cleanPrivacy(user);
    set({ privacy: next });
    if (next.typingIndicator === false) {
      // If typing indicator was disabled on another device, stop any typing locally
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
