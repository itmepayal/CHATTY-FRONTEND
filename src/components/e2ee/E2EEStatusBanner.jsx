import { useState, useEffect } from "react";
import {
  Lock,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  QrCode,
  X,
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
  const [isRestoreDismissed, setIsRestoreDismissed] = useState(false);

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
        <div className="flex items-center justify-between border-b border-error/30 bg-error/15 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-error transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="size-4 shrink-0 text-error" />
            <span className="truncate">
              <strong>Device Revoked:</strong> No longer receiving encrypted
              messages.
            </span>
          </div>
        </div>
      )}

      {isStorageError && (
        <div className="flex items-center justify-between border-b border-warning/30 bg-warning/15 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-warning transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            <span className="truncate">
              <strong>Storage Blocked:</strong> IndexedDB is unavailable in this
              window.
            </span>
          </div>
        </div>
      )}

      {isReady && pendingRecoveryOnboarding && (
        <div className="flex items-center justify-between gap-2 border-b border-warning/30 bg-warning/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-warning transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound className="size-4 shrink-0 text-warning" />
            <span className="truncate">
              <strong>Backup Recovery Key:</strong> Save your key to restore
              chats on new devices.
            </span>
          </div>
          <button
            onClick={() => setRecoveryModalOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1 text-[11px] font-bold text-warning-content shadow-2xs hover:bg-warning/90 transition-all cursor-pointer shrink-0"
          >
            <ShieldCheck className="size-3" />
            <span>Save Key</span>
          </button>
        </div>
      )}

      {isUnsupported && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-error transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="size-4 shrink-0 text-error" />
            <span className="truncate">
              <strong>HTTPS Required:</strong> WebCrypto APIs require HTTPS on
              mobile.
            </span>
          </div>
        </div>
      )}

      {/* Compact E2EE New Device Warning Banner */}
      {isRestoreRequired && !isRestoreDismissed && (
        <div className="border-b border-warning/30 bg-warning/10 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs text-warning transition-all">
          <div className="flex flex-wrap min-[380px]:flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/20 text-warning">
                <KeyRound className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-base-content text-xs shrink-0">
                    New device detected
                  </span>
                  <span className="text-[11px] text-base-content/65 truncate hidden sm:inline">
                    · Link verified device or enter recovery key.
                  </span>
                </div>
                <p className="text-[11px] text-base-content/65 sm:hidden leading-tight truncate">
                  Link device or enter key to decrypt messages.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-auto min-[380px]:ml-0">
              <button
                type="button"
                onClick={() => setLinkOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-warning px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-warning-content shadow-2xs hover:bg-warning/90 transition-all cursor-pointer h-7"
              >
                <QrCode className="size-3" />
                <span>Link Device</span>
              </button>
              <button
                type="button"
                onClick={() => setRestoreOpen(true)}
                className="rounded-lg border border-warning/40 px-2 py-1 text-[11px] font-medium text-warning hover:bg-warning/20 transition-all cursor-pointer h-7"
              >
                <span className="hidden sm:inline">Recovery Key</span>
                <span className="sm:hidden">Key</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRestoreDismissed(true)}
                title="Minimize security notice"
                aria-label="Minimize security notice"
                className="grid size-7 place-items-center rounded-md text-base-content/40 hover:bg-warning/20 hover:text-warning transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slim accessible strip when minimized */}
      {isRestoreRequired && isRestoreDismissed && (
        <div className="border-b border-warning/25 bg-warning/5 px-3 py-1 flex items-center justify-between text-[11px] text-warning transition-all">
          <button
            type="button"
            onClick={() => setIsRestoreDismissed(false)}
            className="flex items-center gap-1.5 hover:underline cursor-pointer text-left truncate mr-2"
          >
            <KeyRound className="size-3 shrink-0 text-warning" />
            <span className="font-medium text-base-content/85">
              New device detected
            </span>
            <span className="text-base-content/50 truncate">
              — Tap to link or restore
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsRestoreDismissed(false)}
            className="text-[10px] font-semibold uppercase tracking-wider text-warning hover:underline cursor-pointer px-1.5 py-0.5 rounded bg-warning/10 shrink-0"
          >
            Review
          </button>
        </div>
      )}

      {isNotConfigured && (
        <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-primary transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="size-4 shrink-0 text-primary" />
            <span className="truncate">
              End-to-End Encryption is ready to be initialized for your account.
            </span>
          </div>
          <button
            onClick={() => setSetupOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-content shadow-2xs hover:bg-primary/90 cursor-pointer shrink-0"
          >
            <span>Activate</span>
            <ChevronRight className="size-3" />
          </button>
        </div>
      )}

      {isBackupMissing && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-error transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="truncate">
              <strong>No Key Backup:</strong> Reset identity to generate fresh
              keys.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-error-content shadow-2xs hover:bg-error/90 cursor-pointer shrink-0"
          >
            Reset
          </button>
        </div>
      )}

      {isMismatch && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-error transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="size-4 shrink-0" />
            <span className="truncate">
              <strong>Identity Mismatch:</strong> Local encryption keys differ
              from server.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-2.5 py-1 text-[11px] font-semibold text-error-content shadow-2xs hover:bg-error/90 cursor-pointer shrink-0"
          >
            Reset
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
