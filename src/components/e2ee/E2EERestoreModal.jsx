import { useState } from "react";
import { customToast } from "../toast";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";

export function E2EERestoreModal({ isOpen, onClose, onOpenReset }) {
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!passphrase.trim()) {
      setError("Please enter your recovery passphrase.");
      return;
    }

    setLoading(true);
    try {
      await e2eeManager.restoreIdentity(passphrase.trim());
      customToast.success("Encryption keys restored successfully!");
      setPassphrase("");
      if (onClose) onClose();
    } catch (err) {
      const msg = getE2EEErrorMessage(
        err,
        "Failed to restore encryption keys.",
      );
      setError(msg);
      customToast.error(msg);
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
        aria-labelledby="restore-e2ee-title"
      >
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2
                id="restore-e2ee-title"
                className="text-base font-bold text-base-content"
              >
                Restore Encryption
              </h2>
              <p className="text-xs text-base-content/60">
                Unlock your messages on this device
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-base-content/70">
            Your account has End-to-End Encryption enabled on another device.
            Enter the <strong>recovery passphrase</strong> you created to
            decrypt and restore your keys on this device.
          </p>

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
              Recovery Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your recovery passphrase"
                className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
                disabled={loading}
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                aria-label={
                  showPassphrase ? "Hide passphrase" : "Show passphrase"
                }
              >
                {showPassphrase ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {onOpenReset ? (
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  onOpenReset();
                }}
                disabled={loading}
                className="text-[11px] font-medium text-error/80 hover:text-error hover:underline"
              >
                Forgot passphrase? Reset identity
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-xl px-3.5 py-2 text-xs font-medium text-base-content/70 hover:bg-base-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !passphrase.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    <span>Restore Keys</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default E2EERestoreModal;
