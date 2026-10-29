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
  Ban,
  Check,
  Clock,
  Copy,
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Flag,
  Forward,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  Mic,
  MoreVertical,
  Paperclip,
  Pencil,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Pin,
  PinOff,
  Plus,
  Reply,
  RotateCw,
  Send,
  ShieldCheck,
  Smile,
  Timer,
  Trash2,
  User,
  X,
  MessageSquareText,
  SmilePlus,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useAppearanceStore } from "../../store/useAppearanceStore.js";
import { usePrivacyStore } from "../../store/usePrivacyStore.js";
import { useChatPrefsStore } from "../../store/useChatPrefsStore.js";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useCall } from "../../context/CallContext";
import { useIsBlocked, BlockedBanner } from "../../hooks/useIsBlocked";
import { chatStyle, formatTime } from "../../hooks/useApplySettings";
import useVoiceRecorder, {
  MAX_VOICE_SECONDS,
} from "../../hooks/useVoiceRecorder";
import useVideoRecorder, {
  MAX_VIDEO_SECONDS,
} from "../../hooks/useVideoRecorder";
// ---- E2EE ----
import { whenE2EEReady } from "../../lib/e2ee.js";
import { displayText } from "../../lib/e2eeMessages.js";

import ChatHeader from "./Common/ChatHeader";
import MessageSkeleton from "../Skeleton/MessageSkeleton";
import AiAssist from "../common/AiAssist.jsx";
import VoiceMessage, { formatDuration } from "./VoiceMessage.jsx";
import VideoMessage from "./VideoMessage.jsx";
import {
  copyImageLink,
  copyMessageImage,
  copyMessageText,
} from "../../lib/messageActions.js";

// Motion kit (must live in the same folder as this file)
import {
  AnimatedTicks,
  CollapseBar,
  ImageViewer,
  Modal,
  PinnedBanner,
  PopoverShell,
  ReactionButton,
  ScrollToBottomFab,
  SendMicButton,
  TypingBubble,
  spring,
  springSnappy,
  springSoft,
} from "./chatMotionKit.jsx";

import ChatToolbar from "./Common/ChatToolBar.jsx";

import LocationMessage from "../Location/LocationMessage.jsx";
import ShareLocationModal from "../Location/ShareLocationModel.jsx";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MENU_W = 208;
const REACT_W = 248;
const REACT_H = 48;

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_PINS = 3;
const MAX_FORWARD_TARGETS = 5;

// E2EE: automatic "re-decrypt" attempts per chat open
const MAX_AUTO_DECRYPT_RETRIES = 2;
const AUTO_DECRYPT_DELAY_MS = 3000;

const TIMER_OPTIONS = [
  { seconds: 0, label: "Off" },
  { seconds: 24 * 3600, label: "24 hours" },
  { seconds: 7 * 24 * 3600, label: "7 days" },
  { seconds: 90 * 24 * 3600, label: "90 days" },
];

const timerLabel = (sec) =>
  TIMER_OPTIONS.find((o) => o.seconds === sec)?.label ||
  `${Math.round(sec / 3600)} hours`;

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
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

// avatar can be a string or { public_id, url }
const avatarSrc = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "./avatar.png";

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

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time
const toLocalInput = (date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

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

/* ------------------------------------------------------------------ */
/*  Reply helpers                                                      */
/* ------------------------------------------------------------------ */

// message.replyTo can be a populated object, a snapshot, or just an id
const resolveReply = (message, list) => {
  const r = message.replyTo;
  if (!r) return null;
  if (typeof r === "object") return { ...r, id: r.id || r._id };
  const found = list.find((m) => sameId(m.id, r));
  return found ? found : { id: r, missing: true };
};

const replyPreviewText = (r) => {
  if (!r || r.missing) return "Original message unavailable";
  if (r.isDeleted) return "This message was deleted";
  // E2EE: never show the placeholder / ciphertext of a locked message
  if (r.decryptFailed) return "🔒 Encrypted message";
  if (r.text) return r.text;
  if (r.image?.url) return "📷 Photo";
  if (r.file?.name) return `📎 ${r.file.name}`;
  if (r.audio?.url) return "🎤 Voice message";
  if (r.video?.url) return "🎥 Video";
  if (Number.isFinite(r.location?.lat)) return "📍 Location";
  return "Message";
};

/* ------------------------------------------------------------------ */
/*  File helpers                                                       */
/* ------------------------------------------------------------------ */

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  const val = bytes / 1024 ** i;
  return `${val >= 10 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
};

const isImageFile = (f) => Boolean(f?.type?.startsWith("image/"));

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

/* ------------------------------------------------------------------ */
/*  E2EE notice (WhatsApp style)                                       */
/*  Small yellow pill at the very top of the chat. Tap -> info modal.  */
/* ------------------------------------------------------------------ */
const E2EENotice = ({ onOpen }) => (
  <div className="flex justify-center px-1 pb-3 sm:pb-4">
    <button
      type="button"
      onClick={onOpen}
      className="max-w-md rounded-xl border border-warning/30 bg-warning/15 px-3 py-2 text-center text-xs leading-snug text-base-content/80 shadow-sm transition-colors hover:bg-warning/25 focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-[13px]"
    >
      <Lock className="mr-1 inline size-3 -translate-y-px" />
      Text messages in this chat are end-to-end encrypted. Only you and the
      other person can read them, not even the server. Tap to learn more.
    </button>
  </div>
);

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
const FileAttachment = ({ file, isMine, uploading = false, progress = 0 }) => {
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
          {uploading && progress > 0 ? ` · ${progress}%` : ""}
        </span>
        {uploading && (
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-current/15">
            <motion.span
              className="block h-full rounded-full bg-current opacity-70"
              initial={false}
              animate={{ width: `${Math.max(progress, 4)}%` }}
              transition={springSoft}
            />
          </span>
        )}
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

/* ------------------------------------------------------------------ */
/*  Reply quote (inside a bubble)                                      */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Link preview card (inside a bubble)                                */
/* ------------------------------------------------------------------ */
const LinkPreviewCard = ({ preview, isMine }) => (
  <motion.a
    href={preview.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={spring}
    whileTap={{ scale: 0.98 }}
    className={`mt-2 block w-56 sm:w-64 max-w-full overflow-hidden rounded-xl border text-left ${
      isMine
        ? "border-primary-content/20 bg-primary-content/10"
        : "border-base-300 bg-base-200"
    }`}
  >
    {preview.image && (
      <img
        src={preview.image}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.display = "none")}
        className="h-32 w-full object-cover"
      />
    )}
    <span className="block px-2.5 py-2">
      {preview.siteName && (
        <span className="block truncate text-[11px] uppercase opacity-60">
          {preview.siteName}
        </span>
      )}
      {preview.title && (
        <span className="block truncate text-sm font-medium">
          {preview.title}
        </span>
      )}
      {preview.description && (
        <span className="line-clamp-2 text-xs opacity-70">
          {preview.description}
        </span>
      )}
    </span>
  </motion.a>
);

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */
const DayChip = ({ value }) => (
  <div className="my-3 flex justify-center sm:my-4">
    <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs text-base-content/60">
      {dayLabel(value)}
    </span>
  </div>
);

// little audio-style bars for the voice recorder
const Equalizer = ({ active }) => (
  <span className="flex h-5 items-center gap-0.5" aria-hidden="true">
    {[0.55, 0.95, 0.65, 1, 0.75].map((h, i) => (
      <motion.span
        key={i}
        className="h-full w-0.5 rounded-full bg-primary"
        initial={{ scaleY: 0.25 }}
        animate={
          active ? { scaleY: [0.25, h, 0.3, h * 0.8, 0.25] } : { scaleY: 0.25 }
        }
        transition={{
          duration: 1.1,
          repeat: active ? Infinity : 0,
          delay: i * 0.12,
          ease: "easeInOut",
        }}
      />
    ))}
  </span>
);

/* ------------------------------------------------------------------ */
/*  1:1 call log row (shows inside the chat timeline)                  */
/* ------------------------------------------------------------------ */
const CallLogRow = ({ item, prev, s, onCallBack, disabled }) => {
  const c = item.call;
  const kind = c.type === "video" ? "Video" : "Voice";
  const incoming = c.direction === "incoming";
  const missedIn = c.status === "missed" && incoming;

  let title = `${kind} call`;
  let sub = "";
  if (c.status === "completed") sub = formatDuration(c.duration || 0);
  else if (c.status === "missed") {
    if (missedIn) title = `Missed ${kind.toLowerCase()} call`;
    else sub = "No answer";
  } else sub = c.status;

  const Icon = missedIn
    ? PhoneMissed
    : incoming
      ? PhoneIncoming
      : PhoneOutgoing;

  const showDay = !prev?.createdAt || !sameDay(prev.createdAt, item.createdAt);
  const time =
    item.createdAt && s.showTimestamps
      ? formatTime(item.createdAt, s.timeFormat)
      : "";

  return (
    <div>
      {showDay && <DayChip value={item.createdAt} />}
      <div className="my-2 flex justify-center">
        <div className="flex max-w-[92%] items-center gap-2.5 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-base-200 ${
              missedIn ? "text-error" : ""
            }`}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <div
              className={`truncate font-medium ${missedIn ? "text-error" : ""}`}
            >
              {title}
            </div>
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
/*  Message flags / menu sizing (pure)                                 */
/* ------------------------------------------------------------------ */
const messageFlags = (message, isMine) => {
  const isDeleted = Boolean(message.isDeleted);
  // E2EE: nothing to copy / edit / forward when the text could not be decrypted
  const decryptFailed = !isDeleted && Boolean(message.decryptFailed);
  const hasText = !isDeleted && !decryptFailed && Boolean(message.text);
  const hasAudio = !isDeleted && Boolean(message.audio?.url);
  const hasVideo = !isDeleted && Boolean(message.video?.url);
  const age = message.createdAt
    ? Date.now() - new Date(message.createdAt).getTime()
    : Infinity;
  return {
    isDeleted,
    decryptFailed,
    hasText,
    hasImage: !isDeleted && Boolean(message.image?.url),
    hasFile: !isDeleted && Boolean(message.file?.name),
    hasFileUrl: !isDeleted && Boolean(message.file?.url),
    hasAudio,
    hasVideo,
    hasLocation: !isDeleted && Number.isFinite(message.location?.lat),
    hasLinkPreview: !isDeleted && Boolean(message.linkPreview?.url),
    canDeleteForAll: isMine && !isDeleted,
    canReply: !isDeleted,
    canForward: !isDeleted && !decryptFailed,
    canPin: !isDeleted,
    canReport: !isMine && !isDeleted,
    isPinned: Boolean(message.isPinned),
    canEdit:
      isMine &&
      !isDeleted &&
      !decryptFailed &&
      hasText &&
      !hasAudio &&
      !hasVideo &&
      age < EDIT_WINDOW_MS,
  };
};

