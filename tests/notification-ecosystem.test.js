import test from "node:test";
import assert from "node:assert/strict";

// Setup browser globals mock
class MockNotification {
  static permission = "granted";
  static requestPermission = async () => MockNotification.permission;
  constructor(title, options) {
    this.title = title;
    this.options = options;
    MockNotification.instances.push(this);
  }
}
MockNotification.instances = [];

let vibrateCalls = [];
globalThis.navigator = {
  vibrate: (pattern) => {
    vibrateCalls.push(pattern);
    return true;
  },
};

globalThis.document = {
  head: { appendChild: () => ({}) },
  createElement: () => ({ appendChild: () => {} }),
  querySelector: () => null,
  hasFocus: () => true,
  hidden: false,
};

globalThis.window = {
  document: globalThis.document,
  navigator: globalThis.navigator,
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
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; },
};

const {
  formatNotificationPreview,
  triggerVibration,
  playMessageSound,
} = await import("../src/services/notificationService.js");

const {
  useNotificationSettingsStore,
  NOTIFICATION_SETTINGS_DEFAULTS,
  NOTIFICATION_PREFERENCES_DEFAULTS,
} = await import("../src/store/useNotificationSettingsStore.js");

const {
  useNotificationStore,
} = await import("../src/store/useNotificationStore.js");

test("1. Settings Store defaults include all advanced notification ecosystem fields", () => {
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.masterEnabled, true);
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.inAppNotifications, true);
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.pushNotifications, true);
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.previewPrivacy, "full");
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.vibrationEnabled, true);
  assert.equal(NOTIFICATION_SETTINGS_DEFAULTS.ringtone, "default");

  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.masterEnabled, true);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.storiesReplies, true);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.storiesReactions, true);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.storiesMentions, true);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.storiesFavorites, true);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.quietHoursEnabled, false);
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.quietHoursStart, "22:00");
  assert.equal(NOTIFICATION_PREFERENCES_DEFAULTS.quietHoursEnd, "08:00");
  assert.deepEqual(NOTIFICATION_PREFERENCES_DEFAULTS.quietHoursDays, [0, 1, 2, 3, 4, 5, 6]);
});

test("2. Settings Store initFromUser correctly merges user notification preferences", () => {
  const store = useNotificationSettingsStore.getState();
  store.initFromUser({
    notificationSettings: {
      previewPrivacy: "sender_only",
      soundVolume: 75,
      vibrationEnabled: false,
    },
    notificationPreferences: {
      storiesFavorites: false,
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "07:00",
    },
  });

  const updatedSettings = useNotificationSettingsStore.getState().settings;
  const updatedPrefs = useNotificationSettingsStore.getState().preferences;

  assert.equal(updatedSettings.previewPrivacy, "sender_only");
  assert.equal(updatedSettings.soundVolume, 75);
  assert.equal(updatedSettings.vibrationEnabled, false);

  assert.equal(updatedPrefs.storiesFavorites, false);
  assert.equal(updatedPrefs.quietHoursEnabled, true);
  assert.equal(updatedPrefs.quietHoursStart, "23:00");
  assert.equal(updatedPrefs.quietHoursEnd, "07:00");

  // Reset store
  store.resetSettings();
});

test("3. formatNotificationPreview respects all previewPrivacy settings", () => {
  // Full preview
  const full = formatNotificationPreview({
    senderName: "Alice",
    text: "Confidential report ready",
    previewPrivacy: "full",
  });
  assert.equal(full.title, "Alice");
  assert.equal(full.body, "Confidential report ready");

  // Sender only preview
  const senderOnly = formatNotificationPreview({
    senderName: "Alice",
    text: "Confidential report ready",
    previewPrivacy: "sender_only",
  });
  assert.equal(senderOnly.title, "Alice");
  assert.equal(senderOnly.body, "New message");

  // Hidden preview
  const hidden = formatNotificationPreview({
    senderName: "Alice",
    text: "Confidential report ready",
    previewPrivacy: "hidden",
  });
  assert.equal(hidden.title, "Chatty");
  assert.equal(hidden.body, "New notification");

  // showPreview: false
  const noPreview = formatNotificationPreview({
    senderName: "Alice",
    text: "Confidential report ready",
    showPreview: false,
  });
  assert.equal(noPreview.title, "Chatty");
  assert.equal(noPreview.body, "New message");
});

test("4. triggerVibration successfully invokes navigator.vibrate with pattern", () => {
  vibrateCalls = [];
  triggerVibration([300, 100, 300]);
  assert.equal(vibrateCalls.length, 1);
  assert.deepEqual(vibrateCalls[0], [300, 100, 300]);
});

test("5. Notification Store manages categoryCounts including story category", () => {
  const store = useNotificationStore.getState();
  assert.ok("story" in store.categoryCounts, "story category must exist in categoryCounts");
  assert.equal(typeof store.categoryCounts.story, "number");
});

test("6. Notification Store markAsUnread and clearReadNotifications operate properly", () => {
  useNotificationStore.setState({
    notifications: [
      { id: "notif-1", category: "story", isRead: true, title: "Alice reacted to your story" },
      { id: "notif-2", category: "message", isRead: false, title: "Bob sent a message" },
    ],
    unreadCount: 1,
    categoryCounts: {
      message: 1,
      group: 0,
      call: 0,
      contact: 0,
      story: 0,
      security: 0,
      system: 0,
    },
  });

  // Mark notif-1 as unread
  useNotificationStore.getState().markAsUnread("notif-1");
  let state = useNotificationStore.getState();

  assert.equal(state.unreadCount, 2);
  assert.equal(state.categoryCounts.story, 1);
  const notif1 = state.notifications.find((n) => n.id === "notif-1");
  assert.equal(notif1.isRead, false);

  // Mark notif-1 as read
  useNotificationStore.getState().markAsRead("notif-1");
  state = useNotificationStore.getState();
  assert.equal(state.unreadCount, 1);
  assert.equal(state.categoryCounts.story, 0);

  // Clear read notifications
  useNotificationStore.getState().clearReadNotifications();
  state = useNotificationStore.getState();
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].id, "notif-2");
});

test("7. Notification Store bindSocketEvents listens for notification:unread", () => {
  const listeners = {};
  const mockSocket = {
    on: (evt, fn) => { listeners[evt] = fn; },
    off: (evt) => { delete listeners[evt]; },
  };

  useNotificationStore.getState().bindSocketEvents(mockSocket);

  assert.ok(typeof listeners["notification:unread"] === "function");
  assert.ok(typeof listeners["notification:new"] === "function");
  assert.ok(typeof listeners["notification:read"] === "function");
});
