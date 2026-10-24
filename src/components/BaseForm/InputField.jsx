import { useId } from "react";

const InputField = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  rightIcon,
  error,
  autoComplete,
  hint,
}) => {
  const id = useId();

  return (
    <div className="form-control w-full">
      <label htmlFor={id} className="label pb-1.5">
        <span className="label-text text-sm font-medium">{label}</span>
      </label>

      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-base-content/40 transition-colors group-focus-within:text-primary">
          {icon}
        </div>

        <input
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`input input-bordered h-12 w-full rounded-xl bg-base-100 pl-11 ${
            rightIcon ? "pr-11" : "pr-4"
          } transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ${
            error ? "input-error focus:ring-error/15" : ""
          }`}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-error">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-base-content/50">{hint}</p>
      )}
    </div>
  );
};

export default InputField;
