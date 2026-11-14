import { CRYPTO_PARAMS, E2EE_STATUS } from "./e2ee.constants.js";
import {
  E2EEConflictError,
  E2EEIdentityMismatchError,
  E2EENotReadyError,
} from "./e2eeErrors.js";
import {
  getKeyRecord,
  saveKeyRecord,
  deleteKeyRecord,
} from "./e2eeKeyStore.js";
import {
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
  importNonExtractablePrivateKey,
  publicKeysMatch,
} from "./e2eeBackup.crypto.js";
import {
  getE2EEStatusApi,
  registerE2EEKeysApi,
  getE2EEBackupApi,
  updateE2EEBackupApi,
  resetE2EEIdentityApi,
  getUserPublicKeyApi,
} from "./e2ee.api.js";
import { registerCurrentDevice } from "./e2eeDevice.js";
import toast from "react-hot-toast";

const subtle = globalThis.crypto?.subtle;
const ECDH_ALGO = {
  name: CRYPTO_PARAMS.ECDH_NAME,
  namedCurve: CRYPTO_PARAMS.ECDH_CURVE,
};

class E2EEManager {
  constructor() {
    this.status = E2EE_STATUS.IDLE;
    this.me = null;
    this.serverStatus = null;
    this.currentUserId = null;
    this.readyPromise = Promise.resolve(E2EE_STATUS.IDLE);
    this.initInFlight = null;
    this.listeners = new Set();
  }

