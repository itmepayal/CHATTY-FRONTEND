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
  generateRecoveryKey,
  saveRecoveryKey,
  getRecoveryKey,
  getRecoveryKeyMetadata,
  setRecoveryKeyAcknowledged,
  deleteRecoveryKey,
} from "./e2eeKeyStore.js";
import {
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
  importNonExtractablePrivateKey,
  publicKeysMatch,
  bufToB64,
  b64ToBuf,
} from "./e2eeBackup.crypto.js";
import {
  getE2EEStatusApi,
  registerE2EEKeysApi,
  getE2EEBackupApi,
  updateE2EEBackupApi,
  resetE2EEIdentityApi,
  getUserPublicKeyApi,
  requestDeviceLinkApi,
  getDeviceLinkStatusApi,
  lookupPendingLinkSessionApi,
  approveDeviceLinkApi,
  rotateDeviceApi,
} from "./e2ee.api.js";
import {
  registerCurrentDevice,
  getDeviceId,
  getDeviceName,
  clearDeviceCache,
} from "./e2eeDevice.js";
import { customToast as toast } from "../../components/toast/customToastService.js";

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
    this.activeLinkSession = null;
    this.pendingRecoveryOnboarding = false;
    this.isDeviceRevoked = false;
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
          pendingRecoveryOnboarding: this.pendingRecoveryOnboarding,
          isDeviceRevoked: Boolean(this.isDeviceRevoked),
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
            // Fresh user: automatically setup identity without manual password prompt
            console.log(
              "[E2EE Manager] Fresh user detected: auto-activating E2EE with zero manual password...",
            );
            try {
              return await this.autoSetupIdentity();
            } catch (autoErr) {
              console.error(
                "[E2EE Manager] Auto-setup failed, fallback to not configured:",
                autoErr,
              );
              this.me = null;
              return this.setStatus(E2EE_STATUS.NOT_CONFIGURED);
            }
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

            // Check if user has acknowledged/saved their recovery key
            try {
              const meta = await getRecoveryKeyMetadata(uid);
              const localAck =
                localStorage.getItem(`chatty_e2ee_recovery_ack_${uid}`) ===
                "true";
              this.pendingRecoveryOnboarding = Boolean(
                meta?.recoveryKey && !meta?.acknowledged && !localAck,
              );
            } catch {
              this.pendingRecoveryOnboarding = false;
            }

            registerCurrentDevice(uid, localRecord.publicJwk)
              .then((res) => {
                if (res?.isRevoked) {
                  this.isDeviceRevoked = true;
                  this.notify();
                }
              })
              .catch(() => {});
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
          // Check if local device vault contains recovery key for auto-unlock
          const localRecoveryKey = await getRecoveryKey(uid);
          if (localRecoveryKey) {
            try {
              console.log(
                "[E2EE Manager] Found recovery key in local device vault, auto-unlocking...",
              );
              return await this.restoreIdentity(localRecoveryKey);
            } catch (autoRestoreErr) {
              console.warn(
                "[E2EE Manager] Auto-unlock from local device vault failed:",
                autoRestoreErr?.message,
              );
            }
          }

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
  /*  Automatic Zero-Manual-Password Setup Flow                         */
  /* ------------------------------------------------------------------ */

  async autoSetupIdentity() {
    if (!this.currentUserId)
      throw new E2EENotReadyError("No authenticated user.");

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

      // 3. Generate a 256-bit high-entropy recovery key
      const recoveryKey = generateRecoveryKey();

      // 4. Encrypt private key backup using recovery key with PBKDF2-SHA256 (600,000 iterations)
      const backupResult = await encryptPrivateKeyBackup(
        privateJwk,
        recoveryKey,
      );

      // 5. Import private key as NON-EXTRACTABLE for local IndexedDB security
      const nonExtractablePrivateKey =
        await importNonExtractablePrivateKey(privateJwk);

      // 6. Register with backend
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

      // 7. Persist non-extractable identity in IndexedDB
      await saveKeyRecord(uid, {
        privateKey: nonExtractablePrivateKey,
        publicJwk,
        version: 1,
      });

      // 8. Store recovery key securely in local device vault (unacknowledged until user reviews & saves)
      await saveRecoveryKey(uid, recoveryKey, false);
      try {
        localStorage.removeItem(`chatty_e2ee_recovery_ack_${uid}`);
      } catch {
        // ignore
      }
      this.pendingRecoveryOnboarding = true;

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
      console.error("[E2EE Manager] Auto-setup identity failed:", err);
      await this.init(uid);
      throw err;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  First-Device Setup Flow (Manual Fallback)                         */
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

      // 7. Persist passphrase into local device vault
      await saveRecoveryKey(uid, passphrase);

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

  async restoreIdentity(passphrase, { overwrite = false } = {}) {
    if (!this.currentUserId)
      throw new E2EENotReadyError("No authenticated user.");
    if (!passphrase) throw new Error("Passphrase is required to restore.");

    if (this.status === E2EE_STATUS.READY && this.me?.privateKey && !overwrite) {
      throw new Error("An active encryption identity already exists on this device. Overwrite confirmation required.");
    }

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

      // 6. Save recovery key / passphrase to local device vault
      await saveRecoveryKey(uid, passphrase);

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

  handleDeviceRevocation(revokedDeviceId) {
    clearDeviceCache();
    const currentDeviceId = getDeviceId();
    if (revokedDeviceId === currentDeviceId) {
      this.isDeviceRevoked = true;
      this.notify();
    }
  }

  async rotateCurrentDeviceKey() {
    if (!this.currentUserId || this.status !== E2EE_STATUS.READY || !this.me) {
      throw new E2EENotReadyError("Cannot rotate key when E2EE is not ready.");
    }
    const currentDeviceId = getDeviceId();
    const pair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false, // non-extractable
      ["deriveBits"],
    );
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    await rotateDeviceApi({
      deviceId: currentDeviceId,
      newPublicKey: publicJwk,
      deviceName: getDeviceName(),
    });
    this.me.privateKey = pair.privateKey;
    this.me.publicJwk = publicJwk;
    await saveKeyRecord(this.currentUserId, {
      privateKey: pair.privateKey,
      publicJwk,
      version: this.me.version,
    });
    clearDeviceCache();
    this.notify();
    return this.me;
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

    // 5. Update local device vault with new passphrase
    await saveRecoveryKey(uid, newPassphrase);

    try {
      this.serverStatus = await getE2EEStatusApi();
    } catch {
      void 0;
    }

    this.notify();
    return updated;
  }

  /* ------------------------------------------------------------------ */
  /*  Device Linking & Ephemeral Zero-Knowledge Key Provisioning        */
  /* ------------------------------------------------------------------ */

  /**
   * Initiates a device linking session on a new (untrusted) device.
   * Generates an ephemeral ECDH keypair and requests a linking PIN from the server.
   * @returns {Promise<{ linkSessionId: string, linkingPin: string, expiresAt: string, ephemeralPublicJwk: object }>}
   */
  async initiateDeviceLink() {
    if (!this.currentUserId) {
      throw new E2EENotReadyError("No authenticated user.");
    }

    // 1. Generate an ephemeral ECDH P-256 keypair strictly for this linking session
    const ephemeralPair = await subtle.generateKey(ECDH_ALGO, true, [
      "deriveBits",
      "deriveKey",
    ]);
    const ephemeralPublicJwk = await subtle.exportKey(
      "jwk",
      ephemeralPair.publicKey,
    );

    // 2. Request a link session from backend
    const res = await requestDeviceLinkApi({
      ephemeralPublicKey: {
        kty: "EC",
        crv: "P-256",
        x: ephemeralPublicJwk.x,
        y: ephemeralPublicJwk.y,
      },
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    });

    this.activeLinkSession = {
      linkSessionId: res.linkSessionId,
      linkingPin: res.linkingPin,
      expiresAt: res.expiresAt,
      ephemeralPair,
    };

    return {
      linkSessionId: res.linkSessionId,
      linkingPin: res.linkingPin,
      expiresAt: res.expiresAt,
      ephemeralPublicJwk,
    };
  }

  /**
   * Consumes an encrypted payload received from an approving trusted device.
   * Derives shared secret via ephemeral ECDH and imports non-extractable private key.
   * @param {{ ephemeralPublicKey: object, iv: string, ciphertext: string }} encryptedPayload
   */
  async consumeDeviceLinkPayload(encryptedPayload) {
    if (!this.currentUserId) {
      throw new E2EENotReadyError("No authenticated user.");
    }
    if (!this.activeLinkSession?.ephemeralPair?.privateKey) {
      throw new Error("No active device linking session on this device.");
    }
    if (
      !encryptedPayload?.ephemeralPublicKey ||
      !encryptedPayload?.iv ||
      !encryptedPayload?.ciphertext
    ) {
      throw new Error(
        "Malformed encrypted payload received from approver device.",
      );
    }

    const uid = this.currentUserId;

    // 1. Import approver's ephemeral public key
    const approverPublicKey = await subtle.importKey(
      "jwk",
      encryptedPayload.ephemeralPublicKey,
      ECDH_ALGO,
      false,
      [],
    );

    // 2. Derive ephemeral AES-GCM 256-bit shared decryption key
    const sharedKey = await subtle.deriveKey(
      { name: "ECDH", public: approverPublicKey },
      this.activeLinkSession.ephemeralPair.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );

    // 3. Decrypt payload
    const iv = b64ToBuf(encryptedPayload.iv);
    const cipherBytes = b64ToBuf(encryptedPayload.ciphertext);
    const decryptedBuf = await subtle.decrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      cipherBytes,
    );

    const data = JSON.parse(new TextDecoder().decode(decryptedBuf));
    const { privateJwk, recoveryKey } = data;

    if (!privateJwk || !privateJwk.d || !privateJwk.x || !privateJwk.y) {
      throw new Error(
        "Invalid private key material received in linked payload.",
      );
    }

    // 4. Import private key as NON-EXTRACTABLE
    const nonExtractablePrivateKey =
      await importNonExtractablePrivateKey(privateJwk);

    const publicJwk = {
      kty: "EC",
      crv: "P-256",
      x: privateJwk.x,
      y: privateJwk.y,
    };

    // 5. Persist non-extractable identity in IndexedDB
    await saveKeyRecord(uid, {
      privateKey: nonExtractablePrivateKey,
      publicJwk,
      version: 1,
    });

    // 6. Persist recovery key in local device vault
    if (recoveryKey) {
      await saveRecoveryKey(uid, recoveryKey);
    }

    // 7. Cleanup ephemeral session
    this.activeLinkSession = null;

    this.me = {
      userId: uid,
      privateKey: nonExtractablePrivateKey,
      publicJwk,
      version: 1,
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
  }

  /**
   * Polls the backend for link approval if Socket.IO event was missed.
   * @param {string} [linkSessionId]
   */
  async pollDeviceLinkStatus(linkSessionId) {
    const id = linkSessionId || this.activeLinkSession?.linkSessionId;
    if (!id) throw new Error("No active linking session ID.");

    const res = await getDeviceLinkStatusApi(id);
    if (res?.status === "approved" && res?.encryptedPayload) {
      await this.consumeDeviceLinkPayload(res.encryptedPayload);
      return { status: "approved", ready: true };
    }
    return { status: res?.status || "pending", ready: false };
  }

  /**
   * Approves a pending device linking request from an existing trusted device.
   * Transfers private key material end-to-end encrypted with an ephemeral ECDH shared secret.
   * @param {{ linkSessionId: string, linkingPin: string, targetEphemeralPublicKey: object, passphrase?: string }} params
   */
  async approveDeviceLink({
    linkSessionId,
    linkingPin,
    targetEphemeralPublicKey,
    passphrase,
  }) {
    if (!this.currentUserId) {
      throw new E2EENotReadyError("No authenticated user.");
    }
    const uid = this.currentUserId;

    let targetKeyJwk = targetEphemeralPublicKey;
    let sessionId = linkSessionId;

    // If linking pin was provided without ephemeral key, query pending session
    if (!targetKeyJwk && linkingPin) {
      const cleanPin = String(linkingPin).trim().replace(/[\s-]+/g, "");
      const session = await lookupPendingLinkSessionApi(cleanPin);
      targetKeyJwk = session.ephemeralPublicKey;
      sessionId = session.linkSessionId;
    }

    if (!targetKeyJwk) {
      throw new Error(
        "Target device ephemeral public key could not be determined.",
      );
    }

    // 1. Retrieve recovery key from local vault or fallback to provided passphrase
    let recoveryKey = passphrase || (await getRecoveryKey(uid));
    if (!recoveryKey) {
      throw new Error(
        "Recovery key or passphrase is required to authorize device link.",
      );
    }

    // 2. Fetch backup and decrypt private JWK in memory
    const backupData = await getE2EEBackupApi();
    if (!backupData?.encryptedPrivateKey) {
      throw new Error("No encrypted private key backup found on server.");
    }

    const privateJwk = await decryptPrivateKeyBackup(
      backupData.encryptedPrivateKey,
      recoveryKey,
    );

    // 3. Generate ephemeral ECDH P-256 keypair for this session
    const ephemeralPair = await subtle.generateKey(ECDH_ALGO, true, [
      "deriveBits",
      "deriveKey",
    ]);
    const ephemeralPublicJwk = await subtle.exportKey(
      "jwk",
      ephemeralPair.publicKey,
    );

    // 4. Import target device's ephemeral public key
    const targetKey = await subtle.importKey(
      "jwk",
      targetKeyJwk,
      ECDH_ALGO,
      false,
      [],
    );

    // 5. Derive ephemeral AES-GCM 256-bit shared encryption key
    const sharedKey = await subtle.deriveKey(
      { name: "ECDH", public: targetKey },
      ephemeralPair.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );

    // 6. Encrypt private JWK + recovery key payload
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payloadBytes = new TextEncoder().encode(
      JSON.stringify({ privateJwk, recoveryKey }),
    );
    const cipherBuffer = await subtle.encrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      payloadBytes,
    );

    const encryptedPayload = {
      ephemeralPublicKey: {
        kty: "EC",
        crv: "P-256",
        x: ephemeralPublicJwk.x,
        y: ephemeralPublicJwk.y,
      },
      iv: bufToB64(iv),
      ciphertext: bufToB64(cipherBuffer),
    };

    return await approveDeviceLinkApi({
      linkSessionId: sessionId,
      linkingPin: linkingPin
        ? String(linkingPin).trim().replace(/[\s-]+/g, "")
        : undefined,
      encryptedPayload,
      approverDeviceId: getDeviceId(),
    });
  }

  /**
   * Retrieves stored recovery key from the local device vault.
   * @returns {Promise<string|null>}
   */
  async getStoredRecoveryKey() {
    if (!this.currentUserId) return null;
    return await getRecoveryKey(this.currentUserId);
  }

  /**
   * Marks the recovery key as acknowledged/backed up by the user.
   */
  async acknowledgeRecoveryKey() {
    if (!this.currentUserId) return;
    const uid = this.currentUserId;
    try {
      await setRecoveryKeyAcknowledged(uid, true);
      localStorage.setItem(`chatty_e2ee_recovery_ack_${uid}`, "true");
    } catch (e) {
      console.warn(
        "[E2EE Manager] Failed to mark recovery key acknowledged:",
        e,
      );
    }
    this.pendingRecoveryOnboarding = false;
    this.notify();
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
    this.pendingRecoveryOnboarding = false;
    this.isDeviceRevoked = false;
    this.readyPromise = Promise.resolve(E2EE_STATUS.IDLE);
    this.notify();
  }
}

export const e2eeManager = new E2EEManager();
