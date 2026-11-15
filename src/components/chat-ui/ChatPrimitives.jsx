import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * Avatar with fallback initials and optional online status indicator dot.
 */
export const Avatar = ({
  src,
  name = "User",
  size = "md",
  online = false,
  group = false,
  showStatus = false,
  className = "",
  onClick,
}) => {
  const SIZES = {
    xs: "size-7 text-xs",
    sm: "size-9 text-xs sm:text-sm",
    md: "size-11 text-sm sm:text-base",
    lg: "size-14 text-lg",
    xl: "size-20 text-2xl",
    "2xl": "size-24 text-3xl",
  };

  const DOT_SIZES = {
    xs: "size-2 ring-1",
    sm: "size-2.5 ring-1.5",
    md: "size-3 ring-2",
    lg: "size-3.5 ring-2",
    xl: "size-4 ring-2",
    "2xl": "size-5 ring-3",
  };

  const sizeClass = SIZES[size] || SIZES.md;
  const dotSizeClass = DOT_SIZES[size] || DOT_SIZES.md;
  const initials = (name || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarUrl = typeof src === "string" ? src : src?.url;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${
        onClick ? "cursor-pointer transition-transform hover:scale-105 active:scale-95" : ""
      } ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClass} rounded-full object-cover ring-1 ring-base-content/10 shadow-xs`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}

      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-semibold uppercase shadow-xs ${
          avatarUrl ? "hidden" : "flex"
        } ${
          group
            ? "bg-secondary/15 text-secondary border border-secondary/30"
            : "bg-primary/15 text-primary border border-primary/30"
        }`}
      >
        {initials}
      </div>

      {(showStatus || online) && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-base-100 ${dotSizeClass} ${
            online ? "bg-success" : "bg-base-content/30"
          }`}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
};

/**
 * OnlineStatus indicator dot or text badge.
 */
export const OnlineStatus = ({
  online = false,
  text,
  size = "sm",
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        online ? "text-success" : "text-base-content/50"
      } ${className}`}
    >
      <span
        className={`rounded-full shrink-0 ${
          size === "sm" ? "size-2" : "size-2.5"
        } ${online ? "bg-success animate-pulse" : "bg-base-content/30"}`}
        aria-hidden="true"
      />
      {text || (online ? "Online" : "Offline")}
    </span>
  );
};

/**
 * Consistent circular or rounded IconButton with accessible labels and hover/active states.
 */
export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    children,
    label,
    title,
    variant = "ghost",
    size = "md",
    shape = "circle",
    active = false,
    danger = false,
    loading = false,
    disabled = false,
    className = "",
    type = "button",
    onClick,
    ...props
  },
  ref,
) {
  const accessibleLabel = label || title;

  const VARIANTS = {
    ghost: active
      ? "bg-primary/15 text-primary hover:bg-primary/20"
      : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200/80",
    primary: "btn-primary text-primary-content shadow-sm hover:shadow",
    secondary: "btn-secondary text-secondary-content shadow-sm",
    outline: "btn-outline border-base-300 hover:border-primary hover:bg-primary/10 hover:text-primary",
    subtle: "bg-base-200/70 hover:bg-base-200 text-base-content/75 hover:text-base-content border-0",
  };

  const SIZES = {
    xs: "size-8 min-h-[32px] min-w-[32px] p-0 text-xs",
    sm: "size-9 min-h-[36px] min-w-[36px] p-0 text-sm",
    md: "size-10 min-h-[40px] min-w-[40px] p-0 text-base",
    lg: "size-11 min-h-[44px] min-w-[44px] p-0 text-lg",
  };

  const shapeClass = shape === "circle" ? "btn-circle rounded-full" : "rounded-xl";
  const variantClass = danger
    ? "btn-ghost text-error hover:bg-error/10 hover:text-error"
    : VARIANTS[variant] || VARIANTS.ghost;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={accessibleLabel}
      title={title || label}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      onClick={isDisabled ? undefined : onClick}
      className={`btn transition-all duration-150 inline-flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${shapeClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-4 sm:size-4.5 shrink-0" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
});

/**
 * Standard Primary Action Button
 */
export const PrimaryButton = forwardRef(function PrimaryButton(
  {
    children,
    loading = false,
    loadingText,
    disabled = false,
    icon: Icon,
    size = "md",
    fullWidth = false,
    className = "",
    ...props
  },
  ref,
) {
  const SIZES = {
    sm: "btn-sm h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded-lg",
    md: "btn-md h-11 min-h-[44px] px-5 text-sm sm:text-base rounded-xl",
    lg: "btn-lg h-12 min-h-[48px] px-6 text-base rounded-xl",
  };

  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`btn btn-primary text-primary-content font-semibold shadow-sm hover:shadow transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:opacity-50 ${sizeClass} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
});

/**
 * Standard Secondary Action Button
 */
export const SecondaryButton = forwardRef(function SecondaryButton(
  {
    children,
    disabled = false,
    icon: Icon,
    size = "md",
    fullWidth = false,
    className = "",
    ...props
  },
  ref,
) {
  const SIZES = {
    sm: "btn-sm h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded-lg",
    md: "btn-md h-11 min-h-[44px] px-5 text-sm sm:text-base rounded-xl",
    lg: "btn-lg h-12 min-h-[48px] px-6 text-base rounded-xl",
  };

  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      ref={ref}
      disabled={disabled}
      aria-disabled={disabled}
      className={`btn btn-ghost hover:bg-base-200/80 text-base-content/80 hover:text-base-content font-medium transition-all inline-flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 ${sizeClass} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
});

/**
 * Standard Empty State UI
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-3.5 select-none ${className}`}
    >
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200/80 text-base-content/50 shadow-inner">
          <Icon className="size-7" aria-hidden="true" />
        </div>
      )}
      <div className="space-y-1 max-w-xs">
        {title && <h3 className="font-semibold text-base text-base-content/90">{title}</h3>}
        {description && (
          <p className="text-xs sm:text-sm text-base-content/60 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
};

/**
 * Standard Loading State Spinner
 */
export const LoadingState = ({
  message = "Loading...",
  size = "md",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 gap-3 select-none text-base-content/60 ${className}`}
    >
      <Loader2
        className={`animate-spin text-primary ${
          size === "sm" ? "size-5" : size === "lg" ? "size-10" : "size-7"
        }`}
        aria-hidden="true"
      />
      {message && <p className="text-xs sm:text-sm font-medium">{message}</p>}
    </div>
  );
};

/**
 * Standard Error State UI
 */
export const ErrorState = ({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-3 select-none ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-error/15 text-error">
        <span className="text-lg font-bold">!</span>
      </div>
      <div className="space-y-1 max-w-xs">
        <h3 className="font-semibold text-sm sm:text-base text-error">{title}</h3>
        {message && <p className="text-xs text-base-content/60">{message}</p>}
      </div>
      {onRetry && (
        <PrimaryButton size="sm" onClick={onRetry} className="mt-2">
          Try Again
        </PrimaryButton>
      )}
    </div>
  );
};
