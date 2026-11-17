import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Delete,
  Loader2,
  Fingerprint,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  X,
} from "lucide-react";
import { useAppLockStore } from "../../../store/useAppLockStore";
import { customToast as toast } from "../../toast/customToastService";

export default function AppLockScreen() {
  const {
    isLocked,
    isConfigured,
    unlock,
    unlockWithBiometrics,
    biometricsEnabled,
    biometricsSupported,
    remainingCooldownSeconds,
    recoverWithPassword,
  } = useAppLockStore();

  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  // Recovery modal state
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const isLockedOut = remainingCooldownSeconds > 0;

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked || !isConfigured || recoveryOpen) return;

    const handleKeyDown = (e) => {
      if (isLockedOut || verifying) return;
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, isConfigured, pin, verifying, isLockedOut, recoveryOpen]);

  // Attempt biometric unlock on initial mount if enabled
  useEffect(() => {
    if (isLocked && isConfigured && biometricsEnabled && !isLockedOut) {
      unlockWithBiometrics().catch(() => {});
    }
  }, [isLocked, isConfigured, biometricsEnabled, isLockedOut]);

  if (!isLocked || !isConfigured) return null;

  const handleDigit = async (digit) => {
    if (verifying || isLockedOut || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setVerifying(true);
      const success = await unlock(nextPin);
      setVerifying(false);
      if (!success) {
        setShake(true);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 450);
      } else {
        setPin("");
      }
    }
  };

  const handleBackspace = () => {
    if (verifying || isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handlePasswordRecovery = async (e) => {
    e?.preventDefault();
    if (!recoveryPassword.trim() || recovering) return;

    setRecovering(true);
    const ok = await recoverWithPassword(recoveryPassword);
    setRecovering(false);

    if (ok) {
      setRecoveryOpen(false);
      setRecoveryPassword("");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-base-100/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none"
      >
        <div className="w-full max-w-xs flex flex-col items-center text-center space-y-6">
          {/* Logo / Shield */}
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
            <Lock className="size-8 stroke-[2.2]" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-base-content tracking-tight">
              Chatty is Locked
            </h2>
            <p className="text-xs text-base-content/60 mt-1 max-w-[260px]">
              {isLockedOut
                ? "Temporarily locked due to repeated incorrect entries"
                : "Enter your 4-digit PIN to access your conversations"}
            </p>
          </div>

          {/* Dots Indicator */}
          <motion.div
            animate={shake ? { x: [-14, 14, -14, 14, 0] } : {}}
            transition={{ duration: 0.35 }}
            className="flex items-center justify-center gap-4 py-2"
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`size-4 rounded-full border-2 transition-all duration-150 ${
                    isFilled
                      ? "bg-primary border-primary scale-110 shadow-sm"
                      : "border-base-300 bg-base-200/50"
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Status / Cooldown Notice */}
          <div className="min-h-6 flex items-center justify-center">
            {isLockedOut ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error/15 text-error text-xs font-semibold">
                <AlertCircle className="size-3.5" />
                <span>Try again in {remainingCooldownSeconds}s</span>
              </div>
            ) : verifying ? (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="size-4 animate-spin" />
                <span>Verifying PIN…</span>
              </div>
            ) : null}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                disabled={verifying || isLockedOut}
                onClick={() => handleDigit(String(num))}
                className="size-14 rounded-2xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-lg font-semibold text-base-content transition-transform flex items-center justify-center shadow-xs border border-base-300/40 disabled:opacity-40 disabled:pointer-events-none"
              >
                {num}
              </button>
            ))}

            {/* Bottom Row: Biometrics or Empty, 0, Backspace */}
            {biometricsEnabled && biometricsSupported ? (
              <button
                type="button"
                disabled={verifying || isLockedOut}
                onClick={() => unlockWithBiometrics()}
                className="size-14 rounded-2xl hover:bg-primary/10 text-primary active:scale-95 transition-transform flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                title="Unlock with Biometrics"
              >
                <Fingerprint className="size-6 stroke-[2]" />
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={verifying || isLockedOut}
              onClick={() => handleDigit("0")}
              className="size-14 rounded-2xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-lg font-semibold text-base-content transition-transform flex items-center justify-center shadow-xs border border-base-300/40 disabled:opacity-40 disabled:pointer-events-none"
            >
              0
            </button>

            <button
              type="button"
              disabled={verifying || isLockedOut || pin.length === 0}
              onClick={handleBackspace}
              className="size-14 rounded-2xl hover:bg-base-200/60 active:scale-95 text-base-content/70 hover:text-base-content transition-transform flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
              title="Delete"
            >
              <Delete className="size-5" />
            </button>
          </div>

          {/* Recovery Options Footer */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRecoveryOpen(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot PIN?
            </button>
          </div>
        </div>

        {/* Account Password Recovery Modal */}
        {recoveryOpen && (
          <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-base-100 border border-base-300 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <KeyRound className="size-4" />
                  </div>
                  <h3 className="font-semibold text-base text-base-content">
                    Reset App Lock
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(false)}
                  disabled={recovering}
                  className="p-1 rounded-lg text-base-content/60 hover:text-base-content"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-base-content/70 leading-relaxed">
                Enter your account password to verify your identity and remove the App Lock PIN on this device.
              </p>

              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    placeholder="Account password"
                    autoFocus
                    required
                    disabled={recovering}
                    className="w-full h-11 px-3.5 pr-10 text-sm rounded-xl border border-base-300 bg-base-200/50 focus:border-primary focus:bg-base-100 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-3 text-base-content/50 hover:text-base-content"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    disabled={recovering}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-base-200 hover:bg-base-300 text-base-content transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recovering || !recoveryPassword.trim()}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-content transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {recovering ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Reset PIN</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
