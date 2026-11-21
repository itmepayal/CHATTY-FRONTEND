import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Forward,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  Mic,
  MoreVertical,
  Navigation,
  Paperclip,
  Pencil,
  Phone,
  PhoneMissed,
  Pin,
  PinOff,
  Plus,
  Reply,
  RotateCw,
  Send,
  ShieldCheck,
  Smile,
  SmilePlus,
  Star,
  Trash2,
  Users,
  Video,
  X,
  Bookmark,
  BarChart2,
  Gift,
} from "lucide-react";
import { customToast } from "../toast";
import EmojiPicker from "emoji-picker-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useChatStore } from "../../store/useChatStore";
import { useContactStore } from "../../store/useContactStore";
import { useAuthStore } from "../../store/useAuthStore";
import { CollapseBar, PinnedBanner, Modal } from "../Chat/chatMotionKit.jsx";
import { useAppearanceStore } from "../../store/useAppearanceStore.js";
import { usePrivacyStore } from "../../store/usePrivacyStore.js";
import { useChatPrefsStore } from "../../store/useChatPrefsStore.js";
import { useVisibleOnlineUsers } from "../../hooks/useVisibleOnlineUsers";
import useVoiceRecorder, {
  MAX_VOICE_SECONDS,
} from "../../hooks/useVoiceRecorder";
import { chatStyle, formatTime } from "../../hooks/useApplySettings";
import {
  copyImageLink,
  copyMessageImage,
  copyMessageText,
} from "../../lib/messageActions.js";
// ---- E2EE ----
import { whenE2EEReady } from "../../lib/e2ee.js";
import { displayText } from "../../lib/e2eeMessages.js";
import AiAssist from "../common/AiAssist.jsx";
import E2EENotice from "../common/E2EENotice.jsx";
import ExpandableMessage from "../common/ExpandableMessage.jsx";
import VoiceMessage, { formatDuration } from "./VoiceMessage.jsx";
import VideoRecorderModal from "./VideoRecorderModal.jsx";
// ---- group calls ----
import { useCall } from "../../context/CallContext";
import { useGroupCallStore } from "../../store/useGroupCallStore";
import { useGroupCallHistoryStore } from "../../store/useGroupCallHistoryStore";
import GroupCallBanner from "./GroupCallBanner.jsx";
import GroupChatHeader from "./GroupChatHeader.jsx";
import {
  ScheduleModal,
  ScheduledModal,
} from "../Chat/Common/ScheduleModals.jsx";
import ReactionChips from "../Chat/reactions/ReactionChips.jsx";
import ThreadPanel from "../Chat/thread/ThreadPanel.jsx";
import PollCard from "../Chat/poll/PollCard.jsx";
import CreatePollModal from "../Chat/poll/CreatePollModal.jsx";
import SaveMessageModal from "../Chat/saved/SaveMessageModal.jsx";
import ViewOnceMediaModal from "../Chat/viewOnce/ViewOnceMediaModal.jsx";
import DisappearingSettingsModal from "../Chat/disappearing/DisappearingSettingsModal.jsx";
import { MentionDropdown } from "./mentions/MentionDropdown.jsx";
import GiftPickerModal from "../Chat/gift/GiftPickerModal.jsx";
import GiftMessageBubble from "../Chat/gift/GiftMessageBubble.jsx";
import StoryReplyCard from "../Chat/StoryReplyCard.jsx";

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "🎉", "👏"];

const MENU_W = 208;
const REACT_W = 320;
const REACT_H = 48;
const MAX_PINS = 5;

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;
const MAX_VIDEO_MB = 25; // keep <= your backend multer limit
const MAX_VIDEO_SECONDS = 60; // must match backend MAX_VIDEO_SECONDS

// E2EE: how many automatic "re-decrypt" attempts per group open
const MAX_AUTO_DECRYPT_RETRIES = 2;
const AUTO_DECRYPT_DELAY_MS = 3000;

// ---- LOCATION: live share durations (minutes) ----
const LIVE_DURATIONS = [
  { min: 15, label: "15 min" },
  { min: 60, label: "1 hour" },
  { min: 480, label: "8 hours" },
];

const FILE_ACCEPT = [
  ".pdf,.doc,.docx,.txt,.rtf,.odt",
  ".xls,.xlsx,.csv,.ods",
  ".ppt,.pptx,.odp",
  ".zip,.rar,.7z,.tar,.gz",
  ".json,.xml,.md",
  "audio/*",
  "video/*",
].join(",");

/* ------------------------------------------------------------------ */
/*  Motion presets                                                     */
/* ------------------------------------------------------------------ */
const EASE = [0.22, 1, 0.36, 1];

const popIn = {
  initial: { opacity: 0, scale: 0.92, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
  transition: { duration: 0.16, ease: EASE },
};

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

const modalCard = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.1 } },
  transition: { duration: 0.2, ease: EASE },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const sameId = (a, b) => String(a) === String(b);
const extractActiveMentions = (
  currentText,
  mentionsPool = [],
  groupMembers = [],
  myId = null,
) => {
  if (!currentText || typeof currentText !== "string") return [];
  const active = [];
  const seenIds = new Set();
  const lowerText = currentText.toLowerCase();

  // 1. From selectedMentions pool
  for (const item of mentionsPool) {
    const id = String(item.userId || item.id);
    if (!id || seenIds.has(id)) continue;
    if (myId && id === String(myId)) continue;
    const nameMatch =
      item.name && lowerText.includes(`@${item.name.toLowerCase()}`);
    const userMatch =
      item.username && lowerText.includes(`@${item.username.toLowerCase()}`);
    if (nameMatch || userMatch) {
      seenIds.add(id);
      active.push({
        userId: id,
        name: item.name || item.username,
        username: item.username,
      });
    }
  }

  // 2. Also match group members directly in text (e.g. if typed without clicking dropdown)
  for (const m of groupMembers || []) {
    const id = String(m.id || m._id || m.userId);
    if (!id || seenIds.has(id)) continue;
    if (myId && id === String(myId)) continue;
    const nameMatch =
      m.fullName && lowerText.includes(`@${m.fullName.toLowerCase()}`);
    const userMatch =
      m.username && lowerText.includes(`@${m.username.toLowerCase()}`);
    if (nameMatch || userMatch) {
      seenIds.add(id);
      active.push({
        userId: id,
        name: m.fullName || m.username,
        username: m.username,
      });
    }
  }

  return active;
};
const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";
const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

const sameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const groupReactions = (reactions = [], myId) => {
  const map = new Map();
  reactions.forEach((r) => {
    const item = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    item.count += 1;
    if (sameId(r.userId, myId)) item.mine = true;
    map.set(r.emoji, item);
  });
  return [...map.values()];
};

const isEmojiOnly = (t) => {
  const s = (t || "").replace(/\s/g, "");
  return (
    s.length > 0 &&
    [...s].length <= 6 &&
    /^(\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f)+$/u.test(s)
  );
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  const val = bytes / 1024 ** i;
  return `${val >= 10 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
};

const isImageFile = (f) => Boolean(f?.type?.startsWith("image/"));
const isVideoFile = (f) => Boolean(f?.type?.startsWith("video/"));

const getFileIcon = (mimeType = "", name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  )
    return FileArchive;
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return FileSpreadsheet;
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType.includes("word") ||
    ["pdf", "doc", "docx", "txt", "ppt", "pptx"].includes(ext)
  )
    return FileText;
  return FileIcon;
};

/* ---------------- LOCATION helpers ---------------- */
const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

const osmEmbedUrl = (lat, lng) => {
  const d = 0.004;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${
    lat - d
  }%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
};

// approx. distance in meters (enough to decide "did the pin move?")
const metersBetween = (a, b) => {
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

const timeAgo = (value, now) => {
  if (!value) return "";
  const secs = Math.max(
    0,
    Math.round((now - new Date(value).getTime()) / 1000),
  );
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
};

const clockTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Promise wrapper around the browser GPS (one-time position)
const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err?.code === 1
              ? "Location permission denied. Allow location access in your browser settings."
              : err?.code === 3
                ? "Location request timed out. Try again."
                : "Couldn't get your location.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });

// re-render every `intervalMs` (0 = never)
const useNow = (intervalMs) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};

/* touch device (no hover) detection — phones / tablets */
const useIsTouch = () => {
  const [touch, setTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const onChange = (e) => setTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return touch;
};

/* ---- message flags / menu sizing (pure) ---- */
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FORWARD_TARGETS = 5;

const replyPreviewText = (r) => {
  if (!r || r.missing) return "Original message unavailable";
  if (r.isDeleted) return "This message was deleted";
  if (r.decryptFailed || ((r.encrypted || r.e2ee) && !r.decrypted))
    return "🔒 Encrypted message";
  if (r.gift?.name) return `${r.gift.icon || "🎁"} Gift: ${r.gift.name}`;
  if (r.text) return r.text;
  if (r.image?.url) return "📷 Photo";
  if (r.file?.name) return `📎 ${r.file.name}`;
  if (r.audio?.url) return "🎤 Voice message";
  if (r.video?.url) return "🎥 Video";
  if (Number.isFinite(r.location?.lat)) return "📍 Location";
  return "Message";
};

const resolveGroupReply = (message, list) => {
  const r = message.replyTo;
  if (!r) return null;
  const targetId = typeof r === "object" ? r.id || r._id : r;
  if (!targetId) return null;

  const found = Array.isArray(list)
    ? list.find((m) => sameId(m.id, targetId))
    : null;

  if (found) {
    if (found.isDeleted)
      return { id: targetId, senderId: found.senderId, isDeleted: true };
    const isLocked =
      Boolean(found.decryptFailed) ||
      found.cryptoState === "decrypting" ||
      (Boolean(found.encrypted) && !found.decrypted);
    return {
      ...found,
      id: targetId,
      senderId: found.senderId,
      text: isLocked ? "" : found.text,
      decryptFailed: Boolean(found.decryptFailed),
      isDeleted: false,
    };
  }

  if (typeof r === "object" && r.senderId) {
    if (r.isDeleted) return { id: targetId, isDeleted: true };
    return { ...r, id: targetId };
  }
  return { id: targetId, missing: true };
};

const getFlags = (
  m,
  mine,
  canDM,
  canDA,
  isAdminOrOwner = false,
  canPinSetting = true,
) => {
  const isDeleted = Boolean(m.isDeleted);
  const decryptFailed = !isDeleted && Boolean(m.decryptFailed);
  const isDecrypting =
    !isDeleted &&
    (m.cryptoState === "decrypting" ||
      (Boolean(m.encrypted) && !m.decrypted && !decryptFailed));
  const hasText =
    !isDeleted && !decryptFailed && !isDecrypting && Boolean(m.text);
  const hasAudio = !isDeleted && Boolean(m.audio?.url);
  const hasVideo = !isDeleted && Boolean(m.video?.url);
  const age = m.createdAt
    ? Date.now() - new Date(m.createdAt).getTime()
    : Infinity;

  return {
    isDeleted,
    decryptFailed,
    isDecrypting,
    hasText,
    hasImage: !isDeleted && Boolean(m.image?.url),
    hasFile: !isDeleted && Boolean(m.file?.name),
    hasFileUrl: !isDeleted && Boolean(m.file?.url),
    hasAudio,
    hasVideo,
    hasLocation:
      !isDeleted &&
      Number.isFinite(Number(m.location?.lat)) &&
      Number.isFinite(Number(m.location?.lng)),
    canReply: !isDeleted,
    canForward: !isDeleted && hasText,
    canPin: !isDeleted && (canPinSetting || isAdminOrOwner),
    isPinned: Boolean(m.isPinned),
    canEdit:
      mine &&
      !isDeleted &&
      !decryptFailed &&
      !isDecrypting &&
      hasText &&
      !hasAudio &&
      !hasVideo &&
      age < EDIT_WINDOW_MS,
    canDeleteForMe: !isDeleted,
    canDeleteForAll: !isDeleted && (mine || isAdminOrOwner),
    isStarred: Boolean(m.isStarred),
  };
};

const copyCount = (f) =>
  (f.hasText ? 1 : 0) +
  (f.hasImage ? 2 : 0) +
  (f.hasFileUrl ? 1 : 0) +
  (f.hasAudio ? 1 : 0) +
  (f.hasVideo ? 1 : 0) +
  (f.hasLocation ? 2 : 0);

const menuItemsCount = (f) => {
  const actionItems =
    (f.canReply ? 1 : 0) +
    (f.canForward ? 1 : 0) +
    (!f.isDeleted ? 1 : 0) +
    (f.canPin ? 1 : 0) +
    (f.canEdit ? 1 : 0);
  const copyItems = copyCount(f);
  const deleteItems = (f.canDeleteForMe ? 1 : 0) + (f.canDeleteForAll ? 1 : 0);
  return actionItems + copyItems + deleteItems;
};

const menuHeight = (f) => {
  const actionItems =
    (f.canReply ? 1 : 0) +
    (f.canForward ? 1 : 0) +
    (!f.isDeleted ? 1 : 0) +
    (f.canPin ? 1 : 0) +
    (f.canEdit ? 1 : 0);
  const copyItems = copyCount(f);
  const deleteItems = (f.canDeleteForMe ? 1 : 0) + (f.canDeleteForAll ? 1 : 0);
  const count = actionItems + copyItems + deleteItems;
  const dividers =
    (actionItems > 0 && (copyItems > 0 || deleteItems > 0) ? 1 : 0) +
    (copyItems > 0 && deleteItems > 0 ? 1 : 0);
  return count * 40 + 8 + dividers * 9;
};

const ReplyQuote = ({ reply, isMine, authId, peerName, onClick }) => {
  if (!reply) return null;
  const fromMe = sameId(reply.senderId, authId);
  const name = reply.missing ? "" : fromMe ? "You" : peerName;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={reply.missing}
      whileTap={{ scale: 0.98 }}
      className={`mb-1.5 block w-full min-w-0 max-w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left ${
        isMine
          ? "border-primary-content/70 bg-primary-content/15"
          : "border-primary bg-base-200"
      }`}
    >
      {name && (
        <span className="block truncate text-xs font-semibold">{name}</span>
      )}
      <span
        className={`block truncate text-xs ${
          reply.missing || reply.isDeleted || reply.decryptFailed
            ? "italic opacity-70"
            : "opacity-80"
        }`}
      >
        {replyPreviewText(reply)}
      </span>
    </motion.button>
  );
};

const PinnedMessagesModal = ({
  open,
  onClose,
  pinned = [],
  myId,
  canPin,
  onJump,
  onUnpin,
}) => {
  if (!open) return null;

  return (
    <Modal onClose={onClose} labelId="pinned-modal-title">
      <div className="flex items-center justify-between border-b border-base-300 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pin className="size-4" />
          </div>
          <div>
            <h3 id="pinned-modal-title" className="font-semibold text-sm">
              Pinned Messages
            </h3>
            <p className="text-xs text-base-content/60">
              {pinned.length} pinned message{pinned.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs btn-circle"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-base-content/60">
            <Pin className="size-8 opacity-30 mb-2" />
            <p className="text-sm font-medium">No pinned messages</p>
            <p className="text-xs max-w-xs mt-1">
              Pin important messages so everyone in the group can quickly
              reference them.
            </p>
          </div>
        ) : (
          pinned.map((m) => {
            const senderName =
              m.sender?.fullName ||
              (sameId(m.senderId, myId) ? "You" : "Group Member");
            const pUser = m.pinnedByUser;
            const pinnedByName =
              pUser?.fullName ||
              (sameId(m.pinnedBy, myId) ? "You" : "A member");
            return (
              <div
                key={m.id || m._id}
                className="group rounded-xl border border-base-300 bg-base-100 p-3 hover:border-primary/40 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-xs truncate">
                      {senderName}
                    </span>
                    <span className="text-[11px] text-base-content/50">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onJump(m.id || m._id);
                        onClose();
                      }}
                      className="btn btn-ghost btn-xs text-primary gap-1 px-2"
                      title="Jump to message"
                    >
                      <span className="text-xs">Jump</span>
                      <ExternalLink className="size-3" />
                    </button>
                    {canPin && (
                      <button
                        type="button"
                        onClick={() => onUnpin(m.id || m._id)}
                        className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                        title="Unpin message"
                      >
                        <PinOff className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  onClick={() => {
                    onJump(m.id || m._id);
                    onClose();
                  }}
                  className="cursor-pointer rounded-lg bg-base-200/50 p-2 text-xs text-base-content hover:bg-base-200 transition-colors"
                >
                  <p className="line-clamp-3 whitespace-pre-wrap break-words">
                    {replyPreviewText(m)}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-base-300/40 pt-1.5 text-[11px] text-base-content/50">
                  <span className="flex items-center gap-1">
                    <Pin className="size-3 text-primary" />
                    Pinned by {pinnedByName}
                  </span>
                  {m.pinnedAt && <span>{formatTime(m.pinnedAt)}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex justify-end border-t border-base-300 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-sm btn-ghost"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

const ForwardModal = ({ candidates, myId, onClose, onConfirm }) => {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = candidates.filter(
    (u) =>
      !sameId(u.id, myId) &&
      (u.fullName || "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id) =>
    setSelected((cur) => {
      if (cur.some((x) => sameId(x, id)))
        return cur.filter((x) => !sameId(x, id));
      if (cur.length >= MAX_FORWARD_TARGETS) {
        customToast.error(`You can pick up to ${MAX_FORWARD_TARGETS} chats`);
        return cur;
      }
      return [...cur, id];
    });

  const submit = async () => {
    if (!selected.length) return;
    setBusy(true);
    const ok = await onConfirm(selected);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={onClose} labelId="forward-title">
      <h3 id="forward-title" className="font-semibold">
        Forward to…
      </h3>
      <input
        autoFocus
        className="input input-bordered input-sm mt-3 w-full text-base sm:text-sm"
        placeholder="Search people or groups"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-base-content/60">
            No chats found.
          </p>
        )}
        {filtered.map((u) => {
          const on = selected.some((x) => sameId(x, u.id));
          return (
            <motion.button
              type="button"
              key={u.id}
              onClick={() => toggle(u.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${
                on ? "bg-primary/10" : "hover:bg-base-200"
              }`}
            >
              <img
                src={avatarSrc(u.avatar)}
                alt=""
                className="size-8 rounded-full object-cover border border-base-300"
              />
              <span className="min-w-0 flex-1 truncate text-sm flex items-center gap-1.5">
                <span className="truncate">{u.fullName}</span>
                {u.isGroup && (
                  <span className="badge badge-xs badge-neutral shrink-0">
                    Group
                  </span>
                )}
              </span>
              <span
                className={`grid size-5 place-items-center rounded-full border transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-content"
                    : "border-base-300"
                }`}
              >
                {on && <Check className="size-3" />}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-base-content/60">
          {selected.length}/{MAX_FORWARD_TARGETS} selected
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-sm"
            disabled={!selected.length || busy}
            onClick={submit}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Forward"}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

