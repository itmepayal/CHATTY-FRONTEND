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
  Globe,
  Plus,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { customToast } from "../../toast/customToastService.js";

const spring = { type: "spring", stiffness: 380, damping: 28 };

/**
 * Converts Date to YYYY-MM-DDTHH:mm for datetime-local input
 */
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

/**
 * Returns formatted user timezone and GMT offset (e.g., "Asia/Kolkata (GMT+05:30)")
 */
export const getTimezoneInfo = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
    const hours = pad(offsetMin / 60);
    const mins = pad(offsetMin % 60);
    return `${tz} (GMT${sign}${hours}:${mins})`;
  } catch {
    return "Local Timezone";
  }
};

/**
 * Formats a relative timestamp (e.g. "Today at 7:00 PM (in ~2h)")
 */
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
/*  ScheduleModal - Compose, Preview & Pick Time                      */
/* ------------------------------------------------------------------ */
export const ScheduleModal = ({
  text = "",
  onClose,
  onConfirm,
  recipient = null,
  isGroup = false,
}) => {
  const [messageText, setMessageText] = useState(text || "");
  const [busy, setBusy] = useState(false);
  const [activePreset, setActivePreset] = useState("later_today");

  const now = Date.now();

  // Smart preset date calculations
  const presetDates = useMemo(() => {
    const base = new Date();

    // 1. Later today:
    // If before 4 PM, set to 2 hours from now.
    // If between 4 PM and 8:30 PM, set to 9:00 PM tonight.
    // If after 8:30 PM, set to 11:00 PM or in 1 hour.
    const laterToday = new Date(base);
    const curHour = base.getHours();
    if (curHour < 16) {
      laterToday.setTime(base.getTime() + 2 * 60 * 60 * 1000);
      laterToday.setMinutes(0, 0, 0);
    } else if (curHour < 21) {
      laterToday.setHours(21, 0, 0, 0);
    } else {
      laterToday.setTime(base.getTime() + 60 * 60 * 1000);
    }

    // 2. Tomorrow morning (9:00 AM)
    const tmwMorn = new Date(base);
    tmwMorn.setDate(base.getDate() + 1);
    tmwMorn.setHours(9, 0, 0, 0);

    // 3. Tomorrow evening (6:00 PM)
    const tmwEve = new Date(base);
    tmwEve.setDate(base.getDate() + 1);
    tmwEve.setHours(18, 0, 0, 0);

    return {
      later_today: laterToday,
      tomorrow_morning: tmwMorn,
      tomorrow_evening: tmwEve,
    };
  }, []);

  // Initialize input value to "later today" preset
  const [value, setValue] = useState(() => toLocalInput(presetDates.later_today));

  // Bounds: min 1 minute from now, max 30 days
  const min = toLocalInput(new Date(now + 60 * 1000));
  const max = toLocalInput(new Date(now + 30 * 86_400_000));

  const selectPreset = (presetKey) => {
    setActivePreset(presetKey);
    if (presetDates[presetKey]) {
      setValue(toLocalInput(presetDates[presetKey]));
    }
  };

  const handleCustomDateChange = (e) => {
    setValue(e.target.value);
    setActivePreset("custom");
  };

  const submit = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return customToast.error("Please enter a message to schedule.");
    }

    const when = new Date(value);
    if (Number.isNaN(when.getTime())) {
      return customToast.error("Please select a valid date and time.");
    }

    if (when.getTime() < Date.now() + 30_000) {
      return customToast.error(
        "Scheduled time must be in the future (at least 1 minute from now).",
      );
    }

    if (when.getTime() > Date.now() + 30 * 86_400_000) {
      return customToast.error("Scheduled time cannot exceed 30 days from now.");
    }

    setBusy(true);
    try {
      const ok = await onConfirm(when.toISOString(), trimmed);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  const selectedDate = useMemo(() => new Date(value), [value]);

  const recipientName =
    recipient?.fullName ||
    recipient?.name ||
    (isGroup ? "this group" : "recipient");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={spring}
        className="relative w-full max-w-md rounded-3xl border border-base-300 bg-base-100 p-5 sm:p-6 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Calendar className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-base-content">
                Schedule Message
              </h3>
              <p className="text-xs text-base-content/60">
                To {recipientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message preview / composer */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-base-content/80 flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-primary" />
              Message Preview
            </span>
            <span className="text-[11px] text-base-content/50">
              {messageText.length}/2000
            </span>
          </div>
          <textarea
            className="textarea textarea-bordered textarea-sm w-full rounded-2xl text-sm leading-relaxed bg-base-200/40 focus:bg-base-100 transition-colors resize-none"
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type the message you want to schedule..."
            maxLength={2000}
            disabled={busy}
          />
        </div>

        {/* Convenient Presets */}
        <div className="mt-4">
          <span className="block text-xs font-semibold text-base-content/80 mb-2 px-0.5">
            Choose Delivery Time
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activePreset === "later_today"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                  : "border-base-300 bg-base-200/40 hover:bg-base-200 text-base-content/80"
              }`}
              onClick={() => selectPreset("later_today")}
            >
              <span className="truncate">Later today</span>
              <span className="text-[11px] opacity-70">
                {presetDates.later_today.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </button>

            <button
              type="button"
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activePreset === "tomorrow_morning"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                  : "border-base-300 bg-base-200/40 hover:bg-base-200 text-base-content/80"
              }`}
              onClick={() => selectPreset("tomorrow_morning")}
            >
              <span className="truncate">Tomorrow morn</span>
              <span className="text-[11px] opacity-70">9:00 AM</span>
            </button>

            <button
              type="button"
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activePreset === "tomorrow_evening"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                  : "border-base-300 bg-base-200/40 hover:bg-base-200 text-base-content/80"
              }`}
              onClick={() => selectPreset("tomorrow_evening")}
            >
              <span className="truncate">Tomorrow eve</span>
              <span className="text-[11px] opacity-70">6:00 PM</span>
            </button>

            <button
              type="button"
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                activePreset === "custom"
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                  : "border-base-300 bg-base-200/40 hover:bg-base-200 text-base-content/80"
              }`}
              onClick={() => selectPreset("custom")}
            >
              <span>Custom time</span>
              <Clock className="size-3.5 opacity-70" />
            </button>
          </div>
        </div>

        {/* Datetime Picker Input */}
        <div className="mt-3.5">
          <input
            type="datetime-local"
            className="input input-bordered input-sm w-full rounded-xl text-xs sm:text-sm font-mono bg-base-200/30"
            value={value}
            min={min}
            max={max}
            onChange={handleCustomDateChange}
            disabled={busy}
          />

          {/* Time & Timezone preview */}
          <div className="mt-2 space-y-1 px-0.5">
            <p className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <Calendar className="size-3.5" />
              <span>{formatRelativeScheduledTime(selectedDate)}</span>
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-base-content/55">
              <Globe className="size-3 text-base-content/40 shrink-0" />
              <span>Timezone: {getTimezoneInfo()}</span>
            </p>
          </div>
        </div>

        {/* Modal actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-base-200">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl font-normal text-base-content/70 cursor-pointer"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-xl px-4 gap-2 text-xs font-semibold cursor-pointer shadow-sm"
            onClick={submit}
            disabled={busy || !messageText.trim()}
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Clock className="size-3.5" />
                Schedule Message
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ScheduledModal - List, Edit, Cancel & Send Now                    */
/* ------------------------------------------------------------------ */
export const ScheduledModal = ({
  items = [],
  onClose,
  onCancel,
  onEdit,
  onSendNow,
  onOpenSchedule,
  recipient = null,
  isGroup = false,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [sendingId, setSendingId] = useState(null);

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
      return customToast.error("Please pick a valid time.");
    }
    if (when.getTime() < Date.now() + 30_000) {
      return customToast.error("Scheduled time must be at least 1 minute in the future.");
    }
    setEditBusy(true);
    try {
      const ok = await onEdit?.(id, editText.trim(), when.toISOString());
      if (ok) {
        setEditingId(null);
      }
    } finally {
      setEditBusy(false);
    }
  };

  const handleSendNow = async (item) => {
    const id = item._id || item.id;
    setSendingId(id);
    try {
      await onSendNow?.(id);
    } finally {
      setSendingId(null);
    }
  };

  const recipientName =
    recipient?.fullName ||
    recipient?.name ||
    (isGroup ? "Group Conversation" : "Direct Message");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !editBusy && !sendingId) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={spring}
        className="relative w-full max-w-lg rounded-3xl border border-base-300 bg-base-100 p-5 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-base-content">
                  Scheduled Messages
                </h3>
                <span className="badge badge-primary badge-xs font-semibold">
                  {items.length}
                </span>
              </div>
              <p className="text-xs text-base-content/60">
                {recipientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSchedule && items.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-xs rounded-xl gap-1 text-xs font-semibold cursor-pointer shadow-xs"
                onClick={onOpenSchedule}
              >
                <Plus className="size-3.5" />
                Schedule New
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Messages List / Empty State */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-base-content/60">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-base-200/80 mb-4 text-primary shadow-inner">
                <Clock className="size-8" />
              </div>
              <h4 className="font-bold text-base text-base-content">
                No scheduled messages
              </h4>
              <p className="mt-1 text-xs text-base-content/60 max-w-xs leading-relaxed">
                Messages you schedule will be queued here and automatically delivered at the specified time.
              </p>

              {onOpenSchedule && (
                <button
                  type="button"
                  className="mt-5 btn btn-primary btn-sm rounded-xl gap-2 text-xs font-semibold cursor-pointer shadow-sm hover:shadow"
                  onClick={onOpenSchedule}
                >
                  <Calendar className="size-3.5" />
                  Schedule a Message
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((it) => {
                const id = it._id || it.id;
                const isItemEditing = editingId === id;
                const isSendingThis = sendingId === id;
                const displayText =
                  it.text || it.decryptedText || "(Encrypted message)";

                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    transition={spring}
                    className="flex flex-col rounded-2xl border border-base-300 bg-base-200/40 p-4 hover:bg-base-200/60 transition-all shadow-xs"
                  >
                    {isItemEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-base-content/70 mb-1">
                            Edit Message Content
                          </label>
                          <textarea
                            className="textarea textarea-bordered textarea-sm w-full rounded-xl text-sm leading-relaxed"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            maxLength={2000}
                            disabled={editBusy}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-semibold text-base-content/70 mb-1">
                              Edit Scheduled Time
                            </label>
                            <input
                              type="datetime-local"
                              className="input input-bordered input-xs rounded-xl text-xs font-mono w-full"
                              value={editTime}
                              min={toLocalInput(new Date(Date.now() + 60_000))}
                              onChange={(e) => setEditTime(e.target.value)}
                              disabled={editBusy}
                            />
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-end mt-2 sm:mt-0">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs rounded-lg text-xs cursor-pointer"
                              onClick={cancelEditing}
                              disabled={editBusy}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-xs rounded-lg text-xs gap-1 font-semibold cursor-pointer shadow-xs"
                              onClick={() => saveEdit(it)}
                              disabled={editBusy || !editText.trim()}
                            >
                              {editBusy ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Check className="size-3" />
                              )}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Recipient / Conversation tag */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Clock className="size-2.5" />
                                Pending Delivery
                              </span>
                              <span className="text-[11px] text-base-content/60 font-medium truncate">
                                To: {recipientName}
                              </span>
                            </div>

                            <p className="line-clamp-3 text-sm text-base-content leading-relaxed [overflow-wrap:anywhere]">
                              {displayText}
                            </p>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {onSendNow && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-circle text-primary hover:bg-primary/10 cursor-pointer"
                                onClick={() => handleSendNow(it)}
                                disabled={isSendingThis}
                                title="Send now"
                                aria-label="Send now"
                              >
                                {isSendingThis ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Send className="size-3.5" />
                                )}
                              </button>
                            )}

                            {onEdit && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
                                onClick={() => startEditing(it)}
                                title="Edit schedule"
                                aria-label="Edit schedule"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-circle text-error/80 hover:text-error hover:bg-error/10 cursor-pointer"
                              onClick={() => onCancel(id)}
                              title="Cancel scheduled message"
                              aria-label="Cancel scheduled message"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Scheduled Time info bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-base-300/40 text-xs text-base-content/60">
                          <div className="flex items-center gap-1.5 text-primary font-medium">
                            <Clock className="size-3.5" />
                            <span>{formatRelativeScheduledTime(it.scheduledFor)}</span>
                          </div>
                          <span className="text-[11px] text-base-content/45 font-mono">
                            {new Date(it.scheduledFor).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3.5 border-t border-base-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-base-content/50">
            Timezone: {getTimezoneInfo()}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl text-xs font-semibold cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
