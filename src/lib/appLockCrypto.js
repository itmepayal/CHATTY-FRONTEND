/**
 * App Lock Cryptographic Engine (Web Crypto API)
 * - PBKDF2-HMAC-SHA256 with 100,000 iterations & 16-byte random salt.
 * - Zero plaintext PIN storage.
 * - WebAuthn platform authenticator (Touch ID, Face ID, Windows Hello).
 */

function bufToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBuf(hexString) {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Derives a PBKDF2-SHA256 verifier for a 4-digit PIN.
 * Output format: `pbkdf2:100000:<salt_hex>:<hash_hex>`
 */
export async function hashPinPbkdf2(pin, saltHex = null, iterations = 100000) {
  const enc = new TextEncoder();
  let saltBuf;

  if (saltHex) {
    saltBuf = hexToBuf(saltHex);
  } else {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    saltBuf = randomBytes.buffer;
    saltHex = bufToHex(saltBuf);
  }

  const pinKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations,
      hash: "SHA-256",
    },
    pinKey,
    256
  );

  const hashHex = bufToHex(derivedBits);
  return {
    saltHex,
    hashHex,
    iterations,
    verifier: `pbkdf2:${iterations}:${saltHex}:${hashHex}`,
  };
}

/**
 * Verifies a PIN against a stored verifier string.
 * Supports modern `pbkdf2:iterations:salt:hash` and legacy `salt:hash` formats.
 */
export async function verifyPinPbkdf2(pin, storedVerifier) {
  if (!storedVerifier || typeof storedVerifier !== "string") return false;

  const parts = storedVerifier.split(":");

  // Modern PBKDF2 format: pbkdf2:100000:salt:hash
  if (parts.length === 4 && parts[0] === "pbkdf2") {
    const iterations = parseInt(parts[1], 10) || 100000;
    const saltHex = parts[2];
    const targetHash = parts[3];

    const result = await hashPinPbkdf2(pin, saltHex, iterations);
    return result.hashHex === targetHash;
  }

  // Legacy SHA-256 fallback format: salt:hash
  if (parts.length === 2) {
    const [salt, storedHash] = parts;
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${pin}`);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    return bufToHex(hashBuf) === storedHash;
  }

  return false;
}

/**
 * Checks if WebAuthn platform authenticator is available.
 */
export async function isPlatformBiometricsAvailable() {
  if (
    typeof window === "undefined" ||
    !window.PublicKeyCredential ||
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Registers a platform biometric credential for App Lock unlock.
 */
export async function registerBiometrics(userId, userEmail) {
  if (!(await isPlatformBiometricsAvailable())) {
    throw new Error("Biometrics not supported on this device/browser.");
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const enc = new TextEncoder();
  const userIdBytes = enc.encode(userId || "chatty-user");

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Chatty Messenger", id: window.location.hostname },
      user: {
        id: userIdBytes,
        name: userEmail || "chatty-user",
        displayName: "Chatty User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  });

  return credential?.id || null;
}

/**
 * Authenticates using previously enrolled platform biometric credential.
 */
export async function authenticateWithBiometrics(credentialId = null) {
  if (!(await isPlatformBiometricsAvailable())) {
    throw new Error("Biometrics not supported.");
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const allowCredentials = credentialId
    ? [{ id: hexToBuf(credentialId), type: "public-key" }]
    : [];

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      userVerification: "required",
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      timeout: 60000,
    },
  });

  return Boolean(assertion);
}