/* ---- status line under a bubble (pure) ---- */
const renderStatus = (m, mine, seenBy, s, myReadReceipts = true) => {
  if (mine && m.pending) {
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        Sending…
      </span>
    );
  }
  if (mine && m.failed) {
    return (
      <span className="inline-flex items-center gap-1 text-error">
        <AlertCircle className="size-3" />
        Not sent
      </span>
    );
  }

  const time =
    m.createdAt && s.showTimestamps
      ? formatTime(m.createdAt, s.timeFormat)
      : "";
  const edited = m.isEdited && !m.isDeleted;

  const label = (
    <>
      {m.isStarred && <Star className="size-3 text-warning fill-warning" />}
      {edited && <span className="italic">edited</span>}
      {edited && time && <span>·</span>}
      {time}
    </>
  );

  if (!mine || m.isDeleted)
    return <span className="inline-flex items-center gap-1">{label}</span>;

  const showSeen = myReadReceipts !== false && seenBy > 0;

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      {showSeen ? (
        <>
          <CheckCheck className="size-3.5 text-info" aria-label="Seen" />
          <span>Seen by {seenBy}</span>
        </>
      ) : (
        <Check className="size-3.5" aria-label="Sent" />
      )}
    </span>
  );
};

// One row inside the E2EE info modal
const E2EEPoint = ({ icon: Icon, title, text }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
      <Icon className="size-4" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs leading-relaxed text-base-content/60">{text}</p>
    </div>
  </div>
);

// File card inside the chat bubble
const FileAttachment = ({ file, isMine, uploading = false }) => {
  const Icon = getFileIcon(file.mimeType, file.name);
  const canOpen = Boolean(file.url) && !uploading;

  const body = (
    <>
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          isMine ? "bg-primary-content/15" : "bg-primary/10 text-primary"
        }`}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Icon className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="block text-xs opacity-70">
          {formatFileSize(file.size)}
        </span>
      </span>
      {canOpen && <Download className="size-4 shrink-0 opacity-60" />}
    </>
  );

  const cls = `flex w-56 sm:w-64 max-w-full items-center gap-3 rounded-xl p-2 text-left ${
    isMine ? "bg-primary-content/10" : "bg-base-200"
  }`;

  return canOpen ? (
    <motion.a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      download={file.name}
      title={`Open ${file.name}`}
      whileTap={{ scale: 0.97 }}
      className={`${cls} transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      {body}
    </motion.a>
  ) : (
    <div className={cls}>{body}</div>
  );
};

