import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Calendar,
  Check,
  CheckSquare,
  Square,
  Loader2,
  MoreVertical,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  PhoneOff,
  Trash2,
  Users,
  Video,
  X,
  AlertTriangle,
  Filter,
  CheckCheck,
  MessageSquare,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useChatLockStore } from "../../store/useChatLockStore";
import { useCall } from "../../context/CallContext";
import GroupCallHistoryPanel from "../group/GroupCallHistoryPanel.jsx";
import CallAvatar from "./common/CallAvatar.jsx";
import { formatCallTimer } from "./common/callTokens.js";

/* ------------------------------------------------------------------ */
/*  Date Formatting Helper                                            */
/* ------------------------------------------------------------------ */
const formatCallDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* ------------------------------------------------------------------ */
/*  Call Description & Status Visuals Helper                          */
/* ------------------------------------------------------------------ */
const getCallDescription = (c) => {
  const isVideo = c.type === "video";
  const kind = isVideo ? "Video" : "Voice";
  const incoming = c.direction === "incoming";
  const missed = c.status === "missed" && incoming;

  let text;
  if (c.status === "completed") {
    text = `${kind} call · ${formatCallTimer(c.duration || 0)}`;
  } else if (c.status === "missed") {
    text = missed ? `Missed ${kind.toLowerCase()} call` : `${kind} call · No answer`;
  } else if (c.status === "rejected") {
    text = `${kind} call · Declined`;
  } else if (c.status === "cancelled") {
    text = `${kind} call · Cancelled`;
  } else {
    text = `${kind} call · ${c.status}`;
  }

  const Icon = missed
    ? PhoneMissed
    : incoming
      ? PhoneIncoming
      : PhoneOutgoing;

  return { text, Icon, missed, isVideo };
};

