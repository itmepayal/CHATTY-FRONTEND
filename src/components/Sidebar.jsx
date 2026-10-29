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
  UserRound,
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

const KEEP_CONVERSATIONS = false;

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

const SPRING = { type: "spring", stiffness: 500, damping: 38 };
const POP = { type: "spring", stiffness: 520, damping: 22 };

const rowVariants = {
  hidden: { opacity: 0, x: -18, scale: 0.98 },
  show: (i = 0) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { ...SPRING, delay: Math.min(i, 8) * 0.03 },
  }),
  exit: { opacity: 0, x: -18, transition: { duration: 0.12 } },
};

const paneVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: (dir) => ({
    opacity: 0,
    x: dir * -28,
    transition: { duration: 0.14, ease: "easeIn" },
  }),
};

const headerItem = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: SPRING },
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
  if (m.text) return m.text;
  if (isLocation(m)) return "📍 Location";
  if (isVideo(m)) return "🎥 Video";
  if (isAudio(m)) return "🎤 Voice message";
  if (isImage(m)) return "📷 Photo";
  if (isFile(m)) return "📎 File";
  return "Message";
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

// kya is user se pehle koi baat-cheet hui hai?
const hasConversation = (u) =>
  !!(u.lastMessage || u.lastMessageAt || (u.unreadCount || 0) > 0);

/* ---------- call helpers ----------
   NOTE: backend ke call record ke field names alag ho to sirf
   normalizeCall badalna padega, baaki UI same rahegi. */
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

/* ---------- small UI pieces ---------- */

// number that rolls when it changes
const AnimatedCount = ({ value, className = "" }) => (
  <span className={`relative inline-flex overflow-hidden ${className}`}>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ y: 9, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -9, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="inline-block"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

const UnreadBadge = ({ count }) => (
  <AnimatePresence initial={false}>
    {count > 0 && (
      <motion.span
        key={count}
        initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={POP}
        className="inline-flex items-center justify-center rounded-full bg-primary text-primary-content text-[11px] font-semibold leading-none min-w-5 h-5 px-1.5 shadow-md shadow-primary/30"
        aria-label={`${count} unread messages`}
      >
        {formatCount(count)}
      </motion.span>
    )}
  </AnimatePresence>
);

// "Archived (N)" row jo list ke top par dikhti hai (chats aur groups dono me)
const ArchivedRow = ({ count, unread, onClick, noun = "chat" }) => (
  <div className="px-1.5 sm:px-2">
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full min-h-[56px] rounded-xl px-2.5 sm:px-3 py-2 flex items-center gap-3 transition-colors hover:bg-base-200 active:bg-base-200"
    >
      <span className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/60">
        <Archive className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-medium">Archived</span>
        <span className="block text-[13px] text-base-content/50">
          {count} {count === 1 ? noun : `${noun}s`}
        </span>
      </span>
      {unread > 0 && <UnreadBadge count={unread} />}
      <ChevronRight className="size-4 shrink-0 text-base-content/40" />
    </motion.button>
  </div>
);

const SectionLabel = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2 px-4 sm:px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-content/40"
  >
    <span>{children}</span>
    <span className="h-px flex-1 bg-gradient-to-r from-base-300 to-transparent" />
  </motion.div>
);

