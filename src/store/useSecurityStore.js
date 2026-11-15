import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

const getErrorMessage = (err, fallback) => {
  if (err?.response?.status === 429) {
    return (
      err?.response?.data?.message ||
      "Too many attempts. Please wait a moment and try again."
    );
  }
  return err?.response?.data?.message || fallback;
};

const getSessionId = (s) => String(s?.id ?? s?._id ?? "");

const TWO_FA_INITIAL = {
  twoFaPhase: "idle",
  twoFaQrCode: null,
  twoFaManualKey: null,
  twoFaRecoveryCodes: [],
  twoFaLoading: false,
  twoFaError: null,
};

export const useSecurityStore = create((set, get) => ({
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  revokingId: null,
  isRevokingOthers: false,

  fetchSessions: async () => {
    if (get().sessionsLoading) return;
    set({ sessionsLoading: true, sessionsError: null });
    try {
      const res = await axiosInstance.get("/auth/sessions", {
        withCredentials: true,
      });
      const list = res.data?.data?.sessions;
      set({ sessions: Array.isArray(list) ? list : [] });
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load sessions.");
      set({ sessionsError: msg });
      toast.error(msg);
    } finally {
      set({ sessionsLoading: false });
    }
  },

  revokeSession: async (sessionId) => {
    if (!sessionId) return false;
    if (get().revokingId || get().isRevokingOthers) return false;

    const target = get().sessions.find(
      (x) => getSessionId(x) === String(sessionId),
    );
    if (target?.current) {
      toast.error("Use Logout to sign out of this device.");
      return false;
    }

    set({ revokingId: sessionId });
    try {
      await axiosInstance.delete(`/auth/sessions/${sessionId}`, {
        withCredentials: true,
      });
      set((s) => ({
        sessions: s.sessions.filter(
          (x) => getSessionId(x) !== String(sessionId),
        ),
      }));
      toast.success("Device signed out.");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to revoke session."));
      return false;
    } finally {
      set({ revokingId: null });
    }
  },

  revokeOtherSessions: async () => {
    if (get().isRevokingOthers || get().revokingId) return false;
    set({ isRevokingOthers: true });
    try {
      const res = await axiosInstance.post(
        "/auth/sessions/revoke-others",
        {},
        { withCredentials: true },
      );
      const count = res.data?.data?.revokedCount ?? 0;
      set((s) => ({ sessions: s.sessions.filter((x) => x.current) }));
      toast.success(
        count === 0
          ? "No other devices were signed in."
          : `Signed out of ${count} other device${count !== 1 ? "s" : ""}.`,
      );
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to sign out other devices."));
      return false;
    } finally {
      set({ isRevokingOthers: false });
    }
  },

  loginAlertsLoading: false,

  updateLoginAlerts: async (enabled) => {
    if (get().loginAlertsLoading) return false;
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
      toast.error(getErrorMessage(err, "Failed to update login alerts."));
      return false;
    } finally {
      set({ loginAlertsLoading: false });
    }
  },

  ...TWO_FA_INITIAL,

  openTwoFaDisable: () => set({ twoFaPhase: "disable", twoFaError: null }),

  clearTwoFaError: () => set({ twoFaError: null }),

  startTwoFaSetup: async () => {
    if (get().twoFaLoading) return false;
    set({ twoFaLoading: true, twoFaError: null, twoFaPhase: "setup" });
    try {
      const res = await axiosInstance.post(
        "/auth/2fa/setup",
        {},
        { withCredentials: true },
      );
      const { qrCodeUrl, manualKey } = res.data?.data || {};
      if (!qrCodeUrl || !manualKey) {
        throw new Error("Invalid 2FA setup response.");
      }
      set({
        twoFaQrCode: qrCodeUrl,
        twoFaManualKey: manualKey,
        twoFaPhase: "verify",
      });
      return true;
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to start 2FA setup.");
      set({
        twoFaError: msg,
        twoFaPhase: "idle",
        twoFaQrCode: null,
        twoFaManualKey: null,
      });
      toast.error(msg);
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  enableTwoFa: async (code) => {
    if (get().twoFaLoading) return false;
    set({ twoFaLoading: true, twoFaError: null });
    try {
      const res = await axiosInstance.post(
        "/auth/2fa/enable",
        { code },
        { withCredentials: true },
      );
      const codes = res.data?.data?.recoveryCodes ?? [];
      set({
        twoFaRecoveryCodes: codes,
        twoFaPhase: "codes",
        twoFaQrCode: null,
        twoFaManualKey: null,
      });
      toast.success("Two-step verification enabled.");
      return true;
    } catch (err) {
      set({ twoFaError: getErrorMessage(err, "Invalid code. Try again.") });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  disableTwoFa: async (code) => {
    if (get().twoFaLoading) return false;
    set({ twoFaLoading: true, twoFaError: null });
    try {
      await axiosInstance.post(
        "/auth/2fa/disable",
        { code },
        { withCredentials: true },
      );
      set({ ...TWO_FA_INITIAL });
      toast.success("Two-step verification disabled.");
      return true;
    } catch (err) {
      set({ twoFaError: getErrorMessage(err, "Invalid code. Try again.") });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  regenerateRecoveryCodes: async (code) => {
    if (get().twoFaLoading) return false;
    set({ twoFaLoading: true, twoFaError: null });
    try {
      const res = await axiosInstance.post(
        "/auth/2fa/recovery-codes/regenerate",
        { code },
        { withCredentials: true },
      );
      const codes = res.data?.data?.recoveryCodes ?? [];
      set({ twoFaRecoveryCodes: codes, twoFaPhase: "codes" });
      toast.success("Recovery codes regenerated.");
      return true;
    } catch (err) {
      set({
        twoFaError: getErrorMessage(err, "Failed to regenerate codes."),
      });
      return false;
    } finally {
      set({ twoFaLoading: false });
    }
  },

  resetTwoFaState: () => set({ ...TWO_FA_INITIAL }),
}));
