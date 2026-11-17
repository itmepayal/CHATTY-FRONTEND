import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Flag,
  Info,
  Loader2,
  MapPin,
  MoreVertical,
  Search,
  Timer,
  X,
} from "lucide-react";

const SPRING = { type: "spring", stiffness: 420, damping: 30 };

/**
 * ChatSearch - Refined, compact search field with subtle shortcut hint and clear button.
 */
export const ChatSearch = ({
  value = "",
  onChange,
  onClear,
  onFocus,
  searching = false,
  placeholder = "Search in conversation",
  inputRef,
  className = "",
}) => {
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  // Global Ctrl+K / Cmd+K handler to quickly focus the search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ref]);

  return (
    <div
      className={`group relative flex items-center flex-1 min-w-0 h-9 sm:h-9.5 rounded-xl border border-base-300/80 bg-base-200/40 hover:bg-base-200/60 focus-within:bg-base-100 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all duration-150 ${className}`}
    >
      <Search className="size-4 ml-3 text-base-content/40 group-focus-within:text-primary transition-colors shrink-0 pointer-events-none" />

      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClear?.();
            ref.current?.blur();
          }
        }}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent px-2.5 py-1 text-xs sm:text-sm text-base-content placeholder:text-base-content/40 outline-none"
      />

      <div className="flex items-center shrink-0 pr-2">
        {searching ? (
          <Loader2 className="size-3.5 text-base-content/40 animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onClear?.();
              ref.current?.focus();
            }}
            aria-label="Clear search"
            className="p-1 rounded-md text-base-content/40 hover:text-base-content hover:bg-base-300/50 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-base-300/80 bg-base-100/80 text-[10px] font-mono text-base-content/40 select-none">
            Ctrl K
          </kbd>
        )}
      </div>
    </div>
  );
};

/**
 * ToolbarAction - Compact, consistent action button / active state chip.
 */
