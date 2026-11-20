import { axiosInstance } from "./axios.js";
import { e2eeManager } from "./e2ee/e2eeManager.js";
import { getUserPublicKeyApi } from "./e2ee/e2ee.api.js";
import { CRYPTO_PARAMS, E2EE_STATUS } from "./e2ee/e2ee.constants.js";
import {
  getDeviceId,
  fetchActiveDevicesForUsers,
  clearDeviceCache,
  touchDeviceActivity,
} from "./e2ee/e2eeDevice.js";
import { customToast as toast } from "../components/toast/customToastService.js";

const subtle = globalThis.crypto?.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = {
  name: CRYPTO_PARAMS.ECDH_NAME,
  namedCurve: CRYPTO_PARAMS.ECDH_CURVE,
};

export const assertCryptoSubtle = () => {
  if (!globalThis.crypto?.subtle) {
    const msg =
      "Encryption needs HTTPS. Open the app over https (use ngrok/cloudflared tunnel or deploy)";
    try {
      toast?.error?.(msg, { id: "e2ee-unsupported-https", duration: 8000 });
    } catch {
      // ignore in headless/test environments
    }
    throw new Error(msg);
  }
};

export const b64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
};

export const unb64 = (str) =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const randomIv = () =>
  crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.AES_GCM_IV_BYTES));

const peerCache = new Map();
const sharedCache = new Map();
const groupKeyCache = new Map();
const groupLatest = new Map();
const loading = new Map();
const lastLoad = new Map();

export const getE2EEStatus = () => e2eeManager.getStatus();
export const whenE2EEReady = () => e2eeManager.whenReady();

export const clearE2EECache = () => {
  e2eeManager.clear();
  clearDeviceCache();
  peerCache.clear();
  sharedCache.clear();
  groupKeyCache.clear();
  groupLatest.clear();
  loading.clear();
  lastLoad.clear();
};

const clearDerived = () => {
  clearDeviceCache();
  peerCache.clear();
  sharedCache.clear();
  groupKeyCache.clear();
  groupLatest.clear();
  loading.clear();
  lastLoad.clear();
};

export { getDeviceId };

export const initE2EE = (userId) => {
  assertCryptoSubtle();
  clearDerived();
  return e2eeManager.init(userId);
};

export const resetE2EEKeys = async (userId, password) => {
  assertCryptoSubtle();
  clearDerived();
  return e2eeManager.resetIdentity(password);
};

export const wipeLocalKeys = () => {
  clearDerived();
  return e2eeManager.clear();
};

const importPublic = (jwk) => {
  const obj = typeof jwk === "string" ? JSON.parse(jwk) : jwk;
  return subtle.importKey(
    "jwk",
    { kty: obj.kty, crv: obj.crv, x: obj.x, y: obj.y },
    ECDH,
    true,
    [],
  );
};

const importPublicRaw = (raw) => subtle.importKey("raw", raw, ECDH, true, []);

const fetchPeer = (userId) => {
  const id = String(userId);
  if (peerCache.has(id)) return peerCache.get(id);

  const p = (async () => {
    const me = e2eeManager.me;
    if (me && id === String(me.userId)) {
      return { jwk: me.publicJwk, key: await importPublic(me.publicJwk) };
    }
    try {
      const data = await getUserPublicKeyApi(id);
      const jwk = data?.publicKey;
      if (jwk) {
        return { jwk, key: await importPublic(jwk) };
      }
      return null;
    } catch (e) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  })();

  peerCache.set(id, p);
  p.then((v) => !v && peerCache.delete(id)).catch(() => peerCache.delete(id));
  return p;
};

const deriveShared = async (privateKey, publicKey) => {
  const bits = await subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  const hk = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(CRYPTO_PARAMS.HKDF_SALT_LENGTH),
      info: enc.encode(CRYPTO_PARAMS.HKDF_INFO_STRING),
    },
    hk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const pairKey = (userId) => {
  const id = String(userId);
  if (sharedCache.has(id)) return sharedCache.get(id);

  const p = (async () => {
    await e2eeManager.whenReady();
    const me = e2eeManager.me;
    if (!me?.privateKey || e2eeManager.status !== E2EE_STATUS.READY) {
      throw new Error("e2ee-not-ready");
    }
    const peer = await fetchPeer(id);
    if (!peer) {
      throw new Error("peer-has-no-key");
    }
    return deriveShared(me.privateKey, peer.key);
  })();

  sharedCache.set(id, p);
  p.catch(() => sharedCache.delete(id));
  return p;
};

