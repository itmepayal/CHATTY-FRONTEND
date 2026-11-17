import { create } from "zustand";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";
import {
  hashPinPbkdf2,
  verifyPinPbkdf2,
  isPlatformBiometricsAvailable,
  registerBiometrics,
  authenticateWithBiometrics,
} from "../lib/appLockCrypto.js";
import {
  SESSION_UNLOCKED_KEY,
  TIMEOUT_MS,
  loadLocalConfig,
  saveLocalConfig,
  loadLockoutState,
  saveLockoutState,
  getLockoutDurationSeconds,
} from "../lib/appLockStorage.js";

let lastActiveTime = Date.now();
let listenerAttached = false;
let lockoutTimer = null;

export const useAppLockStore = create((set, get) => ({
  isLocked: false,
  isUnlockedThisSession: false,
  isConfigured: false,
  autoLockDuration: "immediately",
  biometricsEnabled: false,
  biometricsSupported: false,
  failedAttempts: 0,
  lockoutUntil: 0,
  remainingCooldownSeconds: 0,
  activeUserId: null,

  initAppLock: async (userPrivacy, currentUserId) => {
    let uid = currentUserId;
    if (!uid) {
      try {
        const { useAuthStore } = await import("./useAuthStore.js");
        const authUser = useAuthStore.getState().authUser;
        uid = authUser?._id ?? authUser?.id;
      } catch {}
    }
    const safeUid = uid ? String(uid) : "default";
    set({ activeUserId: safeUid });

    const biometricsSupported = await isPlatformBiometricsAvailable();
    set({ biometricsSupported });

    let localConfig = loadLocalConfig(safeUid);

    // Migration from legacy privacy store if local config is absent
    if (!localConfig && (userPrivacy?.appLockEnabled || userPrivacy?.appLockPinHash)) {
      if (userPrivacy?.appLockPinHash) {
        localConfig = {
          enabled: true,
          verifier: userPrivacy.appLockPinHash,
          timeout: userPrivacy.appLockTimeout || "immediately",
          biometricsEnabled: false,
        };
        saveLocalConfig(safeUid, localConfig);
      }
    }

    const isConfigured = Boolean(
      (localConfig?.enabled && localConfig?.verifier) ||
      userPrivacy?.appLockEnabled
    );
    const autoLockDuration = localConfig?.timeout || userPrivacy?.appLockTimeout || "immediately";
    const biometricsEnabled = Boolean(localConfig?.biometricsEnabled);

    // Check lockout state
    const lockout = loadLockoutState(safeUid);
    const now = Date.now();
    const remainingMs = Math.max(0, lockout.lockoutUntil - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    set({
      isConfigured,
      autoLockDuration,
      biometricsEnabled,
      failedAttempts: lockout.failedAttempts,
      lockoutUntil: lockout.lockoutUntil,
      remainingCooldownSeconds: remainingSeconds,
    });

    if (remainingSeconds > 0) {
      get().startCooldownTimer(remainingSeconds);
    }

    if (isConfigured) {
      const unlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === "true";
      set({ isLocked: !unlocked, isUnlockedThisSession: unlocked });
    } else {
      set({ isLocked: false, isUnlockedThisSession: false });
    }

    if (!listenerAttached && typeof window !== "undefined") {
      listenerAttached = true;
      const handleActivity = () => { lastActiveTime = Date.now(); };
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          lastActiveTime = Date.now();
        } else if (document.visibilityState === "visible") {
          const state = get();
          const cfg = loadLocalConfig(state.activeUserId);
          if (!cfg?.enabled || !cfg?.verifier) return;

          const durationSetting = cfg.timeout || "immediately";
          const maxIdle = TIMEOUT_MS[durationSetting] ?? 0;
          const idleElapsed = Date.now() - lastActiveTime;

          if (durationSetting === "immediately" || idleElapsed >= maxIdle) {
            sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
            set({ isLocked: true, isUnlockedThisSession: false });
          }
        }
      };

      window.addEventListener("mousemove", handleActivity, { passive: true });
      window.addEventListener("keydown", handleActivity, { passive: true });
      window.addEventListener("touchstart", handleActivity, { passive: true });
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  },

  startCooldownTimer: (seconds) => {
    if (lockoutTimer) clearInterval(lockoutTimer);
    set({ remainingCooldownSeconds: seconds });

    lockoutTimer = setInterval(() => {
      const current = get().remainingCooldownSeconds;
      if (current <= 1) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
        set({ remainingCooldownSeconds: 0, lockoutUntil: 0 });
        const uid = get().activeUserId;
        saveLockoutState(uid, { failedAttempts: get().failedAttempts, lockoutUntil: 0 });
      } else {
        set({ remainingCooldownSeconds: current - 1 });
      }
    }, 1000);
  },

  unlock: async (enteredPin) => {
    const { activeUserId, remainingCooldownSeconds } = get();
    if (remainingCooldownSeconds > 0) {
      toast.error(`App is locked. Try again in ${remainingCooldownSeconds}s`);
      return false;
    }

    const cfg = loadLocalConfig(activeUserId);
    if (!cfg?.enabled || !cfg?.verifier) {
      set({ isLocked: false, isUnlockedThisSession: true });
      return true;
    }

    const isValid = await verifyPinPbkdf2(enteredPin, cfg.verifier);

    if (isValid) {
      if (!cfg.verifier.startsWith("pbkdf2:")) {
        const { verifier } = await hashPinPbkdf2(enteredPin);
        cfg.verifier = verifier;
        saveLocalConfig(activeUserId, cfg);
      }

      sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
      saveLockoutState(activeUserId, { failedAttempts: 0, lockoutUntil: 0 });

      set({
        isLocked: false,
        isUnlockedThisSession: true,
        failedAttempts: 0,
        lockoutUntil: 0,
        remainingCooldownSeconds: 0,
      });
      lastActiveTime = Date.now();
      return true;
    }

    const newAttempts = get().failedAttempts + 1;
    const cooldownSecs = getLockoutDurationSeconds(newAttempts);
    const lockoutUntil = cooldownSecs > 0 ? Date.now() + cooldownSecs * 1000 : 0;

    saveLockoutState(activeUserId, { failedAttempts: newAttempts, lockoutUntil });
    set({ failedAttempts: newAttempts, lockoutUntil });

    if (cooldownSecs > 0) {
      get().startCooldownTimer(cooldownSecs);
      toast.error(`Too many failed attempts. Locked for ${cooldownSecs} seconds.`);
    } else {
      const rem = 4 - newAttempts;
      toast.error(rem > 0 ? `Incorrect PIN. ${rem} attempt${rem === 1 ? "" : "s"} before lockout.` : "Incorrect PIN.");
    }
    return false;
  },

  unlockWithBiometrics: async () => {
    const { activeUserId, biometricsEnabled, remainingCooldownSeconds } = get();
    if (remainingCooldownSeconds > 0 || !biometricsEnabled) return false;

    try {
      const cfg = loadLocalConfig(activeUserId);
      const verified = await authenticateWithBiometrics(cfg?.credentialId);
      if (verified) {
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
        saveLockoutState(activeUserId, { failedAttempts: 0, lockoutUntil: 0 });
        set({
          isLocked: false,
          isUnlockedThisSession: true,
          failedAttempts: 0,
          lockoutUntil: 0,
          remainingCooldownSeconds: 0,
        });
        lastActiveTime = Date.now();
        toast.success("Unlocked with Biometrics");
        return true;
      }
      return false;
    } catch (err) {
      console.warn("[appLock] Biometrics failed:", err);
      toast.error("Biometric verification failed. Please enter PIN.");
      return false;
    }
  },

  lockNow: () => {
    const { activeUserId } = get();
    const cfg = loadLocalConfig(activeUserId);
    if (cfg?.enabled && cfg?.verifier) {
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      set({ isLocked: true, isUnlockedThisSession: false });
    }
  },

  setupPin: async (pin, duration = "immediately") => {
    try {
      const { activeUserId } = get();
      const { verifier } = await hashPinPbkdf2(pin);

      const newConfig = {
        enabled: true,
        verifier,
        timeout: duration,
        biometricsEnabled: get().biometricsEnabled,
      };

      saveLocalConfig(activeUserId, newConfig);
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");

      await usePrivacyStore.getState().setPrivacy({
        appLockEnabled: true,
        appLockTimeout: duration,
        appLockPinHash: verifier,
      });

      set({
        isLocked: false,
        isUnlockedThisSession: true,
        isConfigured: true,
        autoLockDuration: duration,
      });

      toast.success("App lock PIN configured successfully.");
      return true;
    } catch (err) {
      console.error("[appLock] setupPin error:", err);
      toast.error("Failed to configure PIN.");
      return false;
    }
  },

  changePin: async (currentPin, newPin) => {
    const { activeUserId } = get();
    const cfg = loadLocalConfig(activeUserId);
    if (!cfg?.verifier) return false;

    const isValid = await verifyPinPbkdf2(currentPin, cfg.verifier);
    if (!isValid) {
      toast.error("Incorrect current PIN.");
      return false;
    }

    const { verifier } = await hashPinPbkdf2(newPin);
    cfg.verifier = verifier;
    saveLocalConfig(activeUserId, cfg);
    toast.success("PIN changed successfully.");
    return true;
  },

  disablePin: async (enteredPin) => {
    try {
      const { activeUserId } = get();
      const cfg = loadLocalConfig(activeUserId);

      if (cfg?.verifier) {
        const isValid = await verifyPinPbkdf2(enteredPin, cfg.verifier);
        if (!isValid) {
          toast.error("Incorrect PIN.");
          return false;
        }
      }

      saveLocalConfig(activeUserId, null);
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);

      await usePrivacyStore.getState().setPrivacy({
        appLockEnabled: false,
        appLockPinHash: null,
      });

      set({
        isLocked: false,
        isUnlockedThisSession: false,
        isConfigured: false,
      });

      toast.success("App lock disabled.");
      return true;
    } catch (err) {
      console.error("[appLock] disablePin error:", err);
      toast.error("Failed to disable App lock.");
      return false;
    }
  },

  updateAutoLockDuration: async (duration) => {
    const { activeUserId } = get();
    const cfg = loadLocalConfig(activeUserId) || {};
    cfg.timeout = duration;
    saveLocalConfig(activeUserId, cfg);

    await usePrivacyStore.getState().setPrivacy({
      appLockTimeout: duration,
    });

    set({ autoLockDuration: duration });
    toast.success(`Auto-lock set to ${duration === "immediately" ? "immediately" : duration}`);
    return true;
  },

  toggleBiometrics: async (enable, userEmail) => {
    const { activeUserId } = get();
    const cfg = loadLocalConfig(activeUserId);
    if (!cfg) return false;

    if (enable) {
      try {
        const credentialId = await registerBiometrics(activeUserId, userEmail);
        cfg.biometricsEnabled = true;
        cfg.credentialId = credentialId;
        saveLocalConfig(activeUserId, cfg);
        set({ biometricsEnabled: true });
        toast.success("Biometric unlock enabled.");
        return true;
      } catch (err) {
        console.error("[appLock] Biometrics registration failed:", err);
        toast.error("Could not enable biometrics on this device.");
        return false;
      }
    } else {
      cfg.biometricsEnabled = false;
      saveLocalConfig(activeUserId, cfg);
      set({ biometricsEnabled: false });
      toast.success("Biometric unlock disabled.");
      return true;
    }
  },

  recoverWithPassword: async (password) => {
    try {
      const res = await axiosInstance.post("/auth/verify-password", { password });
      if (res?.data?.data?.verified) {
        const { activeUserId } = get();
        saveLocalConfig(activeUserId, null);
        saveLockoutState(activeUserId, { failedAttempts: 0, lockoutUntil: 0 });
        sessionStorage.removeItem(SESSION_UNLOCKED_KEY);

        await usePrivacyStore.getState().setPrivacy({
          appLockEnabled: false,
        });

        if (lockoutTimer) {
          clearInterval(lockoutTimer);
          lockoutTimer = null;
        }

        set({
          isLocked: false,
          isUnlockedThisSession: false,
          isConfigured: false,
          failedAttempts: 0,
          lockoutUntil: 0,
          remainingCooldownSeconds: 0,
        });

        toast.success("App lock has been reset with your account password.");
        return true;
      }
      return false;
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid account password.";
      toast.error(msg);
      return false;
    }
  },
}));
