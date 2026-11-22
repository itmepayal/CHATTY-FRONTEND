import { useEffect, useState, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Clock,
  Info,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  Pin,
  Search,
  Settings2,
  Video,
  X,
} from "lucide-react";
import ProfileImageViewer from "../Chat/Common/ProfileImageViewer.jsx";
import ChatHeaderActionsMenu from "../Chat/Common/ChatHeaderActionsMenu.jsx";
import {
  ChatHeaderContainer,
  ChatHeaderLeft,
  ChatHeaderBackButton,
  ChatHeaderAvatar,
  ChatHeaderIdentity,
  ChatHeaderActions,
  ChatHeaderActionButton,
} from "../Chat/Common/ChatHeaderPrimitives.jsx";

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

export const GroupChatHeader = ({
  group,
  onlineCount = 0,
  typingText = "",
  onToggleInfo,
  onManage,
  closeGroup,
  startGroupCall,
  hasActiveGroupCall = false,
  callBlocked = false,
  avatarSrc,
  // Search props
  searchOpen = false,
  setSearchOpen,
  searchQ = "",
  setSearchQ,
  searching = false,
  // Scheduled props
  scheduledCount = 0,
  onOpenScheduled,
  // Pinned props
  pinnedCount = 0,
  onOpenPinned,
  // Location props
  isSharingLive = false,
  onOpenLocation,
  // Management props
  isArchived = false,
  onArchive,
  onLeaveGroup,
  onOpenDisappearing,
}) => {
  const [viewAvatar, setViewAvatar] = useState(false);
  const searchInputRef = useRef(null);

  // Close photo viewer when group changes
  useEffect(() => {
    setViewAvatar(false);
  }, [group?.id]);

  // Global Ctrl/Cmd + K shortcut to toggle/focus search in group header
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

  if (!group) return null;

  const rawAvatar = group.avatar
    ? typeof avatarSrc === "function"
      ? avatarSrc(group.avatar)
      : group.avatar
    : "";
  const hasAvatar = Boolean(rawAvatar);

  const memberCount = group.members?.length || 0;
  const isTyping = Boolean(typingText);

  const showRing = hasActiveGroupCall || isTyping;
  const hasActiveIndicator = scheduledCount > 0 || isSharingLive;

  // Categorized Three-Dot Menu Action Groups
  const groupMenuSections = [
    {
      title: "Group Information",
      items: [
        onToggleInfo && {
          id: "group-info",
          label: "Group info",
          icon: Info,
          onClick: onToggleInfo,
        },
        setSearchOpen && {
          id: "group-search",
          label: "Search in conversation",
          icon: Search,
          badge: "Ctrl K",
          onClick: () => setSearchOpen(true),
        },
        onOpenPinned && {
          id: "group-pinned",
          label: `Pinned messages${pinnedCount > 0 ? ` (${pinnedCount})` : ""}`,
          icon: Pin,
          onClick: onOpenPinned,
        },
        onManage && {
          id: "group-manage",
          label: "Manage group",
          icon: Settings2,
          onClick: onManage,
        },
      ].filter(Boolean),
    },
    {
      title: "Communication",
      items: [
        {
          id: "gcall-voice",
          label: "Group voice call",
          icon: Phone,
          onClick: () => startGroupCall?.(group.id, "audio", group.name),
          disabled: callBlocked,
        },
        {
          id: "gcall-video",
          label: "Group video call",
          icon: Video,
          onClick: () => startGroupCall?.(group.id, "video", group.name),
          disabled: callBlocked,
        },
      ],
    },
    {
      title: "Sharing & Tools",
      items: [
        onOpenLocation && {
          id: "group-location",
          label: isSharingLive ? "Sharing live location" : "Share location",
          icon: MapPin,
          live: isSharingLive,
          onClick: onOpenLocation,
        },
        onOpenScheduled && {
          id: "group-scheduled",
          label: "Scheduled messages",
          icon: Clock,
          count: scheduledCount > 0 ? scheduledCount : null,
          onClick: onOpenScheduled,
        },
        onOpenDisappearing && {
          id: "group-disappearing",
          label: "Disappearing messages",
          icon: Clock,
          badge: group?.disappearAfter ? `${Math.round(group.disappearAfter / 86400)}d` : null,
          onClick: onOpenDisappearing,
        },
      ].filter(Boolean),
    },
    {
      title: "Group Management",
      items: [
        onArchive && {
          id: "group-archive",
          label: isArchived ? "Unarchive group" : "Archive group",
          icon: isArchived ? ArchiveRestore : Archive,
          onClick: onArchive,
        },
        onLeaveGroup && {
          id: "group-leave",
          label: "Exit group",
          icon: LogOut,
          danger: true,
          onClick: onLeaveGroup,
        },
        {
          id: "group-close",
          label: "Close chat",
          icon: X,
          danger: true,
          onClick: closeGroup,
        },
      ].filter(Boolean),
    },
  ];

  // Render Subtitle / Status content
  const renderSubtitle = () => {
    if (isTyping) {
      return (
        <span className="inline-flex items-center gap-1.5 text-primary font-medium text-[11px] sm:text-xs">
          <TypingDots />
          <span className="truncate">{typingText}</span>
        </span>
      );
    }

    return (
      <span className="text-base-content/60 text-[11px] sm:text-xs truncate block">
        {memberCount} {memberCount === 1 ? "member" : "members"}
        {onlineCount > 0 ? (
          <>
            {" "}·{" "}
            <span className="text-success font-medium">
              {onlineCount} online
            </span>
          </>
        ) : null}
      </span>
    );
  };

  const closeSearch = () => {
    setSearchOpen?.(false);
    setSearchQ?.("");
  };

  return (
    <MotionConfig reducedMotion="user">
      <ChatHeaderContainer key={group.id} className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            /* =======================================================
             *  INLINE SEARCH MODE (takes full row, no second toolbar!)
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
                  placeholder="Search in group conversation…"
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
              {/* Left Section: Back Button + Group Avatar + Group Name & Members */}
              <ChatHeaderLeft className="min-w-0 flex-1">
                <ChatHeaderBackButton
                  onClick={closeGroup}
                  label="Back to conversations"
                />

                <ChatHeaderAvatar
                  src={rawAvatar}
                  name={group.name}
                  showOnlineBadge={onlineCount > 0}
                  showRing={showRing}
                  isTyping={isTyping}
                  onClick={hasAvatar ? () => setViewAvatar(true) : onToggleInfo}
                  layoutId={`group-avatar-${group.id}`}
                />

                <ChatHeaderIdentity
                  name={group.name}
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
                    label="Search in group conversation (Ctrl+K)"
                    onClick={() => setSearchOpen(true)}
                  />
                )}

                {/* Group Voice Call */}
                <ChatHeaderActionButton
                  icon={Phone}
                  label={
                    hasActiveGroupCall
                      ? "A call is already running"
                      : "Group voice call"
                  }
                  onClick={() => startGroupCall?.(group.id, "audio", group.name)}
                  disabled={callBlocked}
                  className="flex"
                />

                {/* Group Info */}
                {onToggleInfo && (
                  <ChatHeaderActionButton
                    icon={Info}
                    label="Group info"
                    onClick={onToggleInfo}
                    className="hidden md:flex"
                  />
                )}

                {/* Three-Dot "More" Menu (always visible, portal-based fixed dropdown) */}
                <ChatHeaderActionsMenu
                  sections={groupMenuSections}
                  buttonLabel="More group options"
                  hasActiveIndicator={hasActiveIndicator}
                />
              </ChatHeaderActions>
            </motion.div>
          )}
        </AnimatePresence>
      </ChatHeaderContainer>

      {hasAvatar && (
        <ProfileImageViewer
          isOpen={viewAvatar}
          onClose={() => setViewAvatar(false)}
          imageUrl={rawAvatar}
          name={group.name}
        />
      )}
    </MotionConfig>
  );
};

export default GroupChatHeader;
