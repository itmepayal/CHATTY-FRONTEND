import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const ALERT_CONFIG = {
  error: {
    container: "bg-error/10 text-error border-error/25",
    icon: AlertCircle,
    role: "alert",
  },
  success: {
    container: "bg-success/10 text-success border-success/25",
    icon: CheckCircle2,
    role: "status",
  },
  warning: {
    container: "bg-warning/10 text-warning border-warning/25",
    icon: AlertTriangle,
    role: "alert",
  },
  info: {
    container: "bg-info/10 text-info border-info/25",
    icon: Info,
    role: "status",
  },
};

export const AlertMessage = ({
  variant = "info",
  title,
  message,
  children,
  dismissible = false,
  onDismiss,
  className = "",
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = ALERT_CONFIG[variant] || ALERT_CONFIG.info;
  const Icon = config.icon;
  const textContent = message || children;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role={config.role}
      aria-live="polite"
      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border text-sm leading-relaxed transition-all duration-200 animate-fadeIn ${config.container} ${className}`}
    >
      <Icon className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0 [overflow-wrap:anywhere]">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div className="text-xs sm:text-sm opacity-90">{textContent}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100 hover:bg-black/10 transition-opacity"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export const ErrorMessage = ({ message, children, onDismiss, className = "", ...props }) => (
  <AlertMessage
    variant="error"
    message={message}
    dismissible={Boolean(onDismiss)}
    onDismiss={onDismiss}
    className={className}
    {...props}
  >
    {children}
  </AlertMessage>
);

export const SuccessMessage = ({ message, children, onDismiss, className = "", ...props }) => (
  <AlertMessage
    variant="success"
    message={message}
    dismissible={Boolean(onDismiss)}
    onDismiss={onDismiss}
    className={className}
    {...props}
  >
    {children}
  </AlertMessage>
);

export const InlineFeedback = ({
  type = "info",
  message,
  className = "",
}) => {
  if (!message) return null;
  const config = ALERT_CONFIG[type] || ALERT_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      className={`inline-flex items-center gap-1.5 text-xs font-medium [overflow-wrap:anywhere] ${config.container.split(" ")[1]} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export const FeedbackContainer = ({ children, className = "" }) => {
  return (
    <div className={`space-y-2.5 w-full ${className}`}>
      {children}
    </div>
  );
};

export default {
  AlertMessage,
  ErrorMessage,
  SuccessMessage,
  InlineFeedback,
  FeedbackContainer,
};
