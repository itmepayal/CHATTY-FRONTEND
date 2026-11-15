import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

/**
 * CustomToastIcon
 * Semantic icon container with themed tint background and glow.
 */
export const CustomToastIcon = ({ type = "info", className = "" }) => {
  const ICONS = {
    success: {
      Icon: CheckCircle2,
      style: "bg-success/15 text-success border border-success/30",
    },
    error: {
      Icon: AlertCircle,
      style: "bg-error/15 text-error border border-error/30",
    },
    warning: {
      Icon: AlertTriangle,
      style: "bg-warning/15 text-warning border border-warning/30",
    },
    info: {
      Icon: Info,
      style: "bg-info/15 text-info border border-info/30",
    },
    loading: {
      Icon: Loader2,
      style: "bg-primary/15 text-primary border border-primary/30",
      spin: true,
    },
  };

  const config = ICONS[type] || ICONS.info;
  const IconComponent = config.Icon;

  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${config.style} ${className}`}
      aria-hidden="true"
    >
      <IconComponent
        className={`size-4.5 ${config.spin ? "animate-spin" : ""}`}
      />
    </div>
  );
};

export default CustomToastIcon;
