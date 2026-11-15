/**
 * DOB Formatting & Validation Utilities
 * Guarantees zero timezone offset shifting and validates year boundaries.
 */

/**
 * Format DOB value to human-readable string (e.g. "31 December 1999").
 * Returns "Not provided" for missing, null, or invalid dates.
 *
 * @param {string|Date|null|undefined} v
 * @returns {string}
 */
export function formatDob(v) {
  if (!v) return "Not provided";

  let year = null;
  let month = null;
  let day = null;

  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return "Not provided";

    // 1. Try ISO date format YYYY-MM-DD (e.g. 1999-12-31 or 1999-12-31T00:00:00.000Z)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      // 2. Fallback to generic Date parse
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) return "Not provided";
      year = parsed.getUTCFullYear();
      month = parsed.getUTCMonth() + 1;
      day = parsed.getUTCDate();
    }
  } else if (v instanceof Date && !Number.isNaN(v.getTime())) {
    year = v.getUTCFullYear();
    month = v.getUTCMonth() + 1;
    day = v.getUTCDate();
  } else {
    return "Not provided";
  }

  const currentYear = new Date().getFullYear();
  if (
    !year ||
    year < 1900 ||
    year > currentYear ||
    !month ||
    month < 1 ||
    month > 12 ||
    !day ||
    day < 1 ||
    day > 31
  ) {
    return "Not provided";
  }

  // Build UTC date so local client timezone cannot shift day backward/forward
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utcDate.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate);
}

/**
 * Normalizes any valid DOB input into YYYY-MM-DD for HTML input[type="date"].
 *
 * @param {string|Date|null|undefined} v
 * @returns {string}
 */
export function normalizeDobToISO(v) {
  if (!v) return "";

  if (typeof v === "string") {
    const trimmed = v.trim();
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const currentYear = new Date().getFullYear();
      if (y >= 1900 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getUTCFullYear();
      const m = parsed.getUTCMonth() + 1;
      const d = parsed.getUTCDate();
      const currentYear = new Date().getFullYear();
      if (y >= 1900 && y <= currentYear) {
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  } else if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = v.getUTCMonth() + 1;
    const d = v.getUTCDate();
    const currentYear = new Date().getFullYear();
    if (y >= 1900 && y <= currentYear) {
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return "";
}

/**
 * Validates date of birth string.
 *
 * @param {string} v
 * @returns {string} Error message or empty string
 */
export function validateDob(v) {
  if (!v) return "";
  const match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "Invalid date format";

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  const currentYear = new Date().getFullYear();

  if (y < 1900 || y > currentYear) {
    return `Year must be between 1900 and ${currentYear}`;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return "Invalid calendar date";
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return "Invalid date";
  if (date > new Date()) return "Date of birth cannot be in the future";

  return "";
}
