/**
 * TwoFactorModal.jsx
 *
 * Handles the multi-step 2FA flow inside the Security tab:
 *   Phase "verify"  — show QR code, ask for first code to activate
 *   Phase "codes"   — show recovery codes once; user saves & confirms
 *   Phase "disable" — ask for current code to disable 2FA
 *
 * All state lives in useSecurityStore; this component is purely presentational.
 */
import { useState, useCallback } from "react";
import {
  X, Copy, Download, ShieldCheck, ShieldOff,
  KeyRound, AlertTriangle, Loader2, CheckCircle2, QrCode,
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
    ["Chatty Recovery Codes\n\n" + codes.join("\n") + "\n\nStore these somewhere safe. Each code can only be used once."],
    { type: "text/plain" },
  );
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = "chatty-recovery-codes.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-views ──────────────────────────────────────────────────────────────────

/** Step 1: Show QR code + manual key, ask for first TOTP code */
function VerifySetupView() {
  const {
    twoFaQrCode, twoFaManualKey, twoFaLoading, twoFaError,
    enableTwoFa, resetTwoFaState,
  } = useSecurityStore();

  const [code, setCode] = useState("");
  const [copied, setCopied]   = useState(false);

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
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/15">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Scan with your app</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or any TOTP-compatible app and scan the code below.
        </p>
      </div>

      {/* QR code */}
      {twoFaQrCode && (
        <div className="flex justify-center">
          <div className="rounded-2xl border border-base-content/10 bg-white p-3">
            <img src={twoFaQrCode} alt="2FA QR code" className="h-44 w-44" />
          </div>
        </div>
      )}

      {/* Manual entry key */}
      {twoFaManualKey && (
        <div className="rounded-xl border border-base-content/10 bg-base-200/60 p-3">
          <p className="mb-1.5 text-xs font-medium text-base-content/60">Can't scan? Enter manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all text-xs font-mono text-base-content">{twoFaManualKey}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-ghost btn-sm shrink-0"
              title="Copy key"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Verify code form */}
      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
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
            className="input input-bordered w-full text-center tracking-widest text-lg"
          />
        </div>
        {twoFaError && (
          <p className="flex items-center gap-1.5 text-sm text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" />{twoFaError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetTwoFaState}
            className="btn btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={code.length < 6 || twoFaLoading}
            className="btn btn-primary flex-1"
          >
            {twoFaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify & Enable
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
  const [copied, setCopied]       = useState(false);

  const handleCopy = () => {
    copyToClipboard(twoFaRecoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-success/15">
          <ShieldCheck className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-lg font-bold">Two-step verification enabled!</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Save these recovery codes in a safe place. Each code can be used <strong>once</strong> if you lose access to your authenticator app.
        </p>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
        <p className="flex items-center gap-1.5 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          These codes will <strong>not</strong> be shown again.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-base-content/10 bg-base-200/50 p-4">
        {twoFaRecoveryCodes.map((c) => (
          <code key={c} className="rounded-lg bg-base-100 px-3 py-1.5 text-center text-sm font-mono tracking-wider">
            {c}
          </code>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleCopy} className="btn btn-outline btn-sm flex-1 gap-1.5">
          {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          Copy
        </button>
        <button
          type="button"
          onClick={() => downloadCodes(twoFaRecoveryCodes)}
          className="btn btn-outline btn-sm flex-1 gap-1.5"
        >
          <Download className="h-4 w-4" />Download
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-base-content/10 p-3">
        <input
          type="checkbox"
          className="checkbox checkbox-primary"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span className="text-sm">I have saved my recovery codes in a secure place.</span>
      </label>

      <button
        type="button"
        onClick={onDone}
        disabled={!confirmed}
        className="btn btn-primary w-full"
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
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-error/15">
          <ShieldOff className="h-6 w-6 text-error" />
        </div>
        <h2 className="text-lg font-bold">Disable two-step verification</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Enter your current authenticator code to confirm. This will remove the extra layer of protection from your account.
        </p>
      </div>

      <form onSubmit={handleDisable} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Current authenticator code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center tracking-widest text-lg"
          />
        </div>
        {twoFaError && (
          <p className="flex items-center gap-1.5 text-sm text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" />{twoFaError}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button
            type="submit"
            disabled={code.length < 6 || twoFaLoading}
            className="btn btn-error flex-1"
          >
            {twoFaLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ShieldOff className="h-4 w-4" />}
            Disable 2FA
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function TwoFactorModal({ mode, onClose }) {
  const { twoFaPhase, twoFaLoading, startTwoFaSetup, resetTwoFaState } = useSecurityStore();

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-base-content/10 bg-base-200 p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 btn btn-ghost btn-sm btn-circle"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Disable flow */}
        {mode === "disable" && <DisableView onClose={handleClose} />}

        {/* Setup flow: idle → verify → codes */}
        {mode === "setup" && twoFaPhase === "idle" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Enable two-step verification</h2>
            <p className="text-sm text-base-content/60">
              You'll need an authenticator app like Google Authenticator or Microsoft Authenticator on your phone.
            </p>
            <button
              type="button"
              onClick={handleBeginSetup}
              disabled={twoFaLoading}
              className="btn btn-primary w-full"
            >
              {twoFaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Begin setup
            </button>
          </div>
        )}

        {mode === "setup" && twoFaPhase === "verify" && <VerifySetupView />}
        {mode === "setup" && twoFaPhase === "codes"  && (
          <RecoveryCodesView onDone={handleClose} />
        )}
      </div>
    </div>
  );
}

/** Standalone 2FA verify prompt for the login flow */
export function TwoFactorLoginModal({ onClose }) {
  const [code, setCode]                   = useState("");
  const [useRecovery, setUseRecovery]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  // useAuthStore.verifyTwoFactor is imported inside the component to avoid
  // circular store imports
  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await useAuthStore.getState().verifyTwoFactor({ code: code.trim(), useRecoveryCode: useRecovery });
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-base-content/10 bg-base-200 p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/15">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Two-step verification</h2>
          <p className="mt-1 text-sm text-base-content/60">
            {useRecovery
              ? "Enter one of your recovery codes."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 11 : 6}
            placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
            value={code}
            onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
            className="input input-bordered w-full text-center tracking-widest text-lg"
          />

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-error">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length < (useRecovery ? 11 : 6) || loading}
            className="btn btn-primary w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify
          </button>
        </form>

        <div className="mt-4 space-y-2 border-t border-base-content/10 pt-4">
          <button
            type="button"
            onClick={() => { setUseRecovery((v) => !v); setCode(""); setError(null); }}
            className="btn btn-ghost btn-sm w-full text-xs"
          >
            {useRecovery ? "Use authenticator code instead" : "Use a recovery code instead"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm w-full text-xs">
            Cancel — back to login
          </button>
        </div>
      </div>
    </div>
  );
}


