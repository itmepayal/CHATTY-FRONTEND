import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { IconButton } from "./ChatPrimitives";

const SPRING = { type: "spring", stiffness: 450, damping: 36 };

export const ModalLayout = ({
  open = false,
  onClose,
  children,
  size = "md",
  centered = false,
  preventClose = false,
  className = "",
  containerClassName = "",
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !preventClose && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, preventClose, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  const SIZES = {
    xs: "max-w-xs",
    sm: "sm:max-w-md",
    qr: "max-w-[360px] sm:max-w-[400px]",
    md: "sm:max-w-lg",
    lg: "sm:max-w-xl",
    xl: "sm:max-w-2xl",
  };

  const maxWidthClass = SIZES[size] || SIZES.md;

  const containerAlignment = centered
    ? "flex items-center justify-center p-3 sm:p-4"
    : "flex items-end sm:items-center justify-center p-0 sm:p-4";

  const panelRadius = centered
    ? "rounded-2xl sm:rounded-3xl"
    : "rounded-t-2xl sm:rounded-2xl";

  const panelHeight = centered
    ? "max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh]"
    : "max-h-[92dvh] sm:max-h-[85vh]";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-50 ${containerAlignment} overscroll-contain select-none ${containerClassName}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              if (!preventClose && onClose) onClose();
            }}
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: centered ? 16 : 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: centered ? 12 : 24, scale: 0.98 }}
            transition={SPRING}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidthClass} ${panelHeight} flex flex-col bg-base-100 ${panelRadius} shadow-2xl border border-base-300 overflow-hidden z-10 ${className}`}
          >
            {/* Mobile swipe affordance pill (bottom sheets only) */}
            {!centered && (
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-base-300 sm:hidden" />
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/**
 * ModalHeader
 * Consistent header bar with icon, title, subtitle, and close button.
 */
export const ModalHeader = ({
  icon: Icon,
  title,
  subtitle,
  onClose,
  closeLabel = "Close modal",
  actions,
  className = "",
  id = "modal-title",
}) => {
  return (
    <div
      className={`px-4 py-3.5 sm:px-6 sm:py-4.5 flex items-center justify-between gap-3 border-b border-base-200/80 shrink-0 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {Icon && (
          <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold shadow-2xs">
            <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <h2
            id={id}
            className="truncate text-sm sm:text-base md:text-lg font-bold tracking-tight text-base-content/90"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-base-content/60 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        {onClose && (
          <IconButton
            icon={X}
            label={closeLabel}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        )}
      </div>
    </div>
  );
};

/**
 * ModalBody
 * Scrollable container for modal contents.
 */
export const ModalBody = ({ children, className = "" }) => {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5 space-y-4 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * ModalFooter
 * Bottom action area with primary, secondary, and optional auxiliary actions.
 */
export const ModalFooter = ({ children, className = "" }) => {
  return (
    <div
      className={`px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-end gap-2.5 border-t border-base-200/80 bg-base-100/70 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * ModalTabs
 * Segmented navigation switch inside modals.
 */
export const ModalTabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div
      role="tablist"
      aria-label="Modal sections"
      className={`grid grid-flow-col auto-cols-fr gap-1 bg-base-200/70 p-1 rounded-xl border border-base-300/60 select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-base-100 text-primary shadow-xs"
                : "text-base-content/60 hover:text-base-content hover:bg-base-100/50"
            }`}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`inline-flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full text-[10px] font-bold leading-none ${
                  isActive
                    ? "bg-primary text-primary-content"
                    : "bg-base-300 text-base-content/70"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * FormField
 * Clean form field layout with label, optional badge/counter, input container, and helper/error text.
 */
export const FormField = ({
  label,
  required = false,
  counter,
  error,
  hint,
  children,
  className = "",
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || counter) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && (
            <label className="text-base-content/80 flex items-center gap-1">
              {label}
              {required && <span className="text-error font-bold">*</span>}
            </label>
          )}
          {counter && (
            <span className="text-base-content/50 text-[11px]">{counter}</span>
          )}
        </div>
      )}

      {children}

      {error ? (
        <p className="text-xs text-error font-medium">{error}</p>
      ) : hint ? (
        <p className="text-xs text-base-content/55">{hint}</p>
      ) : null}
    </div>
  );
};
