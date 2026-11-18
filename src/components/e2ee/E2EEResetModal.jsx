import { useState, useEffect } from "react";
import { customToast } from "../toast";
import {
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  X,
} from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { RESET_CONFIRM_KEYWORD } from "../../lib/e2ee/e2ee.constants.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";

export function E2EEResetModal({ isOpen, onClose }) {
  const [password, setPassword] = useState("");
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lock background body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Account password is required.");
      return;
    }
    if (confirmKeyword.trim() !== RESET_CONFIRM_KEYWORD) {
      setError(`You must type "${RESET_CONFIRM_KEYWORD}" to confirm.`);
      return;
    }

    setLoading(true);
    try {
      await e2eeManager.resetIdentity(password);
      customToast.success("Encryption identity reset successfully.");
      setPassword("");
      setConfirmKeyword("");
      if (onClose) onClose();
    } catch (err) {
      const msg = getE2EEErrorMessage(
        err,
        "Failed to reset encryption identity.",
      );
      setError(msg);
      customToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-error/20 bg-base-100 shadow-2xl transition-all overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-e2ee-title"
      >
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-error/10 text-error">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h2
                id="reset-e2ee-title"
                className="text-base font-bold text-error"
              >
                Reset Encryption Identity
              </h2>
              <p className="text-xs text-base-content/60">
                Permanently revoke your encryption keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-base-content/50 hover:bg-base-200 hover:text-base-content transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1">
          <div className="rounded-xl border border-error/20 bg-error/5 p-3.5 text-xs text-error leading-relaxed">
            <p className="font-semibold mb-1">Warning: Irreversible Action</p>
            <p>
              Resetting your encryption identity deletes your current keys and
              backups from the server.{" "}
              <strong>
                You will no longer be able to decrypt past encrypted messages
              </strong>{" "}
              on any device unless you have another external backup.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-xs font-medium text-error">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              Account Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content outline-none transition-all focus:border-error focus:ring-2 focus:ring-error/20"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              Type{" "}
              <span className="font-mono font-bold text-error">
                {RESET_CONFIRM_KEYWORD}
              </span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              placeholder={RESET_CONFIRM_KEYWORD}
              className="w-full rounded-xl border border-base-content/15 bg-base-200/50 px-3.5 py-2.5 text-xs text-base-content font-mono outline-none transition-all focus:border-error focus:ring-2 focus:ring-error/20"
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-base-content/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 min-h-[42px] text-xs font-medium text-base-content/70 hover:bg-base-200 transition-colors cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !password ||
                confirmKeyword.trim() !== RESET_CONFIRM_KEYWORD
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-error px-5 py-2.5 min-h-[42px] text-xs font-semibold text-error-content shadow-sm transition-all hover:bg-error/90 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" />
                  <span>Reset Identity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default E2EEResetModal;
