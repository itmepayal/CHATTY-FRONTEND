/**
 * deepLink.js
 * Comprehensive deep linking, protocol handling, and canonical URL utilities for Chatty.
 */

/**
 * Extracts route type and target identifier from diverse URL / protocol formats:
 * - chatty://user/:username or chatty://profile/:username or chatty://:username
 * - web+chatty://user/:username
 * - https://<domain>/user/:username or /u/:username or /profile/:username
 * - /user/:username or /u/:username or /profile/:username
 * - JSON payload: {"type":"chatty_user", "username": "..."}
 * - @username or plain username
 *
 * @param {string|object} input - Raw URL, payload, or deep link string
 * @returns {{ type: 'user', identifier: string, raw: string } | null}
 */
export const parseDeepLink = (input) => {
  if (!input) return null;
  if (typeof input !== "string") {
    if (typeof input === "object") {
      const id =
        input.username || input.id || input._id || input.identifier;
      if (id) {
        return {
          type: "user",
          identifier: String(id).replace(/^@/, "").trim(),
          raw: String(id),
        };
      }
    }
    return null;
  }

  const raw = input.trim();
  if (!raw) return null;

  // 1. JSON payload
  if (raw.startsWith("{")) {
    try {
      const data = JSON.parse(raw);
      const identifier =
        data.username || data.id || data._id || data.identifier;
      if (identifier) {
        return {
          type: "user",
          identifier: String(identifier).replace(/^@/, "").trim(),
          raw,
        };
      }
      if (data.shareUrl) {
        return parseDeepLink(data.shareUrl);
      }
    } catch {}
  }

  // 2. Custom schemes: chatty://user/:username, web+chatty://...
  const schemeMatch = raw.match(/^(?:web\+)?chatty:\/\/(.+)$/i);
  if (schemeMatch) {
    const pathAndQuery = schemeMatch[1].split("?")[0].split("#")[0];
    const segments = pathAndQuery.split("/").filter(Boolean);
    if (
      segments.length >= 2 &&
      ["user", "u", "profile"].includes(segments[0].toLowerCase())
    ) {
      return {
        type: "user",
        identifier: segments[1].replace(/^@/, "").trim(),
        raw,
      };
    }
    if (segments.length >= 1) {
      return {
        type: "user",
        identifier: segments[0].replace(/^@/, "").trim(),
        raw,
      };
    }
  }

  // 3. HTTP / HTTPS web URL
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (
        segments.length >= 2 &&
        ["user", "u", "profile"].includes(segments[0].toLowerCase())
      ) {
        return {
          type: "user",
          identifier: segments[1].replace(/^@/, "").trim(),
          raw,
        };
      }
      if (
        segments.length === 1 &&
        !["login", "register", "chat", "settings", "landing"].includes(
          segments[0].toLowerCase(),
        )
      ) {
        return {
          type: "user",
          identifier: segments[0].replace(/^@/, "").trim(),
          raw,
        };
      }
    } catch {}
  }

  // 4. Relative paths: /user/:username, /profile/:username, /u/:username
  if (raw.startsWith("/")) {
    const pathOnly = raw.split("?")[0].split("#")[0];
    const segments = pathOnly.split("/").filter(Boolean);
    if (
      segments.length >= 2 &&
      ["user", "u", "profile"].includes(segments[0].toLowerCase())
    ) {
      return {
        type: "user",
        identifier: segments[1].replace(/^@/, "").trim(),
        raw,
      };
    }
    if (
      segments.length === 1 &&
      !["login", "register", "chat", "settings", "landing"].includes(
        segments[0].toLowerCase(),
      )
    ) {
      return {
        type: "user",
        identifier: segments[0].replace(/^@/, "").trim(),
        raw,
      };
    }
  }

  // 5. Clean username or direct identifier
  const clean = raw
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .replace(/^@/, "")
    .trim();

  if (clean && !clean.includes(" ") && !clean.includes("/")) {
    return {
      type: "user",
      identifier: clean,
      raw,
    };
  }

  return null;
};

/**
 * Returns the canonical, universally accessible HTTPS profile URL for a user.
 * e.g. "https://chatty-app-sigma.vercel.app/user/itmepayal" or "http://localhost:5173/user/itmepayal"
 */
export const getShareableProfileUrl = (usernameOrId) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const identifier = String(usernameOrId || "")
    .replace(/^@/, "")
    .trim();
  return `${origin}/user/${encodeURIComponent(identifier)}`;
};

/**
 * Returns the custom scheme deep link (backward-compatible).
 * e.g. "chatty://user/itmepayal"
 */
export const getCustomSchemeUrl = (usernameOrId) => {
  const identifier = String(usernameOrId || "")
    .replace(/^@/, "")
    .trim();
  return `chatty://user/${encodeURIComponent(identifier)}`;
};

/**
 * Registers the web protocol handler if supported by browser.
 */
export const registerProtocolHandlerIfSupported = () => {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.registerProtocolHandler === "function"
  ) {
    try {
      const urlTemplate = `${window.location.origin}/user/%s`;
      navigator.registerProtocolHandler("web+chatty", urlTemplate);
    } catch {}
  }
};
