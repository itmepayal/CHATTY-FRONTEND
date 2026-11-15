import { useState } from "react";
import { customToast } from "../toast";
import {
  ShieldCheck,
  Key,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";

export function E2EESetupModal({ isOpen, onClose }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 6) {
      setError("Passphrase must be at least 6 characters long.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }

    setLoading(true);
    try {
      await e2eeManager.setupIdentity(passphrase);
      customToast.success("End-to-End Encryption enabled successfully!");
      setPassphrase("");
      setConfirmPassphrase("");
      if (onClose) onClose();
    } catch (err) {
      const msg = getE2EEErrorMessage(err, "Failed to enable encryption.");
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
        aria-labelledby="setup-e2ee-title"
      >
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2
                id="setup-e2ee-title"
                className="text-base font-bold text-base-content"
              >
                Enable End-to-End Encryption
              </h2>
              <p className="text-xs text-base-content/60">
                Secure your direct & group chats
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
            Messages are encrypted on your device and can only be decrypted by
            you and the recipient. Create a <strong>recovery passphrase</strong>{" "}
            to securely back up your encryption key so you can unlock your
            messages on other devices.
          </p>

          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                Chatty never sees your passphrase. If you lose it, historical
                encrypted messages cannot be recovered on new devices.
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs font-medium text-error">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-base-content/80 mb-1">
                Recovery Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a secure passphrase (min 6 chars)"
                  className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                  disabled={loading}
                  autoComplete="new-password"
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

            <div>
              <label className="block text-xs font-semibold text-base-content/80 mb-1">
                Confirm Passphrase
              </label>
              <input
                type={showPassphrase ? "text" : "password"}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter your recovery passphrase"
                className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-4 py-2 text-xs font-medium text-base-content/70 hover:bg-base-200"
              >
                Later
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !passphrase || !confirmPassphrase}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  <span>Enable Encryption</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default E2EESetupModal;
