/**
 * TwoFactorModal.jsx
 *
 * Handles the multi-step 2FA flow inside the Security tab:
 *   Phase "verify"  — show QR code, ask for first code to activate
 *   Phase "codes"   — show recovery codes once; user saves & confirms
 *   Phase "disable" — ask for current code to disable 2FA
 *
 * All state lives in useSecurityStore; this component is purely presentational.
 * Fully responsive across 320px, 375px, 425px, 768px, 1024px, and desktop widths.
 */
import { useState, useCallback } from "react";
import {
  X,
  Copy,
  Download,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import { useSecurityStore } from "../../store/useSecurityStore";
import { useAuthStore } from "../../store/useAuthStore";

// ── Helpers ────────────────────────────────────────────────────────────────────
function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

function downloadCodes(codes) {
  const blob = new Blob(
    [
      "Chatty Recovery Codes\n\n" +
        codes.join("\n") +
        "\n\nStore these somewhere safe. Each code can only be used once.",
    ],
    { type: "text/plain" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chatty-recovery-codes.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-views ──────────────────────────────────────────────────────────────────

/** Step 1: Show QR code + manual key, ask for first TOTP code */
function VerifySetupView() {
  const {
    twoFaQrCode,
    twoFaManualKey,
    twoFaLoading,
    twoFaError,
    enableTwoFa,
    resetTwoFaState,
  } = useSecurityStore();

  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(twoFaManualKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await enableTwoFa(code.trim());
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-2.5 sm:mb-3 grid size-11 sm:size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <QrCode className="size-5 sm:size-6 text-primary" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-base-content">
          Scan with your app
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-base-content/65 leading-relaxed max-w-sm mx-auto">
          Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or any TOTP app and scan the code below.
        </p>
      </div>

      {/* QR code container - cleanly scaled for 320px+ */}
      {twoFaQrCode && (
        <div className="flex justify-center my-1 sm:my-2">
          <div className="rounded-2xl border border-base-300/80 bg-white p-2.5 sm:p-3 shadow-xs">
            <img
              src={twoFaQrCode}
              alt="2FA QR code"
              className="size-36 sm:size-44 max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Manual entry key */}
      {twoFaManualKey && (
        <div className="rounded-xl border border-base-300/80 bg-base-200/50 p-2.5 sm:p-3 space-y-1.5">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-base-content/60">
            Can't scan? Enter manually:
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-base-300/60 bg-base-100 p-2">
            <code className="flex-1 min-w-0 break-all text-[11px] sm:text-xs font-mono text-base-content select-all leading-tight">
              {twoFaManualKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-ghost btn-sm size-8 min-h-[32px] min-w-[32px] p-0 shrink-0 text-base-content/70 hover:text-primary transition-colors"
              title={copied ? "Copied" : "Copy key"}
              aria-label="Copy key"
            >
              {copied ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Verify code form */}
      <form onSubmit={handleVerify} className="space-y-3 sm:space-y-4 pt-1">
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-base-content/80 text-center">
            Enter the 6-digit code from your app
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center tracking-[0.25em] sm:tracking-[0.35em] text-lg sm:text-xl font-mono font-bold h-11 sm:h-12 min-h-[44px] rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
          />
        </div>

        {twoFaError && (
          <p className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-error bg-error/10 border border-error/20 rounded-xl p-2.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{twoFaError}</span>
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
          <button
            type="button"
            onClick={resetTwoFaState}
            className="btn btn-ghost w-full sm:flex-1 h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={code.length < 6 || twoFaLoading}
            className="btn btn-primary w-full sm:flex-1 h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold gap-1.5 shadow-sm shadow-primary/20"
          >
            {twoFaLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            <span>Verify & Enable</span>
          </button>
        </div>
      </form>
    </div>
  );
}

/** Step 2: Show recovery codes once after successful setup */
function RecoveryCodesView({ onDone }) {
  const { twoFaRecoveryCodes } = useSecurityStore();
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(twoFaRecoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-2.5 sm:mb-3 grid size-11 sm:size-12 place-items-center rounded-2xl bg-success/15 text-success">
          <ShieldCheck className="size-5 sm:size-6 text-success" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-base-content">
          Two-step verification enabled!
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-base-content/65 leading-relaxed max-w-sm mx-auto">
          Save these recovery codes in a safe place. Each code can be used <strong>once</strong> if you lose access to your authenticator app.
        </p>
      </div>

      <div className="rounded-xl border border-warning/30 bg-warning/10 p-2.5 sm:p-3">
        <p className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-warning leading-snug">
          <AlertTriangle className="size-4 shrink-0" />
          <span>These codes will <strong>not</strong> be shown again.</span>
        </p>
      </div>

      {/* Recovery Codes Grid: 1 col on < 380px, 2 cols on >= 380px */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-1.5 sm:gap-2 rounded-xl border border-base-300/80 bg-base-200/50 p-2.5 sm:p-3.5 max-h-48 sm:max-h-56 overflow-y-auto">
        {twoFaRecoveryCodes.map((c) => (
          <code
            key={c}
            className="rounded-lg bg-base-100 border border-base-300/60 px-2.5 py-1.5 text-center text-xs sm:text-sm font-mono font-medium tracking-normal sm:tracking-wider select-all break-all"
          >
            {c}
          </code>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-outline btn-sm w-full sm:flex-1 h-9 sm:h-10 min-h-[36px] rounded-xl text-xs sm:text-sm font-medium gap-1.5"
        >
          {copied ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <Copy className="size-4" />
          )}
          <span>{copied ? "Copied" : "Copy all"}</span>
        </button>
        <button
          type="button"
          onClick={() => downloadCodes(twoFaRecoveryCodes)}
          className="btn btn-outline btn-sm w-full sm:flex-1 h-9 sm:h-10 min-h-[36px] rounded-xl text-xs sm:text-sm font-medium gap-1.5"
        >
          <Download className="size-4" />
          <span>Download (.txt)</span>
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 sm:gap-3 rounded-xl border border-base-300/80 bg-base-100/70 p-2.5 sm:p-3 hover:bg-base-100 transition-colors select-none">
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span className="text-xs sm:text-sm text-base-content/80 leading-snug">
          I have saved my recovery codes in a secure place.
        </span>
      </label>

      <button
        type="button"
        onClick={onDone}
        disabled={!confirmed}
        className="btn btn-primary w-full h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold"
      >
        Done
      </button>
    </div>
  );
}

/** Disable 2FA view — requires current TOTP code */
function DisableView({ onClose }) {
  const { twoFaLoading, twoFaError, disableTwoFa } = useSecurityStore();
  const [code, setCode] = useState("");

  const handleDisable = async (e) => {
    e.preventDefault();
    const ok = await disableTwoFa(code.trim());
    if (ok) onClose();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-2.5 sm:mb-3 grid size-11 sm:size-12 place-items-center rounded-2xl bg-error/15 text-error">
          <ShieldOff className="size-5 sm:size-6 text-error" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-base-content">
          Disable two-step verification
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-base-content/65 leading-relaxed max-w-sm mx-auto">
          Enter your current authenticator code to confirm. This will remove the extra layer of protection from your account.
        </p>
      </div>

      <form onSubmit={handleDisable} className="space-y-3 sm:space-y-4 pt-1">
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-base-content/80 text-center">
            Current authenticator code
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center tracking-[0.25em] sm:tracking-[0.35em] text-lg sm:text-xl font-mono font-bold h-11 sm:h-12 min-h-[44px] rounded-xl border-base-300 focus:border-error focus:ring-4 focus:ring-error/15 transition-all"
          />
        </div>

        {twoFaError && (
          <p className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-error bg-error/10 border border-error/20 rounded-xl p-2.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{twoFaError}</span>
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost w-full sm:flex-1 h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={code.length < 6 || twoFaLoading}
            className="btn btn-error w-full sm:flex-1 h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold gap-1.5"
          >
            {twoFaLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldOff className="size-4" />
            )}
            <span>Disable 2FA</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function TwoFactorModal({ mode, onClose }) {
  const { twoFaPhase, twoFaLoading, startTwoFaSetup, resetTwoFaState } =
    useSecurityStore();

  const handleClose = useCallback(() => {
    resetTwoFaState();
    onClose();
  }, [resetTwoFaState, onClose]);

  // Setup modal: idle → starts setup immediately on mount
  const handleBeginSetup = async () => {
    await startTwoFaSetup();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 md:p-6 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-md my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-6 shadow-2xl transition-all">
        {/* Close button with comfortable touch target */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 btn btn-ghost btn-xs sm:btn-sm btn-circle size-8 sm:size-9 min-h-[32px] min-w-[32px] text-base-content/60 hover:text-base-content hover:bg-base-200 z-10"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Disable flow */}
        {mode === "disable" && <DisableView onClose={handleClose} />}

        {/* Setup flow: idle → verify → codes */}
        {mode === "setup" && twoFaPhase === "idle" && (
          <div className="space-y-4 sm:space-y-5 text-center py-2 sm:py-3">
            <div className="mx-auto mb-2.5 sm:mb-3 grid size-11 sm:size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <KeyRound className="size-6 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-base-content">
              Enable two-step verification
            </h2>
            <p className="text-xs sm:text-sm text-base-content/65 max-w-sm mx-auto leading-relaxed">
              You'll need an authenticator app like Google Authenticator or Microsoft Authenticator on your phone.
            </p>
            <button
              type="button"
              onClick={handleBeginSetup}
              disabled={twoFaLoading}
              className="btn btn-primary w-full h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold gap-1.5 shadow-sm shadow-primary/20"
            >
              {twoFaLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              <span>Begin setup</span>
            </button>
          </div>
        )}

        {mode === "setup" && twoFaPhase === "verify" && <VerifySetupView />}
        {mode === "setup" && twoFaPhase === "codes" && (
          <RecoveryCodesView onDone={handleClose} />
        )}
      </div>
    </div>
  );
}

/** Standalone 2FA verify prompt for the login flow */
export function TwoFactorLoginModal({ onClose }) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // useAuthStore.verifyTwoFactor is imported inside the component to avoid circular store imports
  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await useAuthStore
        .getState()
        .verifyTwoFactor({ code: code.trim(), useRecoveryCode: useRecovery });
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm my-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-6 shadow-2xl transition-all">
        <div className="mb-4 sm:mb-5 text-center">
          <div className="mx-auto mb-2.5 sm:mb-3 grid size-11 sm:size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="size-5 sm:size-6 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-base-content">
            Two-step verification
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-base-content/65 leading-relaxed">
            {useRecovery
              ? "Enter one of your recovery codes."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3 sm:space-y-4">
          <input
            type="text"
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 11 : 6}
            placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
            value={code}
            onChange={(e) =>
              setCode(
                useRecovery
                  ? e.target.value.toUpperCase()
                  : e.target.value.replace(/\D/g, "")
              )
            }
            className="input input-bordered w-full text-center tracking-[0.2em] sm:tracking-[0.3em] font-mono font-bold text-base sm:text-lg h-11 sm:h-12 min-h-[44px] rounded-xl border-base-300 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
          />

          {error && (
            <p className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-error bg-error/10 border border-error/20 rounded-xl p-2.5">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={code.length < (useRecovery ? 11 : 6) || loading}
            className="btn btn-primary w-full h-10 sm:h-11 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-primary/20"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>Verify</span>
          </button>
        </form>

        <div className="mt-4 space-y-2 border-t border-base-300/80 pt-3 sm:pt-4">
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setCode("");
              setError(null);
            }}
            className="btn btn-ghost btn-sm w-full text-xs font-medium h-9 min-h-[36px] rounded-lg"
          >
            {useRecovery
              ? "Use authenticator code instead"
              : "Use a recovery code instead"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm w-full text-xs font-medium h-9 min-h-[36px] rounded-lg text-base-content/60 hover:text-base-content"
          >
            Cancel — back to login
          </button>
        </div>
      </div>
    </div>
  );
}
