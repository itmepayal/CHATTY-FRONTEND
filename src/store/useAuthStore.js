import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { useChatPrefsStore } from "./useChatPrefsStore.js";
import { useAppearanceStore } from "./useAppearanceStore.js";

const baseUrl = import.meta.env.VITE_API_URL;

console.log(baseUrl);

const socketUrl = (() => {
  try {
    return new URL(baseUrl, window.location.origin).origin;
  } catch {
    return baseUrl;
  }
})();

const extractUser = (res) => res?.data?.data?.user ?? res?.data?.data;

const seedPrefs = (user) => {
  usePrivacyStore.getState().initFromUser(user);
  useChatPrefsStore.getState().initFromUser(user);
  useAppearanceStore.getState().initFromUser(user);
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
    } catch (error) {
      console.log(error);
      set({ authUser: null });
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
      if (user) set({ authUser: user });
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
      get().disconnectSocket();
      set({ authUser: null });
      toast.success("You have been logged out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to logout. Please try again.",
      );
    }
  },

  updateProfile: async (data) => {
    set({ isUpdateProfile: true });
    try {
      const res = await axiosInstance.patch("/users/profile", data, {
        withCredentials: true,
      });
      set({ authUser: extractUser(res) });
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
      set({ authUser: extractUser(res) });
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

  blockUser: async (id) => {
    try {
      const res = await axiosInstance.post(
        `/users/${id}/block`,
        {},
        { withCredentials: true },
      );
      set({ authUser: extractUser(res) });
      toast.success("User blocked.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to block user.");
    }
  },

  unblockUser: async (id) => {
    try {
      const res = await axiosInstance.delete(`/users/${id}/block`, {
        withCredentials: true,
      });
      set({ authUser: extractUser(res) });
      toast.success("User unblocked.");
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
      set({ authUser: extractUser(res) });
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
      get().disconnectSocket();
      set({ authUser: null, isDeletingAccount: false });
      useAppearanceStore.getState().reset();
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
    if (existing?.connected) return;

    existing?.removeAllListeners();
    existing?.disconnect();

    const socket = io(socketUrl, {
      withCredentials: true,
      auth: (cb) => {
        cb({ token: get().authUser?.token?.accessToken });
      },
    });

    socket.on("connect", () => {
      console.log("socket connected:", socket.id);
      serverDisconnectRetries = 0;
    });

    socket.on("connect_error", (err) =>
      console.error("socket error:", err.message),
    );

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

    socket.on("session:revoked", ({ sessionId }) => {
      console.log("[security] session revoked:", sessionId);
      window.dispatchEvent(
        new CustomEvent("chatty:session-revoked", { detail: { sessionId } }),
      );
    });

    socket.on("session:revoke-others", ({ keepSessionId }) => {
      console.log("[security] other sessions revoked, keep:", keepSessionId);
      window.dispatchEvent(new CustomEvent("chatty:sessions-changed"));
    });

    socket.on("disconnect", async (reason) => {
      console.log("[socket] disconnected:", reason);

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
    set({ socket: null, onlineUsers: [], hiddenUsers: [] });
  },
}));
