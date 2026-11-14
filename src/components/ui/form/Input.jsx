import { forwardRef } from "react";

const SIZES = {
  sm: "h-10 text-xs sm:text-sm px-3",
  md: "h-11 sm:h-12 text-sm sm:text-base px-3.5",
  lg: "h-12 sm:h-14 text-base px-4",
};

export const Input = forwardRef(function Input(
  {
    type = "text",
    size = "md",
    error = false,
    success = false,
    icon: Icon,
    iconRight: IconRight,
    rightElement,
    className = "",
    disabled = false,
    id,
    ...props
  },
  ref,
) {
  const sizeClass = SIZES[size] || SIZES.md;
  const leftPadClass = Icon ? "pl-10 sm:pl-11" : "";
  const rightPadClass = IconRight || rightElement ? "pr-10 sm:pr-11" : "";

  const stateClass = error
    ? "border-error focus:border-error focus:ring-error/20"
    : success
      ? "border-success focus:border-success focus:ring-success/20"
      : "border-base-300 focus:border-primary focus:ring-primary/15";

  return (
    <div className="relative w-full group">
      {Icon && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-base-content/40 transition-colors group-focus-within:text-primary"
          aria-hidden="true"
        >
          <Icon className="size-4 sm:size-5 shrink-0" />
        </div>
      )}

      <input
        ref={ref}
        id={id}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={`input input-bordered w-full rounded-xl bg-base-100 transition-all focus:outline-none focus:ring-4 disabled:bg-base-200/50 disabled:cursor-not-allowed ${sizeClass} ${leftPadClass} ${rightPadClass} ${stateClass} ${className}`}
        {...props}
      />

      {rightElement ? (
        <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-2">
          {rightElement}
        </div>
      ) : IconRight ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-3.5 text-base-content/40"
          aria-hidden="true"
        >
          <IconRight className="size-4 sm:size-5 shrink-0" />
        </div>
      ) : null}
    </div>
  );
});

export default Input;
