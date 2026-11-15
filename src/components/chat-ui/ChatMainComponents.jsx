import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  X,
  Lock,
} from "lucide-react";
import { Avatar, IconButton, OnlineStatus } from "./ChatPrimitives";

/**
 * ChatMainPanel
 * Center conversation view wrapper ensuring symmetrical flex layout and viewport boundaries.
 */
export const ChatMainPanel = ({
  children,
  className = "",
}) => {
  return (
    <main
      className={`h-full min-w-0 flex-1 flex flex-col bg-base-100 relative overflow-hidden transition-all duration-200 ${className}`}
    >
      {children}
    </main>
  );
};

/**
 * ConversationHeader
 * Centralized, symmetrical header used by both Personal and Group chat conversations.
 * Ensures identical height (h-16), avatar placement, icon button sizing, and info toggle.
 */
export const ConversationHeader = ({
  avatar,
  name,
  isGroup = false,
  statusText,
  isOnline = false,
  isTyping = false,
  isEncrypted = true,
  onBack,
  onAvatarClick,
  onAudioCall,
  onVideoCall,
  canCall = true,
  onToggleInfo,
  onClose,
  actions,
  className = "",
}) => {
  return (
    <header
      className={`h-16 px-3 sm:px-4.5 flex items-center justify-between gap-2.5 border-b border-base-200/80 bg-base-100/90 backdrop-blur-md shrink-0 z-20 relative select-none ${className}`}
    >
      {/* Subtle glowing bottom border line */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Left: Back button + Avatar + Title & Status */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onBack && (
          <IconButton
            icon={ArrowLeft}
            label="Back to conversations"
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="lg:hidden -ml-1"
          />
        )}

        <div
          onClick={onAvatarClick}
          className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${
            onAvatarClick ? "cursor-pointer group" : ""
          }`}
        >
          <div className="relative shrink-0">
            <Avatar
              src={avatar}
              name={name}
              size="md"
              group={isGroup}
              online={isOnline}
              showStatus={!isGroup}
              className="group-hover:scale-105 transition-transform"
            />
          </div>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm sm:text-base text-base-content/95">
              <span className="truncate group-hover:text-primary transition-colors">
                {name}
              </span>
              {isEncrypted && (
                <Lock
                  className="size-3 shrink-0 text-base-content/40"
                  aria-label="End-to-end encrypted"
                  title="End-to-end encrypted"
                />
              )}
            </div>

            <div className="truncate text-xs text-base-content/55 mt-0.5 flex items-center gap-1.5">
              {isTyping ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  typing...
                </span>
              ) : (
                <span>{statusText || (isOnline ? "Online" : "Offline")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions (Call, Video, Custom Actions, Info Toggle, Close) */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {onAudioCall && (
          <IconButton
            icon={Phone}
            label="Voice call"
            title="Audio call"
            size="sm"
            variant="ghost"
            disabled={!canCall}
            onClick={onAudioCall}
          />
        )}

        {onVideoCall && (
          <IconButton
            icon={Video}
            label="Video call"
            title="Video call"
            size="sm"
            variant="ghost"
            disabled={!canCall}
            onClick={onVideoCall}
          />
        )}

        {actions}

        {onToggleInfo && (
          <IconButton
            icon={Info}
            label="Details & information"
            title="Conversation info"
            size="sm"
            variant="ghost"
            onClick={onToggleInfo}
          />
        )}

        {onClose && (
          <IconButton
            icon={X}
            label="Close chat"
            title="Close"
            size="sm"
            variant="ghost"
            danger
            onClick={onClose}
            className="hidden sm:inline-flex"
          />
        )}
      </div>
    </header>
  );
};

/**
 * MessageListContainer
 * Scroll container for message bubbles.
 */
export const MessageListContainer = forwardRef(function MessageListContainer(
  { children, className = "", onScroll },
  ref,
) {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={`flex-1 min-h-0 w-full overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 sm:space-y-4 ${className}`}
    >
      {children}
    </div>
  );
});

/**
 * DateDivider
 * Centered date divider between messages.
 */
export const DateDivider = ({ date, className = "" }) => {
  return (
    <div
      className={`flex items-center justify-center my-3 sm:my-4 select-none ${className}`}
    >
      <span className="rounded-full bg-base-200/80 px-3 py-1 text-[11px] font-semibold text-base-content/60 shadow-2xs border border-base-200">
        {date}
      </span>
    </div>
  );
};

/**
 * ComposerShell
 * Bottom container for the input composer.
 */
export const ComposerShell = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`px-3 py-2.5 sm:px-4 sm:py-3 border-t border-base-200/80 bg-base-100/90 backdrop-blur-md shrink-0 z-10 ${className}`}
    >
      {children}
    </div>
  );
};
