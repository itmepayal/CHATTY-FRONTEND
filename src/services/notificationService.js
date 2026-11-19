import { customToast } from "../components/toast/customToastService.js";
import {
  useNotificationSettingsStore,
  NOTIFICATION_SETTINGS_DEFAULTS,
} from "../store/useNotificationSettingsStore.js";
import { useAppLockStore } from "../store/useAppLockStore.js";
import { useChatLockStore } from "../store/useChatLockStore.js";
import soundService from "./soundService.js";

export class MessageDeduplicator {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    this.ids = new Set();
    this.queue = [];
  }

  has(id) {
    if (!id) return false;
    return this.ids.has(String(id));
  }

  add(id) {
    if (!id) return;
    const str = String(id);
    if (this.ids.has(str)) return;
    this.ids.add(str);
    this.queue.push(str);
    if (this.queue.length > this.maxSize) {
      const oldest = this.queue.shift();
      this.ids.delete(oldest);
    }
  }

  clear() {
    this.ids.clear();
    this.queue = [];
  }
}

export const messageDeduplicator = new MessageDeduplicator(200);

// In-memory cache of recently handled action keys
const handledActionKeys = new Map();
const NOTIFICATION_DEDUP_WINDOW_MS = 15000;
const SOUND_THROTTLE_MS = 1000;

let lastSoundPlayedAt = 0;
let cachedAudioElement = null;

// Multi-tab coordination constants and state
export const TAB_ID =
  "tab_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
const LEADER_KEY = "chatty_notification_leader";
const FOCUSED_KEY = "chatty_notification_focused_tab";
const HEARTBEAT_INTERVAL_MS = 1500;
const LEADER_EXPIRY_MS = 3500;
const FOCUSED_EXPIRY_MS = 3000;

let isLeader = false;
let leaderCheckTimer = null;
let broadcastChannel = null;

// Initialize BroadcastChannel
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel("chatty_notification_coordinator");
    broadcastChannel.onmessage = (event) => {
      const { type, messageId, tabId } = event.data || {};
      if (type === "MESSAGE_NOTIFIED" && messageId) {
        messageDeduplicator.add(messageId);
      } else if (
        messageId &&
        (type === "notification_claimed" || type === "sound_claimed")
      ) {
        handledActionKeys.set(`${type}:${messageId}`, Date.now());
      } else if (type === "LEADER_CLAIMED" && tabId !== TAB_ID) {
        isLeader = false;
      } else if (type === "LEADER_RESIGNED" && tabId !== TAB_ID) {
        checkLeadership();
      }
    };
  }
} catch (e) {
  // BroadcastChannel not available in environment
}

// Clean up expired action keys periodically
if (typeof window !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of handledActionKeys.entries()) {
      if (now - ts > NOTIFICATION_DEDUP_WINDOW_MS) {
        handledActionKeys.delete(key);
      }
    }
  }, 10000);
  cleanupTimer?.unref?.();
}

// Leader election & heartbeat check
export const checkLeadership = () => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    isLeader = true;
    return true;
  }

  const now = Date.now();
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    if (!raw) {
      localStorage.setItem(
        LEADER_KEY,
        JSON.stringify({ tabId: TAB_ID, heartbeat: now }),
      );
      isLeader = true;
      try {
        broadcastChannel?.postMessage?.({
          type: "LEADER_CLAIMED",
          tabId: TAB_ID,
        });
      } catch {}
      return true;
    }

    const current = JSON.parse(raw);
    if (current.tabId === TAB_ID) {
      localStorage.setItem(
        LEADER_KEY,
        JSON.stringify({ tabId: TAB_ID, heartbeat: now }),
      );
      isLeader = true;
      return true;
    }

    if (now - (current.heartbeat || 0) > LEADER_EXPIRY_MS) {
      localStorage.setItem(
        LEADER_KEY,
        JSON.stringify({ tabId: TAB_ID, heartbeat: now }),
      );
      isLeader = true;
      try {
        broadcastChannel?.postMessage?.({
          type: "LEADER_CLAIMED",
          tabId: TAB_ID,
        });
      } catch {}
      return true;
    }

    isLeader = false;
    return false;
  } catch {
    isLeader = true;
    return true;
  }
};

