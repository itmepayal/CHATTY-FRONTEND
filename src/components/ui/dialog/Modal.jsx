import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full sm:max-w-4xl",
};

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = "",
}) => {
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElement.current = document.activeElement;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Focus initial element
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === "function") {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const sizeClass = SIZES[size] || SIZES.md;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Dialog window (Mobile: bottom sheet; Tablet/Desktop: centered card) */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClass} max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-base-100 shadow-2xl border border-base-300 overflow-hidden z-10 transition-all ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-base-300" aria-hidden="true" />
        </div>

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-base-200">
            <div className="min-w-0 pr-2">
              {title && (
                <h3
                  id="modal-title"
                  className="text-base sm:text-lg font-bold tracking-tight text-base-content truncate"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="btn btn-ghost btn-circle btn-sm min-h-[36px] min-w-[36px] text-base-content/60 hover:text-base-content"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-base-200 bg-base-200/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default Modal;
