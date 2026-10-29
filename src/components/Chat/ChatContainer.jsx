import {
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
  Archive,
  ArchiveRestore,
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
  Reply,
  RotateCw,
  Search,
  Send,
  Smile,
  Timer,
  Trash2,
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
  AnimatedBadge,
  AnimatedTicks,
  CollapseBar,
  ImageViewer,
  MenuItem,
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

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MENU_W = 208;
const REACT_W = 248;
const REACT_H = 48;

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;

// keep these in sync with the backend (messages.controller.js)
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_PINS = 3;
const MAX_FORWARD_TARGETS = 5;

// ⚠️ must EXACTLY match ALLOWED_TIMERS in chatSetting.model.js
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
  if (r.text) return r.text;
  if (r.image?.url) return "📷 Photo";
  if (r.file?.name) return `📎 ${r.file.name}`;
  if (r.audio?.url) return "🎤 Voice message";
  if (r.video?.url) return "🎥 Video";
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

  const cls = `flex w-64 max-w-full items-center gap-3 rounded-xl p-2 text-left ${
    isMine ? "bg-primary-content/10" : "bg-base-200"
  }`;

  return canOpen ? (
    <motion.a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      download={file.name}
      title={`Open ${file.name}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`${cls} focus-visible:outline-2 focus-visible:outline-offset-2`}
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
          reply.missing || reply.isDeleted ? "italic opacity-70" : "opacity-80"
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
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
    className={`mt-2 block w-64 max-w-full overflow-hidden rounded-xl border text-left ${
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
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={spring}
    className="my-4 flex justify-center"
  >
    <span className="rounded-full border border-base-300 bg-base-100/90 px-3 py-1 text-xs text-base-content/60 shadow-sm backdrop-blur">
      {dayLabel(value)}
    </span>
  </motion.div>
);

const ToolbarBtn = ({ icon: Icon, onClick, className = "", children }) => (
  <motion.button
    type="button"
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.94 }}
    transition={springSnappy}
    className={`btn btn-ghost btn-xs gap-1 ${className}`}
    onClick={onClick}
  >
    <Icon className="size-4" />
    {children}
  </motion.button>
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
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={spring}
          className="flex max-w-[92%] items-center gap-2.5 rounded-2xl border border-base-300 bg-base-100 px-3 py-2 shadow-sm"
        >
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
          <motion.button
            type="button"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.88 }}
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
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const messageFlags = (message, isMine) => {
  const isDeleted = Boolean(message.isDeleted);
  const hasText = !isDeleted && Boolean(message.text);
  const hasAudio = !isDeleted && Boolean(message.audio?.url);
  const hasVideo = !isDeleted && Boolean(message.video?.url);
  const age = message.createdAt
    ? Date.now() - new Date(message.createdAt).getTime()
    : Infinity;
  return {
    isDeleted,
    hasText,
    hasImage: !isDeleted && Boolean(message.image?.url),
    hasFile: !isDeleted && Boolean(message.file?.name),
    hasFileUrl: !isDeleted && Boolean(message.file?.url),
    hasAudio,
    hasVideo,
    hasLinkPreview: !isDeleted && Boolean(message.linkPreview?.url),
    canDeleteForAll: isMine && !isDeleted,
    canReply: !isDeleted,
    canForward: !isDeleted,
    canPin: !isDeleted,
    canReport: !isMine && !isDeleted,
    isPinned: Boolean(message.isPinned),
    canEdit:
      isMine &&
      !isDeleted &&
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
    open
      ? "opacity-100 bg-base-300/60"
      : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
  }`;

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
                  {it.text}
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
        className="input input-bordered input-sm mt-3 w-full"
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
        className="textarea textarea-bordered mt-3 w-full text-sm"
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
      <motion.div
        initial={{ scale: 0.5, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...springSnappy, damping: 14 }}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error"
      >
        <Trash2 className="size-5" />
      </motion.div>
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

  const [text, setText] = useState("");
  const [file, setFile] = useState(null); // image or any other file
  const [preview, setPreview] = useState(""); // images only
  const [showEmoji, setShowEmoji] = useState(false);
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

  /* ---- entering edit mode: load the text into the box ---- */
  useEffect(() => {
    if (!editingMessage) return;
    setText(editingMessage.text || "");
    setFile(null);
    setShowEmoji(false);
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
  };

  const handleSend = async (e) => {
    e?.preventDefault();

    // ---- edit mode: save instead of sending a new message ----
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

    // reply (if any) is picked up from the store by sendMessage
    sendMessage({ text, attachment: file });

    setText("");
    clearFile();
    setShowEmoji(false);
  };

  const startRecording = () => {
    stopTyping();
    setShowEmoji(false);
    recorder.start();
  };

  const startVideo = () => {
    stopTyping();
    setShowEmoji(false);
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

  // schedule the text currently in the box
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
    <div className="relative border-t border-base-300 bg-base-100 p-3">
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
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-base-300"
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
            transition={spring}
            style={{ transformOrigin: "bottom left" }}
            className="absolute bottom-full left-3 z-40 mb-2 max-w-[calc(100%-1.5rem)]"
          >
            <EmojiPicker
              theme="auto"
              width={Math.min(350, window.innerWidth - 40)}
              height={420}
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
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
          className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-2 py-2 sm:gap-3 sm:px-3"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
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
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            className="btn btn-primary btn-sm btn-circle"
            onClick={recorder.stop}
            disabled={recorder.state !== "recording"}
            aria-label="Send voice message"
            title="Send"
          >
            <Send className="size-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Video recording panel (live camera preview) */}
      {videoBusy && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring}
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
              whileHover={{ scale: 1.08 }}
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
              whileHover={{ scale: 1.08 }}
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
        </motion.div>
      )}

      {!busy && (
        <form
          onSubmit={handleSend}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
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
                <motion.span
                  initial={{ y: 6, scale: 0.95 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={spring}
                >
                  Drop file to attach
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
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
            whileHover={{ scale: 1.08 }}
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
            whileHover={{ scale: 1.08 }}
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
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            animate={{ rotate: showEmoji ? 15 : 0 }}
            transition={springSnappy}
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
            placeholder={isEditing ? "Edit message…" : "Write a message…"}
            className="max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
          />

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
                whileHover={{ scale: 1.08 }}
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
        </form>
      )}

      {!busy && (
        <p className="mt-1.5 px-1 text-[11px] text-base-content/50">
          {isEditing
            ? "Esc to cancel · Enter to save"
            : enterToSend
              ? "Enter to send · Shift+Enter for a new line"
              : "Enter for a new line · Ctrl+Enter to send"}
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
  } = useChatStore();
  const { authUser } = useAuthStore();

  const s = useAppearanceStore((st) => st.appearance);
  const cs = chatStyle(s);

  const motionMode = s.reduceMotion ? "always" : "user";

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

  const [previewSrc, setPreviewSrc] = useState(null);
  const [popover, setPopover] = useState(null); // { type, id, top, left }
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

  // close modals when switching chats
  useEffect(() => {
    setShowDisappearing(false);
    setReportCtx(null);
  }, [selectedUser?.id]);

  // reset search when switching chats
  useEffect(() => {
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults([]);
    setPinIndex(0);
  }, [selectedUser?.id]);

  // debounced server-side search
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

  const callLogCount = timeline.length - list.length;
  useEffect(() => {
    if (callLogCount > 0 && stickToBottomRef.current) scrollToBottom("smooth");
  }, [callLogCount, scrollToBottom]);

  // Escape closes the popover (modals + image viewer handle their own Esc)
  useEffect(() => {
    if (!popover) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover]);

  useEffect(() => {
    if (!popover) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-popover-ui]")) setPopover(null);
    };
    const onResize = () => setPopover(null);
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

  const closePopover = () => setPopover(null);

  const handleCopyText = async (message) => {
    closePopover();
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

  const handleCopyFileLink = async (message) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(message.file?.url || "");
      toast.success("File link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleCopyAudioLink = async (message) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(message.audio?.url || "");
      toast.success("Voice message link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleCopyVideoLink = async (message) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(message.video?.url || "");
      toast.success("Video link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

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

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickToBottomRef.current = atBottom;
    setShowFab(!atBottom);
    if (atBottom) setUnread(0);
    if (popover) setPopover(null);
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

  // archive state of the open chat (sidebar list me isArchived flag hota hai)
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
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ChatHeader />
          <MessageSkeleton />
          {inputArea}
        </div>
      </MotionConfig>
    );
  }

  const renderStatus = (message) => {
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
    const mine = sameId(message.senderId, authUser?.id);
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

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader />

        {/* Toolbar: search + scheduled + disappearing + archive + report */}
        <div className="flex items-center gap-1 border-b border-base-300 bg-base-100 px-3 py-1">
          <AnimatePresence mode="wait" initial={false}>
            {searchOpen ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14, transition: { duration: 0.1 } }}
                transition={springSnappy}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <Search className="size-4 shrink-0 text-base-content/50" />
                <input
                  autoFocus
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      setSearchQ("");
                    }
                  }}
                  placeholder="Search in this chat"
                  className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
                />
                {searching && <Loader2 className="size-4 animate-spin" />}
                <motion.button
                  type="button"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQ("");
                  }}
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14, transition: { duration: 0.1 } }}
                transition={springSnappy}
                className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar"
              >
                <ToolbarBtn icon={Search} onClick={() => setSearchOpen(true)}>
                  Search
                </ToolbarBtn>
                <ToolbarBtn icon={Clock} onClick={openScheduled}>
                  Scheduled
                  <AnimatedBadge show={scheduled.length > 0}>
                    {scheduled.length}
                  </AnimatedBadge>
                </ToolbarBtn>
                <ToolbarBtn
                  icon={Timer}
                  onClick={() => setShowDisappearing(true)}
                >
                  Disappearing
                  <AnimatedBadge show={disappearAfter > 0}>
                    {timerLabel(disappearAfter)}
                  </AnimatedBadge>
                </ToolbarBtn>
                <ToolbarBtn
                  icon={isArchived ? ArchiveRestore : Archive}
                  onClick={handleArchive}
                >
                  {isArchived ? "Unarchive" : "Archive"}
                </ToolbarBtn>
                <ToolbarBtn
                  icon={Flag}
                  className="ml-auto text-error"
                  onClick={() => setReportCtx({})}
                >
                  Report
                </ToolbarBtn>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
            className="flex-1 overflow-y-auto overscroll-contain bg-base-200/40 px-3 py-5 sm:px-6"
          >
            {timeline.length === 0 && (
              <motion.div
                {...fade}
                className="flex h-full flex-col items-center justify-center gap-3 text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ ...springSnappy, damping: 16 }}
                  className="flex size-14 items-center justify-center rounded-2xl border border-base-300 bg-base-100 shadow-sm"
                >
                  <MessageSquareText className="size-6 text-base-content/50" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.08 }}
                >
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm text-base-content/60">
                    Say hi to {selectedUser?.fullName} to start the
                    conversation.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {timeline.map((item, i) => {
              const prev = timeline[i - 1];
              const next = timeline[i + 1];

              // ---- call log row ----
              if (item.kind === "call") {
                return (
                  <CallLogRow
                    key={item.id}
                    item={item}
                    prev={prev}
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
                );
              }

              // ---- normal message ----
              const message = item;
              const isMine = sameId(message.senderId, authUser?.id);

              const showDay =
                message.createdAt &&
                (!prev?.createdAt ||
                  !sameDay(prev.createdAt, message.createdAt));
              const startsGroup =
                !prev || showDay || !sameId(prev.senderId, message.senderId);
              const endsGroup =
                !next ||
                !sameId(next.senderId, message.senderId) ||
                (next.createdAt &&
                  message.createdAt &&
                  !sameDay(next.createdAt, message.createdAt));

              const pending =
                message.status === "sending" || message.status === "failed";
              const { isDeleted, hasText, hasFile, hasAudio, hasVideo } =
                messageFlags(message, isMine);
              const imageSrc = isDeleted
                ? null
                : message.image?.url || message.localPreview;
              const grouped = isDeleted
                ? []
                : groupReactions(message.reactions, authUser?.id);

              const reply = isDeleted ? null : resolveReply(message, list);
              const hasPreview =
                !isDeleted && Boolean(message.linkPreview?.url);
              const isForwarded = !isDeleted && Boolean(message.isForwarded);

              const reactOpen =
                popover?.type === "react" && sameId(popover.id, message.id);
              const menuOpen =
                popover?.type === "menu" && sameId(popover.id, message.id);

              const isFresh =
                pending ||
                (message.createdAt &&
                  Date.now() - new Date(message.createdAt).getTime() < 5000);

              const highlighted = sameId(highlightId, message.id);
              const failed = message.status === "failed";

              return (
                <div key={message.clientId || message.id}>
                  {showDay && <DayChip value={message.createdAt} />}

                  <motion.div
                    id={`msg-${message.id}`}
                    initial={
                      isFresh
                        ? {
                            opacity: 0,
                            x: isMine ? 26 : -26,
                            y: 10,
                            scale: 0.96,
                          }
                        : false
                    }
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    transition={spring}
                    style={{
                      transformOrigin: isMine ? "bottom right" : "bottom left",
                    }}
                    className={`group flex items-end gap-2 rounded-xl transition-colors duration-500 ${
                      highlighted ? "bg-primary/15" : ""
                    } ${isMine ? "flex-row-reverse" : ""} ${
                      startsGroup ? cs.groupGap : cs.rowGap
                    }`}
                  >
                    <div className="size-8 shrink-0">
                      {endsGroup && (
                        <motion.img
                          initial={isFresh ? { scale: 0.5, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={springSnappy}
                          src={avatarSrc(
                            isMine ? authUser?.avatar : selectedUser?.avatar,
                          )}
                          alt=""
                          className="size-8 rounded-full border border-base-300 object-cover"
                        />
                      )}
                    </div>

                    <div
                      className={`flex min-w-0 max-w-[80%] flex-col sm:max-w-[65%] ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Bubble + action buttons */}
                      <div
                        className={`flex min-w-0 max-w-full items-center gap-0.5 ${
                          isMine ? "flex-row-reverse" : ""
                        }`}
                      >
                        {isDeleted ? (
                          <div
                            className={`flex items-center gap-1.5 border border-base-300 bg-base-100 px-3.5 py-2 italic text-base-content/60 ${cs.radius} ${
                              endsGroup
                                ? isMine
                                  ? cs.tailMine
                                  : cs.tailTheirs
                                : ""
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
                          <motion.div
                            animate={
                              failed ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                            }
                            transition={{ duration: 0.4 }}
                            className={`min-w-0 max-w-full ${
                              hasText || hasAudio || reply || isForwarded
                                ? "px-3.5 py-2"
                                : "p-1"
                            } ${cs.radius} shadow-sm ${
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
                                authId={authUser?.id}
                                peerName={selectedUser?.fullName}
                                onClick={() => scrollToMessage(reply.id)}
                              />
                            )}

                            {imageSrc && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPreviewSrc(imageSrc)}
                                className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
                                aria-label="Open image"
                              >
                                <img
                                  src={imageSrc}
                                  alt="Attachment"
                                  decoding="async"
                                  onLoad={() =>
                                    stickToBottomRef.current &&
                                    scrollToBottom("auto")
                                  }
                                  className={`max-h-64 w-auto max-w-full rounded-xl object-cover ${
                                    hasText ? "mb-2" : ""
                                  } ${pending ? "opacity-60" : ""}`}
                                />
                              </motion.button>
                            )}
                            {hasFile && (
                              <div className={hasText ? "mb-2" : ""}>
                                <FileAttachment
                                  file={message.file}
                                  isMine={isMine}
                                  uploading={message.status === "sending"}
                                  progress={message.uploadProgress}
                                />
                              </div>
                            )}
                            {hasAudio && (
                              <div
                                className={`max-w-full ${hasText ? "mb-2" : ""}`}
                              >
                                <VoiceMessage
                                  audio={message.audio}
                                  isMine={isMine}
                                  uploading={message.status === "sending"}
                                />
                              </div>
                            )}
                            {hasVideo && (
                              <div
                                className={`max-w-full ${hasText ? "mb-2" : ""}`}
                              >
                                <VideoMessage
                                  video={message.video}
                                  uploading={message.status === "sending"}
                                  progress={message.uploadProgress}
                                />
                              </div>
                            )}
                            {hasText && (
                              <p
                                className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] ${
                                  largeEmoji && isEmojiOnly(message.text)
                                    ? "text-4xl leading-tight"
                                    : cs.text
                                }`}
                              >
                                {message.text}
                              </p>
                            )}

                            {hasPreview && (
                              <LinkPreviewCard
                                preview={message.linkPreview}
                                isMine={isMine}
                              />
                            )}
                          </motion.div>
                        )}

                        <AnimatePresence initial={false}>
                          {message.isPinned && !isDeleted && (
                            <motion.span
                              key="pin"
                              initial={{ scale: 0, rotate: -40 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ ...springSnappy, damping: 14 }}
                              className="flex shrink-0"
                            >
                              <Pin
                                className="size-3 text-base-content/40"
                                aria-label="Pinned"
                              />
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {!pending && !isDeleted && (
                          <button
                            type="button"
                            data-popover-ui
                            onClick={(e) =>
                              openPopover(e, "react", message, isMine)
                            }
                            className={actionBtnClass(reactOpen)}
                            aria-label="React to message"
                            aria-haspopup="true"
                            aria-expanded={reactOpen}
                            title="React"
                          >
                            <SmilePlus className="size-4" />
                          </button>
                        )}

                        {!pending && (
                          <button
                            type="button"
                            data-popover-ui
                            onClick={(e) =>
                              openPopover(e, "menu", message, isMine)
                            }
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
                          <AnimatePresence initial={false}>
                            {grouped.map((r) => (
                              <motion.button
                                key={r.emoji}
                                layout="position"
                                initial={{ opacity: 0, scale: 0.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.4 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 28,
                                }}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.88 }}
                                type="button"
                                onClick={() =>
                                  reactToMessage(message.id, r.emoji)
                                }
                                className={`flex items-center gap-1 rounded-full border bg-base-100 px-1.5 py-0.5 text-xs shadow-sm transition-colors ${
                                  r.mine
                                    ? "border-primary bg-primary/10"
                                    : "border-base-300 hover:bg-base-200"
                                }`}
                              >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span>{r.count}</span>}
                              </motion.button>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}

                      {(endsGroup || pending) && (
                        <div className="mt-1 px-1 text-[11px] text-base-content/50">
                          {renderStatus(message)}
                        </div>
                      )}

                      {failed && (
                        <div className="mt-0.5 flex gap-3 px-1 text-xs">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={() => retryMessage(message.clientId)}
                          >
                            <RotateCw className="size-3" />
                            Retry
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-base-content/60 hover:text-error hover:underline"
                            onClick={() => discardMessage(message.clientId)}
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
            })}
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

        {/* Reaction picker + options menu */}
        {createPortal(
          <AnimatePresence>
            {popover && popoverMessage && popoverFlags && (
              <PopoverShell
                key={`${popover.type}-${popover.id}`}
                type={popover.type}
                id={popover.id}
                top={popover.top}
                left={popover.left}
                width={popover.type === "react" ? REACT_W : MENU_W}
              >
                {popover.type === "react" ? (
                  QUICK_REACTIONS.map((emoji) => (
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
                ) : (
                  <>
                    {/* actions */}
                    {popoverFlags.canReply && (
                      <MenuItem
                        icon={Reply}
                        label="Reply"
                        onClick={() => handleReply(popoverMessage)}
                      />
                    )}
                    {popoverFlags.canForward && (
                      <MenuItem
                        icon={Forward}
                        label="Forward"
                        onClick={() => handleForward(popoverMessage)}
                      />
                    )}
                    {popoverFlags.canPin && (
                      <MenuItem
                        icon={popoverFlags.isPinned ? PinOff : Pin}
                        label={popoverFlags.isPinned ? "Unpin" : "Pin"}
                        onClick={() => handleTogglePin(popoverMessage)}
                      />
                    )}
                    {popoverFlags.canEdit && (
                      <MenuItem
                        icon={Pencil}
                        label="Edit"
                        onClick={() => handleEdit(popoverMessage)}
                      />
                    )}
                    {popoverFlags.canReport && (
                      <MenuItem
                        icon={Flag}
                        label="Report"
                        onClick={() => handleReport(popoverMessage)}
                      />
                    )}
                    {(popoverFlags.canReply ||
                      popoverFlags.canForward ||
                      popoverFlags.canPin ||
                      popoverFlags.canEdit ||
                      popoverFlags.canReport) && (
                      <div className="my-1 border-t border-base-300" />
                    )}

                    {/* copy */}
                    {popoverFlags.hasText && (
                      <MenuItem
                        icon={Copy}
                        label="Copy text"
                        onClick={() => handleCopyText(popoverMessage)}
                      />
                    )}
                    {popoverFlags.hasImage && (
                      <>
                        <MenuItem
                          icon={ImageIcon}
                          label="Copy image"
                          onClick={() => handleCopyImage(popoverMessage)}
                        />
                        <MenuItem
                          icon={Link2}
                          label="Copy image link"
                          onClick={() => handleCopyLink(popoverMessage)}
                        />
                      </>
                    )}
                    {popoverFlags.hasFileUrl && (
                      <MenuItem
                        icon={Link2}
                        label="Copy file link"
                        onClick={() => handleCopyFileLink(popoverMessage)}
                      />
                    )}
                    {popoverFlags.hasAudio && (
                      <MenuItem
                        icon={Link2}
                        label="Copy voice message link"
                        onClick={() => handleCopyAudioLink(popoverMessage)}
                      />
                    )}
                    {popoverFlags.hasVideo && (
                      <MenuItem
                        icon={Link2}
                        label="Copy video link"
                        onClick={() => handleCopyVideoLink(popoverMessage)}
                      />
                    )}
                    {(popoverFlags.hasText ||
                      popoverFlags.hasImage ||
                      popoverFlags.hasFileUrl ||
                      popoverFlags.hasAudio ||
                      popoverFlags.hasVideo) && (
                      <div className="my-1 border-t border-base-300" />
                    )}

                    {/* delete */}
                    <MenuItem
                      icon={Trash2}
                      label="Delete for me"
                      onClick={() => handleDeleteForMe(popoverMessage)}
                    />
                    {popoverFlags.canDeleteForAll && (
                      <MenuItem
                        icon={Trash2}
                        label="Delete for everyone"
                        danger
                        onClick={() => askDeleteForEveryone(popoverMessage)}
                      />
                    )}
                  </>
                )}
              </PopoverShell>
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

        <ImageViewer src={previewSrc} onClose={() => setPreviewSrc(null)} />
      </div>
    </MotionConfig>
  );
};

export default ChatContainer;
