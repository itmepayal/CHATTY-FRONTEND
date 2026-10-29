import { axiosInstance } from "./axios.js";

const subtle = globalThis.crypto?.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: "ECDH", namedCurve: "P-256" };

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

const randomIv = () => crypto.getRandomValues(new Uint8Array(12));

const DB = "chatty-e2ee";
const STORE = "keys";

const openDb = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const idbGet = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
};

const idbSet = async (key, value) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

let me = null;
let status = "idle";
let readyPromise = Promise.resolve("idle");

const peerCache = new Map();
const sharedCache = new Map();
const groupKeyCache = new Map();
const groupLatest = new Map();
const loading = new Map();
const lastLoad = new Map();

export const getE2EEStatus = () => status;
export const whenE2EEReady = () => readyPromise;

export const clearE2EECache = () => {
  me = null;
  status = "idle";
  readyPromise = Promise.resolve("idle");
  peerCache.clear();
  sharedCache.clear();
  groupKeyCache.clear();
  groupLatest.clear();
  loading.clear();
  lastLoad.clear();
};

const clearDerived = () => {
  peerCache.clear();
  sharedCache.clear();
  groupKeyCache.clear();
  groupLatest.clear();
  loading.clear();
  lastLoad.clear();
};

const putPublicKey = (publicKey, extra = {}) =>
  axiosInstance.put(
    "/users/me/public-key",
    { publicKey, ...extra },
    { withCredentials: true },
  );

const generateIdentity = async () => {
  const pair = await subtle.generateKey(ECDH, false, ["deriveBits"]);
  const jwk = await subtle.exportKey("jwk", pair.publicKey);
  return {
    privateKey: pair.privateKey,
    publicJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
  };
};

export const initE2EE = (userId) => {
  const uid = String(userId);

  // Guard: if already initializing for the same user, return the in-flight promise
  if (status === "pending" && me?.userId === uid) {
    console.log("[E2EE] initE2EE: already pending for user", uid);
    return readyPromise;
  }

  status = "pending";
  readyPromise = (async () => {
    if (!subtle) {
      console.warn("[E2EE] initE2EE: WebCrypto not available (unsupported browser)");
      return (status = "unsupported");
    }
    clearDerived();
    me = null;
    console.log("[E2EE] initE2EE: started for user", uid);
    try {
      const rec = await idbGet(uid);

      if (rec) {
        console.log("[E2EE] initE2EE: existing key pair found in IndexedDB");
        try {
          await putPublicKey(rec.publicJwk);
          console.log("[E2EE] initE2EE: public key registration succeeded (existing key)");
        } catch (e) {
          if (e?.response?.status === 409) {
            console.warn("[E2EE] initE2EE: server returned 409 CONFLICT — key locked (different key already registered)");
            return (status = "locked");
          }
          console.warn("[E2EE] initE2EE: public key registration failed (non-fatal, will retry on next init):", e?.message);
        }
        me = { userId: uid, ...rec };
        console.log("[E2EE] initE2EE: ready (existing key pair)");
        return (status = "ready");
      }

      console.log("[E2EE] initE2EE: no existing key — generating new ECDH P-256 key pair");
      const id = await generateIdentity();
      console.log("[E2EE] initE2EE: key generation complete — registering public key with server");
      try {
        await putPublicKey(id.publicJwk);
        console.log("[E2EE] initE2EE: public key registration succeeded (new key)");
      } catch (e) {
        if (e?.response?.status === 409) {
          console.warn("[E2EE] initE2EE: server returned 409 CONFLICT on new key — key locked");
          return (status = "locked");
        }
        throw e;
      }
      await idbSet(uid, id);
      me = { userId: uid, ...id };
      console.log("[E2EE] initE2EE: ready (new key pair generated and saved)");
      return (status = "ready");
    } catch (e) {
      console.error("[E2EE] initE2EE: initialization failed:", e?.message || e);
      return (status = "error");
    }
  })();
  return readyPromise;
};

export const resetE2EEKeys = async (userId, password) => {
  if (!subtle) throw new Error("Encryption isn't supported in this browser.");
  const uid = String(userId);
  const id = await generateIdentity();
  await putPublicKey(id.publicJwk, { replace: true, password });
  await idbSet(uid, id);
  clearDerived();
  me = { userId: uid, ...id };
  status = "ready";
  readyPromise = Promise.resolve("ready");
  return status;
};

