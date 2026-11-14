import { forwardRef } from "react";

export const Checkbox = forwardRef(function Checkbox(
  {
    label,
    description,
    className = "",
    disabled = false,
    id,
    ...props
  },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-start gap-3 cursor-pointer select-none py-1 min-h-[44px] sm:min-h-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        disabled={disabled}
        className="checkbox checkbox-primary rounded-md size-5 mt-0.5 border-base-300 transition-colors focus:ring-2 focus:ring-primary/20"
        {...props}
      />
      {(label || description) && (
        <span className="flex flex-col text-left">
          {label && (
            <span className="text-sm font-medium text-base-content leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-base-content/60 leading-normal mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
});

export const Radio = forwardRef(function Radio(
  {
    label,
    description,
    className = "",
    disabled = false,
    id,
    ...props
  },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-start gap-3 cursor-pointer select-none py-1 min-h-[44px] sm:min-h-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        ref={ref}
        id={id}
        type="radio"
        disabled={disabled}
        className="radio radio-primary size-5 mt-0.5 border-base-300 transition-colors focus:ring-2 focus:ring-primary/20"
        {...props}
      />
      {(label || description) && (
        <span className="flex flex-col text-left">
          {label && (
            <span className="text-sm font-medium text-base-content leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-base-content/60 leading-normal mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
});

export const Switch = forwardRef(function Switch(
  {
    label,
    description,
    className = "",
    disabled = false,
    id,
    ...props
  },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none py-1 min-h-[44px] sm:min-h-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {(label || description) && (
        <span className="flex flex-col text-left pr-2">
          {label && (
            <span className="text-sm font-medium text-base-content leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-base-content/60 leading-normal mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        type="checkbox"
        disabled={disabled}
        className="toggle toggle-primary shrink-0 transition-colors focus:ring-2 focus:ring-primary/20"
        {...props}
      />
    </label>
  );
});

export const FormError = ({ message, id, className = "" }) => {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={`text-xs text-error font-medium flex items-center gap-1.5 animate-fadeIn ${className}`}
    >
      <span>{message}</span>
    </p>
  );
};

export const FormHelperText = ({ children, id, className = "" }) => {
  if (!children) return null;
  return (
    <p id={id} className={`text-xs text-base-content/60 px-0.5 ${className}`}>
      {children}
    </p>
  );
};

export default {
  Checkbox,
  Radio,
  Switch,
  FormError,
  FormHelperText,
};
