import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  Ban,
  Cake,
  CalendarDays,
  Clock,
  ExternalLink,
  Globe,
  History,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MessageSquareText,
  PanelRightOpen,
  Phone,
  ShieldCheck,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

const LOCALE = "en-IN";
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

/* ---------- helpers ---------- */

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value, opts) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(LOCALE, opts) : "";
};

// "today, 10:57 PM" / "21 Oct, 10:57 PM" / "21 Oct 2025, 10:57 PM"
const formatActivity = (value) => {
  const d = parseDate(value);
  if (!d) return "";
  const now = new Date();
  const time = d.toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return `today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString())
    return `yesterday, ${time}`;

  const date = d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
  return `${date}, ${time}`;
};

const calcAge = (dob) => {
  const d = parseDate(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
};

const daysUntilBirthday = (dob) => {
  const d = parseDate(dob);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
};

const birthdayHint = (days) => {
  if (days === null) return "";
  if (days === 0) return "Today 🎂";
  if (days === 1) return "Tomorrow";
  if (days <= 30) return `In ${days} days`;
  return "";
};

const localTimeIn = (timeZone, now) => {
  if (!timeZone) return "";
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(now);
  } catch {
    return "";
  }
};

const prettyLink = (url) => {
  try {
    const u = new URL(url);
    const rest = `${u.pathname}${u.search}`.replace(/^\/$/, "");
    return { host: u.hostname.replace(/^www\./, ""), rest };
  } catch {
    return { host: url, rest: "" };
  }
};

// Mongo ObjectIds / populated objects -> plain string ids
const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

// avatar can be a string URL or { url }
const getAvatar = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "/avatar.png";

// Short preview of the last message
const previewLastMessage = (msg) => {
  if (!msg || msg.isDeleted) return "";
  const text = msg.text?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  if (msg.image?.url) return "📷 Photo";
  return "";
};

/* ---------- small components ---------- */

const Section = ({ title, aside, children }) => (
  <section className="px-5 py-4">
    <div className="mb-2.5 flex items-center justify-between">
      <h4 className="text-sm font-semibold">{title}</h4>
      {aside !== undefined && aside !== null && (
        <span className="text-xs text-base-content/50">{aside}</span>
      )}
    </div>
    {children}
  </section>
);

const InfoRow = ({ icon: Icon, label, value, hint, href }) => {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2">
      <span className="text-sm [overflow-wrap:anywhere]">{value}</span>
      {hint && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {hint}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200">
        <Icon className="size-4 text-base-content/60" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-base-content/50">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="link link-hover"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }) => (
  <div className="flex-1 rounded-xl bg-base-200/60 px-2 py-2.5 text-center">
    <Icon className="mx-auto size-4 text-base-content/50" />
    <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    <p className="mt-1 text-[11px] text-base-content/50">{label}</p>
  </div>
);

const ActionButton = ({
  icon: Icon,
  label,
  active,
  onClick,
  filled,
  danger,
  loading,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-pressed={active}
    className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
      active
        ? danger
          ? "bg-error/10 text-error"
          : "bg-primary/10 text-primary"
        : danger
          ? "bg-base-200/70 text-base-content/70 hover:bg-error/10 hover:text-error"
          : "bg-base-200/70 text-base-content/70 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    {loading ? (
      <Loader2 className="size-5 animate-spin" />
    ) : (
      <Icon className={`size-5 ${active && filled ? "fill-current" : ""}`} />
    )}
    {label}
  </button>
);

// Confirmation modal (rendered in document.body via portal so it always
// covers the full screen, even inside transformed/overflow parents)
const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal-box max-w-sm">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
            }`}
          >
            <Ban className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-modal-title" className="text-lg font-semibold">
              {title}
            </h3>
            <p className="mt-1 text-sm text-base-content/70 [overflow-wrap:anywhere]">
              {message}
            </p>
          </div>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? "btn-error" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>

      {/* Click on backdrop closes the modal */}
      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !loading && onCancel()}
      />
    </div>,
    document.body,
  );
};

/* ---------- main ---------- */

