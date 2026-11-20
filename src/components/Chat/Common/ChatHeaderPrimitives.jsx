import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";

export const SPRING = { type: "spring", stiffness: 420, damping: 28 };
export const BUTTON_SPRING = { type: "spring", stiffness: 400, damping: 18 };

export const RING_GRADIENT =
  "conic-gradient(from 0deg, var(--color-success), var(--color-primary), var(--color-secondary), var(--color-success))";

export const ChatHeaderContainer = ({ children, className = "" }) => (
  <header
    className={`relative z-10 h-13 sm:h-14 w-full shrink-0 border-b border-base-300/80 bg-base-100/90 px-2.5 sm:px-4 shadow-xs backdrop-blur-xl flex items-center justify-between select-none ${className}`}
  >
    {/* Subtle ambient color wash */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-secondary/[0.05]" />

    {/* Light sweep animation on entry */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-base-content/[0.04] to-transparent"
        initial={{ x: "-120%" }}
        animate={{ x: "420%" }}
        transition={{ duration: 1.1, ease: "easeInOut", delay: 0.1 }}
      />
    </div>

    {/* Glowing hairline border at bottom */}
    <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

    {/* Content Wrapper */}
    <div className="relative flex w-full items-center justify-between gap-2 sm:gap-3 min-w-0">
      {children}
    </div>
  </header>
);

/**
 * 2. Left Identity Section Container
 */
export const ChatHeaderLeft = ({ children, className = "" }) => (
  <div
    className={`flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 relative ${className}`}
  >
    {children}
  </div>
);

/**
 * 3. Responsive Mobile Back Button
 * Smooth back navigation for mobile/tablet screen sizes.
 */
export const ChatHeaderBackButton = ({
  onClick,
  label = "Back to conversations",
}) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
    transition={BUTTON_SPRING}
    onClick={onClick}
    aria-label={label}
    title={label}
    className="btn btn-ghost btn-circle -ml-1 sm:-ml-1.5 lg:hidden shrink-0 size-9 sm:size-8.5 min-h-[40px] min-w-[40px] flex items-center justify-center text-base-content/70 hover:text-base-content hover:bg-base-200/80 cursor-pointer"
  >
    <ArrowLeft className="size-4 sm:size-4.5" aria-hidden="true" />
  </motion.button>
);

/**
 * 4. Unified Circular Avatar Component
 * Displays user/group avatar with optional pulsing presence ring and online indicator dot.
 */
export const ChatHeaderAvatar = ({
  src,
  name = "User",
  showOnlineBadge = false,
  showRing = false,
  isTyping = false,
  onClick,
  layoutId,
}) => {
  const isClickable = typeof onClick === "function";

  return (
    <div className="relative shrink-0">
      {/* Animated soft glow */}
      <AnimatePresence initial={false}>
        {showRing && (
          <motion.span
            key="glow"
            className="absolute -inset-1 rounded-full bg-primary/25 blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.85, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 2.5, repeat: Infinity } }}
          />
        )}
      </AnimatePresence>

      {/* Rotating gradient ring */}
      <AnimatePresence initial={false}>
        {showRing && (
          <motion.span
            key="ring"
            className="absolute -inset-[2.5px] rounded-full"
            style={{ background: RING_GRADIENT }}
            initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              opacity: { duration: 0.25 },
              scale: SPRING,
              rotate: {
                duration: isTyping ? 2 : 7,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          />
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClick}
        whileHover={isClickable ? { scale: 1.05 } : {}}
        whileTap={isClickable ? { scale: 0.95 } : {}}
        transition={SPRING}
        disabled={!isClickable}
        className={`relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          isClickable ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={isClickable ? `View ${name}'s photo` : undefined}
      >
        {src ? (
          <motion.img
            layoutId={layoutId}
            src={src}
            alt={name}
            transition={SPRING}
            onError={(e) => {
              e.currentTarget.src = "/avatar.png";
            }}
            className="size-9.5 sm:size-11 rounded-full border-2 border-base-100 bg-base-200 object-cover shadow-xs"
          />
        ) : (
          <div className="size-9.5 sm:size-11 rounded-full border-2 border-base-100 bg-primary/10 text-primary flex items-center justify-center font-bold text-sm sm:text-base shadow-xs uppercase">
            {name?.[0] || "?"}
          </div>
        )}
      </motion.button>

      {/* Online indicator dot */}
      <AnimatePresence>
        {showOnlineBadge && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="absolute bottom-0 right-0 size-2.5 sm:size-3 rounded-full bg-success ring-2 ring-base-100"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 5. Encryption Indicator Lock Icon
 */
export const EncryptionIndicator = ({ title = "End-to-end encrypted" }) => (
  <span
    className="inline-flex items-center text-base-content/40 hover:text-primary transition-colors cursor-help"
    title={title}
  >
    <Lock className="size-3.5 shrink-0" aria-label={title} />
  </span>
);

/**
 * 6. Contact / Group Name and Status Identity Column
 */
export const ChatHeaderIdentity = ({
  name,
  isEncrypted = true,
  subtitle,
  children,
  onClick,
}) => {
  const isClickable = typeof onClick === "function";

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`min-w-0 flex-1 flex flex-col justify-center ${
        isClickable ? "cursor-pointer select-none" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <h3 className="truncate text-[14px] sm:text-[15px] font-semibold leading-tight tracking-tight text-base-content hover:text-primary transition-colors">
          {name}
        </h3>
        {isEncrypted && <EncryptionIndicator />}
      </div>

      <div className="text-[11px] sm:text-xs text-base-content/60 leading-tight truncate mt-0.5">
        {subtitle || children}
      </div>
    </div>
  );
};

export const ChatHeaderActions = ({ children, className = "" }) => (
  <div
    className={`flex shrink-0 items-center gap-0.5 sm:gap-1.5 relative ${className}`}
  >
    {children}
  </div>
);

export const ChatHeaderActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  className = "",
}) => (
  <motion.button
    type="button"
    whileHover={!disabled ? { scale: 1.08 } : {}}
    whileTap={!disabled ? { scale: 0.92 } : {}}
    transition={BUTTON_SPRING}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`btn btn-ghost btn-circle btn-sm size-8 sm:size-9 min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center transition-all cursor-pointer ${
      danger
        ? "text-base-content/70 hover:bg-error/10 hover:text-error"
        : "text-base-content/70 hover:bg-primary/10 hover:text-primary"
    } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
  >
    <Icon className="size-3.5 sm:size-4 shrink-0" aria-hidden="true" />
  </motion.button>
);
