import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Delete, Loader2 } from "lucide-react";
import { useChatLockStore } from "../../../store/useChatLockStore";
import { customToast as toast } from "../../toast/customToastService";

export default function ChatUnlockModal({ onUnlocked }) {
  const { activeLockModalChatId, closeUnlockModal, unlockChatWithPin } =
    useChatLockStore();

  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  const isOpen = Boolean(activeLockModalChatId);

  useEffect(() => {
    if (!isOpen) {
      setPin("");
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin, verifying]);

  if (!isOpen) return null;

  const handleDigit = async (digit) => {
    if (verifying || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setVerifying(true);
      const ok = await unlockChatWithPin(activeLockModalChatId, nextPin);
      setVerifying(false);
      if (ok) {
        setPin("");
        if (onUnlocked) onUnlocked(activeLockModalChatId);
      } else {
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
    if (verifying) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xs overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl flex flex-col p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base text-base-content">
                Locked Chat
              </h3>
            </div>
            <button
              type="button"
              onClick={closeUnlockModal}
              disabled={verifying}
              className="p-1 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-xs text-base-content/60 text-center mb-4">
            Enter your 4-digit PIN to open this conversation
          </p>

          {/* Dots */}
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-3.5 py-1 mb-4"
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`size-3.5 rounded-full border-2 transition-all ${
                    isFilled
                      ? "bg-primary border-primary scale-110"
                      : "border-base-300 bg-base-200/50"
                  }`}
                />
              );
            })}
          </motion.div>

          {verifying ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium h-4 mb-2">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Unlocking…</span>
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
                disabled={verifying}
                onClick={() => handleDigit(String(num))}
                className="size-12 rounded-xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-base font-semibold text-base-content transition-transform flex items-center justify-center border border-base-300/40"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleDigit("0")}
              className="size-12 rounded-xl bg-base-200/80 hover:bg-base-200 active:scale-95 text-base font-semibold text-base-content transition-transform flex items-center justify-center border border-base-300/40"
            >
              0
            </button>
            <button
              type="button"
              disabled={verifying || pin.length === 0}
              onClick={handleBackspace}
              className="size-12 rounded-xl hover:bg-base-200/60 active:scale-95 text-base-content/70 hover:text-base-content transition-transform flex items-center justify-center"
            >
              <Delete className="size-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
