import { STORAGE_CONFIG } from "./e2ee.constants.js";

export const checkStorageAvailability = () => {
  const hasLocalStorage = (function () {
    try {
      if (typeof localStorage === "undefined") return false;
      const k = "__storage_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  })();

  const hasIndexedDB =
    typeof window !== "undefined" &&
    "indexedDB" in window &&
    window.indexedDB !== null;

  return {
    hasLocalStorage,
    hasIndexedDB,
    isFullySupported: hasLocalStorage && hasIndexedDB,
  };
};

const isIndexedDBSupported = () =>
  typeof window !== "undefined" &&
  "indexedDB" in window &&
  window.indexedDB !== null;

let dbInstancePromise = null;

const getDatabase = () => {
  if (!isIndexedDBSupported()) {
    return Promise.reject(
      new Error("IndexedDB is not supported in this environment."),
    );
  }

  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, 2);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
          db.createObjectStore(STORAGE_CONFIG.STORE_NAME);
        }
        if (
          STORAGE_CONFIG.VAULT_STORE_NAME &&
          !db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)
        ) {
          db.createObjectStore(STORAGE_CONFIG.VAULT_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbInstancePromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn("[E2EE KeyStore] IndexedDB open blocked by other tab.");
      };
    } catch (e) {
      dbInstancePromise = null;
      reject(e);
    }
  });

  return dbInstancePromise;
};

/**
 * Retrieves a user's cryptographic record from IndexedDB.
 * Throws when storage is unavailable or access is denied so callers can transition to STORAGE_ERROR.
 * @param {string} userId - Authenticated user ID.
 * @returns {Promise<{ privateKey: CryptoKey, publicJwk: object, version?: number, updatedAt?: string } | null>}
 */
export const getKeyRecord = async (userId) => {
  if (!userId) return null;
  const uid = String(userId);

  const db = await getDatabase();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_NAME, "readonly");
    const store = tx.objectStore(STORAGE_CONFIG.STORE_NAME);
    const req = store.get(uid);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  if (record) return record;

  // Check legacy store as fallback if not present in v2
  try {
    return await getLegacyKeyRecord(uid);
  } catch {
    return null;
  }
};

/**
 * Persists a user's identity record into IndexedDB.
 * Requires privateKey to be a CryptoKey (preferably extractable: false).
 * @param {string} userId - Authenticated user ID.
 * @param {{ privateKey: CryptoKey, publicJwk: object, version?: number }} record
 */
export const saveKeyRecord = async (
  userId,
  { privateKey, publicJwk, version = 1 },
) => {
  if (!userId) throw new Error("userId is required to persist keys.");
  if (!privateKey) throw new Error("privateKey CryptoKey is required.");
  if (!publicJwk || !publicJwk.x || !publicJwk.y) {
    throw new Error("Valid publicJwk is required.");
  }

  const uid = String(userId);
  const db = await getDatabase();

  const recordToStore = {
    userId: uid,
    privateKey,
    publicJwk: {
      kty: "EC",
      crv: "P-256",
      x: publicJwk.x,
      y: publicJwk.y,
    },
    version,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.STORE_NAME, "readwrite");
    const store = tx.objectStore(STORAGE_CONFIG.STORE_NAME);
    store.put(recordToStore, uid);

    tx.oncomplete = () => resolve(recordToStore);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("IndexedDB transaction was aborted."));
  });
};

/**
 * Checks if a key record exists locally for the given user.
 * @param {string} userId - Authenticated user ID.
 * @returns {Promise<boolean>}
 */
export const hasKeyRecord = async (userId) => {
  if (!userId) return false;
  const record = await getKeyRecord(userId);
  return Boolean(record?.privateKey && record?.publicJwk);
};

/**
 * Generates a high-entropy 256-bit recovery key formatted into groups of 8 characters.
 * @returns {string} e.g. "E8F34B9A-10293847-56473829-90182736-47382910-18273645-09182734-65473829"
 */
export const generateRecoveryKey = () => {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.match(/.{1,8}/g).join("-");
};

/**
 * Stores a user's recovery key securely in the local device vault.
 * @param {string} userId
 * @param {string} recoveryKey
 * @param {boolean} [acknowledged=false] - Whether user has confirmed saving/backing up the key.
 */
export const saveRecoveryKey = async (
  userId,
  recoveryKey,
  acknowledged = false,
) => {
  if (!userId || !recoveryKey) return;
  const uid = String(userId);
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_CONFIG.VAULT_STORE_NAME, "readwrite");
    const store = tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME);
    store.put(
      {
        userId: uid,
        recoveryKey,
        acknowledged: Boolean(acknowledged),
        updatedAt: new Date().toISOString(),
      },
      uid,
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Vault transaction aborted"));
  });
};

/**
 * Retrieves the user's recovery key metadata from the local device vault.
 * @param {string} userId
 * @returns {Promise<{ userId: string, recoveryKey: string, acknowledged: boolean, updatedAt: string } | null>}
 */
