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
  Ban,
  Check,
  CheckCheck,
  Copy,
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  MessageSquareText,
  Mic,
  MoreVertical,
  Paperclip,
  RotateCw,
  Send,
  Smile,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
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
import AiAssist from "../common/AiAssist.jsx";
import VoiceMessage, { formatDuration } from "./VoiceMessage.jsx";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MENU_W = 208;
const REACT_W = 248;
const REACT_H = 48;

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;

// File picker hint: documents, archives, audio, video (images are excluded).
// Browsers can't say "everything except images", so selectFile() also
// validates in JS — this list just makes the OS dialog friendlier.
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
      whileTap={{ scale: 0.97 }}
      className={`${cls} transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      {body}
    </motion.a>
  ) : (
    <div className={cls}>{body}</div>
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
    open
      ? "opacity-100 bg-base-300/60"
      : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
  }`;

const MenuItem = ({ icon: Icon, label, onClick, danger = false }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`w-full h-10 flex items-center gap-2.5 px-3 text-sm text-left outline-none transition-colors ${
      danger
        ? "text-error hover:bg-error/10 focus-visible:bg-error/10"
        : "hover:bg-base-200 focus-visible:bg-base-200"
    }`}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

/* onToggleInfo -> opens / closes the right-side GroupInfoPanel (from HomePage) */
const GroupChatContainer = ({ onToggleInfo }) => {
  const {
    selectedGroup,
    groupMessages,
    isGroupMessagesLoading,
    typing,
    sendMessage,
    retryMessage,
    discardMessage,
    closeGroup,
    emitTyping,
    markSeen,
    // optional — only used if your store has them
    reactToMessage,
    deleteForMe,
    deleteForEveryone,
  } = useGroupStore();
  const { authUser } = useAuthStore();
  // hiding your own online status also hides others' status from you
  const onlineUsers = useVisibleOnlineUsers();

  // user settings + bubble classes
  const s = useAppearanceStore((st) => st.appearance);
  const typingEnabled = usePrivacyStore((st) => st.privacy.typingIndicator);
  // Chat prefs are backend-authoritative
  const { enterToSend, largeEmoji, autoScroll } = useChatPrefsStore(
    (st) => st.prefs,
  );
  const cs = chatStyle(s);

  // Respect Settings > Appearance > reduce motion (else follow the OS setting)
  const motionMode = s.reduceMotion ? "always" : "user";

  const [text, setText] = useState("");
  const [file, setFile] = useState(null); // image or any other file
  const [preview, setPreview] = useState(""); // images only
  const [showEmoji, setShowEmoji] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [popover, setPopover] = useState(null); // { type, id, top, left }
  const [confirmId, setConfirmId] = useState(null);

  // Voice notes: record -> auto-send on stop (cancel discards)
  const recorder = useVoiceRecorder({
    onComplete: (voice) => sendMessage({ voice }),
    onError: (msg) => toast.error(msg),
  });
  const recorderBusy = recorder.state !== "idle";

  const listRef = useRef(null);
  const fileRef = useRef(null); // documents etc. (paperclip) — NO images
  const imageRef = useRef(null); // images only (image icon)
  const textRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const dragDepth = useRef(0);
  const stickToBottomRef = useRef(true);
  const lastGroupRef = useRef(null);
  // With receipts OFF we never show up in readBy, so remember the last key sent per group
  const lastSeenSentRef = useRef({});

  const myId = String(authUser?.id);
  const group = selectedGroup;
  const list = Array.isArray(groupMessages) ? groupMessages : [];
  const last = list[list.length - 1];
  const lastKey = last ? last.clientId || last.id : null;
  const lastIsMine = last ? sameId(last.senderId, myId) : false;

  const fileIsImage = isImageFile(file);
  const PreviewIcon = file ? getFileIcon(file.type, file.name) : null;

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /* ---- scroll: only on new message / group switch ---- */
  // useLayoutEffect fires before browser paint — same rationale as ChatContainer.
  useLayoutEffect(() => {
    if (isGroupMessagesLoading || !listRef.current) return;
    const changed = lastGroupRef.current !== group?.id;
    lastGroupRef.current = group?.id;
    if (changed) {
      stickToBottomRef.current = true;
      // rAF: let flex-layout finish measuring new container height before scrolling
      requestAnimationFrame(() => {
        if (listRef.current)
          listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "auto",
          });
      });
      return;
    }
    // Own message: always scroll. Others: scroll only when already at the bottom.
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

  /* ---- image preview (non-image files don't get a preview URL) ---- */
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
    recorder.cancel(); // never carry a live recording into another group
    setText("");
    setFile(null);
    setShowEmoji(false);
    setPopover(null);
    setConfirmId(null);
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

  /* ---- SEEN (the server decides whether a receipt is sent) ---- */
  const hasUnseen = useMemo(
    () =>
      list.some(
        (m) =>
          !m.pending &&
          !m.failed &&
          !sameId(m.senderId, myId) &&
          !(m.readBy || []).some((id) => sameId(id, myId)),
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

  /* ---- Escape: confirm -> popover -> image viewer ---- */
  useEffect(() => {
    if (!popover && !confirmId && !previewSrc) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmId) setConfirmId(null);
      else if (popover) setPopover(null);
      else setPreviewSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover, confirmId, previewSrc]);

  /* ---- close popover on outside click / resize ---- */
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

  /* ---- ONLINE count ---- */
  const onlineCount = useMemo(() => {
    const ids = new Set(toIds(onlineUsers));
    return (group?.members || []).filter((m) => ids.has(String(m.id))).length;
  }, [group?.members, onlineUsers]);

  /* ---- input handlers ---- */
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(false);
    }
  };

  // Settings > Privacy > typing OFF: stop immediately
  useEffect(() => {
    if (!typingEnabled) stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingEnabled]);

  if (!group) return null;

  const typingNames = Object.entries(typing?.[group.id] || {})
    .filter(([uid]) => uid !== myId)
    .map(([, name]) => name?.split(" ")[0]);

  // Own typing indicator OFF = others' typing is hidden from you too
  const typingText =
    !typingEnabled || typingNames.length === 0
      ? ""
      : typingNames.length === 1
        ? `${typingNames[0]} is typing…`
        : typingNames.length === 2
          ? `${typingNames[0]} and ${typingNames[1]} are typing…`
          : "Several people are typing…";

  /* ---- message flags / menu ---- */
  const flagsOf = (m, mine) => {
    const isDeleted = Boolean(m.isDeleted);
    return {
      isDeleted,
      hasText: !isDeleted && Boolean(m.text),
      hasImage: !isDeleted && Boolean(m.image?.url),
      hasFile: !isDeleted && Boolean(m.file?.name),
      hasFileUrl: !isDeleted && Boolean(m.file?.url),
      hasAudio: !isDeleted && Boolean(m.audio?.url),
      canDeleteForMe: !isDeleted && Boolean(deleteForMe),
      canDeleteForAll: mine && !isDeleted && Boolean(deleteForEveryone),
    };
  };

  const copyCount = (f) =>
    (f.hasText ? 1 : 0) +
    (f.hasImage ? 2 : 0) +
    (f.hasFileUrl ? 1 : 0) +
    (f.hasAudio ? 1 : 0);

  const menuItemsCount = (f) =>
    copyCount(f) + (f.canDeleteForMe ? 1 : 0) + (f.canDeleteForAll ? 1 : 0);

  const menuHeight = (f) => {
    const copyItems = copyCount(f);
    return (
      menuItemsCount(f) * 40 +
      8 +
      (copyItems && menuItemsCount(f) > copyItems ? 9 : 0)
    );
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
        : placePopover(rect, MENU_W, menuHeight(flagsOf(m, mine)), align);
    setPopover({ type, id: m.id, ...pos });
  };
  const closePopover = () => setPopover(null);

  const handleCopyText = async (m) => {
    closePopover();
    const ok = await copyMessageText(m.text);
    ok ? toast.success("Text copied") : toast.error("Couldn't copy text");
  };
  // NOTE: copyMessageImage must be called right inside the click handler
  const handleCopyImage = async (m) => {
    closePopover();
    const result = await copyMessageImage(m.image?.url);
    if (result === "image") toast.success("Image copied");
    else if (result === "url")
      toast.success("Image copy isn't supported here — link copied");
    else toast.error("Couldn't copy image");
  };
  const handleCopyLink = async (m) => {
    closePopover();
    const ok = await copyImageLink(m.image?.url);
    ok ? toast.success("Image link copied") : toast.error("Couldn't copy link");
  };
  const handleCopyFileLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(m.file?.url || "");
      toast.success("File link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };
  const handleCopyAudioLink = async (m) => {
    closePopover();
    try {
      await navigator.clipboard.writeText(m.audio?.url || "");
      toast.success("Voice message link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (popover) setPopover(null);
  };

  const handleChange = (e) => {
    setText(e.target.value);

    // Settings > Privacy > "Typing indicator" (off = never tell others)
    if (!typingEnabled) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, 2000);
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
  };

  /**
   * Validate + select. Picker, paste and drop all end up here.
   * kind:
   *   "image" -> image button: ONLY images allowed
   *   "file"  -> paperclip:    ONLY non-image files allowed
   *   "any"   -> paste / drop: type decides, both allowed
   */
  const selectFile = (f, kind = "any") => {
    if (!f) return;
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

  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    stopTyping();
    // Images use `imageFile`; other files go as `attachment`
    sendMessage({
      text,
      imageFile: fileIsImage ? file : null,
      attachment: file && !fileIsImage ? file : null,
    });
    setText("");
    clearFile();
    setShowEmoji(false);
  };

  // Settings > Chat > "Enter to send"
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const wantsSend = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
    if (wantsSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    stopTyping();
    setShowEmoji(false);
    recorder.start();
  };

  // One picker handler per input, each enforcing its own kind
  const pickFromInput = (kind) => (e) => {
    selectFile(e.target.files?.[0], kind);
    // allow choosing the same file again
    e.target.value = "";
  };
  const pickImage = pickFromInput("image");
  const pickDoc = pickFromInput("file");

  // Paste: screenshot or copied file
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

  // Drag & drop (depth counter prevents flicker)
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

  /* ---- status line under a bubble ---- */
  const renderStatus = (m, mine, seenBy) => {
    if (m.pending) {
      return (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          Sending…
        </span>
      );
    }
    if (m.failed) {
      return (
        <span className="inline-flex items-center gap-1 text-error">
          <AlertCircle className="size-3" />
          Not sent
        </span>
      );
    }

    // Settings > Appearance > timestamps + 12h/24h
    const time =
      m.createdAt && s.showTimestamps
        ? formatTime(m.createdAt, s.timeFormat)
        : "";
    if (!mine || m.isDeleted) return time;

    return (
      <span className="inline-flex items-center gap-1">
        {time}
        {seenBy > 0 ? (
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

  /* ---- popover data ---- */
  const popoverMessage = popover
    ? list.find((m) => sameId(m.id, popover.id))
    : null;
  const popoverIsMine = popoverMessage
    ? sameId(popoverMessage.senderId, myId)
    : false;
  const popoverFlags = popoverMessage
    ? flagsOf(popoverMessage, popoverIsMine)
    : null;
  const myReaction = popoverMessage
    ? (popoverMessage.reactions || []).find((r) => sameId(r.userId, myId))
        ?.emoji
    : null;

  return (
    <MotionConfig reducedMotion={motionMode}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-base-100">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
          <button
            type="button"
            onClick={onToggleInfo}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            {group.avatar ? (
              <img
                src={avatarSrc(group.avatar)}
                alt=""
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {group.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{group.name}</div>
              <div className="text-xs truncate">
                <AnimatePresence mode="wait" initial={false}>
                  {typingText ? (
                    <motion.span
                      key="typing"
                      {...fade}
                      className="text-primary block"
                    >
                      {typingText}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="members"
                      {...fade}
                      className="text-base-content/60 block"
                    >
                      {group.members.length} members ·{" "}
                      <span className={onlineCount > 0 ? "text-success" : ""}>
                        {onlineCount} online
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle xl:hidden"
            onClick={onToggleInfo}
            aria-label="Group info"
          >
            <Info className="size-5" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={closeGroup}
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6 bg-base-200/40"
        >
          {isGroupMessagesLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-base-content/40" />
            </div>
          )}

          {!isGroupMessagesLoading && list.length === 0 && (
            <motion.div
              {...fade}
              className="h-full flex flex-col items-center justify-center text-center gap-3"
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

          {list.map((m, i) => {
            const prev = list[i - 1];
            const next = list[i + 1];
            const mine = sameId(m.senderId, myId);

            const showDay =
              m.createdAt &&
              (!prev?.createdAt || !sameDay(prev.createdAt, m.createdAt));
            const startsGroup =
              !prev || showDay || !sameId(prev.senderId, m.senderId);
            const endsGroup =
              !next ||
              !sameId(next.senderId, m.senderId) ||
              (next.createdAt &&
                m.createdAt &&
                !sameDay(next.createdAt, m.createdAt));

            const pending = Boolean(m.pending || m.failed);
            const isDeleted = Boolean(m.isDeleted);
            const hasText = !isDeleted && Boolean(m.text);
            const hasFile = !isDeleted && Boolean(m.file?.name);
            const hasAudio = !isDeleted && Boolean(m.audio?.url);
            const imageSrc = isDeleted ? null : m.image?.url || m.localPreview;
            const grouped = isDeleted ? [] : groupReactions(m.reactions, myId);

            const seenBy = (m.readBy || []).filter(
              (id) => !sameId(id, m.senderId),
            ).length;
            const sender =
              m.sender || group.members.find((x) => sameId(x.id, m.senderId));

            const flags = flagsOf(m, mine);
            const showMenu = !pending && menuItemsCount(flags) > 0;
            const showReact = !pending && !isDeleted && Boolean(reactToMessage);

            const reactOpen =
              popover?.type === "react" && sameId(popover.id, m.id);
            const menuOpen =
              popover?.type === "menu" && sameId(popover.id, m.id);

            // Animate only brand-new messages, so opening an old group
            // doesn't replay an animation for every bubble.
            const isFresh =
              pending ||
              (m.createdAt &&
                Date.now() - new Date(m.createdAt).getTime() < 5000);

            return (
              <div key={m.clientId || m.id}>
                {showDay && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-base-content/60 bg-base-100 border border-base-300 rounded-full px-3 py-1">
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}

                <motion.div
                  initial={isFresh ? { opacity: 0, y: 12, scale: 0.97 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  style={{
                    transformOrigin: mine ? "bottom right" : "bottom left",
                  }}
                  className={`group flex items-end gap-2 ${
                    mine ? "flex-row-reverse" : ""
                  } ${startsGroup ? cs.groupGap : cs.rowGap}`}
                >
                  <div className="size-8 shrink-0">
                    {endsGroup && (
                      <img
                        src={avatarSrc(
                          mine ? authUser?.avatar : sender?.avatar,
                        )}
                        alt=""
                        className="size-8 rounded-full object-cover border border-base-300"
                      />
                    )}
                  </div>

                  <div
                    className={`flex flex-col min-w-0 max-w-[80%] sm:max-w-[65%] ${
                      mine ? "items-end" : "items-start"
                    }`}
                  >
                    {/* sender name (group only) */}
                    {!mine && startsGroup && (
                      <span className="text-xs font-medium text-base-content/60 mb-0.5 ml-1">
                        {sender?.fullName || "Unknown"}
                      </span>
                    )}

                    {/* Bubble + action buttons */}
                    <div
                      className={`flex items-center gap-0.5 min-w-0 ${
                        mine ? "flex-row-reverse" : ""
                      }`}
                    >
                      {isDeleted ? (
                        <div
                          className={`px-3.5 py-2 ${cs.radius} border border-base-300 bg-base-100 text-base-content/60 italic flex items-center gap-1.5 ${
                            endsGroup
                              ? mine
                                ? cs.tailMine
                                : cs.tailTheirs
                              : ""
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
                          className={`min-w-0 ${
                            hasText || hasAudio ? "px-3.5 py-2" : "p-1"
                          } ${cs.radius} shadow-sm ${
                            mine
                              ? `bg-primary text-primary-content ${
                                  endsGroup ? cs.tailMine : ""
                                }`
                              : `bg-base-100 border border-base-300 ${
                                  endsGroup ? cs.tailTheirs : ""
                                }`
                          } ${m.failed ? "ring-1 ring-error" : ""}`}
                        >
                          {imageSrc && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setPreviewSrc(imageSrc)}
                              className="block focus-visible:outline-2 focus-visible:outline-offset-2 rounded-xl"
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
                            <div className={hasText ? "mb-2" : ""}>
                              <VoiceMessage
                                audio={m.audio}
                                isMine={mine}
                                uploading={Boolean(m.pending)}
                              />
                            </div>
                          )}
                          {hasText && (
                            <p
                              className={`whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed ${
                                largeEmoji && isEmojiOnly(m.text)
                                  ? "text-4xl leading-tight"
                                  : cs.text
                              }`}
                            >
                              {m.text}
                            </p>
                          )}
                        </div>
                      )}

                      {showReact && (
                        <button
                          type="button"
                          data-popover-ui
                          onClick={(e) => openPopover(e, "react", m, mine)}
                          className={actionBtnClass(reactOpen)}
                          aria-label="React to message"
                          aria-haspopup="true"
                          aria-expanded={reactOpen}
                          title="React"
                        >
                          <SmilePlus className="size-4" />
                        </button>
                      )}

                      {showMenu && (
                        <button
                          type="button"
                          data-popover-ui
                          onClick={(e) => openPopover(e, "menu", m, mine)}
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
                          mine ? "justify-end" : ""
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
                              whileTap={{ scale: 0.88 }}
                              type="button"
                              onClick={() => reactToMessage?.(m.id, r.emoji)}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs bg-base-100 shadow-sm transition-colors ${
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
                        {renderStatus(m, mine, seenBy)}
                      </div>
                    )}

                    {m.failed && (
                      <div className="flex gap-3 mt-0.5 px-1 text-xs">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={() => retryMessage(m.clientId)}
                        >
                          <RotateCw className="size-3" />
                          Retry
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-base-content/60 hover:text-error hover:underline"
                          onClick={() => discardMessage(m.clientId)}
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

        {/* Input */}
        <div className="relative border-t border-base-300 p-3">
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
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-base-300 flex items-center justify-center"
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
                className="absolute bottom-full left-3 mb-2 z-40 max-w-[calc(100%-1.5rem)]"
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

          {/* Recording bar (replaces the composer while recording) */}
          {recorderBusy && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2"
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

          {/* `relative` so the AiAssist menu/result can anchor to the form */}
          {!recorderBusy && (
            <form
              onSubmit={handleSend}
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
                isDragging
                  ? "border-primary border-dashed bg-primary/10"
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

              {/* Image button — images only */}
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

              {/* File button — files only (no images) */}
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
                data-emoji-ui
                whileTap={{ scale: 0.88 }}
                className={`btn btn-ghost btn-sm btn-circle ${showEmoji ? "text-primary" : ""}`}
                onClick={() => setShowEmoji((v) => !v)}
                aria-label="Emoji"
                aria-expanded={showEmoji}
              >
                <Smile className="size-5" />
              </motion.button>

              {/* AI assist (hides itself when turned off in Settings) */}
              <AiAssist
                text={text}
                resetKey={group.id}
                onApply={(v) => {
                  setText(v);
                  textRef.current?.focus();
                }}
              />

              {/* Images only */}
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                hidden
                onChange={pickImage}
              />

              {/* Files only (non-image) */}
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
                placeholder="Write a message…"
                className="flex-1 resize-none bg-transparent outline-none py-1.5 text-sm max-h-[120px]"
              />

              {/* Send when there's content, otherwise record a voice note */}
              {text.trim() || file ? (
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-primary btn-sm btn-circle"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.88 }}
                  className="btn btn-primary btn-sm btn-circle"
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
            <p className="mt-1.5 px-1 text-[11px] text-base-content/50">
              {enterToSend
                ? "Enter to send · Shift+Enter for a new line"
                : "Enter for a new line · Ctrl+Enter to send"}
            </p>
          )}
        </div>

        {/* Reaction picker + options menu */}
        {createPortal(
          <AnimatePresence>
            {popover && popoverMessage && popoverFlags && (
              <motion.div
                key={`${popover.type}-${popover.id}`}
                data-popover-ui
                role={popover.type === "react" ? "toolbar" : "menu"}
                aria-label={popover.type === "react" ? "Reactions" : undefined}
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
                {popover.type === "react" ? (
                  QUICK_REACTIONS.map((emoji) => (
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
                ) : (
                  <>
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
                    {copyCount(popoverFlags) > 0 &&
                      (popoverFlags.canDeleteForMe ||
                        popoverFlags.canDeleteForAll) && (
                        <div className="my-1 border-t border-base-300" />
                      )}
                    {popoverFlags.canDeleteForMe && (
                      <MenuItem
                        icon={Trash2}
                        label="Delete for me"
                        onClick={() => {
                          closePopover();
                          deleteForMe(popoverMessage.id);
                        }}
                      />
                    )}
                    {popoverFlags.canDeleteForAll && (
                      <MenuItem
                        icon={Trash2}
                        label="Delete for everyone"
                        danger
                        onClick={() => {
                          closePopover();
                          setConfirmId(popoverMessage.id);
                        }}
                      />
                    )}
                  </>
                )}
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
                      onClick={() => {
                        deleteForEveryone(confirmId);
                        setConfirmId(null);
                      }}
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

        {/* Image viewer */}
        <AnimatePresence>
          {previewSrc && (
            <motion.div
              key="image-viewer"
              {...fade}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setPreviewSrc(null)}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="absolute top-4 right-4 btn btn-circle btn-sm"
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
      </div>
    </MotionConfig>
  );
};

export default GroupChatContainer;
