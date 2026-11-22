import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Info,
  MessageSquare,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Shield,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useCall } from "../../context/CallContext";
import { CALL_SPRING } from "../Call/common/callTokens";
import { formatDuration } from "../Sidebar/sidebarUtils";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const formatDetailedDate = (time) => {
  if (!time) return "Unknown date";
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return "Unknown date";

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  return `${d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })} at ${timeStr}`;
};

export const CallDetailsModal = ({
  open,
  onClose,
  call,
  onDeleteCall,
  onOpenChat,
}) => {
  const { startCall, status: callStatus } = useCall();
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  if (!open || !call) return null;

  const isOnline =
    call.otherId &&
    Array.isArray(onlineUsers) &&
    onlineUsers.includes(String(call.otherId));

  const DirIcon = call.missed
    ? PhoneMissed
    : call.outgoing
      ? PhoneOutgoing
      : PhoneIncoming;
  const TypeIcon = call.video ? Video : Phone;

  const durText = formatDuration(call.duration) || "0s";
  const formattedDate = formatDetailedDate(call.time);

  const statusLabel = call.missed
    ? "Missed"
    : call.status === "rejected"
      ? "Declined"
      : call.status === "cancelled"
        ? "Cancelled"
        : call.outgoing
          ? "Outgoing"
          : "Incoming";

  const statusTone = call.missed
    ? "text-error bg-error/10 border-error/20"
    : call.status === "rejected" || call.status === "cancelled"
      ? "text-base-content/60 bg-base-200 border-base-300"
      : "text-success bg-success/10 border-success/20";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={CALL_SPRING}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-3.5 bg-base-100">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="size-4" />
            </span>
            <h3 className="font-bold text-sm sm:text-base text-base-content">
              Call Details
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-5 text-center flex flex-col items-center bg-base-200/30 border-b border-base-200">
          <div className="relative mb-3">
            <img
              src={avatarSrc(call.avatar)}
              alt={call.name}
              className="size-16 sm:size-18 rounded-full object-cover ring-4 ring-base-100 shadow-lg"
            />
            {isOnline && (
              <span
                className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-success ring-2 ring-base-100"
                title="Online"
              />
            )}
          </div>

          <h4 className="font-bold text-base sm:text-lg text-base-content truncate max-w-full px-2">
            {call.name}
          </h4>
          <p className="text-xs text-base-content/50 mt-0.5">
            {isOnline ? "Online now" : "Offline"}
          </p>

          {/* Quick Action Pills */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {call.otherId && (
              <>
                <button
                  type="button"
                  disabled={callStatus !== "idle"}
                  onClick={() => {
                    onClose();
                    startCall(
                      {
                        id: call.otherId,
                        fullName: call.name,
                        avatar: call.avatar,
                      },
                      "audio",
                    );
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-40"
                >
                  <Phone className="size-3.5" />
                  <span>Voice Call</span>
                </button>

                <button
                  type="button"
                  disabled={callStatus !== "idle"}
                  onClick={() => {
                    onClose();
                    startCall(
                      {
                        id: call.otherId,
                        fullName: call.name,
                        avatar: call.avatar,
                      },
                      "video",
                    );
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-success/15 text-success hover:bg-success hover:text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-40"
                >
                  <Video className="size-3.5" />
                  <span>Video Call</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChat?.(call);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-base-200 text-base-content hover:bg-base-300 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <MessageSquare className="size-3.5" />
              <span>Chat</span>
            </button>
          </div>
        </div>

        {/* Detailed Breakdown Card */}
        <div className="p-5 space-y-3.5 flex-1 overflow-y-auto">
          <div className="rounded-2xl border border-base-200/80 bg-base-100 p-3.5 space-y-3 shadow-2xs">
            {/* Call Type & Direction */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-base-content/60 flex items-center gap-1.5">
                <TypeIcon className="size-4 text-base-content/70" />
                <span>Call Type</span>
              </span>
              <span className="font-semibold text-base-content">
                {call.video ? "HD Video Call" : "Voice Call"}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-base-content/60 flex items-center gap-1.5">
                <DirIcon className="size-4 text-base-content/70" />
                <span>Status</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusTone}`}
              >
                <DirIcon className="size-3" />
                <span>{statusLabel}</span>
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-base-content/60 flex items-center gap-1.5">
                <Calendar className="size-4 text-base-content/70" />
                <span>Date & Time</span>
              </span>
              <span className="font-medium text-base-content">
                {formattedDate}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-base-content/60 flex items-center gap-1.5">
                <Clock className="size-4 text-base-content/70" />
                <span>Duration</span>
              </span>
              <span className="font-semibold text-base-content tabular-nums">
                {durText}
              </span>
            </div>

            {/* Reason if rejected/failed */}
            {call.endReason && call.endReason !== "none" && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-base-200/60">
                <span className="text-base-content/60">Note</span>
                <span className="font-medium text-base-content/80 capitalize">
                  {call.endReason.replace(/-/g, " ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-base-300 px-5 py-3.5 bg-base-200/30">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDeleteCall?.(call);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-error hover:bg-error/10 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Trash2 className="size-3.5" />
            <span>Delete from History</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-base-200 hover:bg-base-300 text-xs font-semibold text-base-content transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CallDetailsModal;
