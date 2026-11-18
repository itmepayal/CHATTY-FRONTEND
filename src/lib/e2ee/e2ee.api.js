/**
 * E2EE REST API Integration Client
 * Interfaces with backend E2EE endpoints via existing axiosInstance.
 */

import { axiosInstance } from "../axios.js";
import { RESET_CONFIRM_KEYWORD } from "./e2ee.constants.js";

/**
 * Fetches current user's E2EE registration and backup status.
 * @returns {Promise<{ hasPublicKey: boolean, hasKey: boolean, hasBackup: boolean, backupVersion: number|null, backupUpdatedAt: string|null, publicKeyUpdatedAt: string|null }>}
 */
export const getE2EEStatusApi = async () => {
  const res = await axiosInstance.get("/e2ee/status", {
    withCredentials: true,
  });
  return res.data?.data;
};

/**
 * Registers initial EC P-256 public key and encrypted private key backup.
 * @param {{ publicKey: { kty: string, crv: string, x: string, y: string }, encryptedPrivateKey: string, backupVersion?: number }} payload
 * @returns {Promise<object>}
 */
export const registerE2EEKeysApi = async ({
  publicKey,
  encryptedPrivateKey,
  backupVersion = 1,
}) => {
  const res = await axiosInstance.post(
    "/e2ee/keys",
    {
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: publicKey.x,
        y: publicKey.y,
      },
      encryptedPrivateKey,
      backupVersion,
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Fetches authenticated user's encrypted private key backup.
 * @returns {Promise<{ encryptedPrivateKey: string, backupVersion: number, backupUpdatedAt: string }>}
 */
export const getE2EEBackupApi = async () => {
  const res = await axiosInstance.get("/e2ee/backup", {
    withCredentials: true,
  });
  return res.data?.data;
};

/**
 * Updates the encrypted private key backup without altering public key identity.
 * @param {{ encryptedPrivateKey: string, backupVersion?: number }} payload
 * @returns {Promise<{ hasBackup: boolean, backupVersion: number, backupUpdatedAt: string }>}
 */
export const updateE2EEBackupApi = async ({
  encryptedPrivateKey,
  backupVersion,
}) => {
  const res = await axiosInstance.put(
    "/e2ee/backup",
    {
      encryptedPrivateKey,
      ...(backupVersion ? { backupVersion } : {}),
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Destructive identity reset requiring account password.
 * @param {{ password: string, confirm?: string }} payload
 * @returns {Promise<{ reset: boolean, warning: string }>}
 */
export const resetE2EEIdentityApi = async ({
  password,
  confirm = RESET_CONFIRM_KEYWORD,
}) => {
  const res = await axiosInstance.post(
    "/e2ee/reset",
    { password, confirm },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Retrieves public key for a target user ID.
 * Falls back to legacy /users/:id/public-key if /messages/e2ee/public-key/:id 404s.
 * @param {string} userId
 * @returns {Promise<{ userId: string, publicKey: object, publicKeyUpdatedAt: string } | null>}
 */
export const getUserPublicKeyApi = async (userId) => {
  if (!userId) return null;
  const uid = String(userId);

  try {
    const res = await axiosInstance.get(`/messages/e2ee/public-key/${uid}`, {
      withCredentials: true,
    });
    return res.data?.data || null;
  } catch (err) {
    if (err?.response?.status === 404) {
      // Fallback to legacy endpoint
      try {
        const legacyRes = await axiosInstance.get(`/users/${uid}/public-key`, {
          withCredentials: true,
        });
        const pub = legacyRes.data?.data?.publicKey;
        if (!pub) return null;
        return {
          userId: uid,
          publicKey: pub,
          publicKeyUpdatedAt: legacyRes.data?.data?.publicKeyUpdatedAt || null,
        };
      } catch (legacyErr) {
        if (legacyErr?.response?.status === 404) return null;
        throw legacyErr;
      }
    }
    throw err;
  }
};

/**
 * Batch retrieves public keys for multiple users.
 * @param {string[]} userIds
 * @returns {Promise<{ keys: Array<{ userId: string, hasKey: boolean, publicKey: object }>, publicKeys: Record<string, object>, count: number }>}
 */
export const getBatchPublicKeysApi = async (userIds) => {
  if (!Array.isArray(userIds) || !userIds.length) {
    return { keys: [], publicKeys: {}, count: 0 };
  }

  const res = await axiosInstance.post(
    "/messages/e2ee/public-keys",
    { userIds },
    { withCredentials: true },
  );
  return res.data?.data || { keys: [], publicKeys: {}, count: 0 };
};

/**
 * Registers this device's public key for multi-device E2EE.
 * @param {{ deviceId: string, publicKey: object, deviceName?: string }} payload
 */
export const registerDeviceApi = async ({
  deviceId,
  publicKey,
  deviceName,
}) => {
  const res = await axiosInstance.post(
    "/e2ee/devices",
    {
      deviceId,
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: publicKey.x,
        y: publicKey.y,
      },
      deviceName,
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Updates last active timestamp for this device without re-registering full public keys.
 * @param {string} deviceId
 */
export const heartbeatDeviceApi = async (deviceId) => {
  try {
    const res = await axiosInstance.post(
      "/e2ee/devices/heartbeat",
      { deviceId },
      { withCredentials: true },
    );
    return res.data?.data;
  } catch {
    return null;
  }
};

/**
 * Retrieves all registered devices for the current authenticated user.
 */
export const getRegisteredDevicesApi = async () => {
  const res = await axiosInstance.get("/e2ee/devices", {
    withCredentials: true,
  });
  return res.data?.data?.devices || [];
};

/**
 * Revokes a registered device.
 * @param {string} deviceId
 */
export const revokeDeviceApi = async (deviceId) => {
  const res = await axiosInstance.delete(`/e2ee/devices/${deviceId}`, {
    withCredentials: true,
  });
  return res.data?.data;
};

/**
 * Rotates an active device's public key.
 * @param {{ deviceId: string, newPublicKey: object, deviceName?: string }} payload
 */
export const rotateDeviceApi = async ({
  deviceId,
  newPublicKey,
  deviceName,
}) => {
  const res = await axiosInstance.post(
    "/e2ee/devices/rotate",
    {
      deviceId,
      newPublicKey: {
        kty: "EC",
        crv: "P-256",
        x: newPublicKey.x,
        y: newPublicKey.y,
      },
      deviceName,
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Batch retrieves active device public keys for an array of user IDs.
 * @param {string[]} userIds
 * @returns {Promise<{ devices: Array<{ userId: string, deviceId: string, publicKey: object }>, userDevices: Record<string, Array<{ deviceId: string, publicKey: object }>> }>}
 */
export const getDevicesPublicKeysApi = async (userIds) => {
  if (!Array.isArray(userIds) || !userIds.length) {
    return { devices: [], userDevices: {}, count: 0 };
  }
  const res = await axiosInstance.post(
    "/e2ee/devices/public-keys",
    { userIds },
    { withCredentials: true },
  );
  return res.data?.data || { devices: [], userDevices: {}, count: 0 };
};

/**
 * Initiates a device linking session for a new device.
 * @param {{ ephemeralPublicKey: object, deviceId: string, deviceName?: string }} payload
 * @returns {Promise<{ linkSessionId: string, linkingPin: string, expiresAt: string }>}
 */
export const requestDeviceLinkApi = async ({
  ephemeralPublicKey,
  deviceId,
  deviceName,
}) => {
  const res = await axiosInstance.post(
    "/e2ee/devices/link/request",
    {
      ephemeralPublicKey,
      deviceId,
      deviceName,
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Checks the status of a pending device linking session.
 * @param {string} linkSessionId
 * @returns {Promise<{ linkSessionId: string, linkingPin: string, status: string, encryptedPayload: object|null, expiresAt: string }>}
 */
export const getDeviceLinkStatusApi = async (linkSessionId) => {
  const res = await axiosInstance.get(
    `/e2ee/devices/link/status/${encodeURIComponent(linkSessionId)}`,
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Looks up a pending device link session using its 6-digit PIN.
 * @param {string} linkingPin
 * @returns {Promise<{ linkSessionId: string, linkingPin: string, ephemeralPublicKey: object, newDeviceId: string, newDeviceName: string, expiresAt: string }>}
 */
export const lookupPendingLinkSessionApi = async (linkingPin) => {
  const cleanPin = String(linkingPin)
    .trim()
    .replace(/[\s-]+/g, "");
  const res = await axiosInstance.get(
    `/e2ee/devices/link/pin/${encodeURIComponent(cleanPin)}`,
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Approves a device linking request from an existing trusted device.
 * @param {{ linkSessionId: string, linkingPin: string, encryptedPayload: object, approverDeviceId: string }} payload
 * @returns {Promise<object>}
 */
export const approveDeviceLinkApi = async ({
  linkSessionId,
  linkingPin,
  encryptedPayload,
  approverDeviceId,
}) => {
  const cleanPin = linkingPin
    ? String(linkingPin)
        .trim()
        .replace(/[\s-]+/g, "")
    : undefined;
  const res = await axiosInstance.post(
    "/e2ee/devices/link/approve",
    {
      linkSessionId,
      linkingPin: cleanPin,
      encryptedPayload,
      approverDeviceId,
    },
    { withCredentials: true },
  );
  return res.data?.data;
};

/**
 * Cancels an active or pending device linking session.
 * @param {string} linkSessionId
 * @returns {Promise<{ cancelled: boolean, linkSessionId: string }>}
 */
export const cancelDeviceLinkApi = async (linkSessionId) => {
  const res = await axiosInstance.delete(
    `/e2ee/devices/link/${encodeURIComponent(linkSessionId)}`,
    { withCredentials: true },
  );
  return res.data?.data;
};
