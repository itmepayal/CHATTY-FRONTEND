/**
 * Encrypted Private Key Backup Cryptography
 * Uses PBKDF2 (SHA-256, 600,000 iterations) and AES-256-GCM to securely
 * encrypt/decrypt private JWKs for multi-device backup and restoration.
 */

import { CRYPTO_PARAMS } from "./e2ee.constants.js";
import {
  E2EEBackupCorruptedError,
  E2EEInvalidPassphraseError,
} from "./e2eeErrors.js";

const subtle = globalThis.crypto?.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const bufToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const b64ToBuf = (b64Str) => {
  try {
    const binary = atob(b64Str.trim());
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new E2EEBackupCorruptedError("Invalid base64 encoding in backup envelope.");
  }
};

/**
 * Derives an AES-256-GCM CryptoKey from a passphrase using PBKDF2-SHA-256.
 * @param {string} passphrase - User recovery passphrase.
 * @param {Uint8Array} salt - Random salt (at least 16 bytes).
 * @param {number} iterations - Number of PBKDF2 iterations (>= 600,000).
 * @returns {Promise<CryptoKey>}
 */
export const deriveBackupKey = async (
  passphrase,
  salt,
  iterations = CRYPTO_PARAMS.PBKDF2_ITERATIONS,
) => {
  if (!subtle) throw new Error("WebCrypto is unavailable.");
  if (!passphrase || typeof passphrase !== "string") {
    throw new Error("Passphrase must be a non-empty string.");
  }

  const baseKey = await subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

/**
 * Encrypts an exported private JWK into a versioned backup envelope.
 * @param {object} privateJwk - JWK containing EC P-256 private key material (x, y, d).
 * @param {string} passphrase - User recovery passphrase.
 * @returns {Promise<{ envelope: object, serialized: string }>}
 */
export const encryptPrivateKeyBackup = async (privateJwk, passphrase) => {
  if (!subtle) throw new Error("WebCrypto is unavailable.");
  if (!privateJwk || privateJwk.kty !== "EC" || !privateJwk.d) {
    throw new Error("Invalid private JWK passed for backup encryption.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.PBKDF2_SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.AES_GCM_IV_BYTES));

  const derivedKey = await deriveBackupKey(
    passphrase,
    salt,
    CRYPTO_PARAMS.PBKDF2_ITERATIONS,
  );

  const plainBytes = encoder.encode(JSON.stringify(privateJwk));
  const cipherBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    plainBytes,
  );

  const envelope = {
    version: CRYPTO_PARAMS.BACKUP_VERSION,
    algorithm: CRYPTO_PARAMS.BACKUP_ALGORITHM,
    kdf: CRYPTO_PARAMS.BACKUP_KDF,
    iterations: CRYPTO_PARAMS.PBKDF2_ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ciphertext: bufToB64(cipherBuffer),
  };

  return {
    envelope,
    serialized: JSON.stringify(envelope),
  };
};

/**
 * Validates and decrypts an encrypted backup envelope using the recovery passphrase.
 * @param {string|object} envelopeInput - Serialized JSON string or parsed envelope object.
 * @param {string} passphrase - User recovery passphrase.
 * @returns {Promise<object>} Decrypted private JWK object.
 */
export const decryptPrivateKeyBackup = async (envelopeInput, passphrase) => {
  if (!subtle) throw new Error("WebCrypto is unavailable.");

  let envelope = envelopeInput;
  if (typeof envelopeInput === "string") {
    try {
      envelope = JSON.parse(envelopeInput);
    } catch {
      throw new E2EEBackupCorruptedError("Backup envelope is not valid JSON.");
    }
  }

  if (!envelope || typeof envelope !== "object") {
    throw new E2EEBackupCorruptedError("Backup envelope is missing or invalid.");
  }

  const { version, algorithm, iterations, salt, iv, ciphertext } = envelope;

  if (version !== CRYPTO_PARAMS.BACKUP_VERSION) {
    throw new E2EEBackupCorruptedError(`Unsupported backup version: ${version}`);
  }
  if (algorithm !== CRYPTO_PARAMS.BACKUP_ALGORITHM) {
    throw new E2EEBackupCorruptedError(`Unsupported encryption algorithm: ${algorithm}`);
  }
  if (!iterations || iterations < 100000) {
    throw new E2EEBackupCorruptedError("Invalid iteration count in backup envelope.");
  }
  if (!salt || !iv || !ciphertext) {
    throw new E2EEBackupCorruptedError("Missing required cryptographic fields in backup envelope.");
  }

  const saltBuf = b64ToBuf(salt);
  const ivBuf = b64ToBuf(iv);
  const cipherBuf = b64ToBuf(ciphertext);

  const derivedKey = await deriveBackupKey(passphrase, saltBuf, iterations);

  let decryptedBuf;
  try {
    decryptedBuf = await subtle.decrypt(
      { name: "AES-GCM", iv: ivBuf },
      derivedKey,
      cipherBuf,
    );
  } catch {
    // AES-GCM throws OperationError if tag mismatch (wrong passphrase or altered ciphertext)
    throw new E2EEInvalidPassphraseError();
  }

  let privateJwk;
  try {
    const jsonStr = decoder.decode(decryptedBuf);
    privateJwk = JSON.parse(jsonStr);
  } catch {
    throw new E2EEBackupCorruptedError("Decrypted backup could not be parsed as JWK.");
  }

  if (
    !privateJwk ||
    privateJwk.kty !== "EC" ||
    privateJwk.crv !== "P-256" ||
    !privateJwk.x ||
    !privateJwk.y ||
    !privateJwk.d
  ) {
    throw new E2EEBackupCorruptedError("Decrypted key material is not a valid EC P-256 private JWK.");
  }

  return privateJwk;
};

/**
 * Imports a private JWK as a non-extractable CryptoKey.
 * @param {object} privateJwk - JWK containing private key parameters.
 * @returns {Promise<CryptoKey>}
 */
export const importNonExtractablePrivateKey = async (privateJwk) => {
  if (!subtle) throw new Error("WebCrypto is unavailable.");

  return subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false, // extractable: false for persistent safety
    ["deriveBits"],
  );
};

/**
 * Verifies if two public keys (JWKs or coordinate objects) match.
 * @param {object} keyA
 * @param {object} keyB
 * @returns {boolean}
 */
export const publicKeysMatch = (keyA, keyB) => {
  if (!keyA || !keyB) return false;
  const crvMatch = !keyA.crv || !keyB.crv || keyA.crv === keyB.crv;
  const ktyMatch = !keyA.kty || !keyB.kty || keyA.kty === keyB.kty;
  return keyA.x === keyB.x && keyA.y === keyB.y && crvMatch && ktyMatch;
};
