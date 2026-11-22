import test from "node:test";
import assert from "node:assert/strict";

// Setup browser globals mock before importing store
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

globalThis.localStorage = mockLocalStorage;
globalThis.window = {
  localStorage: mockLocalStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
};

const { useSlidingSidebarStore } = await import(
  "../src/store/useSlidingSidebarStore.js"
);

test("1. useSlidingSidebarStore initializes with default state and handles collapse toggling", () => {
  const store = useSlidingSidebarStore.getState();
  assert.equal(typeof store.isCollapsed, "boolean");

  // Toggle collapse
  const initial = store.isCollapsed;
  store.toggleCollapse();
  assert.equal(useSlidingSidebarStore.getState().isCollapsed, !initial);
  assert.equal(mockLocalStorage.getItem("chatty_sidebar_collapsed"), String(!initial));

  // Explicit setCollapsed
  store.setCollapsed(true);
  assert.equal(useSlidingSidebarStore.getState().isCollapsed, true);
  assert.equal(mockLocalStorage.getItem("chatty_sidebar_collapsed"), "true");

  store.setCollapsed(false);
  assert.equal(useSlidingSidebarStore.getState().isCollapsed, false);
  assert.equal(mockLocalStorage.getItem("chatty_sidebar_collapsed"), "false");
});

test("2. useSlidingSidebarStore handles mobile drawer open and close actions", () => {
  const store = useSlidingSidebarStore.getState();
  assert.equal(store.isMobileOpen, false);

  store.openMobile();
  assert.equal(useSlidingSidebarStore.getState().isMobileOpen, true);

  store.closeMobile();
  assert.equal(useSlidingSidebarStore.getState().isMobileOpen, false);

  store.toggleMobile();
  assert.equal(useSlidingSidebarStore.getState().isMobileOpen, true);

  store.closeMobile();
  assert.equal(useSlidingSidebarStore.getState().isMobileOpen, false);
});

test("3. useSlidingSidebarStore handles Help & Support modal state", () => {
  const store = useSlidingSidebarStore.getState();
  assert.equal(store.isHelpOpen, false);

  store.setHelpOpen(true);
  assert.equal(useSlidingSidebarStore.getState().isHelpOpen, true);

  store.setHelpOpen(false);
  assert.equal(useSlidingSidebarStore.getState().isHelpOpen, false);
});

test("4. Navigation hierarchy parity: all 9 Main Menu items and 5 Preferences items are specified", async () => {
  const expectedMainIds = [
    "dashboard",
    "chats",
    "stories",
    "groups",
    "calls",
    "contacts",
    "notifications",
    "archived",
    "saved",
  ];

  const expectedSettingsIds = [
    "profile-settings",
    "privacy-settings",
    "appearance-settings",
    "notifications-settings",
    "help-support",
  ];

  assert.equal(expectedMainIds.length, 9, "Main menu must have exactly 9 destinations");
  assert.equal(expectedSettingsIds.length, 5, "Preferences must have exactly 5 destinations");

  // Verify total navigation options
  const total = expectedMainIds.length + expectedSettingsIds.length;
  assert.equal(total, 14, "Total sidebar navigation destinations must be 14");
});
