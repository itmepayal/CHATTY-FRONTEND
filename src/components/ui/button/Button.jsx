import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary: "btn-primary shadow-sm hover:shadow",
  secondary: "btn-secondary shadow-sm hover:shadow",
  outline: "btn-outline border-base-300 hover:border-primary hover:bg-primary/10 hover:text-primary",
  ghost: "btn-ghost hover:bg-base-200",
  danger: "btn-error text-error-content shadow-sm hover:shadow",
  success: "btn-success text-success-content shadow-sm hover:shadow",
  link: "btn-link text-primary underline-offset-4 hover:underline",
};

const SIZE_CLASSES = {
  xs: "btn-xs text-xs min-h-[36px] sm:min-h-0",
  sm: "btn-sm text-xs sm:text-sm min-h-[44px] sm:min-h-[2rem]",
  md: "btn-md text-sm sm:text-base min-h-[44px] sm:min-h-[2.75rem]",
  lg: "btn-lg text-base sm:text-lg min-h-[48px] sm:min-h-[3rem]",
};

export const Button = forwardRef(function Button(
  {
    children,
    type = "button",
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    loadingText,
    disabled = false,
    icon: Icon,
    iconRight: IconRight,
    className = "",
    ariaLabel,
    onClick,
    ...props
  },
  ref,
) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const widthClass = fullWidth ? "w-full" : "";
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      aria-label={ariaLabel}
      onClick={isDisabled ? undefined : onClick}
      className={`btn transition-all duration-150 inline-flex items-center justify-center gap-2 rounded-xl font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
          <span className="sr-only">Loading</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
          {children}
          {IconRight && <IconRight className="size-4 shrink-0" aria-hidden="true" />}
        </>
      )}
    </button>
  );
});

export default Button;
