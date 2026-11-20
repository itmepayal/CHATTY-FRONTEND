import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  KeyRound,
  RotateCcw,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileKey,
  Key,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  MoreVertical,
  Trash2,
  QrCode,
  ChevronDown,
  Check,
  Copy,
  Info,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useE2EE } from "../../hooks/useE2EE.js";
import { E2EE_STATUS } from "../../lib/e2ee/e2ee.constants.js";
import { E2EESetupModal } from "./E2EESetupModal.jsx";
import { E2EERestoreModal } from "./E2EERestoreModal.jsx";
import { E2EEChangePassphraseModal } from "./E2EEChangePassphraseModal.jsx";
import { E2EEResetModal } from "./E2EEResetModal.jsx";
import { E2EEDeviceLinkModal } from "./E2EEDeviceLinkModal.jsx";
import { E2EERecoveryKeyModal } from "./E2EERecoveryKeyModal.jsx";
import {
  getRegisteredDevicesApi,
  revokeDeviceApi,
} from "../../lib/e2ee/e2ee.api.js";
import {
  getDeviceId,
  computeKeyFingerprint,
  clearDeviceCache,
} from "../../lib/e2ee/e2eeDevice.js";
import { customToast } from "../toast";

/**
 * Determine device type, icon, and human-friendly platform label.
 */
function getDeviceTypeInfo(deviceName = "") {
  const name = String(deviceName).toLowerCase();

  if (/iphone|android|mobile|pixel|galaxy|phone/.test(name)) {
    return {
      type: "mobile",
      Icon: Smartphone,
      label: /iphone|ios/.test(name)
        ? "iPhone"
        : /android/.test(name)
          ? "Android"
          : "Mobile Device",
    };
  }

  if (/ipad|tablet/.test(name)) {
    return {
      type: "tablet",
      Icon: Tablet,
      label: "Tablet",
    };
  }

  if (/windows|win32|win64/.test(name)) {
    return {
      type: "desktop",
      Icon: Monitor,
      label: "Windows PC",
    };
  }

  if (/macintosh|mac os|darwin|macbook|imac/.test(name)) {
    return {
      type: "mac",
      Icon: Laptop,
      label: "Mac",
    };
  }

  if (/linux/.test(name)) {
    return {
      type: "linux",
      Icon: Laptop,
      label: "Linux",
    };
  }

  return {
    type: "computer",
    Icon: Laptop,
    label: "Computer",
  };
}

/**
 * Parse browser and OS information from device name or metadata.
 */
function parseDeviceDetails(deviceName = "") {
  const name = String(deviceName);
  let browser = "Web Browser";
  let os = "Desktop";

  if (/chrome/i.test(name)) browser = "Chrome";
  else if (/firefox/i.test(name)) browser = "Firefox";
  else if (/safari/i.test(name) && !/chrome/i.test(name)) browser = "Safari";
  else if (/edg/i.test(name)) browser = "Edge";
  else if (/opera|opr/i.test(name)) browser = "Opera";

  if (/mac/i.test(name)) os = "macOS";
  else if (/windows/i.test(name)) os = "Windows";
  else if (/android/i.test(name)) os = "Android";
  else if (/iphone|ios/i.test(name)) os = "iOS";
  else if (/linux/i.test(name)) os = "Linux";

  return `${browser} on ${os}`;
}

/**
 * Formats a key fingerprint into clean 4-character monospace blocks.
 */
function formatFingerprint(fp) {
  if (!fp) return "Calculating...";
  return fp.match(/.{1,4}/g)?.join(" ") || fp;
}

/**
 * Human-friendly date and time formatter.
 */
