import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { customToast } from "../../toast/customToastService.js";

const spring = { type: "spring", stiffness: 380, damping: 28 };

const MIN_LEAD_MS = 60 * 1000; // 1 minute
const MAX_LEAD_MS = 30 * 86_400_000; // 30 days

/* ------------------------------------------------------------------ */
/*  Shared layout classes (mobile = bottom sheet, sm+ = centered card) */
/* ------------------------------------------------------------------ */
const overlayCls =
  "fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-200";

const panelBase =
  "relative flex w-full flex-col overflow-hidden border border-base-300 bg-base-100 shadow-2xl " +
  "rounded-t-3xl sm:rounded-3xl " +
  "max-h-[92dvh] sm:max-h-[85dvh]";

const sectionPad = "px-4 sm:px-6";

// 44px touch targets on touch devices, compact on desktop
const iconBtn =
  "btn btn-ghost btn-circle shrink-0 size-10 min-h-0 sm:size-8 cursor-pointer";

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */
const useModalBehavior = (onClose, locked) => {
  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !locked) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, locked]);
};

/**
 * Converts Date to YYYY-MM-DDTHH:mm for datetime-local input
 */
export const toLocalInput = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    return `${tz} (GMT${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)})`;
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

  if (diffMin < 60) return `in ${diffMin} min (${timeStr})`;

  if (target.toDateString() === now.toDateString()) {
    return `Today at ${timeStr} (in ~${diffHrs}h)`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (target.toDateString() === tomorrow.toDateString()) {
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

  useModalBehavior(onClose, busy);

  const presetDates = useMemo(() => {
    const base = new Date();

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

    const tmwMorn = new Date(base);
    tmwMorn.setDate(base.getDate() + 1);
    tmwMorn.setHours(9, 0, 0, 0);

    const tmwEve = new Date(base);
    tmwEve.setDate(base.getDate() + 1);
    tmwEve.setHours(18, 0, 0, 0);

    return {
      later_today: laterToday,
      tomorrow_morning: tmwMorn,
      tomorrow_evening: tmwEve,
    };
  }, []);

  const [value, setValue] = useState(() =>
    toLocalInput(presetDates.later_today),
  );

  const { min, max } = useMemo(() => {
    const n = Date.now();
    return {
      min: toLocalInput(new Date(n + MIN_LEAD_MS)),
      max: toLocalInput(new Date(n + MAX_LEAD_MS)),
    };
  }, []);

  const presets = [
    {
      key: "later_today",
      label: "Later today",
      meta: presetDates.later_today.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    },
    { key: "tomorrow_morning", label: "Tomorrow morning", meta: "9:00 AM" },
    { key: "tomorrow_evening", label: "Tomorrow evening", meta: "6:00 PM" },
    { key: "custom", label: "Custom time", icon: Clock },
  ];

  const selectPreset = (key) => {
    setActivePreset(key);
    if (presetDates[key]) setValue(toLocalInput(presetDates[key]));
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

    if (when.getTime() > Date.now() + MAX_LEAD_MS) {
      return customToast.error(
        "Scheduled time cannot exceed 30 days from now.",
      );
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
      className={overlayCls}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule message"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={spring}
        className={`${panelBase} sm:max-w-md`}
      >
        {/* Drag-handle affordance (mobile only) */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-base-300" />
        </div>

        {/* Header */}
        <div
          className={`${sectionPad} flex shrink-0 items-center justify-between gap-3 border-b border-base-200 py-3 sm:pt-5`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-base-content">
                Schedule Message
              </h3>
              <p className="truncate text-xs text-base-content/60">
                To {recipientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${iconBtn} text-base-content/60 hover:text-base-content`}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className={`${sectionPad} min-h-0 flex-1 overflow-y-auto overscroll-contain py-4`}
        >
          {/* Message preview / composer */}
          <div>
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-base-content/80">
                <MessageSquare className="size-3.5 text-primary" />
                Message Preview
              </span>
              <span className="text-[11px] tabular-nums text-base-content/50">
                {messageText.length}/2000
              </span>
            </div>
            {/* text-base on mobile prevents iOS focus-zoom */}
            <textarea
              className="textarea textarea-bordered w-full resize-none rounded-2xl bg-base-200/40 text-base leading-relaxed transition-colors focus:bg-base-100 sm:text-sm"
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type the message you want to schedule..."
              maxLength={2000}
              disabled={busy}
            />
          </div>

          {/* Presets */}
          <div className="mt-4">
            <span className="mb-2 block px-0.5 text-xs font-semibold text-base-content/80">
              Choose Delivery Time
            </span>
            <div className="grid grid-cols-1 gap-2 text-xs min-[380px]:grid-cols-2">
              {presets.map(({ key, label, meta, icon: Icon }) => {
                const active = activePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer sm:min-h-10 ${
                      active
                        ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs"
                        : "border-base-300 bg-base-200/40 text-base-content/80 hover:bg-base-200"
                    }`}
                    onClick={() => selectPreset(key)}
                    disabled={busy}
                  >
                    <span className="truncate">{label}</span>
                    {Icon ? (
                      <Icon className="size-3.5 shrink-0 opacity-70" />
                    ) : (
                      <span className="shrink-0 text-[11px] tabular-nums opacity-70">
                        {meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Datetime picker */}
          <div className="mt-3.5">
            <input
              type="datetime-local"
              className="input input-bordered block h-11 min-h-0 w-full min-w-0 max-w-full rounded-xl bg-base-200/30 font-mono text-base sm:h-9 sm:text-sm"
              value={value}
              min={min}
              max={max}
              onChange={handleCustomDateChange}
              disabled={busy}
              aria-label="Delivery date and time"
            />

            <div className="mt-2 space-y-1 px-0.5">
              <p className="flex items-start gap-1.5 text-xs font-semibold text-primary">
                <Calendar className="mt-px size-3.5 shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {formatRelativeScheduledTime(selectedDate)}
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-[11px] text-base-content/55">
                <Globe className="mt-px size-3 shrink-0 text-base-content/40" />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  Timezone: {getTimezoneInfo()}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions (safe-area aware) */}
        <div
          className={`${sectionPad} flex shrink-0 flex-col-reverse gap-2 border-t border-base-200 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-end sm:pb-5`}
        >
          <button
            type="button"
            className="btn btn-ghost h-11 min-h-0 w-full rounded-xl font-normal text-base-content/70 cursor-pointer min-[420px]:w-auto sm:h-8 sm:btn-sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary h-11 min-h-0 w-full gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm cursor-pointer min-[420px]:w-auto sm:h-8 sm:text-xs"
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

  useModalBehavior(onClose, editBusy || !!sendingId);

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
      return customToast.error(
        "Scheduled time must be at least 1 minute in the future.",
      );
    }
    if (when.getTime() > Date.now() + MAX_LEAD_MS) {
      return customToast.error(
        "Scheduled time cannot exceed 30 days from now.",
      );
    }
    setEditBusy(true);
    try {
      const ok = await onEdit?.(id, editText.trim(), when.toISOString());
      if (ok) setEditingId(null);
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
      className={overlayCls}
      role="dialog"
      aria-modal="true"
      aria-label="Scheduled messages"
      onClick={(e) => {
        if (e.target === e.currentTarget && !editBusy && !sendingId) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={spring}
        className={`${panelBase} h-auto sm:max-w-lg`}
      >
        {/* Drag-handle affordance (mobile only) */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-base-300" />
        </div>

        {/* Header */}
        <div
          className={`${sectionPad} flex shrink-0 items-center justify-between gap-2 border-b border-base-200 py-3 sm:pt-5`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-base-content">
                  Scheduled
                  <span className="hidden min-[360px]:inline"> Messages</span>
                </h3>
                <span className="badge badge-primary badge-xs shrink-0 font-semibold">
                  {items.length}
                </span>
              </div>
              <p className="truncate text-xs text-base-content/60">
                {recipientName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {onOpenSchedule && items.length > 0 && (
              <button
                type="button"
                className="btn btn-primary h-10 min-h-0 gap-1 rounded-xl px-3 text-xs font-semibold shadow-xs cursor-pointer sm:h-7 sm:px-2.5"
                onClick={onOpenSchedule}
                aria-label="Schedule new message"
              >
                <Plus className="size-3.5" />
                <span className="hidden min-[400px]:inline">Schedule New</span>
                <span className="min-[400px]:hidden">New</span>
              </button>
            )}
            <button
              type="button"
              className={`${iconBtn} text-base-content/60 hover:text-base-content`}
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* List / empty state */}
        <div
          className={`${sectionPad} min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-4`}
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-2 py-10 text-center text-base-content/60 sm:py-12">
              <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-base-200/80 text-primary shadow-inner">
                <Clock className="size-8" />
              </div>
              <h4 className="text-base font-bold text-base-content">
                No scheduled messages
              </h4>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-base-content/60">
                Messages you schedule will be queued here and automatically
                delivered at the specified time.
              </p>

              {onOpenSchedule && (
                <button
                  type="button"
                  className="btn btn-primary mt-5 h-11 min-h-0 gap-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer hover:shadow sm:h-8 sm:text-xs"
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
                    className="flex flex-col rounded-2xl border border-base-300 bg-base-200/40 p-3 shadow-xs transition-colors hover:bg-base-200/60 sm:p-4"
                  >
                    {isItemEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-base-content/70">
                            Edit Message Content
                          </label>
                          <textarea
                            className="textarea textarea-bordered w-full rounded-xl text-base leading-relaxed sm:text-sm"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            disabled={editBusy}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-base-content/70">
                            Edit Scheduled Time
                          </label>
                          <input
                            type="datetime-local"
                            className="input input-bordered block h-11 min-h-0 w-full min-w-0 max-w-full rounded-xl font-mono text-base sm:h-8 sm:text-xs"
                            value={editTime}
                            min={toLocalInput(
                              new Date(Date.now() + MIN_LEAD_MS),
                            )}
                            max={toLocalInput(
                              new Date(Date.now() + MAX_LEAD_MS),
                            )}
                            onChange={(e) => setEditTime(e.target.value)}
                            disabled={editBusy}
                          />
                        </div>

                        <div className="flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost h-11 min-h-0 w-full rounded-lg text-sm cursor-pointer min-[420px]:w-auto sm:h-7 sm:text-xs"
                            onClick={cancelEditing}
                            disabled={editBusy}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary h-11 min-h-0 w-full gap-1 rounded-lg text-sm font-semibold shadow-xs cursor-pointer min-[420px]:w-auto sm:h-7 sm:text-xs"
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
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                <Clock className="size-2.5" />
                                Pending Delivery
                              </span>
                              <span className="min-w-0 max-w-full truncate text-[11px] font-medium text-base-content/60">
                                To: {recipientName}
                              </span>
                            </div>

                            <p className="line-clamp-3 text-sm leading-relaxed text-base-content [overflow-wrap:anywhere]">
                              {displayText}
                            </p>
                          </div>

                          {/* Quick actions */}
                          <div className="flex shrink-0 items-center -mr-1 sm:mr-0 sm:gap-0.5">
                            {onSendNow && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-circle size-10 min-h-0 text-primary hover:bg-primary/10 cursor-pointer sm:size-8"
                                onClick={() => handleSendNow(it)}
                                disabled={isSendingThis}
                                title="Send now"
                                aria-label="Send now"
                              >
                                {isSendingThis ? (
                                  <Loader2 className="size-4 animate-spin sm:size-3.5" />
                                ) : (
                                  <Send className="size-4 sm:size-3.5" />
                                )}
                              </button>
                            )}

                            {onEdit && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-circle size-10 min-h-0 text-base-content/60 hover:text-base-content cursor-pointer sm:size-8"
                                onClick={() => startEditing(it)}
                                title="Edit schedule"
                                aria-label="Edit schedule"
                              >
                                <Edit2 className="size-4 sm:size-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-ghost btn-circle size-10 min-h-0 text-error/80 hover:bg-error/10 hover:text-error cursor-pointer sm:size-8"
                              onClick={() => onCancel(id)}
                              title="Cancel scheduled message"
                              aria-label="Cancel scheduled message"
                            >
                              <Trash2 className="size-4 sm:size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Time info bar */}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-base-300/40 pt-2 text-xs text-base-content/60">
                          <div className="flex min-w-0 items-center gap-1.5 font-medium text-primary">
                            <Clock className="size-3.5 shrink-0" />
                            <span className="min-w-0 [overflow-wrap:anywhere]">
                              {formatRelativeScheduledTime(it.scheduledFor)}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-base-content/45">
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

        {/* Footer (safe-area aware) */}
        <div
          className={`${sectionPad} flex shrink-0 items-center justify-between gap-3 border-t border-base-200 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4`}
        >
          <span className="min-w-0 truncate text-[11px] text-base-content/50">
            Timezone: {getTimezoneInfo()}
          </span>
          <button
            type="button"
            className="btn btn-ghost h-10 min-h-0 shrink-0 rounded-xl text-xs font-semibold cursor-pointer sm:h-8"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
