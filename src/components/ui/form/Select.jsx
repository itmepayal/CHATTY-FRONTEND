import { forwardRef } from "react";

export const Select = forwardRef(function Select(
  {
    options = [],
    error = false,
    size = "md",
    className = "",
    disabled = false,
    placeholder,
    children,
    ...props
  },
  ref,
) {
  const heightClass =
    size === "sm"
      ? "select-sm text-xs sm:text-sm min-h-[44px] sm:min-h-[2rem]"
      : "select-md text-sm sm:text-base min-h-[44px] sm:min-h-[2.75rem]";

  const stateClass = error
    ? "select-error focus:border-error focus:ring-error/20"
    : "border-base-300 focus:border-primary focus:ring-primary/15";

  return (
    <select
      ref={ref}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      className={`select select-bordered w-full rounded-xl bg-base-100 transition-all focus:outline-none focus:ring-4 disabled:bg-base-200/50 disabled:cursor-not-allowed ${heightClass} ${stateClass} ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.length > 0
        ? options.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ),
          )
        : children}
    </select>
  );
});

export default Select;
