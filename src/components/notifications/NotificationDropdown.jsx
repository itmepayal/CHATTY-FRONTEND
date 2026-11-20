import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UsersRound,
  Phone,
  UserPlus,
  Shield,
  Info,
  ChevronRight,
} from "lucide-react";
import { useNotificationStore } from "../../store/useNotificationStore.js";
import { useChatStore } from "../../store/useChatStore.js";
import { useGroupStore } from "../../store/useGroupStore.js";
import { formatDistanceToNow } from "../../utils/timeUtils.js";

const getCategoryIcon = (category) => {
  switch (category) {
    case "message":
      return <MessageSquare className="size-3.5 text-primary" />;
    case "group":
      return <UsersRound className="size-3.5 text-secondary" />;
    case "call":
      return <Phone className="size-3.5 text-error" />;
    case "contact":
      return <UserPlus className="size-3.5 text-accent" />;
    case "security":
      return <Shield className="size-3.5 text-warning" />;
    case "system":
    default:
      return <Info className="size-3.5 text-info" />;
  }
};

export const NotificationDropdown = ({ onClose, onOpenCenter, anchorRef }) => {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const selectGroup = useGroupStore((s) => s.selectGroup);

  // Bell button ke hisaab se fixed position
  const [pos, setPos] = useState({ top: 64, right: 16 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    fetchNotifications({ page: 1, limit: 10 });
  }, [fetchNotifications]);

  // Esc dabane par band
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id || notif._id);
    }

    const data = notif.data || {};

    // Deep linking navigation
    if (data.peerId || (notif.sender && notif.category === "message")) {
      const user = notif.sender || { _id: data.peerId };
      setSelectedUser(user);
    } else if (data.groupId) {
      if (data.messageId) {
        try {
          sessionStorage.setItem("chatty:jump-to-message", String(data.messageId));
        } catch {}
        useGroupStore.getState().setJumpToMessageId?.(String(data.messageId));
      }
      selectGroup({ _id: data.groupId });
    }

    onClose?.();
  };

  const recent = notifications.slice(0, 6);

  return createPortal(
    <motion.div
      data-notification-dropdown
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      style={{ top: pos.top, right: pos.right }}
      className="fixed w-80 sm:w-96 max-w-[calc(100vw-1rem)] rounded-2xl bg-base-100 backdrop-blur-2xl border border-base-300 shadow-xl z-[99999] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300/80 bg-base-200/40">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-base-content">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="badge badge-primary badge-sm font-bold text-[10px] px-1.5 h-4.5">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="btn btn-ghost btn-xs gap-1 text-[11px] text-primary hover:bg-primary/10 rounded-lg"
          >
            <CheckCheck className="size-3" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-base-300/40">
        {loading && recent.length === 0 ? (
          <div className="p-8 text-center text-xs text-base-content/50">
            Loading notifications…
          </div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <div className="size-10 rounded-full bg-base-200 grid place-items-center mx-auto text-base-content/40">
              <Bell className="size-5" />
            </div>
            <p className="text-xs font-semibold text-base-content/70">
              No notifications yet
            </p>
            <p className="text-[11px] text-base-content/45">
              We will notify you when something arrives
            </p>
          </div>
        ) : (
          recent.map((n) => {
            const id = n.id || n._id;
            const timeAgo = formatDistanceToNow(n.createdAt);
            const isUnread = !n.isRead;

            return (
              <div
                key={id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 flex items-start gap-3 hover:bg-base-200/60 cursor-pointer transition-colors ${
                  isUnread ? "bg-primary/5" : ""
                }`}
              >
                {/* Avatar or Category Icon */}
                <div className="relative shrink-0">
                  {n.sender?.avatar ? (
                    <img
                      src={n.sender.avatar}
                      alt=""
                      className="size-8.5 rounded-full object-cover border border-base-300"
                    />
                  ) : (
                    <div className="size-8.5 rounded-xl bg-base-200 border border-base-300 grid place-items-center">
                      {getCategoryIcon(n.category)}
                    </div>
                  )}
                  {n.sender?.avatar && (
                    <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-base-100 border border-base-300 grid place-items-center shadow-2xs">
                      {getCategoryIcon(n.category)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs truncate ${
                        isUnread
                          ? "font-bold text-base-content"
                          : "font-medium text-base-content/80"
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="text-[10px] text-base-content/40 shrink-0 tabular-nums">
                      {timeAgo}
                    </span>
                  </div>

                  {n.body && (
                    <p className="text-[11px] text-base-content/65 line-clamp-2 leading-tight">
                      {n.body}
                    </p>
                  )}
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <span className="size-2 rounded-full bg-primary shrink-0 self-center" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-base-300/80 bg-base-200/30">
        <button
          type="button"
          onClick={onOpenCenter}
          className="btn btn-ghost btn-sm w-full rounded-xl justify-between text-xs text-primary font-semibold hover:bg-primary/10"
        >
          <span>Open Notification Center</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </motion.div>,
    document.body,
  );
};

export default NotificationDropdown;
