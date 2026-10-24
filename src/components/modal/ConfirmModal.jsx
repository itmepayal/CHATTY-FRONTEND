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

  return (
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
    </div>
  );
};
