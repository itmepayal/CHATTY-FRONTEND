import { create } from "zustand";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { useAppLockStore } from "./useAppLockStore.js";
import { axiosInstance, setUnlockTokenProvider } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useChatLockStore = create((set, get) => ({
  unlockedInSession: new Set(),
  unlockTokens: {}, // { [chatId]: token, app: token }
  activeLockModalChatId: null,

  reset: () => {
    set({
      unlockedInSession: new Set(),
      unlockTokens: {},
      activeLockModalChatId: null,
    });
  },

  lockAll: () => {
    set({
      unlockedInSession: new Set(),
      unlockTokens: {},
    });
    try {
      import("./useChatStore.js").then(({ useChatStore }) => {
        useChatStore.setState({ messages: [] });
      });
    } catch {}
  },

  getUnlockToken: (chatId) => {
    const tokens = get().unlockTokens;
    if (chatId && tokens[String(chatId)]) {
      return tokens[String(chatId)];
    }
    if (tokens["app"]) {
      return tokens["app"];
    }
    const appLockToken = useAppLockStore.getState?.().unlockToken;
    return appLockToken || null;
  },

  openUnlockModal: (chatId) => {
    set({ activeLockModalChatId: chatId ? String(chatId) : null });
  },

  closeUnlockModal: () => {
    set({ activeLockModalChatId: null });
  },

  getChatLockStatus: (chatId) => {
    if (!chatId) return "unavailable";
    const privacyState = usePrivacyStore.getState();
    if (privacyState.isLoading || privacyState.isSaving) return "loading";

    const cid = String(chatId);
    const lockedChats = (privacyState.privacy?.lockedChats || []).map(String);
    return lockedChats.includes(cid) ? "active" : "inactive";
  },

  isChatLocked: (chatId) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const lockedChats = (
      usePrivacyStore.getState().privacy?.lockedChats || []
    ).map(String);
    if (!lockedChats.includes(cid)) return false;
    return !get().unlockedInSession.has(cid);
  },

  isChatLockConfigured: (chatId) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const lockedChats = (
      usePrivacyStore.getState().privacy?.lockedChats || []
    ).map(String);
    return lockedChats.includes(cid);
  },

  unlockChatWithPin: async (chatId, pin) => {
    const cid = chatId ? String(chatId) : "app";
    try {
      const res = await axiosInstance.post("/users/lock/verify", {
        pin,
        chatId: cid !== "app" ? cid : undefined,
        scope: cid,
      });

      const unlockToken = res.data?.data?.unlockToken;
      set((state) => {
        const nextTokens = { ...state.unlockTokens, [cid]: unlockToken };
        const nextUnlocked = new Set(state.unlockedInSession);
        if (cid !== "app") nextUnlocked.add(cid);
        return {
          unlockTokens: nextTokens,
          unlockedInSession: nextUnlocked,
          activeLockModalChatId: null,
        };
      });

      // If scope is "app", also unlock useAppLockStore
      if (cid === "app") {
        useAppLockStore.setState({
          isLocked: false,
          isUnlockedThisSession: true,
          unlockToken,
        });
      }

      return true;
    } catch (err) {
      const msg = err.response?.data?.message || "Incorrect PIN";
      toast.error(msg);
      return false;
    }
  },

  lockChatAgain: (chatId) => {
    const cid = String(chatId);
    set((state) => {
      const next = new Set(state.unlockedInSession);
      next.delete(cid);
      const nextTokens = { ...state.unlockTokens };
      delete nextTokens[cid];
      return { unlockedInSession: next, unlockTokens: nextTokens };
    });

    try {
      import("./useChatStore.js").then(({ useChatStore }) => {
        const chatStore = useChatStore.getState();
        if (
          chatStore.selectedUser &&
          String(chatStore.selectedUser.id ?? chatStore.selectedUser._id) === cid
        ) {
          useChatStore.setState({ messages: [] });
        }
      });
    } catch {}
  },

  enableLockWithPin: async (chatId, pin) => {
    if (!chatId) return false;
    const cid = String(chatId);

    const isServerConfigured = Boolean(
      usePrivacyStore.getState().privacy?.appLockEnabled,
    );
    if (!isServerConfigured) {
      toast.error(
        "Please configure an App Lock PIN in Settings > Privacy first.",
      );
      return false;
    }

    // Verify PIN first
    const unlocked = await get().unlockChatWithPin(cid, pin);
    if (!unlocked) return false;

    const current = (usePrivacyStore.getState().privacy?.lockedChats || []).map(
      String,
    );
    const updated = [...new Set([...current, cid])];

    const ok = await usePrivacyStore
      .getState()
      .updateExceptions("lockedChats", updated);
    if (ok) {
      toast.success("Conversation locked. PIN required after leaving.");
      return true;
    }
    return false;
  },

  disableLockWithPin: async (chatId, pin) => {
    if (!chatId) return false;
    const cid = String(chatId);

    const current = (usePrivacyStore.getState().privacy?.lockedChats || []).map(
      String,
    );
    const updated = current.filter((id) => id !== cid);

    // Removing from lockedChats requires step-up auth (PIN)
    try {
      await usePrivacyStore.getState().setPrivacy({
        lockedChats: updated,
        pin,
      });

      set((state) => {
        const next = new Set(state.unlockedInSession);
        next.delete(cid);
        const nextTokens = { ...state.unlockTokens };
        delete nextTokens[cid];
        return { unlockedInSession: next, unlockTokens: nextTokens };
      });
      toast.success("Conversation unlocked.");
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to unlock conversation.";
      toast.error(msg);
      return false;
    }
  },

  toggleLock: async (chatId) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const current = (usePrivacyStore.getState().privacy?.lockedChats || []).map(
      String,
    );
    const isCurrentlyLocked = current.includes(cid);

    if (isCurrentlyLocked) {
      // Unlocking strictly requires PIN step-up auth modal
      get().openUnlockModal(cid);
      return false;
    } else {
      // Enabling lock
      const isConfigured = Boolean(
        usePrivacyStore.getState().privacy?.appLockEnabled,
      );
      if (!isConfigured) {
        toast.error(
          "Please configure an App Lock PIN in Settings > Privacy first.",
        );
        return false;
      }
      get().openUnlockModal(cid);
      return false;
    }
  },
}));

// Wire up Axios request interceptor token provider
setUnlockTokenProvider((config) => {
  let chatId = null;
  const matchMsg = config.url?.match(/\/messages\/([a-f0-9]{24})/i);
  const matchGrp = config.url?.match(/\/groups\/([a-f0-9]{24})/i);
  if (matchMsg) chatId = matchMsg[1];
  else if (matchGrp) chatId = matchGrp[1];
  return useChatLockStore.getState().getUnlockToken(chatId);
});

// Listen for 423 CHAT_LOCKED event from Axios response interceptor
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("chatty:chat-locked", (event) => {
    const chatId = event.detail?.chatId;
    if (chatId) {
      useChatLockStore.getState().openUnlockModal(chatId);
    }
  });

  window.addEventListener("chatty:session-revoked", () => {
    useChatLockStore.getState().reset();
  });
}
