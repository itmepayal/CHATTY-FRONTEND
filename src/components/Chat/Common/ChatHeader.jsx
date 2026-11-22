import { useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Clock,
  EyeOff,
  Flag,
  Info,
  Loader2,
  MapPin,
  Phone,
  Search,
  Timer,
  Video,
  X,
} from "lucide-react";
import { useChatStore } from "../../../store/useChatStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { usePrivacyStore } from "../../../store/usePrivacyStore";
import { useContactStore } from "../../../store/useContactStore";
import { useCall } from "../../../context/CallContext";
import { useLastSeen } from "../../../hooks/useLastSeen.js";
import ProfileImageViewer from "./ProfileImageViewer.jsx";
import ChatHeaderActionsMenu from "./ChatHeaderActionsMenu.jsx";
import {
  ChatHeaderContainer,
  ChatHeaderLeft,
  ChatHeaderBackButton,
  ChatHeaderAvatar,
  ChatHeaderIdentity,
  ChatHeaderActions,
  ChatHeaderActionButton,
} from "./ChatHeaderPrimitives.jsx";

const TypingDots = () => (
  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1 rounded-full bg-primary"
        animate={{ y: [0, -2.5, 0], opacity: [0.4, 1, 0.4] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.14,
        }}
      />
    ))}
  </span>
);

