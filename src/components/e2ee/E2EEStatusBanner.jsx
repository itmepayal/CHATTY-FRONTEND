/**
 * E2EEStatusBanner.jsx
 * Non-intrusive alert banner displayed at the top of chat screens when
 * the device requires restoration, setup, or detects an identity anomaly.
 */

import { useState } from "react";
import {
  Lock,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { useE2EE } from "../../hooks/useE2EE.js";
import { E2EESetupModal } from "./E2EESetupModal.jsx";
import { E2EERestoreModal } from "./E2EERestoreModal.jsx";
import { E2EEResetModal } from "./E2EEResetModal.jsx";

export function E2EEStatusBanner() {
  const {
    isReady,
    isRestoreRequired,
    isNotConfigured,
    isBackupMissing,
    isMismatch,
  } = useE2EE();

  const [setupOpen, setSetupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (isReady) return null;

  return (
    <>
      {isRestoreRequired && (
        <div className="flex items-center justify-between border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-xs text-warning transition-all">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 shrink-0 text-warning" />
            <span>
              <strong>Encrypted messages:</strong> Enter your recovery passphrase to read messages on this device.
            </span>
          </div>
          <button
            onClick={() => setRestoreOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-warning px-3 py-1 font-semibold text-warning-content shadow-xs hover:bg-warning/90"
          >
            <span>Restore Keys</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {isNotConfigured && (
        <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary transition-all">
          <div className="flex items-center gap-2.5">
            <Lock className="size-4 shrink-0 text-primary" />
            <span>
              End-to-End Encryption is not yet enabled for your account.
            </span>
          </div>
          <button
            onClick={() => setSetupOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 font-semibold text-primary-content shadow-xs hover:bg-primary/90"
          >
            <span>Enable E2EE</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {isBackupMissing && (
        <div className="flex items-center justify-between border-b border-error/20 bg-error/10 px-4 py-2.5 text-xs text-error transition-all">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              <strong>No key backup available on server.</strong> You can reset your identity to generate fresh keys.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-3 py-1 font-semibold text-error-content shadow-xs hover:bg-error/90"
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
              <strong>Identity Mismatch:</strong> Your local encryption keys do not match your server registration.
            </span>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="rounded-lg bg-error px-3 py-1 font-semibold text-error-content shadow-xs hover:bg-error/90"
          >
            Reset Identity
          </button>
        </div>
      )}

      <E2EESetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
      <E2EERestoreModal
        isOpen={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onOpenReset={() => setResetOpen(true)}
      />
      <E2EEResetModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />
    </>
  );
}

export default E2EEStatusBanner;
