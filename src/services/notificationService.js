/**
 * Notification Service
 * Manages audio chime playback, Web Audio API synthesis fallback,
 * native desktop notifications, and multi-tab notification deduplication.
 */

// In-memory cache of recently notified message IDs to prevent duplicate notifications in this tab
const handledMessageIds = new Map(); // id -> timestamp
const NOTIFICATION_DEDUP_WINDOW_MS = 15000;
const SOUND_THROTTLE_MS = 1000;

let lastSoundPlayedAt = 0;
let cachedAudioElement = null;

// Multi-tab coordination via BroadcastChannel
let broadcastChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel("chatty_notification_coordinator");
    broadcastChannel.onmessage = (event) => {
      const { type, messageId } = event.data || {};
      if (messageId && (type === "notification_claimed" || type === "sound_claimed")) {
        handledMessageIds.set(`${type}:${messageId}`, Date.now());
      }
    };
  }
} catch (e) {
  console.warn("[notificationService] BroadcastChannel not supported:", e?.message);
}

// Clean up expired entries periodically
if (typeof window !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of handledMessageIds.entries()) {
      if (now - ts > NOTIFICATION_DEDUP_WINDOW_MS) {
        handledMessageIds.delete(key);
      }
    }
  }, 10000);
  cleanupTimer?.unref?.();
}

/**
 * Checks whether an action (notification or sound) for this messageId was already claimed.
 * Uses in-memory Map, BroadcastChannel, and short-lived localStorage timestamp locks.
 */
export const claimAction = (actionType, messageId) => {
  if (!messageId) return true; // Cannot deduplicate without an ID, proceed

  const key = `${actionType}:${messageId}`;
  const now = Date.now();

  // 1. Check in-memory Map for this tab
  if (handledMessageIds.has(key)) {
    return false;
  }

  // 2. Check localStorage cross-tab lock fallback
  try {
    if (typeof localStorage !== "undefined") {
      const lockKey = `chatty_lock_${key}`;
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        const lockTs = Number(existing);
        if (now - lockTs < NOTIFICATION_DEDUP_WINDOW_MS) {
          handledMessageIds.set(key, lockTs);
          return false;
        }
      }
      localStorage.setItem(lockKey, String(now));
      const timer = setTimeout(() => {
        try {
          localStorage.removeItem(lockKey);
        } catch {
          /* ignore */
        }
      }, NOTIFICATION_DEDUP_WINDOW_MS);
      timer?.unref?.();
    }
  } catch {
    /* ignore */
  }

  // 3. Mark as claimed in this tab
  handledMessageIds.set(key, now);

  // 4. Notify other tabs via BroadcastChannel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: `${actionType}_claimed`,
        messageId,
      });
    }
  } catch {
    /* ignore */
  }

  return true;
};

/**
 * Detects browser Notification API permission state.
 * Returns: "granted" | "denied" | "default" | "unsupported"
 */
export const getPermissionState = () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
};

/**
 * Requests Notification API permission from direct user interaction.
 */
export const requestPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("[notificationService] requestPermission error:", err);
    return "denied";
  }
};

/**
 * Plays a clean, pleasant two-tone Web Audio API chime as fallback.
 */