export const ChatHeader = ({
  onToggleInfo,
  // Search props
  searchOpen = false,
  setSearchOpen,
  searchQ = "",
  setSearchQ,
  searching = false,
  // Scheduled props
  scheduledCount = 0,
  onOpenScheduled,
  // Disappearing props
  disappearAfter = 0,
  disappearLabel = "",
  onOpenDisappearing,
  // Location props
  showLocation = true,
  isSharingLive = false,
  onOpenLocation,
  // Management props
  isArchived = false,
  onArchive,
  onReport,
}) => {
  const { selectedUser, setSelectedUser, typingFrom } = useChatStore();
  const hiddenUsers = useAuthStore((st) => st.hiddenUsers);
  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);

  const { startCall, status: callStatus } = useCall();
  const [viewAvatar, setViewAvatar] = useState(false);
  const searchInputRef = useRef(null);

  const {
    text: lastSeenText,
    isOnline,
    isLoading: isPresenceLoading,
  } = useLastSeen(selectedUser?.id);

  // Close photo viewer when chat changes
  useEffect(() => {
    setViewAvatar(false);
  }, [selectedUser?.id]);

  // Global Ctrl/Cmd + K shortcut to toggle/focus search in header
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen?.((prev) => !prev);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen?.(false);
        setSearchQ?.("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen, setSearchQ]);

  // Auto-focus search input when search opens
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Escape key closes photo viewer
  useEffect(() => {
    if (!viewAvatar) return;
    const onKey = (e) => e.key === "Escape" && setViewAvatar(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewAvatar]);

  // Refetch profile on update event
  useEffect(() => {
    if (!selectedUser?.id) return;
    useChatStore.getState().fetchUserProfile(selectedUser.id);

    const handler = (e) => {
      if (String(e.detail?.userId) === String(selectedUser.id)) {
        useChatStore.getState().fetchUserProfile(selectedUser.id);
      }
    };
    window.addEventListener("chatty:profile-updated", handler);
    return () => window.removeEventListener("chatty:profile-updated", handler);
  }, [selectedUser?.id]);

  if (!selectedUser) return null;

  const uid = String(selectedUser.id);
  const isPhotoRestricted = Boolean(selectedUser.isPhotoRestricted);
  const rawAvatar =
    typeof selectedUser.avatar === "string"
      ? selectedUser.avatar
      : selectedUser.avatar?.url || "";
  const hasAvatar = !isPhotoRestricted && Boolean(rawAvatar);
  const avatar = hasAvatar ? rawAvatar : "/avatar.png";

  const theirOnlineHidden =
    hiddenUsers.includes(uid) || Boolean(selectedUser.isOnlineRestricted);
  const onlineHidden = theirOnlineHidden || !myStatusVisible;
  const isTyping = Boolean(typingFrom?.[uid]);
  const canShowOnline = isOnline && !onlineHidden;

  const showRing = canShowOnline || isTyping;

  // Calling helpers
  const contacts = useContactStore((st) => st.contacts);
  const isContact = contacts.some(
    (c) => String(c.id || c._id) === String(selectedUser.id),
  );
  const callPeer = { id: selectedUser.id, fullName: selectedUser.fullName };
  const canCall =
    callStatus === "idle" && !selectedUser.isBlocked && isContact;

  // Has any active policy
  const hasActiveIndicator =
    scheduledCount > 0 || disappearAfter > 0 || isSharingLive;

  // Categorized Three-Dot Menu Action Groups
  const menuSections = [
    {
      title: "Chat Information",
      items: [
        onToggleInfo && {
          id: "info",
          label: "Contact info",
          icon: Info,
          onClick: onToggleInfo,
        },
        setSearchOpen && {
          id: "search",
          label: "Search in conversation",
          icon: Search,
          badge: "Ctrl K",
          onClick: () => setSearchOpen(true),
        },
        onOpenDisappearing && {
          id: "disappearing",
          label: "Disappearing messages",
          icon: Timer,
          badge: disappearAfter > 0 ? disappearLabel : null,
          onClick: onOpenDisappearing,
        },
      ].filter(Boolean),
    },
    {
      title: "Communication",
      items: [
        {
          id: "voice-call",
          label: "Voice call",
          icon: Phone,
          onClick: () => startCall(callPeer, "audio"),
          disabled: !canCall,
        },
        {
          id: "video-call",
          label: "Video call",
          icon: Video,
          onClick: () => startCall(callPeer, "video"),
          disabled: !canCall,
        },
      ],
    },
    {
      title: "Sharing & Scheduling",
      items: [
        showLocation &&
          onOpenLocation && {
            id: "location",
            label: isSharingLive ? "Sharing live location" : "Share location",
            icon: MapPin,
            live: isSharingLive,
            onClick: onOpenLocation,
          },
        onOpenScheduled && {
          id: "scheduled",
          label: "Scheduled messages",
          icon: Clock,
          count: scheduledCount > 0 ? scheduledCount : null,
          onClick: onOpenScheduled,
        },
      ].filter(Boolean),
    },
    {
      title: "Conversation Management",
      items: [
        onArchive && {
          id: "archive",
          label: isArchived ? "Unarchive chat" : "Archive chat",
          icon: isArchived ? ArchiveRestore : Archive,
          onClick: onArchive,
        },
        onReport && {
          id: "report",
          label: "Report contact",
          icon: Flag,
          danger: true,
          onClick: onReport,
        },
        {
          id: "close",
          label: "Close conversation",
          icon: X,
          danger: true,
          onClick: () => setSelectedUser(null),
        },
      ].filter(Boolean),
    },
  ];

  // Render Subtitle / Status content
  const renderSubtitle = () => {
    if (!isContact) {
      return (
        <span className="inline-flex items-center gap-1 text-base-content/50 font-medium text-[11px] sm:text-xs">
          <span>Not connected</span>
        </span>
      );
    }

    if (isTyping) {
      return (
        <span className="inline-flex items-center gap-1.5 text-primary font-medium text-[11px] sm:text-xs">
          <TypingDots />
          <span>typing...</span>
        </span>
      );
    }

    if (canShowOnline) {
      return (
        <span className="inline-flex items-center gap-1 text-success font-medium text-[11px] sm:text-xs">
          <span className="size-1.5 rounded-full bg-success animate-pulse inline-block" />
          <span>Online</span>
        </span>
      );
    }

    if (selectedUser.isLastSeenRestricted || onlineHidden) {
      return (
        <span className="inline-flex items-center gap-1 text-base-content/50 text-[11px] sm:text-xs">
          <EyeOff className="size-3 shrink-0" />
          <span>Status unavailable</span>
        </span>
      );
    }

    if (isPresenceLoading && !lastSeenText) {
      return (
        <span className="inline-block h-2.5 w-16 animate-pulse rounded bg-base-content/20" />
      );
    }

    return (
      <span className="text-base-content/60 text-[11px] sm:text-xs truncate block">
        {lastSeenText || "Offline"}
      </span>
    );
  };

  const closeSearch = () => {
    setSearchOpen?.(false);
    setSearchQ?.("");
  };

  return (
    <MotionConfig reducedMotion="user">
      <ChatHeaderContainer key={uid} className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            /* =======================================================
             *  INLINE SEARCH MODE (takes full row, no second navbar!)
             * ======================================================= */
            <motion.div
              key="header-search-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex items-center gap-2 w-full min-w-0"
            >
              {/* Back / Exit Search Button */}
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                title="Close search (Esc)"
                className="btn btn-ghost btn-circle btn-sm shrink-0 size-8 sm:size-9 min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] text-base-content/70 hover:text-base-content hover:bg-base-200/80 cursor-pointer"
              >
                <ArrowLeft className="size-4 sm:size-4.5" />
              </button>

              {/* Integrated Search Input Container */}
              <div className="flex-1 min-w-0 relative flex items-center h-9 sm:h-10 rounded-xl border border-primary/30 bg-base-200/60 focus-within:bg-base-100 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Search className="size-4 ml-3 text-primary shrink-0 pointer-events-none" />

                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ?.(e.target.value)}
                  placeholder="Search in conversation…"
                  className="w-full min-w-0 bg-transparent px-2.5 py-1 text-xs sm:text-sm text-base-content placeholder:text-base-content/40 outline-none"
                />

                <div className="flex items-center shrink-0 pr-2 gap-1">
                  {searching ? (
                    <Loader2 className="size-3.5 text-base-content/40 animate-spin" />
                  ) : searchQ ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQ?.("");
                        searchInputRef.current?.focus();
                      }}
                      className="size-5 rounded-full hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content cursor-pointer transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}

                  <span className="hidden sm:inline-block rounded-md bg-base-300/60 px-1.5 py-0.5 text-[10px] font-mono text-base-content/50">
                    Esc
                  </span>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={closeSearch}
                className="btn btn-ghost btn-sm px-2.5 sm:px-3 text-xs sm:text-sm text-base-content/70 hover:text-base-content shrink-0 rounded-xl"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            /* =======================================================
             *  NORMAL HEADER MODE (Identity + Active Chips + Actions)
             * ======================================================= */
            <motion.div
              key="header-normal-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-3"
            >
              {/* Left Section: Back Button + Avatar + Name & Status */}
              <ChatHeaderLeft className="min-w-0 flex-1">
                <ChatHeaderBackButton
                  onClick={() => setSelectedUser(null)}
                  label="Back to conversations"
                />

                <ChatHeaderAvatar
                  src={avatar}
                  name={selectedUser.fullName}
                  showOnlineBadge={canShowOnline}
                  showRing={showRing}
                  isTyping={isTyping}
                  onClick={hasAvatar ? () => setViewAvatar(true) : undefined}
                  layoutId={`chat-avatar-${uid}`}
                />

                <ChatHeaderIdentity
                  name={selectedUser.fullName}
                  badge={selectedUser.featuredBadge}
                  isEncrypted={true}
                  onClick={onToggleInfo}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {renderSubtitle()}
                  </AnimatePresence>
                </ChatHeaderIdentity>
              </ChatHeaderLeft>

              {/* Middle Section: Quick Status Indicators (Desktop / Tablet) */}
              <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                {scheduledCount > 0 && onOpenScheduled && (
                  <button
                    type="button"
                    onClick={onOpenScheduled}
                    title="View scheduled messages"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors cursor-pointer"
                  >
                    <Clock className="size-3 text-primary shrink-0" />
                    <span>{scheduledCount} scheduled</span>
                  </button>
                )}

                {disappearAfter > 0 && onOpenDisappearing && (
                  <button
                    type="button"
                    onClick={onOpenDisappearing}
                    title={`Disappearing messages: ${disappearLabel}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/70 hover:bg-base-200 px-2.5 py-1 text-xs font-medium text-base-content/80 transition-colors cursor-pointer"
                  >
                    <Timer className="size-3 text-primary shrink-0" />
                    <span>{disappearLabel}</span>
                  </button>
                )}

                {isSharingLive && onOpenLocation && (
                  <button
                    type="button"
                    onClick={onOpenLocation}
                    title="You are sharing live location"
                    className="inline-flex items-center gap-1.5 rounded-full border border-error/30 bg-error/10 hover:bg-error/15 px-2.5 py-1 text-xs font-medium text-error transition-colors cursor-pointer"
                  >
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-error" />
                    </span>
                    <span>Live location</span>
                  </button>
                )}
              </div>

              {/* Right Section: Search + Calling Actions + Info + Three-Dot Menu */}
              <ChatHeaderActions>
                {/* Search Button (Ctrl+K) */}
                {setSearchOpen && (
                  <ChatHeaderActionButton
                    icon={Search}
                    label="Search in conversation (Ctrl+K)"
                    onClick={() => setSearchOpen(true)}
                  />
                )}

                {/* Voice Call */}
                <ChatHeaderActionButton
                  icon={Phone}
                  label="Voice call"
                  onClick={() => startCall(callPeer, "audio")}
                  disabled={!canCall}
                  className="flex"
                />

                {/* Contact Info */}
                {onToggleInfo && (
                  <ChatHeaderActionButton
                    icon={Info}
                    label="Contact info"
                    onClick={onToggleInfo}
                    className="hidden md:flex"
                  />
                )}

                {/* Three-Dot "More" Menu (always visible, portal-based fixed dropdown) */}
                <ChatHeaderActionsMenu
                  sections={menuSections}
                  buttonLabel="More conversation options"
                  hasActiveIndicator={hasActiveIndicator}
                />
              </ChatHeaderActions>
            </motion.div>
          )}
        </AnimatePresence>
      </ChatHeaderContainer>

      <ProfileImageViewer
        isOpen={viewAvatar && hasAvatar}
        onClose={() => setViewAvatar(false)}
        userId={selectedUser.id}
        user={selectedUser}
      />
    </MotionConfig>
  );
};

export default ChatHeader;
