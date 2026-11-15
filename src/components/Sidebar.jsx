import {
  Search,
  Users,
  Star,
  X,
  MessageCircle,
  Plus,
  UserPlus,
  UsersRound,
  Settings,
  LogOut,
  Loader2,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useContactStore } from "../store/useContactStore";
import { usePrivacyStore } from "../store/usePrivacyStore";
import { useCallHistoryStore } from "../store/useCallHistoryStore";
import { useGroupCallHistoryStore } from "../store/useGroupCallHistoryStore";
import SidebarSkeleton from "../components/Skeleton/SidebarSkeleton";
import CreateGroupModal from "./modal/CreateGroupModel";
import AddContactModal from "./contact/AddContactModel";

const sameId = (a, b) => String(a) === String(b);

const formatCount = (n) => (n > 99 ? "99+" : String(n));

const avatarSrc = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "/avatar.png";

const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

const SHOW_ONLY_CONTACTS = true;
const KEEP_CONVERSATIONS = true;

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "favorites", label: "Favorites" },
];

const PRESENCE = [
  { key: "any", label: "Any" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
];

const CALL_FILTERS = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
];

const MODE_ORDER = ["chats", "groups", "calls"];

const SPRING = { type: "spring", stiffness: 500, damping: 40 };

const rowVariants = {
  hidden: { opacity: 0, y: 4 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, delay: Math.min(i, 8) * 0.02 },
  }),
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const paneVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: (dir) => ({
    opacity: 0,
    x: dir * -16,
    transition: { duration: 0.12, ease: "easeIn" },
  }),
};

