import { useEffect, useState, useMemo } from "react";
import { Info, PanelRightOpen, X, Bell, BellOff, Search } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { usePrivacyStore } from "../../store/usePrivacyStore";
import { useCall } from "../../context/CallContext";
import { useLastSeen } from "../../hooks/useLastSeen.js";
import { formatLastSeenTimestamp } from "../../lib/lastSeen";
import ProfileImageViewer from "./Common/ProfileImageViewer.jsx";

import {
  parseDate,
  formatDate,
  calcAge,
  daysUntilBirthday,
  birthdayHint,
  localTimeIn,
  prettyLink,
  toIds,
  getAvatar,
  previewLastMessage,
} from "./userInfo/UserInfoHelpers.js";

import { ConfirmModal } from "./userInfo/UserInfoUI.jsx";
import { UserInfoProfileHeader } from "./userInfo/UserInfoProfileHeader.jsx";
import { UserInfoOverviewSection } from "./userInfo/UserInfoOverviewSection.jsx";
import { UserInfoPrivacySection } from "./userInfo/UserInfoPrivacySection.jsx";
import { UserInfoSharedSection } from "./userInfo/UserInfoSharedSection.jsx";

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

const UserInfoPanel = ({ open, onToggle, hasActiveThread = false }) => {
  const { selectedUser, users, messages } = useChatStore();
  const selectedId = selectedUser
    ? String(selectedUser.id ?? selectedUser._id)
    : null;

  const {
    hiddenUsers,
    authUser,
    blockUser,
    unblockUser,
    toggleFavorite,
    fetchCurrentUser,
  } = useAuthStore();
  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);
  const lockedChats = usePrivacyStore((s) => s.privacy.lockedChats || []);
  const isChatLocked = selectedId
    ? lockedChats.map(String).includes(selectedId)
    : false;
  const { startCall, status: callStatus } = useCall();

  const [pending, setPending] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [viewAvatar, setViewAvatar] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const {
    text: lastSeenText,
    isOnline: isUserOnline,
    timestamp: userLastSeenTimestamp,
    isLoading: isPresenceLoading,
  } = useLastSeen(selectedId);

  // Sync profile details whenever selectedUser changes or when privacy/profile updates
  useEffect(() => {
    if (!selectedId) return;
    setImgError(false);
    useChatStore.getState().fetchUserProfile(selectedId);

    const handler = (e) => {
      if (String(e.detail?.userId) === String(selectedId)) {
        setImgError(false);
        useChatStore.getState().fetchUserProfile(selectedId);
      }
    };
    window.addEventListener("chatty:profile-updated", handler);
    return () => window.removeEventListener("chatty:profile-updated", handler);
  }, [selectedId]);

  useEffect(() => {
    setShowBlockModal(false);
  }, [selectedId]);

  useEffect(() => {
    if (open && selectedId) {
      usePrivacyStore.getState().fetchPrivacy?.();
    }
  }, [open, selectedId]);

  useEffect(() => {
    setImgError(false);
  }, [selectedUser?.avatar, selectedUser?.isPhotoRestricted]);

  // Always use the store's latest authorized user object as single source of truth
  const targetUser = selectedUser || {};

  if (!selectedUser) return null;

  if (!open) return null;

  /* ----- derived data & privacy computations ----- */
  const list = Array.isArray(messages) ? messages : [];
  const visible = list.filter((m) => !m.isDeleted);
  const photos = visible.filter((m) => m.image?.url);
  const recentPhotos = photos.slice(-6).reverse();

  const docs = visible.filter((m) => m.file?.url);
  const recentDocs = docs.slice(-6).reverse();

  const allLinks = [];
  for (const m of visible) {
    const found = m.text?.match(URL_RE);
    if (found) allLinks.push(...found);
  }
  const uniqueLinks = [...new Set(allLinks.reverse())];
  const recentLinks = uniqueLinks.slice(0, 5).map((url) => {
    const { host, rest } = prettyLink(url);
    return { url, host, rest };
  });

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

  const handleFavorite = async (e) => {
    e?.stopPropagation?.();
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

  const handleBlock = (e) => {
    e?.stopPropagation?.();
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

  const handleAudioCall = (e) => {
    e?.stopPropagation?.();
    if (canCall) startCall(callPeer, "audio");
  };

  const handleVideoCall = (e) => {
    e?.stopPropagation?.();
    if (canCall) startCall(callPeer, "video");
  };

  const handleMessageFocus = (e) => {
    e?.stopPropagation?.();
    if (window.innerWidth < 1280) onToggle();
    const input = document.querySelector(
      'textarea, input[placeholder*="Type a message"], input[placeholder*="Type here"]',
    );
    input?.focus();
  };

  const handleSearchMessages = (e) => {
    e?.stopPropagation?.();
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
  const formattedLastSeen = formatLastSeenTimestamp(userLastSeenTimestamp);

  return (
    <>
      {/* Mobile & Tablet Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] xl:hidden transition-opacity"
        onClick={onToggle}
        aria-hidden="true"
      />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm sm:w-[340px] md:w-[360px] flex-col border-l border-base-300 bg-base-100 shadow-2xl transition-all duration-200 xl:relative xl:z-auto xl:w-[320px] 2xl:w-[340px] xl:shrink-0 xl:max-w-none xl:shadow-none min-h-0 h-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex h-13 sm:h-14 shrink-0 items-center justify-between px-4 sm:px-5 border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-base text-base-content/90">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200/80 text-base-content/60">
              <Info className="size-4.5" />
            </span>
            <span>Contact info</span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
            aria-label="Close contact info"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* SECTION A & B: PROFILE HEADER & ACTIONS */}
          <UserInfoProfileHeader
            targetUser={targetUser}
            showPhoto={showPhoto}
            rawAvatarUrl={rawAvatarUrl}
            initials={initials}
            isBlocked={isBlocked}
            isOnlineActive={isOnlineActive}
            presenceStatusText={presenceStatusText}
            isPresenceLoading={isPresenceLoading}
            unreadCount={unreadCount}
            visibleMessagesCount={visible.length}
            photosCount={photos.length}
            favorite={favorite}
            canCall={canCall}
            pending={pending}
            showBlockModal={showBlockModal}
            setViewAvatar={setViewAvatar}
            setImgError={setImgError}
            onMessageFocus={handleMessageFocus}
            onAudioCall={handleAudioCall}
            onVideoCall={handleVideoCall}
            onSearchMessages={handleSearchMessages}
            onFavorite={handleFavorite}
            onBlock={handleBlock}
          />

          <div className="border-t border-base-300" />

          {/* SECTION C & D: PERSONAL INFORMATION & DETAILS OVERVIEW */}
          <UserInfoOverviewSection
            targetUser={targetUser}
            isAboutRestricted={isAboutRestricted}
            birthday={birthday}
            birthdayHintText={birthdayHint(bdayDays)}
            age={age}
            location={location}
            localTime={localTime}
            website={website}
            websiteLabel={websiteLabel}
            isOnlineActive={isOnlineActive}
            isBlocked={isBlocked}
            userLastSeenTimestamp={userLastSeenTimestamp}
            formattedLastSeen={formattedLastSeen}
            lastMessagePreview={lastMessagePreview}
            chattingSince={chattingSince}
            memberSince={memberSince}
          />

          <div className="border-t border-base-300" />

          {/* Privacy & Security Section with Lock Conversation */}
          <UserInfoPrivacySection selectedId={selectedId} />

          {/* Notifications & Search Controls */}
          <div className="border-t border-base-300" />
          <div className="px-5 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BellOff className="size-4 text-base-content/60" />
                <div>
                  <p className="text-xs font-semibold text-base-content">
                    Mute notifications
                  </p>
                  <p className="text-[10px] text-base-content/50">
                    Silence alerts for this chat
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(targetUser.isMuted)}
                onChange={() =>
                  useChatStore
                    .getState()
                    .toggleMuteChat(selectedId, !targetUser.isMuted)
                }
                className="toggle toggle-primary toggle-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleSearchMessages}
              className="flex items-center justify-between w-full py-1 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="size-4 text-base-content/60 group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-xs font-semibold text-base-content group-hover:text-primary transition-colors">
                    Search in conversation
                  </p>
                  <p className="text-[10px] text-base-content/50">
                    Find messages, media and links
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* SECTION E: SHARED MEDIA & LINKS */}
          <UserInfoSharedSection
            recentPhotos={recentPhotos}
            photosCount={photos.length}
            recentDocs={recentDocs}
            docsCount={docs.length}
            recentLinks={recentLinks}
            uniqueLinksCount={uniqueLinks.length}
          />
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
          isOpen={viewAvatar && showPhoto}
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