const UserInfoPanel = ({ open, onToggle }) => {
  const { selectedUser, messages } = useChatStore();
  const {
    onlineUsers,
    hiddenUsers,
    authUser,
    blockUser,
    unblockUser,
    toggleFavorite,
    fetchCurrentUser,
  } = useAuthStore();

  // Which action is in flight: "favorite" | "block" | null
  const [pending, setPending] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // GET /users/me — keep favorites / blockedUsers fresh
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Close the modal if the user switches to another chat
  const currentId = selectedUser
    ? String(selectedUser.id ?? selectedUser._id)
    : null;
  useEffect(() => {
    setShowBlockModal(false);
  }, [currentId]);

  if (!selectedUser) return null;

  // Collapsed: thin strip so it can be reopened
  if (!open) {
    return (
      <div className="hidden xl:flex shrink-0 w-12 border-l border-base-300 bg-base-100 justify-center pt-4">
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Open contact info"
          title="Contact info"
        >
          <PanelRightOpen className="size-5" />
        </button>
      </div>
    );
  }

  /* ----- derived data ----- */
  const list = Array.isArray(messages) ? messages : [];
  const visible = list.filter((m) => !m.isDeleted);
  const photos = visible.filter((m) => m.image?.url);
  const recentPhotos = photos.slice(-6).reverse();

  const allLinks = [];
  for (const m of visible) {
    const found = m.text?.match(URL_RE);
    if (found) allLinks.push(...found);
  }
  const uniqueLinks = [...new Set(allLinks.reverse())];
  const recentLinks = uniqueLinks.slice(0, 5);

  const firstMessageAt = visible
    .map((m) => parseDate(m.createdAt))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  const chattingSince = firstMessageAt
    ? formatDate(firstMessageAt, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const selectedId = String(selectedUser.id ?? selectedUser._id);
  const online = toIds(onlineUsers).includes(selectedId);
  const hidden = toIds(hiddenUsers).includes(selectedId);
  const favorite = toIds(authUser?.favorites).includes(selectedId);

  // authUser.blockedUsers is the source of truth; fall back to selectedUser.isBlocked
  const isBlocked = Array.isArray(authUser?.blockedUsers)
    ? toIds(authUser.blockedUsers).includes(selectedId)
    : Boolean(selectedUser.isBlocked);

  const unreadCount = Number(selectedUser.unreadCount) || 0;

  const handleFavorite = async () => {
    if (pending) return;
    setPending("favorite");
    try {
      await toggleFavorite(selectedId, favorite);
    } finally {
      setPending(null);
    }
  };

  // Actually block / unblock (called from modal confirm, or directly for unblock)
  const performBlockToggle = async () => {
    if (pending) return;
    setPending("block");
    try {
      if (isBlocked) await unblockUser(selectedId);
      else await blockUser(selectedId);
      setShowBlockModal(false);
    } finally {
      setPending(null);
    }
  };

  // Block button: open modal. Unblock: do it directly.
  const handleBlock = () => {
    if (pending) return;
    if (isBlocked) performBlockToggle();
    else setShowBlockModal(true);
  };

  // Optional profile fields (shown only if backend sends them)
  const age = calcAge(selectedUser.dob);
  const bdayDays = daysUntilBirthday(selectedUser.dob);
  const birthday = formatDate(selectedUser.dob, {
    day: "numeric",
    month: "long",
  });
  const memberSince = formatDate(selectedUser.createdAt, {
    month: "short",
    year: "numeric",
  });
  const localTime = localTimeIn(selectedUser.timezone, now);
  const website = selectedUser.website?.trim() || "";
  const websiteLabel = website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Fields available in the conversation-list response
  const lastActivityRaw =
    selectedUser.lastSeen ||
    selectedUser.lastMessageAt ||
    selectedUser.lastMessage?.createdAt;
  const lastActivity = formatActivity(lastActivityRaw);
  const lastMessagePreview = previewLastMessage(selectedUser.lastMessage);

  const statusText = online
    ? "Online now"
    : hidden
      ? "Status hidden"
      : lastActivity
        ? `Last active ${lastActivity}`
        : "Offline";

  const hasDetails = Boolean(
    selectedUser.username ||
    selectedUser.email ||
    selectedUser.phone ||
    selectedUser.location ||
    website ||
    selectedUser.gender ||
    birthday ||
    localTime ||
    memberSince ||
    chattingSince ||
    lastActivity ||
    lastMessagePreview,
  );

  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l border-base-300 bg-base-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="size-5 text-base-content/60" />
          Contact info
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Close contact info"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-4">
          <div className="relative">
            <img
              src={getAvatar(selectedUser.avatar)}
              alt={selectedUser.fullName}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
              className={`size-28 rounded-full object-cover ring-4 ring-base-200 ${
                isBlocked ? "grayscale opacity-70" : ""
              }`}
            />
            {online && !isBlocked && !hidden && (
              <span className="absolute bottom-1.5 right-1.5 size-4 rounded-full bg-success ring-4 ring-base-100" />
            )}
          </div>

          <h3 className="mt-3 text-lg font-semibold [overflow-wrap:anywhere]">
            {selectedUser.fullName}
          </h3>
          {selectedUser.username && (
            <p className="text-sm text-base-content/60 [overflow-wrap:anywhere]">
              @{selectedUser.username}
            </p>
          )}

          {isBlocked ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
              <Ban className="size-3" />
              Blocked
            </span>
          ) : (
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                online
                  ? "bg-success/10 text-success"
                  : "bg-base-200 text-base-content/60"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  online ? "bg-success" : "bg-base-content/40"
                }`}
              />
              {statusText}
            </span>
          )}

          {unreadCount > 0 && !isBlocked && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MessageSquare className="size-3" />
              {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
            </span>
          )}

          {selectedUser.bio && (
            <p className="mt-3 text-sm text-base-content/70 [overflow-wrap:anywhere]">
              {selectedUser.bio}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-4">
          <ActionButton
            icon={Star}
            label={favorite ? "Favorited" : "Favorite"}
            active={favorite}
            filled
            loading={pending === "favorite"}
            onClick={handleFavorite}
          />
          <ActionButton
            icon={isBlocked ? ShieldCheck : Ban}
            label={isBlocked ? "Unblock" : "Block"}
            active={isBlocked}
            danger
            loading={pending === "block" && !showBlockModal}
            onClick={handleBlock}
          />
        </div>

        {/* Stats */}
        <div className="flex gap-2 px-5 pb-4">
          <Stat
            icon={MessageSquareText}
            value={visible.length}
            label="Messages"
          />
          <Stat icon={ImageIcon} value={photos.length} label="Photos" />
        </div>

        <div className="border-t border-base-300" />

        {/* Details */}
        <Section title="Details">
          <div className="divide-y divide-base-200">
            <InfoRow
              icon={Mail}
              label="Email"
              value={selectedUser.email}
              href={selectedUser.email ? `mailto:${selectedUser.email}` : ""}
            />
            <InfoRow
              icon={AtSign}
              label="Username"
              value={selectedUser.username}
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={selectedUser.phone}
              href={
                selectedUser.phone
                  ? `tel:${String(selectedUser.phone).replace(/\s/g, "")}`
                  : ""
              }
            />
            <InfoRow icon={Users} label="Gender" value={selectedUser.gender} />
            <InfoRow
              icon={Cake}
              label="Birthday"
              value={birthday}
              hint={birthdayHint(bdayDays)}
            />
            {age !== null && (
              <InfoRow icon={CalendarDays} label="Age" value={`${age} years`} />
            )}
            <InfoRow
              icon={MapPin}
              label="Location"
              value={selectedUser.location}
            />
            <InfoRow icon={Clock} label="Local time" value={localTime} />
            <InfoRow
              icon={Globe}
              label="Website"
              value={websiteLabel}
              href={website}
            />
            <InfoRow
              icon={History}
              label={online ? "Active" : "Last active"}
              value={online ? "Now" : hidden ? "—" : lastActivity}
            />
            <InfoRow
              icon={MessageSquare}
              label="Last message"
              value={lastMessagePreview}
            />
            <InfoRow
              icon={CalendarDays}
              label="Chatting since"
              value={chattingSince}
            />
            <InfoRow
              icon={CalendarDays}
              label="Member since"
              value={memberSince}
            />
          </div>

          {!hasDetails && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <User className="size-6 text-base-content/30" />
              <p className="text-sm text-base-content/50">
                This person hasn't added any details yet.
              </p>
            </div>
          )}
        </Section>

        {/* Shared photos */}
        {recentPhotos.length > 0 && (
          <>
            <div className="border-t border-base-300" />
            <Section title="Shared photos" aside={photos.length}>
              <div className="grid grid-cols-3 gap-1.5">
                {recentPhotos.map((m) => (
                  <a
                    key={m.clientId || m.id || m._id}
                    href={m.image.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block aspect-square overflow-hidden rounded-lg bg-base-200"
                  >
                    <img
                      src={m.image.url}
                      alt="Shared"
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-200 hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Shared links */}
        {recentLinks.length > 0 && (
          <>
            <div className="border-t border-base-300" />
            <Section title="Shared links" aside={uniqueLinks.length}>
              <ul className="space-y-1.5">
                {recentLinks.map((url) => {
                  const { host, rest } = prettyLink(url);
                  return (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-center gap-3 rounded-xl bg-base-200/60 px-3 py-2.5 transition-colors hover:bg-base-200"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-100">
                          <Link2 className="size-4 text-base-content/60" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{host}</p>
                          {rest && (
                            <p className="truncate text-xs text-base-content/50">
                              {rest}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="size-3.5 shrink-0 text-base-content/30 transition-colors group-hover:text-base-content/70" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        )}
      </div>

      {/* Block confirmation modal */}
      <ConfirmModal
        open={showBlockModal}
        danger
        title={`Block ${selectedUser.fullName}?`}
        message="You won't be able to exchange messages with this person until you unblock them."
        confirmLabel="Block"
        loading={pending === "block"}
        onConfirm={performBlockToggle}
        onCancel={() => setShowBlockModal(false)}
      />
    </aside>
  );
};

export default UserInfoPanel;
