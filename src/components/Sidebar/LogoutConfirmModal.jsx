import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";

export const LogoutConfirm = ({ open, loading, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => !loading && onCancel()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          <motion.div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-base-300 bg-base-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-sm sm:rounded-xl sm:pb-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-base-300 sm:hidden" />

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <LogOut className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 id="logout-title" className="font-semibold text-base">
                  Log out of Chatty?
                </h3>
                <p className="mt-1 text-sm text-base-content/60">
                  You'll need to sign in again to see your chats.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                autoFocus
                disabled={loading}
                className="btn btn-ghost btn-sm h-10 min-h-10"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn btn-error btn-sm h-10 min-h-10 gap-1.5"
                onClick={onConfirm}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Log out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
