import { motion } from "framer-motion";
import { SETTINGS_VARIANTS } from "./settingsTokens";

export default function SettingsCard({
  title = null,
  subtitle = null,
  headerAction = null,
  children,
  className = "",
  divide = true,
}) {
  return (
    <motion.div
      variants={SETTINGS_VARIANTS.list}
      initial="hidden"
      animate="show"
      className={`@container rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-sm transition-all hover:border-base-content/20 ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between border-b border-base-200/80 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="font-semibold text-sm sm:text-base text-base-content tracking-tight break-words">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs sm:text-sm text-base-content/60 leading-relaxed break-words">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0 ml-3">{headerAction}</div>}
        </div>
      )}

      <div
        className={`px-4 sm:px-6 ${
          divide ? "divide-y divide-base-content/10" : ""
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