function formatDeviceDate(timestamp) {
  if (!timestamp) return "Unknown";
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

/**
 * Formats last active relative time string.
 */
function formatLastActive(dev, isCurrent) {
  if (isCurrent) return "Active now";
  if (!dev?.lastActiveAt) return "Recently active";

  try {
    const lastActive = new Date(dev.lastActiveAt);
    const now = new Date();
    const isToday = lastActive.toDateString() === now.toDateString();

    if (isToday) {
      return `Active today at ${lastActive.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    const diffDays = Math.round((now - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return `Active yesterday at ${lastActive.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    if (diffDays < 7) {
      return `Active ${diffDays} days ago`;
    }

    return `Active on ${lastActive.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  } catch {
    return "Recently active";
  }
}

export function E2EESettingsSection() {
  const {
    status,
    isReady,
    pendingRecoveryOnboarding,
    isRestoreRequired,
    isNotConfigured,
    isMismatch,
    isStorageError,
    me,
    serverStatus,
    refresh,
  } = useE2EE();

  // Modals state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [changePassModalOpen, setChangePassModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalMode, setLinkModalMode] = useState("link");
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);

  // Device inspection & revocation dialogs
  const [detailsModalDevice, setDetailsModalDevice] = useState(null);
  const [revokeConfirmDevice, setRevokeConfirmDevice] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [copiedSafetyNumber, setCopiedSafetyNumber] = useState(false);
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  // Dropdown menu state
  const [openMenuDeviceId, setOpenMenuDeviceId] = useState(null);

  // Advanced section collapse state (default collapsed)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Refresh & device list state
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceFingerprints, setDeviceFingerprints] = useState({});
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [incomingLinkRequest, setIncomingLinkRequest] = useState(null);
  const currentDeviceId = getDeviceId();

  // Load connected devices from server
  const loadDevices = useCallback(async () => {
    if (!isReady) return;
    setLoadingDevices(true);
    try {
      const devList = await getRegisteredDevicesApi();
      const validList = Array.isArray(devList) ? devList : [];
      setDevices(validList);
      setLastSyncTime(new Date());

      const fps = {};
      for (const d of validList) {
        if (d?.publicKey) {
          fps[d.deviceId] = await computeKeyFingerprint(d.publicKey);
        }
      }
      setDeviceFingerprints(fps);
    } catch {
      // ignore
    } finally {
      setLoadingDevices(false);
    }
  }, [isReady]);

  useEffect(() => {
    loadDevices();
    const handleDeviceEvent = () => {
      loadDevices();
    };
    const handleBackupEvent = () => {
      refresh();
    };
    const handleResetEvent = () => {
      refresh();
      loadDevices();
    };
    const handleLinkRequested = (e) => {
      setIncomingLinkRequest(e.detail);
    };

    window.addEventListener("chatty:device-revoked", handleDeviceEvent);
    window.addEventListener("chatty:device-rotated", handleDeviceEvent);
    window.addEventListener("chatty:device-registered", handleDeviceEvent);
    window.addEventListener("chatty:device-link-completed", handleDeviceEvent);
    window.addEventListener("chatty:e2ee-backup-updated", handleBackupEvent);
    window.addEventListener("chatty:e2ee-reset", handleResetEvent);
    window.addEventListener("chatty:device-link-requested", handleLinkRequested);

    return () => {
      window.removeEventListener("chatty:device-revoked", handleDeviceEvent);
      window.removeEventListener("chatty:device-rotated", handleDeviceEvent);
      window.removeEventListener("chatty:device-registered", handleDeviceEvent);
      window.removeEventListener("chatty:device-link-completed", handleDeviceEvent);
      window.removeEventListener("chatty:e2ee-backup-updated", handleBackupEvent);
      window.removeEventListener("chatty:e2ee-reset", handleResetEvent);
      window.removeEventListener("chatty:device-link-requested", handleLinkRequested);
    };
  }, [loadDevices, refresh]);

  // Click outside listener for device dropdown menus
  useEffect(() => {
    if (!openMenuDeviceId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(`[data-device-menu="${openMenuDeviceId}"]`)) {
        setOpenMenuDeviceId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openMenuDeviceId]);

  // Escape key listener & Body scroll locking for inline dialogs (details & revoke)
  useEffect(() => {
    const isAnyModalOpen = Boolean(detailsModalDevice || revokeConfirmDevice);
    if (!isAnyModalOpen && !openMenuDeviceId) return;

    let originalOverflow = "";
    if (isAnyModalOpen) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (openMenuDeviceId) {
          setOpenMenuDeviceId(null);
          return;
        }
        if (revokeConfirmDevice && !revoking) {
          setRevokeConfirmDevice(null);
          return;
        }
        if (detailsModalDevice) {
          setDetailsModalDevice(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (isAnyModalOpen) {
        document.body.style.overflow = originalOverflow;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailsModalDevice, revokeConfirmDevice, openMenuDeviceId, revoking]);

  // Confirm removal of device
  const handleConfirmRevoke = async () => {
    if (!revokeConfirmDevice) return;
    setRevoking(true);
    try {
      await revokeDeviceApi(revokeConfirmDevice.deviceId);
      clearDeviceCache();
      customToast.success(
        `Device "${revokeConfirmDevice.deviceName || revokeConfirmDevice.deviceId}" was removed.`,
      );
      setDevices((prev) =>
        prev.filter((d) => d.deviceId !== revokeConfirmDevice.deviceId),
      );
      setRevokeConfirmDevice(null);
      if (detailsModalDevice?.deviceId === revokeConfirmDevice.deviceId) {
        setDetailsModalDevice(null);
      }
    } catch {
      customToast.error("Failed to remove device.");
    } finally {
      setRevoking(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadDevices();
      customToast.success("Encryption status refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  // Technical storage label for Advanced Accordion
  const getKeyStorageLabel = () => {
    if (isStorageError) {
      return "Storage Blocked (IndexedDB / localStorage unavailable)";
    }
    if (isReady && me?.privateKey) {
      return me.privateKey.extractable === false
        ? "Non-extractable WebCrypto in IndexedDB"
        : "IndexedDB (Extractable)";
    }
    if (isRestoreRequired) {
      return "Cloud Backup (Key missing locally)";
    }
    if (isMismatch) {
      return "Key Mismatch (Local differs from server)";
    }
    if (isNotConfigured) {
      return "Not initialized";
    }
    return "Not stored locally";
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. ENCRYPTION STATUS CARD (Section A)
          Clean, modern, premium status overview without crypto jargon.
      ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-base-content/10 bg-base-100 p-4 sm:p-5 shadow-xs transition-colors hover:border-base-content/20">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Left: Shield Icon + Content Group */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
            {/* Subtle Cyan/Teal Shield Icon Container */}
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                isReady
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                  : isRestoreRequired
                    ? "bg-warning/10 border-warning/25 text-warning"
                    : "bg-base-200 border-base-300 text-base-content/60"
              }`}
            >
              <ShieldCheck className="size-5" />
            </div>

            {/* Title, Status Badge & Description */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-sm sm:text-base font-semibold text-base-content tracking-tight">
                  End-to-End Encryption
                </h3>

                {isReady && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 shrink-0">
                    <CheckCircle2 className="size-3" />
                    Protection is active
                  </span>
                )}
                {isRestoreRequired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/15 text-warning border border-warning/30 shrink-0">
                    <KeyRound className="size-3" />
                    Restore Required
                  </span>
                )}
                {isNotConfigured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-base-200 text-base-content/70 border border-base-300 shrink-0">
                    Protection Disabled
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-base-content/65 mt-1 leading-relaxed max-w-2xl">
                Your messages and media are protected. Only you and your recipients can read them.
              </p>
            </div>
          </div>

          {/* Right: Refresh Icon Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200/80 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh encryption status"
            aria-label="Refresh encryption status"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin text-cyan-500" : ""}`}
            />
          </button>
        </div>

        {/* Action Alert Banner for Restore Required */}
        {isRestoreRequired && (
          <div className="mt-4 rounded-xl sm:rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs sm:text-sm text-warning flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <KeyRound className="size-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-base-content">
                  New device detected
                </span>
                <span className="text-base-content/75 text-xs">
                  Link with an existing verified device or enter your recovery
                  key to restore access to your messages.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setLinkModalMode("link");
                  setLinkModalOpen(true);
                }}
                className="btn btn-warning btn-sm font-semibold rounded-xl flex-1 sm:flex-none cursor-pointer"
              >
                Link Device
              </button>
              <button
                onClick={() => setRestoreModalOpen(true)}
                className="btn btn-outline btn-sm font-semibold rounded-xl flex-1 sm:flex-none cursor-pointer"
              >
                Enter Recovery Key
              </button>
            </div>
          </div>
        )}

        {/* Action Alert Banner for Not Configured */}
        {isNotConfigured && (
          <div className="mt-4 rounded-xl sm:rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs sm:text-sm text-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <Lock className="size-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-base-content">
                  Enable End-to-End Encryption
                </span>
                <span className="text-base-content/75 text-xs">
                  Protect your private chats. Set up zero-knowledge end-to-end
                  encryption on this device.
                </span>
              </div>
            </div>
            <button
              onClick={() => setSetupModalOpen(true)}
              className="btn btn-primary btn-sm font-semibold rounded-xl w-full sm:w-auto shrink-0 cursor-pointer"
            >
              Turn On Encryption
            </button>
          </div>
        )}

        {/* Action Alert Banner for Incoming Device Link Request */}
        {incomingLinkRequest && (
          <div className="mt-4 rounded-xl sm:rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs sm:text-sm text-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <Smartphone className="size-5 shrink-0 mt-0.5 text-primary" />
              <div>
                <span className="font-semibold block text-base-content">
                  New Device Requesting Authorization
                </span>
                <span className="text-base-content/75 text-xs">
                  A device named <strong>{incomingLinkRequest.newDeviceName || "New Device"}</strong> is asking to connect with code <strong>{incomingLinkRequest.linkingPin}</strong>.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setLinkModalMode("approve");
                  setLinkModalOpen(true);
                  setIncomingLinkRequest(null);
                }}
                className="btn btn-primary btn-sm font-semibold rounded-xl flex-1 sm:flex-none cursor-pointer"
              >
                Authorize Device
              </button>
              <button
                onClick={() => setIncomingLinkRequest(null)}
                className="btn btn-ghost btn-sm rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Action Alert Banner for Key Mismatch */}
        {isMismatch && (
          <div className="mt-4 rounded-xl sm:rounded-2xl border border-error/40 bg-error/10 p-4 text-xs sm:text-sm text-error flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <ShieldAlert className="size-5 shrink-0 mt-0.5 text-error" />
              <div>
                <span className="font-semibold block text-base-content">
                  Encryption Key Mismatch
                </span>
                <span className="text-base-content/75 text-xs">
                  This device's local encryption key differs from the verified identity registered on your account. Re-link this device or restore using your recovery key.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setLinkModalMode("link");
                  setLinkModalOpen(true);
                }}
                className="btn btn-error btn-sm font-semibold rounded-xl flex-1 sm:flex-none cursor-pointer text-white"
              >
                Link Device
              </button>
              <button
                onClick={() => setRestoreModalOpen(true)}
                className="btn btn-outline btn-sm font-semibold rounded-xl flex-1 sm:flex-none cursor-pointer"
              >
                Enter Recovery Key
              </button>
            </div>
          </div>
        )}

        {/* Action Alert Banner for Storage Error */}
        {isStorageError && (
          <div className="mt-4 rounded-xl sm:rounded-2xl border border-error/40 bg-error/10 p-4 text-xs sm:text-sm text-error flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="size-5 shrink-0 mt-0.5 text-error" />
              <div>
                <span className="font-semibold block text-base-content">
                  Secure Storage Inaccessible
                </span>
                <span className="text-base-content/75 text-xs">
                  Your browser's IndexedDB or secure key storage is blocked (e.g. strict private browsing or cookies disabled). Encryption requires local storage access.
                </span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="btn btn-outline btn-sm font-semibold rounded-xl w-full sm:w-auto shrink-0 cursor-pointer"
            >
              Retry Access
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CONNECTED DEVICES SECTION (Section B)
          Clean device cards with 3-dot menu, details modal, remove dialog.
      ───────────────────────────────────────────────────────────── */}
      {isReady && (
        <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-5 sm:p-6 shadow-sm transition-all hover:border-base-content/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-base-200">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-base-content tracking-tight">
                Your Connected Devices
              </h3>
              <p className="text-xs sm:text-sm text-base-content/65 mt-0.5">
                Manage the devices that can securely access your messages.
              </p>
            </div>

            <button
              onClick={() => {
                setLinkModalMode("link");
                setLinkModalOpen(true);
              }}
              className="btn btn-primary btn-sm rounded-xl gap-2 text-xs font-semibold self-start sm:self-auto cursor-pointer shadow-sm hover:shadow"
            >
              <QrCode className="size-3.5" />
              Link a New Device
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-base-content/60 px-1">
              <span>
                Registered Devices ({devices.length || 1})
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-base-content/50">
                  Synced {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {loadingDevices ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-base-content/50">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Loading your connected devices...</span>
              </div>
            ) : devices.length === 0 ? (
              // If device list returned empty, render current device card fallback
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-primary">
                    <Laptop className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-sm text-base-content break-words leading-snug">
                        This Device
                      </span>
                      <span className="badge badge-primary badge-xs font-medium">
                        Current Device
                      </span>
                      <span className="badge badge-success/15 text-success border-success/30 badge-xs font-semibold">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-base-content/55 mt-0.5 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active now
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {devices.map((dev) => {
                  const isCurrent = dev.deviceId === currentDeviceId;
                  const { Icon: DeviceIcon, label: platformLabel } =
                    getDeviceTypeInfo(dev.deviceName);
                  const formattedActive = formatLastActive(dev, isCurrent);

                  return (
                    <div
                      key={dev.deviceId}
                      className={`relative rounded-2xl border p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3.5 ${
                        isCurrent
                          ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                          : "border-base-300/70 bg-base-200/35 hover:bg-base-200/60"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Device Icon */}
                        <div
                          className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
                            isCurrent
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "bg-base-100 border-base-300 text-base-content/70"
                          }`}
                        >
                          <DeviceIcon className="size-5" />
                        </div>

                        {/* Device Information */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-xs sm:text-sm text-base-content break-words leading-snug">
                              {dev.deviceName || platformLabel}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 shrink-0">
                                <span className="size-1.5 rounded-full bg-primary" />
                                Current Device
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Check className="size-3" />
                              Verified
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-base-content/55 mt-1">
                            <span className="break-words">{parseDeviceDetails(dev.deviceName)}</span>
                            <span className="inline-flex items-center gap-1 shrink-0">
                              {isCurrent ? (
                                <>
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {formattedActive}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Clock className="size-3 text-base-content/40" />
                                  <span>{formattedActive}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Three-Dot Action Menu */}
                      <div
                        className="relative shrink-0"
                        data-device-menu={dev.deviceId}
                      >
                        <button
                          onClick={() =>
                            setOpenMenuDeviceId(
                              openMenuDeviceId === dev.deviceId
                                ? null
                                : dev.deviceId,
                            )
                          }
                          className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content hover:bg-base-300/60 cursor-pointer"
                          title="Device actions"
                          aria-label="Device actions"
                        >
                          <MoreVertical className="size-4" />
                        </button>

                        {openMenuDeviceId === dev.deviceId && (
                          <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => {
                                setOpenMenuDeviceId(null);
                                setDetailsModalDevice(dev);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-base-content hover:bg-base-200 transition-colors cursor-pointer text-left"
                            >
                              <Info className="size-3.5 text-base-content/60" />
                              View Device Details
                            </button>

                            {!isCurrent ? (
                              <button
                                onClick={() => {
                                  setOpenMenuDeviceId(null);
                                  setRevokeConfirmDevice(dev);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-error hover:bg-error/10 transition-colors cursor-pointer text-left"
                              >
                                <Trash2 className="size-3.5" />
                                Remove Device
                              </button>
                            ) : (
                              <div className="px-2.5 py-1.5 text-[10px] text-base-content/45 italic border-t border-base-200/60 mt-1">
                                Current active session
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ENCRYPTION RECOVERY (Section D)
          Replaces Multi-Device Key Backup without crypto jargon.
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-5 sm:p-6 shadow-sm transition-all hover:border-base-content/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary">
              <FileKey className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-base-content tracking-tight">
                  Encryption Recovery
                </h3>
                {pendingRecoveryOnboarding ? (
                  <span className="badge badge-warning badge-xs font-semibold">
                    Action Required
                  </span>
                ) : serverStatus?.hasBackup ? (
                  <span className="badge badge-success badge-xs font-semibold">
                    Protected
                  </span>
                ) : (
                  <span className="badge badge-neutral badge-xs font-semibold">
                    Not Set Up
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-base-content/65 mt-0.5">
                Keep a secure recovery option so you can restore access to your
                encrypted messages when needed.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs sm:text-sm leading-relaxed text-base-content/70">
            Your encryption recovery allows you to regain access to your
            messages if you switch devices or clear browser data. Your recovery
            data is encrypted with zero-knowledge protection so only you can
            unlock it.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {isReady && (
              <>
                <button
                  onClick={() => setRecoveryModalOpen(true)}
                  className="btn btn-outline btn-sm min-h-[42px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
                >
                  <ShieldCheck className="size-3.5 text-primary" />
                  View Recovery Key
                </button>
                <button
                  onClick={() => setChangePassModalOpen(true)}
                  className="btn btn-outline btn-sm min-h-[42px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
                >
                  <Key className="size-3.5" />
                  Change Recovery Password
                </button>
              </>
            )}

            {isRestoreRequired && (
              <button
                onClick={() => setRestoreModalOpen(true)}
                className="btn btn-warning btn-sm min-h-[42px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                Restore from Backup
              </button>
            )}

            {isNotConfigured && (
              <button
                onClick={() => setSetupModalOpen(true)}
                className="btn btn-primary btn-sm min-h-[42px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
              >
                <Lock className="size-3.5" />
                Set Up Recovery Backup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ADVANCED SECURITY DETAILS (Section E)
          Collapsible accordion housing all technical cryptographic specs.
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 overflow-hidden shadow-sm transition-all hover:border-base-content/20">
        <button
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-base-200/40 transition-colors cursor-pointer"
          aria-expanded={isAdvancedOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-base-content/70">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-base-content">
                Advanced Security Details
              </h3>
              <p className="text-xs text-base-content/60">
                Technical specifications and cryptographic architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[11px] font-medium text-base-content/50 uppercase tracking-wider">
              {isAdvancedOpen ? "Hide Details" : "View Details"}
            </span>
            <div
              className={`p-1.5 rounded-lg bg-base-200 text-base-content/70 transition-transform duration-200 ${
                isAdvancedOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="size-4" />
            </div>
          </div>
        </button>

        {isAdvancedOpen && (
          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-base-200 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Cryptographic Suite
                </span>
                <span className="font-semibold text-base-content font-mono block">
                  ECDH P-256 + AES-GCM-256
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  NIST P-256 key exchange with authenticated Galois/Counter Mode
                  encryption.
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Key Storage
                </span>
                <span className="font-semibold text-base-content block">
                  {getKeyStorageLabel()}
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  Private keys are marked non-extractable and cannot be exported
                  by scripts.
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Public Key Registration
                </span>
                <span className="font-semibold text-base-content block">
                  {serverStatus?.hasPublicKey || serverStatus?.hasKey
                    ? "Registered & Verified"
                    : "Not Registered"}
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  {serverStatus?.publicKeyUpdatedAt
                    ? `Verified on ${new Date(serverStatus.publicKeyUpdatedAt).toLocaleDateString()}`
                    : "Published for asynchronous recipient key exchange."}
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Backup Encryption Algorithm
                </span>
                <span className="font-semibold text-base-content font-mono block">
                  PBKDF2-SHA256 (600,000 iter)
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  Zero-knowledge client-side encryption. The server cannot read
                  your keys.
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Key Derivation (KDF)
                </span>
                <span className="font-semibold text-base-content font-mono block">
                  HMAC-SHA256 HKDF / PBKDF2
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  Cryptographic key stretching with unique salts prevents
                  rainbow-table attacks.
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/50">
                <span className="text-base-content/60 block mb-1 font-medium">
                  Device Security Information
                </span>
                <span className="font-semibold text-base-content block">
                  Safety Fingerprints Verified
                </span>
                <span className="text-[11px] text-base-content/50 mt-1 block">
                  Each linked device has an independent cryptographic identity
                  and safety number.
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-base-200/30 p-3 text-xs text-base-content/65 border border-base-300/40 flex items-start gap-2.5">
              <ShieldAlert className="size-4 shrink-0 text-base-content/50 mt-0.5" />
              <span>
                Chatty implements standard W3C Web Cryptography APIs. Your
                private encryption keys are generated locally in your browser
                and are never transmitted unencrypted.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DANGER ZONE — RESET ENCRYPTION (Section F)
          Compact warning card with confirmation safeguard.
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl sm:rounded-3xl border border-error/25 bg-error/[0.02] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-3.5 border-b border-error/15">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-error">
              Danger Zone: Reset Encryption
            </h3>
            <p className="text-xs text-base-content/60">
              Permanently revoke cryptographic keys and start fresh
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs sm:text-sm leading-relaxed text-base-content/70">
            If you have permanently lost your recovery passphrase or suspect
            your key was compromised, you can reset your encryption identity.
            <span className="font-semibold text-error block mt-1">
              Warning: Resetting your encryption identity may permanently affect
              your ability to access previously encrypted messages.
            </span>
          </p>

          <div className="pt-1">
            <button
              onClick={() => setResetModalOpen(true)}
              className="btn btn-error btn-outline btn-sm min-h-[42px] sm:min-h-[36px] rounded-xl gap-2 text-xs font-semibold w-full sm:w-auto cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Reset Encryption Identity
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW DEVICE DETAILS
      ───────────────────────────────────────────────────────────── */}
      {detailsModalDevice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-base-content/15 bg-base-100 shadow-2xl transition-all overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-details-title"
          >
            {/* Pinned Header */}
            <div className="flex items-center justify-between border-b border-base-content/10 px-5 sm:px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {getDeviceTypeInfo(detailsModalDevice.deviceName).Icon({
                    className: "size-5",
                  })}
                </div>
                <div>
                  <h3 id="device-details-title" className="text-base font-bold text-base-content">
                    Device Details
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Cryptographic identity and connection information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalDevice(null)}
                className="rounded-lg p-1.5 text-base-content/50 hover:bg-base-200 hover:text-base-content cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 flex-1 text-xs">
              <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/40">
                <span className="text-base-content/60 block mb-0.5">
                  Device Name
                </span>
                <span className="font-semibold text-sm text-base-content break-words leading-snug">
                  {detailsModalDevice.deviceName || "Chatty Device"}
                </span>
                <span className="block text-[11px] text-base-content/50 mt-0.5 break-words">
                  {parseDeviceDetails(detailsModalDevice.deviceName)}
                </span>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/40">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-base-content/60 font-medium">
                    Device Identifier (ID)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        detailsModalDevice.deviceId || "",
                      );
                      setCopiedDeviceId(true);
                      customToast.success("Device ID copied!");
                      setTimeout(() => setCopiedDeviceId(false), 2000);
                    }}
                    className="btn btn-ghost btn-xs gap-1 text-[11px] text-primary cursor-pointer h-6 min-h-0 px-2"
                  >
                    {copiedDeviceId ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedDeviceId ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-base-content/80 break-all bg-base-100/70 p-2 rounded-lg border border-base-300/50 select-all">
                  {detailsModalDevice.deviceId}
                </div>
              </div>

              <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/40">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-base-content/60 font-medium">
                    Safety Number (Fingerprint)
                  </span>
                  <button
                    onClick={() => {
                      const fp =
                        deviceFingerprints[detailsModalDevice.deviceId] || "";
                      navigator.clipboard.writeText(fp);
                      setCopiedSafetyNumber(true);
                      customToast.success("Safety number copied!");
                      setTimeout(() => setCopiedSafetyNumber(false), 2000);
                    }}
                    className="btn btn-ghost btn-xs gap-1 text-[11px] text-primary cursor-pointer h-6 min-h-0 px-2"
                  >
                    {copiedSafetyNumber ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedSafetyNumber ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-xs text-base-content font-semibold tracking-wider break-all bg-base-100/70 p-2.5 rounded-lg border border-base-300/50 select-all leading-relaxed">
                  {formatFingerprint(
                    deviceFingerprints[detailsModalDevice.deviceId],
                  )}
                </div>
                <span className="text-[10px] text-base-content/50 block mt-1.5 leading-relaxed">
                  Compare this safety number with the safety number displayed on
                  your other device to verify cryptographic authenticity.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/40">
                  <span className="text-base-content/60 block mb-0.5">
                    Registered On
                  </span>
                  <span className="font-semibold text-base-content break-words">
                    {formatDeviceDate(
                      detailsModalDevice.createdAt ||
                        detailsModalDevice.registeredAt,
                    )}
                  </span>
                </div>
                <div className="rounded-xl bg-base-200/50 p-3 border border-base-300/40">
                  <span className="text-base-content/60 block mb-0.5">
                    Last Active
                  </span>
                  <span className="font-semibold text-base-content break-words">
                    {detailsModalDevice.deviceId === currentDeviceId
                      ? "Active now"
                      : formatDeviceDate(detailsModalDevice.lastActiveAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-5 sm:px-6 py-3.5 border-t border-base-content/10 shrink-0">
              {detailsModalDevice.deviceId !== currentDeviceId ? (
                <button
                  onClick={() => {
                    const targetDev = detailsModalDevice;
                    setDetailsModalDevice(null);
                    setRevokeConfirmDevice(targetDev);
                  }}
                  className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] btn btn-error btn-sm btn-outline rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Remove Device
                </button>
              ) : (
                <span className="text-xs text-base-content/50 italic py-1 text-center sm:text-left">
                  Current active device
                </span>
              )}

              <button
                onClick={() => setDetailsModalDevice(null)}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] btn btn-ghost btn-sm rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REMOVE DEVICE CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────── */}
      {revokeConfirmDevice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-base-content/15 bg-base-100 shadow-2xl transition-all overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-device-title"
          >
            {/* Pinned Header */}
            <div className="flex items-center gap-3.5 px-5 sm:px-6 py-4 border-b border-base-content/10 shrink-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-error/10 border border-error/20 text-error">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 id="revoke-device-title" className="text-base font-bold text-base-content">
                  Remove Device?
                </h3>
                <p className="text-xs text-base-content/60">
                  This action stops future message synchronization.
                </p>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-3 flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-base-200/50 border border-base-300/50 space-y-2 text-xs">
                <p className="text-base-content/80 leading-relaxed break-words">
                  Are you sure you want to remove{" "}
                  <strong className="text-base-content">
                    "{revokeConfirmDevice.deviceName || revokeConfirmDevice.deviceId}"
                  </strong>
                  ?
                </p>
                <p className="text-base-content/60 leading-relaxed text-[11px]">
                  This device will immediately stop receiving future encrypted
                  messages. Previously downloaded messages on that physical device
                  cannot be remotely erased.
                </p>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-base-content/10 shrink-0">
              <button
                onClick={() => setRevokeConfirmDevice(null)}
                disabled={revoking}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] btn btn-ghost btn-sm rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={revoking}
                className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] btn btn-error btn-sm rounded-xl gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
              >
                {revoking ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Remove Device
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EXISTING MODALS (REUSED & INTEGRATED)
      ───────────────────────────────────────────────────────────── */}
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
      <E2EERecoveryKeyModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        isOnboarding={pendingRecoveryOnboarding}
      />
    </div>
  );
}

export default E2EESettingsSection;
