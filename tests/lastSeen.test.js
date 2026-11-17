import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTimeStr,
  formatLastSeenTimestamp,
  formatLastSeen,
  getLastSeenText,
} from "../src/lib/lastSeen.js";

test("formatTimeStr formats hours and minutes in 12h lowercase am/pm", () => {
  const d1 = new Date(2026, 10, 15, 12, 39, 0);
  assert.equal(formatTimeStr(d1), "12:39 pm");

  const d2 = new Date(2026, 10, 15, 0, 5, 0);
  assert.equal(formatTimeStr(d2), "12:05 am");

  const d3 = new Date(2026, 10, 15, 9, 7, 0);
  assert.equal(formatTimeStr(d3), "9:07 am");

  const d4 = new Date(2026, 10, 15, 23, 59, 0);
  assert.equal(formatTimeStr(d4), "11:59 pm");
});

test("formatLastSeenTimestamp handles today correctly", () => {
  const now = new Date();
  now.setHours(12, 39, 0, 0);
  const result = formatLastSeenTimestamp(now);
  assert.equal(result, "Last seen today at 12:39 pm");
});

test("formatLastSeenTimestamp handles yesterday correctly", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(14, 15, 0, 0);
  const result = formatLastSeenTimestamp(yesterday);
  assert.equal(result, "Last seen yesterday at 2:15 pm");
});

test("formatLastSeenTimestamp handles older date in same year", () => {
  const now = new Date();
  const past = new Date(now.getFullYear(), 10, 12, 12, 39, 0);
  if (Math.abs(now.getDate() - 12) > 1) {
    const result = formatLastSeenTimestamp(past);
    assert.equal(result, "Last seen Nov 12 at 12:39 pm");
  }
});

test("formatLastSeenTimestamp handles older date in previous year", () => {
  const pastYear = new Date(2024, 10, 12, 12, 39, 0);
  const result = formatLastSeenTimestamp(pastYear);
  assert.equal(result, "Last seen Nov 12, 2024 at 12:39 pm");
});

test("formatLastSeenTimestamp returns null for missing or invalid inputs", () => {
  assert.equal(formatLastSeenTimestamp(null), null);
  assert.equal(formatLastSeenTimestamp(undefined), null);
  assert.equal(formatLastSeenTimestamp(""), null);
  assert.equal(formatLastSeenTimestamp("not-a-date"), null);
});

test("formatLastSeenTimestamp handles epoch milliseconds and seconds numbers", () => {
  const now = new Date();
  now.setHours(12, 39, 0, 0);
  const ms = now.getTime();
  assert.equal(formatLastSeenTimestamp(ms), "Last seen today at 12:39 pm");

  const sec = Math.floor(ms / 1000);
  assert.equal(formatLastSeenTimestamp(sec), "Last seen today at 12:39 pm");
});

test("formatLastSeen returns Online when user is online", () => {
  const user = { lastSeen: new Date().toISOString() };
  assert.equal(formatLastSeen(user, { isOnline: true }), "Online");
  assert.equal(formatLastSeen({ isOnline: true, lastSeen: new Date().toISOString() }), "Online");
});

test("formatLastSeen handles today timestamp correctly", () => {
  const now = new Date();
  now.setHours(15, 34, 0, 0);
  const user = { lastSeen: now.toISOString() };
  assert.equal(formatLastSeen(user), "Last seen today at 3:34 pm");
});

test("formatLastSeen handles yesterday timestamp correctly", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(15, 9, 0, 0);
  const user = { lastSeen: yesterday.toISOString() };
  assert.equal(formatLastSeen(user), "Last seen yesterday at 3:09 pm");
});

test("formatLastSeen handles older date in same year", () => {
  const now = new Date();
  const past = new Date(now.getFullYear(), 10, 12, 12, 39, 0);
  if (Math.abs(now.getDate() - 12) > 1) {
    const user = { lastSeen: past.toISOString() };
    assert.equal(formatLastSeen(user), "Last seen Nov 12 at 12:39 pm");
  }
});

test("formatLastSeen handles older date in previous year", () => {
  const pastYear = new Date(2024, 10, 12, 12, 39, 0);
  const user = { lastSeen: pastYear.toISOString() };
  assert.equal(formatLastSeen(user), "Last seen Nov 12, 2024 at 12:39 pm");
});

test("formatLastSeen returns unavailable when timestamp is missing", () => {
  assert.equal(formatLastSeen({ fullName: "Devi" }), "Last seen information is unavailable");
  assert.equal(formatLastSeen(null), "Last seen information is unavailable");
  assert.equal(formatLastSeen(undefined), "Last seen information is unavailable");
  assert.equal(formatLastSeen({ lastSeen: null }), "Last seen information is unavailable");
});

test("formatLastSeen returns unavailable when timestamp is invalid", () => {
  assert.equal(formatLastSeen({ lastSeen: "not-a-valid-date" }), "Last seen information is unavailable");
});

test("formatLastSeen respects hidden-by-privacy settings", () => {
  const user = {
    lastSeen: new Date().toISOString(),
    isLastSeenRestricted: true,
  };
  assert.equal(formatLastSeen(user), "Last seen information is unavailable");

  const now = new Date();
  assert.equal(
    formatLastSeen(
      { lastSeen: now.toISOString() },
      { isOnline: true, isStatusHidden: true },
    ),
    formatLastSeenTimestamp(now),
  );
});

test("formatLastSeen ignores competing fields and strictly uses canonical lastSeen", () => {
  const stale = new Date();
  stale.setHours(10, 0, 0, 0);
  const canonical = new Date();
  canonical.setHours(15, 34, 0, 0);

  const user = {
    updatedAt: stale.toISOString(),
    lastLogin: stale.toISOString(),
    lastActive: stale.toISOString(),
    lastSeen: canonical.toISOString(),
  };

  assert.equal(formatLastSeen(user), "Last seen today at 3:34 pm");
});

test("formatLastSeen handles isLoading cleanly without displaying unavailable", () => {
  assert.equal(formatLastSeen(null, { isLoading: true }), "");
  assert.equal(formatLastSeen({ fullName: "Devi" }, { isLoading: true }), "");

  const now = new Date();
  now.setHours(15, 34, 0, 0);
  assert.equal(
    formatLastSeen({ lastSeen: now.toISOString() }, { isLoading: true }),
    "Last seen today at 3:34 pm",
  );
});

test("getLastSeenText works as an alias for formatLastSeen", () => {
  assert.equal(getLastSeenText, formatLastSeen);
});
