import { useState, useEffect } from "react";
import {
  Lock,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  QrCode,
} from "lucide-react";
import { useE2EE } from "../../hooks/useE2EE.js";
import { E2EESetupModal } from "./E2EESetupModal.jsx";
import { E2EERestoreModal } from "./E2EERestoreModal.jsx";
import { E2EEResetModal } from "./E2EEResetModal.jsx";
import { E2EEDeviceLinkModal } from "./E2EEDeviceLinkModal.jsx";
import { E2EERecoveryKeyModal } from "./E2EERecoveryKeyModal.jsx";

export function E2EEStatusBanner() {
  const {
    isReady,
    pendingRecoveryOnboarding,
    isRestoreRequired,
    isNotConfigured,
    isBackupMissing,
    isMismatch,
    isUnsupported,
    isStorageError,
    isDeviceRevoked,
  } = useE2EE();

  const [setupOpen, setSetupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Auto-prompt recovery key modal once on first onboarding
  useEffect(() => {
    if (isReady && pendingRecoveryOnboarding && !hasAutoOpened) {
      setRecoveryModalOpen(true);
      setHasAutoOpened(true);
    }
  }, [isReady, pendingRecoveryOnboarding, hasAutoOpened]);

  if (isReady && !pendingRecoveryOnboarding && !isDeviceRevoked) return null;

  return (
    <>
      {isDeviceRevoked && (
        <div className="flex items-center justify-between border-b border-error/30 bg-error/15 px-4 py-2.5 text-xs text-error transition-all">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4 shrink-0 text-error" />
            <span>
              <strong>Device Revoked:</strong> This device has been revoked and will no longer receive future encrypted messages. Previously downloaded messages cannot be remotely erased.
            </span>
          </div>
        </div>
      )}

      {isStorageError && (
        <div className="flex items-center justify-between border-b border-warning/30 bg-warning/15 px-4 py-2.5 text-xs text-warning transition-all">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            <span>
              <strong>Storage Unavailable:</strong> Browser storage (IndexedDB / localStorage) is blocked or restricted in this window. Keys cannot be persisted across reloads.
            </span>
          </div>
        </div>
      )}

      {isReady && pendingRecoveryOnboarding && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning transition-all">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 shrink-0 text-warning" />
            <span>
              <strong>Backup your recovery key:</strong> Save your 256-bit
              encryption key to ensure you can restore messages on new devices.
            </span>
          </div>
          <button
            onClick={() => setRecoveryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1 font-bold text-warning-content shadow-xs hover:bg-warning/90 transition-all cursor-pointer"
          >
            <ShieldCheck className="size-3.5" />
            <span>View & Save Key</span>
          </button>
        </div>
      )}

      {isUnsupported && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-4 py-2.5 text-xs text-error transition-all">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4 shrink-0 text-error" />
            <span>
              <strong>Encryption needs HTTPS:</strong> Open the app over https
              (use ngrok/cloudflared tunnel or deploy) to enable encryption on
              mobile.
            </span>
          </div>
        </div>
      )}

      {isRestoreRequired && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-xs text-warning transition-all">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 shrink-0 text-warning" />
            <span>
              <strong>New device detected:</strong> Link with an existing
              verified device or enter your recovery key to decrypt messages.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLinkOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-warning px-3 py-1 font-semibold text-warning-content shadow-xs hover:bg-warning/90 transition-all cursor-pointer"
            >
              <QrCode className="size-3.5" />
              <span>Link Device</span>
            </button>
            <button
              onClick={() => setRestoreOpen(true)}
              className="rounded-lg border border-warning/40 px-3 py-1 font-semibold text-warning hover:bg-warning/20 transition-all cursor-pointer"
            >
              Enter Recovery Key
            </button>
          </div>
        </div>
      )}

      {isNotConfigured && (
        <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary transition-all">
          <div className="flex items-center gap-2.5">
            <Lock className="size-4 shrink-0 text-primary" />
            <span>
              End-to-End Encryption is ready to be initialized for your account.
            </span>
          </div>
          <button
            onClick={() => setSetupOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 font-semibold text-primary-content shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <span>Activate E2EE</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {isBackupMissing && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-4 py-2.5 text-xs text-error transition-all">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              <strong>No key backup available on server.</strong> You can reset
              your identity to generate fresh keys.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-3 py-1 font-semibold text-error-content shadow-xs hover:bg-error/90 cursor-pointer"
          >
            Reset Identity
          </button>
        </div>
      )}

      {isMismatch && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-4 py-2.5 text-xs text-error transition-all">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4 shrink-0" />
            <span>
              <strong>Identity Mismatch:</strong> Your local encryption keys do
              not match your server registration.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-3 py-1 font-semibold text-error-content shadow-xs hover:bg-error/90 cursor-pointer"
          >
            Reset Identity
          </button>
        </div>
      )}

      <E2EESetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
      <E2EEDeviceLinkModal
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        initialMode="link"
        onOpenRestore={() => setRestoreOpen(true)}
      />
      <E2EERestoreModal
        isOpen={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onOpenReset={() => setResetOpen(true)}
      />
      <E2EEResetModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />
      <E2EERecoveryKeyModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        isOnboarding={pendingRecoveryOnboarding}
      />
    </>
  );
}

export default E2EEStatusBanner;
