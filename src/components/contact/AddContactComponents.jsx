import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Loader2,
  MessageCircle,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

export const FALLBACK_AVATAR = "/avatar.png";
export const SPRING = { type: "spring", stiffness: 500, damping: 38 };

export const avatarSrc = (a) =>
  (typeof a === "string" ? a : a?.url) || FALLBACK_AVATAR;

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const ContactAvatar = ({ src, isOnline = false, className = "" }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative shrink-0">
      <img
        src={failed ? FALLBACK_AVATAR : avatarSrc(src)}
        onError={() => setFailed(true)}
        loading="lazy"
        alt=""
        className={className}
      />
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100 shadow-2xs"
          title="Online"
          aria-label="Online"
        />
      )}
    </div>
  );
};

export const Highlight = ({ text = "", term = "" }) => {
  if (!term || !text) return text;
  const needle = term.toLowerCase();
  return text.split(new RegExp(`(${escapeRe(term)})`, "ig")).map((part, i) =>
    part.toLowerCase() === needle ? (
      <mark key={i} className="rounded bg-primary/20 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const RowSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: [0.4, 1, 0.4] }}
    transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.1 }}
    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
    aria-hidden="true"
  >
    <div className="size-11 rounded-full bg-base-300" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-2/5 rounded bg-base-300" />
      <div className="h-2.5 w-1/4 rounded bg-base-200" />
    </div>
    <div className="h-9 w-[5.5rem] rounded-lg bg-base-200" />
  </motion.div>
);

export const StateMessage = ({ icon: Icon, title, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-1.5 px-6 text-center"
  >
    <div className="relative mb-2 grid size-16 place-items-center">
      {[0, 1].map((n) => (
        <motion.span
          key={n}
          className="absolute inset-0 rounded-full border border-primary/25"
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: n * 1.2,
            ease: "easeOut",
          }}
        />
      ))}
      <div className="relative grid size-14 place-items-center rounded-full bg-base-200">
        <Icon className="size-6 text-base-content/40" />
      </div>
    </div>
    <p className="text-sm font-semibold text-base-content/80">{title}</p>
    {hint && (
      <p className="max-w-[16rem] text-xs text-base-content/50">{hint}</p>
    )}
  </motion.div>
);

export const Kbd = ({ children }) => (
  <kbd className="kbd kbd-xs inline-flex min-w-5 items-center justify-center">
    {children}
  </kbd>
);

export const ContactRow = ({
  user,
  term,
  optionId,
  active,
  busy,
  isOnline = false,
  removeMode,
  onToggle,
  onHover,
  onSelectUser,
  onMessage,
}) => {
  const isContact = Boolean(user.isContact || user.relationship === "connected");
  const isBlocked = Boolean(user.isBlocked || user.relationship === "blocked");
  const isSent = user.relationship === "request_sent";
  const isIncoming = user.relationship === "incoming_request";

  return (
    <motion.li
      id={optionId}
      role="option"
      aria-selected={active}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
      transition={SPRING}
      onMouseMove={onHover}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer ${
        active ? "bg-base-200" : "hover:bg-base-200/50"
      }`}
      onClick={() => onSelectUser?.(user)}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}

      <ContactAvatar
        src={user.avatar}
        isOnline={isOnline}
        className="size-11 shrink-0 rounded-full bg-base-300 object-cover ring-2 ring-base-100"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-medium leading-tight">
            <Highlight text={user.fullName} term={term} />
          </p>
          {user.mutualCount > 0 && (
            <span className="badge badge-xs bg-primary/10 text-primary border-0 gap-1 text-[10px]">
              <Users className="size-2.5" /> {user.mutualCount} mutual
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 truncate text-xs text-base-content/50">
          {user.username && (
            <span>
              @<Highlight text={user.username} term={term} />
            </span>
          )}
          {user.phone && user.phone.includes(term) && (
            <span className="font-mono text-primary">
              · <Highlight text={user.phone} term={term} />
            </span>
          )}
          {user.email &&
            user.email.toLowerCase().includes(term.toLowerCase()) && (
              <span>
                · <Highlight text={user.email} term={term} />
              </span>
            )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {busy ? (
          <button type="button" disabled className="btn btn-sm h-9 min-h-9 min-w-[5.5rem] rounded-lg">
            <Loader2 className="size-4 animate-spin" />
          </button>
        ) : isBlocked ? (
          <span className="badge badge-error badge-outline gap-1 text-xs py-2 px-2.5">
            <ShieldAlert className="size-3" /> Blocked
          </span>
        ) : isSent ? (
          <span className="badge badge-ghost gap-1 text-xs py-2 px-2.5 text-base-content/60">
            <Clock className="size-3" /> Sent
          </span>
        ) : isIncoming ? (
          <button
            type="button"
            onClick={() => onToggle(user)}
            className="btn btn-sm btn-primary h-9 min-h-9 gap-1 rounded-lg"
          >
            <UserCheck className="size-4" /> Accept
          </button>
        ) : removeMode ? (
          <button
            type="button"
            onClick={() => onToggle(user)}
            className="btn btn-sm bg-error/10 text-error hover:bg-error hover:text-error-content h-9 min-h-9 rounded-lg border-0 gap-1"
          >
            <UserMinus className="size-4" /> Remove
          </button>
        ) : isContact ? (
          <div className="flex items-center gap-1">
            {onMessage && (
              <button
                type="button"
                onClick={() => onMessage(user)}
                className="btn btn-sm btn-primary h-9 min-h-9 gap-1 rounded-lg"
              >
                <MessageCircle className="size-4" /> Message
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggle(user)}
              title="Remove contact"
              className="btn btn-sm btn-ghost btn-square h-9 w-9 text-base-content/40 hover:text-error"
            >
              <UserMinus className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(user)}
            className="btn btn-sm btn-primary h-9 min-h-9 gap-1.5 rounded-lg"
          >
            <UserPlus className="size-4" /> Add
          </button>
        )}
      </div>
    </motion.li>
  );
};