export const encryptFor = async (peerId, plaintext) => {
  assertCryptoSubtle();
  touchDeviceActivity()?.catch?.(() => {});
  await e2eeManager.whenReady();
  const me = e2eeManager.me;
  if (!me?.privateKey || e2eeManager.status !== E2EE_STATUS.READY) {
    throw new Error("e2ee-not-ready");
  }

  // 1. Random 32-byte AES-GCM message key, encrypt plaintext with a random 12-byte IV
  const msgKeyRaw = crypto.getRandomValues(new Uint8Array(32));
  const msgKey = await subtle.importKey("raw", msgKeyRaw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  const msgIv = randomIv();
  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv: msgIv },
    msgKey,
    enc.encode(plaintext),
  );

  // 2. Gather active devices of peer + me via fetchActiveDevicesForUsers([peerId, me.userId])
  const destDevices = await fetchActiveDevicesForUsers([peerId, me.userId]);

  // Fall back to fetchPeer(peerId) public key as deviceId "default" if peer has no device entries
  const hasPeerDevice = destDevices.some(
    (d) => String(d.userId) === String(peerId),
  );
  if (!hasPeerDevice) {
    const peer = await fetchPeer(peerId);
    if (!peer?.jwk) {
      throw new Error("peer-has-no-key");
    }
    destDevices.push({
      userId: String(peerId),
      deviceId: "default",
      publicKey: peer.jwk,
    });
  }

  // ALWAYS add my current device (getDeviceId(), me.publicJwk)
  const myDeviceId = getDeviceId();
  const hasMyDevice = destDevices.some(
    (d) => String(d.userId) === String(me.userId) && d.deviceId === myDeviceId,
  );
  if (!hasMyDevice && me.publicJwk) {
    destDevices.push({
      userId: String(me.userId),
      deviceId: myDeviceId,
      publicKey: me.publicJwk,
    });
  }

  // Deduplicate target devices by userId:deviceId
  const seenDev = new Set();
  const uniqueDevices = [];
  for (const d of destDevices) {
    if (!d || !d.publicKey || !d.deviceId || !d.userId) continue;
    const key = `${d.userId}:${d.deviceId}`;
    if (!seenDev.has(key)) {
      seenDev.add(key);
      uniqueDevices.push(d);
    }
  }

  // Throw "peer-has-no-key" if no envelope exists for the peer
  const peerExists = uniqueDevices.some(
    (d) => String(d.userId) === String(peerId),
  );
  if (!peerExists) {
    throw new Error("peer-has-no-key");
  }

  // 3. Generate ONE ephemeral ECDH key pair per message
  const ephemeralPair = await subtle.generateKey(ECDH, true, ["deriveBits"]);
  const ephemeralPublicRaw = await subtle.exportKey(
    "raw",
    ephemeralPair.publicKey,
  );
  const ephemeralPublicB64 = b64(ephemeralPublicRaw);

  // For each target device: wrapKey = deriveShared(ephemeralPrivate, devicePublic); wrap message key with AES-GCM and fresh IV
  const keyEnvelopes = [];
  for (const dev of uniqueDevices) {
    try {
      const devPubKey = await importPublic(dev.publicKey);
      const wrapKey = await deriveShared(ephemeralPair.privateKey, devPubKey);
      const wrapIv = randomIv();
      const wrapped = await subtle.encrypt(
        { name: "AES-GCM", iv: wrapIv },
        wrapKey,
        msgKeyRaw,
      );
      // 4. envelope = { deviceId, userId, wrappedKey: "v2:" + base64(ephemeralPublicRaw) + ":" + base64(wrapped), iv }
      keyEnvelopes.push({
        deviceId: String(dev.deviceId),
        userId: String(dev.userId),
        wrappedKey: `v2:${ephemeralPublicB64}:${b64(wrapped)}`,
        iv: b64(wrapIv),
      });
    } catch {
      // Continue wrapping for remaining devices if one fails
    }
  }

  return {
    text: b64(ct),
    iv: b64(msgIv),
    keyEnvelopes,
  };
};