export const ToolbarAction = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  badge = null,
  live = false,
  disabled = false,
  title,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className={`relative inline-flex items-center gap-1.5 h-9 sm:h-9.5 px-2.5 sm:px-3 rounded-xl border text-xs font-medium shrink-0 transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : live
            ? "border-error/40 bg-error/10 text-error hover:bg-error/15"
            : "border-base-300/80 bg-base-100/80 text-base-content/70 hover:bg-base-200/80 hover:text-base-content hover:border-base-content/20"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
      {live && (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-error" />
        </span>
      )}
      {badge != null && badge !== "" && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            active
              ? "bg-primary text-primary-content"
              : "bg-base-300 text-base-content"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

/**
 * ToolbarOverflowMenu - Three-dot dropdown, rendered in a portal so it is
 * never covered or clipped by the chat area / parent stacking contexts.
 */
export const ToolbarOverflowMenu = ({
  sections = [],
  buttonLabel = "More options",
  activeBadge = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 256 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Work out fixed position from the button's screen position
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = window.innerWidth >= 640 ? 256 : 224; // sm:w-64 / w-56
      const left = Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      );
      setPos({ top: rect.bottom + 6, left, width });
    }
    setOpen(true);
  };

  // Close on outside click, Escape, resize and page scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);

    const onDown = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      )
        return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onScroll = (e) => {
      // allow scrolling inside the menu itself
      if (menuRef.current?.contains(e.target)) return;
      close();
    };

    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const hasVisibleSections = sections.some(
    (s) => s.items && s.items.length > 0,
  );

  return (
    <div className={`relative shrink-0 ${className}`}>
      <motion.button
        ref={buttonRef}
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex items-center justify-center size-9 sm:size-9.5 min-h-[36px] min-w-[36px] rounded-xl border transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          open
            ? "border-base-content/25 bg-base-200 text-base-content"
            : "border-base-300/80 bg-base-100/90 text-base-content/70 hover:bg-base-200/80 hover:text-base-content hover:border-base-content/20"
        }`}
      >
        <MoreVertical className="size-4" />
        {activeBadge && !open && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-base-100" />
        )}
      </motion.button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && hasVisibleSections && (
              <motion.div
                ref={menuRef}
                role="menu"
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: -4,
                  transition: { duration: 0.1 },
                }}
                transition={SPRING}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  transformOrigin: "top right",
                  zIndex: 99999,
                }}
                className="max-h-[min(480px,80vh)] overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl"
              >
                {sections.map((sec, secIdx) => {
                  const visibleItems = (sec.items || []).filter(Boolean);
                  if (visibleItems.length === 0) return null;

                  return (
                    <div
                      key={sec.title || secIdx}
                      role="group"
                      aria-label={sec.title}
                    >
                      {secIdx > 0 && (
                        <div className="my-1 border-t border-base-300/60" />
                      )}
                      {sec.title && (
                        <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/40 select-none">
                          {sec.title}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id || item.label}
                              type="button"
                              role="menuitem"
                              disabled={item.disabled}
                              onClick={() => {
                                setOpen(false);
                                item.onClick?.();
                              }}
                              className={`group flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs sm:text-sm font-medium transition-colors select-none outline-none focus-visible:bg-base-200 ${
                                item.danger
                                  ? "text-error hover:bg-error/10 hover:text-error"
                                  : "text-base-content/80 hover:bg-base-200 hover:text-base-content"
                              } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {Icon && (
                                  <Icon
                                    className={`size-4 shrink-0 transition-colors ${
                                      item.danger
                                        ? "text-error"
                                        : "text-base-content/60 group-hover:text-base-content"
                                    }`}
                                  />
                                )}
                                <span className="truncate">{item.label}</span>
                              </div>

                              {/* Live pulse dot */}
                              {item.live && (
                                <span className="relative flex size-2 shrink-0">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
                                  <span className="relative inline-flex size-2 rounded-full bg-error" />
                                </span>
                              )}

                              {/* Badge (e.g. disappearing timer label) */}
                              {item.badge && (
                                <span className="shrink-0 rounded-md bg-base-200 px-1.5 py-0.5 text-[10px] font-medium text-base-content/60 border border-base-300/60">
                                  {item.badge}
                                </span>
                              )}

                              {/* Count chip (e.g. scheduled count) */}
                              {item.count != null && item.count > 0 && (
                                <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {item.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

/**
 * ChatToolbar - Action bar directly under the chat header.
 * Search is the primary flexible element; secondary actions live in the three-dot menu.
 */
export const ChatToolbar = ({
  // Search
  searchOpen,
  setSearchOpen,
  searchQ = "",
  setSearchQ,
  searching = false,
  placeholder = "Search in conversation",
  // Scheduled
  scheduledCount = 0,
  onOpenScheduled,
  // Disappearing
  disappearAfter = 0,
  disappearLabel = "",
  onOpenDisappearing,
  // Location
  showLocation = true,
  isSharingLive = false,
  onOpenLocation,
  // Archive + Report
  isArchived = false,
  onArchive,
  onReport,
  // Optional extras
  onToggleInfo,
  menuSections,
  className = "",
}) => {
  const inputRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchQ?.(val);
    if (!searchOpen && setSearchOpen) {
      setSearchOpen(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQ?.("");
    if (setSearchOpen) {
      setSearchOpen(false);
    }
  };

  // Menu sections: Conversation, Sharing, Additional actions
  const defaultSections = useMemo(
    () => [
      {
        title: "Conversation",
        items: [
          onToggleInfo && {
            id: "contact-info",
            label: "Contact info",
            icon: Info,
            onClick: onToggleInfo,
          },
          onOpenScheduled && {
            id: "scheduled-messages",
            label: "Scheduled messages",
            icon: Clock,
            count: scheduledCount > 0 ? scheduledCount : null,
            onClick: onOpenScheduled,
          },
          onOpenDisappearing && {
            id: "disappearing-messages",
            label: "Disappearing messages",
            icon: Timer,
            badge: disappearAfter > 0 ? disappearLabel : null,
            onClick: onOpenDisappearing,
          },
        ].filter(Boolean),
      },
      {
        title: "Sharing",
        items: [
          showLocation &&
            onOpenLocation && {
              id: "location-sharing",
              label: isSharingLive ? "Sharing live location" : "Share location",
              icon: MapPin,
              live: isSharingLive,
              onClick: onOpenLocation,
            },
        ].filter(Boolean),
      },
      {
        title: "Additional actions",
        items: [
          onArchive && {
            id: "archive-chat",
            label: isArchived ? "Unarchive chat" : "Archive chat",
            icon: isArchived ? ArchiveRestore : Archive,
            onClick: onArchive,
          },
          onReport && {
            id: "report-user",
            label: "Report contact",
            icon: Flag,
            danger: true,
            onClick: onReport,
          },
        ].filter(Boolean),
      },
    ],
    [
      onToggleInfo,
      onOpenScheduled,
      scheduledCount,
      onOpenDisappearing,
      disappearAfter,
      disappearLabel,
      showLocation,
      onOpenLocation,
      isSharingLive,
      onArchive,
      isArchived,
      onReport,
    ],
  );

  const activeSections = menuSections || defaultSections;
  const hasActivePolicy =
    scheduledCount > 0 || disappearAfter > 0 || isSharingLive;

  return (
    <div
      className={`relative border-b border-base-300/80 bg-base-100/85 px-3 sm:px-4 py-1.5 sm:py-2 backdrop-blur-md ${className}`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 max-w-full">
        {/* Primary element: compact search input */}
        <ChatSearch
          value={searchQ}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          onFocus={() => setSearchOpen?.(true)}
          searching={searching}
          placeholder={placeholder}
          inputRef={inputRef}
        />

        {/* Desktop quick-access chips (only when something is active) */}
        {scheduledCount > 0 && onOpenScheduled && (
          <ToolbarAction
            icon={Clock}
            label="Scheduled"
            badge={scheduledCount}
            active
            onClick={onOpenScheduled}
            title="View scheduled messages"
            className="hidden lg:inline-flex"
          />
        )}

        {disappearAfter > 0 && onOpenDisappearing && (
          <ToolbarAction
            icon={Timer}
            label={disappearLabel || "Timer active"}
            active
            onClick={onOpenDisappearing}
            title="Disappearing messages timer is active"
            className="hidden lg:inline-flex"
          />
        )}

        {isSharingLive && onOpenLocation && (
          <ToolbarAction
            icon={MapPin}
            label="Live"
            live
            active
            onClick={onOpenLocation}
            title="You are sharing live location"
            className="hidden lg:inline-flex"
          />
        )}

        {/* Three-dot overflow menu */}
        <ToolbarOverflowMenu
          sections={activeSections}
          buttonLabel="More conversation options"
          activeBadge={hasActivePolicy}
        />
      </div>
    </div>
  );
};

export default ChatToolbar;
