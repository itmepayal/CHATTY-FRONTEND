import { Lock, Loader2 } from "lucide-react";
import SettingsToggle from "../settings/common/SettingsToggle";

/**
 * Reusable Security Lock Toggle Component
 * Supports: active, inactive, loading, setting_up, verifying, error, unavailable.
 * Accessibility compliant with role="switch" and aria-checked.
 */
export default function SecurityLockToggle({
  label = "Lock",
  description = "",
  status = "inactive",
  onToggle,
  disabled = false,
  badgeText,
  icon: Icon = Lock,
  className = "",
}) {
  const isActive = status === "active";
  const isBusy =
    status === "loading" || status === "verifying" || status === "setting_up";

  const getBadge = () => {
    if (badgeText) return badgeText;
    switch (status) {
      case "active":
        return "Active";
      case "verifying":
        return "Verifying…";
      case "setting_up":
        return "Configuring…";
      case "loading":
        return "Updating…";
      case "error":
        return "Error";
      case "unavailable":
        return "Unavailable";
      default:
        return "Inactive";
    }
  };

  const getBadgeClass = () => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary border-primary/20";
      case "verifying":
      case "setting_up":
      case "loading":
        return "bg-base-200 text-primary border-base-300";
      case "error":
        return "bg-error/10 text-error border-error/20";
      default:
        return "bg-base-200 text-base-content/60 border-base-300";
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300/40 transition-colors ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-base-content leading-tight">
              {label}
            </p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getBadgeClass()}`}
            >
              {isBusy && <Loader2 className="size-2.5 animate-spin" />}
              {getBadge()}
            </span>
          </div>
          {description && (
            <p className="text-xs text-base-content/60 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2 shrink-0 ml-3"
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsToggle
          checked={isActive}
          disabled={disabled || isBusy}
          onChange={(newVal) => {
            if (!disabled && !isBusy && onToggle) {
              onToggle(newVal);
            }
          }}
          label={label}
        />
      </div>
    </div>
  );
}