// Video player inside the chat bubble
const VideoAttachment = ({ video, uploading = false }) => (
  <div className="relative w-56 sm:w-72 max-w-full overflow-hidden rounded-xl bg-black">
    <video
      src={video.url}
      controls={!uploading}
      preload="metadata"
      playsInline
      className={`max-h-64 w-full object-contain ${
        uploading ? "opacity-60" : ""
      }`}
    />
    {uploading && (
      <div className="absolute inset-0 grid place-items-center">
        <Loader2 className="size-6 animate-spin text-white" />
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  LOCATION card inside the chat bubble                               */
/*  - normal pin: map preview + "Open in Maps"                         */
/*  - live share: pulsing LIVE badge, "updated Xs ago", expiry time,   */
/*    and a Stop button (only for the sender)                          */
/*  `share` = latest entry from useGroupStore.liveShares (or undefined)*/
/*  NOTE: location is NOT end-to-end encrypted (server needs coords). */
/* ------------------------------------------------------------------ */
const LocationAttachment = ({ location, share, isMine, onStop }) => {
  const lat = Number(share?.lat ?? location.lat);
  const lng = Number(share?.lng ?? location.lng);
  const accuracy = share?.accuracy ?? location.accuracy;
  const expiresAt = share?.expiresAt;

  // live only while the share exists in the store (stop / expire removes it)
  const liveRaw = Boolean(location.isLive && share);
  const now = useNow(liveRaw ? 15000 : 0);
  const live = liveRaw && (!expiresAt || new Date(expiresAt).getTime() > now);
  const wasLive = Boolean(location.isLive) && !live;

  // move the map only when the pin moved > 25 m (avoids iframe flicker)
  const [pin, setPin] = useState({ lat, lng });
  useEffect(() => {
    setPin((p) => (metersBetween(p, { lat, lng }) > 25 ? { lat, lng } : p));
  }, [lat, lng]);

  const [stopping, setStopping] = useState(false);
  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      await onStop?.(location.shareId);
    } finally {
      setStopping(false);
    }
  };

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const title = live
    ? "Live location"
    : wasLive
      ? "Live location ended"
      : "Location";

  return (
    <div className="w-60 sm:w-72 max-w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 text-base-content text-left">
      <a
        href={mapsUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-32 bg-base-200"
        aria-label="Open location in Maps"
      >
        <iframe
          title="Map preview"
          src={osmEmbedUrl(pin.lat, pin.lng)}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none h-full w-full border-0"
        />
        {/* click catcher so the whole map opens Maps */}
        <span className="absolute inset-0" />
        {live && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-base-100/90 px-2 py-0.5 text-[11px] font-semibold text-success shadow">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            LIVE
          </span>
        )}
      </a>

      <div className="p-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full ${
              live ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
            }`}
          >
            {live ? (
              <Navigation className="size-4" />
            ) : (
              <MapPin className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{title}</div>
            <div className="truncate text-xs text-base-content/60">
              {live
                ? [
                    share?.updatedAt
                      ? `Updated ${timeAgo(share.updatedAt, now)}`
                      : "",
                    expiresAt ? `Until ${clockTime(expiresAt)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : Number.isFinite(Number(accuracy))
                  ? `±${Math.round(accuracy)} m`
                  : `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
            </div>
          </div>
          <a
            href={mapsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs btn-circle shrink-0"
            aria-label="Open in Maps"
            title="Open in Maps"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>

        {live && isMine && (
          <button
            type="button"
            onClick={handleStop}
            disabled={stopping}
            className="btn btn-error btn-outline btn-xs mt-2 w-full"
          >
            {stopping ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Stop sharing"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const placePopover = (rect, w, h, align, preferAbove = false) => {
  const gap = 6;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = rect.bottom + gap;
  const above = rect.top - gap - h;
  let top;
  if (preferAbove) top = above >= pad ? above : below;
  else top = below + h <= vh - pad ? below : Math.max(pad, above);
  top = Math.min(Math.max(pad, top), vh - h - pad);
  let left = align === "right" ? rect.right - w : rect.left;
  left = Math.min(Math.max(pad, left), vw - w - pad);
  return { top, left };
};

const actionBtnClass = (open) =>
  `btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content transition-opacity focus-visible:opacity-100 ${
    open ? "opacity-100 bg-base-300/60" : "opacity-0 group-hover:opacity-100"
  }`;

const MenuItem = ({ icon: Icon, label, onClick, danger = false, large }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 text-left outline-none transition-colors ${
      large ? "h-12 text-base" : "h-10 text-sm px-3 gap-2.5"
    } ${
      danger
        ? "text-error hover:bg-error/10 focus-visible:bg-error/10 active:bg-error/10"
        : "hover:bg-base-200 focus-visible:bg-base-200 active:bg-base-200"
    }`}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

/* ------------------------------------------------------------------ */
/*  Call log row (shows inside the chat timeline)                      */
/* ------------------------------------------------------------------ */
const describeCall = (c) => {
  const kind = c.type === "video" ? "Video" : "Voice";
  const starterName = c.startedByMe
    ? "You"
    : c.startedBy?.fullName?.split(" ")[0] || "Someone";
  const TypeIcon = c.type === "video" ? Video : Phone;

  if (c.status === "completed") {
    const parts = [starterName + " started"];
    parts.push(formatDuration(c.duration || 0));
    if (c.participantCount > 1) parts.push(`${c.participantCount} joined`);
    return {
      Icon: TypeIcon,
      tone: "",
      title: `${kind} call`,
      sub: parts.join(" · "),
    };
  }

  if (c.status === "missed") {
    if (c.startedByMe)
      return {
        Icon: TypeIcon,
        tone: "",
        title: `${kind} call`,
        sub: "No one joined",
      };
    return {
      Icon: PhoneMissed,
      tone: "text-error",
      title: `Missed ${kind.toLowerCase()} call`,
      sub: c.startedBy?.fullName ? `from ${c.startedBy.fullName}` : "",
    };
  }

  // cancelled
  return {
    Icon: TypeIcon,
    tone: "",
    title: `${kind} call`,
    sub: "Cancelled",
  };
};

const GroupCallLog = ({ item, prev, onCallBack, disabled, s, cs }) => {
  const c = item.call;
  const { Icon, tone, title, sub } = describeCall(c);
  const showDay = !prev?.createdAt || !sameDay(prev.createdAt, item.createdAt);
  const time =
    item.createdAt && s.showTimestamps
      ? formatTime(item.createdAt, s.timeFormat)
      : "";

  return (
    <div id={item.id ? `call-${item.id}` : undefined}>
      {showDay && (
        <div
          className={`flex justify-center ${cs?.dayMargin || "my-3 sm:my-4"}`}
        >
          <span className="text-xs text-base-content/60 bg-base-100 border border-base-300 rounded-full px-3 py-1">
            {dayLabel(item.createdAt)}
          </span>
        </div>
      )}
      <div className={`flex justify-center ${cs?.callMargin || "my-2"}`}>
        <div className="flex items-center gap-2.5 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm max-w-[92%]">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-base-200 ${tone}`}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <div className={`truncate font-medium ${tone}`}>{title}</div>
            <div className="truncate text-xs text-base-content/60">
              {[sub, time].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle shrink-0 text-primary"
            onClick={onCallBack}
            disabled={disabled}
            aria-label="Call again"
            title="Call again"
          >
            {c.type === "video" ? (
              <Video className="size-4" />
            ) : (
              <Phone className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  One message row — memoized so typing in the composer does NOT     */
/*  re-render every bubble (this was the main cause of lag on phones)  */
/* ------------------------------------------------------------------ */
const MessageRow = memo(function MessageRow({
  m,
  prev,
  next,
  group,
  myId,
  authUser,
  cs,
  s,
  largeEmoji,
  isTouch,
  reactOpen,
  menuOpen,
  canReact,
  canDM,
  canDA,
  isAdminOrOwner = false,
  canPinSetting = true,
  highlighted = false,
  share, // LOCATION: live share for this message (or undefined)
  h, // ref with the latest handlers
}) {
  const mine = sameId(m.senderId, myId);

  const showDay =
    m.createdAt && (!prev?.createdAt || !sameDay(prev.createdAt, m.createdAt));
  const startsGroup = !prev || showDay || !sameId(prev.senderId, m.senderId);
  const endsGroup =
    !next ||
    !sameId(next.senderId, m.senderId) ||
    (next.createdAt && m.createdAt && !sameDay(next.createdAt, m.createdAt));

  const pending = Boolean(m.pending || m.failed);
  const isDeleted = Boolean(m.isDeleted);
  // E2EE: a message whose text could not be decrypted still gets a bubble
  // (with a lock placeholder) instead of an empty one.
  const decryptFailed = !isDeleted && Boolean(m.decryptFailed);
  const isDecrypting =
    !isDeleted &&
    (m.cryptoState === "decrypting" ||
      (Boolean(m.encrypted) && !m.decrypted && !decryptFailed));
  const hasText =
    !isDeleted && (Boolean(m.text) || decryptFailed || isDecrypting);
  const hasFile = !isDeleted && Boolean(m.file?.name);
  const hasAudio = !isDeleted && Boolean(m.audio?.url);
  const hasVideo = !isDeleted && Boolean(m.video?.url);
  const hasLocation =
    !isDeleted &&
    Number.isFinite(Number(m.location?.lat)) &&
    Number.isFinite(Number(m.location?.lng));
  const imageSrc = isDeleted ? null : m.image?.url || m.localPreview;
  const grouped = isDeleted ? [] : groupReactions(m.reactions, myId);

  const myReadReceipts =
    usePrivacyStore((st) => st.privacy.readReceipts) !== false;
  const seenBy = (m.readBy || []).filter(
    (id) => !sameId(id, m.senderId),
  ).length;
  const sender =
    m.sender || group.members?.find((x) => sameId(x.id, m.senderId));

  const flags = getFlags(m, mine, canDM, canDA, isAdminOrOwner, canPinSetting);
  const showMenu = !pending && menuItemsCount(flags) > 0;
  const showReact = !pending && !isDeleted && canReact;

  // Animate only brand-new messages
  const isFresh =
    pending ||
    (m.createdAt && Date.now() - new Date(m.createdAt).getTime() < 5000);

  const reply = isDeleted ? null : h.current.resolveReply?.(m);
  const replySender = reply
    ? reply.sender || group.members?.find((x) => sameId(x.id, reply.senderId))
    : null;
  const replyPeerName = replySender?.fullName || "Member";

  // Touch: tap on the bubble (not on a button/link/player) opens the bottom sheet
  const onBubbleClick = (e) => {
    if (!isTouch || !(showMenu || showReact)) return;
    if (e.target.closest("button, a, input, audio, video, [role='slider']"))
      return;
    h.current.openSheet(m);
  };

  return (
    <div>
      {showDay && (
        <div
          className={`flex justify-center ${cs?.dayMargin || "my-3 sm:my-4"}`}
        >
          <span className="text-xs text-base-content/60 bg-base-100 border border-base-300 rounded-full px-3 py-1">
            {dayLabel(m.createdAt)}
          </span>
        </div>
      )}

      <motion.div
        id={m.id || m._id ? `msg-${m.id || m._id}` : undefined}
        initial={isFresh ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className={`group flex items-end gap-1.5 sm:gap-2 rounded-xl transition-colors duration-500 ${
          highlighted ? "bg-primary/20 ring-1 ring-primary/40" : ""
        } ${mine ? "flex-row-reverse" : ""} ${
          startsGroup ? cs.groupGap : cs.rowGap
        }`}
      >
        {/* avatar: on phones only for other people (saves width) */}
        <div
          className={`size-7 sm:size-8 shrink-0 ${mine ? "hidden sm:block" : ""}`}
        >
          {endsGroup && (
            <img
              src={avatarSrc(mine ? authUser?.avatar : sender?.avatar)}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "/avatar.png";
              }}
              className="size-7 sm:size-8 rounded-full object-cover border border-base-300"
            />
          )}
        </div>

        <div
          className={`flex flex-col min-w-0 max-w-[88%] sm:max-w-[82%] md:max-w-[75%] lg:max-w-[70%] xl:max-w-[560px] ${
            mine ? "items-end" : "items-start"
          }`}
        >
          {/* sender name (group only) */}
          {!mine && startsGroup && (
            <span className="text-xs font-medium text-base-content/60 mb-0.5 ml-1 max-w-full truncate">
              {sender?.fullName || "Unknown"}
            </span>
          )}

          {/* Bubble + action buttons (desktop only) */}
          <div
            className={`flex items-center gap-0.5 min-w-0 max-w-full ${
              mine ? "flex-row-reverse" : ""
            }`}
          >
            {isDeleted ? (
              <div
                className={`${cs.bubblePaddingDeleted || "px-3.5 py-2"} ${cs.radius} border border-base-300 bg-base-100 text-base-content/60 italic flex items-center gap-1.5 ${
                  endsGroup ? (mine ? cs.tailMine : cs.tailTheirs) : ""
                }`}
              >
                <Ban className="size-3.5 shrink-0" />
                <span className="text-sm">
                  {mine
                    ? "You deleted this message"
                    : "This message was deleted"}
                </span>
              </div>
            ) : (
              <div
                onClick={onBubbleClick}
                className={`min-w-0 max-w-full ${
                  hasText || hasAudio || reply || m.isForwarded
                    ? cs.bubblePadding || "px-3 sm:px-3.5 py-2"
                    : "p-1"
                } ${cs.radius} shadow-sm ${
                  isTouch ? "[-webkit-touch-callout:none] select-text" : ""
                } ${
                  mine
                    ? `bg-primary text-primary-content ${
                        endsGroup ? cs.tailMine : ""
                      }`
                    : `bg-base-100 border border-base-300 ${
                        endsGroup ? cs.tailTheirs : ""
                      }`
                } ${m.failed ? "ring-1 ring-error" : ""}`}
              >
                {m.isForwarded && (
                  <p className="mb-1 flex items-center gap-1 text-[11px] italic opacity-70">
                    <Forward className="size-3" />
                    Forwarded
                  </p>
                )}

                {reply && (
                  <ReplyQuote
                    reply={reply}
                    isMine={mine}
                    authId={myId}
                    peerName={replyPeerName}
                    onClick={() => h.current.scrollToMessage?.(reply.id)}
                  />
                )}

                {/* Story Reply Preview Card */}
                {m.storyReply && (
                  <StoryReplyCard storyReply={m.storyReply} isMine={mine} />
                )}

                {/* Gift Card */}
                {m.gift?.name && (
                  <div className="mb-2">
                    <GiftMessageBubble
                      gift={m.gift}
                      isMine={mine}
                      senderName={mine ? "You" : replyPeerName}
                    />
                  </div>
                )}

                {/* Poll Card */}
                {m.poll?.question && (
                  <div className="mb-2">
                    <PollCard
                      message={m}
                      currentUserId={myId}
                      onVote={(...args) => {
                        const optIds = args.length > 1 ? args[1] : args[0];
                        h.current.votePoll(m.id, optIds);
                      }}
                      onClosePoll={() => h.current.closePoll(m.id)}
                      isGroup={true}
                      groupId={group?.id}
                    />
                  </div>
                )}

                {/* View Once Media pill */}
                {m.isViewOnce ? (
                  <div className="mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!m.viewOnceExpired) {
                          h.current.openViewOnce(m);
                        }
                      }}
                      disabled={m.viewOnceExpired}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        m.viewOnceExpired
                          ? "bg-base-200/50 text-base-content/40 cursor-not-allowed"
                          : mine
                            ? "bg-primary-content/20 text-primary-content hover:bg-primary-content/30"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                          m.viewOnceExpired
                            ? "border-base-content/30 text-base-content/40"
                            : "border-current"
                        }`}
                      >
                        1
                      </div>
                      <span>
                        {m.viewOnceExpired
                          ? "Opened"
                          : m.video?.url
                            ? "View Once Video"
                            : "View Once Photo"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    {imageSrc && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => h.current.setPreviewSrc(imageSrc)}
                        className="block focus-visible:outline-2 focus-visible:outline-offset-2 rounded-xl"
                        aria-label="Open image"
                      >
                        <img
                          src={imageSrc}
                          alt="Attachment"
                          decoding="async"
                          loading="lazy"
                          onLoad={() => h.current.onImageLoad()}
                          className={`max-h-56 sm:max-h-64 w-auto max-w-full rounded-xl object-cover ${
                            hasText ? "mb-2" : ""
                          } ${m.pending ? "opacity-60" : ""}`}
                        />
                      </motion.button>
                    )}
                    {hasFile && (
                      <div className={hasText ? "mb-2" : ""}>
                        <FileAttachment
                          file={m.file}
                          isMine={mine}
                          uploading={Boolean(m.pending)}
                        />
                      </div>
                    )}
                    {hasAudio && (
                      <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                        <VoiceMessage
                          audio={m.audio}
                          isMine={mine}
                          uploading={Boolean(m.pending)}
                        />
                      </div>
                    )}
                    {hasVideo && (
                      <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                        <VideoAttachment
                          video={m.video}
                          uploading={Boolean(m.pending)}
                        />
                      </div>
                    )}
                  </>
                )}
                {hasLocation && (
                  <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                    <LocationAttachment
                      location={m.location}
                      share={share}
                      isMine={mine}
                      onStop={h.current.stopLive}
                    />
                  </div>
                )}
                {hasText &&
                  (isDecrypting ? (
                    <p className="flex items-center gap-1.5 italic opacity-75 text-xs py-0.5">
                      <Loader2 className="size-3.5 animate-spin shrink-0 text-primary" />
                      <span>Decrypting message…</span>
                    </p>
                  ) : decryptFailed ? (
                    <div className="flex flex-col gap-1 text-xs py-0.5">
                      <p className="flex items-center gap-1.5 font-medium text-error">
                        <Lock className="size-3.5 shrink-0" />
                        <span>{m.decryptError || "Decryption failed"}</span>
                      </p>
                    </div>
                  ) : (
                    <ExpandableMessage
                      text={displayText(m)}
                      mentions={m.mentions}
                      messageId={m.id || m._id || m.clientId}
                      isMine={mine}
                      className={
                        largeEmoji && isEmojiOnly(m.text)
                          ? "text-4xl leading-tight"
                          : cs.text
                      }
                      maxLines={8}
                    />
                  ))}
              </div>
            )}

            {/* hover actions: only on devices that can hover */}
            {!isTouch && showReact && (
              <button
                type="button"
                data-popover-ui
                onClick={(e) => h.current.openPopover(e, "react", m, mine)}
                className={actionBtnClass(reactOpen)}
                aria-label="React to message"
                aria-haspopup="true"
                aria-expanded={reactOpen}
                title="React"
              >
                <SmilePlus className="size-4" />
              </button>
            )}

            {!isTouch && showMenu && (
              <button
                type="button"
                data-popover-ui
                onClick={(e) => h.current.openPopover(e, "menu", m, mine)}
                className={actionBtnClass(menuOpen)}
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="More"
              >
                <MoreVertical className="size-4" />
              </button>
            )}
          </div>

          {/* Reaction chips */}
          {m.reactions?.length > 0 && (
            <div
              className={`relative z-[1] -mt-1.5 flex flex-wrap gap-1 px-2 ${
                mine ? "justify-end" : ""
              }`}
            >
              <ReactionChips
                message={m}
                currentUserId={myId}
                onToggleReaction={(msgId, emoji) =>
                  h.current.reactToMessage?.(msgId, emoji)
                }
                isGroup={true}
                groupId={group?.id}
              />
            </div>
          )}

          {/* Thread reply counter badge */}
          {m.threadReplyCount > 0 && (
            <button
              type="button"
              onClick={() => h.current.openThread?.(m)}
              className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline px-1 cursor-pointer"
            >
              <MessageSquareText className="size-3.5" />
              <span>
                {m.threadReplyCount}{" "}
                {m.threadReplyCount === 1 ? "reply" : "replies"}
              </span>
              {m.threadLastReplyAt && (
                <span className="text-[10px] opacity-60">
                  · {formatTime(m.threadLastReplyAt)}
                </span>
              )}
            </button>
          )}

          {(endsGroup || pending) && (
            <div className="mt-1 px-1 text-[11px] text-base-content/50">
              {renderStatus(m, mine, seenBy, s, myReadReceipts)}
            </div>
          )}

          {m.failed && (
            <div className="flex gap-3 mt-0.5 px-1 text-xs">
              <button
                type="button"
                className="inline-flex items-center gap-1 py-1 text-primary hover:underline"
                onClick={() => h.current.retryMessage(m.clientId)}
              >
                <RotateCw className="size-3" />
                Retry
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 py-1 text-base-content/60 hover:text-error hover:underline"
                onClick={() => h.current.discardMessage(m.clientId)}
              >
                <Trash2 className="size-3" />
                Discard
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

/* onToggleInfo -> opens / closes the right-side GroupInfoPanel (from HomePage) */
const GroupChatContainer = ({ onToggleInfo, onManage, isInfoOpen = false }) => {
  const {
    selectedGroup,
    groups,
    groupMessages,
    isGroupMessagesLoading,
    typing,
    sendMessage,
    retryMessage,
    discardMessage,
    closeGroup,
    emitTyping,
    markSeen,
    archiveGroup,
    unarchiveGroup,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    editGroupMessage,
    deleteForMe,
    deleteForEveryone,
    togglePin,
    toggleStar,
    forwardGroupMessage,
    // ---- E2EE ----
    refreshGroupKeys,
    // ---- LOCATION ----
    liveShares,
    sendCurrentLocation,
    startLiveLocation,
    stopLiveLocation,
    reactToMessage,
    scheduled = [],
    scheduleGroupMessage,
    cancelScheduled,
    editScheduledMessage,
    sendScheduledNow,
    activeThread,
    openThread,
    closeThread,
    sendThreadReply,
    votePoll,
    closePoll,
    reactToGroupMessage,
    markViewOnceOpened,
    setGroupDisappearing,
    jumpToMessageId,
    setJumpToMessageId,
  } = useGroupStore();
  const { authUser } = useAuthStore();
  const onlineUsers = useVisibleOnlineUsers();

  /* ---- group calls ---- */
  const { status: oneToOneStatus } = useCall(); // your 1:1 CallContext
  const startGroupCall = useGroupCallStore((st) => st.startCall);
  const groupCallStatus = useGroupCallStore((st) => st.status);
  const hasActiveGroupCall = useGroupCallStore((st) =>
    Boolean(st.activeByGroup[String(selectedGroup?.id)]),
  );
  // can't start while: in a 1:1 call, in a group call, or this group already has a call
  const callBlocked =
    oneToOneStatus !== "idle" ||
    groupCallStatus !== "idle" ||
    hasActiveGroupCall;

  /* ---- group call history (shown inside the chat timeline) ---- */
  const groupCalls = useGroupCallHistoryStore(
    (st) => st.byGroup[String(selectedGroup?.id)],
  );
  const fetchGroupCalls = useGroupCallHistoryStore((st) => st.fetchGroup);

  const s = useAppearanceStore((st) => st.appearance);
  const typingEnabled = usePrivacyStore((st) => st.privacy.typingIndicator);
  const { enterToSend, largeEmoji, autoScroll } = useChatPrefsStore(
    (st) => st.prefs,
  );
  // memoized: a new object every render would defeat MessageRow's memo
  const cs = useMemo(() => chatStyle(s), [s]);

  const motionMode = s.reduceMotion ? "always" : "user";
  const isTouch = useIsTouch();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTools, setShowTools] = useState(false); // mobile: "+" attach row
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [popover, setPopover] = useState(null); // { type: react|menu|sheet, id, top, left }
  const [confirmId, setConfirmId] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [pinIndex, setPinIndex] = useState(0);
  const [highlightId, setHighlightId] = useState(null);
  const [archiving, setArchiving] = useState(false);
  // ---- E2EE state ----
  const [retryingKeys, setRetryingKeys] = useState(false);
  const [e2eeInfoOpen, setE2eeInfoOpen] = useState(false); // WhatsApp-style info modal
  // ---- LOCATION state ----
  const [locationOpen, setLocationOpen] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [liveMin, setLiveMin] = useState(60);
  const [stoppingBar, setStoppingBar] = useState(false);
  // ---- SEARCH state ----
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // ---- SCHEDULED state ----
  const [showSchedule, setShowSchedule] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [savingMessage, setSavingMessage] = useState(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [viewOnceMessage, setViewOnceMessage] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [showDisappearing, setShowDisappearing] = useState(false);

  const recorder = useVoiceRecorder({
    onComplete: (voice) => sendMessage({ voice }),
    onError: (msg) => customToast.error(msg),
  });
  const recorderBusy = recorder.state !== "idle";

  const listRef = useRef(null);
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const textRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const highlightTimer = useRef(null);
  const dragDepth = useRef(0);
  const stickToBottomRef = useRef(true);
  const lastGroupRef = useRef(null);
  const lastSeenSentRef = useRef({});
  const handlersRef = useRef({}); // latest handlers for memoized rows
  const decryptRetriesRef = useRef({}); // { [groupId]: attempts }

  const myId = String(authUser?.id ?? authUser?._id);
  const group = selectedGroup;

  // ---- @Mention state ----
  const [mentionState, setMentionState] = useState({
    open: false,
    query: "",
    triggerIndex: -1,
    activeIndex: 0,
  });
  const [selectedMentions, setSelectedMentions] = useState([]);

  const onlineUsersSet = useMemo(
    () => new Set(Array.isArray(onlineUsers) ? onlineUsers : []),
    [onlineUsers],
  );

  const filteredMentionMembers = useMemo(() => {
    if (!mentionState.open) return [];
    const q = (mentionState.query || "").trim().toLowerCase();
    const members = group?.members || [];
    return members.filter((m) => {
      const uid = String(m.id || m._id || m.userId);
      if (sameId(uid, myId)) return false;
      if (!q) return true;
      const nameMatch = (m.fullName || "").toLowerCase().includes(q);
      const userMatch = (m.username || "").toLowerCase().includes(q);
      return nameMatch || userMatch;
    });
  }, [mentionState.open, mentionState.query, group?.members, myId]);
  const list = Array.isArray(groupMessages) ? groupMessages : [];
  const last = list[list.length - 1];
  const lastKey = last ? last.clientId || last.id : null;
  const lastIsMine = last ? sameId(last.senderId, myId) : false;

  const isAdminOrOwner = group?.owner
    ? sameId(group.owner, myId) ||
      group.members?.some(
        (mb) =>
          sameId(mb.userId?._id || mb.userId || mb.id, myId) &&
          mb.role === "admin",
      )
    : false;

  const canMentionAll = useMemo(() => {
    const perm = group?.mentionAllPermission || "everyone";
    if (perm === "disabled") return false;
    if (perm === "admins_only") return isAdminOrOwner;
    return true;
  }, [group?.mentionAllPermission, isAdminOrOwner]);

  const showMentionAll = useMemo(() => {
    if (!canMentionAll) return false;
    if (!mentionState.open) return false;
    const q = (mentionState.query || "").trim().toLowerCase();
    if (!q) return true;
    return "all".startsWith(q);
  }, [canMentionAll, mentionState.open, mentionState.query]);

  const filteredMentionItems = useMemo(() => {
    if (!mentionState.open) return [];
    const items = [];
    if (showMentionAll) {
      items.push({
        type: "all",
        id: "__all__",
        name: "all",
        fullName: "all",
      });
    }
    filteredMentionMembers.forEach((m) => {
      items.push({ type: "user", ...m });
    });
    return items;
  }, [showMentionAll, filteredMentionMembers, mentionState.open]);

  useEffect(() => {
    setMentionState({
      open: false,
      query: "",
      triggerIndex: -1,
      activeIndex: 0,
    });
    setSelectedMentions([]);
  }, [group?.id]);
  const canPinSetting = group?.whoCanPin !== "admins";
  const pinnedMessages = useGroupStore((st) => st.pinnedMessages) || [];

  const canReact = Boolean(reactToMessage);
  const canDM = Boolean(deleteForMe);
  const canDA = Boolean(deleteForEveryone);

  const pinned = useMemo(() => {
    const map = new Map();
    (pinnedMessages || []).forEach((m) => {
      if (m && m.isPinned && !m.isDeleted) {
        map.set(String(m.id || m._id), m);
      }
    });
    (list || []).forEach((m) => {
      if (m && m.isPinned && !m.isDeleted) {
        map.set(String(m.id || m._id), {
          ...map.get(String(m.id || m._id)),
          ...m,
        });
      } else if (m && !m.isPinned) {
        map.delete(String(m.id || m._id));
      }
    });
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.pinnedAt || 0).getTime() -
        new Date(a.pinnedAt || 0).getTime(),
    );
  }, [pinnedMessages, list]);
  const currentPin = pinned.length ? pinned[pinIndex % pinned.length] : null;

  useEffect(() => {
    if (pinIndex >= pinned.length) setPinIndex(0);
  }, [pinned.length, pinIndex]);

  const allUsers = useChatStore((st) => st.users) || [];
  const contacts = useContactStore((st) => st.contacts) || [];
  const forwardCandidates = useMemo(() => {
    const map = new Map();
    (allUsers || []).forEach((u) => {
      if (!u.isBlocked && !sameId(u.id, myId)) {
        map.set(String(u.id), {
          id: u.id,
          fullName: u.fullName,
          avatar: u.avatar,
          isGroup: false,
        });
      }
    });
    (contacts || []).forEach((c) => {
      const id = String(c.id);
      if (!map.has(id) && !c.isBlocked && !sameId(c.id, myId)) {
        map.set(id, {
          id: c.id,
          fullName: c.fullName,
          avatar: c.avatar,
          isGroup: false,
        });
      }
    });
    (groups || []).forEach((g) => {
      const id = String(g.id);
      if (!sameId(g.id, group?.id)) {
        map.set(id, {
          id: g.id,
          fullName: g.name,
          avatar: g.avatar,
          isGroup: true,
        });
      }
    });
    return Array.from(map.values());
  }, [allUsers, contacts, groups, myId, group?.id]);

  useEffect(() => {
    return () => clearTimeout(highlightTimer.current);
  }, []);

  const scrollToMessage = useCallback((id) => {
    if (!id) return;
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 2500);
    }
  }, []);

  useEffect(() => {
    if (replyingTo) requestAnimationFrame(() => textRef.current?.focus());
  }, [replyingTo?.id]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      if (
        Array.isArray(editingMessage.mentions) &&
        editingMessage.mentions.length > 0
      ) {
        setSelectedMentions(
          editingMessage.mentions
            .map((x) => ({
              userId: String(x.userId?.id || x.userId?._id || x.userId),
              name: x.userId?.fullName || x.name,
              username: x.userId?.username || x.username,
            }))
            .filter((x) => Boolean(x.userId)),
        );
      } else {
        setSelectedMentions([]);
      }
      requestAnimationFrame(() => textRef.current?.focus());
    } else {
      setSelectedMentions([]);
    }
  }, [editingMessage?.id]);

  // Jump to mentioned or targeted message from notification
  useEffect(() => {
    const targetId =
      jumpToMessageId || sessionStorage.getItem("chatty:jump-to-message");
    if (!targetId || !group?.id) return;

    const found = groupMessages?.some((m) => sameId(m.id || m._id, targetId));
    if (found) {
      const timer = setTimeout(() => {
        scrollToMessage(targetId);
        setJumpToMessageId?.(null);
        sessionStorage.removeItem("chatty:jump-to-message");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [
    jumpToMessageId,
    groupMessages,
    group?.id,
    scrollToMessage,
    setJumpToMessageId,
  ]);

  const fileIsImage = isImageFile(file);
  const PreviewIcon = file ? getFileIcon(file.type, file.name) : null;

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /* ---- scroll: only on new message / group switch ---- */
  useLayoutEffect(() => {
    if (isGroupMessagesLoading || !listRef.current) return;
    const changed = lastGroupRef.current !== group?.id;
    lastGroupRef.current = group?.id;
    if (changed) {
      stickToBottomRef.current = true;
      requestAnimationFrame(() => {
        if (listRef.current)
          listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "auto",
          });
      });
      return;
    }
    if (lastIsMine || (autoScroll && stickToBottomRef.current))
      scrollToBottom("smooth");
  }, [
    lastKey,
    lastIsMine,
    group?.id,
    isGroupMessagesLoading,
    scrollToBottom,
    autoScroll,
  ]);

  /* ---- keep list pinned to bottom when the mobile keyboard opens ---- */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (stickToBottomRef.current) scrollToBottom("auto");
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  /* ---- image preview ---- */
  useEffect(() => {
    if (!file || !isImageFile(file)) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* ---- stop typing when switching / leaving a group ---- */
  useEffect(() => {
    return () => {
      clearTimeout(typingTimer.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTyping(false);
      }
    };
  }, [group?.id, emitTyping]);

  /* ---- reset input when switching group ---- */
  useEffect(() => {
    recorder.cancel();
    setText("");
    setFile(null);
    setShowEmoji(false);
    setShowTools(false);
    setShowVideoRecorder(false);
    setPopover(null);
    setConfirmId(null);
    setE2eeInfoOpen(false);
    setLocationOpen(false);
    setLocBusy(false);
    setRetryingKeys(false);
    setIsDragging(false);
    dragDepth.current = 0;
  }, [group?.id, recorder.cancel]);

  /* ---- close emoji picker on outside click / Escape ---- */
  useEffect(() => {
    if (!showEmoji) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-emoji-ui]")) setShowEmoji(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setShowEmoji(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [showEmoji]);

  /* ---- auto-grow textarea ---- */
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  /* ---- SEEN ---- */
  const hasUnseen = useMemo(
    () =>
      list.some(
        (m) =>
          !m.pending &&
          !m.failed &&
          !sameId(m.senderId, myId) &&
          !(m.readBy || []).some((id) => sameId(id, myId)) &&
          !(m.silentReadBy || []).some((id) => sameId(id, myId)),
      ),
    [list, myId],
  );

  useEffect(() => {
    if (!group || !hasUnseen) return;
    if (document.visibilityState !== "visible") return;
    if (lastSeenSentRef.current[group.id] === lastKey) return;
    lastSeenSentRef.current[group.id] = lastKey;
    markSeen(group.id);
  }, [group?.id, hasUnseen, lastKey, markSeen]);

  useEffect(() => {
    if (!group) return;
    const onBack = () => {
      if (document.visibilityState !== "visible" || !hasUnseen) return;
      if (lastSeenSentRef.current[group.id] === lastKey) return;
      lastSeenSentRef.current[group.id] = lastKey;
      markSeen(group.id);
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [group?.id, hasUnseen, lastKey, markSeen]);

  /* ---- Escape: confirm -> e2ee info -> location -> popover -> image viewer ---- */
  useEffect(() => {
    if (!popover && !confirmId && !previewSrc && !locationOpen && !e2eeInfoOpen)
      return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmId) setConfirmId(null);
      else if (e2eeInfoOpen) setE2eeInfoOpen(false);
      else if (locationOpen) {
        if (!locBusy) setLocationOpen(false);
      } else if (popover) setPopover(null);
      else setPreviewSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover, confirmId, previewSrc, locationOpen, locBusy, e2eeInfoOpen]);

  /* ---- close popover on outside click / resize ---- */
  useEffect(() => {
    if (!popover) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-popover-ui]")) setPopover(null);
    };
    // the bottom sheet must survive viewport changes (keyboard / rotation)
    const onResize = () => {
      if (popover.type !== "sheet") setPopover(null);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [popover]);

  /* ---- ONLINE count ---- */
  const onlineCount = useMemo(() => {
    const ids = new Set(toIds(onlineUsers));
    return (group?.members || []).filter((m) => ids.has(String(m.id))).length;
  }, [group?.members, onlineUsers]);

  /* ---- load call history when a group opens ---- */
  useEffect(() => {
    if (group?.id) fetchGroupCalls(group.id);
  }, [group?.id, fetchGroupCalls]);

  /* ---- E2EE: how many messages are still locked ---- */
  const undecryptedCount = useMemo(
    () =>
      list.filter(
        (m) =>
          !m.isDeleted &&
          (Boolean(m.decryptFailed) || (Boolean(m.encrypted) && !m.decrypted)),
      ).length,
    [list],
  );

  /* ---- E2EE: auto re-try decrypting (keys may arrive a moment later) ---- */
  useEffect(() => {
    const gid = group?.id;
    if (!gid || undecryptedCount === 0) return;
    const key = String(gid);
    if ((decryptRetriesRef.current[key] || 0) >= MAX_AUTO_DECRYPT_RETRIES)
      return;

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        await whenE2EEReady();
        if (cancelled) return;
        decryptRetriesRef.current[key] =
          (decryptRetriesRef.current[key] || 0) + 1;
        await refreshGroupKeys(gid);
      } catch {
        /* silent: the manual Retry button is still there */
      }
    }, AUTO_DECRYPT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [group?.id, undecryptedCount, refreshGroupKeys]);

  // manual retry (banner button)
  const handleRetryDecrypt = async () => {
    if (!group || retryingKeys) return;
    setRetryingKeys(true);
    try {
      await whenE2EEReady();
      await refreshGroupKeys(group.id);
    } catch {
      customToast.error("Couldn't refresh encryption keys. Try again.");
    } finally {
      setRetryingKeys(false);
    }
  };

  /* ---- messages + call logs merged by time ---- */
  const timeline = useMemo(() => {
    if (!groupCalls?.length) return list;
    const callItems = groupCalls.map((c) => ({
      kind: "call",
      id: `call-${c.id}`,
      senderId: "__call__", // so message grouping (avatar / name) is not confused
      createdAt: c.endedAt || c.startedAt,
      call: c,
    }));
    // pending messages (no createdAt yet) always stay at the bottom
    const t = (x) =>
      x.createdAt ? new Date(x.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    return [...list, ...callItems].sort((a, b) => t(a) - t(b));
  }, [list, groupCalls]);

  /* ---- a new call log arrived -> scroll down if user is at the bottom ---- */
  const callCount = groupCalls?.length || 0;
  useEffect(() => {
    if (callCount && stickToBottomRef.current) scrollToBottom("smooth");
  }, [callCount, scrollToBottom]);

  /* ---- input handlers ---- */
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(false);
    }
  };

  useEffect(() => {
    if (!typingEnabled) stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingEnabled]);

  if (!group) return null;

  const isArchived = Boolean(group.archived);

  const toggleArchive = async () => {
    if (archiving) return;
    setArchiving(true);
    try {
      if (isArchived) await unarchiveGroup(group.id);
      else await archiveGroup(group.id);
    } finally {
      setArchiving(false);
    }
  };

  const typingNames = Object.entries(typing?.[group.id] || {})
    .filter(([uid]) => uid !== myId)
    .map(([, name]) => name?.split(" ")[0]);

  const typingText =
    typingNames.length === 0
      ? ""
      : typingNames.length === 1
        ? `${typingNames[0]} is typing…`
        : typingNames.length === 2
          ? `${typingNames[0]} and ${typingNames[1]} are typing…`
          : "Several people are typing…";

  /* ================= LOCATION logic ================= */
  const groupShares = Object.values(liveShares?.[group.id] || {});
  const myShare = groupShares.find((sh) => sameId(sh.sharerId, myId));
  const othersSharing = groupShares.filter((sh) => !sameId(sh.sharerId, myId));
  const nameOf = (id) =>
    (group?.members || []).find((x) => sameId(x.id, id))?.fullName?.split(" ")[0] ||
    "Someone";

  const liveBarText = (() => {
    const names = othersSharing.map((sh) => nameOf(sh.sharerId));
    const others =
      names.length === 0
        ? ""
        : names.length === 1
          ? `${names[0]} is sharing live location`
          : names.length === 2
            ? `${names[0]} and ${names[1]} are sharing live location`
            : `${names[0]} and ${names.length - 1} others are sharing live location`;
    if (myShare && others) return `You and others are sharing live location`;
    if (myShare) return "You are sharing your live location";
    return others;
  })();

  const openLocationModal = () => {
    stopTyping();
    setShowEmoji(false);
    setShowTools(false);
    setLocationOpen(true);
  };

  const runLocation = async (fn) => {
    if (locBusy) return;
    setLocBusy(true);
    try {
      const coords = await getPosition();
      const ok = await fn(coords);
      if (ok) setLocationOpen(false);
    } catch (e) {
      customToast.error(e?.message || "Couldn't get your location.");
    } finally {
      setLocBusy(false);
    }
  };

  const handleSendCurrent = () =>
    runLocation((coords) => sendCurrentLocation(group.id, coords));

  const handleStartLive = () =>
    runLocation((coords) => startLiveLocation(group.id, coords, liveMin));

  // used by the bubble button, the top bar and the modal
  const handleStopLive = async (shareId) => {
    const id = shareId || myShare?.shareId;
    if (!id) return false;
    const ok = await stopLiveLocation(group.id, id);
    if (ok) customToast.success("Live location stopped");
    return ok;
  };

  const handleStopFromBar = async () => {
    if (stoppingBar) return;
    setStoppingBar(true);
    try {
      await handleStopLive(myShare?.shareId);
    } finally {
      setStoppingBar(false);
    }
  };

  const handleOpenMaps = (m) => {
    closePopover();
    const lat = Number(m.location?.lat);
    const lng = Number(m.location?.lng);
    window.open(mapsUrl(lat, lng), "_blank", "noopener,noreferrer");
  };

  const handleCopyLocationLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(
        mapsUrl(Number(m.location?.lat), Number(m.location?.lng)),
      );
      customToast.success("Location link copied");
    } catch {
      customToast.error("Couldn't copy link");
    }
  };

  // Reset search on group change
  useEffect(() => {
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults([]);
  }, [group?.id]);

  // Debounced message search
  useEffect(() => {
    const q = searchQ.trim().toLowerCase();
    if (!searchOpen || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const rawMsgs = Array.isArray(groupMessages) ? groupMessages : [];
      const results = rawMsgs
        .filter((m) => {
          if (m.isDeleted) return false;
          const msgText = displayText(m) || m.text || "";
          return msgText.toLowerCase().includes(q);
        })
        .slice(-30)
        .reverse();
      setSearchResults(results);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQ, searchOpen, groupMessages]);

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Are you sure you want to leave "${group?.name}"?`))
      return;
    try {
      await useGroupStore.getState().leaveGroup(group.id);
      customToast.success("You left the group");
      closeGroup();
    } catch (err) {
      customToast.error(err.response?.data?.message || "Failed to leave group");
    }
  };

  const openPopover = (e, type, m, mine) => {
    if (popover?.type === type && sameId(popover.id, m.id)) {
      setPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const align = mine ? "right" : "left";
    const pos =
      type === "react"
        ? placePopover(rect, REACT_W, REACT_H, align, true)
        : placePopover(
            rect,
            MENU_W,
            menuHeight(
              getFlags(m, mine, canDM, canDA, isAdminOrOwner, canPinSetting),
            ),
            align,
          );
    setPopover({ type, id: m.id, ...pos });
  };
  const openSheet = (m) => setPopover({ type: "sheet", id: m.id });
  const closePopover = () => setPopover(null);

  const handleCopyText = async (m) => {
    closePopover();
    // E2EE: never copy the placeholder / empty text of a locked message
    if (m.decryptFailed || !m.text) {
      customToast.error("This message is still encrypted");
      return;
    }
    const ok = await copyMessageText(m.text);
    ok
      ? customToast.success("Text copied")
      : customToast.error("Couldn't copy text");
  };
  const handleCopyImage = async (m) => {
    closePopover();
    const result = await copyMessageImage(m.image?.url);
    if (result === "image") customToast.success("Image copied");
    else if (result === "url")
      customToast.success("Image copy isn't supported here — link copied");
    else customToast.error("Couldn't copy image");
  };
  const handleCopyLink = async (m) => {
    closePopover();
    const ok = await copyImageLink(m.image?.url);
    ok
      ? customToast.success("Image link copied")
      : customToast.error("Couldn't copy link");
  };
  const handleCopyFileLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(m.file?.url || "");
      customToast.success("File link copied");
    } catch {
      customToast.error("Couldn't copy link");
    }
  };
  const handleCopyAudioLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(m.audio?.url || "");
      customToast.success("Voice message link copied");
    } catch {
      customToast.error("Couldn't copy link");
    }
  };
  const handleCopyVideoLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(m.video?.url || "");
      customToast.success("Video link copied");
    } catch {
      customToast.error("Couldn't copy link");
    }
  };

  const handleReply = (m) => {
    closePopover();
    setReplyingTo(m);
  };

  const handleEdit = (m) => {
    closePopover();
    setEditingMessage(m);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
    setSelectedMentions([]);
    setMentionState({
      open: false,
      query: "",
      triggerIndex: -1,
      activeIndex: 0,
    });
  };

  const handleSelectMention = useCallback(
    (member) => {
      if (!member) return;
      const triggerIdx =
        mentionState.triggerIndex >= 0
          ? mentionState.triggerIndex
          : text.lastIndexOf("@");
      if (triggerIdx < 0) return;

      const textBefore = text.slice(0, triggerIdx);
      const textAfter = text.slice(
        textRef.current?.selectionStart ?? text.length,
      );

      const isAll = member.type === "all" || member.id === "__all__";
      const mentionName = isAll ? "all" : member.fullName || member.username || "user";
      const tag = `@${mentionName} `;
      const newText = textBefore + tag + textAfter;

      setText(newText);
      setMentionState({
        open: false,
        query: "",
        triggerIndex: -1,
        activeIndex: 0,
      });

      if (!isAll) {
        const memberId = String(member.id || member._id || member.userId);
        setSelectedMentions((prev) => {
          if (prev.some((x) => String(x.userId || x.id) === memberId))
            return prev;
          return [
            ...prev,
            {
              userId: memberId,
              name: mentionName,
              username: member.username,
            },
          ];
        });
      }

      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          const nextPos = triggerIdx + tag.length;
          textRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    },
    [mentionState.triggerIndex, text],
  );

  const handleTogglePin = async (m) => {
    closePopover();
    if (!m.isPinned && pinned.length >= MAX_PINS) {
      customToast.error(`You can pin up to ${MAX_PINS} messages`);
      return;
    }
    await togglePin(group.id, m.id);
  };

  const handleToggleStar = (m) => {
    closePopover();
    toggleStar(group.id, m.id);
  };

  const handleForward = (m) => {
    closePopover();
    setForwardMsg(m);
  };

  const handleDeleteForMe = (m) => {
    closePopover();
    deleteForMe(group.id, m.id);
  };

  const askDeleteForEveryone = (m) => {
    closePopover();
    setConfirmId(m.id);
  };

  const confirmDeleteForEveryone = () => {
    if (confirmId) deleteForEveryone(group.id, confirmId);
    setConfirmId(null);
  };

  const handleConfirmForward = async (selectedIds) => {
    if (!forwardMsg || !selectedIds.length) return false;
    const targetGroupIds = [];
    const targetUserIds = [];
    selectedIds.forEach((id) => {
      const isGrp = (groups || []).some((g) => sameId(g.id, id));
      if (isGrp) targetGroupIds.push(id);
      else targetUserIds.push(id);
    });
    const ok = await forwardGroupMessage(
      forwardMsg,
      targetUserIds,
      targetGroupIds,
    );
    return ok;
  };

  // always-fresh handlers for the memoized rows (no prop churn)
  handlersRef.current = {
    openPopover,
    openSheet,
    setPreviewSrc,
    reactToMessage: (msgId, emoji) =>
      reactToGroupMessage(group?.id, msgId, emoji),
    retryMessage,
    discardMessage,
    stopLive: handleStopLive,
    scrollToMessage,
    openThread: (m) => openThread(m, group?.id),
    votePoll: (mId, optId) => votePoll(mId, optId, group?.id),
    closePoll: (mId) => closePoll(mId, group?.id),
    openViewOnce: (m) => setViewOnceMessage(m),
    openSaveModal: (m) => setSavingMessage(m),
    highlightId,
    resolveReply: (m) => resolveGroupReply(m, list),
    onImageLoad: () => stickToBottomRef.current && scrollToBottom("auto"),
  };

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (popover && popover.type !== "sheet") setPopover(null);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setText(val);

    // Check for @mention trigger
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.]*)$/);
    if (match) {
      const q = match[1];
      const triggerIdx = textBeforeCursor.lastIndexOf("@");
      setMentionState({
        open: true,
        query: q,
        triggerIndex: triggerIdx,
        activeIndex: 0,
      });
    } else if (mentionState.open) {
      setMentionState((prev) => ({ ...prev, open: false }));
    }

    if (!typingEnabled) return;

    if (!val.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  const clearFile = () => {
    setFile(null);
    setIsViewOnce(false);
    if (fileRef.current) fileRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
  };

  const selectFile = (f, kind = "any") => {
    if (!f) return;
    if (editingMessage) {
      customToast.error("Finish editing before attaching a file");
      return;
    }
    const img = isImageFile(f);
    const vid = isVideoFile(f);

    if (kind === "image" && !img) {
      customToast.error(
        "Only images are allowed here. Use the paperclip for files.",
      );
      return;
    }
    if (kind === "file" && img) {
      customToast.error(
        "Images can't be sent as a file. Use the image button.",
      );
      return;
    }

    const limitMb = img ? MAX_IMAGE_MB : vid ? MAX_VIDEO_MB : MAX_FILE_MB;

    if (f.size === 0) {
      customToast.error("This file is empty");
      return;
    }
    if (f.size > limitMb * 1024 * 1024) {
      customToast.error(
        `${img ? "Image" : vid ? "Video" : "File"} must be smaller than ${limitMb} MB`,
      );
      return;
    }
    setFile(f);
    setShowTools(false);
  };

  const confirmSchedule = async (iso, msgText) => {
    if (!group?.id) return false;
    const textToSchedule = (msgText !== undefined ? msgText : text).trim();
    if (!textToSchedule) return false;
    const ok = await scheduleGroupMessage(group.id, textToSchedule, iso);
    if (ok) {
      stopTyping();
      setText("");
    }
    return ok;
  };

  const canSchedule = !editingMessage && !file;

  const handleSend = async (e) => {
    e?.preventDefault();

    const activeMentions = extractActiveMentions(
      text,
      selectedMentions,
      group?.members,
      myId,
    );

    if (editingMessage) {
      const trimmed = text.trim();
      if (!trimmed) return customToast.error("Message can't be empty");
      if (trimmed === (editingMessage.text || "").trim()) return cancelEdit();
      const ok = await editGroupMessage(
        group.id,
        editingMessage.id,
        trimmed,
        activeMentions,
      );
      if (ok) cancelEdit();
      return;
    }

    if (!text.trim() && !file) return;
    stopTyping();
    // The store encrypts the text (group key) before upload and never falls
    // back to plaintext. A video picked via the paperclip is detected inside
    // the store (attachment.type starts with "video/").
    sendMessage({
      text,
      imageFile: fileIsImage ? file : null,
      attachment: file && !fileIsImage ? file : null,
      replyTo: replyingTo,
      isViewOnce,
      mentions: activeMentions,
    });
    setIsViewOnce(false);
    setText("");
    setSelectedMentions([]);
    setMentionState({
      open: false,
      query: "",
      triggerIndex: -1,
      activeIndex: 0,
    });
    clearFile();
    setReplyingTo(null);
    setShowEmoji(false);
    setShowTools(false);
  };

  const handleKeyDown = (e) => {
    if (mentionState.open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState((prev) => {
          const len = filteredMentionItems.length;
          if (len === 0) return prev;
          return { ...prev, activeIndex: (prev.activeIndex + 1) % len };
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState((prev) => {
          const len = filteredMentionItems.length;
          if (len === 0) return prev;
          return { ...prev, activeIndex: (prev.activeIndex - 1 + len) % len };
        });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (filteredMentionItems.length > 0) {
          e.preventDefault();
          const chosen =
            filteredMentionItems[mentionState.activeIndex] ||
            filteredMentionItems[0];
          handleSelectMention(chosen);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, open: false }));
        return;
      }
    }

    if (e.key === "Escape") {
      if (editingMessage) {
        e.preventDefault();
        return cancelEdit();
      }
      if (replyingTo) {
        e.preventDefault();
        return setReplyingTo(null);
      }
    }
    if (e.key !== "Enter") return;
    if (e.nativeEvent?.isComposing) return;
    // phones: Enter = new line, send with the button
    if (isTouch) return;
    const wantsSend = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
    if (wantsSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    stopTyping();
    setShowEmoji(false);
    setShowTools(false);
    recorder.start();
  };

  const openVideoRecorder = () => {
    stopTyping();
    setShowEmoji(false);
    setShowTools(false);
    setShowVideoRecorder(true);
  };

  const pickFromInput = (kind) => (e) => {
    selectFile(e.target.files?.[0], kind);
    e.target.value = "";
  };
  const pickImage = pickFromInput("image");
  const pickDoc = pickFromInput("file");

  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find(
      (i) => i.kind === "file",
    );
    const f = item?.getAsFile();
    if (f) {
      e.preventDefault();
      selectFile(f, "any");
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0], "any");
  };

  /* ---- popover / sheet data ---- */
  const popoverMessage = popover
    ? list.find((m) => sameId(m.id, popover.id))
    : null;
  const popoverIsMine = popoverMessage
    ? sameId(popoverMessage.senderId, myId)
    : false;
  const popoverFlags = popoverMessage
    ? getFlags(
        popoverMessage,
        popoverIsMine,
        canDM,
        canDA,
        isAdminOrOwner,
        canPinSetting,
      )
    : null;
  const myReaction = popoverMessage
    ? (popoverMessage.reactions || []).find((r) => sameId(r.userId, myId))
        ?.emoji
    : null;

  const renderMenuItems = (f, msg, large) => (
    <>
      {/* Section 1: Actions */}
      {f.canReply && (
        <MenuItem
          large={large}
          icon={Reply}
          label="Reply"
          onClick={() => handleReply(msg)}
        />
      )}
      {!f.isDeleted && (
        <MenuItem
          large={large}
          icon={MessageSquareText}
          label="Reply in Thread"
          onClick={() => {
            openThread(msg, group?.id);
            closePopover();
          }}
        />
      )}
      {!f.isDeleted && (
        <MenuItem
          large={large}
          icon={Bookmark}
          label="Save Message"
          onClick={() => {
            setSavingMessage(msg);
            closePopover();
          }}
        />
      )}
      {f.canForward && (
        <MenuItem
          large={large}
          icon={Forward}
          label="Forward"
          onClick={() => handleForward(msg)}
        />
      )}
      {!f.isDeleted && (
        <MenuItem
          large={large}
          icon={Star}
          label={msg.isStarred ? "Unstar" : "Star"}
          onClick={() => handleToggleStar(msg)}
        />
      )}
      {f.canPin && (
        <MenuItem
          large={large}
          icon={f.isPinned ? PinOff : Pin}
          label={f.isPinned ? "Unpin" : "Pin"}
          onClick={() => handleTogglePin(msg)}
        />
      )}
      {f.canEdit && (
        <MenuItem
          large={large}
          icon={Pencil}
          label="Edit"
          onClick={() => handleEdit(msg)}
        />
      )}
      {(f.canReply ||
        f.canForward ||
        !f.isDeleted ||
        f.canPin ||
        f.canEdit) && <div className="my-1 border-t border-base-300" />}

      {/* Section 2: Copy */}
      {f.hasText && (
        <MenuItem
          large={large}
          icon={Copy}
          label="Copy text"
          onClick={() => handleCopyText(msg)}
        />
      )}
      {f.hasImage && (
        <>
          <MenuItem
            large={large}
            icon={ImageIcon}
            label="Copy image"
            onClick={() => handleCopyImage(msg)}
          />
          <MenuItem
            large={large}
            icon={Link2}
            label="Copy image link"
            onClick={() => handleCopyLink(msg)}
          />
        </>
      )}
      {f.hasFileUrl && (
        <MenuItem
          large={large}
          icon={Link2}
          label="Copy file link"
          onClick={() => handleCopyFileLink(msg)}
        />
      )}
      {f.hasAudio && (
        <MenuItem
          large={large}
          icon={Link2}
          label="Copy voice message link"
          onClick={() => handleCopyAudioLink(msg)}
        />
      )}
      {f.hasVideo && (
        <MenuItem
          large={large}
          icon={Link2}
          label="Copy video link"
          onClick={() => handleCopyVideoLink(msg)}
        />
      )}
      {f.hasLocation && (
        <>
          <MenuItem
            large={large}
            icon={MapPin}
            label="Open in Maps"
            onClick={() => handleOpenMaps(msg)}
          />
          <MenuItem
            large={large}
            icon={Link2}
            label="Copy location link"
            onClick={() => handleCopyLocationLink(msg)}
          />
        </>
      )}
      {copyCount(f) > 0 && (f.canDeleteForMe || f.canDeleteForAll) && (
        <div className="my-1 border-t border-base-300" />
      )}

      {/* Section 3: Delete */}
      {f.canDeleteForMe && (
        <MenuItem
          large={large}
          icon={Trash2}
          label="Delete for me"
          onClick={() => handleDeleteForMe(msg)}
        />
      )}
      {f.canDeleteForAll && (
        <MenuItem
          large={large}
          icon={Trash2}
          label="Delete for everyone"
          danger
          onClick={() => askDeleteForEveryone(msg)}
        />
      )}
    </>
  );

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-base-100 lg:min-w-[360px]">
          {/* ---------------- Single Merged Header ---------------- */}
          <GroupChatHeader
            group={group}
            onlineCount={onlineCount}
            typingText={typingText}
            onToggleInfo={onToggleInfo}
            onManage={onManage}
            closeGroup={closeGroup}
            startGroupCall={startGroupCall}
            hasActiveGroupCall={hasActiveGroupCall}
            callBlocked={callBlocked}
            avatarSrc={avatarSrc}
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            searching={searching}
            scheduledCount={scheduled.length}
            onOpenScheduled={() => setShowScheduled(true)}
            pinnedCount={pinned.length}
            onOpenPinned={() => setShowPinnedModal(true)}
            isSharingLive={Boolean(myShare)}
            onOpenLocation={openLocationModal}
            isArchived={isArchived}
            onArchive={toggleArchive}
            onLeaveGroup={handleLeaveGroup}
            onOpenDisappearing={() => setShowDisappearing(true)}
          />

          {/* Group Search Results collapse bar */}
          <AnimatePresence>
            {searchOpen && searchQ.trim().length >= 2 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-b border-base-300 bg-base-100"
              >
                <div className="max-h-56 overflow-y-auto">
                  {!searching && searchResults.length === 0 && (
                    <p className="px-4 py-3 text-sm text-base-content/60">
                      No messages found in this group.
                    </p>
                  )}
                  {searchResults.map((r, i) => (
                    <button
                      type="button"
                      key={r.id || r.clientId || i}
                      onClick={() => scrollToMessage(r.id)}
                      className="block w-full px-4 py-2 text-left hover:bg-base-200 transition-colors"
                    >
                      <span className="flex items-center justify-between gap-2 text-xs text-base-content/60">
                        <span>
                          {r.sender?.fullName ||
                            (sameId(r.senderId, myId) ? "You" : "Member")}
                        </span>
                        <span>{formatTime(r.createdAt)}</span>
                      </span>
                      <span className="block truncate text-sm text-base-content">
                        {displayText(r) || r.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <GroupCallBanner group={group} />

          <AnimatePresence initial={false}>
            {undecryptedCount > 0 && !isGroupMessagesLoading && (
              <motion.div
                key="e2ee-banner"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="overflow-hidden border-b border-base-300 bg-warning/10"
                role="status"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm">
                  <Lock className="size-3.5 shrink-0 text-warning" />
                  <span className="min-w-0 flex-1 truncate">
                    {undecryptedCount === 1
                      ? "1 message is waiting for the encryption key"
                      : `${undecryptedCount} messages are waiting for the encryption key`}
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryDecrypt}
                    disabled={retryingKeys}
                    className="btn btn-ghost btn-xs shrink-0 gap-1"
                  >
                    {retryingKeys ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RotateCw className="size-3" />
                    )}
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {liveBarText && (
              <motion.div
                key="live-bar"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="overflow-hidden border-b border-base-300 bg-success/10"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm">
                  <span className="relative flex size-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{liveBarText}</span>
                  {myShare && (
                    <button
                      type="button"
                      onClick={handleStopFromBar}
                      disabled={stoppingBar}
                      className="btn btn-error btn-outline btn-xs shrink-0"
                    >
                      {stoppingBar ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Stop"
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinned banner */}
          <PinnedBanner
            pin={currentPin}
            index={pinIndex}
            total={pinned.length}
            previewText={currentPin ? replyPreviewText(currentPin) : ""}
            onJump={() => {
              if (!currentPin) return;
              scrollToMessage(currentPin.id);
              setPinIndex((i) => (i + 1) % pinned.length);
            }}
            onUnpin={() => currentPin && togglePin(group.id, currentPin.id)}
            onViewAll={() => setShowPinnedModal(true)}
          />

          <div
            ref={listRef}
            onScroll={handleListScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-base-200/40 px-3 py-3.5 sm:px-5 md:px-6 lg:px-8 sm:py-5 [scrollbar-gutter:stable]"
          >
            {isGroupMessagesLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-base-content/40" />
              </div>
            )}

            {!isGroupMessagesLoading && (
              <E2EENotice onOpen={() => setE2eeInfoOpen(true)} isGroup={true} />
            )}

            {!isGroupMessagesLoading && timeline.length === 0 && (
              <motion.div
                {...fade}
                className="flex flex-col items-center justify-center text-center gap-3 px-6 py-10"
              >
                <div className="size-14 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center">
                  <MessageSquareText className="size-6 text-base-content/50" />
                </div>
                <div>
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm text-base-content/60">
                    Say hi to {group.name} to start the conversation.
                  </p>
                </div>
              </motion.div>
            )}

            {timeline.map((item, i) =>
              item.kind === "call" ? (
                <GroupCallLog
                  key={item.id}
                  item={item}
                  prev={timeline[i - 1]}
                  s={s}
                  cs={cs}
                  disabled={callBlocked}
                  onCallBack={() =>
                    startGroupCall(group.id, item.call.type, group.name)
                  }
                />
              ) : (
                <MessageRow
                  key={item.clientId || item.id}
                  m={item}
                  prev={timeline[i - 1]}
                  next={timeline[i + 1]}
                  group={group}
                  myId={myId}
                  authUser={authUser}
                  cs={cs}
                  s={s}
                  largeEmoji={largeEmoji}
                  isTouch={isTouch}
                  reactOpen={
                    popover?.type === "react" && sameId(popover.id, item.id)
                  }
                  menuOpen={
                    popover?.type === "menu" && sameId(popover.id, item.id)
                  }
                  canReact={canReact}
                  canDM={canDM}
                  canDA={canDA}
                  isAdminOrOwner={isAdminOrOwner}
                  canPinSetting={canPinSetting}
                  highlighted={sameId(highlightId, item.id || item._id)}
                  share={
                    item.location?.shareId
                      ? liveShares?.[group.id]?.[item.location.shareId]
                      : undefined
                  }
                  h={handlersRef}
                />
              ),
            )}
          </div>

          {/* ---------------- Input ---------------- */}
          <div className="relative border-t border-base-300 bg-base-100 px-3 pt-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] sm:px-5 md:px-6 lg:px-8 sm:py-3.5">
            {/* Reply bar */}
            <CollapseBar show={Boolean(replyingTo) && !editingMessage}>
              <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-primary bg-base-200 px-3 py-1.5">
                <Reply className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    Replying to{" "}
                    {sameId(replyingTo?.senderId, myId)
                      ? "yourself"
                      : group.members?.find((m) =>
                          sameId(m.id, replyingTo?.senderId),
                        )?.fullName || "Member"}
                  </p>
                  <p className="truncate text-xs text-base-content/70">
                    {replyPreviewText(replyingTo)}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                >
                  <X className="size-4" />
                </motion.button>
              </div>
            </CollapseBar>

            {/* Edit bar */}
            <CollapseBar show={Boolean(editingMessage)}>
              <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-warning bg-base-200 px-3 py-1.5">
                <Pencil className="size-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    Editing message
                  </p>
                  <p className="truncate text-xs text-base-content/70">
                    {editingMessage?.text}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={cancelEdit}
                  aria-label="Cancel edit"
                >
                  <X className="size-4" />
                </motion.button>
              </div>
            </CollapseBar>

            <AnimatePresence initial={false}>
              {file && (
                <motion.div
                  key="attachment-preview"
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.12 },
                  }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="relative inline-block max-w-full mb-2"
                >
                  {fileIsImage ? (
                    preview && (
                      <img
                        src={preview}
                        alt="Preview"
                        className="h-20 rounded-lg object-cover"
                      />
                    )
                  ) : (
                    <div className="flex w-64 max-w-full items-center gap-3 rounded-xl border border-base-300 bg-base-200 p-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        {PreviewIcon && <PreviewIcon className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {file.name}
                        </span>
                        <span className="block text-xs text-base-content/60">
                          {formatFileSize(file.size)}
                        </span>
                      </span>
                    </div>
                  )}
                  <motion.button
                    type="button"
                    onClick={clearFile}
                    whileTap={{ scale: 0.85 }}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-base-300 flex items-center justify-center"
                    aria-label="Remove attachment"
                  >
                    <X className="size-3" />
                  </motion.button>

                  {/* View Once Media Toggle */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsViewOnce((v) => !v)}
                    className={`mt-1.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      isViewOnce
                        ? "bg-primary text-primary-content border-primary"
                        : "bg-base-200/80 text-base-content/70 border-base-300 hover:bg-base-300"
                    }`}
                    title={
                      isViewOnce
                        ? "View once is ON (will be deleted after viewed)"
                        : "Turn on View Once"
                    }
                  >
                    <span className="flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                      1
                    </span>
                    <span>{isViewOnce ? "View Once Active" : "View Once"}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  key="emoji-picker"
                  data-emoji-ui
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.97,
                    y: 4,
                    transition: { duration: 0.1 },
                  }}
                  transition={{ duration: 0.18, ease: EASE }}
                  style={{ transformOrigin: "bottom left" }}
                  className="absolute bottom-full left-2 sm:left-3 mb-2 z-40 max-w-[calc(100%-1rem)]"
                >
                  <EmojiPicker
                    theme="auto"
                    width={Math.min(350, window.innerWidth - 24)}
                    height={Math.min(420, Math.round(window.innerHeight * 0.5))}
                    lazyLoadEmojis
                    searchPlaceHolder="Search"
                    previewConfig={{ showPreview: false }}
                    onEmojiClick={(emojiData) => {
                      setText((t) => (t + emojiData.emoji).slice(0, 2000));
                      textRef.current?.focus();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording bar */}
            {recorderBusy && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-2 sm:px-3 py-2"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-ghost btn-sm btn-circle text-error"
                  onClick={recorder.cancel}
                  aria-label="Cancel recording"
                  title="Cancel"
                >
                  <Trash2 className="size-5" />
                </motion.button>

                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-error" />
                </span>

                <span className="font-mono text-sm tabular-nums">
                  {formatDuration(recorder.seconds)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-base-content/50">
                  {recorder.state === "requesting"
                    ? "Waiting for microphone…"
                    : `Recording · max ${formatDuration(MAX_VOICE_SECONDS)}`}
                </span>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-primary btn-sm btn-circle"
                  onClick={recorder.stop}
                  disabled={recorder.state !== "recording"}
                  aria-label="Send voice message"
                  title="Send"
                >
                  <Send className="size-4" />
                </motion.button>
              </div>
            )}

            {!recorderBusy && (
              <form
                onSubmit={handleSend}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-wrap sm:flex-nowrap items-end sm:items-center gap-1.5 sm:gap-2 rounded-2xl border px-2 sm:px-3 py-1.5 sm:py-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
                  isDragging
                    ? "border-primary border-dashed bg-primary/10"
                    : "border-base-300"
                }`}
              >
                {/* @Mention Autocomplete Dropdown */}
                {mentionState.open && (
                  <MentionDropdown
                    members={group?.members || []}
                    query={mentionState.query}
                    activeIndex={mentionState.activeIndex}
                    onSelect={handleSelectMention}
                    onClose={() =>
                      setMentionState((prev) => ({ ...prev, open: false }))
                    }
                    currentUserId={myId}
                    onlineSet={onlineUsersSet}
                    canMentionAll={canMentionAll}
                  />
                )}
                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      key="drop-overlay"
                      {...fade}
                      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-base-100/85 text-sm font-medium text-primary"
                    >
                      Drop file to attach
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tools: image / file / video / emoji / poll / AI.
                  Phones: hidden behind the "+" button, shown as their own row.
                  sm and up: inline like before. */}
                <div
                  className={`${
                    showTools ? "flex" : "hidden"
                  } sm:flex order-1 w-full sm:w-auto items-center gap-1 pb-1.5 sm:pb-0 border-b border-base-300/60 sm:border-0`}
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => imageRef.current?.click()}
                    aria-label="Send image"
                    title="Send image"
                  >
                    <ImageIcon className="size-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Send file"
                    title="Send file"
                  >
                    <Paperclip className="size-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={openVideoRecorder}
                    aria-label="Record video message"
                    title="Record video message"
                  >
                    <Video className="size-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    data-emoji-ui
                    whileTap={{ scale: 0.88 }}
                    className={`btn btn-ghost btn-sm btn-circle ${showEmoji ? "text-primary" : ""}`}
                    onClick={() => setShowEmoji((v) => !v)}
                    aria-label="Emoji"
                    aria-expanded={showEmoji}
                  >
                    <Smile className="size-5" />
                  </motion.button>

                  {/* ---- Poll button ---- */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => setShowCreatePoll(true)}
                    disabled={Boolean(editingMessage)}
                    aria-label="Create poll"
                    title="Create poll"
                  >
                    <BarChart2 className="size-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="btn btn-ghost btn-sm btn-circle text-amber-500 hover:text-amber-600"
                    onClick={() => setShowGiftModal(true)}
                    disabled={Boolean(editingMessage)}
                    aria-label="Send gift"
                    title="Send a gift"
                  >
                    <Gift className="size-5" />
                  </motion.button>

                  <AiAssist
                    text={text}
                    resetKey={group.id}
                    onApply={(v) => {
                      setText(v);
                      textRef.current?.focus();
                    }}
                  />
                </div>

                {/* "+" toggle (phones only) */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className="order-2 sm:hidden btn btn-ghost btn-sm btn-circle shrink-0"
                  onClick={() => setShowTools((v) => !v)}
                  aria-label="More attachments"
                  aria-expanded={showTools}
                >
                  <Plus
                    className={`size-5 transition-transform duration-200 ${
                      showTools ? "rotate-45" : ""
                    }`}
                  />
                </motion.button>

                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={pickImage}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  hidden
                  onChange={pickDoc}
                />

                <textarea
                  ref={textRef}
                  rows={1}
                  value={text}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  maxLength={2000}
                  placeholder={editingMessage ? "Edit message..." : "Message"}
                  // 16px on phones stops iOS from zooming the page on focus
                  className="order-3 flex-1 min-w-0 resize-none bg-transparent outline-none py-1.5 text-base sm:text-sm max-h-[120px]"
                />

                {/* Schedule button */}
                {canSchedule && (
                  <motion.button
                    key="schedule-btn"
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className={`order-4 shrink-0 btn btn-ghost btn-sm btn-circle transition-colors cursor-pointer ${
                      text.trim()
                        ? "text-primary hover:bg-primary/15"
                        : "text-base-content/60 hover:text-primary hover:bg-base-200"
                    }`}
                    onClick={() => setShowSchedule(true)}
                    aria-label="Schedule message"
                    title={
                      text.trim()
                        ? "Schedule message for later"
                        : "Schedule a message"
                    }
                  >
                    <Clock className="size-4" />
                  </motion.button>
                )}

                {/* Send when there's content, otherwise record a voice note */}
                {text.trim() || file ? (
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.88 }}
                    className="order-4 shrink-0 btn btn-primary btn-sm btn-circle"
                    aria-label="Send"
                  >
                    <Send className="size-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    className="order-4 shrink-0 btn btn-primary btn-sm btn-circle"
                    onClick={startRecording}
                    aria-label="Record voice message"
                    title="Record voice message"
                  >
                    <Mic className="size-4" />
                  </motion.button>
                )}
              </form>
            )}

            {!recorderBusy && (
              <p className="hidden sm:flex items-center gap-1 mt-1.5 px-1 text-[11px] text-base-content/50">
                <Lock className="size-3 shrink-0" />
                <span>
                  {enterToSend
                    ? "Enter to send · Shift+Enter for a new line"
                    : "Enter for a new line · Ctrl+Enter to send"}
                </span>
              </p>
            )}
          </div>

          {/* ---------------- Video recorder ---------------- */}
          {showVideoRecorder && (
            <VideoRecorderModal
              maxSeconds={MAX_VIDEO_SECONDS}
              onClose={() => setShowVideoRecorder(false)}
              onSend={(video) => {
                // video = { blob, duration, mimeType }
                sendMessage({ video });
                setShowVideoRecorder(false);
              }}
            />
          )}

          {/* ---------------- Desktop: reaction picker + options menu ---------------- */}
          {createPortal(
            <AnimatePresence>
              {popover &&
                popover.type !== "sheet" &&
                popoverMessage &&
                popoverFlags && (
                  <motion.div
                    key={`${popover.type}-${popover.id}`}
                    data-popover-ui
                    role={popover.type === "react" ? "toolbar" : "menu"}
                    aria-label={
                      popover.type === "react" ? "Reactions" : undefined
                    }
                    {...popIn}
                    style={{
                      top: popover.top,
                      left: popover.left,
                      width: popover.type === "react" ? REACT_W : MENU_W,
                      transformOrigin: "top center",
                    }}
                    className={
                      popover.type === "react"
                        ? "fixed z-50 flex items-center justify-between rounded-full bg-base-100 border border-base-300 shadow-xl px-1.5 py-1"
                        : "fixed z-50 rounded-xl bg-base-100 border border-base-300 shadow-xl py-1 overflow-hidden"
                    }
                  >
                    {popover.type === "react"
                      ? QUICK_REACTIONS.map((emoji) => (
                          <motion.button
                            key={emoji}
                            type="button"
                            whileHover={{ scale: 1.25 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 22,
                            }}
                            onClick={() => {
                              reactToMessage?.(popoverMessage.id, emoji);
                              closePopover();
                            }}
                            className={`size-9 rounded-full text-xl flex items-center justify-center ${
                              myReaction === emoji ? "bg-primary/15" : ""
                            }`}
                          >
                            {emoji}
                          </motion.button>
                        ))
                      : renderMenuItems(popoverFlags, popoverMessage, false)}
                  </motion.div>
                )}
            </AnimatePresence>,
            document.body,
          )}

          {/* ---------------- Mobile: bottom sheet (tap a bubble) ---------------- */}
          {createPortal(
            <AnimatePresence>
              {popover?.type === "sheet" && popoverMessage && popoverFlags && (
                <>
                  <motion.div
                    key="sheet-backdrop"
                    {...fade}
                    className="fixed inset-0 z-50 bg-black/40"
                    onClick={closePopover}
                  />
                  <motion.div
                    key="sheet"
                    data-popover-ui
                    role="menu"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%", transition: { duration: 0.15 } }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl border-t border-base-300 bg-base-100 shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                  >
                    <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-base-300" />

                    {canReact && !popoverFlags.isDeleted && (
                      <div className="flex items-center justify-around px-3 py-3 border-b border-base-300">
                        {QUICK_REACTIONS.map((emoji) => (
                          <motion.button
                            key={emoji}
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            onClick={() => {
                              reactToMessage?.(popoverMessage.id, emoji);
                              closePopover();
                            }}
                            className={`size-11 rounded-full text-2xl flex items-center justify-center ${
                              myReaction === emoji ? "bg-primary/15" : ""
                            }`}
                            aria-label={`React ${emoji}`}
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    <div className="py-1">
                      {renderMenuItems(popoverFlags, popoverMessage, true)}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body,
          )}

          {/* ---------------- E2EE: "Learn more" modal / bottom sheet ---------------- */}
          {createPortal(
            <AnimatePresence>
              {e2eeInfoOpen && (
                <motion.div
                  key="e2ee-info-modal"
                  {...fade}
                  className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
                  onClick={() => setE2eeInfoOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="e2ee-info-title"
                >
                  <motion.div
                    {...modalCard}
                    className="w-full max-w-sm rounded-t-2xl border border-base-300 bg-base-100 p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center text-center">
                      <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
                        <ShieldCheck className="size-7" />
                      </span>
                      <h3
                        id="e2ee-info-title"
                        className="mt-3 text-lg font-semibold"
                      >
                        End-to-end encrypted
                      </h3>
                      <p className="mt-1 text-sm text-base-content/60">
                        Text messages sent to {group.name} are secured with a
                        lock. Only the people in this group have the key.
                      </p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <E2EEPoint
                        icon={Users}
                        title="Only group members can read"
                        text="Messages are encrypted on your device before they are sent and decrypted only on the devices of this group's members."
                      />
                      <E2EEPoint
                        icon={Lock}
                        title="Not even the server can read them"
                        text="The server only stores encrypted text. It does not have the key, so it can't read your messages."
                      />
                      <E2EEPoint
                        icon={ShieldCheck}
                        title="Always on"
                        text="Encryption is automatic for every text message in this chat. There is nothing to turn on."
                      />
                    </div>

                    <p className="mt-5 rounded-xl bg-base-200 p-3 text-[11px] leading-relaxed text-base-content/60">
                      Note: shared locations are not end-to-end encrypted,
                      because the server needs the coordinates to deliver live
                      updates.
                    </p>

                    <button
                      type="button"
                      autoFocus
                      className="btn btn-primary btn-sm mt-4 w-full"
                      onClick={() => setE2eeInfoOpen(false)}
                    >
                      Got it
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

          {/* ---------------- LOCATION: share modal / bottom sheet ---------------- */}
          {createPortal(
            <AnimatePresence>
              {locationOpen && (
                <motion.div
                  key="location-modal"
                  {...fade}
                  className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
                  onClick={() => !locBusy && setLocationOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="location-title"
                >
                  <motion.div
                    {...modalCard}
                    className="w-full max-w-sm rounded-t-2xl border border-base-300 bg-base-100 p-4 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <MapPin className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 id="location-title" className="font-semibold">
                          Share location
                        </h3>
                        <p className="truncate text-xs text-base-content/60">
                          with {group.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => setLocationOpen(false)}
                        disabled={locBusy}
                        aria-label="Close"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* 1) one-time pin */}
                    <button
                      type="button"
                      onClick={handleSendCurrent}
                      disabled={locBusy}
                      className="mt-4 flex w-full items-center gap-3 rounded-xl border border-base-300 p-3 text-left transition-colors hover:bg-base-200 disabled:opacity-60"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-base-200">
                        {locBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MapPin className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          Send current location
                        </span>
                        <span className="block text-xs text-base-content/60">
                          One-time pin, doesn't update
                        </span>
                      </span>
                    </button>

                    {/* 2) live location */}
                    <div className="mt-3 rounded-xl border border-base-300 p-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                          <Navigation className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            Share live location
                          </span>
                          <span className="block text-xs text-base-content/60">
                            Updates for everyone while you move
                          </span>
                        </span>
                      </div>

                      {myShare ? (
                        <div className="mt-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs text-base-content/60">
                            <Clock className="size-3.5" />
                            You're already sharing
                            {myShare.expiresAt
                              ? ` until ${clockTime(myShare.expiresAt)}`
                              : ""}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await handleStopLive(myShare.shareId);
                              if (ok) setLocationOpen(false);
                            }}
                            className="btn btn-error btn-outline btn-sm w-full"
                          >
                            Stop sharing
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="mt-3 grid grid-cols-3 gap-2"
                            role="radiogroup"
                            aria-label="Duration"
                          >
                            {LIVE_DURATIONS.map((d) => (
                              <button
                                key={d.min}
                                type="button"
                                role="radio"
                                aria-checked={liveMin === d.min}
                                onClick={() => setLiveMin(d.min)}
                                disabled={locBusy}
                                className={`btn btn-sm ${
                                  liveMin === d.min
                                    ? "btn-primary"
                                    : "btn-ghost border border-base-300"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={handleStartLive}
                            disabled={locBusy}
                            className="btn btn-primary btn-sm mt-3 w-full"
                          >
                            {locBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Start sharing"
                            )}
                          </button>
                        </>
                      )}
                    </div>

                    <p className="mt-3 text-[11px] leading-snug text-base-content/50">
                      Live location keeps updating while this tab is open. You
                      can stop sharing anytime. Unlike text messages, location
                      is not end-to-end encrypted because the server needs the
                      coordinates to deliver updates.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

          {/* Delete for everyone confirm */}
          {createPortal(
            <AnimatePresence>
              {confirmId && (
                <motion.div
                  key="confirm-delete"
                  {...fade}
                  className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                  onClick={() => setConfirmId(null)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-delete-title"
                >
                  <motion.div
                    {...modalCard}
                    className="w-full max-w-sm rounded-2xl bg-base-100 border border-base-300 shadow-2xl p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 shrink-0 rounded-full bg-error/10 text-error flex items-center justify-center">
                        <Trash2 className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 id="confirm-delete-title" className="font-semibold">
                          Delete for everyone?
                        </h3>
                        <p className="mt-1 text-sm text-base-content/60">
                          This message will be removed for everyone in{" "}
                          {group.name}. This can't be undone.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        autoFocus
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={confirmDeleteForEveryone}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

          {/* Forward modal */}
          <AnimatePresence>
            {forwardMsg && (
              <ForwardModal
                key="forward"
                candidates={forwardCandidates}
                myId={myId}
                onClose={() => setForwardMsg(null)}
                onConfirm={handleConfirmForward}
              />
            )}
          </AnimatePresence>

          {/* Pinned messages modal */}
          <AnimatePresence>
            {showPinnedModal && (
              <PinnedMessagesModal
                key="pinned-messages"
                open={showPinnedModal}
                pinned={pinned}
                myId={myId}
                canPin={canPinSetting || isAdminOrOwner}
                onJump={(id) => scrollToMessage(id)}
                onUnpin={(id) => togglePin(group.id, id)}
                onClose={() => setShowPinnedModal(false)}
              />
            )}

            {showGiftModal && (
              <GiftPickerModal
                isOpen={showGiftModal}
                onClose={() => setShowGiftModal(false)}
                recipientName={group?.name || "Group"}
                recipientAvatar={group?.avatar || ""}
                groupId={group?.id || group?._id}
                isGroup={true}
              />
            )}
          </AnimatePresence>

          {/* Image viewer */}
          <AnimatePresence>
            {previewSrc && (
              <motion.div
                key="image-viewer"
                {...fade}
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4"
                onClick={() => setPreviewSrc(null)}
                role="dialog"
                aria-modal="true"
              >
                <button
                  type="button"
                  className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 btn btn-circle btn-sm"
                  onClick={() => setPreviewSrc(null)}
                  aria-label="Close image"
                >
                  <X className="size-4" />
                </button>
                <motion.img
                  src={previewSrc}
                  alt="Attachment preview"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: { duration: 0.1 },
                  }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="max-h-full max-w-full rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule modal */}
          <AnimatePresence>
            {showSchedule && (
              <ScheduleModal
                key="schedule-modal"
                text={text.trim()}
                recipient={group}
                isGroup={true}
                onClose={() => setShowSchedule(false)}
                onConfirm={confirmSchedule}
              />
            )}
          </AnimatePresence>

          {/* Scheduled list modal */}
          <AnimatePresence>
            {showScheduled && (
              <ScheduledModal
                key="scheduled-modal"
                items={scheduled}
                recipient={group}
                isGroup={true}
                onClose={() => setShowScheduled(false)}
                onCancel={cancelScheduled}
                onEdit={(id, newText, newTime) =>
                  editScheduledMessage(id, group?.id, newText, newTime)
                }
                onSendNow={(id) => sendScheduledNow(id, group?.id)}
                onOpenSchedule={() => {
                  setShowScheduled(false);
                  setShowSchedule(true);
                }}
              />
            )}
          </AnimatePresence>

          {/* Create poll modal */}
          {showCreatePoll && (
            <CreatePollModal
              isGroup={true}
              targetId={group?.id}
              onClose={() => setShowCreatePoll(false)}
            />
          )}

          {/* Save message modal */}
          {savingMessage && (
            <SaveMessageModal
              message={savingMessage}
              isGroup={true}
              onClose={() => setSavingMessage(null)}
            />
          )}

          {/* View once media modal */}
          {viewOnceMessage && (
            <ViewOnceMediaModal
              message={viewOnceMessage}
              isGroup={true}
              groupId={group?.id}
              onClose={() => setViewOnceMessage(null)}
            />
          )}

          {/* Group disappearing settings modal */}
          {showDisappearing && (
            <DisappearingSettingsModal
              groupId={group?.id}
              currentDuration={group?.disappearAfter || 0}
              onClose={() => setShowDisappearing(false)}
              onUpdated={(sec) => setGroupDisappearing?.(group?.id, sec)}
            />
          )}
        </div>

        {/* Dedicated Group Message Thread Panel */}
        {activeThread && !isInfoOpen && (
          <ThreadPanel
            parentMessage={activeThread.parentMessage}
            replies={activeThread.replies}
            loading={activeThread.loading}
            isGroup={true}
            groupId={activeThread.groupId || group?.id}
            onClose={closeThread}
            onSendReply={sendThreadReply}
            onToggleReaction={(msgId, emoji) =>
              reactToGroupMessage(
                activeThread.groupId || group?.id,
                msgId,
                emoji,
              )
            }
          />
        )}
      </div>
    </MotionConfig>
  );
};

export default GroupChatContainer;
