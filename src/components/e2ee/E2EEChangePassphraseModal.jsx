import { useState } from "react";
import { toast } from "react-hot-toast";
import { Key, Lock, Eye, EyeOff, AlertCircle, Loader2, X } from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";

export function E2EEChangePassphraseModal({ isOpen, onClose }) {
  const [currentPassphrase, setCurrentPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!currentPassphrase) {
      setError("Please enter your current recovery passphrase.");
      return;
    }
    if (newPassphrase.length < 6) {
      setError("New passphrase must be at least 6 characters.");
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      setError("New passphrases do not match.");
      return;
    }

    setLoading(true);
    try {
      await e2eeManager.changePassphrase(currentPassphrase, newPassphrase);
      toast.success("Recovery passphrase rotated successfully!");
      setCurrentPassphrase("");
      setNewPassphrase("");
      setConfirmPassphrase("");
      if (onClose) onClose();
    } catch (err) {
      const msg = getE2EEErrorMessage(
        err,
        "Failed to update recovery passphrase.",
      );
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-base-content/15 bg-base-100 p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-passphrase-title"
      >
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Key className="size-5" />
            </div>
            <div>
              <h2
                id="change-passphrase-title"
                className="text-base font-bold text-base-content"
              >
                Change Recovery Passphrase
              </h2>
              <p className="text-xs text-base-content/60">
                Update the passphrase protecting your key backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs font-medium text-error">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              Current Recovery Passphrase
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassphrase}
                onChange={(e) => setCurrentPassphrase(e.target.value)}
                placeholder="Enter current passphrase"
                className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                aria-label={showCurrent ? "Hide passphrase" : "Show passphrase"}
              >
                {showCurrent ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              New Recovery Passphrase
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="Enter new passphrase (min 6 chars)"
                className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                aria-label={showNew ? "Hide passphrase" : "Show passphrase"}
              >
                {showNew ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              Confirm New Passphrase
            </label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Re-enter new passphrase"
              className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-medium text-base-content/70 hover:bg-base-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !currentPassphrase ||
                !newPassphrase ||
                !confirmPassphrase
              }
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  <span>Update Passphrase</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default E2EEChangePassphraseModal;
