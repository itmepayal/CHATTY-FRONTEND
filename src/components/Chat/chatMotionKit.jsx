/**
 * chatMotionKit.jsx
 * Drop-in Framer Motion upgrades for ChatContainer.jsx
 * Import what you need:
 *   import { MessageRow, PopoverShell, MenuItem, ReactionButton, SendMicButton,
 *            TypingBubble, ScrollToBottomFab, PinnedBanner, CollapseBar,
 *            ImageViewer, Modal, AnimatedBadge, AnimatedTicks, spring } from "./chatMotionKit";
 *
 * Principles: physics-based springs, motion only in response to user actions,
 * one signature moment (message arrival), reduced-motion respected via
 * <MotionConfig reducedMotion> that you already have in ChatContainer.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Check, CheckCheck, ChevronDown, Pin, PinOff, X } from "lucide-react";

/* ---------------------------- springs & variants --------------------------- */
export const spring = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};
export const springSoft = { type: "spring", stiffness: 260, damping: 28 };
export const springSnappy = { type: "spring", stiffness: 600, damping: 30 };

export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.12 } },
};

const shellVariants = {
  hidden: { opacity: 0, scale: 0.9, y: -6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springSnappy,
      staggerChildren: 0.022,
      delayChildren: 0.03,
    },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: springSnappy },
};

const reactionVariants = {
  hidden: { opacity: 0, scale: 0.3, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springSnappy, damping: 18 },
  },
};

