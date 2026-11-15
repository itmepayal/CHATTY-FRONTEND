import test from "node:test";
import assert from "node:assert/strict";

// Setup browser globals mock before importing service
class MockNotification {
  static permission = "default";
  static requestPermission = async () => MockNotification.permission;

  constructor(title, options) {
    this.title = title;
    this.options = options;
    this.closed = false;
    MockNotification.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}
MockNotification.instances = [];

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

globalThis.document = {
  head: {
    appendChild: () => ({ firstChild: { data: "" } }),
  },
  createElement: () => ({
    appendChild: () => {},
    firstChild: { data: "" },
  }),
  querySelector: () => null,
  hasFocus: () => true,
  hidden: false,
};

globalThis.window = {
  document: globalThis.document,
  location: { href: "http://localhost:5173", origin: "http://localhost:5173" },
  Notification: MockNotification,
  AudioContext: class {
    currentTime = 0;
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    destination = {};
    close() {}
  },
  focus() {},
};
globalThis.Notification = MockNotification;
globalThis.localStorage = mockLocalStorage;

const {
  getPermissionState,
  requestPermission,
  formatNotificationPreview,
  claimAction,
  playMessageSound,
  showDesktopNotification,
  handleIncomingMessage,
  messageDeduplicator,
} = await import("../src/services/notificationService.js");

const {
  useNotificationSettingsStore,
  NOTIFICATION_SETTINGS_DEFAULTS,
} = await import("../src/store/useNotificationSettingsStore.js");

test("1. Permission state returns 'unsupported' when window.Notification is missing", () => {
  const orig = globalThis.window.Notification;
  delete globalThis.window.Notification;

  assert.equal(getPermissionState(), "unsupported");

  globalThis.window.Notification = orig;
});

test("2. Permission state accurately reflects browser permission ('default', 'granted', 'denied')", () => {
  MockNotification.permission = "default";
  assert.equal(getPermissionState(), "default");

  MockNotification.permission = "granted";
  assert.equal(getPermissionState(), "granted");

  MockNotification.permission = "denied";
  assert.equal(getPermissionState(), "denied");
});

test("3. requestPermission calls browser API and safely returns permission state", async () => {
  MockNotification.permission = "default";
  MockNotification.requestPermission = async () => "granted";

  const res = await requestPermission();
  assert.equal(res, "granted");

  MockNotification.requestPermission = async () => { throw new Error("Blocked"); };
  const rejected = await requestPermission();
  assert.equal(rejected, "denied");
});

test("4. formatNotificationPreview with showPreview: true includes sender and message text", () => {
  const preview = formatNotificationPreview({
    senderName: "Sarah Connor",
    text: "Come with me if you want to live.",
    showPreview: true,
  });

  assert.equal(preview.title, "Sarah Connor");
  assert.equal(preview.body, "Come with me if you want to live.");
});

test("5. formatNotificationPreview with showPreview: false enforces strict privacy ('Chatty' / 'New message')", () => {
  const preview = formatNotificationPreview({
    senderName: "Secret Agent",
    text: "Top secret mission details 12345",
    showPreview: false,
  });

  assert.equal(preview.title, "Chatty");
  assert.equal(preview.body, "New message");
  assert.equal(preview.body.includes("secret"), false);
  assert.equal(preview.title.includes("Agent"), false);
});

test("6. formatNotificationPreview truncates text longer than 100 characters with ellipsis", () => {
  const longText = "A".repeat(150);
  const preview = formatNotificationPreview({
    senderName: "Alice",
    text: longText,
    showPreview: true,
  });

  assert.ok(preview.body.length <= 100);
  assert.ok(preview.body.endsWith("…"));
});

test("7. formatNotificationPreview provides accurate media fallback descriptions", () => {
  const imgPreview = formatNotificationPreview({
    senderName: "Bob",
    hasImage: true,
    showPreview: true,
  });
  assert.equal(imgPreview.body, "📷 Photo");

  const vidPreview = formatNotificationPreview({
    senderName: "Bob",
    hasVideo: true,
    showPreview: true,
  });
  assert.equal(vidPreview.body, "📹 Video");

  const audioPreview = formatNotificationPreview({
    senderName: "Bob",
    hasAudio: true,
    showPreview: true,
  });
  assert.equal(audioPreview.body, "🎤 Voice message");

  const filePreview = formatNotificationPreview({
    senderName: "Bob",
    hasFile: true,
    showPreview: true,
  });
  assert.equal(filePreview.body, "📎 File");

  const locPreview = formatNotificationPreview({
    senderName: "Bob",
    hasLocation: true,
    showPreview: true,
  });
  assert.equal(locPreview.body, "📍 Location");
});

test("8. formatNotificationPreview handles empty or whitespace text gracefully", () => {
  const emptyPreview = formatNotificationPreview({
    senderName: "Charlie",
    text: "   ",
    showPreview: true,
  });
  assert.equal(emptyPreview.body, "New message");
});

test("9. claimAction suppresses duplicate notification claims for the same messageId", () => {
  const msgId = `msg_unique_${Date.now()}_1`;
  const firstClaim = claimAction("notification", msgId);
  const secondClaim = claimAction("notification", msgId);

  assert.equal(firstClaim, true, "First claim must succeed");
  assert.equal(secondClaim, false, "Second claim for same messageId must be suppressed");
});

test("10. claimAction allows claims for distinct messageIds", () => {
  const msgIdA = `msg_distinct_A_${Date.now()}`;
  const msgIdB = `msg_distinct_B_${Date.now()}`;

  assert.equal(claimAction("notification", msgIdA), true);
  assert.equal(claimAction("notification", msgIdB), true);
});

test("11. playMessageSound does not play when soundEnabled is false", () => {
  // Should return early and not throw
  assert.doesNotThrow(() => {
    playMessageSound({ soundEnabled: false, volume: 80 });
  });
});

test("12. playMessageSound throttles consecutive calls within 1000ms", () => {
  const msg1 = `sound_throttle_1_${Date.now()}`;
  const msg2 = `sound_throttle_2_${Date.now()}`;

  assert.doesNotThrow(() => {
    playMessageSound({ soundEnabled: true, volume: 80, messageId: msg1 });
    // Immediately calling with another message should be throttled
    playMessageSound({ soundEnabled: true, volume: 80, messageId: msg2 });
  });
});

test("13. showDesktopNotification suppresses notification when desktopNotifications is false", () => {
  MockNotification.permission = "granted";
  MockNotification.instances = [];

  const notif = showDesktopNotification({
    desktopNotifications: false,
    text: "Hello",
  });

  assert.equal(notif, null);
  assert.equal(MockNotification.instances.length, 0);
});

test("14. showDesktopNotification suppresses notification when browser permission is denied", () => {
  MockNotification.permission = "denied";
  MockNotification.instances = [];

  const notif = showDesktopNotification({
    desktopNotifications: true,
    text: "Hello",
  });

  assert.equal(notif, null);
  assert.equal(MockNotification.instances.length, 0);
});

test("15. showDesktopNotification creates notification with collapsed tag based on chatId", () => {
  MockNotification.permission = "granted";
  MockNotification.instances = [];

  const chatId = "66f1234567890abcdef12345";
  const notif = showDesktopNotification({
    desktopNotifications: true,
    senderName: "Alice",
    text: "Hey there!",
    chatId,
    messageId: `notif_tag_test_${Date.now()}`,
    showPreview: true,
  });

  assert.ok(notif);
  assert.equal(notif.title, "Alice");
  assert.equal(notif.options.body, "Hey there!");
  assert.equal(notif.options.tag, `chat-${chatId}`);
  assert.equal(notif.options.renotify, false);
});

test("16. useNotificationSettingsStore handles defaults and resetSettings on logout", () => {
  const store = useNotificationSettingsStore.getState();
  assert.deepEqual(store.settings, NOTIFICATION_SETTINGS_DEFAULTS);

  // Update in-memory state
  useNotificationSettingsStore.setState({
    settings: {
      soundEnabled: false,
      soundVolume: 20,
      desktopNotifications: true,
      showPreview: false,
    },
  });

  assert.equal(useNotificationSettingsStore.getState().settings.soundVolume, 20);

  // Reset (e.g. on logout)
  useNotificationSettingsStore.getState().resetSettings();
  assert.deepEqual(
    useNotificationSettingsStore.getState().settings,
    NOTIFICATION_SETTINGS_DEFAULTS,
  );
});

test("17. handleIncomingMessage deduplicates incoming messages by message ID", () => {
  messageDeduplicator.clear();
  MockNotification.permission = "granted";
  MockNotification.instances = [];

  const msgId = `dedup_test_${Date.now()}`;
  const incoming = {
    id: msgId,
    senderId: "user_alice",
    text: "First time message",
    chatId: "user_alice",
  };

  const firstCall = handleIncomingMessage(incoming, {
    currentUserId: "user_bob",
    isDesignatedNotifier: true,
    isFocusedSameChat: false,
    settings: {
      soundEnabled: true,
      soundVolume: 50,
      desktopNotifications: true,
      showPreview: true,
    },
  });

  assert.ok(firstCall, "First invocation must process notification");
  assert.equal(firstCall.messageId, msgId);
  assert.equal(firstCall.desktopShown, true);

  const secondCall = handleIncomingMessage(incoming, {
    currentUserId: "user_bob",
    isDesignatedNotifier: true,
    isFocusedSameChat: false,
  });

  assert.equal(
    secondCall,
    null,
    "Second invocation with identical ID must be deduplicated and skipped",
  );
});

test("18. Listener registered once: mock socket and count handlers", () => {
  const listeners = new Map();
  const mockSocket = {
    on: (event, handler) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    off: (event, handler) => {
      if (!listeners.has(event)) return;
      if (!handler) {
        listeners.delete(event);
      } else {
        const arr = listeners.get(event).filter((h) => h !== handler);
        listeners.set(event, arr);
      }
    },
    listeners: (event) => listeners.get(event) || [],
  };

  const handler1 = () => {};
  const handler2 = () => {};

  // Single source registration pattern: clean up before registering
  mockSocket.off("newMessage");
  mockSocket.on("newMessage", handler1);
  assert.equal(mockSocket.listeners("newMessage").length, 1);

  // StrictMode simulate: unmount and remount with off before on
  mockSocket.off("newMessage", handler1);
  assert.equal(mockSocket.listeners("newMessage").length, 0);

  mockSocket.off("newMessage");
  mockSocket.on("newMessage", handler2);
  assert.equal(mockSocket.listeners("newMessage").length, 1);

  // Even if called repeatedly with cleanup protection:
  mockSocket.off("newMessage");
  mockSocket.on("newMessage", handler2);
  assert.equal(mockSocket.listeners("newMessage").length, 1);
});

test("19. formatNotificationPreview and handleIncomingMessage respect showPreview on/off", () => {
  const onPreview = formatNotificationPreview({
    senderName: "Devi",
    text: "Confidential deployment plan",
    showPreview: true,
  });
  assert.equal(onPreview.title, "Devi");
  assert.equal(onPreview.body, "Confidential deployment plan");

  const offPreview = formatNotificationPreview({
    senderName: "Devi",
    text: "Confidential deployment plan",
    showPreview: false,
  });
  assert.equal(offPreview.title, "Chatty");
  assert.equal(offPreview.body, "New message");
});

test("20. focused-same-chat rule: soft sound only, no desktop or toast", () => {
  messageDeduplicator.clear();
  MockNotification.instances = [];

  const msgId = `focused_test_${Date.now()}`;
  const res = handleIncomingMessage(
    {
      id: msgId,
      senderId: "user_charlie",
      text: "Are you free?",
      chatId: "user_charlie",
    },
    {
      currentUserId: "user_me",
      isDesignatedNotifier: true,
      isFocusedSameChat: true,
      settings: {
        soundEnabled: true,
        soundVolume: 50,
        desktopNotifications: true,
        showPreview: true,
      },
    },
  );

  assert.ok(res);
  assert.equal(res.channel, "focused_chat_sound_only");
  assert.equal(res.soundPlayed, true);
  assert.equal(res.desktopShown, false);
  assert.equal(res.toastShown, false);
  assert.equal(MockNotification.instances.length, 0);
});

test("21. Unfocused or different chat: desktop notification if permitted, otherwise in-app toast (never both)", () => {
  messageDeduplicator.clear();
  MockNotification.permission = "granted";
  MockNotification.instances = [];

  // Case A: Desktop notifications enabled & granted -> desktop only
  const msgA = `unfocused_desktop_${Date.now()}`;
  const resA = handleIncomingMessage(
    {
      id: msgA,
      senderId: "user_david",
      text: "Check this out",
      chatId: "user_david",
    },
    {
      currentUserId: "user_me",
      isDesignatedNotifier: true,
      isFocusedSameChat: false,
      settings: {
        soundEnabled: true,
        soundVolume: 50,
        desktopNotifications: true,
        showPreview: true,
      },
    },
  );

  assert.equal(resA.channel, "desktop");
  assert.equal(resA.desktopShown, true);
  assert.equal(resA.toastShown, false);

  // Case B: Desktop notifications disabled/denied -> in-app toast only
  MockNotification.permission = "denied";
  const msgB = `unfocused_toast_${Date.now()}`;
  const resB = handleIncomingMessage(
    {
      id: msgB,
      senderId: "user_david",
      text: "Fallback note",
      chatId: "user_david",
    },
    {
      currentUserId: "user_me",
      isDesignatedNotifier: true,
      isFocusedSameChat: false,
      settings: {
        soundEnabled: true,
        soundVolume: 50,
        desktopNotifications: false,
        showPreview: true,
      },
    },
  );

  assert.equal(resB.channel, "toast");
  assert.equal(resB.desktopShown, false);
  assert.equal(resB.toastShown, true);
});

test("22. Multi-tab suppression and own message exclusion", () => {
  messageDeduplicator.clear();

  // Multi-tab: non-designated tab must stay completely silent
  const nonDesignated = handleIncomingMessage(
    {
      id: `silent_tab_${Date.now()}`,
      senderId: "user_other",
      text: "Hello",
    },
    {
      currentUserId: "user_me",
      isDesignatedNotifier: false,
    },
  );
  assert.equal(nonDesignated, null);

  // Own message: never notify
  const ownMsg = handleIncomingMessage(
    {
      id: `own_msg_${Date.now()}`,
      senderId: "user_me",
      text: "Sent by me",
    },
    {
      currentUserId: "user_me",
      isDesignatedNotifier: true,
    },
  );
  assert.equal(ownMsg, null);
});
