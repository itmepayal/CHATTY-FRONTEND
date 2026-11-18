import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { customToast } from "../toast";
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Check,
  Copy,
  KeyRound,
  Loader2,
  X,
  AlertCircle,
  QrCode,
  RefreshCw,
  Clock,
  Lock,
  ArrowRight,
  Shield,
  SmartphoneNfc,
} from "lucide-react";
import { e2eeManager } from "../../lib/e2ee/e2eeManager.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { getE2EEErrorMessage } from "../../lib/e2ee/e2eeErrors.js";
import { QRCodeView } from "../common/QRCodeView.jsx";

export function E2EEDeviceLinkModal({
  isOpen,
  onClose,
  initialMode = "link",
  onOpenRestore,
}) {
  const [activeTab, setActiveTab] = useState(
    initialMode === "approve"
      ? "code"
      : initialMode === "recovery-key"
        ? "recovery"
        : "scan",
  );
  // step: 1 (Connect / Code) | 2 (Waiting) | 3 (Device Connected Success)
  const [step, setStep] = useState(1);

  const [linkingSession, setLinkingSession] = useState(null);
  const [linkingPin, setLinkingPin] = useState("");
  const [approvalPin, setApprovalPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);

  const socket = useAuthStore((state) => state.socket);
  const pollTimerRef = useRef(null);

  const handleClose = useCallback(() => {
    if (activeTab === "scan" && linkingSession?.linkSessionId && step < 3) {
      e2eeManager.cancelDeviceLink(linkingSession.linkSessionId);
    }
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (onClose) onClose();
  }, [activeTab, linkingSession, step, onClose]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultTab =
        initialMode === "approve"
          ? "code"
          : initialMode === "recovery-key"
            ? "recovery"
            : "scan";
      setActiveTab(defaultTab);
      setStep(1);
      setError(null);
      setApprovalPin("");
      setCopiedPin(false);
      setCopiedKey(false);
      setIncomingRequest(null);
    }
  }, [isOpen, initialMode]);

  // Expiration countdown
  useEffect(() => {
    if (!linkingSession?.expiresAt || step === 3) {
      setTimeLeft(null);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(linkingSession.expiresAt).getTime() - Date.now()) / 1000,
        ),
      );
      setTimeLeft(remaining);
      if (remaining === 0 && step === 1) {
        setError(
          "This linking code has expired. Click refresh to generate a new one.",
        );
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [linkingSession?.expiresAt, step]);

  // Initiate linking session (Generate QR & PIN)
  const startLinking = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStep(1);
    try {
      const session = await e2eeManager.initiateDeviceLink();
      setLinkingSession(session);
      setLinkingPin(session.linkingPin);
      setLoading(false);

      // Polling fallback
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await e2eeManager.pollDeviceLinkStatus(
            session.linkSessionId,
          );
          if (status.ready) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStep(3);
            customToast.success("Device linked and verified successfully!");
          }
        } catch {
          // keep polling until expiry
        }
      }, 2500);
    } catch (err) {
      setError(getE2EEErrorMessage(err, "Failed to initiate device link."));
      setLoading(false);
    }
  }, []);

  // Trigger linking session when in "scan" tab
  useEffect(() => {
    if (!isOpen || activeTab !== "scan") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    startLinking();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, activeTab, startLinking]);

  // Socket & window listeners for instant connecting, approval, cancellation, and incoming requests
  useEffect(() => {
    if (!isOpen) return;

    const handleApproved = async (data) => {
      const payload = data?.detail || data;
      if (
        linkingSession?.linkSessionId &&
        payload?.linkSessionId === linkingSession.linkSessionId &&
        payload?.encryptedPayload
      ) {
        try {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          await e2eeManager.consumeDeviceLinkPayload(payload.encryptedPayload);
          setStep(3);
          customToast.success("Device linked and verified successfully!");
        } catch (err) {
          setError(getE2EEErrorMessage(err, "Failed to decrypt link payload."));
        }
      }
    };

    const handleConnecting = (data) => {
      const payload = data?.detail || data;
      if (
        linkingSession?.linkSessionId &&
        payload?.linkSessionId === linkingSession.linkSessionId
      ) {
        setStep(2);
      }
    };

    const handleCancelled = (data) => {
      const payload = data?.detail || data;
      if (
        linkingSession?.linkSessionId &&
        payload?.linkSessionId === linkingSession.linkSessionId
      ) {
        setError("Device linking session was cancelled.");
        setStep(1);
      }
    };

    const handleIncomingReq = (e) => {
      const req = e.detail;
      if (req?.linkingPin) {
        setIncomingRequest(req);
      }
    };

    if (socket) {
      socket.on("e2ee:device-link:approved", handleApproved);
      socket.on("e2ee:device-link:connecting", handleConnecting);
      socket.on("e2ee:device-link:cancelled", handleCancelled);
    }

    window.addEventListener("chatty:device-link-approved", handleApproved);
    window.addEventListener("chatty:device-link-connecting", handleConnecting);
    window.addEventListener("chatty:device-link-cancelled", handleCancelled);
    window.addEventListener("chatty:device-link-requested", handleIncomingReq);

    return () => {
      if (socket) {
        socket.off("e2ee:device-link:approved", handleApproved);
        socket.off("e2ee:device-link:connecting", handleConnecting);
        socket.off("e2ee:device-link:cancelled", handleCancelled);
      }
      window.removeEventListener("chatty:device-link-approved", handleApproved);
      window.removeEventListener(
        "chatty:device-link-connecting",
        handleConnecting,
      );
      window.removeEventListener(
        "chatty:device-link-cancelled",
        handleCancelled,
      );
      window.removeEventListener(
        "chatty:device-link-requested",
        handleIncomingReq,
      );
    };
  }, [isOpen, socket, linkingSession]);

  // Load recovery key if in recovery tab
  useEffect(() => {
    if (isOpen && activeTab === "recovery") {
      e2eeManager.getStoredRecoveryKey().then((key) => {
        setRecoveryKey(key || "No recovery key found in local vault.");
      });
    }
  }, [isOpen, activeTab]);

  // Lock background body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handlePinChange = (val) => {
    let clean = val;
    if (typeof clean === "string" && clean.startsWith("chatty-link:")) {
      const parts = clean.split(":");
      if (parts.length >= 3) {
        clean = parts[2];
      }
    }
    setApprovalPin(clean);
  };

  const handleComplete = () => {
    handleClose();
    window.dispatchEvent(new CustomEvent("chatty:device-registered"));
  };

  // Handle Approving a new device (when user enters code on this trusted device)
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanPin = approvalPin.trim().replace(/[\s-]+/g, "");

    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setError(
        "Please enter the complete 6-digit code shown on the other device.",
      );
      return;
    }

    setApproving(true);
    try {
      await e2eeManager.approveDeviceLink({ linkingPin: cleanPin });
      customToast.success("Device authorized successfully!");
      setApprovalPin("");
      setIncomingRequest(null);
      setStep(3);
    } catch (err) {
      setError(
        getE2EEErrorMessage(
          err,
          "Invalid or expired linking code. Please check and try again.",
        ),
      );
    } finally {
      setApproving(false);
    }
  };

  const handleCopyPin = () => {
    const rawDigits = String(linkingPin || "").replace(/\D/g, "");
    if (!rawDigits) return;
    navigator.clipboard.writeText(rawDigits).then(() => {
      setCopiedPin(true);
      customToast.success("Linking code copied!");
      setTimeout(() => setCopiedPin(false), 2500);
    });
  };

  const handleCopyRecoveryKey = () => {
    if (!recoveryKey || recoveryKey.startsWith("No recovery")) return;
    navigator.clipboard.writeText(recoveryKey).then(() => {
      setCopiedKey(true);
      customToast.success("Recovery key copied to clipboard!");
      setTimeout(() => setCopiedKey(false), 2500);
    });
  };

  // Format time MM:SS
  const formatCountdown = (seconds) => {
    if (seconds == null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Raw digits
  const rawDigits = String(linkingPin || "").replace(/\D/g, "");
  // Payload for QR Code
  const qrPayload =
    linkingSession?.linkSessionId && rawDigits
      ? `chatty-link:${linkingSession.linkSessionId}:${rawDigits}`
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-base-content/15 bg-base-100 shadow-2xl transition-all overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              {step === 3 ? (
                <CheckCircle2 className="size-6 text-success" />
              ) : activeTab === "code" ? (
                <ShieldCheck className="size-6" />
              ) : activeTab === "recovery" ? (
                <KeyRound className="size-6" />
              ) : (
                <QrCode className="size-6" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content tracking-tight">
                {step === 3
                  ? "Device Connected!"
                  : activeTab === "code"
                    ? "Authorize New Device"
                    : activeTab === "recovery"
                      ? "Device Recovery Key"
                      : "Link a New Device"}
              </h2>
              <p className="text-xs text-base-content/60">
                {step === 3
                  ? "End-to-end encryption synchronized"
                  : activeTab === "code"
                    ? "Approve connection from existing trusted device"
                    : activeTab === "recovery"
                      ? "256-bit high-entropy secret key"
                      : "Securely connect another device to your account"}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              disabled={loading || approving}
              className="rounded-xl p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-base-content/50 hover:bg-base-200 hover:text-base-content transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Scrollable Body Container */}
        <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1">
          {/* Tab switcher (Only in step 1 or when not in recovery key view) */}
          {step === 1 && activeTab !== "recovery" && (
            <div className="flex rounded-xl bg-base-200/70 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("scan");
                  setStep(1);
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "scan"
                    ? "bg-base-100 text-primary shadow-xs"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                <QrCode className="size-3.5" />
                Scan QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("code");
                  setStep(1);
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "code"
                    ? "bg-base-100 text-primary shadow-xs"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                <Smartphone className="size-3.5" />
                Enter 6-Digit Code
              </button>
            </div>
          )}

          {/* Incoming link request banner */}
          {incomingRequest && step < 3 && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-primary flex items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="size-4 shrink-0" />
                <span className="truncate">
                  <strong>
                    {incomingRequest.newDeviceName || "New Device"}
                  </strong>{" "}
                  is requesting to link.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("code");
                  setStep(1);
                  setApprovalPin(incomingRequest.linkingPin);
                  setIncomingRequest(null);
                }}
                className="btn btn-xs btn-primary rounded-lg font-bold shrink-0 cursor-pointer"
              >
                Fill Code
              </button>
            </div>
          )}

          {/* Error message banner */}
          {error && (
            <div className="mt-4 rounded-2xl border border-error/20 bg-error/10 p-3.5 text-xs font-medium text-error flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed flex-1">{error}</span>
            </div>
          )}

          {/* ================= STEP 3: DEVICE CONNECTED SUCCESSFULLY ================= */}
          {step === 3 && (
            <div className="mt-6 flex flex-col items-center text-center space-y-4 py-2">
              <div className="relative flex size-20 items-center justify-center rounded-3xl bg-success/10 text-success shadow-inner">
                <span className="absolute size-24 rounded-full bg-success/15 animate-ping" />
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-base-content">
                  Device Connected Successfully!
                </h3>
                <p className="text-xs text-base-content/60 max-w-xs leading-relaxed">
                  Your new device is now securely linked. Your end-to-end
                  encryption keys have been shared directly using ephemeral
                  zero-knowledge ECDH.
                </p>
              </div>

              <div className="w-full pt-3">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-content font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CONNECTING / AUTHORIZING RADAR (SCAN TAB) ================= */}
          {step === 2 && activeTab === "scan" && (
            <div className="mt-6 flex flex-col items-center text-center space-y-4 py-4 animate-in fade-in">
              <div className="relative flex size-24 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
                <span className="absolute size-28 rounded-full bg-primary/20 animate-ping opacity-60" />
                <SmartphoneNfc className="size-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="text-base font-bold text-base-content">
                  Authorizing Connection...
                </h3>
                <p className="text-xs text-base-content/65 leading-relaxed">
                  Your trusted device was contacted. Ephemeral cryptographic
                  keys are currently being exchanged and verified.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Loader2 className="size-4 animate-spin" />
                <span>Finalizing secure key verification...</span>
              </div>

              <div className="w-full pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 px-4 rounded-xl border border-base-content/15 text-base-content/70 hover:bg-base-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 1: SCAN QR CODE TAB ================= */}
          {step === 1 && activeTab === "scan" && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-base-content/70 leading-relaxed text-center">
                Open Chatty on your new device and scan this QR code, or enter
                the 6-digit code below:
              </p>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-xs font-medium text-base-content/60">
                    Generating secure ephemeral QR code...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  {/* QR Code Card with Expiry & Refresh */}
                  <div className="relative rounded-2xl border-2 border-base-200 bg-base-200/40 p-4 flex flex-col items-center shadow-inner">
                    {qrPayload ? (
                      <QRCodeView
                        value={qrPayload}
                        size={180}
                        className="shadow-md"
                        ariaLabel="Chatty Secure Device Link QR Code"
                      />
                    ) : (
                      <div className="size-[204px] flex items-center justify-center bg-base-100 rounded-2xl border border-base-content/10">
                        <span className="text-xs text-base-content/50">
                          Generating code...
                        </span>
                      </div>
                    )}

                    {/* Expiration badge / overlay */}
                    {timeLeft !== null && timeLeft > 0 ? (
                      <div className="mt-3 flex items-center gap-1.5 rounded-full bg-base-100 px-3 py-1 text-[11px] font-medium text-base-content/70 border border-base-content/10 shadow-xs">
                        <Clock className="size-3 text-primary" />
                        <span>Code expires in</span>
                        <span className="font-mono font-bold text-primary">
                          {formatCountdown(timeLeft)}
                        </span>
                      </div>
                    ) : timeLeft === 0 ? (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] text-error font-medium">
                          QR Code Expired
                        </span>
                        <button
                          type="button"
                          onClick={startLinking}
                          className="btn btn-xs btn-primary gap-1 rounded-lg font-semibold cursor-pointer"
                        >
                          <RefreshCw className="size-3" />
                          Refresh QR
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* 6-Digit Pin Fallback Display */}
                  <div className="w-full rounded-2xl border border-base-content/10 bg-base-200/50 p-3.5 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 block mb-1">
                      Or Enter 6-Digit Code Manually
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <div className="font-mono text-2xl font-black tracking-widest text-primary">
                        {rawDigits.length >= 6 ? (
                          <>
                            <span>{rawDigits.slice(0, 3)}</span>
                            <span className="text-primary/30 font-normal mx-0.5">
                              -
                            </span>
                            <span>{rawDigits.slice(3, 6)}</span>
                          </>
                        ) : (
                          <span>------</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        disabled={rawDigits.length < 6}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-primary ml-1 cursor-pointer"
                        title="Copy linking code"
                      >
                        {copiedPin ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Waiting indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-base-content/60">
                    <span className="size-2 rounded-full bg-primary animate-ping" />
                    <span>Waiting for connection from your new device...</span>
                  </div>
                </div>
              )}

              {/* Bottom actions */}
              <div className="pt-2 border-t border-base-content/10 flex items-center justify-between text-xs">
                {onOpenRestore ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      onOpenRestore();
                    }}
                    className="font-medium text-primary hover:underline cursor-pointer"
                  >
                    Restore with Recovery Key instead
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startLinking}
                    disabled={loading}
                    className="rounded-xl px-3 py-1.5 font-medium text-base-content/70 hover:bg-base-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`size-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl px-3 py-1.5 font-medium text-base-content/70 hover:bg-base-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 1 & 2: AUTHORIZE WITH CODE TAB ================= */}
          {step < 3 && activeTab === "code" && (
            <form onSubmit={handleApproveSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-base-content/70 leading-relaxed">
                Enter the <strong>6-digit code</strong> displayed on your new
                phone, tablet, or browser to securely authorize and share your
                encryption identity.
              </p>

              <div>
                <label className="block text-xs font-semibold text-base-content/80 mb-1.5">
                  6-Digit Linking Code
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={approvalPin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="e.g. 123-456 or 123456"
                  className="w-full text-center font-mono text-2xl tracking-widest font-bold rounded-2xl border border-base-content/20 bg-base-200/50 py-3 text-base-content outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-base-content/20 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
                  autoFocus
                  disabled={approving}
                />
              </div>

              <div className="rounded-2xl border border-base-content/10 bg-base-200/40 p-3 text-xs text-base-content/70 flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
                <span>
                  Your encryption keys are transferred end-to-end encrypted
                  directly between your devices using ephemeral ECDH. Chatty
                  servers never see or store raw keys.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {onClose && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={approving}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-base-content/70 hover:bg-base-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    approving ||
                    approvalPin.trim().replace(/[\s-]+/g, "").length !== 6
                  }
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {approving ? (
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

          {/* ================= RECOVERY KEY MODE ================= */}
          {activeTab === "recovery" && step < 3 && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-base-content/70 leading-relaxed">
                This 256-bit recovery key was securely generated when your
                account initialized encryption. Save it in a password manager to
                restore access if you ever lose all your devices.
              </p>

              <div className="rounded-2xl border border-base-content/20 bg-base-200/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50 block mb-1.5">
                  256-Bit Cryptographic Recovery Key
                </span>
                <div className="font-mono text-xs font-bold text-base-content break-all select-all leading-relaxed p-3 bg-base-100 rounded-xl border border-base-content/10 shadow-inner">
                  {recoveryKey || "Loading recovery key..."}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  disabled={
                    !recoveryKey || recoveryKey.startsWith("No recovery")
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-base-content/20 px-4 py-2 text-xs font-semibold text-base-content hover:bg-base-200 transition-all cursor-pointer"
                >
                  {copiedKey ? (
                    <>
                      <Check className="size-3.5 text-success" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy Recovery Key</span>
                    </>
                  )}
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-content hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default E2EEDeviceLinkModal;
