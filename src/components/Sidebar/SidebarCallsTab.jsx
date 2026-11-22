import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Info,
  MessageSquare,
  MoreVertical,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Plus,
  Search,
  Square,
  Trash2,
  User,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  Avatar,
  EmptyState,
  ListSkeleton,
} from "./SidebarComponents.jsx";
import {
  avatarSrc,
  formatDuration,
  formatListTime,
} from "./sidebarUtils.js";
import { useCallHistoryStore } from "../../store/useCallHistoryStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { useCall } from "../../context/CallContext.jsx";
import CallDetailsModal from "../modal/CallDetailsModal.jsx";

/* ------------------------------------------------------------------ */
/*  Call Confirmation Modal (Single Delete, Bulk Delete, Clear All)   */
/* ------------------------------------------------------------------ */
const CallConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  onConfirm,
  onCancel,
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-base-100 p-5 shadow-2xl border border-base-300 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-error/15 text-error mt-0.5 shadow-2xs">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-base-content leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-base-content/70 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
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
            className={`rounded-xl px-4.5 py-2 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
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
/*  Main Redesigned SidebarCallsTab Component                         */
/* ------------------------------------------------------------------ */
export const SidebarCallsTab = ({
  callsInitialLoading,
  filteredCalls = [],
  openFromCall,
  q,
  callFilter,
  setCallFilter,
  onOpenNewCall,
}) => {
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

  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const { startCall, status: callStatus } = useCall();

  // Active context menu tracking (callId or null)
  const [openMenuCallId, setOpenMenuCallId] = useState(null);
  const menuContainerRef = useRef(null);

  // Top header overflow menu tracking
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const topMenuRef = useRef(null);

  // Detailed call view modal
  const [detailsCall, setDetailsCall] = useState(null);

  // Confirmation Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: () => {},
  });

  // Long press timer ref (500ms)
  const pressTimerRef = useRef(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!openMenuCallId && !topMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target) &&
        topMenuRef.current &&
        !topMenuRef.current.contains(e.target)
      ) {
        setOpenMenuCallId(null);
        setTopMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenMenuCallId(null);
        setTopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuCallId, topMenuOpen]);

  // Compute selectable call IDs from currently filtered calls
  const selectableCallIds = useMemo(() => {
    return filteredCalls.map((c) => String(c.callId || c.id));
  }, [filteredCalls]);

  const allFilteredSelected =
    selectableCallIds.length > 0 &&
    selectableCallIds.every((id) => selectedCallIds.includes(id));

  // Toggle select all / deselect all
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      deselectAllCalls();
    } else {
      selectAllCalls(selectableCallIds);
    }
  };

  // Confirmation Handlers
  const handleConfirmSingleDelete = useCallback(
    (call) => {
      const userName = call.name || "this user";
      const callId = call.callId || call.id;
      setModalConfig({
        isOpen: true,
        title: "Delete Call History?",
        message: `Remove this call with ${userName} from your history? Other participants will still have this call in their history.`,
        confirmText: "Delete",
        onConfirm: async () => {
          setModalConfig((m) => ({ ...m, isOpen: false }));
          await deleteCall(callId);
        },
      });
    },
    [deleteCall],
  );

  const handleConfirmBulkDelete = useCallback(() => {
    const count = selectedCallIds.length;
    if (!count) return;
    setModalConfig({
      isOpen: true,
      title: `Delete ${count} Call${count > 1 ? "s" : ""}?`,
      message: `Are you sure you want to remove ${count} selected call record${
        count > 1 ? "s" : ""
      } from your history? Other participants will still have these calls in their history.`,
      confirmText: `Delete (${count})`,
      onConfirm: async () => {
        setModalConfig((m) => ({ ...m, isOpen: false }));
        await deleteBulkCalls(selectedCallIds);
      },
    });
  }, [selectedCallIds, deleteBulkCalls]);

  const handleConfirmClearAll = useCallback(() => {
    const total = filteredCalls.length;
    if (!total) return;
    setModalConfig({
      isOpen: true,
      title: "Clear All Call History?",
      message:
        "Are you sure you want to clear your entire call history? All call records will be removed from your account. Other participants will not be affected.",
      confirmText: "Clear All",
      onConfirm: async () => {
        setModalConfig((m) => ({ ...m, isOpen: false }));
        await clearAllCalls();
      },
    });
  }, [filteredCalls.length, clearAllCalls]);

  // Long press handler (500ms) with haptic vibration
  const handlePointerDown = (callId) => {
    pressTimerRef.current = setTimeout(() => {
      enterSelectionMode(callId);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handlePointerCancel = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  if (callsInitialLoading) {
    return <ListSkeleton />;
  }

  const missedCount = filteredCalls.filter((c) => c.missed).length;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/*  Sub-header: Selection Toolbar OR Subtle Manage Controls           */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-3.5 pb-2 pt-0.5">
        <AnimatePresence mode="wait">
          {isSelectionMode ? (
            /* Active Multi-Selection Floating Toolbar */
            <motion.div
              key="selection-toolbar"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-between gap-2 rounded-2xl bg-primary/10 px-3.5 py-2 border border-primary/25 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                  title={allFilteredSelected ? "Deselect all" : "Select all"}
                  aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="size-4.5" />
                  ) : (
                    <Square className="size-4.5 text-primary/70" />
                  )}
                </button>
                <span className="text-xs font-bold text-primary tabular-nums">
                  {selectedCallIds.length} selected
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={selectedCallIds.length === 0}
                  className="inline-flex h-7 items-center gap-1 rounded-xl bg-error px-2.5 text-xs font-semibold text-white shadow-xs hover:bg-error/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Delete selected calls"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="flex size-7 items-center justify-center rounded-xl text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors cursor-pointer"
                  title="Exit selection mode"
                  aria-label="Exit selection mode"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          ) : filteredCalls.length > 0 ? (
            /* Default Quiet Sub-Bar: Clean Call Count & Quick Actions */
            <motion.div
              key="default-action-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between text-xs text-base-content/60 px-1 pt-0.5"
            >
              <span className="font-semibold text-[11px] text-base-content/50 uppercase tracking-wider">
                {filteredCalls.length} {filteredCalls.length === 1 ? "call" : "calls"}
                {missedCount > 0 ? ` · ${missedCount} missed` : ""}
              </span>

              <div className="flex items-center gap-2" ref={topMenuRef}>
                <button
                  type="button"
                  onClick={() => enterSelectionMode()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-base-content/65 hover:text-primary hover:bg-base-200/70 transition-all cursor-pointer"
                  title="Select multiple calls"
                >
                  <CheckSquare className="size-3.5" />
                  <span>Select</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTopMenuOpen((o) => !o)}
                    className="flex size-6.5 items-center justify-center rounded-lg text-base-content/50 hover:text-base-content hover:bg-base-200/70 transition-colors cursor-pointer"
                    title="Calls options"
                    aria-label="Calls options"
                  >
                    <MoreVertical className="size-3.5" />
                  </button>

                  {topMenuOpen && (
                    <div
                      className="absolute right-0 top-8 z-40 w-44 rounded-2xl bg-base-100 p-1.5 shadow-2xl border border-base-300 animate-in fade-in zoom-in-95 duration-120"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTopMenuOpen(false);
                          enterSelectionMode();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-base-content hover:bg-base-200 transition-colors"
                      >
                        <CheckSquare className="size-3.5 text-base-content/70" />
                        <span>Select Calls</span>
                      </button>

                      {onOpenNewCall && (
                        <button
                          type="button"
                          onClick={() => {
                            setTopMenuOpen(false);
                            onOpenNewCall();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-base-content hover:bg-base-200 transition-colors"
                        >
                          <PhoneCall className="size-3.5 text-primary" />
                          <span>New Call</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-base-200" />

                      <button
                        type="button"
                        onClick={() => {
                          setTopMenuOpen(false);
                          handleConfirmClearAll();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-error hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Clear All History</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Modern, Minimal Call History Cards                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1 px-1.5" ref={menuContainerRef}>
        <AnimatePresence initial={false}>
          {filteredCalls.map((call) => {
            const callId = String(call.callId || call.id);
            const isSelected = selectedCallIds.includes(callId);
            const isMenuOpen = openMenuCallId === callId;

            const isOnline =
              call.otherId &&
              Array.isArray(onlineUsers) &&
              onlineUsers.includes(String(call.otherId));

            // Single primary status icon + label
            const DirIcon = call.missed
              ? PhoneMissed
              : call.status === "rejected" || call.status === "cancelled"
                ? PhoneOff
                : call.outgoing
                  ? PhoneOutgoing
                  : PhoneIncoming;

            const TypeIcon = call.video ? Video : Phone;
            const dur = formatDuration(call.duration);

            const statusText = call.missed
              ? "Missed"
              : call.status === "rejected"
                ? "Declined"
                : call.status === "cancelled"
                  ? "Cancelled"
                  : call.outgoing
                    ? `Outgoing${dur ? ` · ${dur}` : ""}`
                    : `Incoming${dur ? ` · ${dur}` : ""}`;

            const dirColor = call.missed
              ? "text-error"
              : call.status === "rejected" || call.status === "cancelled"
                ? "text-base-content/40"
                : call.outgoing
                  ? "text-primary"
                  : "text-emerald-500";

            return (
              <motion.div
                key={call.key}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60, transition: { duration: 0.15 } }}
                transition={{ duration: 0.16 }}
                className={`group relative rounded-2xl transition-all ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20 shadow-2xs"
                    : "hover:bg-base-200/60 border border-transparent"
                }`}
                onPointerDown={() => handlePointerDown(callId)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerCancel}
              >
                <div className="relative flex h-[64px] sm:h-[68px] w-full items-center gap-3 px-3 text-left">
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectCall(callId);
                      }}
                      className="flex size-6 shrink-0 items-center justify-center rounded-lg hover:bg-base-300/80 transition-colors cursor-pointer"
                      aria-label={isSelected ? "Deselect call" : "Select call"}
                    >
                      {isSelected ? (
                        <CheckSquare className="size-4.5 text-primary" />
                      ) : (
                        <Square className="size-4.5 text-base-content/40" />
                      )}
                    </button>
                  )}

                  {/* Main Call Info Area (Click opens call details or toggles selection) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelectCall(callId);
                      } else {
                        // Open details modal directly or conversation
                        setDetailsCall(call);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (isSelectionMode) toggleSelectCall(callId);
                        else setDetailsCall(call);
                      }
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer focus:outline-none"
                  >
                    {/* User Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc(call.avatar)}
                        alt={call.name}
                        className="size-11 sm:size-12 rounded-full object-cover ring-2 ring-base-content/10 shadow-xs"
                      />
                      {isOnline && (
                        <span
                          className="absolute bottom-0 right-0 size-2.5 sm:size-3 rounded-full bg-success ring-2 ring-base-100"
                          title="Online"
                        />
                      )}
                    </div>

                    {/* Full User Name & Single Clean Status Row */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm sm:text-[14.5px] font-semibold leading-snug ${
                          call.missed ? "text-error" : "text-base-content"
                        }`}
                      >
                        {call.name}
                      </p>

                      <div className="truncate text-xs text-base-content/60 flex items-center gap-1.5 mt-0.5">
                        <DirIcon className={`size-3.5 shrink-0 ${dirColor}`} />
                        <span className={`truncate ${call.missed ? "text-error font-medium" : ""}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>

                    {/* Time of Call */}
                    <div className="shrink-0 text-right pr-1">
                      <span
                        className={`whitespace-nowrap text-[11px] font-medium tabular-nums ${
                          call.missed ? "text-error" : "text-base-content/45"
                        }`}
                      >
                        {formatListTime(call.time)}
                      </span>
                    </div>
                  </div>

                  {/* Trailing Controls: 1 Primary Call-Type Button & Subtle Three-Dot Trigger */}
                  {!isSelectionMode && (
                    <div className="flex items-center gap-1 shrink-0 relative">
                      {/* One Primary Call-Type Action Button (Voice or Video) */}
                      {call.otherId && (
                        <button
                          type="button"
                          disabled={callStatus !== "idle"}
                          onClick={(e) => {
                            e.stopPropagation();
                            startCall(
                              {
                                id: call.otherId,
                                fullName: call.name,
                                avatar: call.avatar,
                              },
                              call.video ? "video" : "audio",
                            );
                          }}
                          className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-2xs transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                          title={call.video ? `Video call ${call.name}` : `Voice call ${call.name}`}
                          aria-label={call.video ? "Video call" : "Voice call"}
                        >
                          <TypeIcon className="size-4" />
                        </button>
                      )}

                      {/* Three-Dot Menu Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuCallId((prev) => (prev === callId ? null : callId));
                        }}
                        className="flex size-8 items-center justify-center rounded-xl text-base-content/40 hover:text-base-content hover:bg-base-200/80 transition-colors cursor-pointer"
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {/* Floating Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-9.5 z-40 w-44 rounded-2xl bg-base-100 p-1.5 shadow-2xl border border-base-300 animate-in fade-in zoom-in-95 duration-120"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {call.otherId && (
                            <>
                              <button
                                type="button"
                                disabled={callStatus !== "idle"}
                                onClick={() => {
                                  setOpenMenuCallId(null);
                                  startCall(
                                    {
                                      id: call.otherId,
                                      fullName: call.name,
                                      avatar: call.avatar,
                                    },
                                    "audio",
                                  );
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors disabled:opacity-40"
                              >
                                <Phone className="size-3.5 text-primary" />
                                <span>Voice Call</span>
                              </button>

                              <button
                                type="button"
                                disabled={callStatus !== "idle"}
                                onClick={() => {
                                  setOpenMenuCallId(null);
                                  startCall(
                                    {
                                      id: call.otherId,
                                      fullName: call.name,
                                      avatar: call.avatar,
                                    },
                                    "video",
                                  );
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors disabled:opacity-40"
                              >
                                <Video className="size-3.5 text-success" />
                                <span>Video Call</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCallId(null);
                              setDetailsCall(call);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
                          >
                            <Info className="size-3.5 text-base-content/70" />
                            <span>View Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCallId(null);
                              openFromCall(call);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
                          >
                            <MessageSquare className="size-3.5 text-base-content/70" />
                            <span>Send Message</span>
                          </button>

                          <div className="my-1 border-t border-base-200" />

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCallId(null);
                              enterSelectionMode(callId);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-base-content hover:bg-base-200 transition-colors"
                          >
                            <CheckSquare className="size-3.5 text-base-content/70" />
                            <span>Select</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuCallId(null);
                              handleConfirmSingleDelete(call);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-error hover:bg-error/10 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete Call</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Premium Empty State Fallbacks                                     */}
      {/* ------------------------------------------------------------------ */}
      {filteredCalls.length === 0 && (
        (() => {
          if (q) {
            return (
              <EmptyState
                icon={Search}
                title="No calls found"
                description={`No call history matching "${q}".`}
              />
            );
          }
          if (callFilter === "missed") {
            return (
              <EmptyState
                icon={PhoneMissed}
                title="No missed calls"
                description="You don't have any missed calls."
                action={
                  <button
                    type="button"
                    onClick={() => setCallFilter("all")}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary font-semibold"
                  >
                    Show all calls
                  </button>
                }
              />
            );
          }
          if (callFilter === "incoming") {
            return (
              <EmptyState
                icon={PhoneIncoming}
                title="No incoming calls"
                description="You haven't received any calls yet."
                action={
                  <button
                    type="button"
                    onClick={() => setCallFilter("all")}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary font-semibold"
                  >
                    Show all calls
                  </button>
                }
              />
            );
          }
          if (callFilter === "outgoing") {
            return (
              <EmptyState
                icon={PhoneOutgoing}
                title="No outgoing calls"
                description="You haven't made any outgoing calls yet."
                action={
                  onOpenNewCall ? (
                    <button
                      type="button"
                      onClick={onOpenNewCall}
                      className="btn btn-primary btn-xs sm:btn-sm text-white font-semibold shadow-xs"
                    >
                      Start a Call
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCallFilter("all")}
                      className="btn btn-ghost btn-xs sm:btn-sm text-primary font-semibold"
                    >
                      Show all calls
                    </button>
                  )
                }
              />
            );
          }
          return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Phone className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-base-content">
                  No calls yet
                </h3>
                <p className="text-xs text-base-content/60 max-w-xs mx-auto leading-relaxed">
                  Your voice and video call history will appear here. Connect with friends and family.
                </p>
              </div>
              {onOpenNewCall && (
                <button
                  type="button"
                  onClick={onOpenNewCall}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <PhoneCall className="size-3.5" />
                  <span>Start a Call</span>
                </button>
              )}
            </div>
          );
        })()
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Call Details Dialog                                               */}
      {/* ------------------------------------------------------------------ */}
      <CallDetailsModal
        open={Boolean(detailsCall)}
        onClose={() => setDetailsCall(null)}
        call={detailsCall}
        onDeleteCall={(c) => handleConfirmSingleDelete(c)}
        onOpenChat={(c) => openFromCall(c)}
      />

      {/* ------------------------------------------------------------------ */}
      {/*  Delete Confirmation Modal Dialog                                  */}
      {/* ------------------------------------------------------------------ */}
      <CallConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((m) => ({ ...m, isOpen: false }))}
      />
    </>
  );
};

export default SidebarCallsTab;