  /* ------------------------------------------------------------------ */
  /*  State Subscription                                                */
  /* ------------------------------------------------------------------ */

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener({
          status: this.status,
          isReady: this.status === E2EE_STATUS.READY,
          me: this.me,
          serverStatus: this.serverStatus,
        });
      } catch (e) {
        console.error("[E2EE Manager] Error notifying listener:", e);
      }
    }
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      console.log(`[E2EE Manager] State: ${this.status} -> ${newStatus}`);
      this.status = newStatus;
      this.notify();
    }
    return newStatus;
  }

  getStatus() {
    return this.status;
  }

  async whenReady(timeoutMs = 3000) {
    if (this.status === E2EE_STATUS.READY && this.me?.privateKey) {
      return this.status;
    }
    let timer;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => resolve(this.status), timeoutMs);
    });
    try {
      const res = await Promise.race([this.readyPromise, timeoutPromise]);
      return res || this.status;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization & State Machine Resolution                         */
  /* ------------------------------------------------------------------ */

  async init(userId) {
    if (!userId) {
      this.clear();
      return this.setStatus(E2EE_STATUS.IDLE);
    }

    const uid = String(userId);

    // If already ready for this user, return immediately
    if (
      this.status === E2EE_STATUS.READY &&
      this.currentUserId === uid &&
      this.me?.privateKey
    ) {
      return this.status;
    }

    // Guard: Prevent concurrent duplicate initialization runs (e.g. React StrictMode)
    if (this.initInFlight && this.currentUserId === uid) {
      return this.initInFlight;
    }

    this.currentUserId = uid;
    this.setStatus(E2EE_STATUS.LOADING);

    this.initInFlight = (async () => {
      try {
        if (!subtle) {
          console.warn("[E2EE Manager] WebCrypto subtle is not supported.");
          try {
            toast.error(
              "Encryption needs HTTPS. Open the app over https (use ngrok/cloudflared tunnel or deploy)",
              { id: "e2ee-unsupported-https", duration: 8000 },
            );
          } catch {
            // ignore
          }
          return this.setStatus(E2EE_STATUS.UNSUPPORTED);
        }

        // 1. Fetch server E2EE status
        let server;
        try {
          server = await getE2EEStatusApi();
          this.serverStatus = server;
        } catch (err) {
          console.warn(
            "[E2EE Manager] Could not fetch server E2EE status:",
            err?.message,
          );
          // If server fails or unauthorized, fallback to error
          return this.setStatus(E2EE_STATUS.ERROR);
        }

        const hasServerPublicKey = Boolean(
          server?.hasPublicKey || server?.hasKey,
        );
        const hasServerBackup = Boolean(server?.hasBackup);

        // 2. Fetch local identity from IndexedDB
        let localRecord = null;
        try {
          localRecord = await getKeyRecord(uid);
        } catch (storageErr) {
          console.error("[E2EE Manager] Local storage error:", storageErr);
          return this.setStatus(E2EE_STATUS.STORAGE_ERROR);
        }

        // 3. Resolve state machine transitions
        if (!hasServerPublicKey) {
          if (!localRecord) {
            // Fresh user: no keys on server and no keys locally
            this.me = null;
            return this.setStatus(E2EE_STATUS.NOT_CONFIGURED);
          } else {
            // Local key exists but server has no identity (e.g. server was reset)
            // Stored local key is orphaned
            this.me = null;
            return this.setStatus(E2EE_STATUS.NOT_CONFIGURED);
          }
        }

        // Server HAS a registered public key
        const isLocalKeyValid =
          localRecord?.privateKey?.type === "private" &&
          localRecord?.privateKey?.algorithm?.name === "ECDH";

        if (isLocalKeyValid && localRecord?.publicJwk) {
          // Verify that local public key matches server registered public key
          const registered = await getUserPublicKeyApi(uid);
          const serverKey = registered?.publicKey;

          if (serverKey && publicKeysMatch(localRecord.publicJwk, serverKey)) {
            // Exact match: user identity is fully verified and READY
            this.me = {
              userId: uid,
              privateKey: localRecord.privateKey,
              publicJwk: localRecord.publicJwk,
              version: localRecord.version || 1,
            };
            registerCurrentDevice(uid, localRecord.publicJwk).catch(() => {});
            return this.setStatus(E2EE_STATUS.READY);
          } else if (serverKey) {
            // Cryptographic mismatch
            console.error(
              "[E2EE Manager] IDENTITY MISMATCH: local key does not match server key.",
            );
            this.me = null;
            return this.setStatus(E2EE_STATUS.IDENTITY_MISMATCH);
          }
        }

        // Server has key, but local device does not have matching private key
        if (hasServerBackup) {
          this.me = null;
          return this.setStatus(E2EE_STATUS.RESTORE_REQUIRED);
        } else {
          this.me = null;
          return this.setStatus(E2EE_STATUS.BACKUP_MISSING);
        }
      } catch (err) {
        console.error("[E2EE Manager] Unexpected error in init:", err);
        return this.setStatus(E2EE_STATUS.ERROR);
      } finally {
        this.initInFlight = null;
      }
    })();

    this.readyPromise = this.initInFlight;
    return this.initInFlight;
  }

  /* ------------------------------------------------------------------ */
  /*  First-Device Setup Flow                                           */
  /* ------------------------------------------------------------------ */

  async setupIdentity(passphrase) {
    if (!this.currentUserId)
      throw new E2EENotReadyError("No authenticated user.");
    if (
      !passphrase ||
      typeof passphrase !== "string" ||
      passphrase.length < 6
    ) {
      throw new Error("Recovery passphrase must be at least 6 characters.");
    }

    this.setStatus(E2EE_STATUS.SETTING_UP);
    const uid = this.currentUserId;

    try {
      // 1. Generate an extractable temporary key pair in memory
      const tempPair = await subtle.generateKey(ECDH_ALGO, true, [
        "deriveBits",
      ]);

      // 2. Export private JWK strictly in memory for backup encryption
      const privateJwk = await subtle.exportKey("jwk", tempPair.privateKey);
      const publicJwk = {
        kty: "EC",
        crv: "P-256",
        x: privateJwk.x,
        y: privateJwk.y,
      };

      // 3. Encrypt the private key backup using user's passphrase
      const backupResult = await encryptPrivateKeyBackup(
        privateJwk,
        passphrase,
      );

      // 4. Import the private key as NON-EXTRACTABLE for local storage
      const nonExtractablePrivateKey =
        await importNonExtractablePrivateKey(privateJwk);

      // 5. Register with backend
      try {
        await registerE2EEKeysApi({
          publicKey: publicJwk,
          encryptedPrivateKey: backupResult.serialized,
          backupVersion: 1,
        });
      } catch (apiErr) {
        if (apiErr?.response?.status === 409) {
          throw new E2EEConflictError();
        }
        throw apiErr;
      }

      // 6. Persist non-extractable identity in IndexedDB
      await saveKeyRecord(uid, {
        privateKey: nonExtractablePrivateKey,
        publicJwk,
        version: 1,
      });

      this.me = {
        userId: uid,
        privateKey: nonExtractablePrivateKey,
        publicJwk,
        version: 1,
      };

      // Refresh server status
      try {
        this.serverStatus = await getE2EEStatusApi();
      } catch {
        void 0;
      }

      this.setStatus(E2EE_STATUS.READY);
      this.readyPromise = Promise.resolve(E2EE_STATUS.READY);
      registerCurrentDevice(uid, publicJwk).catch(() => {});
      return this.me;
    } catch (err) {
      console.error("[E2EE Manager] Setup failed:", err);
      // Re-evaluate state
      await this.init(uid);
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Multi-Device Restoration Flow                                     */
  /* ------------------------------------------------------------------ */

  async restoreIdentity(passphrase) {
    if (!this.currentUserId)
      throw new E2EENotReadyError("No authenticated user.");
    if (!passphrase) throw new Error("Passphrase is required to restore.");

    this.setStatus(E2EE_STATUS.RESTORING);
    const uid = this.currentUserId;

    try {
      // 1. Fetch encrypted backup from backend
      const backupData = await getE2EEBackupApi();
      if (!backupData?.encryptedPrivateKey) {
        throw new Error("No encrypted backup found on server.");
      }

      // 2. Decrypt private JWK using recovery passphrase
      const privateJwk = await decryptPrivateKeyBackup(
        backupData.encryptedPrivateKey,
        passphrase,
      );

      // 3. Import private key as NON-EXTRACTABLE
      const nonExtractablePrivateKey =
        await importNonExtractablePrivateKey(privateJwk);
      const publicJwk = {
        kty: "EC",
        crv: "P-256",
        x: privateJwk.x,
        y: privateJwk.y,
      };

      // 4. Verify that restored public key coordinates match the server public key
      const registered = await getUserPublicKeyApi(uid);
      const serverKey = registered?.publicKey;

      if (!serverKey || !publicKeysMatch(publicJwk, serverKey)) {
        throw new E2EEIdentityMismatchError();
      }

      // 5. Persist the verified identity in local IndexedDB
      await saveKeyRecord(uid, {
        privateKey: nonExtractablePrivateKey,
        publicJwk,
        version: backupData.backupVersion || 1,
      });

      this.me = {
        userId: uid,
        privateKey: nonExtractablePrivateKey,
        publicJwk,
        version: backupData.backupVersion || 1,
      };

      try {
        this.serverStatus = await getE2EEStatusApi();
      } catch {
        void 0;
      }

      this.setStatus(E2EE_STATUS.READY);
      this.readyPromise = Promise.resolve(E2EE_STATUS.READY);
      registerCurrentDevice(uid, publicJwk).catch(() => {});
      return this.me;
    } catch (err) {
      console.error("[E2EE Manager] Restoration failed:", err);
      // Reset status back to restore required if wrong passphrase
      this.setStatus(E2EE_STATUS.RESTORE_REQUIRED);
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Recovery Passphrase Rotation                                      */
  /* ------------------------------------------------------------------ */

  async changePassphrase(currentPassphrase, newPassphrase) {
    if (this.status !== E2EE_STATUS.READY || !this.currentUserId) {
      throw new E2EENotReadyError(
        "Encryption must be ready to change recovery passphrase.",
      );
    }
    if (!newPassphrase || newPassphrase.length < 6) {
      throw new Error("New passphrase must be at least 6 characters.");
    }

    const uid = this.currentUserId;

    // 1. Fetch current backup to verify current passphrase
    const backupData = await getE2EEBackupApi();
    const privateJwk = await decryptPrivateKeyBackup(
      backupData.encryptedPrivateKey,
      currentPassphrase,
    );

    // 2. Re-encrypt with new passphrase
    const reEncrypted = await encryptPrivateKeyBackup(
      privateJwk,
      newPassphrase,
    );
    const nextVersion = (backupData.backupVersion || 1) + 1;

    // 3. Upload updated backup
    const updated = await updateE2EEBackupApi({
      encryptedPrivateKey: reEncrypted.serialized,
      backupVersion: nextVersion,
    });

    // 4. Update local record version
    if (this.me) {
      await saveKeyRecord(uid, {
        privateKey: this.me.privateKey,
        publicJwk: this.me.publicJwk,
        version: nextVersion,
      });
      this.me.version = nextVersion;
    }

    try {
      this.serverStatus = await getE2EEStatusApi();
    } catch {
      void 0;
    }

    this.notify();
    return updated;
  }

  /* ------------------------------------------------------------------ */
  /*  Destructive Identity Reset                                        */
  /* ------------------------------------------------------------------ */

  async resetIdentity(password) {
    if (!this.currentUserId)
      throw new E2EENotReadyError("No authenticated user.");
    if (!password) throw new Error("Account password is required for reset.");

    const uid = this.currentUserId;

    // 1. Call backend reset endpoint
    const result = await resetE2EEIdentityApi({ password });

    // 2. Delete local keys from IndexedDB
    await deleteKeyRecord(uid);

    // 3. Clear in-memory identity
    this.me = null;
    this.serverStatus = null;

    // 4. Update status to NOT_CONFIGURED
    this.setStatus(E2EE_STATUS.NOT_CONFIGURED);
    this.readyPromise = Promise.resolve(E2EE_STATUS.NOT_CONFIGURED);

    return result;
  }

  /* ------------------------------------------------------------------ */
  /*  Locking & Unlocking                                               */
  /* ------------------------------------------------------------------ */

  lock() {
    if (this.status === E2EE_STATUS.READY) {
      this.me = null;
      this.setStatus(E2EE_STATUS.LOCKED);
    }
  }

  async unlock() {
    if (this.status === E2EE_STATUS.LOCKED && this.currentUserId) {
      return this.init(this.currentUserId);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup on Logout / Account Switch                                */
  /* ------------------------------------------------------------------ */

  clear() {
    this.status = E2EE_STATUS.IDLE;
    this.me = null;
    this.serverStatus = null;
    this.currentUserId = null;
    this.initInFlight = null;
    this.readyPromise = Promise.resolve(E2EE_STATUS.IDLE);
    this.notify();
  }
}

export const e2eeManager = new E2EEManager();
