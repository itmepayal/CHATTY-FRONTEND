export const E2EE_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  NOT_CONFIGURED: "not_configured",
  SETTING_UP: "setting_up",
  RESTORE_REQUIRED: "restore_required",
  RESTORING: "restoring",
  READY: "ready",
  LOCKED: "locked",
  BACKUP_MISSING: "backup_missing",
  IDENTITY_MISMATCH: "identity_mismatch",
  STORAGE_ERROR: "storage_error",
  UNSUPPORTED: "unsupported",
  ERROR: "error",
});

export const CRYPTO_PARAMS = Object.freeze({
  ECDH_NAME: "ECDH",
  ECDH_CURVE: "P-256",
  HKDF_NAME: "HKDF",
  HKDF_HASH: "SHA-256",
  HKDF_SALT_LENGTH: 32,
  HKDF_INFO_STRING: "chatty-e2ee-v1",
  AES_GCM_NAME: "AES-GCM",
  AES_GCM_KEY_BITS: 256,
  AES_GCM_IV_BYTES: 12,

  // Private key backup parameters
  BACKUP_VERSION: 1,
  BACKUP_ALGORITHM: "AES-256-GCM",
  BACKUP_KDF: "PBKDF2-SHA256",
  PBKDF2_ITERATIONS: 600000, // 600,000 iterations
  PBKDF2_SALT_BYTES: 16,
});

export const RESET_CONFIRM_KEYWORD = "RESET_E2EE_IDENTITY";

export const STORAGE_CONFIG = Object.freeze({
  DB_NAME: "chatty-e2ee-v2",
  STORE_NAME: "identities",
  VAULT_STORE_NAME: "device_vault",
  LEGACY_DB_NAME: "chatty-e2ee",
  LEGACY_STORE_NAME: "keys",
});

export const E2EE_UI_MESSAGES = Object.freeze({
  PEER_NO_KEY:
    "This user hasn't set up encryption yet. Ask them to open the app once.",
  NOT_READY: "Encryption isn't ready yet. Please try again in a moment.",
  GROUP_NOT_ENCRYPTED: "This group has no encryption key yet.",
  NO_GROUP_KEY: "You don't have this group's encryption key yet.",
  DECRYPT_FAILED_TEXT: "🔒 Encrypted message",
});