// Start leader heartbeat & window event listeners
if (typeof window !== "undefined") {
  checkLeadership();
  leaderCheckTimer = setInterval(checkLeadership, HEARTBEAT_INTERVAL_MS);
  leaderCheckTimer?.unref?.();

  const updateFocus = (focused) => {
    try {
      if (typeof localStorage !== "undefined") {
        if (focused) {
          localStorage.setItem(
            FOCUSED_KEY,
            JSON.stringify({ tabId: TAB_ID, ts: Date.now() }),
          );
        } else {
          const current = localStorage.getItem(FOCUSED_KEY);
          if (current) {
            const parsed = JSON.parse(current);
            if (parsed.tabId === TAB_ID) {
              localStorage.removeItem(FOCUSED_KEY);
            }
          }
        }
      }
    } catch {}
  };

  if (typeof window.addEventListener === "function") {
    window.addEventListener("focus", () => updateFocus(true));
    window.addEventListener("blur", () => updateFocus(false));
  }
  if (
    typeof document !== "undefined" &&
    typeof document.addEventListener === "function"
  ) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        updateFocus(false);
      } else if (
        typeof document.hasFocus === "function" &&
        document.hasFocus()
      ) {
        updateFocus(true);
      }
    });
  }

  if (typeof window.addEventListener === "function") {
    window.addEventListener("beforeunload", () => {
      try {
        if (isLeader && typeof localStorage !== "undefined") {
          localStorage.removeItem(LEADER_KEY);
          broadcastChannel?.postMessage?.({
            type: "LEADER_RESIGNED",
            tabId: TAB_ID,
          });
        }
      } catch {}
    });
  }
}

/**
 * Checks if this tab is currently the designated tab responsible for notifying.
 * Rule: Focused tab has priority; if no tab is focused, the leader tab notifies.
 */
export const isDesignatedNotifierTab = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return true; // Test/Node default
  }

  // 1. If this tab has document focus, it is the designated tab
  const hasFocus =
    typeof document.hasFocus === "function" ? document.hasFocus() : false;
  if (hasFocus) {
    return true;
  }

  // 2. If another tab currently has focus, this tab must NOT notify
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(FOCUSED_KEY);
      if (raw) {
        const focused = JSON.parse(raw);
        const now = Date.now();
        if (
          focused.tabId !== TAB_ID &&
          now - (focused.ts || 0) < FOCUSED_EXPIRY_MS
        ) {
          return false;
        }
      }
    }
  } catch {}

  // 3. If no tab has focus, the leader tab notifies
  return isLeader;
};

/**
 * Checks whether an action for messageId was already claimed.
 */
export const claimAction = (actionType, messageId) => {
  if (!messageId) return true;

  const key = `${actionType}:${messageId}`;
  const now = Date.now();

  if (handledActionKeys.has(key)) {
    return false;
  }

  try {
    if (typeof localStorage !== "undefined") {
      const lockKey = `chatty_lock_${key}`;
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        const lockTs = Number(existing);
        if (now - lockTs < NOTIFICATION_DEDUP_WINDOW_MS) {
          handledActionKeys.set(key, lockTs);
          return false;
        }
      }
      localStorage.setItem(lockKey, String(now));
      const timer = setTimeout(() => {
        try {
          localStorage.removeItem(lockKey);
        } catch {}
      }, NOTIFICATION_DEDUP_WINDOW_MS);
      timer?.unref?.();
    }
  } catch {}

  handledActionKeys.set(key, now);

  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: `${actionType}_claimed`,
        messageId,
      });
    }
  } catch {}

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
 * Requests Notification API permission from user gesture.
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
 * Plays a two-tone Web Audio API chime as fallback.
 */
const playWebAudioChime = (volumeFraction) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const masterGain = Math.max(0, Math.min(1, volumeFraction)) * 0.35;
    gainNode.gain.setValueAtTime(masterGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

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
      } catch {}
    };
  } catch (err) {
    console.warn(
      "[notificationService] Web Audio fallback failed:",
      err?.message,
    );
  }
};

/**
 * Plays message chime respecting volume, throttle, mute, and soft chime options.
 */
