import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { Avatar } from "../avatar/Avatar";

export const MessageStatus = ({ status = "sent", isMine = true }) => {
  if (!isMine) return null;

  switch (status) {
    case "sending":
      return <Clock className="size-3 shrink-0 text-base-content/50 animate-pulse" aria-label="Sending" />;
    case "sent":
      return <Check className="size-3.5 shrink-0 text-base-content/50" aria-label="Sent" />;
    case "delivered":
      return <CheckCheck className="size-3.5 shrink-0 text-base-content/50" aria-label="Delivered" />;
    case "seen":
    case "read":
      return <CheckCheck className="size-3.5 shrink-0 text-info" aria-label="Seen" />;
    case "error":
    case "failed":
      return <AlertCircle className="size-3.5 shrink-0 text-error" aria-label="Failed to send" />;
    default:
      return null;
  }
};

export const MessageTimestamp = ({ time, className = "" }) => {
  if (!time) return null;
  return (
    <span className={`text-[10px] leading-none opacity-60 whitespace-nowrap select-none ${className}`}>
      {time}
    </span>
  );
};

export const MessageReplyQuote = ({
  senderName,
  text,
  mediaType,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`border-l-4 border-primary bg-base-200/50 rounded-r-xl p-2 mb-1.5 text-xs select-none transition-colors ${
        onClick ? "cursor-pointer hover:bg-base-200" : ""
      } ${className}`}
    >
      {senderName && (
        <span className="font-semibold text-primary block truncate mb-0.5">
          {senderName}
        </span>
      )}
      <p className="text-base-content/75 truncate">
        {mediaType ? `[${mediaType}] ` : ""}
        {text || "Attachment"}
      </p>
    </div>
  );
};

export const MessageReactions = ({
  reactions = [],
  onReact,
  className = "",
}) => {
  if (!reactions.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
      {reactions.map((r, idx) => (
        <button
          key={`${r.emoji}-${idx}`}
          type="button"
          onClick={() => onReact?.(r.emoji)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-base-200 border border-base-300 hover:scale-105 active:scale-95 transition-transform ${
            r.me ? "ring-1 ring-primary bg-primary/10" : ""
          }`}
        >
          <span>{r.emoji}</span>
          {r.count > 1 && (
            <span className="text-[10px] font-semibold text-base-content/70">
              {r.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export const DateSeparator = ({ label, className = "" }) => {
  if (!label) return null;

  return (
    <div className={`flex items-center justify-center my-3 select-none ${className}`}>
      <span className="bg-base-200/90 text-base-content/65 text-[11px] font-medium px-3 py-1 rounded-full border border-base-300/60 shadow-2xs backdrop-blur-xs">
        {label}
      </span>
    </div>
  );
};

export const MessageBubble = ({
  isMine = false,
  bubbleStyle = "rounded",
  children,
  time,
  status,
  className = "",
}) => {
  const radiusClass =
    bubbleStyle === "sharp"
      ? "rounded-xs"
      : bubbleStyle === "soft"
        ? isMine
          ? "rounded-xl rounded-br-xs"
          : "rounded-xl rounded-bl-xs"
        : isMine
          ? "rounded-2xl rounded-br-sm"
          : "rounded-2xl rounded-bl-sm";

  const colorClass = isMine
    ? "bg-primary text-primary-content"
    : "bg-base-200 text-base-content";

  return (
    <div
      className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] p-3 shadow-xs [overflow-wrap:anywhere] ${radiusClass} ${colorClass} ${className}`}
    >
      <div className="text-sm leading-relaxed">{children}</div>
      {(time || status) && (
        <div className="flex items-center justify-end gap-1 mt-1 pt-0.5">
          {time && <MessageTimestamp time={time} />}
          {isMine && <MessageStatus status={status} isMine={isMine} />}
        </div>
      )}
    </div>
  );
};

export const ChatListItem = ({
  avatar,
  name,
  lastMessage,
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
      className={`w-full flex items-center gap-3 p-3 text-left transition-colors rounded-xl min-h-[58px] select-none ${
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-base-200/60 text-base-content"
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
        <div className="flex items-center justify-between gap-1.5">
          <p className="font-semibold text-sm truncate">{name}</p>
          {time && (
            <span className="text-[11px] text-base-content/50 shrink-0 font-normal">
              {time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {lastMessage && (
            <p className="text-xs text-base-content/60 truncate leading-snug">
              {lastMessage}
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
  MessageStatus,
  MessageTimestamp,
  MessageReplyQuote,
  MessageReactions,
  DateSeparator,
  MessageBubble,
  ChatListItem,
};
