import { useState, useEffect, useMemo } from "react";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  SecondaryButton,
  PrimaryButton,
} from "../chat-ui";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  X,
  MessageSquare,
  UsersRound,
  Phone,
  UserPlus,
  Shield,
  Info,
  Loader2,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { useNotificationStore } from "../../store/useNotificationStore.js";
import { useChatStore } from "../../store/useChatStore.js";
import { useGroupStore } from "../../store/useGroupStore.js";
import { useContactStore } from "../../store/useContactStore.js";
import { useStoryStore } from "../../store/useStoryStore.js";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "../../utils/timeUtils.js";

const CATEGORY_TABS = [
  { id: "all", label: "All", icon: Bell },
  { id: "unread", label: "Unread", icon: Filter },
  { id: "message", label: "Messages", icon: MessageSquare },
  { id: "group", label: "Groups", icon: UsersRound },
  { id: "call", label: "Calls", icon: Phone },
  { id: "contact", label: "Contacts", icon: UserPlus },
  { id: "story", label: "Stories", icon: Sparkles },
  { id: "security", label: "Security", icon: Shield },
  { id: "system", label: "System", icon: Info },
];

export const NotificationCenterModal = ({ open, onClose }) => {
  const {
    notifications,
    unreadCount,
    categoryCounts,
    loading,
    categoryFilter,
    activeTab,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    clearReadNotifications,
    deleteNotification,
    clearAllNotifications,
    setCategoryFilter,
    setActiveTab,
  } = useNotificationStore();

  const [search, setSearch] = useState("");
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const selectGroup = useGroupStore((s) => s.selectGroup);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleTabChange = (tabId) => {
    if (tabId === "unread") {
      setActiveTab("unread");
      setCategoryFilter("all");
    } else if (tabId === "all") {
      setActiveTab("all");
      setCategoryFilter("all");
    } else {
      setActiveTab("all");
      setCategoryFilter(tabId);
    }
  };

  const currentTab = activeTab === "unread" ? "unread" : categoryFilter;

  // Filter items by local search query
  const filteredNotifications = useMemo(() => {
    let list = notifications;

    if (activeTab === "unread") {
      list = list.filter((n) => !n.isRead);
    } else if (categoryFilter !== "all") {
      list = list.filter((n) => n.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.body?.toLowerCase().includes(q) ||
          n.sender?.fullName?.toLowerCase().includes(q) ||
          n.sender?.username?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [notifications, activeTab, categoryFilter, search]);

  const handleAction = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id || notif._id);
    }

    const data = notif.data || {};

    if (notif.category === "message" || data.peerId) {
      if (notif.sender || data.peerId) {
        setSelectedUser(notif.sender || { _id: data.peerId });
      }
      onClose();
    } else if (notif.category === "group" || data.groupId) {
      if (data.messageId) {
        try {
          sessionStorage.setItem(
            "chatty:jump-to-message",
            String(data.messageId),
          );
        } catch {}
        useGroupStore.getState().setJumpToMessageId?.(String(data.messageId));
      }
      selectGroup({ _id: data.groupId });
      onClose();
    } else if (notif.category === "story" || data.storyId) {
      const storyStore = useStoryStore.getState();
      if (data.storyId && storyStore.openMyStoryViewer) {
        storyStore.openMyStoryViewer(data.storyId);
      } else if (storyStore.openViewer) {
        storyStore.openViewer(0, 0);
      }
      onClose();
    } else if (notif.category === "call") {
      onClose();
    } else if (notif.category === "contact") {
      onClose();
    } else if (notif.category === "security") {
      navigate("/profile");
      onClose();
    }
  };

  const getActionLabel = (notif) => {
    switch (notif.category) {
      case "message":
        return "Open Chat";
      case "group":
        return "View Group";
      case "story":
        return "View Story";
      case "call":
        return "Call";
      case "contact":
        return "View Contact";
      case "security":
        return "Review Security";
      default:
        return "View Details";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "message":
        return <MessageSquare className="size-4 text-primary" />;
      case "group":
        return <UsersRound className="size-4 text-secondary" />;
      case "story":
        return <Sparkles className="size-4 text-purple-400" />;
      case "call":
        return <Phone className="size-4 text-error" />;
      case "contact":
        return <UserPlus className="size-4 text-accent" />;
      case "security":
        return <Shield className="size-4 text-warning" />;
      case "system":
      default:
        return <Info className="size-4 text-info" />;
    }
  };

  return (
    <ModalLayout open={open} onClose={onClose} size="lg">
      <ModalHeader
        icon={Bell}
        title="Notification Center"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"} across all categories`
            : "All caught up"
        }
        onClose={onClose}
      />

      <ModalBody className="space-y-3.5 p-4 sm:p-5">
        {/* Search Bar + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm h-9 w-full rounded-xl bg-base-200/60 border-base-300 pl-9 pr-8 text-xs focus:bg-base-100 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  markAllAsRead(
                    categoryFilter !== "all" ? categoryFilter : null,
                  )
                }
                className="btn btn-xs btn-ghost gap-1 text-[11px] text-primary hover:bg-primary/10 rounded-lg h-8 px-2.5"
                title="Mark all notifications as read"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            {filteredNotifications.some((n) => n.isRead) && (
              <button
                type="button"
                onClick={() =>
                  clearReadNotifications(
                    categoryFilter !== "all" ? categoryFilter : null,
                  )
                }
                className="btn btn-xs btn-ghost gap-1 text-[11px] text-base-content/70 hover:bg-base-200 rounded-lg h-8 px-2.5"
                title="Clear read notifications"
              >
                <CheckCheck className="size-3.5 text-base-content/50" />
                <span>Clear read</span>
              </button>
            )}

            {filteredNotifications.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  clearAllNotifications(
                    categoryFilter !== "all" ? categoryFilter : null,
                  )
                }
                className="btn btn-xs btn-ghost gap-1 text-[11px] text-error hover:bg-error/10 rounded-lg h-8 px-2.5"
                title="Clear all notifications"
              >
                <Trash2 className="size-3.5" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-base-300 pb-2">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            const count =
              tab.id === "all"
                ? notifications.length
                : tab.id === "unread"
                  ? unreadCount
                  : categoryCounts[tab.id] || 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-content shadow-xs"
                    : "bg-base-200/50 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 text-[10px] tabular-nums font-bold leading-tight ${
                      active
                        ? "bg-primary-content/25 text-primary-content"
                        : "bg-base-300 text-base-content/80"
                    }`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications Scroll List */}
        <div className="h-96 overflow-y-auto divide-y divide-base-300/40 rounded-2xl border border-base-300/70 bg-base-200/20">
          {loading && notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center text-primary">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-2">
              <div className="size-12 rounded-2xl bg-base-200 border border-base-300 grid place-items-center text-base-content/40 shadow-xs">
                <Bell className="size-6" />
              </div>
              <p className="text-sm font-bold text-base-content">
                No notifications found
              </p>
              <p className="text-xs text-base-content/50 max-w-xs">
                {search
                  ? "No alerts match your current search criteria."
                  : activeTab === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "When new notifications arrive, they will show up here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const id = n.id || n._id;
              const isUnread = !n.isRead;
              const timeAgo = formatDistanceToNow(n.createdAt);

              return (
                <div
                  key={id}
                  className={`p-3.5 flex items-start gap-3.5 hover:bg-base-200/50 transition-colors group ${
                    isUnread ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Sender Avatar or Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {n.sender?.avatar ? (
                      <img
                        src={n.sender.avatar}
                        alt=""
                        className="size-10 rounded-full object-cover border border-base-300 shadow-2xs"
                      />
                    ) : (
                      <div className="size-10 rounded-2xl bg-base-200 border border-base-300 grid place-items-center shadow-2xs">
                        {getCategoryIcon(n.category)}
                      </div>
                    )}
                    {n.sender?.avatar && (
                      <div className="absolute -bottom-1 -right-1 size-4.5 rounded-full bg-base-100 border border-base-300 grid place-items-center shadow-2xs">
                        {getCategoryIcon(n.category)}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs truncate ${
                          isUnread
                            ? "font-bold text-base-content"
                            : "font-semibold text-base-content/85"
                        }`}
                      >
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-base-content/45 shrink-0 tabular-nums">
                        {timeAgo}
                      </span>
                    </div>

                    {n.body && (
                      <p className="text-xs text-base-content/70 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAction(n)}
                        className="btn btn-xs btn-primary rounded-lg gap-1 font-semibold text-[11px] h-7 px-2.5"
                      >
                        <span>{getActionLabel(n)}</span>
                        <ChevronRight className="size-3" />
                      </button>

                      {isUnread ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(id)}
                          className="btn btn-xs btn-ghost rounded-lg text-[11px] text-base-content/60 hover:text-base-content h-7 px-2"
                        >
                          Mark read
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAsUnread(id)}
                          className="btn btn-xs btn-ghost rounded-lg text-[11px] text-base-content/60 hover:text-base-content h-7 px-2"
                        >
                          Mark unread
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Controls: Unread Ring & Delete */}
                  <div className="flex flex-col items-center gap-2 shrink-0 self-center">
                    {isUnread && (
                      <span
                        className="size-2 rounded-full bg-primary"
                        title="Unread"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error transition-opacity rounded-lg"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ModalBody>
    </ModalLayout>
  );
};

export default NotificationCenterModal;
