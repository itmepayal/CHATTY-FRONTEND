import {
  registerDeviceApi,
  getDevicesPublicKeysApi,
  getUserPublicKeyApi,
  heartbeatDeviceApi,
} from "./e2ee.api.js";

const DEVICE_ID_KEY = "chatty_e2ee_device_id";
const DEVICE_CACHE_TTL_MS = 20_000;
const REGISTRATION_COOLDOWN_MS = 60_000;

let inMemoryDeviceId = null;
let lastRegisteredKey = null;
let lastRegisteredTime = 0;
let lastRegisteredResult = null;

const deviceCache = new Map();
const deviceCacheTimers = new Map();

const generateUuid = () => {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const isPersistentStorageAvailable = () => {
  try {
    const testKey = "__chatty_storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const getDeviceId = () => {
  try {
    if (typeof localStorage !== "undefined") {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (
        id &&
        typeof id === "string" &&
        id.trim().length > 0 &&
        id !== "device-session-fallback"
      ) {
        inMemoryDeviceId = id;
        return id;
      }
      id = generateUuid();
      try {
        localStorage.setItem(DEVICE_ID_KEY, id);
      } catch {}
      inMemoryDeviceId = id;
      return id;
    }
  } catch {}

  try {
    if (typeof sessionStorage !== "undefined") {
      let sessId = sessionStorage.getItem(DEVICE_ID_KEY);
      if (
        sessId &&
        typeof sessId === "string" &&
        sessId.trim().length > 0 &&
        sessId !== "device-session-fallback"
      ) {
        inMemoryDeviceId = sessId;
        return sessId;
      }
      sessId = generateUuid();
      try {
        sessionStorage.setItem(DEVICE_ID_KEY, sessId);
      } catch {}
      inMemoryDeviceId = sessId;
      return sessId;
    }
  } catch {}

  if (!inMemoryDeviceId || inMemoryDeviceId === "device-session-fallback") {
    inMemoryDeviceId = generateUuid();
    console.warn(
      "[E2EE Device] Browser storage unavailable. Using ephemeral in-memory device ID for this session.",
    );
  }
  return inMemoryDeviceId;
};

export const getDeviceName = () => {
  try {
    const ua = navigator.userAgent || "";
    let browser = "Web Client";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    let os = "Device";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "Mac";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  } catch {
    return "Web Browser";
  }
};

export const registerCurrentDevice = async (userId, publicJwk) => {
  if (!userId || !publicJwk) return null;
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  const fingerprint = `${userId}:${deviceId}:${publicJwk.x}:${publicJwk.y}`;
  const now = Date.now();

  // Deduplication check: if registered recently with identical key, just send a heartbeat
  if (
    lastRegisteredKey === fingerprint &&
    now - lastRegisteredTime < REGISTRATION_COOLDOWN_MS
  ) {
    heartbeatDeviceApi?.(deviceId).catch(() => {});
    return lastRegisteredResult;
  }

  try {
    const result = await registerDeviceApi({
      deviceId,
      publicKey: publicJwk,
      deviceName,
    });
    lastRegisteredKey = fingerprint;
    lastRegisteredTime = now;
    lastRegisteredResult = result;
    return result;
  } catch (err) {
    if (err?.response?.status === 403) {
      console.warn("[E2EE Device] Current device has been revoked on server.");
      return { isRevoked: true };
    }
    console.warn("[E2EE Device] Failed to register device key:", err?.message);
    return null;
  }
};

let lastHeartbeatTime = 0;
const HEARTBEAT_THROTTLE_MS = 60_000;

export const touchDeviceActivity = async () => {
  const now = Date.now();
  if (now - lastHeartbeatTime < HEARTBEAT_THROTTLE_MS) return null;
  lastHeartbeatTime = now;
  try {
    const deviceId = getDeviceId();
    if (!deviceId || deviceId === "device-session-fallback") return null;
    const res = await heartbeatDeviceApi(deviceId);
    return res;
  } catch (err) {
    if (err?.response?.status === 403) {
      console.warn("[E2EE Device] Device heartbeat failed: device is revoked.");
      return { isRevoked: true };
    }
    return null;
  }
};

/**
 * Clears the in-memory device public key cache and registration state.
 */
export const clearDeviceCache = () => {
  deviceCache.clear();
  deviceCacheTimers.clear();
  lastRegisteredKey = null;
  lastRegisteredTime = 0;
  lastRegisteredResult = null;
  lastHeartbeatTime = 0;
};

/**
 * Fetches active devices for target users (recipient + sender's other devices).
 * @param {string[]} userIds
 * @returns {Promise<Array<{ userId: string, deviceId: string, publicKey: object }>>}
 */
export const fetchActiveDevicesForUsers = async (userIds) => {
  const uniqueIds = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const now = Date.now();
  const needed = uniqueIds.filter((id) => {
    const cachedTime = deviceCacheTimers.get(id);
    return !cachedTime || now - cachedTime > DEVICE_CACHE_TTL_MS;
  });

  if (needed.length > 0) {
    try {
      const res = await getDevicesPublicKeysApi(needed);
      const userDevices = res?.userDevices || {};

      for (const uid of needed) {
        const devices = userDevices[uid] || [];
        deviceCache.set(uid, devices);
        deviceCacheTimers.set(uid, now);
      }
    } catch (err) {
      console.warn("[E2EE Device] Batch device lookup failed:", err?.message);
    }
  }

  const allDevices = [];
  for (const uid of uniqueIds) {
    let devices = deviceCache.get(uid);

    if (!devices || devices.length === 0) {
      try {
        const pub = await getUserPublicKeyApi(uid);
        if (pub?.publicKey) {
          devices = [
            {
              deviceId: "default",
              publicKey: pub.publicKey,
            },
          ];
          deviceCache.set(uid, devices);
          deviceCacheTimers.set(uid, now);
        }
      } catch {
        devices = [];
      }
    }

    if (Array.isArray(devices)) {
      for (const d of devices) {
        if (d?.publicKey) {
          allDevices.push({
            userId: uid,
            deviceId: d.deviceId || "default",
            publicKey: d.publicKey,
          });
        }
      }
    }
  }

  return allDevices;
};

export const computeKeyFingerprint = async (publicJwk) => {
  if (!publicJwk || !publicJwk.x || !publicJwk.y) return "";
  try {
    const rawData = new TextEncoder().encode(
      `P-256:${publicJwk.x}:${publicJwk.y}`,
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", rawData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    return (
      hex
        .slice(0, 32)
        .match(/.{1,4}/g)
        ?.join(" ") || hex.slice(0, 32)
    );
  } catch (err) {
    console.warn(
      "[E2EE Device] Failed to compute key fingerprint:",
      err?.message,
    );
    return "";
  }
};
