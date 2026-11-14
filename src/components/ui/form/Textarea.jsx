import { forwardRef } from "react";

export const Textarea = forwardRef(function Textarea(
  {
    rows = 3,
    error = false,
    className = "",
    disabled = false,
    maxLength,
    value,
    ...props
  },
  ref,
) {
  const stateClass = error
    ? "textarea-error focus:border-error focus:ring-error/20"
    : "border-base-300 focus:border-primary focus:ring-primary/15";

  const currentLength = value !== undefined ? String(value).length : null;

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        aria-invalid={Boolean(error)}
        className={`textarea textarea-bordered w-full rounded-xl bg-base-100 text-sm leading-relaxed transition-all focus:outline-none focus:ring-4 disabled:bg-base-200/50 disabled:cursor-not-allowed ${stateClass} ${className}`}
        {...props}
      />
      {maxLength && currentLength !== null && (
        <div className="text-[11px] text-right text-base-content/50 pr-1 pt-0.5">
          {currentLength} / {maxLength}
        </div>
      )}
    </div>
  );
});

export default Textarea;
