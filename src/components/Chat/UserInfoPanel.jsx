import { useEffect, useState, useMemo } from "react";
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
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MessageSquareText,
  PanelRightOpen,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { usePrivacyStore } from "../../store/usePrivacyStore";
import { useCall } from "../../context/CallContext";
import { axiosInstance } from "../../lib/axios";
import { useLastSeen } from "../../hooks/useLastSeen.js";
import { formatLastSeenTimestamp } from "../../lib/lastSeen";
import ProfileImageViewer from "./Common/ProfileImageViewer.jsx";

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

const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

const getAvatar = (avatar) =>
  (typeof avatar === "string" ? avatar : avatar?.url) || "";

const previewLastMessage = (msg) => {
  if (!msg || msg.isDeleted) return "";
  const text = msg.text?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  if (msg.image?.url) return "📷 Photo";
  return "";
};

/* ---------- UI Subcomponents ---------- */

const Section = ({ title, aside, children }) => (
  <section className="px-5 py-4">
    <div className="mb-2.5 flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
        {title}
      </h4>
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
  disabled,
  loading,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    aria-pressed={active}
    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? danger
          ? "bg-error/15 text-error"
          : "bg-primary/15 text-primary"
        : danger
          ? "bg-base-200/70 text-base-content/70 hover:bg-error/10 hover:text-error"
          : "bg-base-200/70 text-base-content/70 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    {loading ? (
      <Loader2 className="size-4 sm:size-5 animate-spin" />
    ) : (
      <Icon
        className={`size-4 sm:size-5 ${active && filled ? "fill-current" : ""}`}
      />
    )}
    <span className="truncate max-w-[5rem] text-[11px]">{label}</span>
  </button>
);

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

      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !loading && onCancel()}
      />
    </div>,
    document.body,
  );
};

/* ---------- main UserInfoPanel component ---------- */