export const decryptFrom = async (peerId, cipherB64, ivB64, message = null) => {
  assertCryptoSubtle();
  touchDeviceActivity()?.catch?.(() => {});
  await e2eeManager.whenReady();
  const me = e2eeManager.me;
  if (!me?.privateKey || e2eeManager.status !== E2EE_STATUS.READY) {
    throw new Error("e2ee-not-ready");
  }

  const myDeviceId = getDeviceId();
  const envelopes = message?.keyEnvelopes || [];

  // Take envelopes where userId === me.userId; try in order: my deviceId, "default", any other of mine
  if (Array.isArray(envelopes) && envelopes.length > 0) {
    const myEnvelopes = envelopes.filter(
      (e) => String(e.userId) === String(me.userId),
    );

    const orderedEnvelopes = [];
    const directDevEnv = myEnvelopes.find((e) => e.deviceId === myDeviceId);
    if (directDevEnv) orderedEnvelopes.push(directDevEnv);

    const defaultDevEnv = myEnvelopes.find(
      (e) => e.deviceId === "default" && e !== directDevEnv,
    );
    if (defaultDevEnv) orderedEnvelopes.push(defaultDevEnv);

    // Also include any other envelope addressed to this user (e.g. from user's other authorized devices sharing master key)
    for (const env of myEnvelopes) {
      if (!orderedEnvelopes.includes(env)) {
        orderedEnvelopes.push(env);
      }
    }

    for (const env of orderedEnvelopes) {
      try {
        let rawMsgKey = null;

        // if wrappedKey starts with "v2:": import ephemeral public key (raw, ECDH curve), derive shared with my private key, unwrap
        if (
          typeof env.wrappedKey === "string" &&
          env.wrappedKey.startsWith("v2:")
        ) {
          const parts = env.wrappedKey.split(":");
          if (parts.length === 3) {
            const ephemPubRaw = unb64(parts[1]);
            const wrappedBytes = unb64(parts[2]);
            const ephemPubKey = await importPublicRaw(ephemPubRaw);
            const wrapKey = await deriveShared(me.privateKey, ephemPubKey);
            rawMsgKey = await subtle.decrypt(
              { name: "AES-GCM", iv: unb64(env.iv) },
              wrapKey,
              wrappedBytes,
            );
          }
        } else {
          // else (legacy envelope): old logic with sender identity public key
          const isMyOwnMessage =
            message?.senderId != null &&
            String(message.senderId) === String(me.userId);
          const senderUserId = isMyOwnMessage ? me.userId : peerId;
          const senderPeer = await fetchPeer(senderUserId);
          if (senderPeer?.key) {
            const wrapKey = await deriveShared(me.privateKey, senderPeer.key);
            rawMsgKey = await subtle.decrypt(
              { name: "AES-GCM", iv: unb64(env.iv) },
              wrapKey,
              unb64(env.wrappedKey),
            );
          }
        }

        if (rawMsgKey) {
          const msgKey = await subtle.importKey(
            "raw",
            rawMsgKey,
            "AES-GCM",
            false,
            ["decrypt"],
          );
          const pt = await subtle.decrypt(
            { name: "AES-GCM", iv: unb64(ivB64) },
            msgKey,
            unb64(cipherB64),
          );
          return dec.decode(pt);
        }
      } catch {
        // Continue to next envelope on error
      }
    }
  }

  // if all fail: legacy pairwise decrypt (pairKey) with one cache-clear retry
  const runPairwise = async () => {
    const key = await pairKey(peerId);
    const pt = await subtle.decrypt(
      { name: "AES-GCM", iv: unb64(ivB64) },
      key,
      unb64(cipherB64),
    );
    return dec.decode(pt);
  };

  try {
    return await runPairwise();
  } catch {
    peerCache.delete(String(peerId));
    sharedCache.delete(String(peerId));
    try {
      return await runPairwise();
    } catch {
      // Check if message had envelopes but not for this user
      if (Array.isArray(envelopes) && envelopes.length > 0) {
        const hasMyEnvelope = envelopes.some(
          (e) => String(e.userId) === String(me.userId),
        );
        if (!hasMyEnvelope) {
          throw new Error("Sent before this device was added");
        }
      }
      throw new Error("Decryption failed");
    }
  }
};

const gk = (groupId, version) => `${groupId}:${version}`;

const importGroupKey = (raw) =>
  subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);

