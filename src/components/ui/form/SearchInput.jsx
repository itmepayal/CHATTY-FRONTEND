import { forwardRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

export const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    onClear,
    placeholder = "Search...",
    loading = false,
    className = "",
    size = "md",
    ...props
  },
  ref,
) {
  const isControlled = value !== undefined;
  const hasValue = isControlled ? String(value).length > 0 : false;

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) {
      onChange({ target: { value: "" } });
    }
  };

  const heightClass = size === "sm" ? "h-9 text-xs" : "h-10 sm:h-11 text-sm";

  return (
    <div className="relative w-full group">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-base-content/40 transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4 shrink-0" />
        )}
      </div>

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input input-bordered w-full rounded-xl bg-base-100 pl-9 pr-9 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${heightClass} ${className}`}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 z-10 flex items-center pr-2.5 text-base-content/40 hover:text-base-content"
        >
          <span className="flex size-5 items-center justify-center rounded-full hover:bg-base-200">
            <X className="size-3.5" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
});

export default SearchInput;
