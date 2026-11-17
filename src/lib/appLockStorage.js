/**
 * Device-local storage and lockout persistence for App Lock.
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

export function getStorageKeys(userId) {
  const uid = userId ? String(userId) : "default";
  return {
    configKey: `${STORAGE_KEY_PREFIX}:config:${uid}`,
    lockoutKey: `${STORAGE_KEY_PREFIX}:lockout:${uid}`,
  };
}

export function loadLocalConfig(userId) {
  try {
    const uid = userId ? String(userId) : "default";
    const { configKey } = getStorageKeys(uid);
    let raw = localStorage.getItem(configKey);

    // Fallback: check "default" key if configured before uid was resolved
    if (!raw && uid !== "default") {
      raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:config:default`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.enabled && parsed?.verifier) {
            localStorage.setItem(configKey, raw);
          } else {
            raw = null;
          }
        } catch {
          raw = null;
        }
      }
    }

    // Fallback: search for any existing configured PIN for this device
    if (!raw) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${STORAGE_KEY_PREFIX}:config:`)) {
          const candidate = localStorage.getItem(k);
          if (candidate) {
            try {
              const parsed = JSON.parse(candidate);
              if (parsed?.enabled && parsed?.verifier) {
                raw = candidate;
                if (uid !== "default") {
                  localStorage.setItem(configKey, raw);
                }
                break;
              }
            } catch {}
          }
        }
      }
    }

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalConfig(userId, config) {
  try {
    const uid = userId ? String(userId) : "default";
    const { configKey } = getStorageKeys(uid);
    if (!config) {
      localStorage.removeItem(configKey);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}:config:default`);
    } else {
      const serialized = JSON.stringify(config);
      localStorage.setItem(configKey, serialized);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:config:default`, serialized);
    }
  } catch (err) {
    console.error("[appLock] saveLocalConfig error:", err);
  }
}

export function loadLockoutState(userId) {
  try {
    const uid = userId ? String(userId) : "default";
    const { lockoutKey } = getStorageKeys(uid);
    let raw = localStorage.getItem(lockoutKey);
    if (!raw && uid !== "default") {
      raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:lockout:default`);
    }
    if (!raw) return { failedAttempts: 0, lockoutUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      failedAttempts: parsed.failedAttempts || 0,
      lockoutUntil: parsed.lockoutUntil || 0,
    };
  } catch {
    return { failedAttempts: 0, lockoutUntil: 0 };
  }
}

export function saveLockoutState(userId, state) {
  try {
    const uid = userId ? String(userId) : "default";
    const { lockoutKey } = getStorageKeys(uid);
    const serialized = JSON.stringify(state);
    localStorage.setItem(lockoutKey, serialized);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}:lockout:default`, serialized);
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
