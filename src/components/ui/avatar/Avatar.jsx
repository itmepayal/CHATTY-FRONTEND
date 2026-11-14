import { useState } from "react";

const SIZES = {
  xs: "size-7 text-[10px]",
  sm: "size-8 sm:size-9 text-xs",
  md: "size-10 sm:size-11 text-sm",
  lg: "size-12 sm:size-14 text-base",
  xl: "size-16 sm:size-20 text-xl",
  "2xl": "size-24 sm:size-28 text-2xl",
};

const DOT_SIZES = {
  xs: "size-2 bottom-0 right-0",
  sm: "size-2.5 bottom-0 right-0",
  md: "size-3 bottom-0.5 right-0.5",
  lg: "size-3.5 bottom-0.5 right-0.5",
  xl: "size-4 bottom-1 right-1",
  "2xl": "size-5 bottom-1.5 right-1.5",
};

export const Avatar = ({
  src,
  name = "User",
  size = "md",
  online = false,
  showStatus = false,
  ring = false,
  ringColor = "ring-primary",
  className = "",
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;
  const dotSizeClass = DOT_SIZES[size] || DOT_SIZES.md;

  const initials = (name || "U")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const ringClass = ring ? `ring-2 ${ringColor} ring-offset-2 ring-offset-base-100` : "";

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 inline-flex items-center justify-center rounded-full select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className={`rounded-full object-cover bg-base-200 ${sizeClass} ${ringClass}`}
          loading="lazy"
        />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center font-bold bg-primary/10 text-primary uppercase ${sizeClass} ${ringClass}`}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute rounded-full ring-2 ring-base-100 ${dotSizeClass} ${
            online ? "bg-success" : "bg-base-content/30"
          }`}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
};

export const AvatarGroup = ({
  users = [],
  max = 3,
  size = "sm",
  className = "",
}) => {
  const visibleUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={`flex items-center -space-x-2.5 overflow-hidden ${className}`}>
      {visibleUsers.map((user, idx) => (
        <Avatar
          key={user.id || user._id || idx}
          src={user.avatar || user.profilePic}
          name={user.fullName || user.name}
          size={size}
          ring
          ringColor="ring-base-100"
        />
      ))}
      {remaining > 0 && (
        <div className="relative inline-flex items-center justify-center rounded-full bg-base-300 text-base-content/80 font-semibold text-xs ring-2 ring-base-100 size-8 sm:size-9">
          +{remaining}
        </div>
      )}
    </div>
  );
};

export const OnlineStatus = ({ online = false, pulse = true, className = "" }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <span className="relative flex size-2 shrink-0">
        {online && pulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${
            online ? "bg-success" : "bg-base-content/35"
          }`}
        />
      </span>
      <span className={`truncate ${online ? "text-success font-medium" : "text-base-content/55"}`}>
        {online ? "Online" : "Offline"}
      </span>
    </span>
  );
};

export const UserInfo = ({
  avatar,
  name,
  subtitle,
  online = false,
  showStatus = true,
  size = "md",
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <Avatar
        src={avatar}
        name={name}
        size={size}
        online={online}
        showStatus={showStatus}
      />
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-sm sm:text-base text-base-content truncate leading-tight">
          {name}
        </h4>
        {subtitle && (
          <p className="text-xs text-base-content/60 truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export const UserListItem = ({
  avatar,
  name,
  subtitle,
  time,
  unread = 0,
  online = false,
  selected = false,
  onClick,
  trailing,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors rounded-xl min-h-[56px] select-none ${
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-base-200/70 text-base-content"
      } ${className}`}
    >
      <Avatar
        src={avatar}
        name={name}
        size="md"
        online={online}
        showStatus={true}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm truncate">{name}</p>
          {time && (
            <span className="text-[11px] text-base-content/50 shrink-0">
              {time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {subtitle && (
            <p className="text-xs text-base-content/60 truncate leading-snug">
              {subtitle}
            </p>
          )}
          {unread > 0 && (
            <span className="badge badge-primary badge-xs size-5 p-0 shrink-0 text-[10px] font-bold">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </button>
  );
};

export default {
  Avatar,
  AvatarGroup,
  OnlineStatus,
  UserInfo,
  UserListItem,
};
