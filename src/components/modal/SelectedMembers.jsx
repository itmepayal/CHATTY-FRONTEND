import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const SPRING = { type: "spring", stiffness: 500, damping: 35 };

/**
 * SelectedMembers
 * Renders removable chip pills for users selected to join a group.
 */
export const SelectedMembers = ({ members = [], onRemove }) => {
  if (!members || members.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 bg-base-200/60 rounded-xl border border-base-300/60 max-h-24 overflow-y-auto overscroll-contain transition-all"
      role="region"
      aria-label="Selected group members"
    >
      <AnimatePresence initial={false}>
        {members.map((u) => {
          const id = String(u.id ?? u._id);
          return (
            <motion.span
              key={id}
              layout="position"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={SPRING}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-base-100 border border-base-300/80 shadow-2xs text-xs font-medium text-base-content/90"
            >
              <img
                src={avatarSrc(u.avatar)}
                alt=""
                className="size-4.5 rounded-full object-cover ring-1 ring-base-content/10 shrink-0"
              />
              <span className="truncate max-w-[120px]">
                {u.fullName || u.username}
              </span>
              <button
                type="button"
                onClick={() => onRemove(u)}
                aria-label={`Remove ${u.fullName || u.username}`}
                title={`Remove ${u.fullName || u.username}`}
                className="grid size-4 place-items-center rounded-full text-base-content/50 hover:bg-error/15 hover:text-error transition-colors"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SelectedMembers;
