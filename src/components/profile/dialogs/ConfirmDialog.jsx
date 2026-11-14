import { useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, Loader2 } from "lucide-react";
import { PROFILE_SPRING } from "../common/ProfileTokens";

/**
 * Standardized Confirmation Dialog Modal
 */
export default function ConfirmDialog({
  open,
  title,
  text,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "error",
  busy = false,
}) {
  const cancelRef = useRef(null);
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={PROFILE_SPRING}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-describedby={descId}
            className="w-full max-w-sm rounded-3xl border border-base-300 bg-base-100 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start gap-3.5 mb-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${
                  tone === "error"
                    ? "bg-error/10 text-error ring-error/20"
                    : "bg-primary/10 text-primary ring-primary/20"
                }`}
              >
                <TriangleAlert className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-base-content leading-snug">
                  {title}
                </h3>
                <p
                  id={descId}
                  className="mt-1 text-xs sm:text-sm leading-relaxed text-base-content/65"
                >
                  {text}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-5">
              <motion.button
                ref={cancelRef}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                disabled={busy}
                className="btn btn-ghost btn-sm rounded-xl font-medium text-base-content/75"
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onConfirm}
                disabled={busy}
                className={`btn btn-sm rounded-xl font-semibold gap-1.5 shadow-sm ${
                  tone === "error"
                    ? "btn-error text-error-content"
                    : "btn-primary text-primary-content shadow-primary/25"
                }`}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                <span>{confirmLabel}</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