export const playMessageSound = ({
  volume = 60,
  soundEnabled = true,
  messageId = null,
  isMuted = false,
  isDnd = false,
  force = false,
  soft = false,
} = {}) => {
  if (!force) {
    if (!soundEnabled) return;
    if (isMuted || isDnd) return;

    const now = Date.now();
    if (now - lastSoundPlayedAt < SOUND_THROTTLE_MS) {
      return;
    }

    if (messageId && !claimAction("sound", messageId)) {
      return;
    }

    lastSoundPlayedAt = now;
  }

  const baseFraction = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;
  const volumeFraction = baseFraction * (soft ? 0.35 : 1.0);
  if (volumeFraction <= 0) return;

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

  let previewText = typeof text === "string" ? text.trim() : "";
  if (!previewText) {
    if (messageType === "image" || hasImage) previewText = "📷 Photo";
    else if (messageType === "video" || hasVideo) previewText = "📹 Video";
    else if (messageType === "audio" || hasAudio)
      previewText = "🎤 Voice message";
    else if (messageType === "file" || hasFile) previewText = "📎 File";
    else if (messageType === "location" || hasLocation)
      previewText = "📍 Location";
    else previewText = "New message";
  }

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
 * Uses tag: chat-${chatId} with renotify: false to collapse multiple messages.
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

    if (messageId && !claimAction("notification", messageId)) {
      return null;
    }
  }

  const isAppLocked = Boolean(useAppLockStore.getState?.().isLocked);
  const isTargetChatLocked = Boolean(
    chatId && useChatLockStore.getState?.().isChatLocked?.(chatId),
  );
  const isLocked = isAppLocked || isTargetChatLocked;

  let title, body, iconUrl, tag;
  if (isLocked) {
    title = "New message";
    body = "You have a new message";
    iconUrl = "/chatty-favicon.png";
    tag = "chatty-locked-message";
  } else {
    const preview = formatNotificationPreview({
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
    title = preview.title;
    body = preview.body;
    iconUrl =
      avatar && avatar.startsWith("http") ? avatar : "/chatty-favicon.png";
    tag = `chat-${chatId || "general"}`;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl,
      badge: "/chatty-favicon.png",
      tag,
      renotify: false, // Collapse repeats from same chat without re-alerting
      silent: true, // Audio chime is managed independently by playMessageSound
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {}

      if (!isLocked && typeof onNotificationClick === "function") {
        onNotificationClick(chatId);
      }

      notification.close();
    };

    return notification;
  } catch (err) {
    console.error(
      "[notificationService] Notification constructor failed:",
      err,
    );
    return null;
  }
};

/**
 * SINGLE SOURCE OF TRUTH:
 * Handles incoming messages across direct and group chats.
 * Manages deduplication, multi-tab coordination, sound playback,
 * native desktop notifications, and fallback in-app toasts.
 */
