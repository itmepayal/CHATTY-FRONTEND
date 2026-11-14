import { useId } from "react";

export const FormField = ({
  children,
  label,
  id: explicitId,
  required = false,
  description,
  error,
  hint,
  className = "",
  labelRight,
}) => {
  const generatedId = useId();
  const fieldId = explicitId || generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className={`form-control w-full space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <label
            htmlFor={fieldId}
            className="text-xs sm:text-sm font-medium text-base-content select-none cursor-pointer inline-flex items-center gap-1"
          >
            <span>{label}</span>
            {required && (
              <span className="text-error" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {labelRight && <div className="text-xs text-base-content/60">{labelRight}</div>}
        </div>
      )}

      {description && (
        <p className="text-xs text-base-content/60 px-0.5 leading-relaxed">
          {description}
        </p>
      )}

      {typeof children === "function"
        ? children({ id: fieldId, error, "aria-describedby": error ? errorId : hint ? hintId : undefined })
        : children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-error font-medium px-0.5 flex items-center gap-1.5 animate-fadeIn"
        >
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-base-content/55 px-0.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