const menuHeight = ({
  hasText,
  hasImage,
  hasFileUrl,
  hasAudio,
  hasVideo,
  canDeleteForAll,
  canReply,
  canForward,
  canPin,
  canEdit,
  canReport,
}) => {
  const actionItems =
    (canReply ? 1 : 0) +
    (canForward ? 1 : 0) +
    (canPin ? 1 : 0) +
    (canEdit ? 1 : 0) +
    (canReport ? 1 : 0);
  const copyItems =
    (hasText ? 1 : 0) +
    (hasImage ? 2 : 0) +
    (hasFileUrl ? 1 : 0) +
    (hasAudio ? 1 : 0) +
    (hasVideo ? 1 : 0);
  const deleteItems = 1 + (canDeleteForAll ? 1 : 0);
  const dividers = (actionItems ? 1 : 0) + (copyItems ? 1 : 0);
  return (actionItems + copyItems + deleteItems) * 40 + 8 + dividers * 9;
};

// Keeps the popover inside the viewport (opens above if there's no room below)
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

// Menu row — used by the desktop popover (large=false) and the phone sheet (large=true)
const MenuItem = ({ icon: Icon, label, onClick, danger = false, large }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 text-left outline-none transition-colors ${
      large ? "h-12 text-base" : "h-10 gap-2.5 px-3 text-sm"
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

/* ---- status line under a bubble (pure) ---- */
const renderStatus = (message, mine, s) => {
  if (message.status === "sending") {
    const label =
      message.uploadProgress > 0 && message.uploadProgress < 100
        ? `Sending… ${message.uploadProgress}%`
        : "Sending…";
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="size-3 animate-spin" />
        {label}
      </span>
    );
  }
  if (message.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-error">
        <AlertCircle className="size-3" />
        Not sent
      </span>
    );
  }

  const time =
    message.createdAt && s.showTimestamps
      ? formatTime(message.createdAt, s.timeFormat)
      : "";
  const edited = message.isEdited && !message.isDeleted;

  const label = (
    <>
      {edited && <span className="italic">edited</span>}
      {edited && time && <span>·</span>}
      {time}
    </>
  );

  if (!mine || message.isDeleted)
    return <span className="inline-flex items-center gap-1">{label}</span>;

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <AnimatedTicks status={message.status} />
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Schedule modal                                                     */
/* ------------------------------------------------------------------ */
const ScheduleModal = ({ text, onClose, onConfirm }) => {
  const [value, setValue] = useState(() =>
    toLocalInput(new Date(Date.now() + 10 * 60 * 1000)),
  );
  const [busy, setBusy] = useState(false);

  // backend: between ~1 minute and 30 days from now
  const min = toLocalInput(new Date(Date.now() + 60 * 1000));
  const max = toLocalInput(new Date(Date.now() + 30 * 86_400_000));

  const submit = async () => {
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return toast.error("Pick a valid time");
    setBusy(true);
    const ok = await onConfirm(when.toISOString());
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={onClose} labelId="schedule-title">
      <h3 id="schedule-title" className="font-semibold">
        Schedule message
      </h3>
      <p className="mt-2 line-clamp-3 rounded-lg bg-base-200 p-2 text-sm text-base-content/70 [overflow-wrap:anywhere]">
        {text}
      </p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-base-content/60">Send at</span>
        <input
          type="datetime-local"
          className="input input-bordered input-sm w-full"
          value={value}
          min={min}
          max={max}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
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
          onClick={submit}
          disabled={busy}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Schedule"}
        </motion.button>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  Scheduled list modal                                               */
/* ------------------------------------------------------------------ */
const ScheduledModal = ({ items, onClose, onCancel }) => (
  <Modal onClose={onClose} labelId="scheduled-title">
    <div className="flex items-center justify-between">
      <h3 id="scheduled-title" className="font-semibold">
        Scheduled messages
      </h3>
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-circle"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-base-content/60">
          No scheduled messages.
        </p>
      )}
      <AnimatePresence initial={false}>
        {items.map((it) => {
          const id = it._id || it.id;
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.14 } }}
              transition={spring}
              className="flex items-start gap-2 rounded-xl border border-base-300 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm [overflow-wrap:anywhere]">
                  {displayText(it)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-base-content/60">
                  <Clock className="size-3" />
                  {formatDateTime(it.scheduledFor)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-error"
                onClick={() => onCancel(id)}
              >
                Cancel
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  </Modal>
);

/* ------------------------------------------------------------------ */
/*  Forward modal                                                      */
/* ------------------------------------------------------------------ */
const ForwardModal = ({ users, myId, onClose, onConfirm }) => {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const candidates = users.filter(
    (u) =>
      !u.isBlocked &&
      !sameId(u.id, myId) &&
      u.fullName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id) =>
    setSelected((cur) => {
      if (cur.some((x) => sameId(x, id)))
        return cur.filter((x) => !sameId(x, id));
      if (cur.length >= MAX_FORWARD_TARGETS) {
        toast.error(`You can pick up to ${MAX_FORWARD_TARGETS} chats`);
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
        placeholder="Search people"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {candidates.length === 0 && (
          <p className="py-6 text-center text-sm text-base-content/60">
            No one found.
          </p>
        )}
        {candidates.map((u, i) => {
          const on = selected.some((x) => sameId(x, u.id));
          return (
            <motion.button
              type="button"
              key={u.id}
              onClick={() => toggle(u.id)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springSnappy, delay: Math.min(i, 8) * 0.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${
                on ? "bg-primary/10" : "hover:bg-base-200"
              }`}
            >
              <img
                src={avatarSrc(u.avatar)}
                alt=""
                className="size-8 rounded-full object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {u.fullName}
              </span>
              <span
                className={`grid size-5 place-items-center rounded-full border transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-content"
                    : "border-base-300"
                }`}
              >
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.span
                      key="tick"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={springSnappy}
                      className="flex"
                    >
                      <Check className="size-3" />
                    </motion.span>
                  )}
                </AnimatePresence>
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

/* ------------------------------------------------------------------ */
/*  Disappearing modal                                                 */
/* ------------------------------------------------------------------ */
const DisappearingModal = ({ current, onClose, onConfirm }) => {
  const [busy, setBusy] = useState(false);

  const pick = async (seconds) => {
    if (seconds === current) return onClose();
    setBusy(true);
    const ok = await onConfirm(seconds);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={onClose} labelId="disappearing-title">
      <h3 id="disappearing-title" className="font-semibold">
        Disappearing messages
      </h3>
      <p className="mt-1 text-sm text-base-content/60">
        New messages in this chat will disappear after the selected time.
      </p>
      <div className="mt-3 space-y-1">
        {TIMER_OPTIONS.map((o, i) => {
          const on = o.seconds === current;
          return (
            <motion.button
              key={o.seconds}
              type="button"
              disabled={busy}
              onClick={() => pick(o.seconds)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springSnappy, delay: i * 0.03 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                on ? "bg-primary/10 text-primary" : "hover:bg-base-200"
              }`}
            >
              {o.label}
              {on && <Check className="size-4" />}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  Report modal                                                       */
/* ------------------------------------------------------------------ */
const ReportModal = ({ name, onClose, onConfirm }) => {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const ok = await onConfirm({ reason, details: details.trim() });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={onClose} labelId="report-title">
      <h3 id="report-title" className="font-semibold">
        Report {name || "user"}
      </h3>
      <div className="mt-3 space-y-1">
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-base-200"
          >
            <input
              type="radio"
              name="report-reason"
              className="radio radio-primary radio-xs"
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
            />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Add details (optional)"
        className="textarea textarea-bordered mt-3 w-full text-base sm:text-sm"
      />
      <div className="mt-4 flex justify-end gap-2">
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
          className="btn btn-error btn-sm"
          disabled={busy}
          onClick={submit}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Report"}
        </motion.button>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  Delete-for-everyone confirm                                        */
/* ------------------------------------------------------------------ */
const ConfirmDeleteModal = ({ name, onClose, onConfirm }) => (
  <Modal onClose={onClose} labelId="confirm-delete-title">
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
        <Trash2 className="size-5" />
      </div>
      <div className="min-w-0">
        <h3 id="confirm-delete-title" className="font-semibold">
          Delete for everyone?
        </h3>
        <p className="mt-1 text-sm text-base-content/60">
          This message will be removed for you and {name || "the other person"}.
          This can't be undone.
        </p>
      </div>
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        autoFocus
        className="btn btn-ghost btn-sm"
        onClick={onClose}
      >
        Cancel
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        className="btn btn-error btn-sm"
        onClick={onConfirm}
      >
        Delete
      </motion.button>
    </div>
  </Modal>
);

/* ------------------------------------------------------------------ */
/*  ChatInput  (AI assist + voice + video + reply + edit + schedule)   */
/*  Phones: attach tools hidden behind a "+" button, 16px textarea,    */
/*  Enter = new line, safe-area padding (same as GroupChatContainer).  */
/* ------------------------------------------------------------------ */
const ChatInput = () => {
  const {
    sendMessage,
    selectedUser,
    emitTyping,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    editMessage,
    scheduleMessage,
  } = useChatStore();
  const authUser = useAuthStore((st) => st.authUser);
  const typingEnabled = usePrivacyStore((st) => st.privacy.typingIndicator);
  // Chat prefs are backend-authoritative
  const { enterToSend } = useChatPrefsStore((st) => st.prefs);
  const isTouch = useIsTouch();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null); // image or any other file
  const [preview, setPreview] = useState(""); // images only
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTools, setShowTools] = useState(false); // mobile: "+" attach row
  const [isDragging, setIsDragging] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const textRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const dragDepth = useRef(0);
  const previewRef = useRef(null);

  // ChatInput is remounted via `key={selectedUser.id}`, so this id is fixed per instance
  const targetId = selectedUser?.id;

  const isEditing = Boolean(editingMessage);

  const recorder = useVoiceRecorder({
    onComplete: (voice) => sendMessage({ text: "", voice }),
    onError: (msg) => toast.error(msg),
  });
  const recorderBusy = recorder.state !== "idle";

  const videoRec = useVideoRecorder({
    onComplete: (video) => sendMessage({ text: "", video }),
    onError: (msg) => toast.error(msg),
  });
  const videoBusy = videoRec.state !== "idle";
  const busy = recorderBusy || videoBusy;

  const cancelRef = useRef(null);
  cancelRef.current = recorder.cancel;
  const cancelVideoRef = useRef(null);
  cancelVideoRef.current = videoRec.cancel;
  useEffect(() => {
    return () => {
      cancelRef.current?.();
      cancelVideoRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = videoRec.stream;
  }, [videoRec.stream, videoBusy]);

  const fileIsImage = isImageFile(file);
  const PreviewIcon = file ? getFileIcon(file.type, file.name) : null;

  /* ---- entering edit mode: load the (decrypted) text into the box ---- */
  useEffect(() => {
    if (!editingMessage) return;
    setText(editingMessage.text || "");
    setFile(null);
    setShowEmoji(false);
    setShowTools(false);
    requestAnimationFrame(() => textRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  /* ---- replying: focus the box ---- */
  useEffect(() => {
    if (replyingTo) requestAnimationFrame(() => textRef.current?.focus());
  }, [replyingTo?.id]);

  /* ---- typing indicator (Settings > Privacy) ---- */
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(false, targetId);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);

    if (!typingEnabled || isEditing) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true, targetId);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  useEffect(() => {
    if (!typingEnabled) stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingEnabled]);

  useEffect(() => {
    return () => stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!file || !isImageFile(file)) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  /**
   * kind: "image" -> images only | "file" -> non-image only | "any" -> paste/drop
   */
  const selectFile = (f, kind = "any") => {
    if (!f) return;
    if (isEditing) {
      toast.error("Finish editing before attaching a file");
      return;
    }
    const img = isImageFile(f);

    if (kind === "image" && !img) {
      toast.error("Only images are allowed here. Use the paperclip for files.");
      return;
    }
    if (kind === "file" && img) {
      toast.error("Images can't be sent as a file. Use the image button.");
      return;
    }

    const limitMb = img ? MAX_IMAGE_MB : MAX_FILE_MB;

    if (f.size === 0) {
      toast.error("This file is empty");
      return;
    }
    if (f.size > limitMb * 1024 * 1024) {
      toast.error(
        `${img ? "Image" : "File"} must be smaller than ${limitMb} MB`,
      );
      return;
    }
    setFile(f);
    setShowTools(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();

    // ---- edit mode: save (re-encrypted by the store) instead of sending ----
    if (editingMessage) {
      const trimmed = text.trim();
      if (!trimmed) return toast.error("Message can't be empty");
      if (trimmed === (editingMessage.text || "").trim()) return cancelEdit();
      const ok = await editMessage(editingMessage.id, trimmed);
      if (ok) cancelEdit();
      return;
    }

    if (!text.trim() && !file) return;

    stopTyping();

    // The store encrypts the text (per-peer key) before upload and never falls
    // back to plaintext. Reply (if any) is picked up from the store.
    sendMessage({ text, attachment: file });

    setText("");
    clearFile();
    setShowEmoji(false);
    setShowTools(false);
  };

  const startRecording = () => {
    stopTyping();
    setShowEmoji(false);
    setShowTools(false);
    recorder.start();
  };

  const startVideo = () => {
    stopTyping();
    setShowEmoji(false);
    setShowTools(false);
    videoRec.start();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (isEditing) {
        e.preventDefault();
        return cancelEdit();
      }
      if (replyingTo) {
        e.preventDefault();
        return setReplyingTo(null);
      }
    }
    if (e.key !== "Enter") return;
    // phones: Enter = new line, send with the button
    if (isTouch) return;
    const wantsSend = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
    if (wantsSend) {
      e.preventDefault();
      handleSend();
    }
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

  // schedule the text currently in the box (encrypted by the store)
  const confirmSchedule = async (iso) => {
    const ok = await scheduleMessage(targetId, text.trim(), iso);
    if (ok) {
      stopTyping();
      setText("");
    }
    return ok;
  };

  const canSchedule = !isEditing && !file && Boolean(text.trim());

  return (
    <div className="relative border-t border-base-300 bg-base-100 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 sm:pb-3">
      {/* Reply bar */}
      <CollapseBar show={Boolean(replyingTo) && !isEditing}>
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-primary bg-base-200 px-3 py-1.5">
          <Reply className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">
              Replying to{" "}
              {sameId(replyingTo?.senderId, authUser?.id)
                ? "yourself"
                : selectedUser?.fullName}
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
      <CollapseBar show={isEditing}>
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-warning bg-base-200 px-3 py-1.5">
          <Pencil className="size-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">Editing message</p>
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
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
            transition={spring}
            className="relative mb-2 inline-block max-w-full"
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
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-base-300"
              aria-label="Remove attachment"
            >
              <X className="size-3" />
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
            className="absolute bottom-full left-2 z-40 mb-2 max-w-[calc(100%-1rem)] sm:left-3"
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

      {/* Voice recording bar */}
      {recorderBusy && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-2 py-2 sm:gap-3 sm:px-3"
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

          <Equalizer active={recorder.state === "recording"} />

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

      {/* Video recording panel (live camera preview) */}
      {videoBusy && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-primary/40 bg-primary/5 p-2"
        >
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={previewRef}
              muted
              autoPlay
              playsInline
              className="mx-auto max-h-64 w-full -scale-x-100 object-contain"
            />
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-xs text-white backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-error" />
              {videoRec.state === "requesting"
                ? "Waiting for camera…"
                : `${formatDuration(videoRec.seconds)} / ${formatDuration(MAX_VIDEO_SECONDS)}`}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              className="btn btn-ghost btn-sm btn-circle text-error"
              onClick={videoRec.cancel}
              aria-label="Cancel video"
              title="Cancel"
            >
              <Trash2 className="size-5" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              className="btn btn-primary btn-sm btn-circle"
              onClick={videoRec.stop}
              disabled={videoRec.state !== "recording"}
              aria-label="Send video message"
              title="Send"
            >
              <Send className="size-4" />
            </motion.button>
          </div>
        </div>
      )}

      {!busy && (
        <form
          onSubmit={handleSend}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-wrap items-end gap-1.5 rounded-2xl border px-2 py-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary sm:flex-nowrap sm:items-center sm:gap-2 sm:px-3 sm:py-2 ${
            isDragging
              ? "border-dashed border-primary bg-primary/10"
              : "border-base-300"
          }`}
        >
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

          {/* Tools: image / file / video / emoji / AI.
              Phones: hidden behind the "+" button, shown as their own row.
              sm and up: inline. */}
          <div
            className={`${
              showTools ? "flex" : "hidden"
            } order-1 w-full items-center gap-1 border-b border-base-300/60 pb-1.5 sm:flex sm:w-auto sm:border-0 sm:pb-0`}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => imageRef.current?.click()}
              disabled={isEditing}
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
              disabled={isEditing}
              aria-label="Send file"
              title="Send file"
            >
              <Paperclip className="size-5" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              className="btn btn-ghost btn-sm btn-circle"
              onClick={startVideo}
              disabled={isEditing}
              aria-label="Record video"
              title="Record video"
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

            <AiAssist
              text={text}
              resetKey={selectedUser?.id}
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
            className="btn btn-ghost btn-sm btn-circle order-2 shrink-0 sm:hidden"
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
            maxLength={isEditing ? 4000 : 2000}
            placeholder={isEditing ? "Edit message…" : "Message"}
            // 16px on phones stops iOS from zooming the page on focus
            className="order-3 max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base outline-none sm:text-sm"
          />

          <div className="order-4 flex shrink-0 items-center gap-1">
            {/* Schedule the typed text for later */}
            <AnimatePresence initial={false}>
              {canSchedule && (
                <motion.button
                  key="schedule-btn"
                  type="button"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={springSnappy}
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => setShowSchedule(true)}
                  aria-label="Schedule message"
                  title="Schedule message"
                >
                  <Clock className="size-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Send / save when there's content, otherwise record a voice note */}
            <SendMicButton
              hasContent={Boolean(text.trim() || file)}
              isEditing={isEditing}
              onRecord={startRecording}
              SendIcon={Send}
              MicIcon={Mic}
            />
          </div>
        </form>
      )}

      {!busy && (
        <p className="mt-1.5 hidden items-center gap-1 px-1 text-[11px] text-base-content/50 sm:flex">
          <Lock className="size-3 shrink-0" />
          <span>
            {isEditing
              ? "Esc to cancel · Enter to save"
              : enterToSend
                ? "Enter to send · Shift+Enter for a new line"
                : "Enter for a new line · Ctrl+Enter to send"}
          </span>
        </p>
      )}

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal
            key="schedule"
            text={text.trim()}
            onClose={() => setShowSchedule(false)}
            onConfirm={confirmSchedule}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  One message row — memoized so typing in the composer does NOT      */
/*  re-render every bubble (main cause of lag on phones).              */
/*  `h` is a ref holding the latest handlers.                          */
/* ------------------------------------------------------------------ */
const MessageRow = memo(function MessageRow({
  m,
  prev,
  next,
  myId,
  myAvatar,
  peerName,
  peerAvatar,
  cs,
  s,
  largeEmoji,
  isTouch,
  reactOpen,
  menuOpen,
  highlighted,
  h,
}) {
  const isMine = sameId(m.senderId, myId);

  const showDay =
    m.createdAt && (!prev?.createdAt || !sameDay(prev.createdAt, m.createdAt));
  const startsGroup = !prev || showDay || !sameId(prev.senderId, m.senderId);
  const endsGroup =
    !next ||
    !sameId(next.senderId, m.senderId) ||
    (next.createdAt && m.createdAt && !sameDay(next.createdAt, m.createdAt));

  const pending = m.status === "sending" || m.status === "failed";
  const failed = m.status === "failed";
  const isDeleted = Boolean(m.isDeleted);
  // E2EE: a message whose text could not be decrypted still gets a bubble
  // (with a lock placeholder) instead of an empty one.
  const decryptFailed = !isDeleted && Boolean(m.decryptFailed);
  const hasText = !isDeleted && (Boolean(m.text) || decryptFailed);
  const hasFile = !isDeleted && Boolean(m.file?.name);
  const hasAudio = !isDeleted && Boolean(m.audio?.url);
  const hasVideo = !isDeleted && Boolean(m.video?.url);
  const hasLocation = !isDeleted && Number.isFinite(m.location?.lat);
  const imageSrc = isDeleted ? null : m.image?.url || m.localPreview;
  const grouped = isDeleted ? [] : groupReactions(m.reactions, myId);

  const reply = isDeleted ? null : h.current.resolveReply(m);
  const hasPreview = !isDeleted && Boolean(m.linkPreview?.url);
  const isForwarded = !isDeleted && Boolean(m.isForwarded);

  const showMenu = !pending;
  const showReact = !pending && !isDeleted;

  const isFresh =
    pending ||
    (m.createdAt && Date.now() - new Date(m.createdAt).getTime() < 5000);

  // Touch: tap on the bubble (not on a button/link/player) opens the bottom sheet
  const onBubbleClick = (e) => {
    if (!isTouch || !(showMenu || showReact)) return;
    if (e.target.closest("button, a, input, audio, video, [role='slider']"))
      return;
    h.current.openSheet(m);
  };

  return (
    <div>
      {showDay && <DayChip value={m.createdAt} />}

      <motion.div
        id={`msg-${m.id}`}
        initial={isFresh ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className={`group flex items-end gap-1.5 rounded-xl transition-colors duration-500 sm:gap-2 ${
          highlighted ? "bg-primary/15" : ""
        } ${isMine ? "flex-row-reverse" : ""} ${
          startsGroup ? cs.groupGap : cs.rowGap
        }`}
      >
        {/* avatar: on phones only for the other person (saves width) */}
        <div
          className={`size-7 shrink-0 sm:size-8 ${isMine ? "hidden sm:block" : ""}`}
        >
          {endsGroup && (
            <img
              src={avatarSrc(isMine ? myAvatar : peerAvatar)}
              alt=""
              loading="lazy"
              className="size-7 rounded-full border border-base-300 object-cover sm:size-8"
            />
          )}
        </div>

        <div
          className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[65%] ${
            isMine ? "items-end" : "items-start"
          }`}
        >
          {/* Bubble + action buttons (desktop only) */}
          <div
            className={`flex min-w-0 max-w-full items-center gap-0.5 ${
              isMine ? "flex-row-reverse" : ""
            }`}
          >
            {isDeleted ? (
              <div
                className={`flex items-center gap-1.5 border border-base-300 bg-base-100 px-3.5 py-2 italic text-base-content/60 ${cs.radius} ${
                  endsGroup ? (isMine ? cs.tailMine : cs.tailTheirs) : ""
                }`}
              >
                <Ban className="size-3.5 shrink-0" />
                <span className="text-sm">
                  {isMine
                    ? "You deleted this message"
                    : "This message was deleted"}
                </span>
              </div>
            ) : (
              <div
                onClick={onBubbleClick}
                className={`min-w-0 max-w-full ${
                  hasText || hasAudio || reply || isForwarded
                    ? "px-3 py-2 sm:px-3.5"
                    : "p-1"
                } ${cs.radius} shadow-sm ${
                  isTouch ? "[-webkit-touch-callout:none] select-text" : ""
                } ${
                  isMine
                    ? `bg-primary text-primary-content ${
                        endsGroup ? cs.tailMine : ""
                      }`
                    : `border border-base-300 bg-base-100 ${
                        endsGroup ? cs.tailTheirs : ""
                      }`
                } ${failed ? "ring-1 ring-error" : ""}`}
              >
                {isForwarded && (
                  <p className="mb-1 flex items-center gap-1 text-[11px] italic opacity-70">
                    <Forward className="size-3" />
                    Forwarded
                  </p>
                )}

                {reply && (
                  <ReplyQuote
                    reply={reply}
                    isMine={isMine}
                    authId={myId}
                    peerName={peerName}
                    onClick={() => h.current.scrollToMessage(reply.id)}
                  />
                )}

                {imageSrc && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => h.current.setPreviewSrc(imageSrc)}
                    className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
                    aria-label="Open image"
                  >
                    <img
                      src={imageSrc}
                      alt="Attachment"
                      decoding="async"
                      loading="lazy"
                      onLoad={() => h.current.onImageLoad()}
                      className={`max-h-56 w-auto max-w-full rounded-xl object-cover sm:max-h-64 ${
                        hasText ? "mb-2" : ""
                      } ${pending ? "opacity-60" : ""}`}
                    />
                  </motion.button>
                )}
                {hasFile && (
                  <div className={hasText ? "mb-2" : ""}>
                    <FileAttachment
                      file={m.file}
                      isMine={isMine}
                      uploading={m.status === "sending"}
                      progress={m.uploadProgress}
                    />
                  </div>
                )}
                {hasAudio && (
                  <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                    <VoiceMessage
                      audio={m.audio}
                      isMine={isMine}
                      uploading={m.status === "sending"}
                    />
                  </div>
                )}
                {hasVideo && (
                  <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                    <VideoMessage
                      video={m.video}
                      uploading={m.status === "sending"}
                      progress={m.uploadProgress}
                    />
                  </div>
                )}
                {hasLocation && (
                  <div className={`max-w-full ${hasText ? "mb-2" : ""}`}>
                    <LocationMessage message={m} isMine={isMine} />
                  </div>
                )}
                {hasText &&
                  (decryptFailed ? (
                    <p
                      className="flex items-center gap-1.5 text-sm italic opacity-70"
                      title="Waiting for this chat's encryption key"
                    >
                      <Lock className="size-3.5 shrink-0" />
                      <span>{displayText(m)}</span>
                    </p>
                  ) : (
                    <p
                      className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] ${
                        largeEmoji && isEmojiOnly(m.text)
                          ? "text-4xl leading-tight"
                          : cs.text
                      }`}
                    >
                      {displayText(m)}
                    </p>
                  ))}

                {hasPreview && (
                  <LinkPreviewCard preview={m.linkPreview} isMine={isMine} />
                )}
              </div>
            )}

            {m.isPinned && !isDeleted && (
              <Pin
                className="size-3 shrink-0 text-base-content/40"
                aria-label="Pinned"
              />
            )}

            {/* hover actions: only on devices that can hover */}
            {!isTouch && showReact && (
              <button
                type="button"
                data-popover-ui
                onClick={(e) => h.current.openPopover(e, "react", m, isMine)}
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
                onClick={(e) => h.current.openPopover(e, "menu", m, isMine)}
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
          {grouped.length > 0 && (
            <div
              className={`relative z-[1] -mt-1.5 flex flex-wrap gap-1 px-2 ${
                isMine ? "justify-end" : ""
              }`}
            >
              {grouped.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => h.current.reactToMessage(m.id, r.emoji)}
                  className={`flex items-center gap-1 rounded-full border bg-base-100 px-1.5 py-0.5 text-xs shadow-sm transition-colors active:scale-90 ${
                    r.mine
                      ? "border-primary bg-primary/10"
                      : "border-base-300 hover:bg-base-200"
                  }`}
                >
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span>{r.count}</span>}
                </button>
              ))}
            </div>
          )}

          {(endsGroup || pending) && (
            <div className="mt-1 px-1 text-[11px] text-base-content/50">
              {renderStatus(m, isMine, s)}
            </div>
          )}

          {failed && (
            <div className="mt-0.5 flex gap-3 px-1 text-xs">
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

/* ------------------------------------------------------------------ */
/*  ChatContainer                                                      */
/* ------------------------------------------------------------------ */
const ChatContainer = () => {
  const {
    messages,
    users,
    getMessage,
    isMessagesLoading,
    selectedUser,
    subscribeToMessage,
    unSubscribeFromMessage,
    retryMessage,
    discardMessage,
    reactToMessage,
    deleteForMe,
    deleteForEveryone,
    markSeen,
    typingFrom,
    setReplyingTo,
    setEditingMessage,
    togglePin,
    forwardMessages,
    searchMessages,
    scheduled,
    getScheduled,
    cancelScheduled,
    // disappearing + report
    disappearAfter,
    getDisappearing,
    setDisappearing,
    purgeExpired,
    reportUser,
    // archive
    setArchive,
    // live location
    liveShares,
    stopLiveShare,
    // ---- E2EE ----
    redecryptFailed,
  } = useChatStore();
  const { authUser } = useAuthStore();

  const s = useAppearanceStore((st) => st.appearance);
  // memoized: a new object every render would defeat MessageRow's memo
  const cs = useMemo(() => chatStyle(s), [s]);

  const motionMode = s.reduceMotion ? "always" : "user";
  const isTouch = useIsTouch();

  const { autoScroll, largeEmoji } = useChatPrefsStore((st) => st.prefs);

  const peerIsTyping = Boolean(
    selectedUser && typingFrom[String(selectedUser.id)],
  );

  // Must stay above any early return (rules of hooks)
  const isBlocked = useIsBlocked(selectedUser);

  const allCalls = useCallHistoryStore((st) => st.calls);
  const fetchCalls = useCallHistoryStore((st) => st.fetchCalls);
  const { startCall, status: callStatus } = useCall();

  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const lastChatRef = useRef(null);
  const highlightTimer = useRef(null);
  const handlersRef = useRef({}); // latest handlers for memoized rows
  const decryptRetriesRef = useRef({}); // { [peerId]: attempts }

  const [previewSrc, setPreviewSrc] = useState(null);
  const [popover, setPopover] = useState(null); // { type: react|menu|sheet, id, top, left }
  const [confirmId, setConfirmId] = useState(null);

  const [highlightId, setHighlightId] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showScheduled, setShowScheduled] = useState(false);
  const [pinIndex, setPinIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [reportCtx, setReportCtx] = useState(null); // { messageId? }
  const [showFab, setShowFab] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showShareLocation, setShowShareLocation] = useState(false);
  // ---- E2EE state ----
  const [retryingKeys, setRetryingKeys] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [e2eeInfoOpen, setE2eeInfoOpen] = useState(false);

  // my active live share in this chat (if any)
  const myLiveShare = Object.values(liveShares || {}).find(
    (x) =>
      sameId(x.sharerId, authUser?.id) &&
      sameId(x.receiverId, selectedUser?.id),
  );

  const list = Array.isArray(messages) ? messages : [];
  const last = list[list.length - 1];
  const lastKey = last ? last.clientId || last.id : null;
  const lastIsMine = last ? sameId(last.senderId, authUser?.id) : false;

  // pinned messages (newest pin first)
  const pinned = useMemo(
    () =>
      list
        .filter((m) => m.isPinned && !m.isDeleted)
        .sort(
          (a, b) =>
            new Date(b.pinnedAt || 0).getTime() -
            new Date(a.pinnedAt || 0).getTime(),
        ),
    [list],
  );

  useEffect(() => {
    if (pinIndex >= pinned.length) setPinIndex(0);
  }, [pinned.length, pinIndex]);

  /* ---- E2EE: how many messages are still locked ---- */
  const undecryptedCount = useMemo(
    () => list.filter((m) => m.decryptFailed && !m.isDeleted).length,
    [list],
  );

  /* ---- E2EE: auto re-try decrypting (keys may arrive a moment later) ---- */
  useEffect(() => {
    const pid = selectedUser?.id;
    if (!pid || undecryptedCount === 0) return;
    const key = String(pid);
    if ((decryptRetriesRef.current[key] || 0) >= MAX_AUTO_DECRYPT_RETRIES)
      return;

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        await whenE2EEReady();
        if (cancelled) return;
        decryptRetriesRef.current[key] =
          (decryptRetriesRef.current[key] || 0) + 1;
        await redecryptFailed();
        // re-arm the effect for the next attempt if still locked
        if (!cancelled) setRetryTick((n) => n + 1);
      } catch {
        /* silent: the manual Retry button is still there */
      }
    }, AUTO_DECRYPT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selectedUser?.id, undecryptedCount, redecryptFailed, retryTick]);

  // manual retry (banner button)
  const handleRetryDecrypt = async () => {
    if (retryingKeys) return;
    setRetryingKeys(true);
    try {
      await whenE2EEReady();
      await redecryptFailed();
    } catch {
      toast.error("Couldn't refresh encryption keys. Try again.");
    } finally {
      setRetryingKeys(false);
    }
  };

  // load call history when a chat opens and again whenever a call finishes
  useEffect(() => {
    if (callStatus === "idle") fetchCalls();
  }, [selectedUser?.id, callStatus, fetchCalls]);

  // load pending scheduled messages for this chat
  useEffect(() => {
    if (selectedUser?.id) getScheduled(selectedUser.id);
  }, [selectedUser?.id, getScheduled]);

  // load disappearing timer for this chat
  useEffect(() => {
    if (selectedUser?.id) getDisappearing(selectedUser.id);
  }, [selectedUser?.id, getDisappearing]);

  // remove expired messages from the live UI
  useEffect(() => {
    const t = setInterval(purgeExpired, 5000);
    return () => clearInterval(t);
  }, [purgeExpired]);

  // close modals / reset when switching chats
  useEffect(() => {
    setShowDisappearing(false);
    setReportCtx(null);
    setShowShareLocation(false);
    setE2eeInfoOpen(false);
    setPopover(null);
    setConfirmId(null);
    setRetryingKeys(false);
  }, [selectedUser?.id]);

  // reset search when switching chats
  useEffect(() => {
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults([]);
    setPinIndex(0);
  }, [selectedUser?.id]);

  // debounced search (client-side in the store: server only sees ciphertext)
  useEffect(() => {
    const q = searchQ.trim();
    if (!searchOpen || q.length < 2 || !selectedUser?.id) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchMessages(selectedUser.id, q);
      if (!cancelled) {
        setSearchResults(res);
        setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQ, searchOpen, selectedUser?.id, searchMessages]);

  // messages + this person's call logs, merged by time
  const timeline = useMemo(() => {
    const peerId = String(selectedUser?.id ?? "");
    const callItems = (allCalls || [])
      .filter((c) => String(c.user?.id) === peerId)
      .map((c) => ({
        kind: "call",
        id: `call-${c.id}`,
        senderId: "__call__",
        createdAt: c.startedAt,
        call: c,
      }));
    if (!callItems.length) return list;
    const t = (x) =>
      x.createdAt ? new Date(x.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    return [...list, ...callItems].sort((a, b) => t(a) - t(b));
  }, [list, allCalls, selectedUser?.id]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // jump to a message (reply quote / pinned banner / search result)
  const scrollToMessage = useCallback((id) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      toast.error("Message not found in this chat");
      return;
    }
    stickToBottomRef.current = false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600);
  }, []);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  useEffect(() => {
    if (selectedUser?.id) {
      getMessage(selectedUser.id);
    }
    subscribeToMessage();

    return () => unSubscribeFromMessage();
  }, [
    selectedUser?.id,
    getMessage,
    subscribeToMessage,
    unSubscribeFromMessage,
  ]);

  useEffect(() => {
    if (!selectedUser?.id) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") markSeen(selectedUser.id);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [selectedUser?.id, markSeen]);

  useLayoutEffect(() => {
    if (isMessagesLoading || !listRef.current) return;
    const chatChanged = lastChatRef.current !== selectedUser?.id;
    lastChatRef.current = selectedUser?.id;

    if (chatChanged) {
      stickToBottomRef.current = true;
      setShowFab(false);
      setUnread(0);
      requestAnimationFrame(() => {
        if (listRef.current)
          listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "auto",
          });
      });
      return;
    }

    if (lastIsMine || (autoScroll && stickToBottomRef.current)) {
      scrollToBottom("smooth");
    } else if (lastKey) {
      // incoming message while the person is reading older ones
      setUnread((n) => n + 1);
      setShowFab(true);
    }
  }, [
    lastKey,
    lastIsMine,
    selectedUser?.id,
    isMessagesLoading,
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

  const callLogCount = timeline.length - list.length;
  useEffect(() => {
    if (callLogCount > 0 && stickToBottomRef.current) scrollToBottom("smooth");
  }, [callLogCount, scrollToBottom]);

  /* ---- Escape: confirm -> e2ee info -> popover/sheet (others handle their own) ---- */
  useEffect(() => {
    if (!popover && !e2eeInfoOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (e2eeInfoOpen) setE2eeInfoOpen(false);
      else setPopover(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover, e2eeInfoOpen]);

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

  const openPopover = (e, type, message, isMine) => {
    if (popover?.type === type && sameId(popover.id, message.id)) {
      setPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const align = isMine ? "right" : "left";
    const pos =
      type === "react"
        ? placePopover(rect, REACT_W, REACT_H, align, true)
        : placePopover(
            rect,
            MENU_W,
            menuHeight(messageFlags(message, isMine)),
            align,
          );
    setPopover({ type, id: message.id, ...pos });
  };

  const openSheet = (message) => setPopover({ type: "sheet", id: message.id });
  const closePopover = () => setPopover(null);

  const handleCopyText = async (message) => {
    closePopover();
    // E2EE: never copy the placeholder / empty text of a locked message
    if (message.decryptFailed || !message.text) {
      toast.error("This message is still encrypted");
      return;
    }
    const ok = await copyMessageText(message.text);
    ok ? toast.success("Text copied") : toast.error("Couldn't copy text");
  };

  // NOTE: copyMessageImage must be called right inside the click handler
  const handleCopyImage = async (message) => {
    closePopover();
    const result = await copyMessageImage(message.image?.url);
    if (result === "image") toast.success("Image copied");
    else if (result === "url")
      toast.success("Image copy isn't supported here — link copied");
    else toast.error("Couldn't copy image");
  };

  const handleCopyLink = async (message) => {
    closePopover();
    const ok = await copyImageLink(message.image?.url);
    ok ? toast.success("Image link copied") : toast.error("Couldn't copy link");
  };

  const copyUrl = (getUrl, okMsg) => async (message) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(getUrl(message) || "");
      toast.success(okMsg);
    } catch {
      toast.error("Couldn't copy link");
    }
  };
  const handleCopyFileLink = copyUrl((m) => m.file?.url, "File link copied");
  const handleCopyAudioLink = copyUrl(
    (m) => m.audio?.url,
    "Voice message link copied",
  );
  const handleCopyVideoLink = copyUrl((m) => m.video?.url, "Video link copied");

  const handleReply = (message) => {
    closePopover();
    setReplyingTo(message);
  };

  const handleEdit = (message) => {
    closePopover();
    setEditingMessage(message);
  };

  const handleTogglePin = (message) => {
    closePopover();
    if (!message.isPinned && pinned.length >= MAX_PINS) {
      toast.error(`You can pin up to ${MAX_PINS} messages`);
      return;
    }
    togglePin(message.id);
  };

  const handleForward = (message) => {
    closePopover();
    setForwardMsg(message);
  };

  const handleReport = (message) => {
    closePopover();
    setReportCtx({ messageId: message.id });
  };

  const handleDeleteForMe = (message) => {
    closePopover();
    deleteForMe(message.id);
  };

  const askDeleteForEveryone = (message) => {
    closePopover();
    setConfirmId(message.id);
  };

  const confirmDeleteForEveryone = () => {
    if (confirmId) deleteForEveryone(confirmId);
    setConfirmId(null);
  };

  // always-fresh handlers for the memoized rows (no prop churn)
  handlersRef.current = {
    openPopover,
    openSheet,
    setPreviewSrc,
    reactToMessage,
    retryMessage,
    discardMessage,
    scrollToMessage,
    resolveReply: (m) => resolveReply(m, list),
    onImageLoad: () => stickToBottomRef.current && scrollToBottom("auto"),
  };

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickToBottomRef.current = atBottom;
    setShowFab(!atBottom);
    if (atBottom) setUnread(0);
    if (popover && popover.type !== "sheet") setPopover(null);
  };

  const jumpToLatest = () => {
    stickToBottomRef.current = true;
    setUnread(0);
    setShowFab(false);
    scrollToBottom("smooth");
  };

  const openScheduled = () => {
    if (selectedUser?.id) getScheduled(selectedUser.id);
    setShowScheduled(true);
  };

  // archive state of the open chat (sidebar list has the isArchived flag)
  const isArchived = Boolean(
    users.find((u) => sameId(u.id, selectedUser?.id))?.isArchived,
  );

  const handleArchive = () => {
    if (selectedUser?.id) setArchive(selectedUser.id, !isArchived);
  };

  const inputArea = isBlocked ? (
    <BlockedBanner name={selectedUser?.fullName} />
  ) : (
    <ChatInput key={selectedUser?.id} />
  );

  if (isMessagesLoading) {
    return (
      <MotionConfig reducedMotion={motionMode}>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base-100">
          <ChatHeader />
          <MessageSkeleton />
          {inputArea}
        </div>
      </MotionConfig>
    );
  }

  /* ---- popover / sheet data ---- */
  const popoverMessage = popover
    ? list.find((m) => sameId(m.id, popover.id))
    : null;
  const popoverIsMine = popoverMessage
    ? sameId(popoverMessage.senderId, authUser?.id)
    : false;
  const popoverFlags = popoverMessage
    ? messageFlags(popoverMessage, popoverIsMine)
    : null;
  const myReaction = popoverMessage
    ? (popoverMessage.reactions || []).find((r) =>
        sameId(r.userId, authUser?.id),
      )?.emoji
    : null;

  const currentPin = pinned.length ? pinned[pinIndex % pinned.length] : null;

  // shared menu rows (desktop popover + mobile bottom sheet)
  const renderMenuItems = (f, msg, large) => (
    <>
      {/* actions */}
      {f.canReply && (
        <MenuItem
          large={large}
          icon={Reply}
          label="Reply"
          onClick={() => handleReply(msg)}
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
      {f.canReport && (
        <MenuItem
          large={large}
          icon={Flag}
          label="Report"
          onClick={() => handleReport(msg)}
        />
      )}
      {(f.canReply || f.canForward || f.canPin || f.canEdit || f.canReport) && (
        <div className="my-1 border-t border-base-300" />
      )}

      {/* copy */}
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
      {(f.hasText ||
        f.hasImage ||
        f.hasFileUrl ||
        f.hasAudio ||
        f.hasVideo) && <div className="my-1 border-t border-base-300" />}

      {/* delete */}
      <MenuItem
        large={large}
        icon={Trash2}
        label="Delete for me"
        onClick={() => handleDeleteForMe(msg)}
      />
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
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base-100">
        <ChatHeader />

        {/* Toolbar: search + scheduled + disappearing + location (+ archive/report in "More") */}
        <ChatToolbar
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          searchQ={searchQ}
          setSearchQ={setSearchQ}
          searching={searching}
          scheduledCount={scheduled.length}
          onOpenScheduled={openScheduled}
          disappearAfter={disappearAfter}
          disappearLabel={timerLabel(disappearAfter)}
          onOpenDisappearing={() => setShowDisappearing(true)}
          showLocation={!isBlocked}
          isSharingLive={Boolean(myLiveShare)}
          onOpenLocation={() => setShowShareLocation(true)}
          isArchived={isArchived}
          onArchive={handleArchive}
          onReport={() => setReportCtx({})}
        />

        {/* ---- E2EE: some messages are still locked ---- */}
        <AnimatePresence initial={false}>
          {undecryptedCount > 0 && (
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

        {/* Disappearing banner */}
        <CollapseBar
          show={disappearAfter > 0}
          className="border-b border-base-300 bg-base-100"
        >
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-base-content/70">
            <Timer className="size-3.5 text-primary" />
            Disappearing messages are on · {timerLabel(disappearAfter)}
          </div>
        </CollapseBar>

        {/* Live location banner (when I'm sharing live in this chat) */}
        <CollapseBar
          show={Boolean(myLiveShare)}
          className="border-b border-base-300 bg-base-100"
        >
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-base-content/70">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-error" />
            </span>
            Sharing live location
            {myLiveShare?.expiresAt &&
              ` · until ${formatTime(myLiveShare.expiresAt, s.timeFormat)}`}
            <button
              type="button"
              className="btn btn-ghost btn-xs ml-auto text-error"
              onClick={() => stopLiveShare(myLiveShare.shareId)}
            >
              Stop
            </button>
          </div>
        </CollapseBar>

        {/* Search results */}
        <CollapseBar
          show={searchOpen && searchQ.trim().length >= 2}
          className="border-b border-base-300 bg-base-100"
        >
          <div className="max-h-56 overflow-y-auto">
            {!searching && searchResults.length === 0 && (
              <p className="px-4 py-3 text-sm text-base-content/60">
                No messages found.
              </p>
            )}
            {searchResults.map((r, i) => (
              <motion.button
                type="button"
                key={r.id}
                onClick={() => scrollToMessage(r.id)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springSnappy, delay: Math.min(i, 8) * 0.025 }}
                whileTap={{ scale: 0.99 }}
                className="block w-full px-4 py-2 text-left hover:bg-base-200"
              >
                <span className="flex items-center justify-between gap-2 text-xs text-base-content/60">
                  <span>
                    {sameId(r.senderId, authUser?.id)
                      ? "You"
                      : selectedUser?.fullName}
                  </span>
                  <span>{formatDateTime(r.createdAt)}</span>
                </span>
                <span className="block truncate text-sm">{r.text}</span>
              </motion.button>
            ))}
          </div>
        </CollapseBar>

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
          onUnpin={() => currentPin && togglePin(currentPin.id)}
        />

        {/* Message list (+ scroll-to-latest button) */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={listRef}
            onScroll={handleListScroll}
            className="flex-1 overflow-y-auto overscroll-contain bg-base-200/40 px-2 py-4 sm:px-6 sm:py-5"
          >
            {/* ---- WhatsApp-style E2EE notice (top of the chat) ---- */}
            <E2EENotice onOpen={() => setE2eeInfoOpen(true)} />

            {timeline.length === 0 && (
              <motion.div
                {...fade}
                className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl border border-base-300 bg-base-100">
                  <MessageSquareText className="size-6 text-base-content/50" />
                </div>
                <div>
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm text-base-content/60">
                    Say hi to {selectedUser?.fullName} to start the
                    conversation.
                  </p>
                </div>
              </motion.div>
            )}

            {timeline.map((item, i) =>
              item.kind === "call" ? (
                <CallLogRow
                  key={item.id}
                  item={item}
                  prev={timeline[i - 1]}
                  s={s}
                  disabled={callStatus !== "idle" || isBlocked}
                  onCallBack={() =>
                    startCall(
                      {
                        id: selectedUser.id,
                        fullName: selectedUser.fullName,
                      },
                      item.call.type,
                    )
                  }
                />
              ) : (
                <MessageRow
                  key={item.clientId || item.id}
                  m={item}
                  prev={timeline[i - 1]}
                  next={timeline[i + 1]}
                  myId={authUser?.id}
                  myAvatar={authUser?.avatar}
                  peerName={selectedUser?.fullName}
                  peerAvatar={selectedUser?.avatar}
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
                  highlighted={sameId(highlightId, item.id)}
                  h={handlersRef}
                />
              ),
            )}
          </div>

          <ScrollToBottomFab
            show={showFab}
            unread={unread}
            onClick={jumpToLatest}
          />
        </div>

        {/* Typing indicator bubble */}
        <TypingBubble
          show={peerIsTyping}
          avatar={avatarSrc(selectedUser?.avatar)}
          name={selectedUser?.fullName?.split(" ")[0]}
          reduceMotion={s.reduceMotion}
        />

        {inputArea}

        {/* ---------------- Desktop: reaction picker + options menu ---------------- */}
        {createPortal(
          <AnimatePresence>
            {popover &&
              popover.type !== "sheet" &&
              popoverMessage &&
              popoverFlags && (
                <PopoverShell
                  key={`${popover.type}-${popover.id}`}
                  type={popover.type}
                  id={popover.id}
                  top={popover.top}
                  left={popover.left}
                  width={popover.type === "react" ? REACT_W : MENU_W}
                >
                  {popover.type === "react"
                    ? QUICK_REACTIONS.map((emoji) => (
                        <ReactionButton
                          key={emoji}
                          emoji={emoji}
                          active={myReaction === emoji}
                          onClick={() => {
                            reactToMessage(popoverMessage.id, emoji);
                            closePopover();
                          }}
                        />
                      ))
                    : renderMenuItems(popoverFlags, popoverMessage, false)}
                </PopoverShell>
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
                  className="fixed inset-x-0 bottom-0 z-[51] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-base-300 bg-base-100 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
                >
                  <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-base-300" />

                  {!popoverFlags.isDeleted && (
                    <div className="flex items-center justify-around border-b border-base-300 px-3 py-3">
                      {QUICK_REACTIONS.map((emoji) => (
                        <motion.button
                          key={emoji}
                          type="button"
                          whileTap={{ scale: 0.85 }}
                          onClick={() => {
                            reactToMessage(popoverMessage.id, emoji);
                            closePopover();
                          }}
                          className={`flex size-11 items-center justify-center rounded-full text-2xl ${
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
                  className="w-full max-w-sm rounded-t-2xl border border-base-300 bg-base-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
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
                      Text messages you send to{" "}
                      {selectedUser?.fullName || "this person"} are secured with
                      a lock. Only the two of you have the key.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <E2EEPoint
                      icon={User}
                      title="Only you two can read"
                      text="Messages are encrypted on your device before they are sent and decrypted only on your device and your contact's device."
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
                    Note: shared locations are not end-to-end encrypted, because
                    the server needs the coordinates to deliver live updates.
                    Link previews are also not generated for encrypted text.
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

        {/* Delete for everyone confirm */}
        <AnimatePresence>
          {confirmId && (
            <ConfirmDeleteModal
              key="confirm-delete"
              name={selectedUser?.fullName}
              onClose={() => setConfirmId(null)}
              onConfirm={confirmDeleteForEveryone}
            />
          )}
        </AnimatePresence>

        {/* Forward modal */}
        <AnimatePresence>
          {forwardMsg && (
            <ForwardModal
              key="forward"
              users={users}
              myId={authUser?.id}
              onClose={() => setForwardMsg(null)}
              onConfirm={(ids) => forwardMessages(forwardMsg.id, ids)}
            />
          )}
        </AnimatePresence>

        {/* Scheduled list modal */}
        <AnimatePresence>
          {showScheduled && (
            <ScheduledModal
              key="scheduled"
              items={scheduled}
              onClose={() => setShowScheduled(false)}
              onCancel={cancelScheduled}
            />
          )}
        </AnimatePresence>

        {/* Disappearing modal */}
        <AnimatePresence>
          {showDisappearing && (
            <DisappearingModal
              key="disappearing"
              current={disappearAfter}
              onClose={() => setShowDisappearing(false)}
              onConfirm={(sec) => setDisappearing(selectedUser.id, sec)}
            />
          )}
        </AnimatePresence>

        {/* Report modal */}
        <AnimatePresence>
          {reportCtx && (
            <ReportModal
              key="report"
              name={selectedUser?.fullName}
              onClose={() => setReportCtx(null)}
              onConfirm={(d) =>
                reportUser(selectedUser.id, {
                  ...d,
                  messageId: reportCtx.messageId,
                })
              }
            />
          )}
        </AnimatePresence>

        {/* Share location modal */}
        <AnimatePresence>
          {showShareLocation && (
            <ShareLocationModal
              key="share-location"
              name={selectedUser?.fullName}
              onClose={() => setShowShareLocation(false)}
            />
          )}
        </AnimatePresence>

        <ImageViewer src={previewSrc} onClose={() => setPreviewSrc(null)} />
      </div>
    </MotionConfig>
  );
};

export default ChatContainer;
