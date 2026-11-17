import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock, Loader2, X, Delete } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Section } from "./UserInfoUI.jsx";
import { useChatLockStore } from "../../../store/useChatLockStore.js";
import { useAppLockStore } from "../../../store/useAppLockStore.js";
import { usePrivacyStore } from "../../../store/usePrivacyStore.js";
import { customToast as toast } from "../../toast/customToastService.js";

export const VerifyPinModal = ({ open, onClose, onVerify, loading }) => {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setShake(false);
      return;
    }

    const onKey = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pin, loading]);

  if (!open) return null;

  const handleDigit = async (d) => {
    if (loading || pin.length >= 4) return;
    const nextPin = pin + d;
    setPin(nextPin);

    if (nextPin.length === 4) {
      const ok = await onVerify(nextPin);
      if (!ok) {
        setShake(true);
        toast.error("Incorrect PIN");
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 400);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            <h3 className="font-semibold text-sm text-base-content">
              Unlock Conversation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-base-content/60 text-center mb-4">
          Enter your 4-digit PIN to remove conversation lock
        </p>

        {/* Pin Dots */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center gap-3.5 py-1 mb-4"
        >
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`size-3.5 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? "bg-primary border-primary scale-110"
                  : "border-base-300 bg-base-200/50"
              }`}
            />
          ))}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium h-4 mb-2">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Verifying…</span>
          </div>
        ) : (
          <div className="h-4 mb-2" />
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[210px] mx-auto select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => handleDigit(String(num))}
              className="size-12 rounded-xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-base font-semibold text-base-content transition-transform flex items-center justify-center border border-base-300/40"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDigit("0")}
            className="size-12 rounded-xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-base font-semibold text-base-content transition-transform flex items-center justify-center border border-base-300/40"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleBackspace}
            className="size-12 rounded-xl hover:bg-base-200/60 active:scale-95 text-base-content/70 hover:text-base-content transition-transform flex items-center justify-center"
          >
            <Delete className="size-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const UserInfoPrivacySection = ({ selectedId }) => {
  const toggleLock = useChatLockStore((s) => s.toggleLock);
  const disableLockWithPin = useChatLockStore((s) => s.disableLockWithPin);
  const isAppLockConfigured =
    useAppLockStore((s) => s.isConfigured) ||
    usePrivacyStore((s) => Boolean(s.privacy?.appLockEnabled));

  // Single reliable source of truth for the selected conversation's lock status
  const isChatLocked = usePrivacyStore((s) => {
    if (!selectedId) return false;
    const lockedList = (s.privacy?.lockedChats || []).map(String);
    return lockedList.includes(String(selectedId));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleToggleClick = async (e) => {
    e.stopPropagation();
    if (isSaving) return;

    if (isChatLocked) {
      // Disabling lock: require PIN authorization if App Lock is configured
      if (isAppLockConfigured) {
        setShowAuthModal(true);
        return;
      }
      // If no App Lock PIN configured, toggle directly
      setIsSaving(true);
      await toggleLock(selectedId);
      setIsSaving(false);
    } else {
      // Enabling lock
      setIsSaving(true);
      await toggleLock(selectedId);
      setIsSaving(false);
    }
  };

  const handleVerifyDisable = async (enteredPin) => {
    setIsSaving(true);
    const ok = await disableLockWithPin(selectedId, enteredPin);
    setIsSaving(false);
    if (ok) {
      setShowAuthModal(false);
      return true;
    }
    return false;
  };

  return (
    <>
      <Section title="Privacy & Security">
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-300/40"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="size-4 text-primary" />
            <div>
              <p className="text-xs font-semibold text-base-content">
                Lock Conversation
              </p>
              <p className="text-[11px] text-base-content/60">
                Require PIN to open this chat
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isSaving && (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            )}
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={Boolean(isChatLocked)}
              disabled={isSaving}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleClick(e);
              }}
              onChange={(e) => {
                e.stopPropagation();
              }}
              aria-label="Toggle Lock Conversation"
            />
          </div>
        </div>
      </Section>

      <VerifyPinModal
        open={showAuthModal}
        loading={isSaving}
        onClose={() => setShowAuthModal(false)}
        onVerify={handleVerifyDisable}
      />
    </>
  );
};
