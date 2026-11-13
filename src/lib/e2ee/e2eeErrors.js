/**
 * Standardized E2EE Error Classes & User-Facing Error Messages
 */

export class E2EEError extends Error {
  constructor(message, code = "E2EE_ERROR", originalError = null) {
    super(message);
    this.name = "E2EEError";
    this.code = code;
    this.originalError = originalError;
  }
}

export class E2EENotReadyError extends E2EEError {
  constructor(message = "Encryption is not ready yet.") {
    super(message, "E2EE_NOT_READY");
    this.name = "E2EENotReadyError";
  }
}

export class E2EEPeerHasNoKeyError extends E2EEError {
  constructor(message = "Recipient has no public encryption key registered.") {
    super(message, "PEER_HAS_NO_KEY");
    this.name = "E2EEPeerHasNoKeyError";
  }
}

export class E2EEInvalidPassphraseError extends E2EEError {
  constructor(message = "Incorrect recovery passphrase. Please verify and try again.") {
    super(message, "INVALID_PASSPHRASE");
    this.name = "E2EEInvalidPassphraseError";
  }
}

export class E2EEIdentityMismatchError extends E2EEError {
  constructor(message = "Restored cryptographic identity does not match the registered server public key.") {
    super(message, "IDENTITY_MISMATCH");
    this.name = "E2EEIdentityMismatchError";
  }
}

export class E2EEBackupCorruptedError extends E2EEError {
  constructor(message = "Encrypted private key backup is malformed or corrupted.") {
    super(message, "BACKUP_CORRUPTED");
    this.name = "E2EEBackupCorruptedError";
  }
}

export class E2EEConflictError extends E2EEError {
  constructor(message = "An encryption identity is already registered for this account.") {
    super(message, "IDENTITY_CONFLICT");
    this.name = "E2EEConflictError";
  }
}

export const getE2EEErrorMessage = (error, fallback = "An encryption error occurred.") => {
  if (!error) return fallback;
  if (error instanceof E2EEError) return error.message;

  const msg = error?.response?.data?.message || error?.message || "";
  if (msg.includes("e2ee-not-ready") || msg.includes("not ready")) {
    return "Encryption isn't ready yet. Please try again in a moment.";
  }
  if (msg.includes("peer-has-no-key")) {
    return "This user hasn't set up encryption yet. Ask them to open the app once.";
  }
  if (msg.includes("group-not-encrypted")) {
    return "This group has no encryption key yet.";
  }
  if (msg.includes("no-group-key")) {
    return "You don't have this group's encryption key yet.";
  }
  if (msg.includes("tag") || msg.includes("operation failed") || msg.includes("cipher")) {
    return "Failed to decrypt message.";
  }
  return msg || fallback;
};
