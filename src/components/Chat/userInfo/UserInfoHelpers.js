const LOCALE = "en-IN";

export const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value, opts) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(LOCALE, opts) : "";
};

export const calcAge = (dob) => {
  const d = parseDate(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
};

export const daysUntilBirthday = (dob) => {
  const d = parseDate(dob);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
};

export const birthdayHint = (days) => {
  if (days === null) return "";
  if (days === 0) return "Today 🎂";
  if (days === 1) return "Tomorrow";
  if (days <= 30) return `In ${days} days`;
  return "";
};

export const localTimeIn = (timeZone, now) => {
  if (!timeZone) return "";
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(now);
  } catch {
    return "";
  }
};

export const prettyLink = (url) => {
  try {
    const u = new URL(url);
    const rest = `${u.pathname}${u.search}`.replace(/^\/$/, "");
    return { host: u.hostname.replace(/^www\./, ""), rest };
  } catch {
    return { host: url, rest: "" };
  }
};

export const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

export const getAvatar = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "";

export const previewLastMessage = (msg) => {
  if (!msg || msg.isDeleted) return "";
  if (msg.isLocked) return "🔒 Locked conversation";
  if (msg.decryptFailed || ((msg.encrypted || msg.e2ee) && !msg.decrypted))
    return "🔒 Encrypted message";
  const text = msg.text?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  if (msg.image?.url) return "📷 Photo";
  return "";
};
