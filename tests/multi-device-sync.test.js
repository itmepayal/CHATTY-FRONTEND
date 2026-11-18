import test from "node:test";
import assert from "node:assert/strict";

import { computeKeyFingerprint } from "../src/lib/e2ee/e2eeDevice.js";
import { displayText, FAILED_TEXT } from "../src/lib/e2eeMessages.js";

const subtle = globalThis.crypto?.subtle;
const ECDH_ALGO = { name: "ECDH", namedCurve: "P-256" };
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) => Buffer.from(buf).toString("base64");
const unb64 = (str) => new Uint8Array(Buffer.from(str, "base64"));
const randomIv = () => crypto.getRandomValues(new Uint8Array(12));

async function generateKeyPair() {
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

test("Multi-Device Key Synchronization & Decryption Verification Suite", async (t) => {
  await t.test("1. computeKeyFingerprint produces formatted SHA-256 safety number", async () => {
    const { publicJwk } = await generateKeyPair();
    const fp = await computeKeyFingerprint(publicJwk);

    assert.ok(typeof fp === "string", "Fingerprint is string");
    assert.ok(fp.length > 20, "Fingerprint has sufficient length");
    // Verify formatted in 4-character blocks (e.g., "XXXX XXXX XXXX")
    assert.match(fp, /^[0-9A-F]{4}( [0-9A-F]{4})+$/);

    // Deterministic test: same key produces identical fingerprint
    const fp2 = await computeKeyFingerprint(publicJwk);
    assert.equal(fp, fp2, "Fingerprint is deterministic");

    // Different key produces distinct fingerprint
    const { publicJwk: otherJwk } = await generateKeyPair();
    const otherFp = await computeKeyFingerprint(otherJwk);
    assert.notEqual(fp, otherFp, "Distinct keys produce distinct fingerprints");
  });

  await t.test("2. displayText returns '🔒 Sent before this device was added' for missing envelopes", () => {
    const historicalMsg = {
      text: "",
      encrypted: true,
      decrypted: false,
      decryptFailed: true,
      decryptError: "Sent before this device was added",
    };
    const display = displayText(historicalMsg);
    assert.equal(display, "🔒 Sent before this device was added");
  });

  await t.test("3. displayText falls back to '🔒 Encrypted message' on generic decryption error", () => {
    const corruptedMsg = {
      text: "",
      encrypted: true,
      decrypted: false,
      decryptFailed: true,
      decryptError: "Decryption failed",
    };
    const display = displayText(corruptedMsg);
    assert.equal(display, FAILED_TEXT);
  });

  await t.test("4. Multi-device independent key wrapping and unwrapping", async () => {
    const devA = await generateKeyPair();
    const devB1 = await generateKeyPair();
    const devB2 = await generateKeyPair();
    const devB3 = await generateKeyPair();

    const plaintext = "Zero-Knowledge multi-device message";
    const rawMsgKey = crypto.getRandomValues(new Uint8Array(32));
    const msgKey = await subtle.importKey("raw", rawMsgKey, "AES-GCM", false, ["encrypt", "decrypt"]);
    const msgIv = randomIv();
    const ct = await subtle.encrypt({ name: "AES-GCM", iv: msgIv }, msgKey, enc.encode(plaintext));

    const ephemPair = await subtle.generateKey(ECDH_ALGO, true, ["deriveBits"]);
    const ephemPubRaw = await subtle.exportKey("raw", ephemPair.publicKey);

    const devices = [
      { id: "b-1", key: devB1 },
      { id: "b-2", key: devB2 },
      { id: "b-3", key: devB3 },
    ];

    const envelopes = [];
    for (const d of devices) {
      const devPub = await subtle.importKey("jwk", d.key.publicJwk, ECDH_ALGO, false, []);
      const bits = await subtle.deriveBits({ name: "ECDH", public: devPub }, ephemPair.privateKey, 256);
      const hk = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
      const wrapKey = await subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: enc.encode("chatty-e2ee-v1") },
        hk,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
      );
      const wrapIv = randomIv();
      const wrapped = await subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, wrapKey, rawMsgKey);
      envelopes.push({
        deviceId: d.id,
        wrappedKey: `v2:${b64(ephemPubRaw)}:${b64(wrapped)}`,
        iv: b64(wrapIv),
      });
    }

    // Each device unwraps ONLY its own envelope
    for (const d of devices) {
      const env = envelopes.find((e) => e.deviceId === d.id);
      assert.ok(env, `Found envelope for device ${d.id}`);

      const parts = env.wrappedKey.split(":");
      const ephemPub = await subtle.importKey("raw", unb64(parts[1]), ECDH_ALGO, false, []);
      const bits = await subtle.deriveBits({ name: "ECDH", public: ephemPub }, d.key.pair.privateKey, 256);
      const hk = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
      const wrapKey = await subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: enc.encode("chatty-e2ee-v1") },
        hk,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );
      const unwrappedKeyRaw = await subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, wrapKey, unb64(parts[2]));
      assert.deepEqual(new Uint8Array(unwrappedKeyRaw), rawMsgKey);

      const recoveredMsgKey = await subtle.importKey("raw", unwrappedKeyRaw, "AES-GCM", false, ["decrypt"]);
      const decrypted = await subtle.decrypt({ name: "AES-GCM", iv: msgIv }, recoveredMsgKey, ct);
      assert.equal(dec.decode(decrypted), plaintext);
    }
  });
});
