import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import {
  ChatHeaderActionButton,
  BUTTON_SPRING,
} from "./ChatHeaderPrimitives.jsx";

const MENU_SPRING = { type: "spring", stiffness: 420, damping: 28 };

export const ChatHeaderActionsMenu = ({
  sections = [],
  buttonLabel = "More options",
  hasActiveIndicator = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 16 });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    const top = rect.bottom + 6;
    setCoords({ top, right });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) updatePosition();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handlePointerDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    const handleScroll = (e) => {
      // Do not close when scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  const handleItemClick = (onClick, disabled) => {
    if (disabled || typeof onClick !== "function") return;
    setIsOpen(false);
    onClick();
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div ref={buttonRef} className="relative">
        <ChatHeaderActionButton
          icon={MoreVertical}
          label={buttonLabel}
          onClick={toggleOpen}
          className={isOpen ? "bg-base-200 text-base-content" : ""}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        />
        {hasActiveIndicator && (
          <span className="absolute top-1.5 right-1.5 flex size-2 pointer-events-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={menuRef}
                role="menu"
                initial={{ opacity: 0, scale: 0.94, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: -4,
                  transition: { duration: 0.12 },
                }}
                transition={MENU_SPRING}
                style={{
                  position: "fixed",
                  top: coords.top,
                  right: coords.right,
                  zIndex: 9999,
                  transformOrigin: "top right",
                }}
                className="w-64 sm:w-72 max-h-[calc(100vh-80px)] overflow-y-auto overscroll-contain rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl divide-y divide-base-300/60 select-none"
              >
                {sections
                  .filter(
                    (section) =>
                      Array.isArray(section.items) && section.items.length > 0,
                  )
                  .map((section, sIdx) => (
                    <div
                      key={section.title || sIdx}
                      className={sIdx > 0 ? "pt-1.5 mt-1.5" : "pt-0.5"}
                    >
                      {section.title && (
                        <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/40 select-none">
                          {section.title}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isDanger = Boolean(item.danger);
                          const isDisabled = Boolean(item.disabled);

                          return (
                            <button
                              key={item.id || item.label}
                              type="button"
                              role="menuitem"
                              onClick={() =>
                                handleItemClick(item.onClick, isDisabled)
                              }
                              disabled={isDisabled}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-medium transition-colors outline-none select-none cursor-pointer ${
                                isDanger
                                  ? "text-error hover:bg-error/10 hover:text-error active:bg-error/15"
                                  : "text-base-content/80 hover:bg-base-200 hover:text-base-content active:bg-base-300/50"
                              } ${
                                isDisabled
                                  ? "opacity-35 cursor-not-allowed pointer-events-none"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {Icon && (
                                  <Icon
                                    className="size-4 shrink-0 text-current"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {item.live && (
                                  <span className="relative flex size-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                                    <span className="relative inline-flex size-2 rounded-full bg-error" />
                                  </span>
                                )}

                                {item.count != null && item.count > 0 && (
                                  <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                                    {item.count}
                                  </span>
                                )}

                                {item.badge && (
                                  <span className="rounded-md border border-base-300 bg-base-200/80 px-1.5 py-0.5 text-[10px] font-medium text-base-content/60 leading-none">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default ChatHeaderActionsMenu;
