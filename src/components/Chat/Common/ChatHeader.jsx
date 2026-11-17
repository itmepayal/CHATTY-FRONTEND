import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Clock,
  EyeOff,
  Flag,
  Info,
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
  onOpenSearch,
  scheduledCount = 0,
  onOpenScheduled,
  disappearAfter = 0,
  disappearLabel = "",
  onOpenDisappearing,
  showLocation = true,
  isSharingLive = false,
  onOpenLocation,
  isArchived = false,
  onArchive,
  onReport,
}) => {
  const { selectedUser, setSelectedUser, typingFrom } = useChatStore();
  const hiddenUsers = useAuthStore((st) => st.hiddenUsers);
  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);

  const { startCall, status: callStatus } = useCall();
  const [viewAvatar, setViewAvatar] = useState(false);

  const {
    text: lastSeenText,
    isOnline,
    isLoading: isPresenceLoading,
  } = useLastSeen(selectedUser?.id);

  // Close photo viewer when the chat changes
  useEffect(() => {
    setViewAvatar(false);
  }, [selectedUser?.id]);

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
  const callPeer = { id: selectedUser.id, fullName: selectedUser.fullName };
  const canCall = callStatus === "idle" && !selectedUser.isBlocked;

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
        onOpenSearch && {
          id: "search",
          label: "Search in conversation",
          icon: Search,
          badge: "Ctrl K",
          onClick: onOpenSearch,
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
        showLocation && onOpenLocation && {
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

  return (
    <MotionConfig reducedMotion="user">
      <ChatHeaderContainer key={uid}>
        {/* Left Section: Back Button + Avatar + Name & Status */}
        <ChatHeaderLeft>
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
            isEncrypted={true}
            onClick={onToggleInfo}
          >
            <AnimatePresence mode="wait" initial={false}>
              {renderSubtitle()}
            </AnimatePresence>
          </ChatHeaderIdentity>
        </ChatHeaderLeft>

        {/* Right Section: Calling Actions + Unified Three-Dot (⋮) Menu */}
        <ChatHeaderActions>
          <ChatHeaderActionButton
            icon={Phone}
            label="Voice call"
            onClick={() => startCall(callPeer, "audio")}
            disabled={!canCall}
          />

          <ChatHeaderActionButton
            icon={Video}
            label="Video call"
            onClick={() => startCall(callPeer, "video")}
            disabled={!canCall}
          />

          <ChatHeaderActionsMenu
            sections={menuSections}
            buttonLabel="More conversation options"
          />
        </ChatHeaderActions>
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
