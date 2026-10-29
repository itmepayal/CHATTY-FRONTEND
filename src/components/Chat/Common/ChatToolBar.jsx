import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Flag,
  Loader2,
  MapPin,
  MoreHorizontal,
  Search,
  Timer,
  X,
} from "lucide-react";

const spring = { type: "spring", stiffness: 380, damping: 30 };

/* Small count / status chip that sits on a tool button */
const Chip = ({ children, tone = "primary" }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.5 }}
    transition={spring}
    className={`rounded-full px-1.5 text-[10px] font-semibold leading-4 ${
      tone === "primary"
        ? "bg-primary text-primary-content"
        : "bg-error text-error-content"
    }`}
  >
    {children}
  </motion.span>
);

/* One tool in the pill. Icon only on mobile, icon + label from sm up. */
const Tool = ({
  id,
  icon: Icon,
  label,
  active,
  hovered,
  onHover,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    onMouseEnter={() => onHover(id)}
    onFocus={() => onHover(id)}
    aria-label={label}
    title={label}
    className={`relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "text-primary" : "text-base-content/70 hover:text-base-content"
    }`}
  >
    {/* sliding hover highlight shared between all tools */}
    {hovered === id && (
      <motion.span
        layoutId="toolbar-hover"
        transition={spring}
        className="absolute inset-0 rounded-full bg-base-300/60"
      />
    )}
    {active && (
      <span className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-primary/25" />
    )}
    <Icon className="relative size-4" />
    <span className="relative hidden sm:inline">{label}</span>
    <AnimatePresence initial={false}>{children}</AnimatePresence>
  </button>
);

const MoreItem = ({ icon: Icon, label, onClick, danger }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-none ${
      danger ? "text-error hover:bg-error/10" : ""
    }`}
  >
    <Icon className="size-4" />
    {label}
  </button>
);

const ChatToolbar = ({
  // search
  searchOpen,
  setSearchOpen,
  searchQ,
  setSearchQ,
  searching,
  // scheduled
  scheduledCount = 0,
  onOpenScheduled,
  // disappearing
  disappearAfter = 0,
  disappearLabel = "",
  onOpenDisappearing,
  // location
  showLocation = true,
  isSharingLive = false,
  onOpenLocation,
  // archive + report
  isArchived = false,
  onArchive,
  onReport,
}) => {
  const [hovered, setHovered] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const inputRef = useRef(null);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQ("");
  };

  // Ctrl/Cmd + K opens search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  // close "More" menu on outside click / Esc
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e) => {
      if (!moreRef.current?.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <div className="border-b border-base-300 bg-base-100/80 px-3 py-1.5 backdrop-blur">
      <AnimatePresence mode="wait" initial={false}>
        {searchOpen ? (
          /* ---------------- Search mode ---------------- */
          <motion.div
            key="search"
            initial={{ opacity: 0, scaleX: 0.92 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={spring}
            style={{ transformOrigin: "left center" }}
            className="flex items-center gap-2 rounded-full border border-primary/40 bg-base-200/60 py-0.5 pl-3 pr-1 ring-1 ring-primary/20"
          >
            <Search className="size-4 shrink-0 text-primary" />
            <input
              ref={inputRef}
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder="Search in this chat"
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
            />
            {searching ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-base-content/50" />
            ) : (
              searchQ && (
                <span className="hidden text-[11px] text-base-content/40 sm:inline">
                  Esc to close
                </span>
              )
            )}
            {searchQ && (
              <button
                type="button"
                onClick={() => {
                  setSearchQ("");
                  inputRef.current?.focus();
                }}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              className="btn btn-ghost btn-xs rounded-full px-2.5"
            >
              Cancel
            </button>
          </motion.div>
        ) : (
          /* ---------------- Tools mode ---------------- */
          <motion.div
            key="tools"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={spring}
            className="flex items-center gap-2"
          >
            <div
              onMouseLeave={() => setHovered(null)}
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-full border border-base-300 bg-base-200/50 p-0.5"
            >
              <Tool
                id="search"
                icon={Search}
                label="Search"
                hovered={hovered}
                onHover={setHovered}
                onClick={() => setSearchOpen(true)}
              >
                <kbd className="relative ml-0.5 hidden rounded border border-base-300 bg-base-100 px-1 text-[10px] text-base-content/50 lg:inline">
                  Ctrl K
                </kbd>
              </Tool>

              <Tool
                id="scheduled"
                icon={Clock}
                label="Scheduled"
                active={scheduledCount > 0}
                hovered={hovered}
                onHover={setHovered}
                onClick={onOpenScheduled}
              >
                {scheduledCount > 0 && <Chip key="c">{scheduledCount}</Chip>}
              </Tool>

              <Tool
                id="timer"
                icon={Timer}
                label="Disappearing"
                active={disappearAfter > 0}
                hovered={hovered}
                onHover={setHovered}
                onClick={onOpenDisappearing}
              >
                {disappearAfter > 0 && <Chip key="c">{disappearLabel}</Chip>}
              </Tool>

              {showLocation && (
                <Tool
                  id="loc"
                  icon={MapPin}
                  label="Location"
                  active={isSharingLive}
                  hovered={hovered}
                  onHover={setHovered}
                  onClick={onOpenLocation}
                >
                  {isSharingLive && (
                    <motion.span
                      key="live"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="relative flex size-2"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-error" />
                    </motion.span>
                  )}
                </Tool>
              )}
            </div>

            {/* Less-used actions live in a menu so the bar stays calm */}
            <div ref={moreRef} className="relative shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={`btn btn-ghost btn-sm btn-circle border border-base-300 ${
                  moreOpen ? "bg-base-300/60" : ""
                }`}
              >
                <MoreHorizontal className="size-4" />
              </motion.button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.97,
                      transition: { duration: 0.1 },
                    }}
                    transition={spring}
                    style={{ transformOrigin: "top right" }}
                    className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-base-300 bg-base-100 p-1 shadow-xl"
                  >
                    <MoreItem
                      icon={isArchived ? ArchiveRestore : Archive}
                      label={isArchived ? "Unarchive chat" : "Archive chat"}
                      onClick={() => {
                        setMoreOpen(false);
                        onArchive?.();
                      }}
                    />
                    <div className="my-1 border-t border-base-300" />
                    <MoreItem
                      icon={Flag}
                      label="Report user"
                      danger
                      onClick={() => {
                        setMoreOpen(false);
                        onReport?.();
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatToolbar;
