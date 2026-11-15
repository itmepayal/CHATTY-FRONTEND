import { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { Avatar } from "./ChatPrimitives";

/**
 * ChatSidebar wrapper
 */
export const ChatSidebar = ({
  children,
  hasOpenChat = false,
  className = "",
}) => {
  return (
    <aside
      className={`h-full w-full min-w-0 shrink-0 flex flex-col border-r border-base-300 bg-base-100 md:w-80 lg:w-[320px] xl:w-[360px] transition-all duration-200 z-10 ${
        hasOpenChat ? "hidden md:flex" : "flex"
      } ${className}`}
    >
      {children}
    </aside>
  );
};

/**
 * ChatSidebarHeader
 */
export const ChatSidebarHeader = ({
  icon: Icon,
  title = "Messages",
  subtitle,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`px-4 pt-3.5 pb-2.5 sm:px-5 flex items-center justify-between gap-3 border-b border-base-200/60 shrink-0 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold shadow-2xs">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-lg font-bold tracking-tight text-base-content/90">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-xs font-medium text-base-content/55 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * ChatNavigationTabs (Messages / Groups / Calls mode switcher)
 */
export const ChatNavigationTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <nav
      role="tablist"
      aria-label="Chat modes"
      className={`grid grid-flow-col auto-cols-fr gap-1 bg-base-200/70 p-1 rounded-xl border border-base-300/60 select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-base-100 text-primary shadow-xs"
                : "text-base-content/60 hover:text-base-content hover:bg-base-100/50"
            }`}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded-full text-[10px] font-bold leading-none ${
                  tab.tone === "danger"
                    ? "bg-error text-error-content"
                    : "bg-primary text-primary-content"
                }`}
              >
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

/**
 * ChatSearchInput
 */
export const ChatSearchInput = forwardRef(function ChatSearchInput(
  {
    value,
    onChange,
    onClear,
    placeholder = "Search...",
    loading = false,
    className = "",
    ...props
  },
  ref,
) {
  const hasValue = Boolean(value);

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange({ target: { value: "" } });
  };

  return (
    <div className={`relative w-full group ${className}`}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-base-content/40 transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin shrink-0" />
        ) : (
          <Search className="size-4 shrink-0" />
        )}
      </div>

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input input-bordered h-10 sm:h-10.5 w-full rounded-xl bg-base-100/90 pl-10 pr-9 text-sm transition-all focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/15"
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 z-10 flex items-center pr-2.5 text-base-content/40 hover:text-base-content transition-colors"
        >
          <span className="flex size-6 items-center justify-center rounded-md hover:bg-base-200">
            <X className="size-3.5" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
});

/**
 * ChatFilterTabs (All, Unread, Favorites)
 */
export const ChatFilterTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              isActive
                ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                : "bg-base-200/60 text-base-content/65 hover:bg-base-200 hover:text-base-content border border-transparent"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`text-[10px] px-1 rounded-full ${
                  isActive ? "bg-primary text-primary-content font-bold" : "text-base-content/50"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * ChatList container
 */
export const ChatList = ({ children, className = "" }) => {
  return (
    <div className={`flex-1 overflow-y-auto px-2 py-1.5 space-y-1 overscroll-contain ${className}`}>
      {children}
    </div>
  );
};

/**
 * ChatListItem
 */
export const ChatListItem = ({
  avatar,
  name,
  subtitle,
  time,
  unread = 0,
  online = false,
  selected = false,
  group = false,
  trailing,
  actions,
  onClick,
  className = "",
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(e)}
      className={`group relative flex w-full items-center gap-3 rounded-xl p-2.5 sm:p-3 text-left transition-colors select-none cursor-pointer ${
        selected
          ? "bg-primary/10 text-primary border border-primary/25"
          : "hover:bg-base-200/70 text-base-content border border-transparent"
      } ${className}`}
    >
      <Avatar
        src={avatar}
        name={name}
        group={group}
        online={online}
        showStatus={!group}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <p className="truncate text-sm font-semibold tracking-tight leading-tight">
            {name}
          </p>
          {time && (
            <span className="shrink-0 text-[11px] font-normal text-base-content/50">
              {time}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="truncate text-xs text-base-content/60 leading-snug">
            {subtitle}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-content">
                {unread > 99 ? "99+" : unread}
              </span>
            )}

            {actions && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                {actions}
              </div>
            )}

            {trailing}
          </div>
        </div>
      </div>
    </div>
  );
};
