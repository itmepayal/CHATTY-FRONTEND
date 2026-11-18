import test from "node:test";
import assert from "node:assert/strict";

import {
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
  importNonExtractablePrivateKey,
  publicKeysMatch,
  deriveBackupKey,
} from "../src/lib/e2ee/e2eeBackup.crypto.js";
import {
  E2EEBackupCorruptedError,
  E2EEInvalidPassphraseError,
  E2EENotReadyError,
} from "../src/lib/e2ee/e2eeErrors.js";
import { E2EE_STATUS } from "../src/lib/e2ee/e2ee.constants.js";
import { e2eeManager } from "../src/lib/e2ee/e2eeManager.js";
import { getDeviceId } from "../src/lib/e2ee/e2eeDevice.js";

const subtle = globalThis.crypto?.subtle;
const ECDH_ALGO = { name: "ECDH", namedCurve: "P-256" };

async function generateTestKeyPair() {
  const pair = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits"]);
  const privateJwk = await subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = {
    kty: "EC",
    crv: "P-256",
    x: privateJwk.x,
    y: privateJwk.y,
  };
  return { pair, privateJwk, publicJwk };
}

test("Priority 4: Client E2EE Recovery, Corruption Handling & Revocation Suite", async (t) => {
  const recoveryPassphrase = "Correct-Horse-Battery-Staple-2026!";
  const wrongPassphrase = "Wrong-Password-Attempt-1234!";

  await t.test("1. encryptPrivateKeyBackup generates encrypted envelope with required fields", async () => {
    const { privateJwk } = await generateTestKeyPair();
    const { envelope, serialized } = await encryptPrivateKeyBackup(
      privateJwk,
      recoveryPassphrase,
    );

    assert.ok(envelope, "Envelope should exist");
    assert.equal(envelope.version, 1);
    assert.equal(envelope.algorithm, "AES-256-GCM");
    assert.equal(envelope.kdf, "PBKDF2-SHA256");
    assert.ok(envelope.iterations >= 100000, "Iterations must be secure");
    assert.ok(envelope.salt, "Salt must exist");
    assert.ok(envelope.iv, "IV must exist");
    assert.ok(envelope.ciphertext, "Ciphertext must exist");
    assert.equal(typeof serialized, "string");

    // Ensure raw private key material 'd' is NOT in the envelope
    assert.ok(!serialized.includes(privateJwk.d), "Ciphertext must never contain raw 'd'");
  });

  await t.test("2. decryptPrivateKeyBackup with correct passphrase restores identical JWK", async () => {
    const { privateJwk } = await generateTestKeyPair();
    const { envelope } = await encryptPrivateKeyBackup(
      privateJwk,
      recoveryPassphrase,
    );

    const decryptedJwk = await decryptPrivateKeyBackup(envelope, recoveryPassphrase);
    assert.equal(decryptedJwk.kty, "EC");
    assert.equal(decryptedJwk.crv, "P-256");
    assert.equal(decryptedJwk.x, privateJwk.x);
    assert.equal(decryptedJwk.y, privateJwk.y);
    assert.equal(decryptedJwk.d, privateJwk.d);
  });

  await t.test("3. decryptPrivateKeyBackup with wrong passphrase throws E2EEInvalidPassphraseError", async () => {
    const { privateJwk } = await generateTestKeyPair();
    const { envelope } = await encryptPrivateKeyBackup(
      privateJwk,
      recoveryPassphrase,
    );

    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup(envelope, wrongPassphrase);
      },
      (err) => {
        assert.ok(
          err instanceof E2EEInvalidPassphraseError,
          `Expected E2EEInvalidPassphraseError but got ${err?.constructor?.name}`,
        );
        return true;
      },
    );
  });

  await t.test("4. Corrupted ciphertext fails AES-GCM tag verification safely", async () => {
    const { privateJwk } = await generateTestKeyPair();
    const { envelope } = await encryptPrivateKeyBackup(
      privateJwk,
      recoveryPassphrase,
    );

    // Tamper with ciphertext
    const ctBytes = Buffer.from(envelope.ciphertext, "base64");
    ctBytes[0] ^= 0xff; // Flip bits
    const corruptedEnvelope = {
      ...envelope,
      ciphertext: ctBytes.toString("base64"),
    };

    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup(corruptedEnvelope, recoveryPassphrase);
      },
      (err) => {
        assert.ok(
          err instanceof E2EEInvalidPassphraseError,
          "Tampered ciphertext fails tag verification as invalid passphrase/corrupted",
        );
        return true;
      },
    );
  });

  await t.test("5. Malformed envelope structure throws E2EEBackupCorruptedError", async () => {
    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup("not-even-json", recoveryPassphrase);
      },
      (err) => err instanceof E2EEBackupCorruptedError,
    );

    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup(
          { version: 999, algorithm: "AES-256-GCM" },
          recoveryPassphrase,
        );
      },
      (err) => err instanceof E2EEBackupCorruptedError,
    );

    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup(
          {
            version: 1,
            algorithm: "AES-256-GCM",
            iterations: 600000,
            salt: "abc",
            iv: "def",
            // missing ciphertext
          },
          recoveryPassphrase,
        );
      },
      (err) => err instanceof E2EEBackupCorruptedError,
    );
  });

  await t.test("6. importNonExtractablePrivateKey imports key with extractable === false", async () => {
    const { privateJwk } = await generateTestKeyPair();
    const nonExtractableKey = await importNonExtractablePrivateKey(privateJwk);

    assert.equal(nonExtractableKey.type, "private");
    assert.equal(nonExtractableKey.extractable, false, "Must be non-extractable");
    assert.deepEqual(nonExtractableKey.usages, ["deriveBits"]);

    // Attempting to export non-extractable key must throw
    await assert.rejects(
      async () => {
        await subtle.exportKey("jwk", nonExtractableKey);
      },
      /key is not extractable/i,
    );
  });

  await t.test("7. publicKeysMatch verifies coordinates accurately", async () => {
    const { publicJwk } = await generateTestKeyPair();
    const other = (await generateTestKeyPair()).publicJwk;

    assert.equal(publicKeysMatch(publicJwk, publicJwk), true);
    assert.equal(publicKeysMatch(publicJwk, { ...publicJwk }), true);
    assert.equal(publicKeysMatch(publicJwk, other), false);
    assert.equal(publicKeysMatch(publicJwk, null), false);
  });

  await t.test("8. handleDeviceRevocation sets isDeviceRevoked when current device revoked", () => {
    const devId = getDeviceId();
    assert.ok(devId, "DeviceId must be available");

    e2eeManager.isDeviceRevoked = false;

    // Revocation of another device does not set isDeviceRevoked
    e2eeManager.handleDeviceRevocation("other-device-id-999");
    assert.equal(e2eeManager.isDeviceRevoked, false);

    // Revocation of current device sets isDeviceRevoked
    e2eeManager.handleDeviceRevocation(devId);
    assert.equal(e2eeManager.isDeviceRevoked, true);

    // Clean up
    e2eeManager.isDeviceRevoked = false;
  });

  await t.test("9. restoreIdentity guards against accidental overwrite when active key exists", async () => {
    // Set mock active key state, ready status, and authenticated user
    e2eeManager.currentUserId = "test-user-1";
    e2eeManager.status = E2EE_STATUS.READY;
    e2eeManager.me = { userId: "test-user-1", privateKey: {} };

    await assert.rejects(
      async () => {
        await e2eeManager.restoreIdentity("dummy-passphrase", { overwrite: false });
      },
      (err) => {
        assert.match(err.message, /active encryption identity already exists/i);
        return true;
      },
    );

    // Clean up
    e2eeManager.currentUserId = null;
    e2eeManager.status = E2EE_STATUS.IDLE;
    e2eeManager.me = null;
  });
});
