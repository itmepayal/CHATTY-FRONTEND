import test from "node:test";
import assert from "node:assert/strict";

import { CRYPTO_PARAMS, E2EE_STATUS } from "../src/lib/e2ee/e2ee.constants.js";
import {
  encryptPrivateKeyBackup,
  decryptPrivateKeyBackup,
  importNonExtractablePrivateKey,
  publicKeysMatch,
  bufToB64,
  b64ToBuf,
} from "../src/lib/e2ee/e2eeBackup.crypto.js";
import {
  E2EEInvalidPassphraseError,
  E2EEBackupCorruptedError,
} from "../src/lib/e2ee/e2eeErrors.js";
import { displayText, FAILED_TEXT } from "../src/lib/e2eeMessages.js";

const subtle = globalThis.crypto?.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH_ALGO = { name: "ECDH", namedCurve: "P-256" };

const TEST_PASSPHRASE_1 = "CorrectHorseBatteryStaple123!";
const TEST_PASSPHRASE_2 = "NewRotatedSuperSecurePassphrase456!";
const WRONG_PASSPHRASE = "DefinitelyWrongPassword999!";

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

async function deriveChattySharedKey(privateKey, publicKey) {
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

test("Category 1: Backup Envelope Encryption and Decryption", async (t) => {
  const { privateJwk, publicJwk } = await generateTestKeyPair();

  await t.test(
    "1.1 Successfully encrypts and decrypts with correct passphrase",
    async () => {
      const backupResult = await encryptPrivateKeyBackup(
        privateJwk,
        TEST_PASSPHRASE_1,
      );
      assert.ok(backupResult.serialized, "Backup serialized string exists");
      assert.ok(backupResult.envelope, "Envelope object exists");

      const envelope = backupResult.envelope;
      assert.equal(envelope.version, 1);
      assert.equal(envelope.algorithm, "AES-256-GCM");
      assert.equal(envelope.kdf, "PBKDF2-SHA256");
      assert.equal(envelope.iterations, CRYPTO_PARAMS.PBKDF2_ITERATIONS);
      assert.ok(envelope.salt.length > 10);
      assert.ok(envelope.iv.length > 10);
      assert.ok(envelope.ciphertext.length > 50);

      // Decrypt
      const decryptedJwk = await decryptPrivateKeyBackup(
        backupResult.serialized,
        TEST_PASSPHRASE_1,
      );
      assert.equal(decryptedJwk.kty, "EC");
      assert.equal(decryptedJwk.crv, "P-256");
      assert.equal(
        decryptedJwk.d,
        privateJwk.d,
        "Private key parameter d matches",
      );
      assert.equal(decryptedJwk.x, publicJwk.x, "Public coordinate x matches");
      assert.equal(decryptedJwk.y, publicJwk.y, "Public coordinate y matches");
    },
  );

  await t.test(
    "1.2 Wrong passphrase throws E2EEInvalidPassphraseError",
    async () => {
      const backupResult = await encryptPrivateKeyBackup(
        privateJwk,
        TEST_PASSPHRASE_1,
      );

      await assert.rejects(
        async () => {
          await decryptPrivateKeyBackup(
            backupResult.serialized,
            WRONG_PASSPHRASE,
          );
        },
        (err) => {
          assert.ok(err instanceof E2EEInvalidPassphraseError);
          return true;
        },
      );
    },
  );

  await t.test(
    "1.3 Corrupted ciphertext throws E2EEInvalidPassphraseError or E2EEBackupCorruptedError",
    async () => {
      const backupResult = await encryptPrivateKeyBackup(
        privateJwk,
        TEST_PASSPHRASE_1,
      );
      const tampered = { ...backupResult.envelope };
      // Tamper with the last few characters of base64 ciphertext
      const ctBuf = b64ToBuf(tampered.ciphertext);
      ctBuf[ctBuf.length - 1] ^= 0xff;
      tampered.ciphertext = bufToB64(ctBuf);

      await assert.rejects(
        async () => {
          await decryptPrivateKeyBackup(tampered, TEST_PASSPHRASE_1);
        },
        (err) => {
          assert.ok(
            err instanceof E2EEInvalidPassphraseError ||
              err instanceof E2EEBackupCorruptedError,
          );
          return true;
        },
      );
    },
  );

  await t.test("1.4 Modified IV throws error", async () => {
    const backupResult = await encryptPrivateKeyBackup(
      privateJwk,
      TEST_PASSPHRASE_1,
    );
    const tampered = { ...backupResult.envelope };
    const ivBuf = b64ToBuf(tampered.iv);
    ivBuf[0] ^= 0x01;
    tampered.iv = bufToB64(ivBuf);

    await assert.rejects(async () => {
      await decryptPrivateKeyBackup(tampered, TEST_PASSPHRASE_1);
    });
  });

  await t.test("1.5 Unsupported backup version rejected", async () => {
    const backupResult = await encryptPrivateKeyBackup(
      privateJwk,
      TEST_PASSPHRASE_1,
    );
    const tampered = { ...backupResult.envelope, version: 99 };

    await assert.rejects(
      async () => {
        await decryptPrivateKeyBackup(tampered, TEST_PASSPHRASE_1);
      },
      (err) => {
        assert.ok(err instanceof E2EEBackupCorruptedError);
        assert.match(err.message, /Unsupported backup version/);
        return true;
      },
    );
  });

  await t.test("1.6 Salt and IV randomness across multiple calls", async () => {
    const b1 = await encryptPrivateKeyBackup(privateJwk, TEST_PASSPHRASE_1);
    const b2 = await encryptPrivateKeyBackup(privateJwk, TEST_PASSPHRASE_1);

    assert.notEqual(b1.envelope.salt, b2.envelope.salt, "Salts must be unique");
    assert.notEqual(b1.envelope.iv, b2.envelope.iv, "IVs must be unique");
    assert.notEqual(
      b1.envelope.ciphertext,
      b2.envelope.ciphertext,
      "Ciphertexts must differ due to unique IV",
    );
  });
});

test("Category 2: Non-Extractable Key Safety and Public Key Verification", async (t) => {
  const { privateJwk, publicJwk } = await generateTestKeyPair();

  await t.test("2.1 Imports private key as extractable: false", async () => {
    const nonExtractable = await importNonExtractablePrivateKey(privateJwk);
    assert.ok(nonExtractable, "Imported CryptoKey exists");
    assert.equal(
      nonExtractable.extractable,
      false,
      "Private key is strictly non-extractable",
    );
    assert.equal(nonExtractable.algorithm.name, "ECDH");

    // Attempting to export must throw
    await assert.rejects(async () => {
      await subtle.exportKey("jwk", nonExtractable);
    });
  });

  await t.test(
    "2.2 Public keys match helper validates coordinates",
    async () => {
      const keyA = { kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y };
      const keyB = { kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y };
      const keyDifferent = {
        kty: "EC",
        crv: "P-256",
        x: "different_coord_x",
        y: publicJwk.y,
      };

      assert.equal(publicKeysMatch(keyA, keyB), true);
      assert.equal(publicKeysMatch(keyA, keyDifferent), false);
      assert.equal(publicKeysMatch(keyA, null), false);
    },
  );
});

test("Category 3: End-to-End Multi-Device Restoration and Decryption Simulation", async (t) => {
  // Simulate Alice on Device 1
  const aliceId = "user_alice_12345";
  const bobId = "user_bob_67890";
  const { privateJwk: alicePrivateJwk, publicJwk: alicePublicJwk } =
    await generateTestKeyPair();
  const { pair: bobPair, publicJwk: bobPublicJwk } =
    await generateTestKeyPair();

  // Alice on Device 1 creates backup
  const aliceBackup = await encryptPrivateKeyBackup(
    alicePrivateJwk,
    TEST_PASSPHRASE_1,
  );

  // Bob sends an encrypted direct message to Alice's registered public key
  const alicePublicKeyImported = await subtle.importKey(
    "jwk",
    alicePublicJwk,
    ECDH_ALGO,
    true,
    [],
  );
  const bobSharedWithAlice = await deriveChattySharedKey(
    bobPair.privateKey,
    alicePublicKeyImported,
  );
  const dmSecretText =
    "Hello Alice! This is a secret encrypted direct message.";
  const dmIv = crypto.getRandomValues(new Uint8Array(12));
  const dmCipher = await subtle.encrypt(
    { name: "AES-GCM", iv: dmIv },
    bobSharedWithAlice,
    enc.encode(dmSecretText),
  );
  const dmPayload = {
    text: bufToB64(dmCipher),
    iv: bufToB64(dmIv),
    senderId: bobId,
    receiverId: aliceId,
    encrypted: true,
  };

  // Group message simulation: Bob creates a group key, wraps it for Alice, and sends a group message
  const rawGroupKey = crypto.getRandomValues(new Uint8Array(32));
  const groupIv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedGroupKeyForAlice = await subtle.encrypt(
    { name: "AES-GCM", iv: groupIv },
    bobSharedWithAlice,
    rawGroupKey,
  );
  const wrappedGroupKeyPayload = {
    wrappedKey: bufToB64(wrappedGroupKeyForAlice),
    iv: bufToB64(groupIv),
    wrapperPublicKey: bobPublicJwk,
  };

  // Encrypt group message with the raw group key
  const importedAesGroupKey = await subtle.importKey(
    "raw",
    rawGroupKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  const groupSecretText = "Confidential Group Announcement for all members.";
  const groupMsgIv = crypto.getRandomValues(new Uint8Array(12));
  const groupMsgCipher = await subtle.encrypt(
    { name: "AES-GCM", iv: groupMsgIv },
    importedAesGroupKey,
    enc.encode(groupSecretText),
  );

  // NOW SIMULATE DEVICE 2:
  await t.test(
    "3.1 Device 2 restores private identity using recovery passphrase",
    async () => {
      // Device 2 fetches backup from server
      const restoredPrivateJwk = await decryptPrivateKeyBackup(
        aliceBackup.serialized,
        TEST_PASSPHRASE_1,
      );
      assert.equal(restoredPrivateJwk.x, alicePublicJwk.x);
      assert.equal(restoredPrivateJwk.y, alicePublicJwk.y);

      // Verify coordinates match registered server public key
      assert.ok(
        publicKeysMatch(restoredPrivateJwk, alicePublicJwk),
        "Restored public key matches server registration",
      );

      // Import as non-extractable CryptoKey on Device 2
      const device2AlicePrivateKey =
        await importNonExtractablePrivateKey(restoredPrivateJwk);

      // 3.2 Device 2 decrypts Bob's direct message sent to Device 1's public identity
      const bobPublicKeyImported = await subtle.importKey(
        "jwk",
        bobPublicJwk,
        ECDH_ALGO,
        true,
        [],
      );
      const device2SharedWithBob = await deriveChattySharedKey(
        device2AlicePrivateKey,
        bobPublicKeyImported,
      );

      const decryptedDmBuffer = await subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBuf(dmPayload.iv) },
        device2SharedWithBob,
        b64ToBuf(dmPayload.text),
      );
      const decryptedDmText = dec.decode(decryptedDmBuffer);
      assert.equal(
        decryptedDmText,
        dmSecretText,
        "Device 2 successfully decrypted historical DM!",
      );

      // 3.3 Device 2 unwraps Bob's wrapped group key and decrypts the group message
      const unwrappedGroupKeyRaw = await subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBuf(wrappedGroupKeyPayload.iv) },
        device2SharedWithBob,
        b64ToBuf(wrappedGroupKeyPayload.wrappedKey),
      );
      assert.deepEqual(
        new Uint8Array(unwrappedGroupKeyRaw),
        rawGroupKey,
        "Device 2 successfully unwrapped the original group key!",
      );

      const device2GroupKey = await subtle.importKey(
        "raw",
        unwrappedGroupKeyRaw,
        "AES-GCM",
        false,
        ["decrypt"],
      );
      const decryptedGroupMsgBuffer = await subtle.decrypt(
        { name: "AES-GCM", iv: groupMsgIv },
        device2GroupKey,
        groupMsgCipher,
      );
      const decryptedGroupText = dec.decode(decryptedGroupMsgBuffer);
      assert.equal(
        decryptedGroupText,
        groupSecretText,
        "Device 2 successfully decrypted historical group message!",
      );
    },
  );
});

