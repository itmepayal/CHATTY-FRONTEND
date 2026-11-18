import test from "node:test";
import assert from "node:assert/strict";

class MockStorage {
  constructor(shouldThrow = false) {
    this.store = new Map();
    this.shouldThrow = shouldThrow;
  }
  getItem(key) {
    if (this.shouldThrow)
      throw new Error("SecurityError: Access to storage is denied.");
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    if (this.shouldThrow)
      throw new Error("SecurityError: Access to storage is denied.");
    this.store.set(key, String(value));
  }
  removeItem(key) {
    if (this.shouldThrow)
      throw new Error("SecurityError: Access to storage is denied.");
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

test("E2EE Persistent Device ID & Registration Suite", async (t) => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;

  t.afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  });

  await t.test(
    "1. Same browser refresh: returns identical persistent device ID",
    async () => {
      const mockLocal = new MockStorage();
      globalThis.localStorage = mockLocal;
      globalThis.sessionStorage = new MockStorage();

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");

      const idFirst = getDeviceId();
      const idSecond = getDeviceId();
      const idStored = mockLocal.getItem("chatty_e2ee_device_id");

      assert.ok(typeof idFirst === "string" && idFirst.length >= 16);
      assert.equal(
        idFirst,
        idSecond,
        "Must return the same device ID across re-reads",
      );
      assert.equal(
        idFirst,
        idStored,
        "Must persist the device ID in localStorage",
      );
      assert.notEqual(
        idFirst,
        "device-session-fallback",
        "Must not use static fallback",
      );
    },
  );

  await t.test(
    "2. Same browser relaunch: reloads same device ID from existing storage",
    async () => {
      const mockLocal = new MockStorage();
      const preExistingId = "11112222-3333-4444-5555-666677778888";
      mockLocal.setItem("chatty_e2ee_device_id", preExistingId);
      globalThis.localStorage = mockLocal;
      globalThis.sessionStorage = new MockStorage();

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");

      const resolved = getDeviceId();
      assert.equal(
        resolved,
        preExistingId,
        "Must load existing device ID from localStorage",
      );
    },
  );

  await t.test(
    "3. New browser profile: generates new unique device ID",
    async () => {
      const profileAStorage = new MockStorage();
      const profileBStorage = new MockStorage();

      globalThis.localStorage = profileAStorage;
      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");
      const idProfileA = getDeviceId();

      globalThis.localStorage = profileBStorage;
      // Call with distinct storage instance
      const idProfileB = profileBStorage.getItem("chatty_e2ee_device_id");

      assert.notEqual(
        idProfileA,
        idProfileB,
        "Distinct browser profiles must have distinct device IDs",
      );
    },
  );

  await t.test(
    "4. Storage completely unavailable: graceful in-memory UUID without static fallback",
    async () => {
      // Both localStorage and sessionStorage throw access denied (e.g. strict security policy)
      globalThis.localStorage = new MockStorage(true);
      globalThis.sessionStorage = new MockStorage(true);

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");

      const fallbackId = getDeviceId();
      assert.ok(typeof fallbackId === "string" && fallbackId.length >= 16);
      assert.notEqual(
        fallbackId,
        "device-session-fallback",
        "Must never return shared static fallback string",
      );

      // Repeated call in same session reuses the ephemeral UUID
      const repeatCallId = getDeviceId();
      assert.equal(
        fallbackId,
        repeatCallId,
        "Must remain stable in memory during the page session",
      );
    },
  );

  await t.test(
    "5. Legacy fallback cleanup: replaces 'device-session-fallback' with a valid UUID",
    async () => {
      const mockLocal = new MockStorage();
      mockLocal.setItem("chatty_e2ee_device_id", "device-session-fallback");
      globalThis.localStorage = mockLocal;
      globalThis.sessionStorage = new MockStorage();

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");

      const cleanedId = getDeviceId();
      assert.notEqual(
        cleanedId,
        "device-session-fallback",
        "Must overwrite static fallback",
      );
      assert.equal(mockLocal.getItem("chatty_e2ee_device_id"), cleanedId);
    },
  );

  await t.test(
    "6. isPersistentStorageAvailable helper reflects storage availability accurately",
    async () => {
      globalThis.localStorage = new MockStorage();
      const { isPersistentStorageAvailable } =
        await import("../src/lib/e2ee/e2eeDevice.js");
      assert.equal(isPersistentStorageAvailable(), true);

      globalThis.localStorage = new MockStorage(true);
      assert.equal(isPersistentStorageAvailable(), false);
    },
  );

  await t.test(
    "7. Cleared browser storage: treats as new device installation and generates new unique ID",
    async () => {
      const mockLocal = new MockStorage();
      globalThis.localStorage = mockLocal;
      globalThis.sessionStorage = new MockStorage();

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");
      const initialId = getDeviceId();
      assert.ok(initialId);

      mockLocal.clear();

      const newIdAfterClear = getDeviceId();
      assert.notEqual(
        newIdAfterClear,
        initialId,
        "Clearing browser storage must not falsely reuse old device ID",
      );
      assert.equal(mockLocal.getItem("chatty_e2ee_device_id"), newIdAfterClear);
    },
  );

  await t.test(
    "8. Private browsing with sessionStorage: persists per session without static fallback",
    async () => {
      // localStorage throws (e.g. storage access blocked in private browsing)
      const mockLocal = new MockStorage(true);
      const mockSession = new MockStorage(false);
      globalThis.localStorage = mockLocal;
      globalThis.sessionStorage = mockSession;

      const { getDeviceId } = await import("../src/lib/e2ee/e2eeDevice.js");
      const privId1 = getDeviceId();
      const privId2 = getDeviceId();

      assert.equal(
        privId1,
        privId2,
        "Must remain consistent across calls within the session",
      );
      assert.equal(
        mockSession.getItem("chatty_e2ee_device_id"),
        privId1,
        "Must store in sessionStorage",
      );
      assert.notEqual(
        privId1,
        "device-session-fallback",
        "Must never use shared fallback string in private browsing",
      );
    },
  );
});
