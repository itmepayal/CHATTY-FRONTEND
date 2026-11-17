import { useState, useEffect, useRef } from "react";
import { customToast } from "../toast";
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  Check,
  Copy,
  KeyRound,
  Loader2,
  X,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";

export function E2EEDeviceLinkModal({
  isOpen,
  onClose,
  initialMode = "link",
  onOpenRestore,
}) {
  const [mode, setMode] = useState(initialMode); // "link" | "approve" | "recovery-key"
  const [linkingSession, setLinkingSession] = useState(null);
  const [linkingPin, setLinkingPin] = useState("");
  const [approvalPin, setApprovalPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);

  const socket = useAuthStore((state) => state.socket);
  const pollTimerRef = useRef(null);

  // Sync mode with prop when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setApprovalPin("");
    }
  }, [isOpen, initialMode]);

  // Handle "link" mode (generating link session on new device)
  useEffect(() => {
    if (!isOpen || mode !== "link") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const startLinking = async () => {
      try {
        const session = await e2eeManager.initiateDeviceLink();
        if (!isMounted) return;
        setLinkingSession(session);
        setLinkingPin(session.linkingPin);
        setLoading(false);

        // Start polling fallback in case socket missed
        pollTimerRef.current = setInterval(async () => {
          try {
            const status = await e2eeManager.pollDeviceLinkStatus(
              session.linkSessionId,
            );
            if (status.ready && isMounted) {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              customToast.success("Device linked and verified successfully!");
              if (onClose) onClose();
            }
          } catch {
            // keep polling until expiration
          }
        }, 2500);
      } catch (err) {
        if (!isMounted) return;
        setError(getE2EEErrorMessage(err, "Failed to initiate device link."));
        setLoading(false);
      }
    };

    startLinking();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, mode, onClose]);

  // Listen to Socket.IO for instant approval
  useEffect(() => {
    if (!isOpen || !socket || mode !== "link") return;

    const handleApproved = async (data) => {
      if (
        linkingSession?.linkSessionId &&
        data?.linkSessionId === linkingSession.linkSessionId &&
        data?.encryptedPayload
      ) {
        try {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          await e2eeManager.consumeDeviceLinkPayload(data.encryptedPayload);
          customToast.success("Device linked and verified successfully!");
          if (onClose) onClose();
        } catch (err) {
          setError(getE2EEErrorMessage(err, "Failed to decrypt link payload."));
        }
      }
    };

    socket.on("e2ee:device-link:approved", handleApproved);
    return () => {
      socket.off("e2ee:device-link:approved", handleApproved);
    };
  }, [isOpen, socket, mode, linkingSession, onClose]);

  // Load recovery key when in "recovery-key" mode
  useEffect(() => {
    if (isOpen && mode === "recovery-key") {
      e2eeManager.getStoredRecoveryKey().then((key) => {
        setRecoveryKey(key || "No recovery key found in local vault.");
      });
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Handle Approving a new device from a trusted device
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanPin = approvalPin.trim().replace(/\s+/g, "");

    if (cleanPin.length !== 6) {
      setError(
        "Please enter the complete 6-digit code shown on the other device.",
      );
      return;
    }

    setLoading(true);
    try {
      await e2eeManager.approveDeviceLink({ linkingPin: cleanPin });
      customToast.success("Device link approved! Encryption shared securely.");
      setApprovalPin("");
      if (onClose) onClose();
    } catch (err) {
      setError(
        getE2EEErrorMessage(
          err,
          "Invalid or expired linking code. Please check and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (!recoveryKey) return;
    navigator.clipboard.writeText(recoveryKey).then(() => {
      setCopied(true);
      customToast.success("Recovery key copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-base-content/15 bg-base-100 p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {mode === "link" && <QrCode className="size-5" />}
              {mode === "approve" && <Laptop className="size-5" />}
              {mode === "recovery-key" && <ShieldCheck className="size-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content">
                {mode === "link" && "Link This Device"}
                {mode === "approve" && "Authorize New Device"}
                {mode === "recovery-key" && "Your Device Recovery Key"}
              </h2>
              <p className="text-xs text-base-content/60">
                {mode === "link" && "Zero-manual-password device linking"}
                {mode === "approve" && "Share end-to-end encryption keys"}
                {mode === "recovery-key" &&
                  "256-bit cryptographically secure key"}
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

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-xl border border-error/20 bg-error/10 p-3 text-xs font-medium text-error">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* MODE: LINK (New Device waiting for approval) */}
        {mode === "link" && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-base-content/70 leading-relaxed">
              Open Chatty on any of your existing verified devices, go to{" "}
              <strong>Settings &gt; Encryption &gt; Link a New Device</strong>,
              and enter the code below:
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-xs text-base-content/60">
                  Generating secure ephemeral ECDH keypair...
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 text-center shadow-inner">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80 block mb-2">
                  6-Digit Linking Code
                </span>
                <div className="flex items-center justify-center gap-2 font-mono text-3xl font-extrabold tracking-widest text-primary">
                  {linkingPin ? (
                    <>
                      <span>{linkingPin.slice(0, 3)}</span>
                      <span className="text-primary/40 font-normal">-</span>
                      <span>{linkingPin.slice(3, 6)}</span>
                    </>
                  ) : (
                    <span>------</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-base-content/60">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  <span>
                    Waiting for confirmation from your other device...
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-base-content/10 flex flex-col gap-2">
              {onOpenRestore && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    onOpenRestore();
                  }}
                  className="text-center text-xs font-medium text-primary hover:underline"
                >
                  Enter Recovery Key or Passphrase manually instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE: APPROVE (Trusted device authorizing new device) */}
        {mode === "approve" && (
          <form onSubmit={handleApproveSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-base-content/70 leading-relaxed">
              Enter the <strong>6-digit code</strong> displayed on your new
              phone, tablet, or browser to securely transfer your encryption
              identity.
            </p>

            <div>
              <label className="block text-xs font-semibold text-base-content/80 mb-1.5">
                6-Digit Linking Code
              </label>
              <input
                type="text"
                maxLength={7}
                value={approvalPin}
                onChange={(e) => setApprovalPin(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full text-center font-mono text-xl tracking-widest font-bold rounded-xl border border-base-content/20 bg-base-200/50 py-3 text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="rounded-xl border border-base-content/10 bg-base-200/40 p-3 text-xs text-base-content/70 flex items-start gap-2">
              <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
              <span>
                Your private keys are transferred end-to-end encrypted directly
                between devices using ephemeral ECDH. The server never sees raw
                keys.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                disabled={loading || approvalPin.trim().length < 6}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3.5" />
                    <span>Approve Device</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* MODE: VIEW RECOVERY KEY */}
        {mode === "recovery-key" && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-base-content/70 leading-relaxed">
              This high-entropy 256-bit recovery key was automatically generated
              when your account initialized E2EE. Write it down or store it in a
              password manager to recover messages if all devices are lost.
            </p>

            <div className="rounded-xl border border-base-content/20 bg-base-200/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 block mb-1">
                256-Bit Recovery Key
              </span>
              <div className="font-mono text-xs font-bold text-base-content break-all select-all leading-relaxed p-2 bg-base-100 rounded-lg border border-base-content/10">
                {recoveryKey || "Loading recovery key..."}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCopyRecoveryKey}
                disabled={!recoveryKey || recoveryKey.startsWith("No recovery")}
                className="flex items-center gap-1.5 rounded-xl border border-base-content/20 px-4 py-2 text-xs font-semibold text-base-content hover:bg-base-200 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-success" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content hover:bg-primary/90"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default E2EEDeviceLinkModal;