const UserInfoPanel = ({ open, onToggle }) => {
  const { selectedUser, users, messages } = useChatStore();
  const {
    hiddenUsers,
    authUser,
    blockUser,
    unblockUser,
    toggleFavorite,
    fetchCurrentUser,
  } = useAuthStore();
  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);
  const { startCall, status: callStatus } = useCall();

  const [pending, setPending] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [viewAvatar, setViewAvatar] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const selectedId = selectedUser
    ? String(selectedUser.id ?? selectedUser._id)
    : null;

  const {
    text: lastSeenText,
    isOnline: isUserOnline,
    timestamp: userLastSeenTimestamp,
    isLoading: isPresenceLoading,
  } = useLastSeen(selectedId);

  // Fetch full profile details whenever selectedUser changes
  useEffect(() => {
    if (!selectedId) return;
    setImgError(false);
    let active = true;
    axiosInstance
      .get(`/users/${selectedId}/profile`)
      .then((res) => {
        if (active && res.data?.data?.user) {
          const u = res.data.data.user;
          setProfileData(u);
          useChatStore.setState((s) => ({
            selectedUser:
              s.selectedUser &&
              (String(s.selectedUser.id) === selectedId ||
                String(s.selectedUser._id) === selectedId)
                ? { ...s.selectedUser, ...u }
                : s.selectedUser,
            users: s.users.map((usr) =>
              String(usr.id) === selectedId || String(usr._id) === selectedId
                ? { ...usr, ...u }
                : usr,
            ),
          }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    setShowBlockModal(false);
  }, [selectedId]);

  // Combine store data with detailed profile data
  const targetUser = useMemo(() => {
    const base = {
      ...selectedUser,
      ...(profileData || {}),
    };
    if (selectedUser?.lastSeen !== undefined) {
      base.lastSeen = selectedUser.lastSeen;
    }
    return base;
  }, [selectedUser, profileData]);

  if (!selectedUser) return null;

  // Collapsed desktop strip
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

  /* ----- derived data & privacy computations ----- */
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

  const hidden = toIds(hiddenUsers).includes(selectedId);
  const favorite = toIds(authUser?.favorites).includes(selectedId);

  const isBlocked = Array.isArray(authUser?.blockedUsers)
    ? toIds(authUser.blockedUsers).includes(selectedId)
    : Boolean(targetUser.isBlocked);

  const conversation = users?.find((u) => String(u.id ?? u._id) === selectedId);
  const unreadCount =
    Number(conversation?.unreadCount ?? targetUser.unreadCount) || 0;

  const isOnlineRestricted = Boolean(
    hidden || targetUser.isOnlineRestricted || !myStatusVisible,
  );
  const isOnlineActive = isUserOnline && !isBlocked;

  const presenceStatusText = isBlocked ? "Blocked" : lastSeenText;

  const isAboutRestricted = Boolean(targetUser.isAboutRestricted);
  const isPhotoRestricted = Boolean(targetUser.isPhotoRestricted);

  const rawAvatarUrl = getAvatar(targetUser.avatar);
  const showPhoto = !isPhotoRestricted && !imgError && Boolean(rawAvatarUrl);

  const initials = (targetUser.fullName || "User")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFavorite = async () => {
    if (pending) return;
    setPending("favorite");
    try {
      await toggleFavorite(selectedId, favorite);
    } finally {
      setPending(null);
    }
  };

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

  const handleBlock = () => {
    if (pending) return;
    if (isBlocked) performBlockToggle();
    else setShowBlockModal(true);
  };

  // Calling & Quick action helpers
  const callPeer = {
    id: selectedId,
    fullName: targetUser.fullName || "Contact",
  };
  const canCall = callStatus === "idle" && !isBlocked;

  const handleAudioCall = () => {
    if (canCall) startCall(callPeer, "audio");
  };

  const handleVideoCall = () => {
    if (canCall) startCall(callPeer, "video");
  };

  const handleMessageFocus = () => {
    if (window.innerWidth < 1280) onToggle();
    const input = document.querySelector(
      'textarea, input[placeholder*="Type a message"], input[placeholder*="Type here"]',
    );
    input?.focus();
  };

  const handleSearchMessages = () => {
    window.dispatchEvent(new CustomEvent("chatty:search-messages"));
  };

  // Optional profile details
  const age = calcAge(targetUser.dob);
  const bdayDays = daysUntilBirthday(targetUser.dob);
  const birthday = formatDate(targetUser.dob, {
    day: "numeric",
    month: "long",
  });
  const memberSince = formatDate(targetUser.createdAt, {
    month: "short",
    year: "numeric",
  });
  const localTime = localTimeIn(targetUser.timezone, now);
  const website = !isAboutRestricted ? targetUser.website?.trim() || "" : "";
  const websiteLabel = website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const location = !isAboutRestricted ? targetUser.location?.trim() || "" : "";
  const lastMessagePreview = previewLastMessage(targetUser.lastMessage);

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 xl:hidden"
        onClick={onToggle}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-2xl xl:relative xl:z-auto xl:w-80 xl:max-w-none xl:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Info className="size-5 text-base-content/60" />
            <span>Contact info</span>
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
          {/* ========================================================= */}
          {/* SECTION A: PROFILE HEADER                                 */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => showPhoto && setViewAvatar(true)}
                className={`relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  showPhoto ? "cursor-pointer" : "cursor-default"
                }`}
                aria-label={
                  showPhoto ? `View ${targetUser.fullName}'s photo` : undefined
                }
              >
                {showPhoto ? (
                  <img
                    src={rawAvatarUrl}
                    alt={targetUser.fullName}
                    onError={() => setImgError(true)}
                    className={`size-24 sm:size-28 rounded-full object-cover ring-4 ring-base-200 shadow-sm transition-transform duration-200 ${
                      showPhoto ? "hover:scale-105" : ""
                    } ${isBlocked ? "grayscale opacity-70" : ""}`}
                  />
                ) : (
                  <div
                    className={`flex size-24 sm:size-28 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold uppercase text-primary ring-4 ring-base-200 shadow-sm ${
                      isBlocked ? "grayscale opacity-70" : ""
                    }`}
                  >
                    {initials}
                  </div>
                )}
              </button>

              {/* Online indicator dot */}
              {isOnlineActive && (
                <span className="absolute bottom-1 right-1 size-4 rounded-full bg-success ring-4 ring-base-100" />
              )}
            </div>

            <h3 className="mt-3 text-lg font-bold [overflow-wrap:anywhere]">
              {targetUser.fullName}
            </h3>
            {targetUser.username && (
              <p className="text-xs text-base-content/60 [overflow-wrap:anywhere]">
                @{targetUser.username}
              </p>
            )}

            {/* Privacy-authorized presence status badge */}
            <div className="mt-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  isBlocked
                    ? "bg-error/10 text-error"
                    : isOnlineActive
                      ? "bg-success/10 text-success"
                      : "bg-base-200 text-base-content/70"
                }`}
              >
                {isBlocked ? (
                  <Ban className="size-3" />
                ) : (
                  <span
                    className={`size-1.5 rounded-full ${
                      isOnlineActive ? "bg-success" : "bg-base-content/40"
                    }`}
                  />
                )}
                {presenceStatusText ||
                  (isPresenceLoading ? (
                    <span className="inline-block h-3 w-16 animate-pulse rounded bg-base-content/20" />
                  ) : null)}
              </span>
            </div>

            {unreadCount > 0 && !isBlocked && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <MessageSquare className="size-3" />
                {unreadCount} unread{" "}
                {unreadCount === 1 ? "message" : "messages"}
              </span>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION B: CONTACT ACTIONS                                */}
          {/* ========================================================= */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-2">
              <ActionButton
                icon={MessageSquare}
                label="Message"
                onClick={handleMessageFocus}
              />
              <ActionButton
                icon={Phone}
                label="Audio"
                disabled={!canCall}
                onClick={handleAudioCall}
              />
              <ActionButton
                icon={Video}
                label="Video"
                disabled={!canCall}
                onClick={handleVideoCall}
              />
              <ActionButton
                icon={Search}
                label="Search"
                onClick={handleSearchMessages}
              />
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
          </div>

          {/* Statistics summary */}
          <div className="flex gap-2 px-5 pb-4">
            <Stat
              icon={MessageSquareText}
              value={visible.length}
              label="Messages"
            />
            <Stat icon={ImageIcon} value={photos.length} label="Photos" />
          </div>

          <div className="border-t border-base-300" />

          {/* ========================================================= */}
          {/* SECTION C: PERSONAL INFORMATION (About & Custom Status)    */}
          {/* ========================================================= */}
          <Section title="Personal Information">
            <div className="space-y-3">
              {/* About Bio */}
              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/40">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-base-content/60">
                  <Info className="size-3.5" />
                  <span>About Bio</span>
                </div>
                {isAboutRestricted ? (
                  <div className="flex items-center gap-2 text-xs text-base-content/50 italic py-0.5">
                    <ShieldAlert className="size-3.5 shrink-0 text-base-content/40" />
                    <span>About information is unavailable.</span>
                  </div>
                ) : targetUser.bio ? (
                  <p className="text-sm text-base-content/85 leading-relaxed [overflow-wrap:anywhere]">
                    {targetUser.bio}
                  </p>
                ) : (
                  <p className="text-xs text-base-content/45 italic py-0.5">
                    No bio provided yet.
                  </p>
                )}
              </div>

              {/* Custom Status */}
              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/40">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-base-content/60">
                  <Sparkles className="size-3.5" />
                  <span>Custom Status</span>
                </div>
                {isAboutRestricted ? (
                  <div className="flex items-center gap-2 text-xs text-base-content/50 italic py-0.5">
                    <Lock className="size-3.5 shrink-0 text-base-content/40" />
                    <span>Status information is unavailable.</span>
                  </div>
                ) : targetUser.customStatus ? (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                    <Sparkles className="size-3.5 shrink-0" />
                    <span className="[overflow-wrap:anywhere]">
                      {targetUser.customStatus}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-base-content/60 py-0.5">
                    <span className="size-2 rounded-full bg-success" />
                    <span>Available</span>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <div className="border-t border-base-300" />

          {/* ========================================================= */}
          {/* SECTION D: DETAILS & CONTACT OVERVIEW                     */}
          {/* ========================================================= */}
          <Section title="Overview & Details">
            <div className="divide-y divide-base-200">
              <InfoRow
                icon={Mail}
                label="Email"
                value={targetUser.email}
                href={targetUser.email ? `mailto:${targetUser.email}` : ""}
              />
              <InfoRow
                icon={AtSign}
                label="Username"
                value={targetUser.username ? `@${targetUser.username}` : ""}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={targetUser.phone}
                href={
                  targetUser.phone
                    ? `tel:${String(targetUser.phone).replace(/\s/g, "")}`
                    : ""
                }
              />
              <InfoRow icon={Users} label="Gender" value={targetUser.gender} />
              <InfoRow
                icon={Cake}
                label="Birthday"
                value={birthday}
                hint={birthdayHint(bdayDays)}
              />
              {age !== null && (
                <InfoRow
                  icon={CalendarDays}
                  label="Age"
                  value={`${age} years`}
                />
              )}
              {location && (
                <InfoRow icon={MapPin} label="Location" value={location} />
              )}
              <InfoRow icon={Clock} label="Local time" value={localTime} />
              {website && (
                <InfoRow
                  icon={Globe}
                  label="Website"
                  value={websiteLabel}
                  href={website}
                />
              )}
              <InfoRow
                icon={History}
                label={isOnlineActive ? "Active" : "Last active"}
                value={
                  isOnlineActive
                    ? "Now"
                    : isOnlineRestricted ||
                        isBlocked ||
                        !userLastSeenTimestamp ||
                        targetUser.isLastSeenRestricted
                      ? "Unavailable"
                      : formatLastSeenTimestamp(userLastSeenTimestamp)?.replace(
                          /^Last seen /,
                          "",
                        ) || "Unavailable"
                }
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
          </Section>

          {/* ========================================================= */}
          {/* SECTION E: SHARED MEDIA & LINKS                           */}
          {/* ========================================================= */}
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
                            <p className="truncate text-sm font-medium">
                              {host}
                            </p>
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
          title={`Block ${targetUser.fullName}?`}
          message="You won't be able to exchange messages or make calls with this person until you unblock them."
          confirmLabel="Block"
          loading={pending === "block"}
          onConfirm={performBlockToggle}
          onCancel={() => setShowBlockModal(false)}
        />

        <ProfileImageViewer
          isOpen={viewAvatar}
          onClose={() => setViewAvatar(false)}
          userId={selectedId}
          user={targetUser}
          imageUrl={rawAvatarUrl}
        />
      </aside>
    </>
  );
};

export default UserInfoPanel;
