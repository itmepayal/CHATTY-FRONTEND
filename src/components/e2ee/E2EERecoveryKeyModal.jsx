import { useState, useEffect } from "react";
import { customToast } from "../toast";
import {
  ShieldCheck,
  Check,
  Copy,
  Download,
  X,
  AlertTriangle,
  KeyRound,
  FileText,
  Lock,
} from "lucide-react";
import { useE2EE } from "../../hooks/useE2EE.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { getDeviceName } from "../../lib/e2ee/e2eeDevice.js";

export function E2EERecoveryKeyModal({
  isOpen,
  onClose,
  isOnboarding = false,
}) {
  const { getStoredRecoveryKey, acknowledgeRecoveryKey, pendingRecoveryOnboarding } =
    useE2EE();
  const authUser = useAuthStore((state) => state.authUser);

  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setDownloaded(false);
      setConfirmedSaved(!isOnboarding && !pendingRecoveryOnboarding);
      setLoading(true);

      getStoredRecoveryKey()
        .then((key) => {
          setRecoveryKey(key || "");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, isOnboarding, pendingRecoveryOnboarding, getStoredRecoveryKey]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!recoveryKey) return;
    navigator.clipboard.writeText(recoveryKey).then(() => {
      setCopied(true);
      customToast.success("Recovery key copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    if (!recoveryKey) return;
    const userName = authUser?.fullName || authUser?.username || authUser?.email || "Chatty User";
    const dateStr = new Date().toLocaleString();
    const deviceName = getDeviceName();

    const content = `===================================================================
CHATTY END-TO-END ENCRYPTION (E2EE) RECOVERY KEY
===================================================================

Account: ${userName}
Generated: ${dateStr}
Device: ${deviceName}

YOUR 256-BIT RECOVERY KEY:
-------------------------------------------------------------------
${recoveryKey}
-------------------------------------------------------------------

HOW TO USE THIS KEY:
1. Store this file or printed copy in a secure location (e.g. a password manager or safe).
2. If you sign in to Chatty on a new browser, phone, or computer without your previous device,
   enter this exact 256-bit key to restore and decrypt your messages.
3. Chatty's servers never store this key in plaintext. The team cannot restore your messages for you.
4. Never share this key with anyone.
===================================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatty-recovery-key-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    customToast.success("Recovery kit downloaded safely!");
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleComplete = async () => {
    try {
      await acknowledgeRecoveryKey();
      customToast.success("Recovery key confirmed and backed up!");
    } catch {
      // ignore
    }
    if (onClose) onClose();
  };

  // Enable confirmation if user copied/downloaded or manually checked the box
  const canConfirm = confirmedSaved || copied || downloaded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-primary/20 bg-base-100 p-5 sm:p-7 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-key-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2
                id="recovery-key-modal-title"
                className="text-base sm:text-lg font-bold text-base-content"
              >
                {isOnboarding
                  ? "Your Encryption Recovery Key"
                  : "Your 256-Bit Recovery Key"}
              </h2>
              <p className="text-xs text-base-content/60">
                End-to-End Encryption Master Key
              </p>
            </div>
          </div>
          {(!isOnboarding || !pendingRecoveryOnboarding) && onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3.5 text-xs text-warning leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">
                Save this key to prevent losing your messages
              </span>
              Chatty encrypts your messages on this device. If you ever log in
              from another browser or phone, you will need this 256-bit key to
              decrypt your chat history.
            </div>
          </div>

          {/* Key Display Card */}
          <div className="rounded-2xl border border-base-content/15 bg-base-200/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" />
                256-Bit Recovery Key
              </span>
              <span className="text-[10px] text-base-content/50 font-mono">
                P-256 / AES-256-GCM
              </span>
            </div>

            <div className="font-mono text-xs sm:text-sm font-bold text-base-content break-all select-all leading-relaxed p-3.5 bg-base-100 rounded-xl border border-base-content/10 shadow-inner tracking-wider text-center">
              {loading ? (
                <span className="text-base-content/50 italic">
                  Loading recovery key...
                </span>
              ) : recoveryKey ? (
                recoveryKey
              ) : (
                <span className="text-error">
                  No recovery key found in local vault.
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Copy & Download */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!recoveryKey}
              className="flex items-center justify-center gap-2 rounded-xl border border-base-content/20 bg-base-200/40 px-4 py-2.5 text-xs font-semibold text-base-content hover:bg-base-200 hover:border-primary/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-success" />
                  <span className="text-success">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4 text-primary" />
                  <span>Copy Key</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!recoveryKey}
              className="flex items-center justify-center gap-2 rounded-xl border border-base-content/20 bg-base-200/40 px-4 py-2.5 text-xs font-semibold text-base-content hover:bg-base-200 hover:border-primary/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloaded ? (
                <>
                  <Check className="size-4 text-success" />
                  <span className="text-success">Kit Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="size-4 text-secondary" />
                  <span>Download Key (.txt)</span>
                </>
              )}
            </button>
          </div>

          {/* Confirmation Checkbox for Onboarding */}
          {isOnboarding && (
            <div className="rounded-xl border border-base-content/10 bg-base-200/30 p-3 pt-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={confirmedSaved}
                  onChange={(e) => setConfirmedSaved(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-xs mt-0.5 rounded-md"
                />
                <span className="text-base-content/80 leading-snug">
                  I have copied or downloaded my 256-bit recovery key and stored
                  it in a secure location.
                </span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-base-content/10">
            {isOnboarding ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-base-content/60 hover:text-base-content underline cursor-pointer"
              >
                Remind Me Later
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleComplete}
              disabled={isOnboarding && !canConfirm}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-content shadow-sm hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-40"
            >
              <Check className="size-4" />
              <span>
                {isOnboarding ? "I've Saved My Recovery Key" : "Done"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default E2EERecoveryKeyModal;
