import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";
import { io } from "socket.io-client";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { useAppLockStore } from "./useAppLockStore.js";
import { useChatLockStore } from "./useChatLockStore.js";
import { useChatPrefsStore } from "./useChatPrefsStore.js";
import { useAppearanceStore } from "./useAppearanceStore.js";
import { useNotificationSettings } from "./useNotificationSettingsStore.js";
import { initE2EE, clearE2EECache } from "../lib/e2ee.js";
import { e2eeManager } from "../lib/e2ee/e2eeManager.js";
import { SOCKET_URL } from "../config/env.config.js";

const extractUser = (res) => res?.data?.data?.user ?? res?.data?.data;

const seedPrefs = (user) => {
  usePrivacyStore.getState().initFromUser(user);
  useChatPrefsStore.getState().initFromUser(user);
  useAppearanceStore.getState().initFromUser(user);
  useNotificationSettings.getState().initFromUser(user);
};

const MAX_SERVER_DISCONNECT_RETRIES = 3;
let serverDisconnectRetries = 0;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigninUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,
  isUpdateProfile: false,
  isUpdatingAvatar: false,
  isChangingPassword: false,
  isFetchingUser: false,
  isDeletingAccount: false,
  onlineUsers: [],
  hiddenUsers: [],
  presenceMap: {},
  blockedUsersList: [],
  isFetchingBlocked: false,
  blockedFetchError: null,
  socket: null,

  twoFactorChallenge: null,
  isVerifyingTwoFactor: false,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check", {
        withCredentials: true,
      });
      const user = extractUser(res);
      set({ authUser: user });
      seedPrefs(user);
      get().connectSocket();
      get().fetchBlockedUsers();
      const uid = user?._id ?? user?.id;
      if (uid) {
        console.log("[E2EE] checkAuth: initializing encryption for user", uid);
        initE2EE(uid)
          .then((s) => console.log("[E2EE] checkAuth: status ->", s))
          .catch((e) =>
            console.error("[E2EE] checkAuth: init error:", e?.message),
          );
      }
    } catch (error) {
      console.log(error);
      set({ authUser: null });
      useAppLockStore.getState().reset?.();
      useChatLockStore.getState().reset?.();
      usePrivacyStore.getState().resetPrivacy?.();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  fetchCurrentUser: async () => {
    set({ isFetchingUser: true });
    try {
      const res = await axiosInstance.get("/users/me", {
        withCredentials: true,
      });
      const user = extractUser(res);
      if (user) {
        set((state) => ({
          authUser: state.authUser ? { ...state.authUser, ...user } : user,
        }));
      }
    } catch (error) {
      console.error("Fetch current user error:", error);
      toast.error(error?.response?.data?.message || "Failed to load profile.");
    } finally {
      set({ isFetchingUser: false });
    }
  },

  register: async (data) => {
    set({ isSigninUp: true });
    try {
      const res = await axiosInstance.post("/auth/register", data, {
        withCredentials: true,
      });
      const user = extractUser(res);
      set({ authUser: user });
      seedPrefs(user);
      toast.success("Account created successfully. Welcome aboard!");
      get().connectSocket();
      const uid = user?._id ?? user?.id;
      if (uid) {
        console.log("[E2EE] register: initializing encryption for user", uid);
        initE2EE(uid)
          .then((s) => console.log("[E2EE] register: status ->", s))
          .catch((e) =>
            console.error("[E2EE] register: init error:", e?.message),
          );
      }
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      set({ isSigninUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data, {
        withCredentials: true,
      });

      const resData = res?.data?.data;
      if (resData?.twoFactorRequired) {
        set({
          twoFactorChallenge: {
            challengeToken: resData.challengeToken,
            email: data.email,
          },
        });
        return;
      }

      const user = extractUser(res) || res?.data?.data?.user;
      if (!user) throw new Error("Invalid response from server.");
      set({ authUser: user, twoFactorChallenge: null });
      seedPrefs(user);
      toast.success("Account login successful. Welcome aboard!");
      get().connectSocket();
      const uid = user?._id ?? user?.id;
      if (uid) {
        console.log("[E2EE] login: initializing encryption for user", uid);
        initE2EE(uid)
          .then((s) => console.log("[E2EE] login: status ->", s))
          .catch((e) => console.error("[E2EE] login: init error:", e?.message));
      }
    } catch (error) {
      console.error("Login error:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please try again.";
      toast.error(message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  verifyTwoFactor: async ({ code, useRecoveryCode = false }) => {
    const { twoFactorChallenge } = get();
    if (!twoFactorChallenge?.challengeToken) {
      toast.error("No active 2FA challenge. Please log in again.");
      return;
    }
    set({ isVerifyingTwoFactor: true });
    try {
      const res = await axiosInstance.post(
        "/auth/2fa/verify-login",
        {
          challengeToken: twoFactorChallenge.challengeToken,
          code,
          useRecoveryCode,
        },
        { withCredentials: true },
      );
      const user = extractUser(res) || res?.data?.data?.user;
      if (!user) throw new Error("Invalid server response.");
      set({ authUser: user, twoFactorChallenge: null });
      seedPrefs(user);
      toast.success("Signed in successfully.");
      get().connectSocket();
      const uid = user?._id ?? user?.id;
      if (uid) {
        console.log("[E2EE] 2FA login: initializing encryption for user", uid);
        initE2EE(uid)
          .then((s) => console.log("[E2EE] 2FA login: status ->", s))
          .catch((e) =>
            console.error("[E2EE] 2FA login: init error:", e?.message),
          );
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Verification failed. Please try again.";
      toast.error(message);
      throw error;
    } finally {
      set({ isVerifyingTwoFactor: false });
    }
  },

  clearTwoFactorChallenge: () => set({ twoFactorChallenge: null }),

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout network error:", error);
    } finally {
      get().disconnectSocket();
      clearE2EECache();
      useChatPrefsStore.getState().reset?.();
      useAppearanceStore.getState().reset?.();
      useNotificationSettings.getState().resetSettings?.();
      useAppLockStore.getState().reset?.();
      useChatLockStore.getState().reset?.();
      usePrivacyStore.getState().resetPrivacy?.();
      console.log("[E2EE] logout: encryption cache cleared");
      set({ authUser: null, presenceMap: {} });
      toast.success("You have been logged out successfully.");
    }
  },

  setPresence: (userId, presence) => {
    if (!userId) return;
    const uid = String(userId);
    set((state) => {
      const prev = state.presenceMap?.[uid] || {};
      return {
        presenceMap: {
          ...state.presenceMap,
          [uid]: {
            ...prev,
            ...presence,
            lastSeen:
              presence?.lastSeen !== undefined
                ? presence.lastSeen
                : prev.lastSeen,
          },
        },
      };
    });
  },

  updateProfile: async (data) => {
    set({ isUpdateProfile: true });
    try {
      const res = await axiosInstance.patch("/users/profile", data, {
        withCredentials: true,
      });
      const updated = extractUser(res);
      if (updated) {
        set((state) => ({
          authUser: state.authUser
            ? { ...state.authUser, ...updated }
            : updated,
        }));
      }
      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Update profile error:", error);
      const message =
        error?.response?.data?.message || "Failed to update profile.";
      toast.error(message);
      throw error;
    } finally {
      set({ isUpdateProfile: false });
    }
  },

  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    set({ isChangingPassword: true });
    try {
      await axiosInstance.patch(
        "/auth/change-password",
        { currentPassword, newPassword, confirmPassword },
        { withCredentials: true },
      );
      toast.success("Password changed successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to change password.";
      toast.error(message);
      throw error;
    } finally {
      set({ isChangingPassword: false });
    }
  },

  updateAvatar: async (formData) => {
    set({ isUpdatingAvatar: true });
    try {
      const res = await axiosInstance.patch("/users/profile/avatar", formData, {
        withCredentials: true,
      });
      const updated = extractUser(res);
      if (updated) {
        set((state) => ({
          authUser: state.authUser
            ? { ...state.authUser, ...updated }
            : updated,
        }));
      }
      toast.success("Avatar updated successfully.");
    } catch (error) {
      console.error("Update avatar error:", error);
      const message =
        error?.response?.data?.message || "Failed to update avatar.";
      toast.error(message);
      throw error;
    } finally {
      set({ isUpdatingAvatar: false });
    }
  },

  deleteAvatar: async () => {
    set({ isUpdatingAvatar: true });
    try {
      const res = await axiosInstance.delete("/users/profile/avatar", {
        withCredentials: true,
      });
      const user = extractUser(res);
      set((state) => ({
        authUser: user ? user : { ...state.authUser, avatar: "" },
      }));
      toast.success("Avatar removed successfully.");
    } catch (error) {
      console.error("Delete avatar error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete avatar.");
    } finally {
      set({ isUpdatingAvatar: false });
    }
  },

  fetchBlockedUsers: async () => {
    set({ isFetchingBlocked: true, blockedFetchError: null });
    try {
      const res = await axiosInstance.get("/users/blocked", {
        withCredentials: true,
      });
      const list = res?.data?.data || [];
      set({ blockedUsersList: list, blockedFetchError: null });
      return list;
    } catch (error) {
      console.error("Fetch blocked users error:", error);
      const msg =
        error?.response?.data?.message || "Failed to load blocked contacts.";
      set({ blockedFetchError: msg });
      return [];
    } finally {
      set({ isFetchingBlocked: false });
    }
  },

  blockUser: async (id) => {
    try {
      const res = await axiosInstance.post(
        `/users/${id}/block`,
        {},
        { withCredentials: true },
      );
      const user = extractUser(res);
      set((state) => ({
        authUser:
          user ||
          (state.authUser
            ? {
                ...state.authUser,
                blockedUsers: [
                  ...new Set([
                    ...(state.authUser.blockedUsers || []),
                    String(id),
                  ]),
                ],
              }
            : null),
      }));
      toast.success("User blocked.");
      await get().fetchBlockedUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to block user.");
    }
  },

  unblockUser: async (id) => {
    try {
      const res = await axiosInstance.delete(`/users/${id}/block`, {
        withCredentials: true,
      });
      const user = extractUser(res);
      const strId = String(id);
      set((state) => ({
        authUser:
          user ||
          (state.authUser
            ? {
                ...state.authUser,
                blockedUsers: (state.authUser.blockedUsers || []).filter(
                  (b) => String(b) !== strId,
                ),
              }
            : null),
        blockedUsersList: state.blockedUsersList.filter(
          (u) => String(u._id || u.id) !== strId,
        ),
      }));
      toast.success("User unblocked.");
      await get().fetchBlockedUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to unblock user.");
    }
  },

  toggleFavorite: async (id, isFavorite) => {
    try {
      const res = isFavorite
        ? await axiosInstance.delete(`/users/${id}/favorite`, {
            withCredentials: true,
          })
        : await axiosInstance.post(
            `/users/${id}/favorite`,
            {},
            { withCredentials: true },
          );
      const updated = extractUser(res);
      if (updated) {
        set((state) => ({
          authUser: state.authUser
            ? { ...state.authUser, ...updated }
            : updated,
        }));
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update favorites.",
      );
    }
  },

  deleteAccount: async ({ password, code, useRecoveryCode }) => {
    if (get().isDeletingAccount) return;
    set({ isDeletingAccount: true });
    try {
      await axiosInstance.delete("/auth/account", {
        data: {
          confirmation: "DELETE",
          password,
          ...(code !== undefined
            ? { code, useRecoveryCode: !!useRecoveryCode }
            : {}),
        },
        withCredentials: true,
      });
      const uid = get().authUser?._id ?? get().authUser?.id;
      get().disconnectSocket();
      set({ authUser: null, isDeletingAccount: false });
      useAppearanceStore.getState().reset();
      useAppLockStore.getState().reset?.();
      useChatLockStore.getState().reset?.();
      usePrivacyStore.getState().resetPrivacy?.();
      if (uid) {
        import("../lib/appLockStorage.js").then(({ clearUserLockConfig }) => {
          clearUserLockConfig(uid);
        });
      }
      toast.success("Your account has been permanently deleted.");
    } catch (error) {
      set({ isDeletingAccount: false });
      const message =
        error?.response?.data?.message ||
        "Failed to delete account. Please try again.";
      toast.error(message);
      throw error;
    }
  },

  connectSocket: () => {
    const { authUser, socket: existing } = get();
    if (!authUser) return;
    if (existing && (existing.connected || existing.active)) return;

    existing?.removeAllListeners();
    existing?.disconnect();

    set({ isSocketConnecting: true, isSocketConnected: false });

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        cb({ token: get().authUser?.token?.accessToken });
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("socket connected:", socket.id);
      set({ isSocketConnected: true, isSocketConnecting: false });
      serverDisconnectRetries = 0;
      import("./useChatStore.js")
        .then(({ useChatStore }) => {
          useChatStore.getState().subscribeToMessage();
          useChatStore.getState().syncActiveChat?.();
        })
        .catch(() => {});
      import("./useGroupStore.js")
        .then(({ useGroupStore }) =>
          useGroupStore.getState().subscribeToGroups(),
        )
        .catch(() => {});
    });

    socket.io?.on("reconnect_attempt", () => {
      set({ isSocketConnecting: true });
    });

    socket.io?.on("reconnect", () => {
      set({ isSocketConnected: true, isSocketConnecting: false });
    });

    socket.on("connect_error", async (err) => {
      console.log("socket error:", err.message, err.description, err.context);
      set({ isSocketConnected: false });

      const isSessionRevoked =
        err.message?.includes("Session revoked") ||
        err.message?.includes("Invalid session") ||
        err.message?.includes("session owner mismatch") ||
        err.message?.includes("token version invalidated") ||
        err.message?.includes("User not found");

      const isUnauthorized =
        err.message?.includes("Unauthorized") ||
        err.message?.includes("Forbidden");

      if (isSessionRevoked || isUnauthorized) {
        // Prevent infinite reconnection attempts with a revoked session
        socket.disconnect();

        // Attempt silent session refresh once
        try {
          const refreshRes = await axiosInstance.post(
            "/auth/refresh",
            {},
            { withCredentials: true },
          );
          if (refreshRes?.status === 200) {
            console.log(
              "[socket] Session refreshed successfully, reconnecting socket...",
            );
            const newTokens = refreshRes.data?.data?.token;
            if (newTokens) {
              set((state) => ({
                authUser: state.authUser
                  ? { ...state.authUser, token: newTokens }
                  : null,
              }));
            }
            get().connectSocket();
            return;
          }
        } catch (refreshErr) {
          console.warn(
            "[socket] Session refresh failed after connect_error:",
            refreshErr?.message,
          );
        }

        // Refresh failed: session was permanently revoked or expired
        get().disconnectSocket();
        set({ authUser: null });
        try {
          useAppLockStore.getState().reset?.();
          useChatLockStore.getState().reset?.();
          usePrivacyStore.getState().resetPrivacy?.();
          useAppearanceStore.getState().reset?.();
          clearE2EECache();
          import("./useChatStore.js").then(({ useChatStore }) => {
            useChatStore.setState({
              messages: [],
              selectedUser: null,
              users: [],
            });
          });
          import("./useGroupStore.js").then(({ useGroupStore }) => {
            useGroupStore.setState({
              groupMessages: [],
              selectedGroup: null,
              groups: [],
            });
          });
        } catch {
          void 0;
        }
        toast.error(
          "Your session has expired or was revoked. Please sign in again.",
        );
      }
    });

    socket.on("getOnlineUsers", (payload) => {
      if (Array.isArray(payload)) {
        set({ onlineUsers: payload.map(String), hiddenUsers: [] });
      } else {
        set({
          onlineUsers: (payload?.online || []).map(String),
          hiddenUsers: (payload?.hidden || []).map(String),
        });
      }
    });

    const handlePresence = ({ userId, isOnline, lastSeen }) => {
      if (!userId) return;
      const uid = String(userId);
      set((state) => {
        const setIds = new Set(state.onlineUsers.map(String));
        if (isOnline) {
          setIds.add(uid);
        } else {
          setIds.delete(uid);
        }
        const prevPresence = state.presenceMap?.[uid] || {};
        const updatedLastSeen = isOnline
          ? prevPresence.lastSeen
          : lastSeen !== undefined
            ? lastSeen
            : prevPresence.lastSeen;
        return {
          onlineUsers: Array.from(setIds),
          presenceMap: {
            ...state.presenceMap,
            [uid]: {
              isOnline: Boolean(isOnline),
              lastSeen: updatedLastSeen,
            },
          },
        };
      });
      window.dispatchEvent(
        new CustomEvent("chatty:presence-updated", {
          detail: { userId: uid, isOnline, lastSeen },
        }),
      );
    };

    socket.on("presence:updated", handlePresence);
    socket.on("user-online", (payload) =>
      handlePresence({ userId: payload?.userId ?? payload, isOnline: true }),
    );
    socket.on("user-offline", (payload) =>
      handlePresence({
        userId: payload?.userId ?? payload,
        isOnline: false,
        lastSeen: payload?.lastSeen,
      }),
    );
    socket.on("user:online", (payload) =>
      handlePresence({ userId: payload?.userId ?? payload, isOnline: true }),
    );
    socket.on("user:offline", (payload) =>
      handlePresence({
        userId: payload?.userId ?? payload,
        isOnline: false,
        lastSeen: payload?.lastSeen,
      }),
    );
    socket.on("last-seen-update", (payload) =>
      handlePresence({
        userId: payload?.userId ?? payload,
        isOnline: false,
        lastSeen: payload?.lastSeen,
      }),
    );

    const handlePrivacyUpdate = (settings) => {
      usePrivacyStore.getState().initFromUser(settings);
    };
    socket.on("privacy:settings-updated", handlePrivacyUpdate);
    socket.on("privacy:update", handlePrivacyUpdate);

    const handleNotificationsUpdate = (payload) => {
      useNotificationSettings.getState().handleSocketUpdate(payload);
    };
    socket.on("settings:notifications:updated", handleNotificationsUpdate);
    socket.on("connect", () => {
      useNotificationSettings.getState().loadSettings();
    });

    socket.on("relationsUpdated", ({ blockedUsers, favorites }) => {
      set((state) => ({
        authUser: state.authUser
          ? {
              ...state.authUser,
              ...(blockedUsers
                ? { blockedUsers: blockedUsers.map(String) }
                : {}),
              ...(favorites ? { favorites: favorites.map(String) } : {}),
            }
          : state.authUser,
      }));
      get().fetchBlockedUsers();
    });

    socket.on("user:profile-updated", ({ userId }) => {
      window.dispatchEvent(
        new CustomEvent("chatty:profile-updated", { detail: { userId } }),
      );
    });

    socket.on("session:revoked", ({ sessionId }) => {
      console.log("[security] session revoked:", sessionId);
      window.dispatchEvent(
        new CustomEvent("chatty:session-revoked", { detail: { sessionId } }),
      );
      get().disconnectSocket();
      set({ authUser: null });
      try {
        useAppLockStore.getState().reset?.();
        useChatLockStore.getState().reset?.();
        usePrivacyStore.getState().resetPrivacy?.();
        useAppearanceStore.getState().reset?.();
        clearE2EECache();
        import("./useChatStore.js").then(({ useChatStore }) => {
          useChatStore.setState({
            messages: [],
            selectedUser: null,
            users: [],
          });
        });
        import("./useGroupStore.js").then(({ useGroupStore }) => {
          useGroupStore.setState({
            groupMessages: [],
            selectedGroup: null,
            groups: [],
          });
        });
      } catch {
        void 0;
      }
      toast.error("Your session was revoked. Please sign in again.");
    });

    socket.on("session:revoke-others", ({ keepSessionId }) => {
      console.log("[security] other sessions revoked, keep:", keepSessionId);
      window.dispatchEvent(new CustomEvent("chatty:sessions-changed"));
    });

    socket.on("e2ee:device:revoked", ({ deviceId }) => {
      console.log("[e2ee] device revoked:", deviceId);
      e2eeManager.handleDeviceRevocation(deviceId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-revoked", { detail: { deviceId } }),
      );
    });

    socket.on("e2ee:device:rotated", ({ deviceId }) => {
      console.log("[e2ee] device rotated:", deviceId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-rotated", { detail: { deviceId } }),
      );
    });

    socket.on("e2ee:device:registered", (data) => {
      console.log("[e2ee] device registered:", data?.deviceId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-registered", { detail: data }),
      );
    });

    socket.on("e2ee:device-link:requested", (data) => {
      console.log(
        "[e2ee] incoming device-link requested:",
        data?.linkSessionId,
      );
      window.dispatchEvent(
        new CustomEvent("chatty:device-link-requested", { detail: data }),
      );
    });

    socket.on("e2ee:device-link:connecting", (data) => {
      console.log("[e2ee] device-link connecting:", data?.linkSessionId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-link-connecting", { detail: data }),
      );
    });

    socket.on("e2ee:device-link:approved", (data) => {
      console.log("[e2ee] device-link approved:", data?.linkSessionId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-link-approved", { detail: data }),
      );
    });

    socket.on("e2ee:device-link:completed", (data) => {
      console.log("[e2ee] device-link completed:", data?.deviceId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-link-completed", { detail: data }),
      );
    });

    socket.on("e2ee:device-link:cancelled", (data) => {
      console.log("[e2ee] device-link cancelled:", data?.linkSessionId);
      window.dispatchEvent(
        new CustomEvent("chatty:device-link-cancelled", { detail: data }),
      );
    });

    socket.on("e2ee:backup:updated", (data) => {
      console.log("[e2ee] backup updated:", data);
      window.dispatchEvent(
        new CustomEvent("chatty:e2ee-backup-updated", { detail: data }),
      );
    });

    socket.on("e2ee:reset", (data) => {
      console.log("[e2ee] identity reset event received:", data);
      e2eeManager.handleRemoteReset();
      window.dispatchEvent(
        new CustomEvent("chatty:e2ee-reset", { detail: data }),
      );
    });

    socket.on("disconnect", async (reason) => {
      console.log("[socket] disconnected:", reason);
      set({ isSocketConnected: false, isSocketConnecting: false });

      if (reason !== "io server disconnect") return;

      if (get().socket !== socket) return;

      try {
        await axiosInstance.get("/auth/check", { withCredentials: true });

        if (get().socket !== socket) return;

        if (serverDisconnectRetries >= MAX_SERVER_DISCONNECT_RETRIES) {
          console.error(
            "[socket] server baar baar disconnect kar raha hai. Backend socket auth middleware check karo.",
          );
          return;
        }

        serverDisconnectRetries += 1;
        socket.connect();
      } catch (err) {
        if (err?.response?.status === 401) {
          get().disconnectSocket();
          set({ authUser: null });
        } else {
          console.error("[socket] session check failed:", err?.message);
        }
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    serverDisconnectRetries = 0;
    set({
      socket: null,
      isSocketConnecting: false,
      isSocketConnected: false,
      onlineUsers: [],
      hiddenUsers: [],
      blockedUsersList: [],
      blockedFetchError: null,
    });
    import("./useChatStore.js")
      .then(({ useChatStore }) =>
        useChatStore.getState().unSubscribeFromMessage(),
      )
      .catch(() => {});
    import("./useGroupStore.js")
      .then(({ useGroupStore }) =>
        useGroupStore.getState().unsubscribeFromGroups(),
      )
      .catch(() => {});
  },
}));
