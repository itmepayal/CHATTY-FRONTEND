import test from "node:test";
import assert from "node:assert/strict";
import { formatDob, normalizeDobToISO, validateDob } from "../src/lib/dobUtils.js";

test("formatDob formats standard ISO dates correctly without timezone shift", () => {
  assert.equal(formatDob("1995-05-15"), "May 15, 1995");
  assert.equal(formatDob("2000-12-31"), "December 31, 2000");
  assert.equal(formatDob("1980-01-01"), "January 1, 1980");
});

test("formatDob returns 'Not provided' for missing, null, or invalid values", () => {
  assert.equal(formatDob(null), "Not provided");
  assert.equal(formatDob(undefined), "Not provided");
  assert.equal(formatDob(""), "Not provided");
  assert.equal(formatDob("   "), "Not provided");
  assert.equal(formatDob("not-a-date"), "Not provided");
});

test("formatDob rejects years out of 1900..currentYear range (e.g. year 9)", () => {
  assert.equal(formatDob("0009-12-31"), "Not provided");
  assert.equal(formatDob("1899-12-31"), "Not provided");
  assert.equal(formatDob("2099-12-31"), "Not provided");
});

test("normalizeDobToISO converts valid dates to YYYY-MM-DD", () => {
  assert.equal(normalizeDobToISO("1998-4-5"), "1998-04-05");
  assert.equal(normalizeDobToISO("1998-04-05T00:00:00.000Z"), "1998-04-05");
  assert.equal(normalizeDobToISO(""), "");
  assert.equal(normalizeDobToISO("invalid"), "");
});

test("validateDob validates year range and rejects future dates", () => {
  assert.equal(validateDob("1995-05-15"), "");
  assert.equal(validateDob(""), "");
  assert.match(validateDob("1850-01-01"), /Year must be between/);
  assert.match(validateDob("2050-01-01"), /Year must be between/);
});