const EmptyState = ({ icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center gap-3 text-center text-sm text-base-content/50 py-12 px-4"
  >
    <div className="relative grid size-16 place-items-center">
      {[0, 1].map((n) => (
        <motion.span
          key={n}
          className="absolute inset-0 rounded-full border border-primary/30"
          animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: n * 1.2,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid size-14 place-items-center rounded-full bg-base-200"
      >
        <Icon className="size-7 text-base-content/30" />
      </motion.div>
    </div>
    {children}
  </motion.div>
);

const CallSkeleton = () => (
  <div className="space-y-1 px-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      >
        <div className="size-12 rounded-full bg-base-300" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/5 rounded bg-base-300" />
          <div className="h-2.5 w-3/5 rounded bg-base-200" />
        </div>
        <div className="h-2.5 w-8 rounded bg-base-200" />
      </motion.div>
    ))}
  </div>
);

const FooterAction = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
  spin = false,
}) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.88 }}
    onClick={onClick}
    aria-label={label}
    aria-current={active ? "page" : undefined}
    className={`group/act relative grid size-10 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-primary ${
      danger
        ? "text-base-content/60 hover:bg-error/10 hover:text-error"
        : active
          ? "text-primary"
          : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    {active && (
      <motion.span
        layoutId="footer-active-pill"
        transition={SPRING}
        className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-primary/30"
      />
    )}
    <motion.span
      className="relative z-10 inline-flex"
      whileHover={spin ? { rotate: 90 } : { y: -1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
    >
      <Icon className="size-[18px]" />
    </motion.span>

    {/* tooltip: sirf desktop (hover) par */}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-neutral px-2 py-1 text-[11px] font-medium text-neutral-content opacity-0 shadow-lg transition-all duration-150 lg:block group-hover/act:translate-y-0 group-hover/act:opacity-100 group-focus-visible/act:translate-y-0 group-focus-visible/act:opacity-100"
    >
      {label}
    </span>
  </motion.button>
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
          // mobile: bottom sheet, desktop: center dialog
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !loading && onCancel()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          <motion.div
            className="w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-base-300 bg-base-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-5"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* drag handle - sirf mobile */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-base-300 sm:hidden" />

            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={POP}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-error/10 text-error"
              >
                <LogOut className="size-5" />
              </motion.div>
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
                className="btn btn-ghost h-11 min-h-11 sm:btn-sm sm:h-auto sm:min-h-0"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn btn-error h-11 min-h-11 gap-1.5 sm:btn-sm sm:h-auto sm:min-h-0"
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
  const [mode, setMode] = useState("chats"); // chats | groups | calls
  const [dir, setDir] = useState(1); // slide direction for tab switch
  const [showCreate, setShowCreate] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [tab, setTab] = useState("all");
  const [presence, setPresence] = useState("any");
  const [callFilter, setCallFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
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
    unSubscribeFromMessage,
    setArchive,
  } = useChatStore();

  const {
    groups,
    selectedGroup,
    selectGroup,
    closeGroup,
    fetchGroups,
    subscribeToGroups,
    unsubscribeFromGroups,
    archiveGroup,
    unarchiveGroup,
  } = useGroupStore();

  const { onlineUsers, hiddenUsers, socket, authUser, toggleFavorite, logout } =
    useAuthStore();

  // Contacts (GET /contacts, add / remove via AddContactModal)
  const {
    contacts,
    contactIds,
    loaded: contactsLoaded,
    fetchContacts,
    reset: resetContacts,
  } = useContactStore();

  // Call history (1:1 + group)
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

  // Favorites come from the server (authUser.favorites), same source
  // as the Contact info panel, so both always stay in sync.
  const favorites = toIds(authUser?.favorites);

  useEffect(() => {
    getUsers();
    fetchGroups();
    fetchContacts();
  }, [getUsers, fetchGroups, fetchContacts]);

  // Calls tab khulte hi history refresh
  useEffect(() => {
    if (mode !== "calls") return;
    fetchCalls();
    fetchGroupCalls();
  }, [mode, fetchCalls, fetchGroupCalls]);

  useEffect(() => {
    if (!socket) return;
    subscribeToMessage();
    subscribeToGroups();
    return () => {
      unSubscribeFromMessage();
      unsubscribeFromGroups();
    };
  }, [
    socket,
    subscribeToMessage,
    unSubscribeFromMessage,
    subscribeToGroups,
    unsubscribeFromGroups,
  ]);

  if (isUsersLoading || !contactsLoaded) return <SidebarSkeleton />;

  const onlineIds = toIds(onlineUsers);
  const hiddenIds = toIds(hiddenUsers);
  const isOnline = (user) => onlineIds.includes(String(user.id));
  const isHidden = (user) => hiddenIds.includes(String(user.id));
  const isFavorite = (user) => favorites.includes(String(user.id));
  const meOnline = authUser ? onlineIds.includes(String(authUser.id)) : false;

  /* ---------- chat list = contacts + people you already talked to ----------
     - users (useChatStore) me lastMessage / unreadCount hota hai
     - contacts (useContactStore) me wo log bhi aate hain jinse abhi tak
       koi message nahi hua (add karte hi list me dikh jayenge) */
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

  // current view: main list ya archived list. Neeche ke saare filters,
  // counts aur search isi par chalte hain, isliye unhe badalna nahi pada.
  const chatUsers = allChatUsers.filter((u) =>
    showArchived ? u.isArchived : !u.isArchived,
  );

  /* ---------- groups: main list ya archived list ---------- */
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
    // Hidden-status users are NOT genuinely offline — exclude them from Offline
    offline: (u) => !isOnline(u) && !isHidden(u),
  };

  // Counts react to the other filter, so numbers always match what you'll see
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
      // jinse abhi koi message nahi hua unko naam se sort karo
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

  /* ---------- calls: merge 1:1 + group, newest first ---------- */
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

  // archived chats/groups ka unread alag "Archived" row par dikhta hai,
  // isliye tab ke badge me sirf main list ka unread gino
  const chatUnread = allChatUsers
    .filter((u) => !u.isArchived)
    .reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  const groupUnread = groups
    .filter((g) => !g.archived)
    .reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const totalUnread = chatUnread + groupUnread;
  const onlineCount = allChatUsers.filter(
    (u) => !u.isArchived && isOnline(u),
  ).length;

  // Mobile: jab koi chat/group khula ho to sidebar chhup jata hai
  // (desktop par hamesha dikhta hai). Chat header ka back/X button chat band
  // karta hai aur list wapas aa jati hai.
  const hasOpenChat = !!(selectedUser || selectedGroup);

  const changeMode = (key) => {
    if (key === mode) return;
    setDir(MODE_ORDER.indexOf(key) > MODE_ORDER.indexOf(mode) ? 1 : -1);
    setMode(key);
  };

  // opening a chat closes any open group
  const openChat = (user) => {
    closeGroup();
    setSelectedUser(user);
  };

  // opening a group closes any open 1:1 chat
  const openGroup = (group) => {
    setSelectedUser(null);
    selectGroup(group);
  };

  // call row tap -> us chat / group ko khol do
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

  const headerTitle =
    mode === "calls"
      ? "Calls"
      : mode === "groups"
        ? showArchivedGroups
          ? "Archived"
          : "Groups"
        : showArchived
          ? "Archived"
          : "Messages";
  const headerSub =
    mode === "calls"
      ? missedCount > 0
        ? `${missedCount} missed`
        : `${allCalls.length} recent`
      : mode === "groups"
        ? showArchivedGroups
          ? `${archivedGroups.length} ${archivedGroups.length === 1 ? "group" : "groups"}`
          : `${groups.length - archivedGroups.length} ${
              groups.length - archivedGroups.length === 1 ? "group" : "groups"
            }`
        : showArchived
          ? `${archivedUsers.length} ${archivedUsers.length === 1 ? "chat" : "chats"}`
          : `${onlineCount} online`;

  /* ---------- rows ---------- */
  const renderUser = (user, i = 0) => {
    const online = isOnline(user);
    const favorite = isFavorite(user);
    const isSelected = !selectedGroup && sameId(selectedUser?.id, user.id);
    const unread = user.unreadCount || 0;
    const hasUnread = unread > 0;

    return (
      <motion.div
        key={user.id}
        layout="position"
        variants={rowVariants}
        custom={i}
        initial="hidden"
        animate="show"
        exit="exit"
        className="relative group px-1.5 sm:px-2"
      >
        <motion.button
          type="button"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openChat(user)}
          className={`relative w-full min-h-[64px] rounded-xl px-2.5 sm:px-3 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors duration-150 ${
            isSelected ? "" : "hover:bg-base-200 active:bg-base-200"
          }`}
        >
          {/* sliding selection highlight */}
          {isSelected && (
            <motion.span
              layoutId="sidebar-selected"
              transition={SPRING}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 ring-1 ring-primary/15 shadow-sm"
            >
              <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            </motion.span>
          )}

          {/* Avatar */}
          <div className="relative z-10 shrink-0">
            <img
              src={avatarSrc(user.avatar)}
              alt={user.fullName}
              className={`size-11 sm:size-12 object-cover rounded-full ring-2 transition-all duration-200 group-hover:scale-105 ${
                isSelected ? "ring-primary/50" : "ring-transparent"
              }`}
            />
            <AnimatePresence>
              {online && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={POP}
                  className="absolute bottom-0 right-0 size-3.5"
                >
                  <span className="absolute inset-0 rounded-full bg-success/60 animate-ping" />
                  <span className="absolute inset-0 rounded-full bg-success ring-2 ring-base-100" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Name + preview */}
          <div className="relative z-10 text-left min-w-0 flex-1">
            <div
              className={`truncate text-[15px] ${
                hasUnread ? "font-semibold" : "font-medium"
              }`}
            >
              {user.fullName}
            </div>
            <div
              className={`text-[13px] truncate ${
                hasUnread
                  ? "text-base-content font-medium"
                  : "text-base-content/50"
              }`}
            >
              {getPreview(user.lastMessage, authUser?.id)}
            </div>
          </div>

          {/* Timestamp + badge */}
          <div className="relative z-10 flex flex-col items-end gap-1.5 shrink-0 self-stretch justify-between py-0.5">
            <span
              className={`whitespace-nowrap text-[11px] ${
                hasUnread ? "text-primary font-medium" : "text-base-content/40"
              }`}
            >
              {formatListTime(user.lastMessageAt)}
            </span>
            <div className="pr-6 min-h-5">
              <UnreadBadge count={unread} />
            </div>
          </div>
        </motion.button>

        {!hasUnread && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.75 }}
            whileHover={{ scale: 1.2 }}
            onClick={() => toggleFavorite(String(user.id), favorite)}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
            // bada touch area (p-1.5) taaki mobile par tap karna easy ho
            className={`z-20 flex absolute bottom-1.5 right-3 sm:right-4 p-1.5 rounded transition-opacity focus-visible:opacity-100 ${
              favorite
                ? "opacity-100"
                : // touch screens par hover nahi hota, isliye mobile par hamesha visible
                  "opacity-60 lg:opacity-0 lg:group-hover:opacity-100"
            }`}
          >
            {/* key change => star "pops" when toggled */}
            <motion.span
              key={String(favorite)}
              initial={{ scale: 0.3, rotate: -50 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={POP}
              className="inline-flex"
            >
              <Star
                className={`size-4 transition-colors ${
                  favorite
                    ? "fill-warning text-warning drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
                    : "text-base-content/40 hover:text-warning"
                }`}
              />
            </motion.span>
          </motion.button>
        )}

        {/* Archive / Unarchive (desktop par hover me dikhta hai) */}
        {!hasUnread && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.75 }}
            whileHover={{ scale: 1.2 }}
            onClick={() => setArchive(String(user.id), !user.isArchived)}
            aria-label={user.isArchived ? "Unarchive chat" : "Archive chat"}
            title={user.isArchived ? "Unarchive chat" : "Archive chat"}
            className="z-20 hidden lg:flex absolute bottom-1.5 right-11 sm:right-12 p-1.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            {user.isArchived ? (
              <ArchiveRestore className="size-4 text-base-content/40 hover:text-primary" />
            ) : (
              <Archive className="size-4 text-base-content/40 hover:text-primary" />
            )}
          </motion.button>
        )}
      </motion.div>
    );
  };

  const renderGroup = (group, i = 0) => {
    const isSelected = sameId(selectedGroup?.id, group.id);
    const unread = group.unreadCount || 0;
    const hasUnread = unread > 0;

    return (
      <motion.div
        key={group.id}
        layout="position"
        variants={rowVariants}
        custom={i}
        initial="hidden"
        animate="show"
        exit="exit"
        className="relative group px-1.5 sm:px-2"
      >
        <motion.button
          type="button"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openGroup(group)}
          className={`relative w-full min-h-[64px] rounded-xl px-2.5 sm:px-3 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors duration-150 ${
            isSelected ? "" : "hover:bg-base-200 active:bg-base-200"
          }`}
        >
          {isSelected && (
            <motion.span
              layoutId="sidebar-selected"
              transition={SPRING}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 ring-1 ring-primary/15 shadow-sm"
            >
              <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            </motion.span>
          )}

          <div className="relative z-10 shrink-0">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.name}
                className={`size-11 sm:size-12 object-cover rounded-full ring-2 transition-all duration-200 group-hover:scale-105 ${
                  isSelected ? "ring-primary/50" : "ring-transparent"
                }`}
              />
            ) : (
              <div
                className={`size-11 sm:size-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center font-semibold text-lg ring-2 transition-all duration-200 group-hover:scale-105 ${
                  isSelected ? "ring-primary/50" : "ring-transparent"
                }`}
              >
                {group.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="relative z-10 text-left min-w-0 flex-1">
            <div
              className={`truncate text-[15px] ${
                hasUnread ? "font-semibold" : "font-medium"
              }`}
            >
              {group.name}
            </div>
            <div
              className={`text-[13px] truncate ${
                hasUnread
                  ? "text-base-content font-medium"
                  : "text-base-content/50"
              }`}
            >
              {getGroupPreview(group.lastMessage, authUser?.id)}
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-end gap-1.5 shrink-0 self-stretch justify-between py-0.5">
            <span
              className={`whitespace-nowrap text-[11px] ${
                hasUnread ? "text-primary font-medium" : "text-base-content/40"
              }`}
            >
              {formatListTime(group.lastMessage?.createdAt)}
            </span>
            <div className="min-h-5">
              <UnreadBadge count={unread} />
            </div>
          </div>
        </motion.button>

        {/* Archive / Unarchive (desktop par hover me dikhta hai).
            Mobile par chat header ka archive button use karo. */}
        {!hasUnread && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.75 }}
            whileHover={{ scale: 1.2 }}
            onClick={() =>
              group.archived ? unarchiveGroup(group.id) : archiveGroup(group.id)
            }
            aria-label={group.archived ? "Unarchive group" : "Archive group"}
            title={group.archived ? "Unarchive group" : "Archive group"}
            className="z-20 hidden lg:flex absolute bottom-1.5 right-3 sm:right-4 p-1.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            {group.archived ? (
              <ArchiveRestore className="size-4 text-base-content/40 hover:text-primary" />
            ) : (
              <Archive className="size-4 text-base-content/40 hover:text-primary" />
            )}
          </motion.button>
        )}
      </motion.div>
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
      <motion.div
        key={call.key}
        layout="position"
        variants={rowVariants}
        custom={i}
        initial="hidden"
        animate="show"
        exit="exit"
        className="group px-1.5 sm:px-2"
      >
        <motion.button
          type="button"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openFromCall(call)}
          className="relative w-full min-h-[64px] rounded-xl px-2.5 sm:px-3 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors duration-150 hover:bg-base-200 active:bg-base-200"
        >
          {/* Avatar */}
          <div className="relative z-10 shrink-0">
            {call.isGroup && !call.avatar ? (
              <div className="size-11 sm:size-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center font-semibold text-lg transition-transform duration-200 group-hover:scale-105">
                {call.name?.[0]?.toUpperCase() || (
                  <UsersRound className="size-5" />
                )}
              </div>
            ) : (
              <img
                src={avatarSrc(call.avatar)}
                alt={call.name}
                className="size-11 sm:size-12 object-cover rounded-full transition-transform duration-200 group-hover:scale-105"
              />
            )}
            {call.isGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-base-100 ring-2 ring-base-100">
                <UsersRound className="size-3 text-base-content/60" />
              </span>
            )}
          </div>

          {/* Name + direction/duration */}
          <div className="relative z-10 text-left min-w-0 flex-1">
            <div
              className={`truncate text-[15px] font-medium ${
                call.missed ? "text-error" : ""
              }`}
            >
              {call.name}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-base-content/50">
              <motion.span
                className="inline-flex"
                animate={
                  call.missed ? { rotate: [0, -14, 14, -8, 0] } : undefined
                }
                transition={{
                  duration: 0.6,
                  delay: 0.3 + Math.min(i, 8) * 0.03,
                }}
              >
                <DirIcon
                  className={`size-3.5 shrink-0 ${
                    call.missed ? "text-error" : "text-success"
                  }`}
                />
              </motion.span>
              <span className="truncate">
                {call.missed
                  ? "Missed"
                  : call.outgoing
                    ? "Outgoing"
                    : "Incoming"}
                {dur ? ` · ${dur}` : ""}
              </span>
            </div>
          </div>

          {/* Time + call type */}
          <div className="relative z-10 flex flex-col items-end gap-1 shrink-0 self-stretch justify-between py-0.5">
            <span
              className={`whitespace-nowrap text-[11px] ${
                call.missed ? "text-error font-medium" : "text-base-content/40"
              }`}
            >
              {formatListTime(call.time)}
            </span>
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-content">
              <TypeIcon className="size-3.5" />
            </span>
          </div>
        </motion.button>
      </motion.div>
    );
  };

  const modes = [
    { key: "chats", label: "Chats", icon: MessageCircle, unread: chatUnread },
    { key: "groups", label: "Groups", icon: UsersRound, unread: groupUnread },
    { key: "calls", label: "Calls", icon: Phone, unread: missedCount },
  ];

  const searchPlaceholder =
    mode === "groups"
      ? "Search groups"
      : mode === "calls"
        ? "Search calls"
        : "Search contacts";

  /* ---------- render ---------- */
  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`h-full w-full min-w-0 shrink-0 border-r border-base-300 bg-base-100 flex-col transition-all duration-300 lg:w-80 xl:w-96 ${
          hasOpenChat ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="relative w-full px-4 sm:px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />
          <motion.div
            variants={headerItem}
            className="relative flex items-center justify-between gap-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* glowing logo */}
              <motion.div
                whileHover={{ rotate: -8, scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="relative size-10 shrink-0"
              >
                <motion.span
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary to-secondary blur-md"
                  animate={{
                    opacity: [0.25, 0.55, 0.25],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <span className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/30">
                  <Users className="size-5" />
                </span>
              </motion.div>

              {/* title + subtitle swap with mode */}
              <div className="min-w-0 leading-tight">
                <div className="relative h-6 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={headerTitle}
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -18, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="block truncate text-lg font-semibold"
                    >
                      {headerTitle}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="relative h-4 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={headerSub}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="block truncate text-[11px] text-base-content/50"
                    >
                      {headerSub}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <AnimatePresence>
                {mode !== "calls" && totalUnread > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.7, x: 10 }}
                    transition={POP}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1"
                  >
                    <AnimatedCount value={formatCount(totalUnread)} />
                    <span>new</span>
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Add contact */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                onClick={() => setShowAddContact(true)}
                className="btn btn-circle size-10 min-h-10 border-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
                aria-label="Add contact"
                title="Add contact"
              >
                <UserPlus className="size-5" />
              </motion.button>

              {/* New group */}
              <motion.button
                type="button"
                whileHover={{ rotate: 90, scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                onClick={() => setShowCreate(true)}
                className="btn btn-circle size-10 min-h-10 border-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
                aria-label="Create group"
                title="New group"
              >
                <Plus className="size-5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Chats / Groups / Calls switch */}
        <div className="px-3 sm:px-4 pb-3">
          <LayoutGroup id="sidebar-modes">
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-base-200 shadow-inner"
              role="tablist"
            >
              {modes.map(({ key, label, icon: Icon, unread }) => {
                const active = mode === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    role="tab"
                    whileTap={{ scale: 0.94 }}
                    aria-selected={active}
                    onClick={() => changeMode(key)}
                    aria-label={label}
                    className={`relative flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[13px] sm:text-xs font-medium transition-colors ${
                      active
                        ? "text-primary"
                        : "text-base-content/60 hover:text-base-content"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-mode-pill"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-base-100 shadow-md ring-1 ring-base-300/60"
                      />
                    )}
                    <motion.span
                      className="relative z-10 inline-flex"
                      animate={
                        active
                          ? { scale: [1, 1.25, 1], rotate: [0, -10, 0] }
                          : { scale: 1, rotate: 0 }
                      }
                      transition={{ duration: 0.35 }}
                      key={active ? "on" : "off"}
                    >
                      <Icon className="size-4 shrink-0" />
                    </motion.span>
                    <span className="relative z-10 truncate">{label}</span>
                    <AnimatePresence>
                      {unread > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={POP}
                          className={`relative z-10 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold leading-none ${
                            key === "calls"
                              ? "bg-error text-error-content"
                              : "bg-primary text-primary-content"
                          }`}
                        >
                          {formatCount(unread)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Search + filters */}
        <div className="px-3 sm:px-4 pb-3 space-y-2.5">
          <motion.label
            animate={{ scale: searchFocused ? 1.015 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className={`input input-bordered input-sm h-11 sm:h-10 rounded-xl flex items-center gap-2 transition-all duration-200 ${
              searchFocused
                ? "bg-base-100 border-primary/50 shadow-md shadow-primary/10"
                : "bg-base-200/60"
            }`}
          >
            <motion.span
              animate={{
                rotate: searchFocused ? -12 : 0,
                scale: searchFocused ? 1.15 : 1,
              }}
              className="inline-flex"
            >
              <Search
                className={`size-4 shrink-0 transition-colors ${
                  searchFocused ? "text-primary" : "text-base-content/50"
                }`}
              />
            </motion.span>
            {/* text-base => iOS par focus karne par zoom nahi hota */}
            <input
              type="text"
              className="min-w-0 grow text-base sm:text-sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-base-content/40 hover:bg-base-300/60 hover:text-base-content transition-colors"
                >
                  <X className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.label>

          {/* Filters */}
          <AnimatePresence initial={false}>
            {mode === "chats" && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-2.5 overflow-hidden"
              >
                {/* Segmented control: All / Unread / Favorites */}
                <div
                  className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-200"
                  role="tablist"
                  aria-label="Filter conversations"
                >
                  {TABS.map(({ key, label }) => {
                    const active = tab === key;
                    const count = countFor(key, presence);
                    const highlight = key === "unread" && count > 0;

                    return (
                      <motion.button
                        key={key}
                        type="button"
                        role="tab"
                        whileTap={{ scale: 0.94 }}
                        aria-selected={active}
                        onClick={() => setTab(key)}
                        className={`relative flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[12px] sm:text-xs font-medium transition-colors ${
                          active
                            ? "text-base-content"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-tab-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-lg bg-base-100 shadow-sm"
                          />
                        )}
                        {key === "favorites" && (
                          <Star
                            className={`relative z-10 size-3 shrink-0 transition-colors ${
                              active ? "fill-warning text-warning" : ""
                            }`}
                          />
                        )}
                        <span className="relative z-10 truncate">{label}</span>
                        <span
                          className={`relative z-10 min-w-4 h-4 shrink-0 px-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold leading-none transition-colors ${
                            highlight
                              ? "bg-primary text-primary-content"
                              : "text-base-content/40"
                          }`}
                        >
                          <AnimatedCount value={formatCount(count)} />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Presence toggle: Any / Online / Offline */}
                <div
                  className="flex items-center gap-1 overflow-x-auto no-scrollbar"
                  role="group"
                  aria-label="Filter by status"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40 mr-1 shrink-0">
                    Status
                  </span>
                  {PRESENCE.map(({ key, label }) => {
                    const active = presence === key;
                    const count = countFor(tab, key);

                    return (
                      <motion.button
                        key={key}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        aria-pressed={active}
                        onClick={() => setPresence(key)}
                        className={`relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "text-base-content font-semibold"
                            : "text-base-content/50 hover:text-base-content hover:bg-base-200/60"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-presence-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-full bg-base-200 ring-1 ring-base-300"
                          />
                        )}
                        {key === "online" && (
                          <span className="relative z-10 size-2 rounded-full bg-success" />
                        )}
                        {key === "offline" && (
                          <span className="relative z-10 size-2 rounded-full border border-base-content/40" />
                        )}
                        <span className="relative z-10">{label}</span>
                        {key !== "any" && (
                          <AnimatedCount
                            value={count}
                            className="relative z-10 text-base-content/40"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Calls filter: All / Missed */}
            {mode === "calls" && (
              <motion.div
                key="call-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center gap-1 overflow-x-auto no-scrollbar"
                  role="group"
                  aria-label="Filter calls"
                >
                  {CALL_FILTERS.map(({ key, label }) => {
                    const active = callFilter === key;
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        aria-pressed={active}
                        onClick={() => setCallFilter(key)}
                        className={`relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                          active
                            ? "text-base-content font-semibold"
                            : "text-base-content/50 hover:text-base-content hover:bg-base-200/60"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-callfilter-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-full bg-base-200 ring-1 ring-base-300"
                          />
                        )}
                        <span className="relative z-10">{label}</span>
                        {key === "missed" && missedCount > 0 && (
                          <AnimatedCount
                            value={formatCount(missedCount)}
                            className="relative z-10 text-error"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* divider: gets a soft shadow once the list is scrolled */}
        <motion.div
          animate={{
            boxShadow: scrolled
              ? "0 6px 12px -6px rgba(0,0,0,0.18)"
              : "0 0 0 0 rgba(0,0,0,0)",
          }}
          className="relative z-10 border-t border-base-300"
        />

        {/* Conversation list */}
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="overflow-y-auto overscroll-contain w-full py-2 flex-1 min-h-0"
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
                  <CallSkeleton />
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
                            className="btn btn-sm btn-ghost text-primary mt-1"
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
                  {/* Archived header (archived view) ya "Archived (N)" row (main view) */}
                  {showArchivedGroups ? (
                    <div className="px-1.5 sm:px-2 pb-1">
                      <button
                        type="button"
                        onClick={() => setShowArchivedGroups(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-base-200"
                      >
                        <ArrowLeft className="size-4" />
                        Archived groups
                      </button>
                    </div>
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
                          className="btn btn-sm btn-ghost text-primary mt-1"
                        >
                          Back to groups
                        </button>
                      )}
                      {!q && !showArchivedGroups && (
                        <button
                          type="button"
                          onClick={() => setShowCreate(true)}
                          className="btn btn-sm btn-primary mt-1"
                        >
                          Create a group
                        </button>
                      )}
                    </EmptyState>
                  )}
                </>
              ) : (
                <>
                  {/* Archived header (archived view) ya "Archived (N)" row (main view) */}
                  {showArchived ? (
                    <div className="px-1.5 sm:px-2 pb-1">
                      <button
                        type="button"
                        onClick={() => setShowArchived(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-base-200"
                      >
                        <ArrowLeft className="size-4" />
                        Archived chats
                      </button>
                    </div>
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
                          className="btn btn-sm btn-ghost text-primary mt-1"
                        >
                          Clear filters
                        </button>
                      )}
                      {!hasActiveFilters &&
                        (showArchived ? (
                          <button
                            type="button"
                            onClick={() => setShowArchived(false)}
                            className="btn btn-sm btn-ghost text-primary mt-1"
                          >
                            Back to chats
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowAddContact(true)}
                            className="btn btn-sm btn-primary mt-1 gap-1"
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

        {/* ---------- Footer: account card + Profile / Settings / Logout ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.15 }}
          className="relative border-t border-base-300 bg-base-100/80 p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <LayoutGroup id="sidebar-footer">
            <motion.div
              whileHover={{ y: -1 }}
              className="flex flex-row items-center gap-1.5 sm:gap-2 rounded-2xl border border-base-300 bg-base-200/50 p-1.5 shadow-sm"
            >
              {/* my avatar + name -> profile */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/profile")}
                className="group flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 rounded-xl p-1 pr-2 transition-colors hover:bg-base-100"
                aria-label="Open my profile"
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarSrc(authUser?.avatar)}
                    alt={authUser?.fullName || "Me"}
                    className={`size-10 rounded-full object-cover ring-2 transition-all duration-200 group-hover:scale-105 ${
                      onProfile ? "ring-primary" : "ring-primary/20"
                    }`}
                  />
                  <AnimatePresence>
                    {meOnline && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={POP}
                        className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100"
                      />
                    )}
                  </AnimatePresence>
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {authUser?.fullName}
                  </p>
                  <p
                    className={`truncate text-xs ${
                      meOnline ? "text-success" : "text-base-content/50"
                    }`}
                  >
                    {meOnline ? "Online" : authUser?.email}
                  </p>
                </div>
              </motion.button>

              {/* actions */}
              <div className="flex flex-row items-center gap-0.5 shrink-0">
                <FooterAction
                  icon={UserRound}
                  label="My profile"
                  active={onProfile}
                  onClick={() => navigate("/profile")}
                />
                <FooterAction
                  icon={Settings}
                  label="Settings"
                  active={onSettings}
                  spin
                  onClick={() => navigate("/settings")}
                />
                <FooterAction
                  icon={LogOut}
                  label="Log out"
                  danger
                  onClick={() => setConfirmLogout(true)}
                />
              </div>
            </motion.div>
          </LayoutGroup>
        </motion.div>

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
      </motion.aside>
    </MotionConfig>
  );
};

export default Sidebar;
