import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
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
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useContactStore } from "../../store/useContactStore";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useSlidingSidebarStore } from "../../store/useSlidingSidebarStore";
import { useStoryStore } from "../../store/useStoryStore";
import { ChattyLogo } from "../common/ChattyLogo";
import { avatarSrc } from "./sidebarUtils";
import { LogoutConfirm } from "./LogoutConfirmModal";
import { HelpSupportModal } from "./HelpSupportModal";
import NotificationCenterModal from "../contact/NotificationCenterModal";

/**
 * SlidingSidebar
 *
 * Professional, premium real-time messaging application navigation sidebar.
 * Features:
 * - Collapsed State: Polished icon-only vertical navigation rail (~76px) with perfect centering,
 *   subtle active indicators, elegant hover states, and smooth floating tooltips.
 * - Expanded State: Full navigation panel (~280px) with brand header, user profile summary,
 *   hierarchical navigation groups (Main Menu & Preferences), unread badges, and bottom account controls.
 * - Mobile / Tablet: Responsive off-canvas drawer with smooth backdrop blur, keyboard shortcuts, and body scroll lock.
 * - Seamless Width Transition: Consistent icon positioning and zero jumping between states.
 */
export const SlidingSidebar = ({ mobileOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { authUser, logout, onlineUsers } = useAuthStore();
  const {
    isCollapsed,
    toggleCollapse,
    isMobileOpen,
    closeMobile,
    isHelpOpen,
    setHelpOpen,
  } = useSlidingSidebarStore();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Live badge counts from stores
  const chatUsers = useChatStore((s) => s.users) || [];
  const groups = useGroupStore((s) => s.groups) || [];
  const incomingRequests = useContactStore((s) => s.requests?.incoming) || [];
  const calls = useCallHistoryStore((s) => s.calls) || [];
  const unreadNotifs = useNotificationStore((s) => s.unreadCount) || 0;

  const chatUnread = useMemo(
    () =>
      chatUsers
        .filter((u) => !u.isArchived)
        .reduce((acc, u) => acc + (u.unreadCount || 0), 0),
    [chatUsers]
  );
  const groupUnread = useMemo(
    () =>
      groups
        .filter((g) => !g.archived)
        .reduce((acc, g) => acc + (g.unreadCount || 0), 0),
    [groups]
  );
  const requestCount = incomingRequests.length;
  const missedCallsCount = useMemo(
    () =>
      calls.filter((c) => c.unseenMissed || (c.missed && !c.seen)).length,
    [calls]
  );
  const storyFeed = useStoryStore((s) => s.feed) || [];
  const unreadStoriesCount = useMemo(
    () => storyFeed.filter((g) => !g.isSelf && g.hasUnseen).length,
    [storyFeed]
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

  // Escape key listener for mobile drawer
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

  // Unified navigation dispatcher
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

  // Route & query parameter active checks
  const currentTab = searchParams.get("tab") || "chats";
  const isArchived = searchParams.get("archived") === "true";
  const isChatPage = location.pathname === "/chat";

  // MAIN MENU Navigation Items
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
      badgeTone: "primary",
      active: isChatPage && !isArchived && currentTab === "chats",
      onClick: () => handleNav("/chat?tab=chats"),
    },
    {
      id: "stories",
      label: "Stories & Status",
      icon: Sparkles,
      badge: unreadStoriesCount,
      badgeTone: "primary",
      active: false,
      onClick: () => {
        useStoryStore.getState().setCreatorOpen(true);
        closeMobile();
      },
    },
    {
      id: "groups",
      label: "Groups",
      icon: UsersRound,
      badge: groupUnread,
      badgeTone: "primary",
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

  // PREFERENCES & SECURITY Navigation Items
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
   * Render single navigation item for Expanded Sidebar
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
        className={`group relative flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer select-none ${
          item.active
            ? "bg-primary/12 text-primary font-semibold border border-primary/25 shadow-2xs"
            : "text-base-content/75 hover:bg-base-200/80 hover:text-base-content"
        }`}
      >
        {item.active && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary"
            aria-hidden="true"
          />
        )}
        <Icon className="size-4.5 shrink-0 group-hover:scale-105 transition-transform duration-150" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {Boolean(item.badge && item.badge > 0) && (
          <span
            className={`badge badge-sm px-2 py-0.5 rounded-full font-bold text-[10px] tabular-nums ml-auto shrink-0 ${
              isToneDanger
                ? "bg-error/15 text-error border border-error/30"
                : "bg-primary text-primary-content shadow-2xs"
            }`}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </button>
    );
  };

  /**
   * Render single navigation item for Collapsed Navigation Rail
   */
  const renderCollapsedItem = (item) => {
    const Icon = item.icon;
    const isToneDanger = item.badgeTone === "danger";

    return (
      <div key={item.id} className="relative group flex justify-center py-0.5 w-full">
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          className={`relative flex size-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer select-none ${
            item.active
              ? "bg-primary/15 text-primary border border-primary/25 shadow-2xs font-semibold"
              : "text-base-content/65 hover:text-base-content hover:bg-base-200/80 active:scale-95"
          }`}
        >
          {item.active && (
            <span
              className="absolute -left-2.5 top-2 bottom-2 w-1 rounded-r-full bg-primary"
              aria-hidden="true"
            />
          )}

          <Icon className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />

          {/* Collapsed dot / count badge */}
          {Boolean(item.badge && item.badge > 0) && (
            <span
              className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full ring-2 ring-base-100 ${
                isToneDanger
                  ? "size-2.5 bg-error animate-pulse"
                  : "min-w-[16px] h-4 px-1 bg-primary text-primary-content text-[9px] font-bold tabular-nums shadow-2xs"
              }`}
            >
              {!isToneDanger && (item.badge > 9 ? "9+" : item.badge)}
            </span>
          )}
        </button>

        {/* Refined Floating Tooltip on Hover */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap">
          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-base-300 text-base-content text-xs font-semibold shadow-xl border border-base-content/10">
            {/* Tooltip caret */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-base-300 border-l border-b border-base-content/10" />
            <span className="relative z-10">{item.label}</span>
            {Boolean(item.badge && item.badge > 0) && (
              <span
                className={`badge badge-xs px-1.5 py-0.5 rounded-full font-bold text-[9px] relative z-10 ${
                  isToneDanger
                    ? "bg-error text-error-content"
                    : "bg-primary text-primary-content"
                }`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render Expanded Sidebar Content
   */
  const renderExpandedContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-base-100 overflow-hidden">
      {/* A. Brand Header */}
      <div className="h-13 sm:h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-base-300/70 bg-base-100/90 backdrop-blur-md">
        <Link
          to="/chat"
          onClick={() => isDrawer && closeMobile()}
          className="flex items-center gap-3 group select-none"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <ChattyLogo className="size-6 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-base tracking-tight text-base-content">
              Chatty
            </span>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
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
            className="flex size-8 items-center justify-center rounded-lg text-base-content/50 hover:text-base-content hover:bg-base-200 active:scale-95 transition-all cursor-pointer"
          >
            <PanelLeftClose className="size-4.5" />
          </button>
        )}
      </div>

      {/* B. User Profile Summary Card */}
      <div className="p-3 border-b border-base-300/50 shrink-0">
        <div
          onClick={() => handleNav("/profile")}
          className="flex items-center gap-3 p-2 rounded-xl bg-base-200/50 hover:bg-base-200/90 border border-base-300/60 hover:border-base-content/20 transition-all cursor-pointer group"
        >
          <div className="relative shrink-0">
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "User"}
              className="size-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all"
            />
            {meOnline && (
              <span
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-base-100"
                aria-label="Online status"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs sm:text-[13px] font-semibold text-base-content truncate group-hover:text-primary transition-colors">
              {authUser?.fullName || "My Account"}
            </p>
            <p className="text-[11px] text-base-content/60 truncate mt-0.5 flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full shrink-0 ${
                  meOnline ? "bg-success animate-pulse" : "bg-base-content/30"
                }`}
              />
              <span className="truncate">
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

      {/* C. Hierarchical Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 no-scrollbar">
        {/* Main Menu Group */}
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-base-content/40 uppercase select-none">
            Main Menu
          </p>
          <div className="space-y-1">{mainNavItems.map(renderExpandedItem)}</div>
        </div>

        {/* Section Separator */}
        <div className="h-px bg-base-300/50 mx-2 my-2" />

        {/* Preferences & Security Group */}
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-base-content/40 uppercase select-none">
            Preferences & Security
          </p>
          <div className="space-y-1">{settingsNavItems.map(renderExpandedItem)}</div>
        </div>
      </div>

      {/* D. Bottom Account Section */}
      <div className="p-3 border-t border-base-300/70 bg-base-100/95 backdrop-blur-sm flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleNav("/settings/appearance")}
          title="Customize Theme & Appearance"
          className="btn btn-sm btn-ghost gap-2 rounded-xl text-xs font-medium text-base-content/75 hover:text-base-content hover:bg-base-200 h-9 px-3 flex-1 justify-start cursor-pointer transition-colors"
        >
          <Palette className="size-4 text-primary" />
          <span>Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          title="Sign out of Chatty"
          className="btn btn-sm btn-ghost gap-1.5 rounded-xl text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 h-9 px-3 shrink-0 cursor-pointer transition-colors"
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  /**
   * Render Collapsed Navigation Rail Content
   */
  const renderCollapsedContent = () => (
    <div className="flex flex-col h-full bg-base-100 justify-between items-center py-3 overflow-hidden">
      {/* Top section: Logo + Expand Toggle */}
      <div className="flex flex-col items-center gap-2.5 w-full shrink-0">
        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Expand sidebar"
          title="Expand navigation (Cmd+B)"
          className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <ChattyLogo className="size-6 text-primary" />
        </button>

        <button
          type="button"
          onClick={toggleCollapse}
          aria-label="Expand sidebar control"
          title="Expand sidebar (Cmd+B)"
          className="flex size-7 items-center justify-center rounded-lg text-base-content/45 hover:text-base-content hover:bg-base-200 active:scale-95 transition-all cursor-pointer"
        >
          <PanelLeft className="size-4" />
        </button>

        <div className="w-8 h-px bg-base-300/70 mx-auto my-1" />
      </div>

      {/* Middle scrollable navigation icons */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar py-1 space-y-1">
        {mainNavItems.map(renderCollapsedItem)}
        <div className="w-8 h-px bg-base-300/60 mx-auto my-2" />
        {settingsNavItems.map(renderCollapsedItem)}
      </div>

      {/* Bottom section: Theme + Profile Avatar + Logout */}
      <div className="flex flex-col items-center gap-2 pt-2.5 border-t border-base-300/70 w-full shrink-0">
        {/* Theme quick toggle button */}
        <div className="relative group flex justify-center w-full">
          <button
            type="button"
            onClick={() => handleNav("/settings/appearance")}
            aria-label="Customize Theme"
            className="flex size-10 items-center justify-center rounded-xl text-base-content/65 hover:text-base-content hover:bg-base-200/80 active:scale-95 transition-all cursor-pointer"
          >
            <Palette className="size-4.5" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap">
            <div className="relative px-3 py-1.5 rounded-xl bg-base-300 text-base-content text-xs font-semibold shadow-xl border border-base-content/10">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-base-300 border-l border-b border-base-content/10" />
              Theme & Appearance
            </div>
          </div>
        </div>

        {/* User Profile Avatar */}
        <div className="relative group flex justify-center w-full">
          <button
            type="button"
            onClick={() => handleNav("/profile")}
            aria-label="My profile"
            className="relative flex size-10 items-center justify-center rounded-full hover:ring-2 hover:ring-primary active:scale-95 transition-all cursor-pointer"
          >
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "User"}
              className="size-9 rounded-full object-cover"
            />
            {meOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-base-100" />
            )}
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap">
            <div className="relative px-3 py-1.5 rounded-xl bg-base-300 text-base-content text-xs font-semibold shadow-xl border border-base-content/10 flex items-center gap-1.5">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-base-300 border-l border-b border-base-content/10" />
              <span className="font-bold">{authUser?.fullName || "Profile"}</span>
              <span className="text-base-content/50 text-[10px]">
                {meOnline ? "(Active)" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Logout action */}
        <div className="relative group flex justify-center w-full">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Log out"
            className="flex size-10 items-center justify-center rounded-xl text-error/75 hover:text-error hover:bg-error/10 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="size-4.5" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap">
            <div className="relative px-3 py-1.5 rounded-xl bg-error text-error-content text-xs font-bold shadow-xl">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-error" />
              Log out
            </div>
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
          className={`relative z-20 hidden md:flex flex-col h-full bg-base-100 border-r border-base-300/80 shrink-0 transition-[width] duration-300 ease-in-out select-none overflow-x-hidden ${
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
        {/* Backdrop Blur Overlay */}
        <div
          onClick={closeMobile}
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Off-Canvas Sliding Drawer Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className={`fixed inset-y-0 left-0 w-[290px] max-w-[85vw] h-full bg-base-100 shadow-2xl flex flex-col z-50 border-r border-base-300 transform transition-transform duration-300 ease-in-out ${
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
