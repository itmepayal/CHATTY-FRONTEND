import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  ghost: "btn-ghost hover:bg-base-200",
  primary: "btn-primary text-primary-content shadow-sm",
  secondary: "btn-secondary text-secondary-content shadow-sm",
  outline: "btn-outline border-base-300 hover:border-primary hover:bg-primary/10 hover:text-primary",
  danger: "btn-ghost text-error hover:bg-error/10",
  subtle: "bg-base-200/70 hover:bg-base-200 text-base-content/75 hover:text-base-content border-0",
};

const SIZE_CLASSES = {
  xs: "size-8 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 p-0",
  sm: "size-9 min-h-[44px] min-w-[44px] sm:min-h-[2.25rem] sm:min-w-[2.25rem] p-0",
  md: "size-11 min-h-[44px] min-w-[44px] sm:min-h-[2.75rem] sm:min-w-[2.75rem] p-0",
  lg: "size-12 min-h-[48px] min-w-[48px] p-0",
};

export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    children,
    label,
    title,
    variant = "ghost",
    size = "md",
    shape = "circle",
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
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.ghost;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const shapeClass = shape === "circle" ? "btn-circle rounded-full" : "rounded-xl";
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
      className={`btn transition-all duration-150 inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 ${shapeClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-4 sm:size-5 shrink-0" aria-hidden="true" />
      ) : (
        children
      )}
      <span className="sr-only">{accessibleLabel}</span>
    </button>
  );
});

export default IconButton;