export const getRecoveryKeyMetadata = async (userId) => {
  if (!userId) return null;
  const uid = String(userId);
  try {
    const db = await getDatabase();
    if (!db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)) {
      return null;
    }
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.VAULT_STORE_NAME, "readonly");
      const store = tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME);
      const req = store.get(uid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(
      `[E2EE KeyStore] Error getting recovery key metadata for ${uid}:`,
      err,
    );
    return null;
  }
};

/**
 * Marks a user's recovery key as acknowledged/backed up.
 * @param {string} userId
 * @param {boolean} [acknowledged=true]
 */
export const setRecoveryKeyAcknowledged = async (
  userId,
  acknowledged = true,
) => {
  if (!userId) return;
  const uid = String(userId);
  try {
    const db = await getDatabase();
    if (!db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)) return;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.VAULT_STORE_NAME, "readwrite");
      const store = tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME);
      const req = store.get(uid);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.acknowledged = Boolean(acknowledged);
          item.updatedAt = new Date().toISOString();
          store.put(item, uid);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error("Vault transaction aborted"));
    });
  } catch (err) {
    console.warn(
      `[E2EE KeyStore] Failed to set recovery key acknowledged:`,
      err,
    );
  }
};

/**
 * Retrieves the user's recovery key from the local device vault.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export const getRecoveryKey = async (userId) => {
  if (!userId) return null;
  const uid = String(userId);
  try {
    const db = await getDatabase();
    if (!db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)) {
      return null;
    }
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.VAULT_STORE_NAME, "readonly");
      const store = tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME);
      const req = store.get(uid);
      req.onsuccess = () => resolve(req.result?.recoveryKey || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(
      `[E2EE KeyStore] Error getting recovery key for ${uid}:`,
      err,
    );
    return null;
  }
};

/**
 * Deletes the user's recovery key from the local device vault.
 * @param {string} userId
 */
export const deleteRecoveryKey = async (userId) => {
  if (!userId) return;
  const uid = String(userId);
  try {
    const db = await getDatabase();
    if (!db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.VAULT_STORE_NAME, "readwrite");
      tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME).delete(uid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(
      `[E2EE KeyStore] Failed to delete recovery key for ${uid}:`,
      err,
    );
  }
};

/**
 * Deletes a user's key record from local storage.
 * @param {string} userId - Authenticated user ID.
 */
export const deleteKeyRecord = async (userId) => {
  if (!userId) return;
  const uid = String(userId);

  try {
    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_CONFIG.STORE_NAME, "readwrite");
      tx.objectStore(STORAGE_CONFIG.STORE_NAME).delete(uid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Also delete from local device vault
    await deleteRecoveryKey(uid);

    // Also delete from legacy store if present
    await deleteLegacyKeyRecord(uid);
  } catch (err) {
    console.warn(`[E2EE KeyStore] Failed to delete keys for user ${uid}:`, err);
  }
};

/**
 * Clears all key records across all accounts.
 */
export const clearAllKeys = async () => {
  try {
    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORAGE_CONFIG.STORE_NAME, STORAGE_CONFIG.VAULT_STORE_NAME].filter(
          (name) => db.objectStoreNames.contains(name),
        ),
        "readwrite",
      );
      tx.objectStore(STORAGE_CONFIG.STORE_NAME).clear();
      if (db.objectStoreNames.contains(STORAGE_CONFIG.VAULT_STORE_NAME)) {
        tx.objectStore(STORAGE_CONFIG.VAULT_STORE_NAME).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[E2EE KeyStore] Failed to clear all keys:", err);
  }
};

/* ------------------------------------------------------------------ */
/*  Legacy Database Compatibility Helpers (chatty-e2ee store)          */
/* ------------------------------------------------------------------ */

const getLegacyKeyRecord = async (uid) => {
  if (!isIndexedDBSupported()) return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(STORAGE_CONFIG.LEGACY_DB_NAME, 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore(STORAGE_CONFIG.LEGACY_STORE_NAME);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORAGE_CONFIG.LEGACY_STORE_NAME)) {
          db.close();
          return resolve(null);
        }
        const tx = db.transaction(STORAGE_CONFIG.LEGACY_STORE_NAME, "readonly");
        const getReq = tx
          .objectStore(STORAGE_CONFIG.LEGACY_STORE_NAME)
          .get(uid);
        getReq.onsuccess = () => {
          db.close();
          resolve(getReq.result || null);
        };
        getReq.onerror = () => {
          db.close();
          resolve(null);
        };
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const deleteLegacyKeyRecord = async (uid) => {
  if (!isIndexedDBSupported()) return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(STORAGE_CONFIG.LEGACY_DB_NAME, 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORAGE_CONFIG.LEGACY_STORE_NAME)) {
          db.close();
          return resolve();
        }
        const tx = db.transaction(
          STORAGE_CONFIG.LEGACY_STORE_NAME,
          "readwrite",
        );
        tx.objectStore(STORAGE_CONFIG.LEGACY_STORE_NAME).delete(uid);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};
