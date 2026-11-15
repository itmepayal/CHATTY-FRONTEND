import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import CustomToastIcon from "./CustomToastIcon";
import CustomToastProgress from "./CustomToastProgress";
import CustomToastActions from "./CustomToastActions";

const TOAST_VARIANTS = {
  success: {
    border: "border-l-4 border-l-success",
    role: "status",
    defaultTitle: "Success",
  },
  error: {
    border: "border-l-4 border-l-error",
    role: "alert",
    defaultTitle: "Error",
  },
  warning: {
    border: "border-l-4 border-l-warning",
    role: "alert",
    defaultTitle: "Warning",
  },
  info: {
    border: "border-l-4 border-l-info",
    role: "status",
    defaultTitle: "Information",
  },
  loading: {
    border: "border-l-4 border-l-primary",
    role: "status",
    defaultTitle: "Loading",
  },
};

export const CustomToast = ({
  toast,
  onDismiss,
  onPause,
  onResume,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const config = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info;
  const isDismissible = toast.dismissible !== false;
  const hasCustomRender = typeof toast.render === "function";

  const handleMouseEnter = () => {
    setIsHovered(true);
    onPause?.(toast.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onResume?.(toast.id);
  };

  const handleDismiss = () => {
    onDismiss?.(toast.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -10, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={config.role}
      aria-live="polite"
      className={`pointer-events-auto relative w-full sm:max-w-md overflow-hidden rounded-xl border border-base-300 bg-base-100/95 p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl select-none ${config.border}`}
    >
      <div className="flex items-start gap-3">
        {/* Semantic Icon */}
        <CustomToastIcon type={toast.type} />

        {/* Content Body */}
        <div className="min-w-0 flex-1 pt-0.5">
          {hasCustomRender ? (
            toast.render(toast)
          ) : (
            <>
              {toast.title && (
                <h4 className="truncate text-xs sm:text-sm font-bold tracking-tight text-base-content/95">
                  {toast.title}
                </h4>
              )}

              {toast.message && (
                <p
                  className={`text-xs sm:text-sm text-base-content/80 leading-relaxed break-words ${
                    toast.title ? "mt-0.5" : "font-medium"
                  }`}
                >
                  {toast.message}
                </p>
              )}

              {toast.action && (
                <CustomToastActions
                  action={toast.action}
                  onDismiss={handleDismiss}
                />
              )}
            </>
          )}
        </div>

        {/* Close Button */}
        {isDismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content active:scale-95 -mr-1 -mt-1"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Countdown Progress Bar */}
      {toast.duration !== Infinity && (
        <CustomToastProgress
          duration={toast.duration}
          isPaused={isHovered}
          type={toast.type}
        />
      )}
    </motion.div>
  );
};

export default CustomToast;
