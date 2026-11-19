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
  dispatchEvent: () => {},
  location: { hostname: "localhost" },
  focus: () => {},
};
globalThis.document = {
  visibilityState: "visible",
  addEventListener: () => {},
  removeEventListener: () => {},
  hasFocus: () => true,
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
  isAppLockActiveSync,
  setAppLockActiveSync,
} from "../src/lib/appLockStorage.js";
import {
  bufToBase64Url,
  base64UrlToBuf,
  hashPinPbkdf2,
} from "../src/lib/appLockCrypto.js";
import { useAppLockStore } from "../src/store/useAppLockStore.js";
import { usePrivacyStore, DEFAULT_PRIVACY } from "../src/store/usePrivacyStore.js";
import { useChatLockStore } from "../src/store/useChatLockStore.js";
import { useChatStore } from "../src/store/useChatStore.js";
import {
  showDesktopNotification,
  handleIncomingMessage,
} from "../src/services/notificationService.js";
import { axiosInstance } from "../src/lib/axios.js";

test("Lock Security Lifecycle & Automatic Activation Prevention Suite", async (t) => {
  let mockServerConfig = {
    pin: "2468",
    lockedChats: [],
    appLockEnabled: false,
    failedAttempts: 0,
    lockoutUntil: 0,
  };

  const origPost = axiosInstance.post;
  const origPatch = axiosInstance.patch;
  const origGet = axiosInstance.get;

  t.beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    useAppLockStore.getState().reset();
    useChatLockStore.getState().reset();
    usePrivacyStore.getState().resetPrivacy();

    mockServerConfig = {
      pin: "2468",
      lockedChats: [],
      appLockEnabled: false,
      failedAttempts: 0,
      lockoutUntil: 0,
    };

    axiosInstance.post = async (url, body) => {
      if (url.includes("/lock/setup")) {
        mockServerConfig.pin = body.pin;
        mockServerConfig.appLockEnabled = true;
        return {
          data: {
            status: "success",
            data: { unlockToken: "mock_unlock_token_jwt" },
          },
        };
      }
      if (url.includes("/lock/verify")) {
        const now = Date.now();
        if (mockServerConfig.lockoutUntil > now) {
          const err = new Error("Account temporarily locked out");
          err.response = {
            status: 429,
            data: {
              code: "LOCKED_OUT",
              message: "Account locked out",
              data: {
                retryAfterSeconds: Math.ceil(
                  (mockServerConfig.lockoutUntil - now) / 1000
                ),
              },
            },
          };
          throw err;
        }
        if (body.pin === mockServerConfig.pin) {
          mockServerConfig.failedAttempts = 0;
          return {
            data: {
              status: "success",
              data: { unlockToken: "mock_unlock_token_jwt" },
            },
          };
        } else {
          mockServerConfig.failedAttempts += 1;
          if (mockServerConfig.failedAttempts >= 4) {
            mockServerConfig.lockoutUntil = Date.now() + 30000;
          }
          const err = new Error("Incorrect PIN");
          err.response = {
            status: 401,
            data: {
              message: "Incorrect PIN",
              data: {
                remainingAttempts: Math.max(
                  0,
                  5 - mockServerConfig.failedAttempts
                ),
              },
            },
          };
          throw err;
        }
      }
      if (url.includes("/lock/disable")) {
        if (body.pin === mockServerConfig.pin) {
          mockServerConfig.appLockEnabled = false;
          return { data: { status: "success" } };
        }
        const err = new Error("Incorrect PIN");
        err.response = { status: 401, data: { message: "Incorrect PIN" } };
        throw err;
      }
      return origPost ? origPost(url, body) : { data: {} };
    };

    axiosInstance.patch = async (url, body) => {
      if (url.includes("/privacy")) {
        const current = usePrivacyStore.getState().privacy;
        const updated = { ...current, ...body };
        usePrivacyStore.setState({ privacy: updated });
        return { data: { status: "success", data: updated } };
      }
      return origPatch ? origPatch(url, body) : { data: {} };
    };

    axiosInstance.get = async (url) => {
      if (url.includes("/privacy")) {
        return { data: { data: usePrivacyStore.getState().privacy } };
      }
      return origGet ? origGet(url) : { data: {} };
    };
  });

  t.afterEach(() => {
    axiosInstance.post = origPost;
    axiosInstance.patch = origPatch;
    axiosInstance.get = origGet;
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
    const oldUserId = "user_old_pre_reset";
    saveLocalConfig(oldUserId, {
      enabled: true,
      verifier: "pbkdf2:100000:aabbcc:ddeeff",
      timeout: "immediately",
    });
    globalThis.localStorage.setItem(
      "chatty:app_lock:config:default",
      JSON.stringify({ enabled: true, verifier: "pbkdf2:100000:old:old" })
    );

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

    const newConfig = loadLocalConfig(newUserId);
    assert.equal(newConfig, null);
  });

  await t.test("6. Refresh does not incorrectly activate a lock", async () => {
    const userId = "user_refresh_test";
    await useAppLockStore.getState().initAppLock(null, userId);
    assert.equal(useAppLockStore.getState().isLocked, false);

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

    useAppLockStore.getState().reset();
    useChatLockStore.getState().reset();
    usePrivacyStore.getState().resetPrivacy();

    assert.equal(useAppLockStore.getState().isConfigured, false);
    assert.equal(useAppLockStore.getState().isLocked, false);
    assert.equal(useChatLockStore.getState().unlockedInSession.size, 0);
    assert.deepEqual(usePrivacyStore.getState().privacy.lockedChats, []);

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
    saveLocalConfig("user_carol", {
      enabled: true,
      verifier: "pbkdf2:100000:saltC:hashC",
      timeout: "immediately",
    });

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

    const ok = await useAppLockStore.getState().setupPin("2468", "immediately");
    assert.equal(ok, true);

    const state = useAppLockStore.getState();
    assert.equal(state.isConfigured, true, "Store must mark isConfigured = true");
    assert.equal(state.isLocked, false, "Freshly configured session starts unlocked");

    const localCfg = loadLocalConfig(userId);
    assert.ok(localCfg);
    assert.equal(localCfg.enabled, true);
    assert.ok(localCfg.verifier.startsWith("pbkdf2:"));

    useAppLockStore.getState().lockNow();
    assert.equal(useAppLockStore.getState().isLocked, true);

    const unlocked = await useAppLockStore.getState().unlock("2468");
    assert.equal(unlocked, true);
    assert.equal(useAppLockStore.getState().isLocked, false);
  });

  await t.test("11. Explicit Chat Lock setup affects only the selected conversation", async () => {
    const userId = "user_chat_lock_test";
    useAppLockStore.setState({ activeUserId: userId, isConfigured: true });

    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        appLockEnabled: true,
        lockedChats: ["conv_101"],
      },
    });

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
  });

  await t.test("12. Explicit Group Chat Lock setup affects only the selected group", async () => {
    const userId = "user_group_lock_test";
    useAppLockStore.setState({ activeUserId: userId, isConfigured: true });

    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        appLockEnabled: true,
        lockedChats: ["group_501"],
      },
    });

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
  });

  await t.test("13. Disabling a lock works after proper PIN verification", async () => {
    const userId = "user_disable_test";
    useAppLockStore.setState({ activeUserId: userId });

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
  });

  await t.test("14. Valid existing locks remain protected against incorrect PIN & lock out", async () => {
    const userId = "user_bruteforce_test";
    useAppLockStore.setState({ activeUserId: userId });

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
    assert.ok(state.failedAttempts >= 4);
    assert.ok(state.lockoutUntil > Date.now(), "Cooldown timer must be active");
    assert.ok(state.remainingCooldownSeconds > 0, "Cooldown seconds > 0");

    // While locked out, even the correct PIN is rejected immediately
    const lockedOutAttempt = await useAppLockStore.getState().unlock("9876");
    assert.equal(lockedOutAttempt, false, "Must reject during lockout cooldown");
  });

  await t.test("15. API failure does not silently bypass an existing configured lock", async () => {
    const userId = "user_api_fail_test";
    useAppLockStore.setState({ activeUserId: userId });

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
  });

  await t.test("16. Secondary device fail-open prevention: Server lock state is authoritative", async () => {
    const userX = "user_multi_device_sec";
    // Device 2 has fresh storage (no local verifier in localStorage)
    const device2LocalStorage = new MockStorage();
    const savedLocalStorage = globalThis.localStorage;
    globalThis.localStorage = device2LocalStorage;

    try {
      assert.equal(loadLocalConfig(userX), null, "Device 2 starts with no local verifier");

      // Device 2 receives authoritative server settings: appLockEnabled = true
      useAppLockStore.getState().reset();
      await useAppLockStore.getState().initAppLock(
        { appLockEnabled: true, appLockTimeout: "immediately" },
        userX
      );

      const d2State = useAppLockStore.getState();
      // Server-backed lock architecture: Device 2 MUST be locked!
      assert.equal(
        d2State.isLocked,
        true,
        "Device 2 MUST be locked when server has appLockEnabled: true (cross-device fail-open prevented)"
      );
      assert.equal(
        d2State.isConfigured,
        true,
        "Device 2 marks isConfigured = true based on server settings"
      );
    } finally {
      globalThis.localStorage = savedLocalStorage;
    }
  });

  await t.test("17. WebAuthn Base64URL decoding/encoding roundtrip", async () => {
    const testBytes = new Uint8Array([0, 1, 2, 250, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
    const b64url = bufToBase64Url(testBytes.buffer);

    // Must be valid URL-safe Base64 without +, /, =
    assert.equal(b64url.includes("+"), false);
    assert.equal(b64url.includes("/"), false);
    assert.equal(b64url.includes("="), false);

    const decodedBuf = base64UrlToBuf(b64url);
    const decodedBytes = new Uint8Array(decodedBuf);
    assert.deepEqual(Array.from(decodedBytes), Array.from(testBytes));
  });

  await t.test("18. isChatLocked returns true for privacy.lockedChats without local PIN config", async () => {
    // Secondary device: zero local storage configuration
    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        appLockEnabled: false,
        lockedChats: ["chat_cross_device_1"],
      },
    });

    // Without local verifier in localStorage, chat is STILL locked
    const isLocked = useChatLockStore.getState().isChatLocked("chat_cross_device_1");
    assert.equal(isLocked, true, "Chat must be locked based on server privacy lockedChats");
  });

  await t.test("19. setSelectedUser on locked chat triggers unlock modal and blocks message fetch", async () => {
    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        lockedChats: ["locked_partner_user"],
      },
    });

    let fetchCalled = false;
    const origGetMessage = useChatStore.getState().getMessage;
    useChatStore.setState({
      getMessage: async () => {
        fetchCalled = true;
      },
      selectedUser: null,
    });

    try {
      useChatStore.getState().setSelectedUser({
        id: "locked_partner_user",
        fullName: "Secret Contact",
      });

      // Unlock modal must open for the locked user
      assert.equal(
        useChatLockStore.getState().activeLockModalChatId,
        "locked_partner_user"
      );
      // selectedUser must NOT be set to the locked user
      assert.notEqual(useChatStore.getState().selectedUser?.id, "locked_partner_user");
      // Message fetch must NOT have been called
      assert.equal(fetchCalled, false);
    } finally {
      useChatStore.setState({ getMessage: origGetMessage, selectedUser: null });
      useChatLockStore.getState().closeUnlockModal();
    }
  });

  await t.test("20. Notification redaction when app or chat is locked", async () => {
    let capturedNotification = null;
    class MockNotification {
      constructor(title, options) {
        capturedNotification = { title, ...options };
      }
      static permission = "granted";
    }
    globalThis.Notification = MockNotification;
    globalThis.window.Notification = MockNotification;

    // 20.1: App is locked -> notification is redacted
    useAppLockStore.setState({ isLocked: true });
    showDesktopNotification({
      senderName: "Secret Agent",
      text: "The classified report is attached",
      chatId: "chat_agent_007",
      avatar: "https://avatar.test/agent.jpg",
      desktopNotifications: true,
      force: true,
    });

    assert.ok(capturedNotification);
    assert.equal(capturedNotification.title, "New message");
    assert.equal(capturedNotification.body, "You have a new message");
    assert.equal(capturedNotification.tag, "chatty-locked-message");
    assert.equal(capturedNotification.icon, "/chatty-favicon.png");

    // 20.2: App unlocked, but specific chat is locked -> notification is redacted
    useAppLockStore.setState({ isLocked: false });
    usePrivacyStore.setState({
      privacy: {
        ...DEFAULT_PRIVACY,
        lockedChats: ["chat_agent_007"],
      },
    });
    capturedNotification = null;

    showDesktopNotification({
      senderName: "Secret Agent",
      text: "Another confidential update",
      chatId: "chat_agent_007",
      avatar: "https://avatar.test/agent.jpg",
      desktopNotifications: true,
      force: true,
    });

    assert.ok(capturedNotification);
    assert.equal(capturedNotification.title, "New message");
    assert.equal(capturedNotification.body, "You have a new message");
    assert.equal(capturedNotification.tag, "chatty-locked-message");
    assert.equal(capturedNotification.icon, "/chatty-favicon.png");
  });

  await t.test("21. setupPin rollback on server failure", async () => {
    const userRollback = "user_rollback_test";
    useAppLockStore.setState({ activeUserId: userRollback });

    // Server setup fails with 500
    axiosInstance.post = async () => {
      throw new Error("500 Internal Server Error");
    };

    const res = await useAppLockStore.getState().setupPin("7777", "immediately");
    assert.equal(res, false, "setupPin must fail on server error");
    assert.equal(useAppLockStore.getState().isConfigured, false);
    assert.equal(loadLocalConfig(userRollback), null, "Local storage must not save config on server error");
  });

  await t.test("22. Reload with 'immediately' timeout forces lock screen", async () => {
    const userImm = "user_reload_imm";
    saveLocalConfig(userImm, {
      enabled: true,
      verifier: "pbkdf2:100000:salt:hash",
      timeout: "immediately",
    });

    // Mark session unlocked before reload
    setSessionUnlocked(userImm);

    // On reload, isSessionUnlocked with duration 'immediately' returns false
    const sessionActive = isSessionUnlocked(userImm, "immediately");
    assert.equal(sessionActive, false, "immediately timeout must NOT stay unlocked across reload");
  });
});
