import {
  Search,
  Users,
  Star,
  X,
  MessageCircle,
  Plus,
  UsersRound,
  Settings,
  LogOut,
  Loader2,
  UserRound,
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
import SidebarSkeleton from "../components/Skeleton/SidebarSkeleton";
import CreateGroupModal from "./modal/CreateGroupModel";

const sameId = (a, b) => String(a) === String(b);

const formatCount = (n) => (n > 99 ? "99+" : String(n));

const avatarSrc = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "/avatar.png";

const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

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

const SPRING = { type: "spring", stiffness: 500, damping: 38 };
const POP = { type: "spring", stiffness: 520, damping: 22 };

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

/* ---------- message preview (text / video / photo / voice / file) ----------
   NOTE: agar aapke backend me field ka naam alag hai
   (jaise `videoUrl`, `video.url`), to neeche isVideo / isAudio me add kar dein.
   Backend ke getUsers / getGroups me lastMessage ke saath `video` field
   bhi aana chahiye, warna preview me video detect nahi hoga. */
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

const UnreadBadge = ({ count }) => (
  <AnimatePresence initial={false}>
    {count > 0 && (
      <motion.span
        key={count}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={POP}
        className="inline-flex items-center justify-center rounded-full bg-primary text-primary-content text-[11px] font-semibold leading-none min-w-5 h-5 px-1.5 shadow-sm"
        aria-label={`${count} unread messages`}
      >
        {formatCount(count)}
      </motion.span>
    )}
  </AnimatePresence>
);

const SectionLabel = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="px-4 sm:px-5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-content/40"
  >
    {children}
  </motion.div>
);

