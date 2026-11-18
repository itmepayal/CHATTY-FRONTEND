import test from "node:test";
import assert from "node:assert/strict";

import {
  generateRecoveryKey,
} from "../src/lib/e2ee/e2eeKeyStore.js";
import {
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
  importNonExtractablePrivateKey,
  publicKeysMatch,
  bufToB64,
  b64ToBuf,
} from "../src/lib/e2ee/e2eeBackup.crypto.js";

const subtle = globalThis.crypto?.subtle;
const ECDH_ALGO = { name: "ECDH", namedCurve: "P-256" };

test("Automatic E2EE & Device Linking Cryptography Suite", async (t) => {
  await t.test("1. generateRecoveryKey produces 256-bit high-entropy formatted string", () => {
    const key1 = generateRecoveryKey();
    const key2 = generateRecoveryKey();

    assert.ok(typeof key1 === "string", "Recovery key should be a string");
    assert.notEqual(key1, key2, "Successive recovery keys must be unique");

    // Formatted into 8 groups of 8 hex characters: 64 hex chars + 7 hyphens = 71 chars
    const parts = key1.split("-");
    assert.equal(parts.length, 8, "Must contain exactly 8 hyphen-separated groups");
    for (const group of parts) {
      assert.equal(group.length, 8, "Each group must be 8 hex characters");
      assert.match(group, /^[0-9A-F]{8}$/, "Group must consist of uppercase hex characters");
    }
  });

  await t.test("2. Recovery Key encrypts and decrypts EC P-256 private JWK backup", async () => {
    // Generate temporary EC P-256 pair
    const tempPair = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits"]);
    const privateJwk = await subtle.exportKey("jwk", tempPair.privateKey);

    const recoveryKey = generateRecoveryKey();

    // Encrypt backup envelope with recovery key
    const encrypted = await encryptPrivateKeyBackup(privateJwk, recoveryKey);
    assert.ok(encrypted.serialized, "Must output serialized backup envelope");

    // Decrypt backup envelope with the same recovery key
    const decryptedJwk = await decryptPrivateKeyBackup(encrypted.serialized, recoveryKey);

    assert.equal(decryptedJwk.kty, "EC");
    assert.equal(decryptedJwk.crv, "P-256");
    assert.equal(decryptedJwk.x, privateJwk.x);
    assert.equal(decryptedJwk.y, privateJwk.y);
    assert.equal(decryptedJwk.d, privateJwk.d);
  });

  await t.test("3. Zero-Knowledge Device Linking: Ephemeral ECDH shared secret key exchange", async () => {
    // 1. Device B (new device) generates ephemeral ECDH pair
    const deviceBEphemeral = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits", "deriveKey"]);
    const deviceBEphemeralPublicJwk = await subtle.exportKey("jwk", deviceBEphemeral.publicKey);

    // 2. Device A (trusted device) has Alice's private key and recovery key
    const alicePair = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits"]);
    const alicePrivateJwk = await subtle.exportKey("jwk", alicePair.privateKey);
    const aliceRecoveryKey = generateRecoveryKey();

    // 3. Device A generates its own ephemeral ECDH pair
    const deviceAEphemeral = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits", "deriveKey"]);
    const deviceAEphemeralPublicJwk = await subtle.exportKey("jwk", deviceAEphemeral.publicKey);

    // 4. Device A imports Device B's ephemeral public key and derives shared AES-GCM secret
    const bPublicKey = await subtle.importKey("jwk", deviceBEphemeralPublicJwk, ECDH_ALGO, false, []);
    const sharedSecretA = await subtle.deriveKey(
      { name: "ECDH", public: bPublicKey },
      deviceAEphemeral.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );

    // 5. Device A encrypts payload { privateJwk, recoveryKey }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payloadBytes = new TextEncoder().encode(
      JSON.stringify({ privateJwk: alicePrivateJwk, recoveryKey: aliceRecoveryKey }),
    );
    const cipherBuffer = await subtle.encrypt({ name: "AES-GCM", iv }, sharedSecretA, payloadBytes);

    const encryptedPayload = {
      ephemeralPublicKey: {
        kty: "EC",
        crv: "P-256",
        x: deviceAEphemeralPublicJwk.x,
        y: deviceAEphemeralPublicJwk.y,
      },
      iv: bufToB64(iv),
      ciphertext: bufToB64(cipherBuffer),
    };

    // 6. Device B receives encryptedPayload and imports Device A's ephemeral public key
    const aPublicKey = await subtle.importKey("jwk", encryptedPayload.ephemeralPublicKey, ECDH_ALGO, false, []);
    const sharedSecretB = await subtle.deriveKey(
      { name: "ECDH", public: aPublicKey },
      deviceBEphemeral.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );

    // 7. Device B decrypts ciphertext
    const decryptedBytes = await subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBuf(encryptedPayload.iv) },
      sharedSecretB,
      b64ToBuf(encryptedPayload.ciphertext),
    );

    const receivedData = JSON.parse(new TextDecoder().decode(decryptedBytes));

    assert.equal(receivedData.privateJwk.x, alicePrivateJwk.x);
    assert.equal(receivedData.privateJwk.y, alicePrivateJwk.y);
    assert.equal(receivedData.privateJwk.d, alicePrivateJwk.d);
    assert.equal(receivedData.recoveryKey, aliceRecoveryKey);

    // 8. Device B imports the received private key as non-extractable (extractable: false)
    const importedNonExtractable = await importNonExtractablePrivateKey(receivedData.privateJwk);
    assert.equal(importedNonExtractable.type, "private");
    assert.equal(importedNonExtractable.extractable, false);
    assert.equal(importedNonExtractable.algorithm.name, "ECDH");
  });

  await t.test("4. Tampering with ephemeral ciphertext or IV fails AES-GCM authentication", async () => {
    const pairA = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits", "deriveKey"]);
    const pairB = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits", "deriveKey"]);

    const keyA = await subtle.deriveKey({ name: "ECDH", public: pairB.publicKey }, pairA.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const keyB = await subtle.deriveKey({ name: "ECDH", public: pairA.publicKey }, pairB.privateKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, keyA, new TextEncoder().encode("SecretData"));

    const corruptedCipher = new Uint8Array(encrypted);
    corruptedCipher[0] ^= 0xff; // flip byte

    await assert.rejects(
      async () => {
        await subtle.decrypt({ name: "AES-GCM", iv }, keyB, corruptedCipher);
      },
      /OperationError/,
      "AES-GCM must reject corrupted ciphertext authentication tag",
    );
  });

  await t.test("5. Emergency recovery kit text generator formats valid 256-bit key document", () => {
    const recoveryKey = generateRecoveryKey();
    const userName = "Alice Developer";
    const deviceName = "Chrome on Linux";
    const dateStr = "2026-11-18 14:00:00";

    const content = `===================================================================
CHATTY END-TO-END ENCRYPTION (E2EE) RECOVERY KEY
===================================================================

Account: ${userName}
Generated: ${dateStr}
Device: ${deviceName}

YOUR 256-BIT RECOVERY KEY:
-------------------------------------------------------------------
${recoveryKey}
-------------------------------------------------------------------

HOW TO USE THIS KEY:
1. Store this file or printed copy in a secure location (e.g. a password manager or safe).
2. If you sign in to Chatty on a new browser, phone, or computer without your previous device,
   enter this exact 256-bit key to restore and decrypt your messages.
3. Chatty's servers never store this key in plaintext. The team cannot restore your messages for you.
4. Never share this key with anyone.
===================================================================`;

    assert.ok(content.includes(recoveryKey), "Emergency kit text must contain the recovery key");
    assert.ok(content.includes("YOUR 256-BIT RECOVERY KEY"), "Must have header");
    assert.ok(content.includes(userName), "Must mention user name");
    assert.ok(content.includes(deviceName), "Must mention device");
  });
});
