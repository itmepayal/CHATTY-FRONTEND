import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPinPbkdf2,
  verifyPinPbkdf2,
} from "../src/lib/appLockCrypto.js";

test("AppLock Cryptography & Verification Suite", async (t) => {
  await t.test("1. Hash PIN with PBKDF2 creates standard verifier", async () => {
    const pin = "4829";
    const res = await hashPinPbkdf2(pin);

    assert.ok(res.verifier, "Verifier string must be created");
    assert.ok(res.saltHex, "saltHex must be generated");
    assert.ok(res.hashHex, "hashHex must be generated");
    assert.equal(res.iterations, 100000);

    const parts = res.verifier.split(":");
    assert.equal(parts[0], "pbkdf2");
    assert.equal(parts[1], "100000");
    assert.equal(parts[2], res.saltHex);
    assert.equal(parts[3], res.hashHex);
  });

  await t.test("2. Correct PIN verification succeeds", async () => {
    const pin = "7193";
    const { verifier } = await hashPinPbkdf2(pin);

    const match = await verifyPinPbkdf2(pin, verifier);
    assert.equal(match, true, "Correct PIN must verify to true");
  });

  await t.test("3. Incorrect PIN verification fails", async () => {
    const pin = "7193";
    const { verifier } = await hashPinPbkdf2(pin);

    const wrongMatch = await verifyPinPbkdf2("1234", verifier);
    assert.equal(wrongMatch, false, "Incorrect PIN must verify to false");
  });

  await t.test("4. Deterministic hashing with provided salt", async () => {
    const pin = "5555";
    const fixedSalt = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

    const res1 = await hashPinPbkdf2(pin, fixedSalt);
    const res2 = await hashPinPbkdf2(pin, fixedSalt);

    assert.equal(res1.verifier, res2.verifier);
    assert.equal(res1.hashHex, res2.hashHex);
  });

  await t.test("5. Legacy salt:hash SHA-256 fallback compatibility", async () => {
    const pin = "9999";
    const salt = "legacySalt123";
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${pin}`);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hashBuf);
    let hashHex = "";
    for (let i = 0; i < bytes.length; i++) {
      hashHex += bytes[i].toString(16).padStart(2, "0");
    }
    const legacyVerifier = `${salt}:${hashHex}`;

    const match = await verifyPinPbkdf2(pin, legacyVerifier);
    assert.equal(match, true, "Legacy verifier should be verified correctly");

    const wrongMatch = await verifyPinPbkdf2("0000", legacyVerifier);
    assert.equal(wrongMatch, false, "Legacy verifier must reject wrong PIN");
  });
});
