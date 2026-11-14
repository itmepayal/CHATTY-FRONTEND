import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal";
import Button from "../button/Button";
import { AlertTriangle, Info, X } from "lucide-react";

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      size="sm"
      showClose={!loading}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5 py-1">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
            danger
              ? "bg-error/10 text-error"
              : "bg-warning/10 text-warning"
          }`}
        >
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-base text-base-content">{title}</h4>
          {message && (
            <p className="text-xs sm:text-sm text-base-content/65 mt-1 leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const AlertDialog = ({
  open,
  onClose,
  title = "Notice",
  message,
  buttonLabel = "OK",
  variant = "info",
}) => {
  const isError = variant === "error";
  const iconClass = isError ? "bg-error/10 text-error" : "bg-info/10 text-info";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <Button variant={isError ? "danger" : "primary"} size="sm" onClick={onClose}>
          {buttonLabel}
        </Button>
      }
    >
      <div className="flex items-start gap-3.5 py-1">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Info className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-base text-base-content">{title}</h4>
          {message && (
            <p className="text-xs sm:text-sm text-base-content/65 mt-1 leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const Drawer = ({
  open,
  onClose,
  title,
  children,
  placement = "left", // 'left' | 'right' | 'bottom'
  size = "md",
  className = "",
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === "lg" ? "max-w-lg" : size === "full" ? "max-w-full" : "max-w-sm sm:max-w-md";

  const placementClass =
    placement === "right"
      ? `inset-y-0 right-0 ${sizeClass} animate-slideLeft`
      : placement === "bottom"
        ? "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl animate-slideUp"
        : `inset-y-0 left-0 ${sizeClass} animate-slideRight`;

  const content = (
    <div
      className="fixed inset-0 z-50 flex overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={`fixed z-10 w-full flex flex-col bg-base-100 shadow-2xl border-base-300 ${placementClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
            <h3 className="font-bold text-lg truncate">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="btn btn-ghost btn-circle btn-sm min-h-[36px] min-w-[36px]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export const Dropdown = ({
  trigger,
  children,
  align = "right",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const alignClass = align === "left" ? "left-0" : "right-0";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          className={`absolute ${alignClass} mt-2 w-56 rounded-2xl bg-base-100 p-1.5 shadow-xl border border-base-300 z-50 focus:outline-none animate-fadeIn`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const Popover = ({
  trigger,
  content,
  align = "center",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const alignClass = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-2 rounded-2xl bg-base-100 p-4 shadow-xl border border-base-300 animate-fadeIn ${alignClass}`}
          style={{ minWidth: "220px" }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default {
  Modal,
  ConfirmDialog,
  AlertDialog,
  Drawer,
  Dropdown,
  Popover,
};