const playWebAudioChime = (volumeFraction) => {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Volume scaling (safe range: 0.0 to 0.4 max master gain)
    const masterGain = Math.max(0, Math.min(1, volumeFraction)) * 0.35;
    gainNode.gain.setValueAtTime(masterGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    // Warm double-bell chime: F#5 (740Hz) followed by B5 (987Hz)
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(740, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(987, now + 0.08);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);

    osc2.onended = () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch (err) {
    console.warn("[notificationService] Web Audio fallback failed:", err?.message);
  }
};

/**
 * Plays message chime respecting volume, throttle, and mute rules.
 */
export const playMessageSound = ({
  volume = 60,
  soundEnabled = true,
  messageId = null,
  isMuted = false,
  isDnd = false,
  force = false,
} = {}) => {
  if (!force) {
    if (!soundEnabled) return;
    if (isMuted || isDnd) return;

    // Throttle check
    const now = Date.now();
    if (now - lastSoundPlayedAt < SOUND_THROTTLE_MS) {
      return;
    }

    // Cross-tab claim: only one tab chimes for a given message
    if (messageId && !claimAction("sound", messageId)) {
      return;
    }

    lastSoundPlayedAt = now;
  }

  const volumeFraction = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;
  if (volumeFraction <= 0) return;

  // Try playing audio file first
  try {
    if (!cachedAudioElement) {
      cachedAudioElement = new Audio("/sounds/message.mp3");
      cachedAudioElement.preload = "auto";
    }

    cachedAudioElement.volume = volumeFraction;
    cachedAudioElement.currentTime = 0;

    const playPromise = cachedAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy or asset failure -> fallback to Web Audio
        playWebAudioChime(volumeFraction);
      });
    }
  } catch {
    playWebAudioChime(volumeFraction);
  }
};

/**
 * Formats notification body preview according to privacy settings and message type.
 */
export const formatNotificationPreview = ({
  text = "",
  showPreview = true,
  senderName = "User",
  messageType = "text",
  hasImage = false,
  hasVideo = false,
  hasAudio = false,
  hasFile = false,
  hasLocation = false,
}) => {
  if (!showPreview) {
    return {
      title: "Chatty",
      body: "New message",
    };
  }

  const title = senderName ? String(senderName).trim() : "Chatty";

  // Media description fallback
  let previewText = typeof text === "string" ? text.trim() : "";
  if (!previewText) {
    if (messageType === "image" || hasImage) previewText = "📷 Photo";
    else if (messageType === "video" || hasVideo) previewText = "📹 Video";
    else if (messageType === "audio" || hasAudio) previewText = "🎤 Voice message";
    else if (messageType === "file" || hasFile) previewText = "📎 File";
    else if (messageType === "location" || hasLocation) previewText = "📍 Location";
    else previewText = "New message";
  }

  // Truncate to ~100 characters safely
  if (previewText.length > 100) {
    previewText = previewText.slice(0, 97) + "…";
  }

  return {
    title,
    body: previewText,
  };
};

/**
 * Triggers a native desktop notification if permitted and eligible.
 */
export const showDesktopNotification = ({
  senderName = "User",
  text = "",
  chatId = "",
  avatar = "",
  messageType = "text",
  hasImage = false,
  hasVideo = false,
  hasAudio = false,
  hasFile = false,
  hasLocation = false,
  messageId = null,
  showPreview = true,
  desktopNotifications = false,
  isMuted = false,
  isDnd = false,
  onNotificationClick = null,
  force = false,
} = {}) => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (!force) {
    if (!desktopNotifications) return null;
    if (Notification.permission !== "granted") return null;
    if (isMuted || isDnd) return null;

    // Cross-tab claim: only one tab produces the desktop notification
    if (messageId && !claimAction("notification", messageId)) {
      return null;
    }
  }

  const { title, body } = formatNotificationPreview({
    text,
    showPreview,
    senderName,
    messageType,
    hasImage,
    hasVideo,
    hasAudio,
    hasFile,
    hasLocation,
  });

  const iconUrl = avatar && avatar.startsWith("http") ? avatar : "/chatty-favicon.png";
  const tag = chatId ? `chatty_chat_${chatId}` : `chatty_msg_${Date.now()}`;

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl,
      badge: "/chatty-favicon.png",
      tag,
      renotify: true,
      silent: true, // Audio chime is managed independently by playMessageSound
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }

      if (typeof onNotificationClick === "function") {
        onNotificationClick(chatId);
      }

      notification.close();
    };

    return notification;
  } catch (err) {
    console.error("[notificationService] Notification constructor failed:", err);
    return null;
  }
};

export default {
  getPermissionState,
  requestPermission,
  playMessageSound,
  showDesktopNotification,
  formatNotificationPreview,
  claimAction,
};
