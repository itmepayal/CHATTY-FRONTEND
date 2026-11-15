import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { subtle } = globalThis.crypto;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: "ECDH", namedCurve: "P-256" };

const b64 = (buf) => Buffer.from(buf).toString("base64");
const unb64 = (str) => Uint8Array.from(Buffer.from(str, "base64"));
const randomIv = () => crypto.getRandomValues(new Uint8Array(12));

async function createIdentity() {
  const pair = await subtle.generateKey(ECDH, true, ["deriveBits"]);
  const publicJwk = await subtle.exportKey("jwk", pair.publicKey);
  const cleanPublicJwk = {
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    y: publicJwk.y,
  };
  return { pair, publicJwk: cleanPublicJwk };
}

async function deriveShared(privateKey, publicKey) {
  const bits = await subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  const hk = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: enc.encode("chatty-e2ee-v1"),
    },
    hk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

describe("Client Group E2EE Cryptography & Key Management", () => {
  it("1. Generates 256-bit AES-GCM group key and wraps for multiple recipients", async () => {
    const alice = await createIdentity();
    const bob = await createIdentity();
    const charlie = await createIdentity();

    const rawGroupKey = crypto.getRandomValues(new Uint8Array(32));

    // Alice wraps for Alice
    const sharedAlice = await deriveShared(alice.pair.privateKey, alice.pair.publicKey);
    const ivA = randomIv();
    const wrappedA = await subtle.encrypt({ name: "AES-GCM", iv: ivA }, sharedAlice, rawGroupKey);

    // Alice wraps for Bob
    const bobPub = await subtle.importKey("jwk", bob.publicJwk, ECDH, true, []);
    const sharedBob = await deriveShared(alice.pair.privateKey, bobPub);
    const ivB = randomIv();
    const wrappedB = await subtle.encrypt({ name: "AES-GCM", iv: ivB }, sharedBob, rawGroupKey);

    // Alice wraps for Charlie
    const charliePub = await subtle.importKey("jwk", charlie.publicJwk, ECDH, true, []);
    const sharedCharlie = await deriveShared(alice.pair.privateKey, charliePub);
    const ivC = randomIv();
    const wrappedC = await subtle.encrypt({ name: "AES-GCM", iv: ivC }, sharedCharlie, rawGroupKey);

    const payload = {
      version: 1,
      keys: [
        { userId: "alice-1", version: 1, wrappedKey: b64(wrappedA), iv: b64(ivA) },
        { userId: "bob-2", version: 1, wrappedKey: b64(wrappedB), iv: b64(ivB) },
        { userId: "charlie-3", version: 1, wrappedKey: b64(wrappedC), iv: b64(ivC) },
      ],
      entries: [
        { userId: "alice-1", version: 1, wrappedKey: b64(wrappedA), iv: b64(ivA) },
        { userId: "bob-2", version: 1, wrappedKey: b64(wrappedB), iv: b64(ivB) },
        { userId: "charlie-3", version: 1, wrappedKey: b64(wrappedC), iv: b64(ivC) },
      ],
    };

    assert.equal(payload.version, 1);
    assert.equal(payload.keys.length, 3);
    assert.equal(payload.entries.length, 3);

    // Bob unwraps his key
    const alicePub = await subtle.importKey("jwk", alice.publicJwk, ECDH, true, []);
    const bobUnwrapShared = await deriveShared(bob.pair.privateKey, alicePub);
    const decryptedRaw = await subtle.decrypt(
      { name: "AES-GCM", iv: unb64(payload.keys[1].iv) },
      bobUnwrapShared,
      unb64(payload.keys[1].wrappedKey),
    );

    assert.deepEqual(new Uint8Array(decryptedRaw), rawGroupKey);
  });

  it("2. Group messages encrypted with AES-GCM are authenticated and tamper-resistant", async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);

    const message = "Top secret project discussion";
    const iv = randomIv();
    const ct = await subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      enc.encode(message),
    );

    // Tamper with ciphertext
    const tampered = new Uint8Array(ct.slice(0));
    tampered[0] ^= 0xff;

    await assert.rejects(
      async () => {
        await subtle.decrypt({ name: "AES-GCM", iv }, aesKey, tampered);
      },
      /operation/i,
    );

    // Decrypt untampered
    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ct);
    assert.equal(dec.decode(decrypted), message);
  });
});
