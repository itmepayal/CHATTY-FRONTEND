import { motion } from "framer-motion";
import { SETTINGS_VARIANTS } from "./settingsTokens";

/**
 * Standardized Settings Option Row
 */
export default function SettingsRow({
  title,
  desc,
  icon: Icon = null,
  badge = null,
  children,
  stack = false,
  wide = false,
  disabled = false,
  className = "",
}) {
  return (
    <motion.div
      variants={SETTINGS_VARIANTS.item}
      animate={{ opacity: disabled ? 0.5 : 1 }}
      className={`py-3.5 sm:py-4 transition-opacity ${className}`}
    >
      <div
        className={`flex gap-3 sm:gap-4 ${
          stack
            ? "flex-col"
            : wide
              ? "flex-col sm:flex-row sm:items-center sm:justify-between"
              : "items-center justify-between"
        }`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {Icon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200 text-base-content/70 mt-0.5">
              <Icon className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-base-content leading-tight">
                {title}
              </span>
              {badge && (
                <span className="badge badge-primary badge-xs font-semibold">
                  {badge}
                </span>
              )}
            </div>
            {desc && (
              <p className="mt-1 text-xs text-base-content/65 leading-relaxed [overflow-wrap:anywhere]">
                {desc}
              </p>
            )}
          </div>
        </div>

        <div
          className={`${
            stack
              ? "mt-2.5 w-full"
              : wide
                ? "mt-2.5 sm:mt-0 flex items-center justify-start sm:justify-end shrink-0"
                : "flex shrink-0 items-center gap-2"
          }`}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}
