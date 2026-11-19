import test from "node:test";
import assert from "node:assert/strict";

// Setup browser mocks
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(String(key)) ?? null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hostname: "localhost" },
};
globalThis.document = {
  visibilityState: "visible",
  addEventListener: () => {},
  removeEventListener: () => {},
};

import {
  loadLocalConfig,
  saveLocalConfig,
  clearUserLockConfig,
  isSessionUnlocked,
  setSessionUnlocked,
  clearSessionUnlock,
  isValidUserId,
  sanitizeLegacyLockStorage,
} from "../src/lib/appLockStorage.js";
import { useAppLockStore } from "../src/store/useAppLockStore.js";
import { usePrivacyStore, DEFAULT_PRIVACY } from "../src/store/usePrivacyStore.js";
import { useChatLockStore } from "../src/store/useChatLockStore.js";
import { axiosInstance } from "../src/lib/axios.js";

test("Lock Security Lifecycle & Automatic Activation Prevention Suite", async (t) => {
  t.beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    useAppLockStore.getState().reset();
    useChatLockStore.getState().reset();
    usePrivacyStore.getState().resetPrivacy();
  });

  await t.test("1. New user has App Lock disabled by default", async () => {
    const newUser = { id: "user_fresh_1", fullName: "Fresh User" };
    await useAppLockStore.getState().initAppLock(null, newUser.id);

    const state = useAppLockStore.getState();
    assert.equal(state.isConfigured, false, "App Lock must NOT be configured");
    assert.equal(state.isLocked, false, "App Lock must NOT be locked");
    assert.equal(state.isUnlockedThisSession, false);
    assert.equal(state.failedAttempts, 0);
  });

  await t.test("2. New user has Chat Lock disabled by default", async () => {
    usePrivacyStore.getState().initFromUser({
      id: "user_fresh_2",
      lockedChats: [],
    });

    const isLocked = useChatLockStore.getState().isChatLocked("conversation_999");
    const isConfigured = useChatLockStore.getState().isChatLockConfigured("conversation_999");

    assert.equal(isLocked, false, "Individual Chat Lock must be false for new user");
    assert.equal(isConfigured, false, "Chat Lock must not be configured for new user");
  });

  await t.test("3. New user has Group Chat Lock disabled by default", async () => {
    usePrivacyStore.getState().initFromUser({
      id: "user_fresh_3",
      lockedChats: [],
    });

    const isLocked = useChatLockStore.getState().isChatLocked("group_777");
    const isConfigured = useChatLockStore.getState().isChatLockConfigured("group_777");

    assert.equal(isLocked, false, "Group Chat Lock must be false for new user");
    assert.equal(isConfigured, false, "Group Chat Lock must not be configured for new user");
  });

  await t.test("4. Missing database configuration does not activate any lock", async () => {
    // Missing all lock fields completely
    usePrivacyStore.getState().initFromUser({
      id: "user_missing_fields",
    });

    await useAppLockStore.getState().initAppLock(
      usePrivacyStore.getState().privacy,
      "user_missing_fields"
    );

    const appLockState = useAppLockStore.getState();
    const privacyState = usePrivacyStore.getState().privacy;

    assert.equal(privacyState.appLockEnabled, false);
    assert.deepEqual(privacyState.lockedChats, []);
    assert.equal(appLockState.isConfigured, false);
    assert.equal(appLockState.isLocked, false);
    assert.equal(useChatLockStore.getState().isChatLocked("chat_1"), false);
  });

  await t.test("5. Database reset does NOT reactivate old locks or steal old PINs", async () => {
    // Simulate previous user setting up a PIN before DB reset
    const oldUserId = "user_old_pre_reset";
    saveLocalConfig(oldUserId, {
      enabled: true,
      verifier: "pbkdf2:100000:aabbcc:ddeeff",
      timeout: "immediately",
    });
    // Legacy stray key that might have existed
    globalThis.localStorage.setItem(
      "chatty:app_lock:config:default",
      JSON.stringify({ enabled: true, verifier: "pbkdf2:100000:old:old" })
    );

    // Database is dropped and fresh user registers with new ID
    const newUserId = "user_new_post_reset";
    await useAppLockStore.getState().initAppLock(
      { appLockEnabled: false, lockedChats: [] },
      newUserId
    );

    const state = useAppLockStore.getState();
    assert.equal(
      state.isConfigured,
      false,
      "New user must NOT adopt old user's verifier"
    );
    assert.equal(
      state.isLocked,
      false,
      "New user must NOT be locked out after DB reset"
    );

    // Verify localStorage for new user was never contaminated
    const newConfig = loadLocalConfig(newUserId);
    assert.equal(newConfig, null);
  });

  await t.test("6. Refresh does not incorrectly activate a lock", async () => {
    const userId = "user_refresh_test";
    // First visit
    await useAppLockStore.getState().initAppLock(null, userId);
    assert.equal(useAppLockStore.getState().isLocked, false);

    // Browser refresh simulation (re-running initAppLock without any PIN set)
    await useAppLockStore.getState().initAppLock(null, userId);
    assert.equal(useAppLockStore.getState().isLocked, false);
    assert.equal(useAppLockStore.getState().isConfigured, false);
  });

  await t.test("7. Login does not incorrectly activate a lock", async () => {
    const loginPayload = {
      _id: "user_login_test",
      id: "user_login_test",
      fullName: "Logged In User",
      email: "login@test.com",
      appLockEnabled: false,
      lockedChats: [],
    };

    usePrivacyStore.getState().initFromUser(loginPayload);
    await useAppLockStore.getState().initAppLock(
      usePrivacyStore.getState().privacy,
      loginPayload.id
    );

    assert.equal(useAppLockStore.getState().isLocked, false);
    assert.equal(useAppLockStore.getState().isConfigured, false);
    assert.equal(useChatLockStore.getState().isChatLocked("any_chat"), false);
  });

  await t.test("8. Logout and account switching do not leak lock settings", async () => {
    // User A sets up App Lock and locks a conversation
    const userA = "user_alice";
    useAppLockStore.setState({ activeUserId: userA });
    saveLocalConfig(userA, {
      enabled: true,
      verifier: "pbkdf2:100000:saltA:hashA",
      timeout: "immediately",
    });
    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        appLockEnabled: true,
        lockedChats: ["chat_secret_alice"],
      },
    });
    useChatLockStore.setState({
      unlockedInSession: new Set(["chat_secret_alice"]),
    });

    // Alice logs out -> reset all stores
    useAppLockStore.getState().reset();
    useChatLockStore.getState().reset();
    usePrivacyStore.getState().resetPrivacy();

    // Verify in-memory state is clean
    assert.equal(useAppLockStore.getState().isConfigured, false);
    assert.equal(useAppLockStore.getState().isLocked, false);
    assert.equal(useChatLockStore.getState().unlockedInSession.size, 0);
    assert.deepEqual(usePrivacyStore.getState().privacy.lockedChats, []);

    // User B logs in
    const userB = "user_bob";
    usePrivacyStore.getState().initFromUser({
      id: userB,
      appLockEnabled: false,
      lockedChats: [],
    });
    await useAppLockStore.getState().initAppLock(
      usePrivacyStore.getState().privacy,
      userB
    );

    assert.equal(useAppLockStore.getState().isConfigured, false);
    assert.equal(useAppLockStore.getState().isLocked, false);
    assert.equal(useChatLockStore.getState().isChatLocked("chat_secret_alice"), false);
  });

  await t.test("9. Zustand hydration does not restore another user's lock", async () => {
    // Store has user_carol's config in localStorage
    saveLocalConfig("user_carol", {
      enabled: true,
      verifier: "pbkdf2:100000:saltC:hashC",
      timeout: "immediately",
    });

    // Querying with null, default, or another user
    assert.equal(loadLocalConfig(null), null);
    assert.equal(loadLocalConfig("default"), null);
    assert.equal(loadLocalConfig("user_dave"), null);
    assert.equal(isValidUserId("default"), false);
    assert.equal(isValidUserId(null), false);
    assert.equal(isValidUserId(undefined), false);
  });

  await t.test("10. Explicit App Lock setup activates App Lock", async () => {
    const userId = "user_setup_test";
    useAppLockStore.setState({ activeUserId: userId });

    // Mock axios patch for privacy
    const origPatch = axiosInstance.patch;
    axiosInstance.patch = async () => ({
      data: { data: { appLockEnabled: true, appLockTimeout: "immediately" } },
    });

    try {
      const ok = await useAppLockStore.getState().setupPin("2468", "immediately");
      assert.equal(ok, true);

      const state = useAppLockStore.getState();
      assert.equal(state.isConfigured, true, "Store must mark isConfigured = true");
      assert.equal(state.isLocked, false, "Freshly configured session starts unlocked");

      // Verify config was saved to localStorage strictly under user's key
      const localCfg = loadLocalConfig(userId);
      assert.ok(localCfg);
      assert.equal(localCfg.enabled, true);
      assert.ok(localCfg.verifier.startsWith("pbkdf2:"));

      // Simulate lockNow
      useAppLockStore.getState().lockNow();
      assert.equal(useAppLockStore.getState().isLocked, true);

      // Unlock with correct PIN
      const unlocked = await useAppLockStore.getState().unlock("2468");
      assert.equal(unlocked, true);
      assert.equal(useAppLockStore.getState().isLocked, false);
    } finally {
      axiosInstance.patch = origPatch;
    }
  });

  await t.test("11. Explicit Chat Lock setup affects only the selected conversation", async () => {
    const userId = "user_chat_lock_test";
    useAppLockStore.setState({ activeUserId: userId, isConfigured: true });
    saveLocalConfig(userId, {
      enabled: true,
      verifier: "pbkdf2:100000:salt:hash",
      timeout: "immediately",
    });

    // Mock axios patch for privacy
    const origPatch = axiosInstance.patch;
    axiosInstance.patch = async (url, data) => ({
      data: { data: { lockedChats: data.lockedChats } },
    });

    try {
      // User locks conversation 101
      const ok = await useChatLockStore.getState().toggleLock("conv_101");
      assert.equal(ok, true);

      // Clear session unlock for conv_101 to simulate leaving chat
      useChatLockStore.getState().lockChatAgain("conv_101");

      assert.equal(
        useChatLockStore.getState().isChatLocked("conv_101"),
        true,
        "conv_101 must be locked"
      );
      assert.equal(
        useChatLockStore.getState().isChatLocked("conv_202"),
        false,
        "conv_202 must remain unlocked"
      );
    } finally {
      axiosInstance.patch = origPatch;
    }
  });

  await t.test("12. Explicit Group Chat Lock setup affects only the selected group", async () => {
    const userId = "user_group_lock_test";
    useAppLockStore.setState({ activeUserId: userId, isConfigured: true });
    saveLocalConfig(userId, {
      enabled: true,
      verifier: "pbkdf2:100000:salt:hash",
      timeout: "immediately",
    });

    const origPatch = axiosInstance.patch;
    axiosInstance.patch = async (url, data) => ({
      data: { data: { lockedChats: data.lockedChats } },
    });

    try {
      // User locks group 501
      await useChatLockStore.getState().toggleLock("group_501");
      useChatLockStore.getState().lockChatAgain("group_501");

      assert.equal(
        useChatLockStore.getState().isChatLocked("group_501"),
        true,
        "group_501 must be locked"
      );
      assert.equal(
        useChatLockStore.getState().isChatLocked("group_999"),
        false,
        "group_999 must remain unlocked"
      );
    } finally {
      axiosInstance.patch = origPatch;
    }
  });

  await t.test("13. Disabling a lock works after proper PIN verification", async () => {
    const userId = "user_disable_test";
    useAppLockStore.setState({ activeUserId: userId });

    const origPatch = axiosInstance.patch;
    axiosInstance.patch = async () => ({
      data: { data: { appLockEnabled: false, appLockPinHash: null } },
    });

    try {
      await useAppLockStore.getState().setupPin("5555", "immediately");
      assert.equal(useAppLockStore.getState().isConfigured, true);

      // Wrong PIN fails to disable
      const wrong = await useAppLockStore.getState().disablePin("1111");
      assert.equal(wrong, false);
      assert.equal(useAppLockStore.getState().isConfigured, true);

      // Correct PIN disables
      const right = await useAppLockStore.getState().disablePin("5555");
      assert.equal(right, true);
      assert.equal(useAppLockStore.getState().isConfigured, false);
      assert.equal(useAppLockStore.getState().isLocked, false);
      assert.equal(loadLocalConfig(userId), null);
    } finally {
      axiosInstance.patch = origPatch;
    }
  });

  await t.test("14. Valid existing locks remain protected against incorrect PIN & lock out", async () => {
    const userId = "user_bruteforce_test";
    useAppLockStore.setState({ activeUserId: userId });

    const origPatch = axiosInstance.patch;
    axiosInstance.patch = async () => ({ data: { data: {} } });

    try {
      await useAppLockStore.getState().setupPin("9876", "immediately");
      useAppLockStore.getState().lockNow();

      // Attempt 1: wrong PIN
      const res1 = await useAppLockStore.getState().unlock("0000");
      assert.equal(res1, false);
      assert.equal(useAppLockStore.getState().isLocked, true);
      assert.equal(useAppLockStore.getState().failedAttempts, 1);

      // Attempt 2, 3, 4: wrong PIN triggers lockout
      await useAppLockStore.getState().unlock("0001");
      await useAppLockStore.getState().unlock("0002");
      await useAppLockStore.getState().unlock("0003");

      const state = useAppLockStore.getState();
      assert.equal(state.failedAttempts, 4);
      assert.ok(state.lockoutUntil > Date.now(), "Cooldown timer must be active");
      assert.ok(state.remainingCooldownSeconds > 0, "Cooldown seconds > 0");

      // While locked out, even the correct PIN is rejected immediately
      const lockedOutAttempt = await useAppLockStore.getState().unlock("9876");
      assert.equal(lockedOutAttempt, false, "Must reject during lockout cooldown");
    } finally {
      axiosInstance.patch = origPatch;
    }
  });

  await t.test("15. API failure does not silently bypass an existing configured lock", async () => {
    const userId = "user_api_fail_test";
    useAppLockStore.setState({ activeUserId: userId });

    const origPatch = axiosInstance.patch;
    const origGet = axiosInstance.get;

    try {
      axiosInstance.patch = async () => ({ data: { data: {} } });
      await useAppLockStore.getState().setupPin("4321", "immediately");
      useAppLockStore.getState().lockNow();
      assert.equal(useAppLockStore.getState().isLocked, true);

      // Simulate network / server crash when fetching privacy
      axiosInstance.get = async () => {
        throw new Error("Network Error: 500 Internal Server Error");
      };

      await usePrivacyStore.getState().fetchPrivacy();

      // App Lock must remain safely locked!
      assert.equal(
        useAppLockStore.getState().isLocked,
        true,
        "API failure must NOT silently unlock the application"
      );
      assert.equal(
        useAppLockStore.getState().isConfigured,
        true,
        "API failure must NOT discard local lock configuration"
      );
    } finally {
      axiosInstance.patch = origPatch;
      axiosInstance.get = origGet;
    }
  });

  await t.test("16. Multiple devices do not overwrite each other's configuration incorrectly", async () => {
    // Device 1 has local PIN configured for User X
    const userX = "user_multi_device";
    saveLocalConfig(userX, {
      enabled: true,
      verifier: "pbkdf2:100000:saltDevice1:hashDevice1",
      timeout: "immediately",
    });

    // Simulate Device 2: fresh browser storage for same User X
    // Backend says appLockEnabled: true (from Device 1), but Device 2 has no local verifier
    const device2LocalStorage = new MockStorage();
    const savedLocalStorage = globalThis.localStorage;
    globalThis.localStorage = device2LocalStorage;

    try {
      // On Device 2, loading config returns null
      const d2Config = loadLocalConfig(userX);
      assert.equal(d2Config, null, "Device 2 has no local verifier");

      // Device 2 initializes
      useAppLockStore.getState().reset();
      await useAppLockStore.getState().initAppLock(
        { appLockEnabled: true, appLockTimeout: "immediately" },
        userX
      );

      // Device 2 must NOT lock out the user without a local verifier
      const d2State = useAppLockStore.getState();
      assert.equal(
        d2State.isConfigured,
        false,
        "Device 2 without local verifier must not be locked"
      );
      assert.equal(
        d2State.isLocked,
        false,
        "Device 2 must remain usable without being trapped"
      );
    } finally {
      globalThis.localStorage = savedLocalStorage;
    }
  });
});
