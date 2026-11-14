import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import CallHistoryPanel from "../Call/CallHistoryPanel.jsx";
import { useGroupStore } from "../../store/useGroupStore";
import { CALL_SPRING } from "../Call/common/callTokens.js";

export default function CallsLauncher({ className = "" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openGroup = (groupId) => {
    const st = useGroupStore.getState();
    const group = st.groups?.find?.((g) => String(g.id) === String(groupId));
    const fn = st.setSelectedGroup || st.selectGroup || st.openGroup;
    if (group && fn) fn(group);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-ghost btn-circle btn-sm ${className}`}
        aria-label="View Call History"
        title="Call history"
      >
        <Phone className="size-5" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="calls-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Call history"
            >
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={CALL_SPRING}
                onClick={(e) => e.stopPropagation()}
                className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-base-300 bg-base-100 shadow-2xl sm:h-[620px] sm:rounded-3xl"
              >
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-3.5 bg-base-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Phone className="size-4" />
                    </span>
                    <h2 className="font-bold text-base text-base-content">
                      Call History
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
                    onClick={() => setOpen(false)}
                    aria-label="Close call history"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1">
                  <CallHistoryPanel
                    onOpenGroup={openGroup}
                    onAfterOpen={() => setOpen(false)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
