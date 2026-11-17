import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Edit2,
  Loader2,
  Send,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { customToast } from "../../toast/customToastService.js";

const spring = { type: "spring", stiffness: 380, damping: 28 };

// Converts Date to YYYY-MM-DDTHH:mm for datetime-local input
export const toLocalInput = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatRelativeScheduledTime = (dateInput) => {
  const target = new Date(dateInput);
  if (Number.isNaN(target.getTime())) return "Invalid date";
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return "Sending soon…";

  const diffMin = Math.round(diffMs / (60 * 1000));
  const diffHrs = Math.round(diffMs / (60 * 60 * 1000));
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  const timeStr = target.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffMin < 60) {
    return `in ${diffMin} min (${timeStr})`;
  }

  const isToday = target.toDateString() === now.toDateString();
  if (isToday) {
    return `Today at ${timeStr} (in ~${diffHrs}h)`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = target.toDateString() === tomorrow.toDateString();
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  if (diffDays <= 7) {
    const dayName = target.toLocaleDateString([], { weekday: "short" });
    return `${dayName} at ${timeStr}`;
  }

  return target.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/* ------------------------------------------------------------------ */
/*  ScheduleModal - Compose & Pick Time                                */
/* ------------------------------------------------------------------ */
export const ScheduleModal = ({ text = "", onClose, onConfirm }) => {
  const now = Date.now();
  const defaultDate = useMemo(() => new Date(now + 30 * 60 * 1000), [now]);

  const [value, setValue] = useState(() => toLocalInput(defaultDate));
  const [busy, setBusy] = useState(false);

  // Bounds: min 1 minute from now, max 30 days
  const min = toLocalInput(new Date(now + 60 * 1000));
  const max = toLocalInput(new Date(now + 30 * 86_400_000));

  // Quick preset chips
  const presets = useMemo(() => {
    const p = [];
    const base = new Date();

    // +30 min
    p.push({
      label: "+30m",
      date: new Date(base.getTime() + 30 * 60 * 1000),
    });

    // +2 hours
    p.push({
      label: "+2 hrs",
      date: new Date(base.getTime() + 2 * 60 * 60 * 1000),
    });

    // This evening (7:00 PM) or Tomorrow evening if past 6 PM
    const evening = new Date(base);
    evening.setHours(19, 0, 0, 0);
    if (evening.getTime() > base.getTime() + 30 * 60 * 1000) {
      p.push({ label: "This evening (7 PM)", date: evening });
    }

    // Tomorrow morning (9:00 AM)
    const tmwMorn = new Date(base);
    tmwMorn.setDate(base.getDate() + 1);
    tmwMorn.setHours(9, 0, 0, 0);
    p.push({ label: "Tomorrow (9 AM)", date: tmwMorn });

    return p;
  }, []);

  const submit = async () => {
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) {
      return customToast.error("Please pick a valid date and time");
    }
    if (when.getTime() < Date.now() + 30_000) {
      return customToast.error("Scheduled time must be at least 1 minute in the future");
    }
    setBusy(true);
    const ok = await onConfirm(when.toISOString());
    setBusy(false);
    if (ok) onClose();
  };

  const selectedDate = useMemo(() => new Date(value), [value]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={spring}
        className="relative w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-base-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-base-content">Schedule message</h3>
              <p className="text-xs text-base-content/60">Choose when this message will be sent</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="mt-4 rounded-xl border border-base-200 bg-base-200/50 p-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-base-content/50">Message preview</span>
          <p className="mt-1 line-clamp-3 text-sm text-base-content [overflow-wrap:anywhere]">
            {text}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <span className="block text-xs font-medium text-base-content/70 mb-1.5">Quick presets</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((pr) => (
              <button
                key={pr.label}
                type="button"
                className="btn btn-xs rounded-lg border border-base-300 bg-base-100 hover:border-primary/40 hover:bg-primary/5 text-base-content/80 text-[11px] font-normal"
                onClick={() => setValue(toLocalInput(pr.date))}
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Datetime picker */}
        <div className="mt-4">
          <label className="block">
            <span className="block text-xs font-medium text-base-content/70 mb-1.5">Send at</span>
            <input
              type="datetime-local"
              className="input input-bordered input-sm w-full rounded-xl text-sm"
              value={value}
              min={min}
              max={max}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-primary font-medium">
            <Calendar className="size-3.5" />
            {formatRelativeScheduledTime(selectedDate)}
          </p>
        </div>

        {/* Modal actions */}
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-base-200">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl font-normal text-base-content/70"
            onClick={onClose}
          >
            Cancel
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            className="btn btn-primary btn-sm rounded-xl px-4"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Schedule message"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ScheduledModal - List, Edit, Cancel                                */
/* ------------------------------------------------------------------ */
export const ScheduledModal = ({
  items = [],
  onClose,
  onCancel,
  onEdit,
  isGroup = false,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const startEditing = (item) => {
    setEditingId(item._id || item.id);
    setEditText(item.text || item.decryptedText || "");
    setEditTime(toLocalInput(new Date(item.scheduledFor)));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditTime("");
  };

  const saveEdit = async (item) => {
    const id = item._id || item.id;
    const when = new Date(editTime);
    if (Number.isNaN(when.getTime())) {
      return customToast.error("Pick a valid time");
    }
    setEditBusy(true);
    const ok = await onEdit?.(id, editText.trim(), when.toISOString());
    setEditBusy(false);
    if (ok) {
      setEditingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={spring}
        className="relative w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-base-200 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-base-content">Scheduled messages</h3>
              <p className="text-xs text-base-content/60">
                {items.length === 1 ? "1 message scheduled" : `${items.length} messages scheduled`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-base-content/60">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-base-200/80 mb-3 text-base-content/40">
                <Clock className="size-6" />
              </div>
              <p className="font-medium text-sm text-base-content/80">No scheduled messages</p>
              <p className="mt-1 text-xs text-base-content/50 max-w-xs">
                Messages you schedule will be queued here and sent automatically at the chosen time.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((it) => {
                const id = it._id || it.id;
                const isItemEditing = editingId === id;
                const displayText = it.text || it.decryptedText || "(Encrypted message)";

                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    transition={spring}
                    className="flex flex-col rounded-xl border border-base-300/80 bg-base-200/30 p-3 hover:bg-base-200/50 transition-colors"
                  >
                    {isItemEditing ? (
                      <div className="space-y-2.5">
                        <textarea
                          className="textarea textarea-bordered textarea-sm w-full rounded-lg text-sm"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          maxLength={2000}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="datetime-local"
                            className="input input-bordered input-xs rounded-lg text-xs flex-1 min-w-[180px]"
                            value={editTime}
                            min={toLocalInput(new Date(Date.now() + 60_000))}
                            onChange={(e) => setEditTime(e.target.value)}
                          />
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs rounded-lg text-xs"
                              onClick={cancelEditing}
                              disabled={editBusy}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-xs rounded-lg text-xs"
                              onClick={() => saveEdit(it)}
                              disabled={editBusy}
                            >
                              {editBusy ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-3 text-sm text-base-content [overflow-wrap:anywhere]">
                            {displayText}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                            <span className="inline-flex items-center gap-1 rounded-md bg-base-200 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                              <Clock className="size-3" />
                              {formatRelativeScheduledTime(it.scheduledFor)}
                            </span>
                            <span className="text-[11px] text-base-content/40">
                              {new Date(it.scheduledFor).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onEdit && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                              onClick={() => startEditing(it)}
                              title="Edit scheduled message"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-circle text-error/80 hover:text-error hover:bg-error/10"
                            onClick={() => onCancel(id)}
                            title="Cancel scheduled message"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-base-200 flex justify-end shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl font-normal text-base-content/70"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
