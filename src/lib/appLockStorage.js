/**
 * Device-local storage and lockout persistence for App Lock.
 * Strict per-user scoping. No global or unauthenticated fallbacks.
 */

const STORAGE_KEY_PREFIX = "chatty:app_lock";
export const SESSION_UNLOCKED_KEY = "chatty:app_unlocked";

export const TIMEOUT_MS = {
  immediately: 0,
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export function isValidUserId(userId) {
  if (!userId) return false;
  const str = String(userId).trim();
  return Boolean(str && str !== "default" && str !== "undefined" && str !== "null");
}

export function getSessionUnlockedKey(userId) {
  if (isValidUserId(userId)) {
    return `${STORAGE_KEY_PREFIX}:unlocked:${String(userId).trim()}`;
  }
  return SESSION_UNLOCKED_KEY;
}

export function isSessionUnlocked(userId) {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const key = getSessionUnlockedKey(userId);
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function setSessionUnlocked(userId, unlocked) {
  try {
    if (typeof sessionStorage === "undefined") return;
    const key = getSessionUnlockedKey(userId);
    if (unlocked) {
      sessionStorage.setItem(key, "true");
    } else {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    }
  } catch (err) {
    console.error("[appLock] setSessionUnlocked error:", err);
  }
}

export function clearSessionUnlock(userId) {
  setSessionUnlocked(userId, false);
}

export function getStorageKeys(userId) {
  if (!isValidUserId(userId)) {
    return { configKey: null, lockoutKey: null };
  }
  const uid = String(userId).trim();
  return {
    configKey: `${STORAGE_KEY_PREFIX}:config:${uid}`,
    lockoutKey: `${STORAGE_KEY_PREFIX}:lockout:${uid}`,
  };
}

export function loadLocalConfig(userId) {
  if (!isValidUserId(userId) || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const { configKey } = getStorageKeys(userId);
    if (!configKey) return null;

    const raw = localStorage.getItem(configKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.enabled === true && parsed.verifier) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalConfig(userId, config) {
  if (!isValidUserId(userId) || typeof localStorage === "undefined") {
    return;
  }
  try {
    const { configKey } = getStorageKeys(userId);
    if (!configKey) return;

    if (!config) {
      localStorage.removeItem(configKey);
    } else {
      const serialized = JSON.stringify(config);
      localStorage.setItem(configKey, serialized);
    }
  } catch (err) {
    console.error("[appLock] saveLocalConfig error:", err);
  }
}

export function clearUserLockConfig(userId) {
  if (!isValidUserId(userId) || typeof localStorage === "undefined") {
    return;
  }
  try {
    const { configKey, lockoutKey } = getStorageKeys(userId);
    if (configKey) localStorage.removeItem(configKey);
    if (lockoutKey) localStorage.removeItem(lockoutKey);
    clearSessionUnlock(userId);
  } catch (err) {
    console.error("[appLock] clearUserLockConfig error:", err);
  }
}

export function loadLockoutState(userId) {
  if (!isValidUserId(userId) || typeof localStorage === "undefined") {
    return { failedAttempts: 0, lockoutUntil: 0 };
  }
  try {
    const { lockoutKey } = getStorageKeys(userId);
    if (!lockoutKey) return { failedAttempts: 0, lockoutUntil: 0 };

    const raw = localStorage.getItem(lockoutKey);
    if (!raw) return { failedAttempts: 0, lockoutUntil: 0 };

    const parsed = JSON.parse(raw);
    return {
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockoutUntil: Number(parsed.lockoutUntil) || 0,
    };
  } catch {
    return { failedAttempts: 0, lockoutUntil: 0 };
  }
}

export function saveLockoutState(userId, state) {
  if (!isValidUserId(userId) || typeof localStorage === "undefined") {
    return;
  }
  try {
    const { lockoutKey } = getStorageKeys(userId);
    if (!lockoutKey) return;

    const serialized = JSON.stringify(state);
    localStorage.setItem(lockoutKey, serialized);
  } catch (err) {
    console.error("[appLock] saveLockoutState error:", err);
  }
}

export function getLockoutDurationSeconds(attempts) {
  if (attempts >= 6) return 300; // 5 minutes
  if (attempts === 5) return 60;  // 1 minute
  if (attempts === 4) return 30;  // 30 seconds
  return 0;
}

/**
 * One-time sanitization of legacy unscoped / contaminated keys.
 * Preserves E2EE keys, sessions, and valid user-scoped keys.
 */
export function sanitizeLegacyLockStorage() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:config:default`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}:lockout:default`);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    }
  } catch {}
}

// Auto-run legacy cleanup on import
sanitizeLegacyLockStorage();
