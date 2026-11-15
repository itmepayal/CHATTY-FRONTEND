import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLastSeen } from "../../../hooks/useLastSeen.js";

const SPRING = { type: "spring", stiffness: 420, damping: 28 };

export default function ProfileImageViewer({
  isOpen,
  onClose,
  userId,
  user,
  imageUrl,
  name,
}) {
  const targetId = userId ?? user?.id ?? user?._id;
  const { text: lastSeenText, isLoading } = useLastSeen(targetId);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  const displayName = name || user?.fullName || "User";
  const avatarSrc =
    imageUrl || user?.avatar?.url || user?.avatar || "/avatar.png";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-black/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${displayName} photo`}
        >
          <motion.img
            layoutId={targetId ? `chat-avatar-${targetId}` : undefined}
            src={avatarSrc}
            alt={displayName}
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
              {displayName}
            </p>
            {isLoading && !lastSeenText ? (
              <span className="inline-block mt-1 h-3.5 w-28 animate-pulse rounded bg-white/20" />
            ) : (
              <p className="mt-0.5 text-sm text-white/70">
                {lastSeenText || ""}
              </p>
            )}
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="btn btn-circle btn-sm absolute right-4 top-4 border-0 bg-white/15 text-white hover:bg-white/25"
            aria-label="Close photo"
          >
            <X className="size-4" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