const formatListTime = (value) => {
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

const isLocation = (m) =>
  Number.isFinite(m.location?.lat) ||
  m.type === "location" ||
  m.messageType === "location";

const isVideo = (m) =>
  !!(
    m.video ||
    m.videoUrl ||
    m.videoNote ||
    m.type === "video" ||
    m.messageType === "video" ||
    m.mimeType?.startsWith?.("video")
  );

const isAudio = (m) =>
  !!(
    m.audio ||
    m.voice ||
    m.audioUrl ||
    m.voiceUrl ||
    m.type === "audio" ||
    m.messageType === "audio" ||
    m.mimeType?.startsWith?.("audio")
  );

const isImage = (m) =>
  !!(m.image || m.type === "image" || m.messageType === "image");

const isFile = (m) =>
  !!(m.file || m.fileUrl || m.type === "file" || m.messageType === "file");

const getBody = (m) => {
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

const getPreview = (message, myId) => {
  if (!message) return "No messages yet";
  if (message.isDeleted) return "This message was deleted";

  const base = getBody(message);
  return sameId(message.senderId, myId) ? `You: ${base}` : base;
};

const getGroupPreview = (message, myId) => {
  if (!message) return "No messages yet";
  if (message.isDeleted) return "This message was deleted";

  const who = sameId(message.senderId, myId)
    ? "You"
    : message.sender?.fullName?.split(" ")[0] || "Someone";
  return `${who}: ${getBody(message)}`;
};

const timeValue = (u) =>
  u.lastMessageAt ? new Date(u.lastMessageAt).getTime() : 0;

const hasConversation = (u) =>
  !!(u.lastMessage || u.lastMessageAt || (u.unreadCount || 0) > 0);

const idOf = (x) => (x && typeof x === "object" ? (x._id ?? x.id) : x);

const formatDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

const normalizeCall = (c, myId, isGroup) => {
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
    isGroup,
    groupId,
    otherId,
    name,
    avatar,
    outgoing,
    missed,
    video:
      c.type === "video" ||
      c.callType === "video" ||
      c.mode === "video" ||
      c.isVideo === true,
    duration: c.duration ?? c.durationSec ?? 0,
    time: c.startedAt ?? c.createdAt ?? c.endedAt ?? null,
  };
};

const callTime = (c) => (c.time ? new Date(c.time).getTime() : 0);

const UnreadBadge = ({ count }) =>
  count > 0 ? (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-content"
      aria-label={`${count} unread messages`}
    >
      {formatCount(count)}
    </span>
  ) : null;

const Avatar = ({
  src,
  name,
  group = false,
  online = false,
  selected = false,
}) => (
  <div className="relative shrink-0">
    {group && !src ? (
      <div
        className={`grid size-11 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary ring-2 transition-colors ${
          selected ? "ring-primary/30" : "ring-transparent"
        }`}
      >
        {name?.[0]?.toUpperCase() || <UsersRound className="size-5" />}
      </div>
    ) : (
      <img
        src={src}
        alt={name}
        className={`size-11 rounded-full object-cover ring-2 transition-colors ${
          selected ? "ring-primary/30" : "ring-transparent"
        }`}
      />
    )}
    {online && (
      <span
        className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100"
        aria-label="Online"
      />
    )}
  </div>
);

const IconAvatar = ({ icon: Icon }) => (
  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/60">
    <Icon className="size-5" />
  </span>
);

const Row = ({
  index = 0,
  selected = false,
  onClick,
  avatar,
  title,
  subtitle,
  time,
  unread = 0,
  tone = "default",
  trailing,
  actions,
}) => {
  const hasUnread = unread > 0;
  const danger = tone === "danger";

  return (
    <motion.div
      layout="position"
      variants={rowVariants}
      custom={index}
      initial="hidden"
      animate="show"
      exit="exit"
      className="group relative px-2"
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={`relative flex h-[68px] w-full items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:outline focus-visible:outline-primary/50 ${
          selected ? "" : "hover:bg-base-200 active:bg-base-200"
        }`}
      >
        {selected && (
          <motion.span
            layoutId="sidebar-selected"
            transition={SPRING}
            className="absolute inset-0 rounded-lg bg-primary/10"
          >
            <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" />
          </motion.span>
        )}

        <div className="relative z-10">{avatar}</div>

        <div className="relative z-10 min-w-0 flex-1">
          <div
            className={`truncate text-[15px] ${
              danger ? "text-error" : ""
            } ${hasUnread ? "font-semibold" : "font-medium"}`}
          >
            {title}
          </div>
          <div
            className={`truncate text-[13px] ${
              hasUnread
                ? "font-medium text-base-content"
                : "text-base-content/55"
            }`}
          >
            {subtitle}
          </div>
        </div>

        <div
          className={`relative z-10 flex shrink-0 flex-col items-end self-stretch ${
            time ? "justify-between py-3" : "justify-center"
          }`}
        >
          {time && (
            <span
              className={`whitespace-nowrap text-[11px] ${
                danger
                  ? "font-medium text-error"
                  : hasUnread
                    ? "font-medium text-primary"
                    : "text-base-content/45"
              }`}
            >
              {time}
            </span>
          )}
          <div className="flex min-h-5 items-center gap-1">{trailing}</div>
        </div>
      </button>

      {actions && (
        <div className="absolute bottom-2 right-3 z-20 flex items-center gap-0.5">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

const RowAction = ({ onClick, label, className = "", pressed, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    className={`grid size-7 place-items-center rounded-md text-base-content/40 transition-all hover:bg-base-300/60 hover:text-base-content focus-visible:opacity-100 ${className}`}
  >
    {children}
  </button>
);

const Segmented = ({ items, value, onChange, layoutId, label }) => (
  <LayoutGroup id={layoutId}>
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 rounded-lg bg-base-200 p-1"
    >
      {items.map(
        ({ key, label: text, icon: Icon, count, badge, tone, dot }) => {
          const active = value === key;
          const showCount = count !== undefined && count !== null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={`relative flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                active
                  ? "text-base-content"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="pill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-md bg-base-100 shadow-sm ring-1 ring-base-300/60"
                />
              )}
              {Icon && (
                <Icon
                  className={`relative z-10 size-4 shrink-0 ${
                    active ? "text-primary" : ""
                  }`}
                />
              )}
              {dot === "online" && (
                <span className="relative z-10 size-2 shrink-0 rounded-full bg-success" />
              )}
              {dot === "offline" && (
                <span className="relative z-10 size-2 shrink-0 rounded-full border border-base-content/40" />
              )}
              <span className="relative z-10 truncate">{text}</span>
              {showCount && (
                <span
                  className={`relative z-10 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
                    badge
                      ? tone === "danger"
                        ? "bg-error text-error-content"
                        : "bg-primary text-primary-content"
                      : "text-base-content/45"
                  }`}
                >
                  {formatCount(count)}
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  </LayoutGroup>
);

const HeaderButton = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="grid size-9 place-items-center rounded-lg text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline focus-visible:outline-primary/50"
  >
    <Icon className="size-[18px]" />
  </button>
);

const BackBar = ({ label, onClick }) => (
  <div className="px-2 pb-1">
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-base-200"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  </div>
);

const ArchivedRow = ({ count, unread, onClick, noun = "chat" }) => (
  <Row
    onClick={onClick}
    avatar={<IconAvatar icon={Archive} />}
    title="Archived"
    subtitle={`${count} ${count === 1 ? noun : `${noun}s`}`}
    trailing={
      <>
        <UnreadBadge count={unread} />
        <ChevronRight className="size-4 text-base-content/40" />
      </>
    }
  />
);

const SectionLabel = ({ children }) => (
  <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
    {children}
  </div>
);

const EmptyState = ({ icon: Icon, children }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-base-content/55">
    <div className="grid size-14 place-items-center rounded-full bg-base-200">
      <Icon className="size-6 text-base-content/40" />
    </div>
    {children}
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-1 px-2">
    {Array.from({ length: 7 }).map((_, i) => (
      <div
        key={i}
        className="flex h-[68px] items-center gap-3 rounded-lg px-3 animate-pulse"
      >
        <div className="size-11 rounded-full bg-base-300" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/5 rounded bg-base-300" />
          <div className="h-2.5 w-3/5 rounded bg-base-200" />
        </div>
        <div className="h-2.5 w-8 rounded bg-base-200" />
      </div>
    ))}
  </div>
);

const FooterAction = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    aria-current={active ? "page" : undefined}
    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-primary/50 ${
      danger
        ? "text-base-content/60 hover:bg-error/10 hover:text-error"
        : active
          ? "bg-primary/10 text-primary"
          : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    <Icon className="size-[18px]" />
  </button>
);

const LogoutConfirm = ({ open, loading, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => !loading && onCancel()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          <motion.div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-base-300 bg-base-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-sm sm:rounded-xl sm:pb-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-base-300 sm:hidden" />

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <LogOut className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 id="logout-title" className="font-semibold">
                  Log out of Chatty?
                </h3>
                <p className="mt-1 text-sm text-base-content/60">
                  You'll need to sign in again to see your chats.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                autoFocus
                disabled={loading}
                className="btn btn-ghost btn-sm h-10 min-h-10"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn btn-error btn-sm h-10 min-h-10 gap-1.5"
                onClick={onConfirm}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Log out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const Sidebar = () => {
  const [mode, setMode] = useState("chats");
  const [dir, setDir] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [tab, setTab] = useState("all");
  const [presence, setPresence] = useState("any");
  const [callFilter, setCallFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedGroups, setShowArchivedGroups] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    subscribeToMessage,
    setArchive,
  } = useChatStore();

  const {
    groups,
    selectedGroup,
    selectGroup,
    closeGroup,
    fetchGroups,
    subscribeToGroups,
    archiveGroup,
    unarchiveGroup,
  } = useGroupStore();

  const { onlineUsers, hiddenUsers, socket, authUser, toggleFavorite, logout } =
    useAuthStore();

  const {
    contacts,
    contactIds,
    loaded: contactsLoaded,
    fetchContacts,
    reset: resetContacts,
  } = useContactStore();

  const {
    calls: userCalls,
    isLoading: isCallsLoading,
    fetchCalls,
    clear: clearCalls,
  } = useCallHistoryStore();

  const {
    all: groupCalls,
    isLoadingAll: isGroupCallsLoading,
    fetchAll: fetchGroupCalls,
    clear: clearGroupCalls,
  } = useGroupCallHistoryStore();

  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);

  const favorites = toIds(authUser?.favorites);

  useEffect(() => {
    getUsers();
    fetchGroups();
    fetchContacts();
  }, [getUsers, fetchGroups, fetchContacts]);

  useEffect(() => {
    if (mode !== "calls") return;
    fetchCalls();
    fetchGroupCalls();
  }, [mode, fetchCalls, fetchGroupCalls]);



  if (isUsersLoading || !contactsLoaded) return <SidebarSkeleton />;

  const onlineIds = toIds(onlineUsers);
  const hiddenIds = toIds(hiddenUsers);
  const isOnline = (user) =>
    Boolean(
      myStatusVisible &&
      !user.isOnlineRestricted &&
      !hiddenIds.includes(String(user.id)) &&
      onlineIds.includes(String(user.id)),
    );
  const isHidden = (user) => hiddenIds.includes(String(user.id));
  const isFavorite = (user) => favorites.includes(String(user.id));
  const meOnline = authUser ? onlineIds.includes(String(authUser.id)) : false;

  const contactIdSet = new Set((contactIds || []).map(String));

  const allChatUsers = (() => {
    const map = new Map();
    users.forEach((u) => {
      const id = String(u.id);
      if (
        !SHOW_ONLY_CONTACTS ||
        contactIdSet.has(id) ||
        (KEEP_CONVERSATIONS && hasConversation(u))
      ) {
        map.set(id, u);
      }
    });
    (contacts || []).forEach((c) => {
      const id = String(c.id);
      if (!map.has(id)) map.set(id, c);
    });
    return Array.from(map.values());
  })();

  const archivedUsers = allChatUsers.filter((u) => u.isArchived);
  const archivedUnread = archivedUsers.reduce(
    (sum, u) => sum + (u.unreadCount || 0),
    0,
  );

  const chatUsers = allChatUsers.filter((u) =>
    showArchived ? u.isArchived : !u.isArchived,
  );

  const archivedGroups = groups.filter((g) => g.archived);
  const archivedGroupUnread = archivedGroups.reduce(
    (sum, g) => sum + (g.unreadCount || 0),
    0,
  );
  const visibleGroups = groups.filter((g) =>
    showArchivedGroups ? g.archived : !g.archived,
  );

  const tabMatch = {
    all: () => true,
    unread: (u) => (u.unreadCount || 0) > 0,
    favorites: (u) => isFavorite(u),
  };

  const presenceMatch = {
    any: () => true,
    online: (u) => isOnline(u),
    offline: (u) => !isOnline(u) && !isHidden(u),
  };

  const countFor = (t, p) =>
    chatUsers.filter((u) => tabMatch[t](u) && presenceMatch[p](u)).length;

  const q = query.trim().toLowerCase();
  const filteredUsers = chatUsers
    .filter((user) => {
      if (!tabMatch[tab](user)) return false;
      if (!presenceMatch[presence](user)) return false;
      if (q && !user.fullName?.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = timeValue(b) - timeValue(a);
      if (diff !== 0) return diff;
      return (a.fullName || "").localeCompare(b.fullName || "");
    });

  const filteredGroups = visibleGroups
    .filter((g) => !q || g.name?.toLowerCase().includes(q))
    .sort((a, b) => timeValue(b) - timeValue(a));

  const favUsers = filteredUsers.filter(isFavorite);
  const otherUsers = filteredUsers.filter((u) => !isFavorite(u));
  const showSections =
    tab === "all" && !q && favUsers.length > 0 && otherUsers.length > 0;

  const hasActiveFilters = tab !== "all" || presence !== "any";
  const clearFilters = () => {
    setTab("all");
    setPresence("any");
  };

  const getEmptyText = () => {
    if (showArchived && !q && !hasActiveFilters) return "No archived chats";
    if (q) return "No contacts match your search";
    if (tab !== "all" && presence !== "any")
      return "Nothing matches these filters";
    if (tab === "unread") return "You're all caught up";
    if (tab === "favorites") return "No favorite contacts yet";
    if (presence === "online") return "No one is online right now";
    if (presence === "offline") return "Everyone is online right now";
    return "No contacts yet";
  };

  const allCalls = [
    ...(Array.isArray(userCalls) ? userCalls : []).map((c) =>
      normalizeCall(c, authUser?.id, false),
    ),
    ...(Array.isArray(groupCalls) ? groupCalls : []).map((c) =>
      normalizeCall(c, authUser?.id, true),
    ),
  ].sort((a, b) => callTime(b) - callTime(a));

  const filteredCalls = allCalls.filter((c) => {
    if (callFilter === "missed" && !c.missed) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const missedCount = allCalls.filter((c) => c.missed).length;
  const isCallsBusy = isCallsLoading || isGroupCallsLoading;
  const callsInitialLoading = isCallsBusy && allCalls.length === 0;

  const chatUnread = allChatUsers
    .filter((u) => !u.isArchived)
    .reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  const groupUnread = groups
    .filter((g) => !g.archived)
    .reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const onlineCount = allChatUsers.filter(
    (u) => !u.isArchived && isOnline(u),
  ).length;

  const hasOpenChat = !!(selectedUser || selectedGroup);

  const changeMode = (key) => {
    if (key === mode) return;
    setDir(MODE_ORDER.indexOf(key) > MODE_ORDER.indexOf(mode) ? 1 : -1);
    setMode(key);
  };

  const openChat = (user) => {
    closeGroup();
    setSelectedUser(user);
  };

  const openGroup = (group) => {
    setSelectedUser(null);
    selectGroup(group);
  };

  const openFromCall = (call) => {
    if (call.isGroup) {
      const g = groups.find((x) => sameId(x.id, call.groupId));
      if (g) openGroup(g);
      return;
    }
    const u =
      allChatUsers.find((x) => sameId(x.id, call.otherId)) ||
      users.find((x) => sameId(x.id, call.otherId));
    if (u) openChat(u);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      clearCalls();
      clearGroupCalls();
      resetContacts();
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  const onSettings = pathname === "/settings";
  const onProfile = pathname === "/profile";

  const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

  const headerTitle =
    mode === "calls"
      ? "Calls"
      : mode === "groups"
        ? showArchivedGroups
          ? "Archived groups"
          : "Groups"
        : showArchived
          ? "Archived chats"
          : "Messages";
  const headerSub =
    mode === "calls"
      ? missedCount > 0
        ? `${missedCount} missed`
        : `${allCalls.length} recent`
      : mode === "groups"
        ? showArchivedGroups
          ? plural(archivedGroups.length, "group")
          : plural(groups.length - archivedGroups.length, "group")
        : showArchived
          ? plural(archivedUsers.length, "chat")
          : `${onlineCount} online`;

  const renderUser = (user, i = 0) => {
    const favorite = isFavorite(user);
    const isSelected = !selectedGroup && sameId(selectedUser?.id, user.id);
    const unread = user.unreadCount || 0;

    return (
      <Row
        key={user.id}
        index={i}
        selected={isSelected}
        onClick={() => openChat(user)}
        avatar={
          <Avatar
            src={avatarSrc(user.avatar)}
            name={user.fullName}
            online={isOnline(user)}
            selected={isSelected}
          />
        }
        title={user.fullName}
        subtitle={getPreview(user.lastMessage, authUser?.id)}
        time={formatListTime(user.lastMessageAt)}
        unread={unread}
        trailing={<UnreadBadge count={unread} />}
        actions={
          unread === 0 && (
            <>
              <RowAction
                onClick={() => setArchive(String(user.id), !user.isArchived)}
                label={user.isArchived ? "Unarchive chat" : "Archive chat"}
                className="hidden opacity-0 group-hover:opacity-100 lg:grid"
              >
                {user.isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </RowAction>
              <RowAction
                onClick={() => toggleFavorite(String(user.id), favorite)}
                label={favorite ? "Remove from favorites" : "Add to favorites"}
                pressed={favorite}
                className={
                  favorite
                    ? ""
                    : "opacity-60 lg:opacity-0 lg:group-hover:opacity-100"
                }
              >
                <Star
                  className={`size-4 ${
                    favorite
                      ? "fill-warning text-warning"
                      : "hover:text-warning"
                  }`}
                />
              </RowAction>
            </>
          )
        }
      />
    );
  };

  const renderGroup = (group, i = 0) => {
    const isSelected = sameId(selectedGroup?.id, group.id);
    const unread = group.unreadCount || 0;

    return (
      <Row
        key={group.id}
        index={i}
        selected={isSelected}
        onClick={() => openGroup(group)}
        avatar={
          <Avatar
            group
            src={group.avatar ? avatarSrc(group.avatar) : null}
            name={group.name}
            selected={isSelected}
          />
        }
        title={group.name}
        subtitle={getGroupPreview(group.lastMessage, authUser?.id)}
        time={formatListTime(group.lastMessage?.createdAt)}
        unread={unread}
        trailing={<UnreadBadge count={unread} />}
        actions={
          unread === 0 && (
            <RowAction
              onClick={() =>
                group.archived
                  ? unarchiveGroup(group.id)
                  : archiveGroup(group.id)
              }
              label={group.archived ? "Unarchive group" : "Archive group"}
              className="hidden opacity-0 group-hover:opacity-100 lg:grid"
            >
              {group.archived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </RowAction>
          )
        }
      />
    );
  };

  const renderCall = (call, i = 0) => {
    const DirIcon = call.missed
      ? PhoneMissed
      : call.outgoing
        ? PhoneOutgoing
        : PhoneIncoming;
    const TypeIcon = call.video ? Video : Phone;
    const dur = formatDuration(call.duration);

    return (
      <Row
        key={call.key}
        index={i}
        onClick={() => openFromCall(call)}
        tone={call.missed ? "danger" : "default"}
        avatar={
          <Avatar
            group={call.isGroup}
            src={call.isGroup && !call.avatar ? null : avatarSrc(call.avatar)}
            name={call.name}
          />
        }
        title={call.name}
        subtitle={
          <span className="flex items-center gap-1">
            <DirIcon
              className={`size-3.5 shrink-0 ${
                call.missed ? "text-error" : "text-success"
              }`}
            />
            <span className="truncate">
              {call.missed ? "Missed" : call.outgoing ? "Outgoing" : "Incoming"}
              {dur ? ` · ${dur}` : ""}
            </span>
          </span>
        }
        time={formatListTime(call.time)}
        trailing={
          <TypeIcon className="size-4 text-base-content/45" aria-hidden />
        }
      />
    );
  };

  const modes = [
    {
      key: "chats",
      label: "Chats",
      icon: MessageCircle,
      count: chatUnread || null,
      badge: true,
    },
    {
      key: "groups",
      label: "Groups",
      icon: UsersRound,
      count: groupUnread || null,
      badge: true,
    },
    {
      key: "calls",
      label: "Calls",
      icon: Phone,
      count: missedCount || null,
      badge: true,
      tone: "danger",
    },
  ];

  const tabItems = TABS.map(({ key, label }) => ({
    key,
    label,
    count: countFor(key, presence),
    badge: key === "unread" && countFor(key, presence) > 0,
  }));

  const presenceItems = PRESENCE.map(({ key, label }) => ({
    key,
    label,
    dot: key === "any" ? undefined : key,
    count: key === "any" ? undefined : countFor(tab, key),
  }));

  const callFilterItems = CALL_FILTERS.map(({ key, label }) => ({
    key,
    label,
    count: key === "missed" && missedCount > 0 ? missedCount : undefined,
    badge: key === "missed" && missedCount > 0,
    tone: "danger",
  }));

  const searchPlaceholder =
    mode === "groups"
      ? "Search groups"
      : mode === "calls"
        ? "Search calls"
        : "Search contacts";

  return (
    <MotionConfig reducedMotion="user">
      <aside
        className={`h-full w-full min-w-0 shrink-0 flex-col border-r border-base-300 bg-base-100 lg:w-80 xl:w-96 ${
          hasOpenChat ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 leading-tight">
                <h2 className="truncate text-lg font-semibold">
                  {headerTitle}
                </h2>
                <p className="truncate text-xs text-base-content/55">
                  {headerSub}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <HeaderButton
                icon={UserPlus}
                label="Add contact"
                onClick={() => setShowAddContact(true)}
              />
              <HeaderButton
                icon={Plus}
                label="New group"
                onClick={() => setShowCreate(true)}
              />
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-4">
          <Segmented
            items={modes}
            value={mode}
            onChange={changeMode}
            layoutId="sidebar-modes"
            label="Sidebar section"
          />
        </div>

        <div className="space-y-2 px-3 pb-3 sm:px-4">
          <label className="input input-bordered flex h-10 items-center gap-2 rounded-lg bg-base-100 transition-colors focus-within:border-primary/60 focus-within:outline-none">
            <Search className="size-4 shrink-0 text-base-content/50" />
            <input
              type="text"
              className="min-w-0 grow text-base sm:text-sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="grid size-6 shrink-0 place-items-center rounded-md text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
              >
                <X className="size-4" />
              </button>
            )}
          </label>

          <AnimatePresence initial={false} mode="wait">
            {mode === "chats" && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-2 overflow-hidden"
              >
                <Segmented
                  items={tabItems}
                  value={tab}
                  onChange={setTab}
                  layoutId="sidebar-tabs"
                  label="Filter conversations"
                />
                <Segmented
                  items={presenceItems}
                  value={presence}
                  onChange={setPresence}
                  layoutId="sidebar-presence"
                  label="Filter by status"
                />
              </motion.div>
            )}

            {mode === "calls" && (
              <motion.div
                key="call-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <Segmented
                  items={callFilterItems}
                  value={callFilter}
                  onChange={setCallFilter}
                  layoutId="sidebar-callfilter"
                  label="Filter calls"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className={`relative z-10 border-t border-base-300 transition-shadow ${
            scrolled ? "shadow-[0_6px_12px_-8px_rgba(0,0,0,0.2)]" : ""
          }`}
        />

        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain py-2"
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={mode}
              custom={dir}
              variants={paneVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {mode === "calls" ? (
                callsInitialLoading ? (
                  <ListSkeleton />
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {filteredCalls.map((c, i) => renderCall(c, i))}
                    </AnimatePresence>

                    {filteredCalls.length === 0 && (
                      <EmptyState icon={Phone}>
                        {q
                          ? "No calls match your search"
                          : callFilter === "missed"
                            ? "No missed calls"
                            : "No calls yet"}
                        {callFilter === "missed" && !q && (
                          <button
                            type="button"
                            onClick={() => setCallFilter("all")}
                            className="btn btn-ghost btn-sm text-primary"
                          >
                            Show all calls
                          </button>
                        )}
                      </EmptyState>
                    )}
                  </>
                )
              ) : mode === "groups" ? (
                <>
                  {showArchivedGroups ? (
                    <BackBar
                      label="Archived groups"
                      onClick={() => setShowArchivedGroups(false)}
                    />
                  ) : (
                    !q &&
                    archivedGroups.length > 0 && (
                      <ArchivedRow
                        noun="group"
                        count={archivedGroups.length}
                        unread={archivedGroupUnread}
                        onClick={() => setShowArchivedGroups(true)}
                      />
                    )
                  )}

                  <AnimatePresence initial={false}>
                    {filteredGroups.map((g, i) => renderGroup(g, i))}
                  </AnimatePresence>

                  {filteredGroups.length === 0 && (
                    <EmptyState icon={UsersRound}>
                      {q
                        ? "No groups match your search"
                        : showArchivedGroups
                          ? "No archived groups"
                          : "You're not in any groups yet"}
                      {!q && showArchivedGroups && (
                        <button
                          type="button"
                          onClick={() => setShowArchivedGroups(false)}
                          className="btn btn-ghost btn-sm text-primary"
                        >
                          Back to groups
                        </button>
                      )}
                      {!q && !showArchivedGroups && (
                        <button
                          type="button"
                          onClick={() => setShowCreate(true)}
                          className="btn btn-primary btn-sm"
                        >
                          Create a group
                        </button>
                      )}
                    </EmptyState>
                  )}
                </>
              ) : (
                <>
                  {showArchived ? (
                    <BackBar
                      label="Archived chats"
                      onClick={() => setShowArchived(false)}
                    />
                  ) : (
                    !q &&
                    archivedUsers.length > 0 && (
                      <ArchivedRow
                        count={archivedUsers.length}
                        unread={archivedUnread}
                        onClick={() => setShowArchived(true)}
                      />
                    )
                  )}

                  {showSections ? (
                    <>
                      <SectionLabel>Favorites</SectionLabel>
                      <AnimatePresence initial={false}>
                        {favUsers.map((u, i) => renderUser(u, i))}
                      </AnimatePresence>
                      <SectionLabel>All chats</SectionLabel>
                      <AnimatePresence initial={false}>
                        {otherUsers.map((u, i) => renderUser(u, i))}
                      </AnimatePresence>
                    </>
                  ) : (
                    <AnimatePresence initial={false}>
                      {filteredUsers.map((u, i) => renderUser(u, i))}
                    </AnimatePresence>
                  )}

                  {filteredUsers.length === 0 && (
                    <EmptyState icon={MessageCircle}>
                      {getEmptyText()}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="btn btn-ghost btn-sm text-primary"
                        >
                          Clear filters
                        </button>
                      )}
                      {!hasActiveFilters &&
                        (showArchived ? (
                          <button
                            type="button"
                            onClick={() => setShowArchived(false)}
                            className="btn btn-ghost btn-sm text-primary"
                          >
                            Back to chats
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddContact(true)}
                            className="btn btn-primary btn-sm gap-1"
                          >
                            <UserPlus className="size-4" />
                            {q ? "Find people to add" : "Add contacts"}
                          </button>
                        ))}
                    </EmptyState>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-base-300 bg-base-100 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-base-300 bg-base-200/50 p-1.5">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Open my profile"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-base-100"
            >
              <div className="relative shrink-0">
                <img
                  src={avatarSrc(authUser?.avatar)}
                  alt={authUser?.fullName || "Me"}
                  className={`size-10 rounded-full object-cover ring-2 transition-colors ${
                    onProfile ? "ring-primary" : "ring-transparent"
                  }`}
                />
                {meOnline && (
                  <span className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {authUser?.fullName}
                </p>
                <p
                  className={`truncate text-xs ${
                    meOnline ? "text-success" : "text-base-content/55"
                  }`}
                >
                  {meOnline ? "Online" : authUser?.email}
                </p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-0.5">
              <FooterAction
                icon={Settings}
                label="Settings"
                active={onSettings}
                onClick={() => navigate("/settings")}
              />
              <FooterAction
                icon={LogOut}
                label="Log out"
                danger
                onClick={() => setConfirmLogout(true)}
              />
            </div>
          </div>
        </div>

        <CreateGroupModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />

        <AddContactModal
          open={showAddContact}
          onClose={() => setShowAddContact(false)}
        />

        <LogoutConfirm
          open={confirmLogout}
          loading={isLoggingOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={handleLogout}
        />
      </aside>
    </MotionConfig>
  );
};

export default Sidebar;
