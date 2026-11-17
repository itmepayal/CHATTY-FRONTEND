import {
  Ban,
  ImageIcon,
  MessageSquare,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";
import { ActionButton, Stat } from "./UserInfoUI.jsx";

export const UserInfoProfileHeader = ({
  targetUser,
  showPhoto,
  rawAvatarUrl,
  initials,
  isBlocked,
  isOnlineActive,
  presenceStatusText,
  isPresenceLoading,
  unreadCount,
  visibleMessagesCount,
  photosCount,
  favorite,
  canCall,
  pending,
  showBlockModal,
  setViewAvatar,
  setImgError,
  onMessageFocus,
  onAudioCall,
  onVideoCall,
  onSearchMessages,
  onFavorite,
  onBlock,
}) => {
  return (
    <>
      {/* SECTION A: PROFILE HEADER */}
      <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (showPhoto) setViewAvatar(true);
            }}
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
            {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
          </span>
        )}
      </div>

      {/* SECTION B: CONTACT ACTIONS */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <ActionButton
            icon={MessageSquare}
            label="Message"
            onClick={onMessageFocus}
          />
          <ActionButton
            icon={Phone}
            label="Audio"
            disabled={!canCall}
            onClick={onAudioCall}
          />
          <ActionButton
            icon={Video}
            label="Video"
            disabled={!canCall}
            onClick={onVideoCall}
          />
          <ActionButton
            icon={Search}
            label="Search"
            onClick={onSearchMessages}
          />
          <ActionButton
            icon={Star}
            label={favorite ? "Favorited" : "Favorite"}
            active={favorite}
            filled
            loading={pending === "favorite"}
            onClick={onFavorite}
          />
          <ActionButton
            icon={isBlocked ? ShieldCheck : Ban}
            label={isBlocked ? "Unblock" : "Block"}
            active={isBlocked}
            danger
            loading={pending === "block" && !showBlockModal}
            onClick={onBlock}
          />
        </div>
      </div>

      {/* Statistics summary */}
      <div className="flex gap-2 px-5 pb-4">
        <Stat
          icon={MessageSquareText}
          value={visibleMessagesCount}
          label="Messages"
        />
        <Stat icon={ImageIcon} value={photosCount} label="Photos" />
      </div>
    </>
  );
};
