import { AnimatePresence, MotionConfig } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Info,
  LogOut,
  MapPin,
  Phone,
  Settings2,
  Video,
  X,
} from "lucide-react";
import {
  ChatHeaderContainer,
  ChatHeaderLeft,
  ChatHeaderBackButton,
  ChatHeaderAvatar,
  ChatHeaderIdentity,
  ChatHeaderActions,
  ChatHeaderActionButton,
} from "../Chat/Common/ChatHeaderPrimitives.jsx";
import ChatHeaderActionsMenu from "../Chat/Common/ChatHeaderActionsMenu.jsx";

const GroupChatHeader = ({
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
  onOpenLocation,
  isArchived = false,
  onArchive,
  onLeaveGroup,
}) => {
  if (!group) return null;

  const rawAvatar = group.avatar
    ? typeof avatarSrc === "function"
      ? avatarSrc(group.avatar)
      : group.avatar
    : "";

  const memberCount = group.members?.length || 0;
  const isTyping = Boolean(typingText);

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
          id: "location",
          label: "Share location",
          icon: MapPin,
          onClick: onOpenLocation,
        },
      ].filter(Boolean),
    },
    {
      title: "Group Management",
      items: [
        onArchive && {
          id: "archive",
          label: isArchived ? "Unarchive group" : "Archive group",
          icon: isArchived ? ArchiveRestore : Archive,
          onClick: onArchive,
        },
        onLeaveGroup && {
          id: "leave",
          label: "Exit group",
          icon: LogOut,
          danger: true,
          onClick: onLeaveGroup,
        },
        {
          id: "close",
          label: "Close chat",
          icon: X,
          danger: true,
          onClick: closeGroup,
        },
      ].filter(Boolean),
    },
  ];

  const renderSubtitle = () => {
    if (isTyping) {
      return (
        <span className="text-primary font-medium text-[11px] sm:text-xs truncate block">
          {typingText}
        </span>
      );
    }

    return (
      <span className="text-base-content/60 text-[11px] sm:text-xs truncate block">
        {memberCount} {memberCount === 1 ? "member" : "members"} ·{" "}
        <span className={onlineCount > 0 ? "text-success font-medium" : ""}>
          {onlineCount} online
        </span>
      </span>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <ChatHeaderContainer key={group.id}>
        {/* Left Section: Back Button + Group Avatar + Group Name & Members */}
        <ChatHeaderLeft>
          <ChatHeaderBackButton
            onClick={closeGroup}
            label="Back to conversations"
          />

          <ChatHeaderAvatar
            src={rawAvatar}
            name={group.name}
            showOnlineBadge={onlineCount > 0}
            showRing={hasActiveGroupCall || isTyping}
            isTyping={isTyping}
            onClick={onToggleInfo}
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

        {/* Right Section: Calling Actions + Unified Three-Dot (⋮) Menu */}
        <ChatHeaderActions>
          <ChatHeaderActionButton
            icon={Phone}
            label={
              hasActiveGroupCall
                ? "A call is already running"
                : "Group voice call"
            }
            onClick={() => startGroupCall?.(group.id, "audio", group.name)}
            disabled={callBlocked}
          />

          <ChatHeaderActionButton
            icon={Video}
            label={
              hasActiveGroupCall
                ? "A call is already running"
                : "Group video call"
            }
            onClick={() => startGroupCall?.(group.id, "video", group.name)}
            disabled={callBlocked}
          />

          <ChatHeaderActionsMenu
            sections={groupMenuSections}
            buttonLabel="More group options"
          />
        </ChatHeaderActions>
      </ChatHeaderContainer>
    </MotionConfig>
  );
};

export default GroupChatHeader;