export const handleIncomingMessage = (message, options = {}) => {
  if (!message) return null;

  // 1. Extract unique message ID
  const msgId = String(message.id || message._id || message.clientId || "");
  if (!msgId) return null;

  // 2. Ignore non-message events (edits, reactions, system updates)
  if (message.isEdited || message.isReaction || message.type === "system") {
    return null;
  }

  // 3. Never notify for current user's own messages
  const currentUserId = options.currentUserId || message.currentUserId;
  const senderId = String(
    message.senderId || message.sender?._id || message.sender?.id || "",
  );
  if (currentUserId && senderId && String(currentUserId) === String(senderId)) {
    return null;
  }

  // 4. Message ID deduplication (Set/LRU of last 200 IDs)
  if (messageDeduplicator.has(msgId)) {
    return null;
  }
  messageDeduplicator.add(msgId);

  // Broadcast to other tabs that this message was notified
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: "MESSAGE_NOTIFIED",
        messageId: msgId,
      });
    }
  } catch {}

  // 5. Multi-tab coordination:
  // Exactly ONE tab (the focused one, otherwise the leader tab) notifies. Other tabs stay silent.
  const designated =
    typeof options.isDesignatedNotifier === "boolean"
      ? options.isDesignatedNotifier
      : isDesignatedNotifierTab();

  if (!designated) {
    return null;
  }

  const settings =
    options.settings ||
    useNotificationSettingsStore.getState()?.settings ||
    NOTIFICATION_SETTINGS_DEFAULTS;

  const isFocusedSameChat = Boolean(
    options.isFocusedSameChat !== undefined
      ? options.isFocusedSameChat
      : message.isFocusedSameChat,
  );

  const result = {
    messageId: msgId,
    soundPlayed: false,
    desktopShown: false,
    toastShown: false,
    channel: null,
  };

  if (settings.soundEnabled) {
    playMessageSound({
      volume: settings.soundVolume,
      soundEnabled: true,
      messageId: msgId,
      soft: isFocusedSameChat,
    });
    result.soundPlayed = true;
  }

  // 9. Visual notification channel decision:
  // - If focused on same chat: no desktop notification, no in-app toast
  if (isFocusedSameChat) {
    result.channel = "focused_chat_sound_only";
    return result;
  }

  // - If tab is hidden/unfocused or different chat:
  // Show ONE desktop notification if enabled & granted, otherwise ONE in-app toast. Never both.
  const permission = getPermissionState();
  const canShowDesktop =
    settings.desktopNotifications && permission === "granted";

  const chatId = String(
    message.chatId || message.groupId || senderId || "general",
  );
  const isAppLocked = Boolean(useAppLockStore.getState?.().isLocked);
  const isTargetChatLocked = Boolean(
    chatId && useChatLockStore.getState?.().isChatLocked?.(chatId),
  );
  const isLocked =
    isAppLocked || isTargetChatLocked || Boolean(message.isLocked);

  const senderName = isLocked
    ? "Chatty"
    : message.senderName || message.sender?.fullName || "User";
  const avatar = isLocked ? "" : message.avatar || message.sender?.avatar || "";
  const text = isLocked ? "You have a new message" : message.text;

  if (canShowDesktop) {
    const notif = showDesktopNotification({
      senderName,
      text,
      chatId,
      avatar,
      messageType: isLocked
        ? "text"
        : message.file
          ? "file"
          : message.image
            ? "image"
            : message.video
              ? "video"
              : message.audio
                ? "audio"
                : message.location
                  ? "location"
                  : "text",
      hasImage: isLocked ? false : Boolean(message.image?.url || message.image),
      hasVideo: isLocked ? false : Boolean(message.video?.url || message.video),
      hasAudio: isLocked ? false : Boolean(message.audio?.url || message.audio),
      hasFile: isLocked ? false : Boolean(message.file?.url || message.file),
      hasLocation: isLocked ? false : Boolean(message.location?.lat),
      messageId: msgId,
      showPreview: isLocked ? false : settings.showPreview,
      desktopNotifications: true,
      onNotificationClick: isLocked
        ? null
        : options.onNotificationClick || message.onNotificationClick,
    });
    result.desktopShown = Boolean(notif);
    result.channel = "desktop";
  } else {
    // In-app fallback toast
    let title, body;
    if (isLocked) {
      title = "New message";
      body = "You have a new message";
    } else {
      const preview = formatNotificationPreview({
        text: message.text,
        showPreview: settings.showPreview,
        senderName,
        messageType: message.file
          ? "file"
          : message.image
            ? "image"
            : message.video
              ? "video"
              : message.audio
                ? "audio"
                : message.location
                  ? "location"
                  : "text",
        hasImage: Boolean(message.image?.url || message.image),
        hasVideo: Boolean(message.video?.url || message.video),
        hasAudio: Boolean(message.audio?.url || message.audio),
        hasFile: Boolean(message.file?.url || message.file),
        hasLocation: Boolean(message.location?.lat),
      });
      title = preview.title;
      body = preview.body;
    }

    try {
      customToast(body, {
        title,
        duration: 4000,
        id: `toast-${msgId}`,
      });
      result.toastShown = true;
      result.channel = "toast";
    } catch (err) {
      console.warn("[notificationService] In-app toast failed:", err?.message);
    }
  }

  return result;
};

export { soundService };

export default {
  handleIncomingMessage,
  getPermissionState,
  requestPermission,
  playMessageSound,
  showDesktopNotification,
  formatNotificationPreview,
  claimAction,
  isDesignatedNotifierTab,
  messageDeduplicator,
  soundService,
};
