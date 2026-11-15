import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { customToastService } from "./customToastService";
import CustomToast from "./CustomToast";

/**
 * CustomToastContainer
 * Global floating notification container positioned in top-right with mobile-safe containment.
 */
export const CustomToastContainer = ({ position = "top-right", className = "" }) => {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = customToastService.subscribe((list) => {
      setToasts(list);
    });
    return unsubscribe;
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      role="region"
      aria-label="Notifications"
      className={`pointer-events-none fixed z-[1080] flex flex-col gap-2.5 max-h-screen overflow-hidden p-3 sm:p-4 transition-all duration-200 ${
        position === "top-right"
          ? "top-0 right-0 left-0 sm:left-auto sm:w-[420px]"
          : "top-0 inset-x-0 items-center"
      } ${className}`}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <CustomToast
            key={toast.id}
            toast={toast}
            onDismiss={(id) => customToastService.dismiss(id)}
            onPause={(id) => customToastService.pause(id)}
            onResume={(id) => customToastService.resume(id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default CustomToastContainer;
