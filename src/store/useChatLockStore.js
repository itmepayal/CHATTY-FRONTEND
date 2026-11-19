import { create } from "zustand";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { useAppLockStore } from "./useAppLockStore.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useChatLockStore = create((set, get) => ({
  unlockedInSession: new Set(),
  activeLockModalChatId: null,

  reset: () => {
    set({
      unlockedInSession: new Set(),
      activeLockModalChatId: null,
    });
  },

  openUnlockModal: (chatId) => {
    set({ activeLockModalChatId: chatId });
  },

  closeUnlockModal: () => {
    set({ activeLockModalChatId: null });
  },

  getChatLockStatus: (chatId) => {
    if (!chatId) return "unavailable";
    const privacyState = usePrivacyStore.getState();
    if (privacyState.isLoading || privacyState.isSaving) return "loading";

    const isAppLockConfigured = Boolean(
      useAppLockStore.getState().isConfigured,
    );
    if (!isAppLockConfigured) return "inactive";

    const cid = String(chatId);
    const lockedChats = (privacyState.privacy?.lockedChats || []).map(String);
    return lockedChats.includes(cid) ? "active" : "inactive";
  },

  isChatLocked: (chatId) => {
    if (!chatId) return false;
    const isAppLockConfigured = Boolean(
      useAppLockStore.getState().isConfigured,
    );
    if (!isAppLockConfigured) return false;

    const cid = String(chatId);
    const lockedChats = (
      usePrivacyStore.getState().privacy.lockedChats || []
    ).map(String);
    if (!lockedChats.includes(cid)) return false;
    return !get().unlockedInSession.has(cid);
  },

  isChatLockConfigured: (chatId) => {
    if (!chatId) return false;
    const isAppLockConfigured = Boolean(
      useAppLockStore.getState().isConfigured,
    );
    if (!isAppLockConfigured) return false;

    const cid = String(chatId);
    const lockedChats = (
      usePrivacyStore.getState().privacy.lockedChats || []
    ).map(String);
    return lockedChats.includes(cid);
  },

  unlockChatWithPin: async (chatId, pin) => {
    const success = await useAppLockStore.getState().unlock(pin);
    if (success) {
      set((state) => {
        const next = new Set(state.unlockedInSession);
        next.add(String(chatId));
        return { unlockedInSession: next, activeLockModalChatId: null };
      });
      return true;
    }
    return false;
  },

  lockChatAgain: (chatId) => {
    set((state) => {
      const next = new Set(state.unlockedInSession);
      next.delete(String(chatId));
      return { unlockedInSession: next };
    });
  },

  enableLockWithPin: async (chatId, pin) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const isAppLockConfigured = Boolean(
      useAppLockStore.getState().isConfigured,
    );
    if (!isAppLockConfigured) {
      toast.error(
        "Please configure an App Lock PIN in Settings > Privacy first.",
      );
      return false;
    }

    const success = await useAppLockStore.getState().unlock(pin);
    if (!success) {
      return false;
    }

    const current = (usePrivacyStore.getState().privacy.lockedChats || []).map(
      String,
    );
    const updated = [...new Set([...current, cid])];

    const ok = await usePrivacyStore
      .getState()
      .updateExceptions("lockedChats", updated);
    if (ok) {
      set((state) => {
        const next = new Set(state.unlockedInSession);
        next.add(cid);
        return { unlockedInSession: next };
      });
      toast.success("Conversation locked. PIN required after leaving.");
      return true;
    }
    return false;
  },

  disableLockWithPin: async (chatId, pin) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const success = await useAppLockStore.getState().unlock(pin);
    if (!success) {
      return false;
    }

    const current = (usePrivacyStore.getState().privacy.lockedChats || []).map(
      String,
    );
    const updated = current.filter((id) => id !== cid);

    const ok = await usePrivacyStore
      .getState()
      .updateExceptions("lockedChats", updated);
    if (ok) {
      set((state) => {
        const next = new Set(state.unlockedInSession);
        next.delete(cid);
        return { unlockedInSession: next };
      });
      toast.success("Conversation unlocked.");
      return true;
    }
    return false;
  },

  toggleLock: async (chatId, { skipAuth = false } = {}) => {
    if (!chatId) return false;
    const cid = String(chatId);
    const current = (usePrivacyStore.getState().privacy.lockedChats || []).map(
      String,
    );
    const isCurrentlyLocked = current.includes(cid);

    if (!isCurrentlyLocked) {
      // Enabling lock: strictly require App Lock PIN configured on this device
      const isAppLockConfigured = Boolean(
        useAppLockStore.getState().isConfigured,
      );
      if (!isAppLockConfigured) {
        toast.error(
          "Please configure an App Lock PIN in Settings > Privacy first.",
        );
        return false;
      }

      const updated = [...new Set([...current, cid])];
      const ok = await usePrivacyStore
        .getState()
        .updateExceptions("lockedChats", updated);
      if (ok) {
        set((state) => {
          const next = new Set(state.unlockedInSession);
          next.add(cid);
          return { unlockedInSession: next };
        });
        toast.success("Conversation locked. PIN required after leaving.");
        return true;
      }
      return false;
    } else {
      // Disabling lock
      const updated = current.filter((id) => id !== cid);
      const ok = await usePrivacyStore
        .getState()
        .updateExceptions("lockedChats", updated);
      if (ok) {
        set((state) => {
          const next = new Set(state.unlockedInSession);
          next.delete(cid);
          return { unlockedInSession: next };
        });
        toast.success("Conversation unlocked.");
        return true;
      }
      return false;
    }
  },
}));
