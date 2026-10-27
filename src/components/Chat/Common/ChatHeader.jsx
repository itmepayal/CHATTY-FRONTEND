import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { EyeOff, Phone, Video, X } from "lucide-react";
import { useChatStore } from "../../../store/useChatStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { usePrivacyStore } from "../../../store/usePrivacyStore";
import { useVisibleOnlineUsers } from "../../../hooks/useVisibleOnlineUsers";
import { useCall } from "../../../context/CallContext";

const SPRING = { type: "spring", stiffness: 420, damping: 28 };

const RING_GRADIENT =
  "conic-gradient(from 0deg, var(--color-success), var(--color-primary), var(--color-secondary), var(--color-success))";

/* ------------------------------------------------------------------ */
/*  Tiny status icons                                                  */
/* ------------------------------------------------------------------ */
const TypingDots = () => (
  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1 rounded-full bg-primary"
        animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
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

const PulseDot = () => (
  <span className="relative flex size-1.5" aria-hidden="true">
    <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
    <span className="relative size-1.5 rounded-full bg-success" />
  </span>
);

const OutlineDot = () => (
  <span
    className="size-1.5 rounded-full border border-base-content/40"
    aria-hidden="true"
  />
);

const HiddenIcon = () => <EyeOff className="size-3 shrink-0" />;

// one entry per visual state
const STATUS = {
  typing: {
    label: "typing",
    pill: "bg-primary/10 text-primary",
    Icon: TypingDots,
  },
  hidden: {
    label: "Status hidden",
    pill: "bg-base-200 text-base-content/60",
    Icon: HiddenIcon,
  },
  online: {
    label: "Online",
    pill: "bg-success/10 text-success",
    Icon: PulseDot,
  },
  offline: {
    label: "Offline",
    pill: "bg-base-200 text-base-content/50",
    Icon: OutlineDot,
  },
};

/* ------------------------------------------------------------------ */
/*  ChatHeader                                                         */
/* ------------------------------------------------------------------ */
const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingFrom } = useChatStore();

  const onlineUsers = useVisibleOnlineUsers();
  const hiddenUsers = useAuthStore((st) => st.hiddenUsers);

  // MY own privacy settings (reciprocal: if I hide mine, I can't see
  // anyone else's status / typing either)
  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);
  const typingEnabled = usePrivacyStore((st) => st.privacy.typingIndicator);

  // calling
  const { startCall, status: callStatus } = useCall();

  const [viewAvatar, setViewAvatar] = useState(false);

  // close the photo viewer when the chat changes
  useEffect(() => {
    setViewAvatar(false);
  }, [selectedUser?.id]);

  // Escape closes the photo viewer
  useEffect(() => {
    if (!viewAvatar) return;
    const onKey = (e) => e.key === "Escape" && setViewAvatar(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewAvatar]);

  if (!selectedUser) return null;

  const uid = String(selectedUser.id);
  const avatar =
    selectedUser.avatar?.url || selectedUser.avatar || "/avatar.png";

  const theirStatusHidden = hiddenUsers.includes(uid);
  const statusHidden = theirStatusHidden || !myStatusVisible;
  const isOnline = !statusHidden && onlineUsers.includes(uid);
  const isTyping = Boolean(typingEnabled && typingFrom?.[uid]);

  const statusKey = isTyping
    ? "typing"
    : statusHidden
      ? "hidden"
      : isOnline
        ? "online"
        : "offline";
  const status = STATUS[statusKey];

  const hiddenReason = !myStatusVisible
    ? "You turned off your online status, so you can't see theirs"
    : "This person hides their online status";

  const showRing = isOnline || isTyping;

  // calling helpers
  const callPeer = { id: selectedUser.id, fullName: selectedUser.fullName };
  const canCall = callStatus === "idle" && !selectedUser.isBlocked;

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        key={uid}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative z-10 border-b border-base-300 bg-base-100/80 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4 sm:py-3"
      >
        {/* colour wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.07] via-transparent to-secondary/[0.07]" />

        {/* one-time light sweep when a chat opens */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.span
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-base-content/[0.06] to-transparent"
            initial={{ x: "-120%" }}
            animate={{ x: "420%" }}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.1 }}
          />
        </div>

        {/* glowing hairline */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* ---------- avatar + animated presence ring ---------- */}
            <div className="relative shrink-0">
              {/* soft glow */}
              <AnimatePresence initial={false}>
                {showRing && (
                  <motion.span
                    key="glow"
                    className="absolute -inset-1.5 rounded-full bg-primary/25 blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: { duration: 2.6, repeat: Infinity },
                    }}
                  />
                )}
              </AnimatePresence>

              {/* rotating gradient ring (faster while typing) */}
              <AnimatePresence initial={false}>
                {showRing && (
                  <motion.span
                    key="ring"
                    className="absolute -inset-[3px] rounded-full"
                    style={{ background: RING_GRADIENT }}
                    initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                    animate={{ opacity: 1, scale: 1, rotate: 360 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      opacity: { duration: 0.25 },
                      scale: SPRING,
                      rotate: {
                        duration: isTyping ? 2 : 7,
                        repeat: Infinity,
                        ease: "linear",
                      },
                    }}
                  />
                )}
              </AnimatePresence>

              <motion.button
                type="button"
                onClick={() => setViewAvatar(true)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className="relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`View ${selectedUser.fullName}'s photo`}
              >
                <motion.img
                  layoutId={`chat-avatar-${uid}`}
                  src={avatar}
                  alt={selectedUser.fullName}
                  transition={SPRING}
                  className="size-10 rounded-full border-2 border-base-100 bg-base-200 object-cover shadow-md sm:size-11"
                />
              </motion.button>

              {/* online dot */}
              <AnimatePresence>
                {isOnline && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 520, damping: 22 }}
                    className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100"
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ---------- name + morphing status pill ---------- */}
            <div className="min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="truncate text-[15px] font-semibold leading-tight tracking-tight sm:text-base"
              >
                {selectedUser.fullName}
              </motion.h3>

              <motion.div
                layout
                transition={SPRING}
                title={statusKey === "hidden" ? hiddenReason : undefined}
                className={`mt-1 inline-flex h-5 items-center overflow-hidden rounded-full px-2.5 text-[11px] font-medium transition-colors duration-300 sm:text-xs ${status.pill}`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <status.Icon />
                    {status.label}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          {/* ---------- call + close ---------- */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="btn btn-ghost btn-circle btn-sm hover:bg-primary/10 hover:text-primary"
              onClick={() => startCall(callPeer, "audio")}
              disabled={!canCall}
              aria-label="Start audio call"
              title="Audio call"
            >
              <Phone className="size-4" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="btn btn-ghost btn-circle btn-sm hover:bg-primary/10 hover:text-primary"
              onClick={() => startCall(callPeer, "video")}
              disabled={!canCall}
              aria-label="Start video call"
              title="Video call"
            >
              <Video className="size-4" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ rotate: 90, scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="btn btn-ghost btn-circle btn-sm hover:bg-error/10 hover:text-error"
              onClick={() => setSelectedUser(null)}
              aria-label="Close conversation"
              title="Close conversation"
            >
              <X className="size-4" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ---------- photo viewer (shared-element transition) ---------- */}
      {createPortal(
        <AnimatePresence>
          {viewAvatar && (
            <motion.div
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-black/70 p-4 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setViewAvatar(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedUser.fullName} photo`}
            >
              <motion.img
                layoutId={`chat-avatar-${uid}`}
                src={avatar}
                alt={selectedUser.fullName}
                transition={SPRING}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[65vh] w-[min(88vw,26rem)] rounded-3xl object-cover shadow-2xl ring-1 ring-white/20"
              />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ delay: 0.12 }}
                className="text-center text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-lg font-semibold tracking-tight">
                  {selectedUser.fullName}
                </p>
                <p className="mt-0.5 text-sm text-white/70">{status.label}</p>
              </motion.div>

              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewAvatar(false)}
                className="btn btn-circle btn-sm absolute right-4 top-4 border-0 bg-white/15 text-white hover:bg-white/25"
                aria-label="Close photo"
              >
                <X className="size-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </MotionConfig>
  );
};

export default ChatHeader;
