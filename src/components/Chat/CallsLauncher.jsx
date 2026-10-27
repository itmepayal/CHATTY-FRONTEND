import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import CallHistoryPanel from "./CallHistoryPanel.jsx";
import { useGroupStore } from "../../store/useGroupStore";

const CallsLauncher = ({ className = "" }) => {
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
        aria-label="Call history"
        title="Calls"
      >
        <Phone className="size-5" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="calls-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Call history"
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-base-300 bg-base-100 shadow-2xl sm:h-[600px] sm:rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
                  <h2 className="font-semibold">Calls</h2>
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-sm"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
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
};

export default CallsLauncher;
