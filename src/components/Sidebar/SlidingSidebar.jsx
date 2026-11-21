import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  MessageCircle,
  UsersRound,
  Phone,
  UserPlus,
  Bell,
  Archive,
  Bookmark,
  User,
  Shield,
  Palette,
  BellRing,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useContactStore } from "../../store/useContactStore";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useSlidingSidebarStore } from "../../store/useSlidingSidebarStore";
import { ChattyLogo } from "../common/ChattyLogo";
import { avatarSrc } from "./sidebarUtils";
import { LogoutConfirm } from "./LogoutConfirmModal";
import { HelpSupportModal } from "./HelpSupportModal";
import NotificationCenterModal from "../contact/NotificationCenterModal";

/**
 * SlidingSidebar
 * Modern, responsive, and animated sliding navigation sidebar.
 * Supports:
 * - Desktop: smooth width transition (76px collapsed icon-rail <-> 280px expanded panel)
 * - Mobile / Tablet: off-canvas drawer with backdrop blur overlay, escape key, and scroll lock
 * - Tooltips with animations for collapsed icon mode
 * - Active route / subtab highlighting and live badge notifications
 */
export const SlidingSidebar = ({ mobileOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { authUser, logout, onlineUsers } = useAuthStore();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile, isHelpOpen, setHelpOpen } =
    useSlidingSidebarStore();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Badge counts
  const chatUsers = useChatStore((s) => s.users) || [];
  const groups = useGroupStore((s) => s.groups) || [];
  const incomingRequests = useContactStore((s) => s.requests?.incoming) || [];
  const calls = useCallHistoryStore((s) => s.calls) || [];
  const unreadNotifs = useNotificationStore((s) => s.unreadCount) || 0;

  const chatUnread = useMemo(
    () => chatUsers.filter((u) => !u.isArchived).reduce((acc, u) => acc + (u.unreadCount || 0), 0),
    [chatUsers]
  );
  const groupUnread = useMemo(
    () => groups.filter((g) => !g.archived).reduce((acc, g) => acc + (g.unreadCount || 0), 0),
    [groups]
  );
  const requestCount = incomingRequests.length;
  const missedCallsCount = useMemo(
    () => calls.filter((c) => c.unseenMissed || (c.missed && !c.seen)).length,
    [calls]
  );

  const meOnline = useMemo(() => {
    const myId = String(authUser?._id || authUser?.id || "");
    if (!myId) return false;
    if (Array.isArray(onlineUsers)) {
      return onlineUsers.some((id) => String(id) === myId);
    }
    if (onlineUsers && typeof onlineUsers.has === "function") {
      return onlineUsers.has(myId);
    }
    return false;
  }, [authUser?._id, authUser?.id, onlineUsers]);

  // Escape key handler to close mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  // Lock body scroll when mobile off-canvas drawer is active
  useEffect(() => {
    if (isMobileOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobileOpen]);

  // Action dispatcher
  const handleNav = useCallback(
    (action) => {
      if (typeof action === "string") {
        navigate(action);
      } else if (typeof action === "function") {
        action();
      }
      closeMobile();
    },
    [navigate, closeMobile]
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      closeMobile();
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  // Active check helpers
  const currentTab = searchParams.get("tab") || "chats";
  const isArchived = searchParams.get("archived") === "true";
  const isChatPage = location.pathname === "/chat";

  // Navigation Items Definition
  const mainNavItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: 0,
      active: isChatPage && !isArchived && currentTab === "chats",
      onClick: () => handleNav("/chat?tab=chats"),
    },
    {
      id: "chats",
      label: "Direct Chats",
      icon: MessageCircle,
      badge: chatUnread,
      active: isChatPage && !isArchived && currentTab === "chats",
      onClick: () => handleNav("/chat?tab=chats"),
    },
    {
      id: "groups",
      label: "Groups",
      icon: UsersRound,
      badge: groupUnread,
      active: isChatPage && !isArchived && currentTab === "groups",
      onClick: () => handleNav("/chat?tab=groups"),
    },
    {
      id: "calls",
      label: "Calls",
      icon: Phone,
      badge: missedCallsCount,
      badgeTone: "danger",
      active: isChatPage && !isArchived && currentTab === "calls",
      onClick: () => handleNav("/chat?tab=calls"),
    },
    {
      id: "contacts",
      label: "Contacts & Requests",
      icon: UserPlus,
      badge: requestCount,
      badgeTone: "primary",
      active: isChatPage && !isArchived && currentTab === "requests",
      onClick: () => handleNav("/chat?tab=requests"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadNotifs,
      badgeTone: "primary",
      active: showNotificationCenter,
      onClick: () => {
        setShowNotificationCenter(true);
        closeMobile();
      },
    },
    {
      id: "archived",
      label: "Archived Chats",
      icon: Archive,
      badge: 0,
      active: isChatPage && isArchived,
      onClick: () => handleNav("/chat?archived=true"),
    },
    {
      id: "saved",
      label: "Saved Messages",
      icon: Bookmark,
      badge: 0,
      active: location.pathname === "/saved",
      onClick: () => handleNav("/saved"),
    },
  ];

  const settingsNavItems = [
    {
      id: "profile-settings",
      label: "Profile Settings",
      icon: User,
      active: location.pathname === "/profile",
      onClick: () => handleNav("/profile"),
    },
    {
      id: "privacy-settings",
      label: "Privacy & Security",
      icon: Shield,
      active: location.pathname.startsWith("/settings/privacy"),
      onClick: () => handleNav("/settings/privacy"),
    },
    {
      id: "appearance-settings",
      label: "Appearance",
      icon: Palette,
      active: location.pathname.startsWith("/settings/appearance"),
      onClick: () => handleNav("/settings/appearance"),
    },
    {
      id: "notifications-settings",
      label: "Notification Settings",
      icon: BellRing,
      active: location.pathname.startsWith("/settings/notifications"),
      onClick: () => handleNav("/settings/notifications"),
    },
    {
      id: "help-support",
      label: "Help & Support",
      icon: HelpCircle,
      active: isHelpOpen,
      onClick: () => {
        setHelpOpen(true);
        closeMobile();
      },
    },
  ];

  /**
   * Render single navigation row for expanded view
   */
  const renderExpandedItem = (item) => {
    const Icon = item.icon;
    const isToneDanger = item.badgeTone === "danger";

    return (
      <button
        key={item.id}
        type="button"
        onClick={item.onClick}
        aria-current={item.active ? "page" : undefined}
        className={`group relative flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
          item.active
            ? "bg-primary/10 text-primary font-semibold shadow-2xs border border-primary/20"
            : "text-base-content/70 hover:bg-base-200/80 hover:text-base-content"
        }`}
      >
        {item.active && (
          <span
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
            aria-hidden="true"
          />
        )}
        <Icon className="size-4.5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {Boolean(item.badge && item.badge > 0) && (
          <span
            className={`badge badge-xs px-1.5 py-0.5 rounded-full font-bold ml-auto tabular-nums ${
              isToneDanger ? "bg-error text-error-content" : "bg-primary text-primary-content"
            }`}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </button>
    );
  };

  /**
   * Render single navigation item for collapsed icon-only rail
   */
  const renderCollapsedItem = (item) => {
    const Icon = item.icon;
    const isToneDanger = item.badgeTone === "danger";

    return (
      <div key={item.id} className="relative group flex justify-center py-0.5">
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          className={`relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
            item.active
              ? "bg-primary text-primary-content shadow-xs"
              : "text-base-content/70 hover:bg-base-200 hover:text-base-content hover:scale-105 active:scale-95"
          }`}
        >
          <Icon className="size-4.5 transition-transform duration-200 group-hover:scale-110" />

          {/* Collapsed dot badge */}
          {Boolean(item.badge && item.badge > 0) && (
            <span
              className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-base-100 ${
                isToneDanger ? "bg-error animate-pulse" : "bg-primary"
              }`}
            />
          )}
        </button>

        {/* Hover Tooltip */}
        <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral text-neutral-content text-xs font-semibold shadow-xl border border-base-content/10 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 whitespace-nowrap">
          <span>{item.label}</span>
          {Boolean(item.badge && item.badge > 0) && (
            <span
              className={`badge badge-xs px-1 py-0.2 rounded-full font-bold text-[9px] ${
                isToneDanger ? "bg-error text-error-content" : "bg-primary text-primary-content"
              }`}
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </div>
      </div>
    );
  };

  /**
   * Common drawer/sidebar inner content for expanded views
   */
  const renderExpandedContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-base-100">
      {/* 1. Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-3.5 border-b border-base-300/70 bg-base-100/90 backdrop-blur-md">
        <Link
          to="/chat"
          onClick={() => isDrawer && closeMobile()}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs group-hover:scale-105 transition-transform">
            <ChattyLogo className="size-6 text-primary" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Chatty
            </span>
            <span className="text-[10px] text-base-content/50 font-medium">
              Messenger
            </span>
          </div>
        </Link>

        {isDrawer ? (
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation drawer"
            className="flex size-8 items-center justify-center rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar (Cmd+B)"
            className="flex size-8 items-center justify-center rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 active:scale-95 transition-all cursor-pointer"
          >
            <PanelLeftClose className="size-4.5" />
          </button>
        )}
      </div>

      {/* 2. User Profile Summary Card */}
      <div className="p-3 border-b border-base-300/40">
        <div
          onClick={() => handleNav("/profile")}
          className="flex items-center gap-2.5 p-2 rounded-xl bg-base-200/50 hover:bg-base-200/90 border border-base-300/50 cursor-pointer transition-all group"
        >
          <div className="relative shrink-0">
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "User"}
              className="size-9 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary transition-all"
            />
            {meOnline && (
              <span
                className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100"
                aria-label="Online status"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs font-semibold text-base-content truncate group-hover:text-primary transition-colors">
              {authUser?.fullName || "My Account"}
            </p>
            <p className="text-[11px] text-base-content/60 truncate mt-0.5 flex items-center gap-1">
              <span
                className={`size-1.5 rounded-full ${
                  meOnline ? "bg-success" : "bg-base-content/30"
                }`}
              />
              <span>
                {meOnline
                  ? "Active now"
                  : authUser?.username
                    ? `@${authUser.username}`
                    : "Offline"}
              </span>
            </p>
          </div>
          <ChevronRight className="size-4 text-base-content/40 group-hover:text-base-content group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>

      {/* 3. Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
        {/* Section: Main */}
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-base-content/40 uppercase">
            Main Menu
          </p>
          <div className="space-y-0.5">{mainNavItems.map(renderExpandedItem)}</div>
        </div>

        {/* Section: Preferences */}
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-base-content/40 uppercase">
            Preferences & Security
          </p>
          <div className="space-y-0.5">{settingsNavItems.map(renderExpandedItem)}</div>
        </div>
      </div>

      {/* 4. Footer */}
      <div className="p-3 border-t border-base-300/60 bg-base-100/95 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleNav("/settings/appearance")}
          title="Customize Theme"
          className="btn btn-xs btn-ghost gap-1.5 rounded-lg text-base-content/70 hover:text-base-content"
        >
          <Palette className="size-3.5" />
          <span>Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          title="Sign out of Chatty"
          className="btn btn-xs btn-ghost gap-1.5 rounded-lg text-error hover:bg-error/10 hover:text-error"
        >
          <LogOut className="size-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  /**
   * Collapsed Icon-Only View (Desktop only ~76px)
   */
  const renderCollapsedContent = () => (
    <div className="flex flex-col h-full bg-base-100 justify-between items-center py-3">
      {/* Top section: Logo + Toggle */}
      <div className="flex flex-col items-center gap-3 w-full shrink-0">
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Expand sidebar"
          title="Expand navigation (Cmd+B)"
          className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ChattyLogo className="size-6 text-primary" />
        </button>

        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Expand sidebar control"
          title="Expand sidebar"
          className="flex size-7 items-center justify-center rounded-lg text-base-content/45 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
        >
          <PanelLeft className="size-4" />
        </button>

        <div className="w-8 h-px bg-base-300/60" />
      </div>

      {/* Middle scrollable icons */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar py-2 space-y-1">
        {mainNavItems.map(renderCollapsedItem)}
        <div className="w-8 h-px bg-base-300/60 mx-auto my-2" />
        {settingsNavItems.map(renderCollapsedItem)}
      </div>

      {/* Bottom section: Avatar + Logout */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-base-300/60 w-full shrink-0">
        {/* Profile Avatar with tooltip */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => handleNav("/profile")}
            aria-label="My profile"
            className="relative flex size-9 items-center justify-center rounded-full hover:ring-2 hover:ring-primary transition-all cursor-pointer"
          >
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "User"}
              className="size-8.5 rounded-full object-cover"
            />
            {meOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100" />
            )}
          </button>
          <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg bg-neutral text-neutral-content text-xs font-semibold shadow-xl border border-base-content/10 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 whitespace-nowrap">
            {authUser?.fullName || "Profile"}
          </div>
        </div>

        {/* Logout icon with tooltip */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Log out"
            className="flex size-9 items-center justify-center rounded-xl text-error/80 hover:bg-error/10 hover:text-error transition-all cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
          <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 rounded-lg bg-error text-error-content text-xs font-semibold shadow-xl pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 whitespace-nowrap">
            Log out
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ============================================================== */}
      {/* 1. DESKTOP COLLAPSIBLE SIDEBAR                                  */}
      {/* ============================================================== */}
      {!mobileOnly && (
        <aside
          aria-label="Application Navigation"
          className={`relative z-20 hidden md:flex flex-col h-full bg-base-100 border-r border-base-300/80 shrink-0 transition-[width] duration-300 ease-in-out select-none ${
            isCollapsed ? "w-[76px]" : "w-[280px]"
          }`}
        >
          {isCollapsed ? renderCollapsedContent() : renderExpandedContent(false)}
        </aside>
      )}

      {/* ============================================================== */}
      {/* 2. MOBILE / TABLET OFF-CANVAS DRAWER WITH OVERLAY              */}
      {/* ============================================================== */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-visibility ${
          isMobileOpen ? "visible" : "invisible pointer-events-none"
        }`}
        aria-hidden={!isMobileOpen}
      >
        {/* Backdrop Overlay */}
        <div
          onClick={closeMobile}
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className={`fixed inset-y-0 left-0 w-[285px] max-w-[85vw] h-full bg-base-100 shadow-2xl flex flex-col z-50 border-r border-base-300 transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {renderExpandedContent(true)}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODALS (Help, Notifications & Logout Confirmation)           */}
      {/* ============================================================== */}
      <HelpSupportModal open={isHelpOpen} onClose={() => setHelpOpen(false)} />

      {showNotificationCenter && (
        <NotificationCenterModal
          open={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
        />
      )}

      <LogoutConfirm
        open={confirmLogout}
        loading={isLoggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

export default SlidingSidebar;
