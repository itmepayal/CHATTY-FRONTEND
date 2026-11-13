/**
 * E2EE Device Registry Manager
 * Manages unique client deviceId, device registration, and device public key caching.
 */

import {
  registerDeviceApi,
  getDevicesPublicKeysApi,
  getUserPublicKeyApi,
} from "./e2ee.api.js";

const DEVICE_ID_KEY = "chatty_e2ee_device_id";
const DEVICE_CACHE_TTL_MS = 20_000;

const deviceCache = new Map();
const deviceCacheTimers = new Map();

/**
 * Generates a standard UUID v4.
 */
const generateUuid = () => {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Returns the persistent unique device ID for this client instance.
 */
export const getDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.trim().length === 0) {
      id = generateUuid();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "device-session-fallback";
  }
};

/**
 * Determines a human-readable name for the device based on userAgent.
 */
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

/**
 * Registers the current device public key with the backend.
 * @param {string} userId
 * @param {object} publicJwk
 */
export const registerCurrentDevice = async (userId, publicJwk) => {
  if (!userId || !publicJwk) return null;
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  try {
    return await registerDeviceApi({
      deviceId,
      publicKey: publicJwk,
      deviceName,
    });
  } catch (err) {
    console.warn("[E2EE Device] Failed to register device key:", err?.message);
    return null;
  }
};

/**
 * Clears the in-memory device public key cache.
 */
export const clearDeviceCache = () => {
  deviceCache.clear();
  deviceCacheTimers.clear();
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

    // Fallback: If no devices registered in cache, try fetching legacy public key
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
