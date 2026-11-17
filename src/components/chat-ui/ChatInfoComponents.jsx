import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Info,
  PanelRightOpen,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Avatar, IconButton } from "./ChatPrimitives";

const SPRING = { type: "spring", stiffness: 450, damping: 38 };

/**
 * ChatInfoPanel
 * Symmetrical 3rd-column responsive info container.
 * On desktop (xl+), acts as a docked sidebar matching left sidebar width.
 * On tablet/mobile (<xl), acts as an animated slide-over drawer with backdrop.
 */
export const ChatInfoPanel = ({
  open = true,
  onToggle,
  title = "Information",
  subtitle,
  actions,
  children,
  className = "",
}) => {
  // Close drawer on Escape key when on mobile/tablet
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onToggle && window.innerWidth < 1280) {
        onToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle]);

  // Collapsed strip on desktop when closed
  if (!open) {
    return (
      <div className="hidden xl:flex shrink-0 w-12 border-l border-base-300 bg-base-100 flex-col items-center pt-3.5 z-10">
        <IconButton
          icon={PanelRightOpen}
          label="Open information panel"
          title="Open info"
          size="sm"
          variant="ghost"
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile & Tablet Slide-Over Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs xl:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Info Aside Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-2xl xl:relative xl:z-auto lg:w-[320px] xl:w-[340px] xl:max-w-none xl:shadow-none transition-all duration-200 overflow-hidden ${className}`}
      >
        {/* Info Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between gap-3 border-b border-base-200/80 shrink-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200/80 text-base-content/60">
              <Info className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-tight">
              <h3 className="truncate text-base font-bold tracking-tight text-base-content/90">
                {title}
              </h3>
              {subtitle && (
                <p className="truncate text-xs text-base-content/55 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {actions}
            {onToggle && (
              <IconButton
                icon={X}
                label="Close panel"
                title="Close"
                size="sm"
                variant="ghost"
                onClick={onToggle}
              />
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </aside>
    </>
  );
};

/**
 * InfoProfileHeader
 * Profile avatar, name, handle, status badge, and about bio.
 */
export const InfoProfileHeader = ({
  avatar,
  name,
  subtitle,
  badge,
  badgeTone = "default",
  description,
  onAvatarClick,
  className = "",
}) => {
  const BADGE_TONES = {
    default: "bg-base-200 text-base-content/60",
    success: "bg-success/15 text-success border border-success/30",
    primary: "bg-primary/15 text-primary border border-primary/30",
    warning: "bg-warning/15 text-warning border border-warning/30",
    error: "bg-error/15 text-error border border-error/30",
  };

  return (
    <div
      className={`flex flex-col items-center px-5 pt-6 pb-5 text-center select-none ${className}`}
    >
      <div className="relative mb-3.5">
        <Avatar
          src={avatar}
          name={name}
          size="2xl"
          onClick={onAvatarClick}
          className="ring-4 ring-base-200 shadow-md"
        />
      </div>

      <h3 className="text-lg font-bold tracking-tight text-base-content/95 break-words max-w-full">
        {name}
      </h3>

      {subtitle && (
        <p className="text-xs sm:text-sm text-base-content/55 mt-0.5 truncate max-w-full">
          {subtitle}
        </p>
      )}

      {badge && (
        <div className="mt-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              BADGE_TONES[badgeTone] || BADGE_TONES.default
            }`}
          >
            {badge}
          </span>
        </div>
      )}

      {description && (
        <p className="mt-3.5 text-xs sm:text-sm text-base-content/75 leading-relaxed break-words max-w-full px-2">
          {description}
        </p>
      )}
    </div>
  );
};

/**
 * InfoActionGrid
 * Centralized quick action buttons grid.
 */
export const InfoActionGrid = ({ children, className = "" }) => {
  return (
    <div
      className={`grid grid-cols-4 gap-2 px-5 pb-4 select-none ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * InfoActionButton
 * Individual quick action button with icon and label below.
 */
export const InfoActionButton = ({
  icon: Icon,
  label,
  active = false,
  danger = false,
  disabled = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
        danger
          ? "bg-error/10 text-error hover:bg-error/20"
          : active
          ? "bg-primary/15 text-primary hover:bg-primary/20"
          : "bg-base-200/70 text-base-content/75 hover:bg-base-200 hover:text-base-content"
      } ${className}`}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <span className="text-[11px] font-semibold truncate w-full text-center">
        {label}
      </span>
    </button>
  );
};

/**
 * InfoStatGrid
 * Grid for stat metrics (Messages, Media, Files, Links, Members).
 */
export const InfoStatGrid = ({ children, className = "" }) => {
  return (
    <div
      className={`grid grid-flow-col auto-cols-fr gap-2 px-5 pb-4 select-none ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * InfoStatCard
 * Individual metric tile.
 */
export const InfoStatCard = ({
  icon: Icon,
  value = 0,
  label,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-base-200/60 p-2.5 text-center border border-base-200/60 transition-colors hover:bg-base-200/90 ${className}`}
    >
      {Icon && (
        <Icon className="size-4 text-base-content/50 mb-1" aria-hidden="true" />
      )}
      <span className="text-base font-bold leading-tight text-base-content/90">
        {value}
      </span>
      <span className="text-[10px] sm:text-[11px] font-medium text-base-content/55 mt-0.5 truncate w-full">
        {label}
      </span>
    </div>
  );
};

/**
 * InfoSection
 * Structured section with title, aside counter, and content.
 */
export const InfoSection = ({
  title,
  aside,
  children,
  className = "",
}) => {
  return (
    <div className={`px-5 py-4 border-t border-base-200/70 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/60">
          {title}
        </h4>
        {aside !== undefined && aside !== null && (
          <span className="text-xs font-semibold text-base-content/45">
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  );
};

/**
 * InfoDetailRow
 * Row displaying an icon, label, and value with optional link behavior.
 */
export const InfoDetailRow = ({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  className = "",
}) => {
  const content = (
    <div
      className={`flex items-center justify-between gap-3 py-2 text-xs sm:text-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 text-base-content/70">
        {Icon && <Icon className="size-4 shrink-0 text-base-content/50" />}
        <span className="truncate font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0 text-right">
        <span className="truncate font-semibold text-base-content/90">
          {value || "—"}
        </span>
        {href && (
          <ExternalLink className="size-3.5 shrink-0 text-base-content/40" />
        )}
        {onClick && !href && (
          <ChevronRight className="size-3.5 shrink-0 text-base-content/40" />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-opacity hover:opacity-80"
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left transition-opacity hover:opacity-80"
      >
        {content}
      </button>
    );
  }

  return content;
};
