import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, PhoneOff, VideoOff, WifiOff, X } from "lucide-react";
import { CALL_SPRING } from "./callTokens";

/**
 * Standardized Floating Toast for Call Warnings, Statuses, and Errors
 */
export default function CallToast({ message, type = "error", onDismiss = null }) {
  if (!message) return null;

  const Icon =
    type === "network"
      ? WifiOff
      : type === "video"
        ? VideoOff
        : type === "warning"
          ? AlertCircle
          : PhoneOff;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={CALL_SPRING}
        className="fixed left-1/2 top-4 z-[130] flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-full border border-base-300 bg-base-100/95 px-4 py-2.5 text-sm font-medium text-base-content shadow-2xl backdrop-blur-xl"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-error/15 text-error">
          <Icon className="size-3.5" />
        </span>

        <span className="truncate text-xs sm:text-sm font-medium">{message}</span>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-ghost btn-circle btn-xs ml-1 shrink-0 text-base-content/60 hover:text-base-content"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
