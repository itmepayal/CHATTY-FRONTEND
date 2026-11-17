const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatTimeStr = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};

/**
 * Parses and formats a raw timestamp into standard text:
 * - Today: "Last seen today at 12:39 pm"
 * - Yesterday: "Last seen yesterday at 12:39 pm"
 * - Older date (same year): "Last seen Nov 12 at 12:39 pm"
 * - Older date (different year): "Last seen Nov 12, 2025 at 12:39 pm"
 * Returns null if missing or invalid.
 */
export const formatLastSeenTimestamp = (value) => {
  if (value === null || value === undefined || value === "") return null;

  let d;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    // If seconds epoch (10 digits) vs milliseconds (13 digits)
    d = value < 10000000000 ? new Date(value * 1000) : new Date(value);
  } else {
    d = new Date(value);
  }

  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const timeStr = formatTimeStr(d);

  // Today
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return `Last seen today at ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();

  // Same year
  if (d.getFullYear() === now.getFullYear()) {
    return `Last seen ${month} ${day} at ${timeStr}`;
  }

  // Different year
  return `Last seen ${month} ${day}, ${d.getFullYear()} at ${timeStr}`;
};

/**
 * Primary helper returning the authoritative last-seen / presence string.
 *
 * @param {Object|string|number|Date} user - User object containing lastSeen or raw timestamp.
 * @param {Object} [options] - Presence and privacy flags.
 * @param {boolean} [options.isOnline] - Whether user is currently online.
 * @param {boolean} [options.isStatusHidden=false] - Whether online status is hidden by privacy rules.
 * @param {boolean} [options.isLoading=false] - Whether data is still loading.
 * @returns {string} Standardized presence string.
 */
export const formatLastSeen = (
  user,
  { isOnline, isStatusHidden = false, isLoading = false } = {},
) => {
  const isDirectTimestamp =
    user instanceof Date ||
    typeof user === "number" ||
    (typeof user === "string" && !Number.isNaN(Date.parse(user)));

  const effectiveOnline =
    isOnline !== undefined ? Boolean(isOnline) : Boolean(user?.isOnline);

  if (effectiveOnline && !isStatusHidden) {
    return "Online";
  }

  if (user === null || user === undefined) {
    return isLoading ? "" : "Last seen information is unavailable";
  }

  if (user?.isLastSeenRestricted) {
    return "Last seen information is unavailable";
  }

  const timestamp = isDirectTimestamp
    ? user
    : (user?.lastSeen ?? user?.presence?.lastSeen);

  if (isLoading && !timestamp) {
    return "";
  }

  if (!timestamp) {
    return "Last seen information is unavailable";
  }

  const formatted = formatLastSeenTimestamp(timestamp);
  return formatted || "Last seen information is unavailable";
};

export const getLastSeenText = formatLastSeen;
export default formatLastSeen;