const EmptyState = ({ icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center gap-2 text-center text-sm text-base-content/50 py-12 px-4"
  >
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <Icon className="size-8 text-base-content/20" />
    </motion.div>
    {children}
  </motion.div>
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
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.9 }}
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
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
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
  const [mode, setMode] = useState("chats");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("all");
  const [presence, setPresence] = useState("any");
  const [query, setQuery] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
  } = useChatStore();

  const {
    groups,
    selectedGroup,
    selectGroup,
    closeGroup,
    fetchGroups,
    subscribeToGroups,
    unsubscribeFromGroups,
  } = useGroupStore();

  const { onlineUsers, hiddenUsers, socket, authUser, toggleFavorite, logout } =
    useAuthStore();

  // Favorites come from the server (authUser.favorites), same source
  // as the Contact info panel, so both always stay in sync.
  const favorites = toIds(authUser?.favorites);

  useEffect(() => {
    getUsers();
    fetchGroups();
  }, [getUsers, fetchGroups]);

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

  if (isUsersLoading) return <SidebarSkeleton />;

  const onlineIds = toIds(onlineUsers);
  const hiddenIds = toIds(hiddenUsers);
  const isOnline = (user) => onlineIds.includes(String(user.id));
  const isHidden = (user) => hiddenIds.includes(String(user.id));
  const isFavorite = (user) => favorites.includes(String(user.id));
  const meOnline = authUser ? onlineIds.includes(String(authUser.id)) : false;

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
    users.filter((u) => tabMatch[t](u) && presenceMatch[p](u)).length;

  const q = query.trim().toLowerCase();
  const filteredUsers = users
    .filter((user) => {
      if (!tabMatch[tab](user)) return false;
      if (!presenceMatch[presence](user)) return false;
      if (q && !user.fullName?.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => timeValue(b) - timeValue(a));

  const filteredGroups = groups
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
    if (q) return "No contacts match your search";
    if (tab !== "all" && presence !== "any")
      return "Nothing matches these filters";
    if (tab === "unread") return "You're all caught up";
    if (tab === "favorites") return "No favorite contacts yet";
    if (presence === "online") return "No one is online right now";
    if (presence === "offline") return "Everyone is online right now";
    return "No contacts yet";
  };

  const chatUnread = users.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  const groupUnread = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const totalUnread = chatUnread + groupUnread;

  // Mobile: jab koi chat/group khula ho to sidebar chhup jata hai
  // (desktop par hamesha dikhta hai). Chat header ka back/X button chat band
  // karta hai aur list wapas aa jati hai.
  const hasOpenChat = !!(selectedUser || selectedGroup);

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  const onSettings = pathname === "/settings";
  const onProfile = pathname === "/profile";

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
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -14, transition: { duration: 0.12 } }}
        transition={{ ...SPRING, delay: Math.min(i, 8) * 0.025 }}
        className="relative group px-1.5 sm:px-2"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
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
              className="absolute inset-0 rounded-xl bg-primary/10 shadow-sm"
            >
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            </motion.span>
          )}

          {/* Avatar */}
          <div className="relative z-10 shrink-0">
            <img
              src={avatarSrc(user.avatar)}
              alt={user.fullName}
              className={`size-11 sm:size-12 object-cover rounded-full ring-2 transition-shadow ${
                isSelected ? "ring-primary/40" : "ring-transparent"
              }`}
            />
            {online && (
              <span className="absolute bottom-0 right-0 size-3.5">
                <span className="absolute inset-0 rounded-full bg-success/60 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-success ring-2 ring-base-100" />
              </span>
            )}
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
            whileTap={{ scale: 0.8 }}
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
            <Star
              className={`size-4 transition-colors ${
                favorite
                  ? "fill-warning text-warning"
                  : "text-base-content/40 hover:text-warning"
              }`}
            />
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
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -14, transition: { duration: 0.12 } }}
        transition={{ ...SPRING, delay: Math.min(i, 8) * 0.025 }}
        className="px-1.5 sm:px-2"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => openGroup(group)}
          className={`relative w-full min-h-[64px] rounded-xl px-2.5 sm:px-3 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors duration-150 ${
            isSelected ? "" : "hover:bg-base-200 active:bg-base-200"
          }`}
        >
          {isSelected && (
            <motion.span
              layoutId="sidebar-selected"
              transition={SPRING}
              className="absolute inset-0 rounded-xl bg-primary/10 shadow-sm"
            >
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            </motion.span>
          )}

          <div className="relative z-10 shrink-0">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.name}
                className={`size-11 sm:size-12 object-cover rounded-full ring-2 ${
                  isSelected ? "ring-primary/40" : "ring-transparent"
                }`}
              />
            ) : (
              <div
                className={`size-11 sm:size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg ring-2 ${
                  isSelected ? "ring-primary/40" : "ring-transparent"
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
      </motion.div>
    );
  };

  /* ---------- render ---------- */
  return (
    <MotionConfig reducedMotion="user">
      <aside
        className={`h-full w-full min-w-0 shrink-0 border-r border-base-300 bg-base-100 flex-col transition-all duration-300 lg:w-80 xl:w-96 ${
          hasOpenChat ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="relative w-full px-4 sm:px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.06 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="size-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center shadow-md shadow-primary/20"
              >
                <Users className="size-5" />
              </motion.div>
              <span className="truncate font-semibold text-lg">Messages</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <AnimatePresence>
                {totalUnread > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center whitespace-nowrap rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1"
                  >
                    {formatCount(totalUnread)} new
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.button
                type="button"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                onClick={() => setShowCreate(true)}
                className="btn btn-ghost btn-circle size-10 min-h-10"
                aria-label="Create group"
                title="New group"
              >
                <Plus className="size-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Chats / Groups switch */}
        <div className="px-3 sm:px-4 pb-3">
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-base-200"
            role="tablist"
          >
            {[
              {
                key: "chats",
                label: "Chats",
                icon: MessageCircle,
                unread: chatUnread,
              },
              {
                key: "groups",
                label: "Groups",
                icon: UsersRound,
                unread: groupUnread,
              },
            ].map(({ key, label, icon: Icon, unread }) => (
              <motion.button
                key={key}
                type="button"
                role="tab"
                whileTap={{ scale: 0.95 }}
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                aria-label={label}
                className={`relative flex min-h-10 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] sm:text-xs font-medium transition-colors ${
                  mode === key
                    ? "text-base-content"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                {mode === key && (
                  <motion.span
                    layoutId="sidebar-mode-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-lg bg-base-100 shadow-sm"
                  />
                )}
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{label}</span>
                {unread > 0 && (
                  <span className="relative z-10 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-content text-[10px] font-semibold leading-none">
                    {formatCount(unread)}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div className="px-3 sm:px-4 pb-3 space-y-2.5">
          <label className="input input-bordered input-sm h-11 sm:h-10 rounded-xl flex items-center gap-2 bg-base-200/60 focus-within:bg-base-100 focus-within:shadow-sm focus-within:shadow-primary/10 transition-shadow">
            <Search className="size-4 shrink-0 text-base-content/50" />
            {/* text-base => iOS par focus karne par zoom nahi hota */}
            <input
              type="text"
              className="min-w-0 grow text-base sm:text-sm"
              placeholder={
                mode === "groups" ? "Search groups" : "Search contacts"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="grid size-7 shrink-0 place-items-center text-base-content/40 hover:text-base-content transition-colors"
                >
                  <X className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </label>

          {/* Filters apply to 1:1 chats only */}
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
                        whileTap={{ scale: 0.95 }}
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
                            className={`relative z-10 size-3 shrink-0 ${
                              active ? "fill-warning text-warning" : ""
                            }`}
                          />
                        )}
                        <span className="relative z-10 truncate">{label}</span>
                        <span
                          className={`relative z-10 min-w-4 h-4 shrink-0 px-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold leading-none ${
                            highlight
                              ? "bg-primary text-primary-content"
                              : "text-base-content/40"
                          }`}
                        >
                          {formatCount(count)}
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
                        whileTap={{ scale: 0.94 }}
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
                            className="absolute inset-0 rounded-full bg-base-200"
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
                          <span className="relative z-10 text-base-content/40">
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-base-300" />

        {/* Conversation list */}
        <div className="overflow-y-auto overscroll-contain w-full py-2 flex-1 min-h-0">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "groups" ? (
              <>
                <AnimatePresence initial={false}>
                  {filteredGroups.map((g, i) => renderGroup(g, i))}
                </AnimatePresence>

                {filteredGroups.length === 0 && (
                  <EmptyState icon={UsersRound}>
                    {q
                      ? "No groups match your search"
                      : "You're not in any groups yet"}
                    {!q && (
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
                  </EmptyState>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* ---------- Footer: account card + Profile / Settings / Logout ---------- */}
        <div className="relative border-t border-base-300 bg-base-100/80 p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <LayoutGroup id="sidebar-footer">
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 rounded-2xl border border-base-300 bg-base-200/50 p-1.5">
              {/* my avatar + name -> profile */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 rounded-xl p-1 pr-2 transition-colors hover:bg-base-100"
                aria-label="Open my profile"
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarSrc(authUser?.avatar)}
                    alt={authUser?.fullName || "Me"}
                    className={`size-10 rounded-full object-cover ring-2 transition-shadow ${
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
                  <p className="truncate text-xs text-base-content/50">
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
            </div>
          </LayoutGroup>
        </div>

        <CreateGroupModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
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