export const wipeLocalKeys = (userId) =>
  idbDelete(String(userId)).catch(() => {});

const importPublic = (jwk) =>
  subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
    ECDH,
    true,
    [],
  );

const fetchPeer = (userId) => {
  const id = String(userId);
  if (peerCache.has(id)) return peerCache.get(id);

  const p = (async () => {
    if (me && id === me.userId) {
      return { jwk: me.publicJwk, key: await importPublic(me.publicJwk) };
    }
    try {
      const res = await axiosInstance.get(`/users/${id}/public-key`, {
        withCredentials: true,
      });
      const jwk = res.data?.data?.publicKey;
      if (jwk) {
        console.log("[E2EE] fetchPeer: public key fetched for peer", id);
        return { jwk, key: await importPublic(jwk) };
      }
      console.warn("[E2EE] fetchPeer: server returned no publicKey field for peer", id);
      return null;
    } catch (e) {
      if (e?.response?.status === 404) {
        console.warn("[E2EE] fetchPeer: peer has no public key registered (404):", id);
        return null;
      }
      console.error("[E2EE] fetchPeer: request failed for peer", id, e?.message);
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
      salt: new Uint8Array(32),
      info: enc.encode("chatty-e2ee-v1"),
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
    // Wait for initialization to complete before checking `me`
    await readyPromise;
    if (!me) throw new Error("e2ee-not-ready");
    const peer = await fetchPeer(id);
    if (!peer) {
      console.warn("[E2EE] pairKey: no public key found for peer", id);
      throw new Error("peer-has-no-key");
    }
    return deriveShared(me.privateKey, peer.key);
  })();
  sharedCache.set(id, p);
  p.catch(() => sharedCache.delete(id));
  return p;
};

export const encryptFor = async (peerId, plaintext) => {
  const key = await pairKey(peerId);
  const iv = randomIv();
  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return { text: b64(ct), iv: b64(iv) };
};

export const decryptFrom = async (peerId, cipherB64, ivB64) => {
  const run = async () => {
    const key = await pairKey(peerId);
    const pt = await subtle.decrypt(
      { name: "AES-GCM", iv: unb64(ivB64) },
      key,
      unb64(cipherB64),
    );
    return dec.decode(pt);
  };
  try {
    return await run();
  } catch {
    // peer may have replaced their key: drop caches and retry once
    peerCache.delete(String(peerId));
    sharedCache.delete(String(peerId));
    return run();
  }
};

const gk = (groupId, version) => `${groupId}:${version}`;

const importGroupKey = (raw) =>
  subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);

export const wrapGroupKey = async (raw, userId) => {
  const key = await pairKey(userId);
  const iv = randomIv();
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, raw);
  return { wrappedKey: b64(ct), iv: b64(iv) };
};

export const buildGroupKeyEntries = async (userIds, version) => {
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
    await readyPromise;
    if (!me) return 0;
    const res = await axiosInstance.get(`/groups/${id}/keys`, {
      withCredentials: true,
    });
    const { latestVersion = 0, keys = [] } = res.data?.data || {};
    groupLatest.set(id, latestVersion);

    for (const k of keys) {
      const ck = gk(id, k.version);
      if (groupKeyCache.has(ck) || !k.wrapperPublicKey) continue;
      try {
        const shared = await deriveShared(
          me.privateKey,
          await importPublic(k.wrapperPublicKey),
        );
        const raw = await subtle.decrypt(
          { name: "AES-GCM", iv: unb64(k.iv) },
          shared,
          unb64(k.wrappedKey),
        );
        groupKeyCache.set(ck, await importGroupKey(raw));
      } catch {}
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
  await readyPromise;
  const id = String(groupId);
  let version = groupLatest.get(id);
  if (version == null) version = await loadGroupKeys(id);
  if (!version) {
    console.warn("[E2EE] encryptGroupText: group has no encryption key yet for group", id);
    throw new Error("group-not-encrypted");
  }
  const key = await getGroupKey(id, version);
  if (!key) {
    console.warn("[E2EE] encryptGroupText: local group key missing for group", id, "version", version);
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
  await readyPromise;
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
