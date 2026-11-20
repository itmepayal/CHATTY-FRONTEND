import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "../../store/useNotificationStore.js";
import { NotificationDropdown } from "./NotificationDropdown.jsx";

export const NotificationBell = ({ onOpenCenter, className = "" }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellRef = useRef(null);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e) => {
      // Bell ke andar ka click ignore
      if (bellRef.current?.contains(e.target)) return;
      // Portal ke andar ka click bhi ignore (dropdown ab document.body mein hai)
      if (e.target.closest("[data-notification-dropdown]")) return;
      setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleToggle = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleOpenFullCenter = () => {
    setDropdownOpen(false);
    onOpenCenter?.();
  };

  return (
    <div className={`relative inline-block ${className}`} ref={bellRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        aria-label="Open notifications"
        aria-expanded={dropdownOpen}
        className="relative btn btn-ghost btn-square btn-sm rounded-xl text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Bell className="size-4.5 sm:size-5 transition-transform active:scale-90" />

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-content text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-base-100 tabular-nums"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <NotificationDropdown
            anchorRef={bellRef}
            onClose={() => setDropdownOpen(false)}
            onOpenCenter={handleOpenFullCenter}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
