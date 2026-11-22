import React, { useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

/**
 * SidebarSearchInput
 * Premium, theme-aware search field for Chatty Sidebar.
 * Automatically adapts to all 32 application themes using DaisyUI / Tailwind design tokens.
 */
export const SidebarSearchInput = ({
  query = "",
  setQuery,
  placeholder = "Search contacts",
  disabled = false,
  loading = false,
  className = "",
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleClear = () => {
    if (typeof setQuery === "function") {
      setQuery("");
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
    }
  };

  const hasValue = Boolean(query && query.length > 0);

  return (
    <div
      className={`group/search relative flex h-[42px] sm:h-[44px] w-full items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 shadow-xs transition-all duration-200 ease-in-out border ${
        isFocused
          ? "bg-base-100 border-primary/60 ring-2 ring-primary/20 shadow-sm"
          : "bg-base-200/60 hover:bg-base-200/90 border-base-300/80 hover:border-base-content/20"
      } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
    >
      {/* Search or Loading Icon */}
      {loading ? (
        <Loader2 className="size-4 shrink-0 text-primary animate-spin" />
      ) : (
        <Search
          className={`size-4 shrink-0 transition-colors duration-200 ${
            isFocused ? "text-primary" : "text-base-content/40 group-hover/search:text-base-content/60"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Search Input Field */}
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className="min-w-0 grow bg-transparent text-xs sm:text-sm font-medium text-base-content placeholder:text-base-content/40 focus:outline-none select-text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
      />

      {/* Clear Search Button */}
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query (Esc)"
          title="Clear search (Esc)"
          className="grid size-5.5 sm:size-6 shrink-0 place-items-center rounded-full text-base-content/40 transition-all duration-150 hover:bg-base-300/70 hover:text-base-content active:scale-95 cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};

export default SidebarSearchInput;
