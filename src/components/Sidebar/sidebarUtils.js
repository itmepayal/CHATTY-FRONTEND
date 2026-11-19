export const sameId = (a, b) => String(a) === String(b);

export const formatCount = (n) => (n > 99 ? "99+" : String(n));

export const avatarSrc = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "/avatar.png";

export const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

export const SHOW_ONLY_CONTACTS = true;
export const KEEP_CONVERSATIONS = true;

export const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "favorites", label: "Favorites" },
];

export const PRESENCE = [
  { key: "any", label: "Any" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

export const CALL_FILTERS = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
];

export const MODE_ORDER = ["chats", "groups", "calls"];

export const SPRING = { type: "spring", stiffness: 500, damping: 40 };

export const rowVariants = {
  hidden: { opacity: 0, y: 4 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, delay: Math.min(i, 8) * 0.02 },
  }),
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const paneVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: (dir) => ({
    opacity: 0,
    x: dir * -16,
    transition: { duration: 0.12, ease: "easeIn" },
  }),
};

export const formatListTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const now = new Date();

  const startOfDay = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (dayDiff === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

export const isLocation = (m) =>
  Number.isFinite(m.location?.lat) ||
  m.type === "location" ||
  m.messageType === "location";

export const isVideo = (m) =>
  !!(
    m.video ||
    m.videoUrl ||
    m.videoNote ||
    m.type === "video" ||
    m.messageType === "video" ||
    m.mimeType?.startsWith?.("video")
  );

export const isAudio = (m) =>
  !!(
    m.audio ||
    m.voice ||
    m.audioUrl ||
    m.voiceUrl ||
    m.type === "audio" ||
    m.messageType === "audio" ||
    m.mimeType?.startsWith?.("audio")
  );

export const isImage = (m) =>
  !!(m.image || m.type === "image" || m.messageType === "image");

export const isFile = (m) =>
  !!(m.file || m.fileUrl || m.type === "file" || m.messageType === "file");

export const getBody = (m) => {
  if (m.isLocked) return "🔒 Locked conversation";
  if (m.decryptFailed || (m.encrypted && !m.decrypted))
    return "🔒 Encrypted message";
  if (m.text) return m.text;
  if (isLocation(m)) return "📍 Location";
  if (isVideo(m)) return "🎥 Video";
  if (isAudio(m)) return "🎤 Voice message";
  if (isImage(m)) return "📷 Photo";
  if (isFile(m)) return "📎 Document";
  return "💬 Message";
};

export const getPreview = (message, myId) => {
  if (!message) return "No messages yet";
  if (message.isLocked) return "🔒 Locked conversation";
  if (message.isDeleted) return "This message was deleted";

  const base = getBody(message);
  return sameId(message.senderId, myId) ? `You: ${base}` : base;
};

export const getGroupPreview = (message, myId) => {
  if (!message) return "No messages yet";
  if (message.isLocked) return "🔒 Locked conversation";
  if (message.isDeleted) return "This message was deleted";

  const who = sameId(message.senderId, myId)
    ? "You"
    : message.sender?.fullName?.split(" ")[0] || "Someone";
  return `${who}: ${getBody(message)}`;
};

export const timeValue = (u) =>
  u.lastMessageAt ? new Date(u.lastMessageAt).getTime() : 0;

export const hasConversation = (u) =>
  !!(u.lastMessage || u.lastMessageAt || (u.unreadCount || 0) > 0);

const idOf = (x) => (x && typeof x === "object" ? (x._id ?? x.id) : x);

export const formatDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

export const normalizeCall = (c, myId, isGroup) => {
  const callerRaw = c.caller ?? c.initiator ?? c.from ?? c.callerId;
  const callerId = idOf(callerRaw) ?? c.callerId ?? c.initiatorId;
  const outgoing =
    c.direction === "outgoing" ||
    (c.direction !== "incoming" && callerId != null && sameId(callerId, myId));

  const status = String(c.status || c.state || "").toLowerCase();
  const missed =
    c.missed === true ||
    status === "missed" ||
    status === "no-answer" ||
    status === "unanswered" ||
    (!outgoing && (status === "declined" || status === "rejected"));

  const isSeen =
    outgoing ||
    c.seen === true ||
    c.isRead === true ||
    (Array.isArray(c.readBy) &&
      myId &&
      c.readBy.some((id) => sameId(id, myId)));

  const unseenMissed = Boolean(missed && !outgoing && !isSeen);

  let name = "Unknown";
  let avatar = null;
  let otherId = null;
  let groupId = null;

  if (isGroup) {
    const g = c.group ?? {};
    groupId = idOf(c.group) ?? c.groupId;
    name = g.name || c.groupName || "Group call";
    avatar = g.avatar ?? c.groupAvatar ?? null;
  } else {
    const other =
      c.otherUser ??
      c.user ??
      (outgoing
        ? (c.receiver ?? c.callee ?? c.to)
        : (c.caller ?? c.from ?? c.initiator));
    name = other?.fullName || other?.name || c.name || "Unknown";
    avatar = other?.avatar ?? null;
    otherId = idOf(other);
  }

  return {
    key: `${isGroup ? "g" : "u"}-${c._id ?? c.id ?? Math.random()}`,
    id: c._id ?? c.id,
    isGroup,
    groupId,
    otherId,
    name,
    avatar,
    outgoing,
    missed,
    unseenMissed,
    seen: isSeen,
    video:
      c.type === "video" ||
      c.callType === "video" ||
      c.mode === "video" ||
      c.isVideo === true,
    duration: c.duration ?? c.durationSec ?? 0,
    time: c.startedAt ?? c.createdAt ?? c.endedAt ?? null,
  };
};

export const callTime = (c) => (c.time ? new Date(c.time).getTime() : 0);