/* ------------------------------------------------------------------ */
/*  Confirmation Modal (Clear All / Single Delete / Bulk Delete)      */
/* ------------------------------------------------------------------ */
const CallConfirmModal = ({ isOpen, title, message, confirmText = "Delete", onConfirm, onCancel, isDestructive = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-base-100 p-5 shadow-2xl border border-base-300 text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/15 text-error">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-base-content">{title}</h3>
            <p className="mt-1 text-xs text-base-content/70 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-base-content/70 hover:bg-base-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
              isDestructive
                ? "bg-error hover:bg-error/90 shadow-error/20"
                : "bg-primary hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                  */
/* ------------------------------------------------------------------ */
const CallHistorySkeleton = () => (
  <div className="divide-y divide-base-200/60 p-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
        <div className="size-10 rounded-full bg-base-300/80 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3.5 w-1/3 rounded bg-base-300/80" />
          <div className="h-2.5 w-1/2 rounded bg-base-300/60" />
        </div>
        <div className="h-3 w-12 rounded bg-base-300/60 shrink-0" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Single Call History Row with Swipe, Long Press & Menu             */
/* ------------------------------------------------------------------ */
const CallHistoryRow = ({
  call,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onLongPress,
  onDeleteSingle,
  onOpenUser,
  onAfterOpen,
  onStartCall,
  callStatus,
}) => {
  const { text, Icon, missed, isVideo } = getCallDescription(call);
  const userName = call.user?.fullName || call.user?.name || "User";
  const callId = String(call.id || call.callId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pressTimerRef = useRef(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [menuOpen]);

  // Long press detection (500ms)
  const handlePointerDown = () => {
    pressTimerRef.current = setTimeout(() => {
      onLongPress(callId);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(40); } catch { /* ignore vibration errors */ }
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handlePointerCancel = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.15 }}
      className={`group relative flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
        isSelected
          ? "bg-primary/10 hover:bg-primary/15"
          : "hover:bg-base-200/50"
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <button
          type="button"
          onClick={() => onToggleSelect(callId)}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-base-300/60 transition-colors"
          aria-label={isSelected ? "Deselect call" : "Select call"}
        >
          {isSelected ? (
            <CheckSquare className="size-5 text-primary" />
          ) : (
            <Square className="size-5 text-base-content/40" />
          )}
        </button>
      )}

      {/* Main Content Area */}
      <button
        type="button"
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect(callId);
          } else {
            if (call.user?.id) onOpenUser?.(call.user.id);
            onAfterOpen?.();
          }
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
      >
        <CallAvatar
          src={call.user?.avatar}
          name={userName}
          size="sm"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-semibold text-sm ${
              missed ? "text-error" : "text-base-content"
            }`}
          >
            {userName}
          </div>

          <div
            className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${
              missed ? "text-error font-medium" : "text-base-content/60"
            }`}
          >
            <Icon
              className={`size-3.5 shrink-0 ${
                missed
                  ? "text-error"
                  : call.direction === "outgoing"
                    ? "text-primary"
                    : "text-success"
              }`}
            />
            <span className="truncate">{text}</span>
          </div>
        </div>

        <span className="shrink-0 text-[11px] text-base-content/50 tabular-nums">
          {formatCallDate(call.startedAt || call.createdAt)}
        </span>
      </button>

      {/* Action Buttons: Quick Call Back & Three-Dot Context Menu */}
      {!isSelectionMode && (
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Quick Call Back Button */}
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10"
            disabled={callStatus !== "idle"}
            onClick={() => {
              if (call.user?.id) {
                onStartCall(
                  { id: call.user.id, fullName: userName, avatar: call.user?.avatar },
                  call.type || "audio",
                );
              }
              onAfterOpen?.();
            }}
            aria-label={`Call ${userName} again`}
            title={`Call ${userName} again`}
          >
            {isVideo ? <Video className="size-4" /> : <Phone className="size-4" />}
          </button>

          {/* Three-Dot Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content"
            aria-label="More options"
            title="More options"
          >
            <MoreVertical className="size-4" />
          </button>

          {/* Contextual Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-10 z-30 w-44 rounded-xl bg-base-100 p-1.5 shadow-xl border border-base-300 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (call.user?.id) {
                    onStartCall(
                      { id: call.user.id, fullName: userName, avatar: call.user?.avatar },
                      "audio",
                    );
                  }
                  onAfterOpen?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
              >
                <Phone className="size-3.5 text-primary" />
                <span>Voice Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (call.user?.id) {
                    onStartCall(
                      { id: call.user.id, fullName: userName, avatar: call.user?.avatar },
                      "video",
                    );
                  }
                  onAfterOpen?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
              >
                <Video className="size-3.5 text-success" />
                <span>Video Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (call.user?.id) onOpenUser?.(call.user.id);
                  onAfterOpen?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
              >
                <MessageSquare className="size-3.5 text-base-content/60" />
                <span>Open Chat</span>
              </button>

              <div className="my-1 border-t border-base-200" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLongPress(callId);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
              >
                <CheckSquare className="size-3.5 text-base-content/60" />
                <span>Select</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteSingle(call);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Call</span>
              </button>
            </div>
          )}
        </div>
      )}
    </motion.li>
  );
};

/* ------------------------------------------------------------------ */
/*  Personal Calls Component                                          */
/* ------------------------------------------------------------------ */
const PersonalCalls = ({ onOpenUser, onAfterOpen }) => {
  const calls = useCallHistoryStore((s) => s.calls);
  const isLoading = useCallHistoryStore((s) => s.isLoading);
  const fetchCalls = useCallHistoryStore((s) => s.fetchCalls);
  const deleteCall = useCallHistoryStore((s) => s.deleteCall);
  const deleteBulkCalls = useCallHistoryStore((s) => s.deleteBulkCalls);
  const clearAllCalls = useCallHistoryStore((s) => s.clearAllCalls);

  const selectedCallIds = useCallHistoryStore((s) => s.selectedCallIds);
  const isSelectionMode = useCallHistoryStore((s) => s.isSelectionMode);
  const enterSelectionMode = useCallHistoryStore((s) => s.enterSelectionMode);
  const exitSelectionMode = useCallHistoryStore((s) => s.exitSelectionMode);
  const toggleSelectCall = useCallHistoryStore((s) => s.toggleSelectCall);
  const selectAllCalls = useCallHistoryStore((s) => s.selectAllCalls);
  const deselectAllCalls = useCallHistoryStore((s) => s.deselectAllCalls);

  const { startCall, status } = useCall();

  // Active filters
  const [activeFilter, setActiveFilter] = useState("all"); // all | missed | incoming | outgoing
  const [typeFilter, setTypeFilter] = useState("all"); // all | audio | video

  // Confirmation Modals State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: () => {},
  });

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const topMenuRef = useRef(null);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Close top menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleOutside = (e) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [moreMenuOpen]);

  // Filtered Calls Computation
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // Direction / Status filter
      if (activeFilter === "missed") {
        if (!(c.status === "missed" && c.direction === "incoming")) return false;
      } else if (activeFilter === "incoming") {
        if (c.direction !== "incoming") return false;
      } else if (activeFilter === "outgoing") {
        if (c.direction !== "outgoing") return false;
      }

      // Type filter (Audio / Video)
      if (typeFilter === "audio" && c.type !== "audio") return false;
      if (typeFilter === "video" && c.type !== "video") return false;

      return true;
    });
  }, [calls, activeFilter, typeFilter]);

  // Counts for Badges
  const counts = useMemo(() => {
    let missed = 0;
    let incoming = 0;
    let outgoing = 0;
    for (const c of calls) {
      if (c.status === "missed" && c.direction === "incoming") missed++;
      if (c.direction === "incoming") incoming++;
      if (c.direction === "outgoing") outgoing++;
    }
    return { all: calls.length, missed, incoming, outgoing };
  }, [calls]);

  // Confirmation Handlers
  const handleConfirmSingleDelete = useCallback((call) => {
    const userName = call.user?.fullName || call.user?.name || "this user";
    const callId = call.id || call.callId;
    setModalConfig({
      isOpen: true,
      title: "Delete Call Record",
      message: `Remove this call with ${userName} from your history? Other participants will keep their records.`,
      confirmText: "Delete",
      onConfirm: async () => {
        setModalConfig((m) => ({ ...m, isOpen: false }));
        await deleteCall(callId);
      },
    });
  }, [deleteCall]);

  const handleConfirmBulkDelete = useCallback(() => {
    const count = selectedCallIds.length;
    if (!count) return;
    setModalConfig({
      isOpen: true,
      title: `Delete ${count} Call${count > 1 ? "s" : ""}`,
      message: `Are you sure you want to remove ${count} selected call record${count > 1 ? "s" : ""} from your history? Other participants will keep their records.`,
      confirmText: `Delete (${count})`,
      onConfirm: async () => {
        setModalConfig((m) => ({ ...m, isOpen: false }));
        await deleteBulkCalls(selectedCallIds);
      },
    });
  }, [selectedCallIds, deleteBulkCalls]);

  const handleConfirmClearAll = useCallback(() => {
    const total = calls.length;
    if (!total) return;
    setModalConfig({
      isOpen: true,
      title: "Clear All Call History",
      message: `Are you sure you want to clear your entire call history? This will permanently remove all ${total} record${total > 1 ? "s" : ""} from your account. Other participants will not be affected.`,
      confirmText: "Clear All",
      onConfirm: async () => {
        setModalConfig((m) => ({ ...m, isOpen: false }));
        await clearAllCalls();
      },
    });
  }, [calls.length, clearAllCalls]);

  const allFilteredSelected =
    filteredCalls.length > 0 &&
    filteredCalls.every((c) => selectedCallIds.includes(String(c.id || c.callId)));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      deselectAllCalls();
    } else {
      selectAllCalls(filteredCalls.map((c) => String(c.id || c.callId)));
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 select-none">
      {/* 1. Multi-Select Floating Toolbar OR Normal Filter Bar */}
      {isSelectionMode ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              {allFilteredSelected ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4 text-base-content/50" />
              )}
              <span>{allFilteredSelected ? "Deselect All" : "Select All"}</span>
            </button>
            <span className="text-base-content/40">•</span>
            <span className="text-xs font-bold text-base-content">
              {selectedCallIds.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmBulkDelete}
              disabled={selectedCallIds.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-error px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-error/90 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
              title="Cancel Selection"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col border-b border-base-200">
          {/* Status / Direction Filter Tabs */}
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "all", label: "All" },
                { id: "missed", label: "Missed", count: counts.missed },
                { id: "incoming", label: "Incoming" },
                { id: "outgoing", label: "Outgoing" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeFilter === f.id
                      ? "bg-primary text-primary-content shadow-xs"
                      : "bg-base-200/80 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== undefined && f.count > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded-full ${
                        activeFilter === f.id
                          ? "bg-white/20 text-white"
                          : "bg-error text-white font-bold"
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Actions: Select Mode & Three-Dot Menu */}
            <div className="flex items-center gap-1 shrink-0 relative" ref={topMenuRef}>
              {calls.length > 0 && (
                <button
                  type="button"
                  onClick={() => enterSelectionMode()}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-base-content/70 hover:bg-base-200 hover:text-base-content transition-colors"
                >
                  Select
                </button>
              )}

              <button
                type="button"
                onClick={() => setMoreMenuOpen((o) => !o)}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content"
                aria-label="Call options"
                title="Options"
              >
                <MoreVertical className="size-4" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-48 rounded-xl bg-base-100 p-1.5 shadow-xl border border-base-300 animate-in fade-in zoom-in-95 duration-150">
                  {calls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        enterSelectionMode();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-base-content hover:bg-base-200 transition-colors"
                    >
                      <CheckSquare className="size-3.5 text-primary" />
                      <span>Select Calls</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      fetchCalls();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-base-content hover:bg-base-200 transition-colors"
                  >
                    <Loader2 className="size-3.5 text-base-content/60" />
                    <span>Refresh History</span>
                  </button>

                  {calls.length > 0 && (
                    <>
                      <div className="my-1 border-t border-base-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          handleConfirmClearAll();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-error hover:bg-error/10 transition-colors font-medium"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Clear All Call History</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Secondary Type Filter Pills: All Types | Voice | Video */}
          <div className="flex items-center gap-1.5 px-4 pb-2 pt-0.5 text-xs">
            <span className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider mr-1">
              Type:
            </span>
            {[
              { id: "all", label: "All" },
              { id: "audio", label: "Voice", icon: Phone },
              { id: "video", label: "Video", icon: Video },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    typeFilter === t.id
                      ? "bg-base-content text-base-100 font-bold"
                      : "bg-base-200/60 text-base-content/60 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  {Icon && <Icon className="size-3" />}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Call History List / Skeleton / Empty State */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !calls.length ? (
          <CallHistorySkeleton />
        ) : !calls.length ? (
          /* Empty History: Professional Default Screen */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-base-200 border border-base-300 shadow-sm text-base-content/40 mb-4">
              <PhoneOff className="size-8" />
            </div>
            <h3 className="font-bold text-base text-base-content">
              No call history yet
            </h3>
            <p className="mt-1 text-xs text-base-content/60 max-w-xs leading-relaxed">
              Your voice and video calls will appear here.
            </p>
          </div>
        ) : !filteredCalls.length ? (
          /* Filtered empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-base-content/60 gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 border border-base-300">
              <Filter className="size-6 text-base-content/40" />
            </div>
            <div>
              <p className="font-semibold text-base-content text-sm">
                No matching calls found
              </p>
              <p className="text-xs text-base-content/60 mt-0.5 max-w-xs">
                No call records match your current filter settings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setTypeFilter("all");
              }}
              className="mt-1 rounded-xl bg-base-200 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-base-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-base-200/80">
            <AnimatePresence initial={false}>
              {filteredCalls.map((c) => {
                const callId = String(c.id || c.callId);
                const isSelected = selectedCallIds.includes(callId);
                return (
                  <CallHistoryRow
                    key={callId}
                    call={c}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={toggleSelectCall}
                    onLongPress={(id) => {
                      if (!isSelectionMode) enterSelectionMode(id);
                      else toggleSelectCall(id);
                    }}
                    onDeleteSingle={handleConfirmSingleDelete}
                    onOpenUser={onOpenUser}
                    onAfterOpen={onAfterOpen}
                    onStartCall={startCall}
                    callStatus={status}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Confirmation Modal */}
      <CallConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Export: CallHistoryPanel (Direct Calls & Group Calls Tabs)   */
/* ------------------------------------------------------------------ */
export default function CallHistoryPanel({ onOpenGroup, onAfterOpen }) {
  const [tab, setTab] = useState("personal");
  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);

  const openUser = (id) => {
    if (useChatLockStore.getState().isChatLocked(id)) {
      useChatLockStore.getState().openUnlockModal(id);
      return;
    }
    const u = users?.find?.((x) => String(x.id) === String(id));
    if (u) setSelectedUser(u);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100">
      {/* Tab Switcher: Direct Calls vs Group Calls */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-base-200 border border-base-300">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
              tab === "personal"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/65 hover:text-base-content"
            }`}
            onClick={() => setTab("personal")}
          >
            <Phone className="size-3.5" />
            <span>Direct Calls</span>
          </button>

          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
              tab === "groups"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/65 hover:text-base-content"
            }`}
            onClick={() => setTab("groups")}
          >
            <Users className="size-3.5" />
            <span>Group Calls</span>
          </button>
        </div>
      </div>

      {/* Tab Viewport */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "personal" ? (
          <PersonalCalls onOpenUser={openUser} onAfterOpen={onAfterOpen} />
        ) : (
          <GroupCallHistoryPanel onOpenGroup={onOpenGroup} />
        )}
      </div>
    </div>
  );
}