export const wrapGroupKey = async (raw, userId) => {
  assertCryptoSubtle();
  const key = await pairKey(userId);
  const iv = randomIv();
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, raw);
  return { wrappedKey: b64(ct), iv: b64(iv) };
};

export const buildGroupKeyEntries = async (userIds, version) => {
  assertCryptoSubtle();
  const ids = [...new Set(userIds.map(String))];
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const entries = await Promise.all(
    ids.map(async (userId) => ({
      userId,
      version,
      ...(await wrapGroupKey(raw, userId)),
    })),
  );
  return { raw, entries };
};

export const cacheGroupKeyRaw = async (groupId, version, raw) => {
  groupKeyCache.set(gk(groupId, version), await importGroupKey(raw));
  groupLatest.set(
    String(groupId),
    Math.max(groupLatest.get(String(groupId)) || 0, version),
  );
};

export const loadGroupKeys = (groupId, { force = false } = {}) => {
  const id = String(groupId);
  if (loading.has(id)) return loading.get(id);
  if (!force && Date.now() - (lastLoad.get(id) || 0) < 10_000) {
    return Promise.resolve(groupLatest.get(id) || 0);
  }

  const p = (async () => {
    await e2eeManager.whenReady();
    const me = e2eeManager.me;
    if (!me?.privateKey) return 0;

    const res = await axiosInstance.get(`/groups/${id}/keys`, {
      withCredentials: true,
    });
    const { latestVersion = 0, keys = [] } = res.data?.data || {};
    groupLatest.set(id, latestVersion);

    for (const k of keys) {
      const ck = gk(id, k.version);
      if (groupKeyCache.has(ck)) continue;
      const wrapperPub =
        k.wrapperPublicKey ||
        (String(k.wrappedBy) === String(me.userId) ? me.publicJwk : null);
      if (!wrapperPub) continue;
      try {
        const shared = await deriveShared(
          me.privateKey,
          await importPublic(wrapperPub),
        );
        const raw = await subtle.decrypt(
          { name: "AES-GCM", iv: unb64(k.iv) },
          shared,
          unb64(k.wrappedKey),
        );
        groupKeyCache.set(ck, await importGroupKey(raw));
      } catch {
        void 0;
      }
    }
    return latestVersion;
  })().finally(() => {
    loading.delete(id);
    lastLoad.set(id, Date.now());
  });

  loading.set(id, p);
  return p;
};

const getGroupKey = async (groupId, version) => {
  let k = groupKeyCache.get(gk(groupId, version));
  if (!k) {
    await loadGroupKeys(groupId);
    k = groupKeyCache.get(gk(groupId, version));
  }
  return k || null;
};

export const getGroupLatestVersion = (groupId) =>
  groupLatest.get(String(groupId)) || 0;

export const exportGroupKeyRaw = async (groupId, version) => {
  const k = await getGroupKey(groupId, version);
  return k ? new Uint8Array(await subtle.exportKey("raw", k)) : null;
};

export const encryptGroupText = async (groupId, plaintext) => {
  assertCryptoSubtle();
  await e2eeManager.whenReady();
  const id = String(groupId);
  let version = groupLatest.get(id);
  if (!version) version = await loadGroupKeys(id, { force: true });
  if (!version) {
    throw new Error("group-not-encrypted");
  }
  let key = await getGroupKey(id, version);
  if (!key) {
    version = await loadGroupKeys(id, { force: true });
    if (version) key = await getGroupKey(id, version);
  }
  if (!key) {
    throw new Error("no-group-key");
  }

  const iv = randomIv();
  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return { text: b64(ct), iv: b64(iv), keyVersion: version };
};

export const decryptGroupText = async (groupId, version, cipherB64, ivB64) => {
  assertCryptoSubtle();
  await e2eeManager.whenReady();
  const key = await getGroupKey(String(groupId), Number(version));
  if (!key) throw new Error("no-group-key");
  const pt = await subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivB64) },
    key,
    unb64(cipherB64),
  );
  return dec.decode(pt);
};

export const forgetGroup = (groupId) => {
  const id = String(groupId);
  groupLatest.delete(id);
  lastLoad.delete(id);
  for (const k of [...groupKeyCache.keys()]) {
    if (k.startsWith(`${id}:`)) groupKeyCache.delete(k);
  }
};