/* --------------------------------- Modal ---------------------------------- */
// Blurred backdrop + spring card. Esc closes. Same API as your old Modal.
export const Modal = ({ onClose, labelId, children, maxW = "max-w-sm" }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <motion.div
      {...backdrop}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        className={`w-full ${maxW} rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
};

/* ------------------------ Popover (menu / reactions) ----------------------- */
// Replaces the <motion.div {...popIn}> in the portal. Children stagger in.
export const PopoverShell = ({ type, id, top, left, width, children }) => (
  <motion.div
    key={`${type}-${id}`}
    data-popover-ui
    role={type === "react" ? "toolbar" : "menu"}
    aria-label={type === "react" ? "Reactions" : undefined}
    variants={shellVariants}
    initial="hidden"
    animate="show"
    exit="exit"
    style={{
      top,
      left,
      width,
      transformOrigin: type === "react" ? "bottom center" : "top center",
    }}
    className={
      type === "react"
        ? "fixed z-50 flex items-center justify-between rounded-full border border-base-300 bg-base-100/95 px-1.5 py-1 shadow-xl backdrop-blur"
        : "fixed z-50 overflow-hidden rounded-xl border border-base-300 bg-base-100/95 py-1 shadow-xl backdrop-blur"
    }
  >
    {children}
  </motion.div>
);

export const MenuItem = ({ icon: Icon, label, onClick, danger = false }) => (
  <motion.button
    type="button"
    role="menuitem"
    variants={itemVariants}
    whileHover={{ x: 3 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`flex h-10 w-full items-center gap-2.5 px-3 text-left text-sm outline-none transition-colors ${
      danger
        ? "text-error hover:bg-error/10 focus-visible:bg-error/10"
        : "hover:bg-base-200 focus-visible:bg-base-200"
    }`}
  >
    <Icon className="size-4 shrink-0" />
    <span className="truncate">{label}</span>
  </motion.button>
);

export const ReactionButton = ({ emoji, active, onClick }) => (
  <motion.button
    type="button"
    variants={reactionVariants}
    whileHover={{ scale: 1.35, y: -4 }}
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className={`flex size-9 items-center justify-center rounded-full text-xl ${
      active ? "bg-primary/15 ring-1 ring-primary/40" : ""
    }`}
  >
    {emoji}
  </motion.button>
);

/* ------------------------------ Message row ------------------------------- */
// Wrap each message. Incoming slides from the left, outgoing from the right.
export const MessageRow = ({
  id,
  isMine,
  isFresh,
  highlighted,
  className = "",
  children,
}) => (
  <motion.div
    id={`msg-${id}`}
    layout="position"
    initial={
      isFresh ? { opacity: 0, x: isMine ? 28 : -28, y: 10, scale: 0.95 } : false
    }
    animate={{
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      backgroundColor: highlighted
        ? "rgba(99,102,241,0.16)"
        : "rgba(99,102,241,0)",
    }}
    transition={{ ...spring, backgroundColor: { duration: 0.5 } }}
    style={{ transformOrigin: isMine ? "bottom right" : "bottom left" }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ---------------------------------- Ticks --------------------------------- */
// Cross-fades sent -> delivered -> seen with a small pop when it turns blue.
export const AnimatedTicks = ({ status, showSeen = true }) => {
  const seen = status === "seen" && showSeen;
  const double = status === "seen" || status === "delivered";
  const Icon = double ? CheckCheck : Check;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={seen ? "seen" : double ? "delivered" : "sent"}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: { ...springSnappy, damping: 16 },
        }}
        exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.1 } }}
        className="inline-flex"
      >
        <Icon
          className={`size-3.5 ${seen ? "text-info" : ""}`}
          aria-label={seen ? "Seen" : double ? "Delivered" : "Sent"}
        />
      </motion.span>
    </AnimatePresence>
  );
};

/* --------------------------- Send / Mic morph button ----------------------- */
export const SendMicButton = ({
  hasContent,
  isEditing,
  onRecord,
  SendIcon,
  MicIcon,
}) => (
  <AnimatePresence mode="popLayout" initial={false}>
    {hasContent ? (
      <motion.button
        key="send"
        type="submit"
        initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.4, rotate: 90, opacity: 0 }}
        transition={springSnappy}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.85 }}
        className="btn btn-primary btn-circle btn-sm"
        aria-label={isEditing ? "Save edit" : "Send"}
        title={isEditing ? "Save" : "Send"}
      >
        {isEditing ? (
          <Check className="size-4" />
        ) : (
          <SendIcon className="size-4" />
        )}
      </motion.button>
    ) : (
      <motion.button
        key="mic"
        type="button"
        onClick={onRecord}
        initial={{ scale: 0.4, rotate: 90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.4, rotate: -90, opacity: 0 }}
        transition={springSnappy}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.85 }}
        className="btn btn-primary btn-circle btn-sm"
        aria-label="Record voice message"
        title="Record voice message"
      >
        <MicIcon className="size-4" />
      </motion.button>
    )}
  </AnimatePresence>
);

/* ------------------------------ Collapse bar ------------------------------- */
// Reply / edit / search-result strips. Pass `show` and children.
export const CollapseBar = ({ show, children, className = "" }) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0, y: 6 }}
        animate={{ opacity: 1, height: "auto", y: 0, transition: springSoft }}
        exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
        className={`overflow-hidden ${className}`}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ----------------------------- Animated badge ------------------------------ */
export const AnimatedBadge = ({ show, children }) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.span
        key={String(children)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ ...springSnappy, damping: 16 }}
        className="badge badge-primary badge-xs"
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

/* ------------------------------ Pinned banner ------------------------------ */
export const PinnedBanner = ({
  pin,
  index,
  total,
  previewText,
  onJump,
  onUnpin,
}) => (
  <CollapseBar
    show={Boolean(pin)}
    className="border-b border-base-300 bg-base-100"
  >
    {pin && (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <motion.span
          initial={{ rotate: -35, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ ...springSnappy, damping: 14 }}
          className="shrink-0"
        >
          <Pin className="size-4 text-primary" />
        </motion.span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className="min-w-0 flex-1 text-left"
          onClick={onJump}
        >
          <span className="block text-xs font-semibold text-primary">
            Pinned message
            {total > 1 ? ` · ${(index % total) + 1}/${total}` : ""}
          </span>
          <span className="relative block h-4 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={pin.id}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={spring}
                className="block truncate text-xs text-base-content/70"
              >
                {previewText}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          className="btn btn-circle btn-ghost btn-xs"
          onClick={onUnpin}
          aria-label="Unpin"
          title="Unpin"
        >
          <PinOff className="size-4" />
        </motion.button>
      </div>
    )}
  </CollapseBar>
);

/* ------------------------------ Typing bubble ------------------------------ */
export const TypingBubble = ({ show, avatar, name, reduceMotion }) => (
  <CollapseBar show={show} className="border-t border-base-300/50 bg-base-100">
    <div className="flex items-center gap-2 px-4 py-2">
      <img src={avatar} alt="" className="size-6 rounded-full object-cover" />
      <div className="flex items-center gap-1 rounded-full bg-base-200 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-base-content/50"
            animate={
              reduceMotion
                ? undefined
                : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }
            }
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.14,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.span
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs text-base-content/50"
      >
        {name} is typing…
      </motion.span>
    </div>
  </CollapseBar>
);

/* --------------------------- Scroll-to-bottom FAB -------------------------- */
// Place inside a `relative` wrapper around the message list.
export const ScrollToBottomFab = ({ show, unread = 0, onClick }) => (
  <AnimatePresence>
    {show && (
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, y: 16, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.7 }}
        transition={springSnappy}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.9 }}
        className="btn btn-circle btn-sm absolute bottom-4 right-4 z-20 border border-base-300 bg-base-100 shadow-lg"
        aria-label="Scroll to latest message"
      >
        <ChevronDown className="size-4" />
        <AnimatedBadge show={unread > 0}>
          {unread > 99 ? "99+" : unread}
        </AnimatedBadge>
      </motion.button>
    )}
  </AnimatePresence>
);

/* ------------------------------ Image viewer ------------------------------- */
// Drag the image up/down to dismiss; backdrop fades as you drag.
export const ImageViewer = ({ src, onClose }) => {
  const y = useMotionValue(0);
  const bg = useTransform(y, [-240, 0, 240], [0.25, 0.85, 0.25]);
  const bgColor = useTransform(bg, (v) => `rgba(0,0,0,${v})`);

  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          key="image-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ backgroundColor: bgColor }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="btn btn-circle btn-sm absolute right-4 top-4"
            onClick={onClose}
            aria-label="Close image"
          >
            <X className="size-4" />
          </motion.button>
          <motion.img
            src={src}
            alt="Attachment preview"
            drag="y"
            dragSnapToOrigin
            dragElastic={0.5}
            style={{ y }}
            onDragEnd={(_, info) => Math.abs(info.offset.y) > 120 && onClose()}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1, transition: spring }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
            className="max-h-full max-w-full cursor-grab rounded-lg shadow-2xl active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