test("Category 4: Passphrase Rotation (Key Re-encryption)", async (t) => {
  const { privateJwk, publicJwk } = await generateTestKeyPair();

  // Initial backup with Passphrase 1
  const initialBackup = await encryptPrivateKeyBackup(
    privateJwk,
    TEST_PASSPHRASE_1,
  );

  // Rotation: Decrypt with old passphrase, re-encrypt with new passphrase
  const unlockedJwk = await decryptPrivateKeyBackup(
    initialBackup.serialized,
    TEST_PASSPHRASE_1,
  );
  const updatedBackup = await encryptPrivateKeyBackup(
    unlockedJwk,
    TEST_PASSPHRASE_2,
  );

  // Assertions:
  // Old passphrase fails on new backup
  await assert.rejects(async () => {
    await decryptPrivateKeyBackup(updatedBackup.serialized, TEST_PASSPHRASE_1);
  });

  // New passphrase succeeds on new backup
  const restoredJwk = await decryptPrivateKeyBackup(
    updatedBackup.serialized,
    TEST_PASSPHRASE_2,
  );
  assert.equal(restoredJwk.d, privateJwk.d);
  assert.equal(restoredJwk.x, publicJwk.x);
  assert.equal(restoredJwk.y, publicJwk.y);
});

test("Category 5: Multi-Device Envelope Encryption and Decryption", async (t) => {
  // Setup 2 devices for Alice and 2 devices for Bob
  const aliceA1 = await generateTestKeyPair();
  const aliceA2 = await generateTestKeyPair();
  const bobB1 = await generateTestKeyPair();
  const bobB2 = await generateTestKeyPair();

  const aliceId = "alice1234567890123456789";
  const bobId = "bob123456789012345678901";

  const destDevices = [
    { userId: aliceId, deviceId: "alice-dev-1", publicKey: aliceA1.publicJwk },
    { userId: aliceId, deviceId: "alice-dev-2", publicKey: aliceA2.publicJwk },
    { userId: bobId, deviceId: "bob-dev-1", publicKey: bobB1.publicJwk },
    { userId: bobId, deviceId: "bob-dev-2", publicKey: bobB2.publicJwk },
  ];

  await t.test(
    "5.1 Alice Device A1 encrypts and wraps keys for all 4 devices",
    async () => {
      const plaintext = "Secret multi-device chat message!";

      // 1. Generate random message key (AES-256-GCM)
      const rawMsgKey = crypto.getRandomValues(new Uint8Array(32));
      const msgKey = await subtle.importKey(
        "raw",
        rawMsgKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"],
      );
      const msgIv = crypto.getRandomValues(new Uint8Array(12));
      const ctBuffer = await subtle.encrypt(
        { name: "AES-GCM", iv: msgIv },
        msgKey,
        enc.encode(plaintext),
      );
      const cipherB64 = bufToB64(ctBuffer);
      const ivB64 = bufToB64(msgIv);

      // 2. Wrap message key separately for each device using ECDH
      const keyEnvelopes = [];
      for (const dev of destDevices) {
        const devPub = await subtle.importKey(
          "jwk",
          dev.publicKey,
          ECDH_ALGO,
          true,
          [],
        );
        const wrapKey = await deriveChattySharedKey(
          aliceA1.pair.privateKey,
          devPub,
        );
        const wrapIv = crypto.getRandomValues(new Uint8Array(12));
        const wrapped = await subtle.encrypt(
          { name: "AES-GCM", iv: wrapIv },
          wrapKey,
          rawMsgKey,
        );
        keyEnvelopes.push({
          deviceId: dev.deviceId,
          userId: dev.userId,
          wrappedKey: bufToB64(wrapped),
          iv: bufToB64(wrapIv),
        });
      }

      assert.equal(keyEnvelopes.length, 4, "Created 4 envelopes");

      // 3. Sender's OTHER device (Alice A2) unwraps envelope and decrypts
      const a2Envelope = keyEnvelopes.find((e) => e.deviceId === "alice-dev-2");
      assert.ok(a2Envelope, "Found A2 envelope");

      const a1PubForA2 = await subtle.importKey(
        "jwk",
        aliceA1.publicJwk,
        ECDH_ALGO,
        true,
        [],
      );
      const a2WrapKey = await deriveChattySharedKey(
        aliceA2.pair.privateKey,
        a1PubForA2,
      );
      const a2UnwrappedRaw = await subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBuf(a2Envelope.iv) },
        a2WrapKey,
        b64ToBuf(a2Envelope.wrappedKey),
      );
      assert.deepEqual(
        new Uint8Array(a2UnwrappedRaw),
        rawMsgKey,
        "A2 successfully recovered message key",
      );

      const a2MsgKey = await subtle.importKey(
        "raw",
        a2UnwrappedRaw,
        "AES-GCM",
        false,
        ["decrypt"],
      );
      const a2Decrypted = dec.decode(
        await subtle.decrypt(
          { name: "AES-GCM", iv: b64ToBuf(ivB64) },
          a2MsgKey,
          b64ToBuf(cipherB64),
        ),
      );
      assert.equal(
        a2Decrypted,
        plaintext,
        "Alice Device A2 successfully decrypted sent message!",
      );

      // 4. Recipient Device B1 unwraps envelope and decrypts
      const b1Envelope = keyEnvelopes.find((e) => e.deviceId === "bob-dev-1");
      assert.ok(b1Envelope, "Found B1 envelope");
      const a1PubForB1 = await subtle.importKey(
        "jwk",
        aliceA1.publicJwk,
        ECDH_ALGO,
        true,
        [],
      );
      const b1WrapKey = await deriveChattySharedKey(
        bobB1.pair.privateKey,
        a1PubForB1,
      );
      const b1UnwrappedRaw = await subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBuf(b1Envelope.iv) },
        b1WrapKey,
        b64ToBuf(b1Envelope.wrappedKey),
      );
      const b1MsgKey = await subtle.importKey(
        "raw",
        b1UnwrappedRaw,
        "AES-GCM",
        false,
        ["decrypt"],
      );
      const b1Decrypted = dec.decode(
        await subtle.decrypt(
          { name: "AES-GCM", iv: b64ToBuf(ivB64) },
          b1MsgKey,
          b64ToBuf(cipherB64),
        ),
      );
      assert.equal(
        b1Decrypted,
        plaintext,
        "Bob Device B1 successfully decrypted incoming message!",
      );

      // 5. Recipient Device B2 unwraps envelope and decrypts
      const b2Envelope = keyEnvelopes.find((e) => e.deviceId === "bob-dev-2");
      assert.ok(b2Envelope, "Found B2 envelope");
      const a1PubForB2 = await subtle.importKey(
        "jwk",
        aliceA1.publicJwk,
        ECDH_ALGO,
        true,
        [],
      );
      const b2WrapKey = await deriveChattySharedKey(
        bobB2.pair.privateKey,
        a1PubForB2,
      );
      const b2UnwrappedRaw = await subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBuf(b2Envelope.iv) },
        b2WrapKey,
        b64ToBuf(b2Envelope.wrappedKey),
      );
      const b2MsgKey = await subtle.importKey(
        "raw",
        b2UnwrappedRaw,
        "AES-GCM",
        false,
        ["decrypt"],
      );
      const b2Decrypted = dec.decode(
        await subtle.decrypt(
          { name: "AES-GCM", iv: b64ToBuf(ivB64) },
          b2MsgKey,
          b64ToBuf(cipherB64),
        ),
      );
      assert.equal(
        b2Decrypted,
        plaintext,
        "Bob Device B2 successfully decrypted incoming message!",
      );
    },
  );

  await t.test(
    "5.2 displayText prevents raw ciphertext and base64 leak in UI",
    () => {
      // Case 1: Plaintext message displays text
      assert.equal(displayText({ text: "Hello plaintext" }), "Hello plaintext");

      // Case 2: Encrypted message not yet decrypted displays lock placeholder
      assert.equal(
        displayText({
          text: "aW52YWxpZENpcGhlcjEyMzQ1",
          encrypted: true,
          decrypted: false,
        }),
        FAILED_TEXT,
      );

      // Case 3: Message with decryptFailed=true displays lock placeholder
      assert.equal(
        displayText({
          text: "",
          encrypted: true,
          decrypted: false,
          decryptFailed: true,
        }),
        FAILED_TEXT,
      );

      // Case 4: Successfully decrypted message displays decrypted text
      assert.equal(
        displayText({
          text: "Decrypted readable text",
          encrypted: true,
          decrypted: true,
        }),
        "Decrypted readable text",
      );
    },
  );
});
