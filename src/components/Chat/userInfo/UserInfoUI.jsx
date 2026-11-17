import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Ban, Loader2 } from "lucide-react";

export const Section = ({ title, aside, children }) => (
  <section className="px-5 py-4">
    <div className="mb-2.5 flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
        {title}
      </h4>
      {aside !== undefined && aside !== null && (
        <span className="text-xs text-base-content/50">{aside}</span>
      )}
    </div>
    {children}
  </section>
);

export const InfoRow = ({ icon: Icon, label, value, hint, href }) => {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2">
      <span className="text-sm [overflow-wrap:anywhere]">{value}</span>
      {hint && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {hint}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200">
        <Icon className="size-4 text-base-content/60" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-base-content/50">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="link link-hover"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export const Stat = ({ icon: Icon, value, label }) => (
  <div className="flex-1 rounded-xl bg-base-200/60 px-2 py-2.5 text-center">
    <Icon className="mx-auto size-4 text-base-content/50" />
    <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    <p className="mt-1 text-[11px] text-base-content/50">{label}</p>
  </div>
);

export const ActionButton = ({
  icon: Icon,
  label,
  active,
  onClick,
  filled,
  danger,
  disabled,
  loading,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    aria-pressed={active}
    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? danger
          ? "bg-error/15 text-error"
          : "bg-primary/15 text-primary"
        : danger
          ? "bg-base-200/70 text-base-content/70 hover:bg-error/10 hover:text-error"
          : "bg-base-200/70 text-base-content/70 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    {loading ? (
      <Loader2 className="size-4 sm:size-5 animate-spin" />
    ) : (
      <Icon
        className={`size-4 sm:size-5 ${active && filled ? "fill-current" : ""}`}
      />
    )}
    <span className="truncate max-w-[5rem] text-[11px]">{label}</span>
  </button>
);

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal-box max-w-sm">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
            }`}
          >
            <Ban className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-modal-title" className="text-lg font-semibold">
              {title}
            </h3>
            <p className="mt-1 text-sm text-base-content/70 [overflow-wrap:anywhere]">
              {message}
            </p>
          </div>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${danger ? "btn-error" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>

      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !loading && onCancel()}
      />
    </div>,
    document.body,
  );
};
