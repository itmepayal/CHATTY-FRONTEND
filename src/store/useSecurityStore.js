/**
 * useSecurityStore.js
 *
 * Manages:
 *  - Session list (fetch, revoke, revoke-others)
 *  - Login alerts toggle
 *  - 2FA setup state (QR code, recovery codes, modal phases)
 *
 * Keeps security concerns isolated from useAuthStore.
 */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";

export const useSecurityStore = create((set, get) => ({
  // ── sessions ──────────────────────────────────────────────────────────────
  sessions:         [],
  sessionsLoading:  false,
  sessionsError:    null,
  revokingId:       null, // sessionId currently being revoked
  isRevokingOthers: false,

  fetchSessions: async () => {
    set({ sessionsLoading: true, sessionsError: null });
    try {
      const res = await axiosInstance.get("/auth/sessions", { withCredentials: true });
      set({ sessions: res.data?.data?.sessions ?? [] });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load sessions.";
      set({ sessionsError: msg });
      toast.error(msg);
    } finally {
      set({ sessionsLoading: false });
    }
  },

  revokeSession: async (sessionId) => {
    set({ revokingId: sessionId });
    try {
      await axiosInstance.delete(`/auth/sessions/${sessionId}`, { withCredentials: true });
      set((s) => ({ sessions: s.sessions.filter((x) => String(x.id) !== String(sessionId)) }));
      toast.success("Device signed out.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to revoke session.");
    } finally {
      set({ revokingId: null });
    }
  },

  revokeOtherSessions: async () => {
    set({ isRevokingOthers: true });
    try {
      const res = await axiosInstance.post("/auth/sessions/revoke-others", {}, { withCredentials: true });
      const count = res.data?.data?.revokedCount ?? 0;
      // Keep only the current session in the list
      set((s) => ({ sessions: s.sessions.filter((x) => x.current) }));
      toast.success(`Signed out of ${count} other device${count !== 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to sign out other devices.");
    } finally {
      set({ isRevokingOthers: false });
    }
  },

  // ── login alerts ──────────────────────────────────────────────────────────
  loginAlertsLoading: false,

  updateLoginAlerts: async (enabled) => {
    set({ loginAlertsLoading: true });
    try {
      await axiosInstance.patch(
        "/auth/security/login-alerts",
        { enabled },
        { withCredentials: true },
      );
      toast.success(`Login alerts ${enabled ? "enabled" : "disabled"}.`);
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update login alerts.");
      return false; // caller should revert toggle
    } finally {
      set({ loginAlertsLoading: false });
    }
  },

  // ── 2FA ───────────────────────────────────────────────────────────────────
  twoFaPhase:       "idle",   // idle | setup | verify | codes | disable
  twoFaQrCode:      null,
  twoFaManualKey:   null,
  twoFaRecoveryCodes: [],
  twoFaLoading:     false,
  twoFaError:       null,

  startTwoFaSetup: async () => {
    set({ twoFaLoading: true, twoFaError: null, twoFaPhase: "setup" });
    try {
      const res = await axiosInstance.post("/auth/2fa/setup", {}, { withCredentials: true });
      const { qrCodeUrl, manualKey } = res.data?.data || {};
      set({ twoFaQrCode: qrCodeUrl, twoFaManualKey: manualKey, twoFaPhase: "verify" });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to start 2FA setup.";
      set({ twoFaError: msg, twoFaPhase: "idle" });
      toast.error(msg);
    } finally {
      set({ twoFaLoading: false });
    }
  },

  enableTwoFa: async (code) => {
    set({ twoFaLoading: true, twoFaError: null });
    try {
      const res = await axiosInstance.post("/auth/2fa/enable", { code }, { withCredentials: true });
      const codes = res.data?.data?.recoveryCodes ?? [];
      set({ twoFaRecoveryCodes: codes, twoFaPhase: "codes" });
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid code. Try again.";
      set({ twoFaError: msg });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  disableTwoFa: async (code) => {
    set({ twoFaLoading: true, twoFaError: null });
    try {
      await axiosInstance.post("/auth/2fa/disable", { code }, { withCredentials: true });
      set({ twoFaPhase: "idle", twoFaQrCode: null, twoFaManualKey: null });
      toast.success("Two-step verification disabled.");
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid code. Try again.";
      set({ twoFaError: msg });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  regenerateRecoveryCodes: async (code) => {
    set({ twoFaLoading: true, twoFaError: null });
    try {
      const res = await axiosInstance.post("/auth/2fa/recovery-codes/regenerate", { code }, { withCredentials: true });
      const codes = res.data?.data?.recoveryCodes ?? [];
      set({ twoFaRecoveryCodes: codes, twoFaPhase: "codes" });
      toast.success("Recovery codes regenerated.");
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to regenerate codes.";
      set({ twoFaError: msg });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  resetTwoFaState: () =>
    set({
      twoFaPhase: "idle",
      twoFaQrCode: null,
      twoFaManualKey: null,
      twoFaRecoveryCodes: [],
      twoFaLoading: false,
      twoFaError: null,
    }),
}));
