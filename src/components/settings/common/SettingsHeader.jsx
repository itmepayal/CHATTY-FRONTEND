import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { SETTINGS_SPRING } from "./settingsTokens";

export default function SettingsHeader({
  onBack,
  backLabel = null,
  title = "Settings",
  subtitle = "Personalize your appearance, privacy, chat experience, and encryption",
  changedCount = 0,
  onResetAll = null,
  confirmReset = false,
  actions = null,
  className = "",
}) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-base-300/80 bg-base-100/85 backdrop-blur-xl pt-[env(safe-area-inset-top)] ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <motion.button
            type="button"
            onClick={onBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.92 }}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/80 shadow-xs transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary min-h-[44px] min-w-[44px]"
            aria-label={backLabel ? `Back to ${backLabel}` : "Go back"}
            title="Go back (Esc)"
          >
            <ArrowLeft className="size-5" />
          </motion.button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-base-content">
                {title}
              </h1>
              {backLabel && (
                <span className="hidden sm:inline-flex badge badge-ghost badge-sm text-base-content/50">
                  {backLabel}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="hidden sm:block text-xs text-base-content/60 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {actions}

          <kbd className="kbd kbd-sm hidden md:inline-flex text-base-content/50 border-base-300 bg-base-200/50">
            Esc
          </kbd>

          <AnimatePresence>
            {changedCount > 0 && onResetAll && (
              <motion.button
                key="reset-button"
                type="button"
                onClick={onResetAll}
                initial={{ opacity: 0, scale: 0.85, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 10 }}
                transition={SETTINGS_SPRING}
                whileTap={{ scale: 0.94 }}
                className={`btn btn-sm rounded-full font-semibold shrink-0 gap-1.5 transition-all ${
                  confirmReset
                    ? "btn-error shadow-xs"
                    : "btn-ghost text-base-content/75 hover:bg-base-200"
                }`}
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">
                  {confirmReset
                    ? "Click again to confirm"
                    : `${changedCount} modified · Reset all`}
                </span>
                <span className="sm:hidden text-xs">
                  {confirmReset
                    ? "Confirm?"
                    : `${changedCount} modified`}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
