import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileKey,
  Shield,
  Key,
  Laptop,
  Smartphone,
  Trash2,
  QrCode,
} from "lucide-react";
import { useE2EE } from "../../hooks/useE2EE.js";
import { E2EE_STATUS } from "../../lib/e2ee/e2ee.constants.js";
import { E2EESetupModal } from "./E2EESetupModal.jsx";
import { E2EERestoreModal } from "./E2EERestoreModal.jsx";
import { E2EEChangePassphraseModal } from "./E2EEChangePassphraseModal.jsx";
import { E2EEResetModal } from "./E2EEResetModal.jsx";
import { E2EEDeviceLinkModal } from "./E2EEDeviceLinkModal.jsx";
import {
  getRegisteredDevicesApi,
  revokeDeviceApi,
} from "../../lib/e2ee/e2ee.api.js";
import { getDeviceId } from "../../lib/e2ee/e2eeDevice.js";
import { customToast } from "../toast";

export function E2EESettingsSection() {
  const {
    status,
    isReady,
    isRestoreRequired,
    isNotConfigured,
    isMismatch,
    me,
    serverStatus,
    refresh,
  } = useE2EE();

  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [changePassModalOpen, setChangePassModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalMode, setLinkModalMode] = useState("approve");
  const [refreshing, setRefreshing] = useState(false);

  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const currentDeviceId = getDeviceId();

  const loadDevices = useCallback(async () => {
    if (!isReady) return;
    setLoadingDevices(true);
    try {
      const devList = await getRegisteredDevicesApi();
      setDevices(devList || []);
    } catch {
      // ignore
    } finally {
      setLoadingDevices(false);
    }
  }, [isReady]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevokeDevice = async (deviceId, deviceName) => {
    try {
      await revokeDeviceApi(deviceId);
      customToast.success(`Device "${deviceName || deviceId}" revoked.`);
      setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    } catch {
      customToast.error("Failed to revoke device.");
    }
  };

  const getKeyStorageLabel = () => {
    if (isReady && me?.privateKey) {
      return me.privateKey.extractable === false
        ? "IndexedDB (Non-extractable)"
        : "IndexedDB (Extractable)";
    }
    if (isRestoreRequired) {
      return "Backup on server (Key missing locally)";
    }
    if (isMismatch) {
      return "Key Mismatch (Local differs from server)";
    }
    if (isNotConfigured) {
      return "Not initialized";
    }
    return "Not stored locally";
  };

  const getCryptoSuiteLabel = () => {
    if (isReady) return "ECDH P-256 + AES-GCM-256";
    if (isNotConfigured) return "Not initialized";
    return "ECDH P-256 + AES-GCM-256 (Inactive)";
  };

  const getBackupLabel = () => {
    if (serverStatus?.hasBackup) {
      return `Version ${serverStatus.backupVersion || 1} (PBKDF2-SHA256 · 600,000 iterations)`;
    }
    return "No backup";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadDevices();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case E2EE_STATUS.READY:
        return (
          <span className="badge badge-success gap-1.5 font-semibold">
            <CheckCircle2 className="size-3.5" />
            Active & Verified
          </span>
        );
      case E2EE_STATUS.RESTORE_REQUIRED:
        return (
          <span className="badge badge-warning gap-1.5 font-semibold">
            <KeyRound className="size-3.5" />
            Restore Required
          </span>
        );
      case E2EE_STATUS.NOT_CONFIGURED:
        return (
          <span className="badge badge-neutral gap-1.5 font-semibold">
            Not Enabled
          </span>
        );
      case E2EE_STATUS.BACKUP_MISSING:
        return (
          <span className="badge badge-error gap-1.5 font-semibold">
            Backup Missing
          </span>
        );
      case E2EE_STATUS.IDENTITY_MISMATCH:
        return (
          <span className="badge badge-error gap-1.5 font-semibold">
            Identity Mismatch
          </span>
        );
      case E2EE_STATUS.LOADING:
      case E2EE_STATUS.SETTING_UP:
      case E2EE_STATUS.RESTORING:
        return (
          <span className="badge badge-info gap-1.5 font-semibold">
            <span className="size-2 rounded-full bg-info animate-ping" />
            Syncing...
          </span>
        );
      default:
        return <span className="badge badge-ghost capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Encryption Status Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-6 shadow-sm transition-all hover:border-base-content/20">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-base-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-base-content break-words">
                Encryption Status
              </h3>
              <p className="text-xs text-base-content/60 break-words">
                End-to-end encryption identity on this device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge()}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content cursor-pointer"
              title="Refresh E2EE status"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/50">
            <span className="text-base-content/60 block mb-0.5">
              Cryptographic Suite
            </span>
            <span className="font-semibold text-base-content font-mono">
              {getCryptoSuiteLabel()}
            </span>
          </div>
          <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/50">
            <span className="text-base-content/60 block mb-0.5">
              Key Storage
            </span>
            <span className="font-semibold text-base-content">
              {getKeyStorageLabel()}
            </span>
          </div>
          <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/50">
            <span className="text-base-content/60 block mb-0.5">
              Public Key Registered
            </span>
            <span className="font-semibold text-base-content">
              {serverStatus?.publicKeyUpdatedAt
                ? new Date(serverStatus.publicKeyUpdatedAt).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )
                : serverStatus?.hasPublicKey || serverStatus?.hasKey
                  ? "Registered"
                  : "Not registered"}
            </span>
          </div>
          <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/50">
            <span className="text-base-content/60 block mb-0.5">
              Multi-Device Backup
            </span>
            <span className="font-semibold text-base-content">
              {getBackupLabel()}
            </span>
          </div>
        </div>

        {isRestoreRequired && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="size-4 shrink-0" />
              <span>
                New device detected. Link with an existing verified device or
                enter your recovery key.
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setLinkModalMode("link");
                  setLinkModalOpen(true);
                }}
                className="btn btn-warning btn-sm min-h-[44px] sm:min-h-[32px] shrink-0 font-semibold rounded-lg flex-1 sm:flex-none cursor-pointer"
              >
                Link Device
              </button>
              <button
                onClick={() => setRestoreModalOpen(true)}
                className="btn btn-outline btn-sm min-h-[44px] sm:min-h-[32px] shrink-0 font-semibold rounded-lg flex-1 sm:flex-none cursor-pointer"
              >
                Enter Key
              </button>
            </div>
          </div>
        )}

        {isNotConfigured && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="size-4 shrink-0" />
              <span>
                Enable End-to-End Encryption with automatic zero-password key
                generation.
              </span>
            </div>
            <button
              onClick={() => setSetupModalOpen(true)}
              className="btn btn-primary btn-sm min-h-[44px] sm:min-h-[32px] shrink-0 font-semibold rounded-lg w-full sm:w-auto cursor-pointer"
            >
              Activate E2EE
            </button>
          </div>
        )}
      </div>

      {/* 2. Connected Devices & Automatic Key Sharing */}
      {isReady && (
        <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-6 shadow-sm transition-all hover:border-base-content/20">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-base-200/80">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Laptop className="size-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-base-content">
                  Connected Devices & Key Sharing
                </h3>
                <p className="text-xs text-base-content/60">
                  Manage registered devices and link new devices without
                  passwords
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setLinkModalMode("approve");
                setLinkModalOpen(true);
              }}
              className="btn btn-primary btn-sm rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Laptop className="size-3.5" />
              Link a New Device
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-base-content/70">
                Registered Devices ({devices.length})
              </span>
              <button
                onClick={() => {
                  setLinkModalMode("recovery-key");
                  setLinkModalOpen(true);
                }}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                View 256-Bit Recovery Key
              </button>
            </div>

            {loadingDevices ? (
              <div className="py-4 text-center text-xs text-base-content/50">
                Loading connected devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="rounded-xl bg-base-200/40 p-3 text-center text-xs text-base-content/60">
                This device is the only verified device.
              </div>
            ) : (
              <div className="divide-y divide-base-200 rounded-xl border border-base-300/60 bg-base-200/30 overflow-hidden">
                {devices.map((dev) => {
                  const isCurrent = dev.deviceId === currentDeviceId;
                  return (
                    <div
                      key={dev.deviceId}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {dev.deviceName?.toLowerCase().includes("android") ||
                        dev.deviceName?.toLowerCase().includes("ios") ? (
                          <Smartphone className="size-4 shrink-0 text-base-content/60" />
                        ) : (
                          <Laptop className="size-4 shrink-0 text-base-content/60" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base-content truncate">
                              {dev.deviceName || "Chatty Client"}
                            </span>
                            {isCurrent && (
                              <span className="badge badge-primary badge-xs font-medium">
                                Current Device
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-base-content/50 font-mono">
                            Registered:{" "}
                            {dev.registeredAt
                              ? new Date(dev.registeredAt).toLocaleDateString()
                              : "Active"}
                          </span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() =>
                            handleRevokeDevice(dev.deviceId, dev.deviceName)
                          }
                          className="btn btn-ghost btn-xs text-error hover:bg-error/10 cursor-pointer"
                          title="Revoke device access"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Multi-Device Key Backup Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-6 shadow-sm transition-all hover:border-base-content/20">
        <div className="flex items-center gap-3 pb-3.5 border-b border-base-200/80">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <FileKey className="size-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-base-content">
              Multi-Device Key Backup
            </h3>
            <p className="text-xs text-base-content/60">
              Encrypted backup for zero-knowledge key recovery across devices
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-base-content/70">
            Your private encryption key is client-encrypted using{" "}
            <strong>PBKDF2-SHA256 (600,000 iterations)</strong> and stored in
            encrypted form on the server. Only someone with your recovery
            passphrase or recovery key can decrypt it.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {isReady && (
              <>
                <button
                  onClick={() => {
                    setLinkModalMode("recovery-key");
                    setLinkModalOpen(true);
                  }}
                  className="btn btn-outline btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
                >
                  <ShieldCheck className="size-3.5" />
                  View Recovery Key
                </button>
                <button
                  onClick={() => setChangePassModalOpen(true)}
                  className="btn btn-outline btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
                >
                  <Key className="size-3.5" />
                  Change Recovery Passphrase
                </button>
              </>
            )}

            {isRestoreRequired && (
              <button
                onClick={() => setRestoreModalOpen(true)}
                className="btn btn-warning btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                Restore from Backup
              </button>
            )}

            {isNotConfigured && (
              <button
                onClick={() => setSetupModalOpen(true)}
                className="btn btn-primary btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
              >
                <Lock className="size-3.5" />
                Create Key & Backup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="rounded-2xl sm:rounded-3xl border border-error/25 bg-base-100 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-3.5 border-b border-error/15">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-error">
              Danger Zone: Reset Identity
            </h3>
            <p className="text-xs text-base-content/60">
              Permanently revoke cryptographic keys and start fresh
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs leading-relaxed text-base-content/70">
            If you permanently lost your recovery passphrase or suspect your key
            was compromised, you can reset your encryption identity. This will
            delete your keys from the server.
            <span className="font-semibold text-error block mt-1.5">
              Warning: Historical encrypted messages cannot be recovered once
              reset.
            </span>
          </p>

          <div className="pt-2">
            <button
              onClick={() => setResetModalOpen(true)}
              className="btn btn-error btn-outline btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Reset Encryption Identity
            </button>
          </div>
        </div>
      </div>

      <E2EESetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
      />
      <E2EERestoreModal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onOpenReset={() => setResetModalOpen(true)}
      />
      <E2EEChangePassphraseModal
        isOpen={changePassModalOpen}
        onClose={() => setChangePassModalOpen(false)}
      />
      <E2EEDeviceLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        initialMode={linkModalMode}
        onOpenRestore={() => setRestoreModalOpen(true)}
      />
      <E2EEResetModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
      />
    </div>
  );
}

export default E2EESettingsSection;
