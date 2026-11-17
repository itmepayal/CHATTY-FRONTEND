import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lock,
  ShieldCheck,
  Delete,
  Loader2,
  Fingerprint,
  LockKeyhole,
} from "lucide-react";
import { useAppLockStore } from "../../../store/useAppLockStore";
import { useAuthStore } from "../../../store/useAuthStore";
import SettingsSegmented from "../common/SettingsSegmented";
import SettingsToggle from "../common/SettingsToggle";
import { customToast as toast } from "../../toast/customToastService";

const TIMEOUT_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 mins" },
  { value: "15m", label: "15 mins" },
  { value: "1h", label: "1 hour" },
];

export default function AppLockModal({ isOpen, onClose }) {
  const { authUser } = useAuthStore();
  const {
    isConfigured,
    autoLockDuration,
    biometricsEnabled,
    biometricsSupported,
    setupPin,
    changePin,
    disablePin,
    updateAutoLockDuration,
    toggleBiometrics,
    lockNow,
    unlock,
  } = useAppLockStore();

  // Mode: "VIEW" | "ENTER_NEW" | "CONFIRM_NEW" | "VERIFY_FOR_CHANGE" | "VERIFY_FOR_DISABLE"
  const [mode, setMode] = useState("VIEW");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [currentVerifiedPin, setCurrentVerifiedPin] = useState("");
  const [timeout, setTimeoutVal] = useState(autoLockDuration || "immediately");
  const [saving, setSaving] = useState(false);
  const [errorShake, setErrorShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(isConfigured ? "VIEW" : "ENTER_NEW");
      setPin("");
      setFirstPin("");
      setCurrentVerifiedPin("");
      setTimeoutVal(autoLockDuration || "immediately");
    }
  }, [isOpen, isConfigured, autoLockDuration]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen || mode === "VIEW") return;

    const handleKeyDown = (e) => {
      if (saving) return;
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mode, pin, saving]);

  if (!isOpen) return null;

  const triggerError = () => {
    setErrorShake(true);
    setPin("");
    setTimeout(() => setErrorShake(false), 450);
  };

  const handleDigit = async (digit) => {
    if (saving || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      if (mode === "ENTER_NEW") {
        setFirstPin(nextPin);
        setPin("");
        setMode("CONFIRM_NEW");
      } else if (mode === "CONFIRM_NEW") {
        if (nextPin !== firstPin) {
          toast.error("PINs do not match. Try again.");
          triggerError();
          setMode("ENTER_NEW");
          setFirstPin("");
        } else {
          setSaving(true);
          let ok = false;
          if (currentVerifiedPin) {
            ok = await changePin(currentVerifiedPin, nextPin);
          } else {
            ok = await setupPin(nextPin, timeout);
          }
          setSaving(false);
          if (ok) {
            onClose();
          } else {
            triggerError();
          }
        }
      } else if (mode === "VERIFY_FOR_DISABLE") {
        setSaving(true);
        const ok = await disablePin(nextPin);
        setSaving(false);
        if (ok) {
          onClose();
        } else {
          triggerError();
        }
      } else if (mode === "VERIFY_FOR_CHANGE") {
        setSaving(true);
        const valid = await unlock(nextPin);
        setSaving(false);
        if (valid) {
          setCurrentVerifiedPin(nextPin);
          setPin("");
          setMode("ENTER_NEW");
        } else {
          triggerError();
        }
      }
    }
  };

  const handleBackspace = () => {
    if (saving) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleTimeoutChange = async (val) => {
    setTimeoutVal(val);
    await updateAutoLockDuration(val);
  };

  const handleBiometricsToggle = async (val) => {
    await toggleBiometrics(val, authUser?.email);
  };

  const handleLockNowClick = () => {
    onClose();
    setTimeout(() => {
      lockNow();
    }, 150);
  };

  const getHeading = () => {
    if (mode === "VIEW") return "App Lock";
    if (mode === "ENTER_NEW") return currentVerifiedPin ? "Enter New PIN" : "Enter a 4-Digit PIN";
    if (mode === "CONFIRM_NEW") return "Confirm Your PIN";
    if (mode === "VERIFY_FOR_CHANGE") return "Enter Current PIN";
    if (mode === "VERIFY_FOR_DISABLE") return "Enter PIN to Disable";
    return "App Lock";
  };

  const getSubheading = () => {
    if (mode === "VIEW") return "Require PIN code to unlock Chatty.";
    if (mode === "ENTER_NEW") return "Choose a 4-digit PIN you will remember.";
    if (mode === "CONFIRM_NEW") return "Re-enter the 4-digit PIN to confirm.";
    if (mode === "VERIFY_FOR_CHANGE") return "Enter your current PIN to change it.";
    if (mode === "VERIFY_FOR_DISABLE") return "Enter your current PIN to disable app lock.";
    return "";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base-200/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <h3 className="font-semibold text-base text-base-content">
                {getHeading()}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200/60 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5">
            <p className="text-xs text-base-content/60 text-center">
              {getSubheading()}
            </p>

            {mode === "VIEW" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-success/15 text-success flex items-center justify-center">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-base-content">
                        PIN Protection Active
                      </p>
                      <p className="text-xs text-base-content/60">
                        4-digit lock code configured
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLockNowClick}
                    className="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Lock now"
                  >
                    <LockKeyhole className="size-3.5" />
                    <span>Lock Now</span>
                  </button>
                </div>

                {/* Auto Lock Timeout */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-base-content">
                    Automatically Lock
                  </span>
                  <SettingsSegmented
                    label="Auto Lock Timeout"
                    value={timeout}
                    options={TIMEOUT_OPTIONS}
                    onChange={handleTimeoutChange}
                    fullWidth
                  />
                </div>

                {/* Biometrics Toggle if supported */}
                {biometricsSupported && (
                  <div className="p-3 rounded-2xl bg-base-200/40 border border-base-300/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Fingerprint className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-base-content">
                          Biometric Unlock
                        </p>
                        <p className="text-[11px] text-base-content/60">
                          Use Touch ID / Windows Hello
                        </p>
                      </div>
                    </div>
                    <SettingsToggle
                      checked={biometricsEnabled}
                      onChange={handleBiometricsToggle}
                      label="Biometrics"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPin("");
                      setMode("VERIFY_FOR_CHANGE");
                    }}
                    className="w-full py-2.5 text-xs font-semibold rounded-xl bg-base-200 hover:bg-base-300 text-base-content transition-colors"
                  >
                    Change PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPin("");
                      setMode("VERIFY_FOR_DISABLE");
                    }}
                    className="w-full py-2.5 text-xs font-semibold rounded-xl text-error hover:bg-error/10 transition-colors"
                  >
                    Disable App Lock
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 4 dots */}
                <motion.div
                  animate={errorShake ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center gap-4 py-2"
                >
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`size-4 rounded-full border-2 transition-all ${
                          isFilled
                            ? "bg-primary border-primary scale-110"
                            : "border-base-300 bg-base-200/50"
                        }`}
                      />
                    );
                  })}
                </motion.div>

                {saving && (
                  <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying…</span>
                  </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto select-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={saving}
                      onClick={() => handleDigit(String(num))}
                      className="size-14 rounded-2xl bg-base-200/70 hover:bg-base-200 active:scale-95 text-lg font-semibold text-base-content transition-transform flex items-center justify-center shadow-xs"
                    >
                      {num}
                    </button>
                  ))}
                  <div />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDigit("0")}
                    className="size-14 rounded-2xl bg-base-200/70 hover:bg-base-200 active:scale-95 text-lg font-semibold text-base-content transition-transform flex items-center justify-center shadow-xs"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={saving || pin.length === 0}
                    onClick={handleBackspace}
                    className="size-14 rounded-2xl hover:bg-base-200/60 active:scale-95 text-base-content/70 hover:text-base-content transition-transform flex items-center justify-center"
                  >
                    <Delete className="size-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
