import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pencil, Loader2, Sparkles } from "lucide-react";
import { PROFILE_SPRING } from "./ProfileTokens";

/**
 * Standardized Sticky Header for Profile Page
 * Matches SettingsHeader with Esc keyboard shortcut, back navigation, and mobile edit triggers.
 */
export default function ProfileHeader({
  onBack,
  tab,
  isEditing,
  onStartEditing,
  isFetchingUser = false,
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
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/80 shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Go back"
            title="Go back (Esc)"
          >
            <ArrowLeft className="size-5" />
          </motion.button>

          <div className="min-w-0">
            <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-base-content">
              Account settings
            </h1>
            <p className="hidden sm:block text-xs text-base-content/60 truncate">
              Manage your personal details, credentials, and account preferences
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <kbd className="kbd kbd-sm hidden md:inline-flex text-base-content/50 border-base-300 bg-base-200/50">
            Esc
          </kbd>

          <AnimatePresence>
            {tab === "profile" && !isEditing && (
              <motion.button
                key="edit-mobile-btn"
                type="button"
                initial={{ opacity: 0, scale: 0.85, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 10 }}
                transition={PROFILE_SPRING}
                whileTap={{ scale: 0.94 }}
                onClick={onStartEditing}
                disabled={isFetchingUser}
                aria-label="Edit profile"
                className="btn btn-primary btn-sm rounded-full font-semibold gap-1.5 shadow-sm shadow-primary/20 sm:hidden"
              >
                {isFetchingUser ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Pencil className="size-3.5" />
                )}
                <span>Edit</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
