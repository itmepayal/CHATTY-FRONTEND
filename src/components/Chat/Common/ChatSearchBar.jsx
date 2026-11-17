import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";

export const ChatSearchBar = ({ searchQ, setSearchQ, searching, onClose }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden border-b border-base-300/80 bg-base-100/90 px-3 sm:px-4 py-2 backdrop-blur-md z-10"
    >
      <div className="flex w-full items-center gap-2 rounded-full border border-primary/40 bg-base-200/60 py-1 pl-3 pr-1.5 ring-1 ring-primary/20 shadow-xs">
        <Search className="size-4 shrink-0 text-primary" />
        <input
          ref={inputRef}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search in this conversation…"
          className="h-7 min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-base-content outline-none placeholder:text-base-content/40"
        />
        {searching ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-base-content/50" />
        ) : (
          searchQ && (
            <span className="hidden text-[11px] text-base-content/40 sm:inline">
              Esc to close
            </span>
          )
        )}
        {searchQ && (
          <button
            type="button"
            onClick={() => {
              setSearchQ("");
              inputRef.current?.focus();
            }}
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs rounded-full px-2.5 text-xs text-base-content/70 hover:text-base-content"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

export default ChatSearchBar;
