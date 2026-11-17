import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, UserMinus, UserPlus } from "lucide-react";

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
}) => {
  const isContact = Boolean(user.isContact);

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
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "bg-base-200" : ""
      }`}
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
        <p className="truncate text-[15px] font-medium leading-tight">
          <Highlight text={user.fullName} term={term} />
        </p>
        {user.username && (
          <p className="mt-0.5 truncate text-xs text-base-content/50">
            @<Highlight text={user.username} term={term} />
          </p>
        )}
      </div>

      <button
        type="button"
        tabIndex={-1}
        disabled={busy}
        onClick={() => onToggle(user)}
        aria-label={
          isContact
            ? `Remove ${user.fullName} from contacts`
            : `Add ${user.fullName} to contacts`
        }
        className={`group/btn btn btn-sm h-9 min-h-9 min-w-[5.5rem] shrink-0 gap-1.5 rounded-lg border-0 transition-colors ${
          removeMode
            ? "bg-error/10 text-error hover:bg-error hover:text-error-content"
            : isContact
              ? "bg-success/10 text-success hover:bg-error/10 hover:text-error"
              : "btn-primary"
        }`}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : removeMode ? (
          <>
            <UserMinus className="size-4" /> Remove
          </>
        ) : isContact ? (
          <>
            <span className="inline-flex items-center gap-1.5 group-hover/btn:hidden">
              <Check className="size-4" /> Added
            </span>
            <span className="hidden items-center gap-1.5 group-hover/btn:inline-flex">
              <UserMinus className="size-4" /> Remove
            </span>
          </>
        ) : (
          <>
            <UserPlus className="size-4" /> Add
          </>
        )}
      </button>
    </motion.li>
  );
};
