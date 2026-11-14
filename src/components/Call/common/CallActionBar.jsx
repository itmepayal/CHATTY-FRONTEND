import { motion } from "framer-motion";
import { CALL_SPRING } from "./callTokens";

/**
 * Standardized Floating Call Action Dock
 */
export default function CallActionBar({ children, className = "" }) {
  return (
    <div
      className={`relative z-20 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent ${className}`}
    >
      <motion.div
        layout
        transition={CALL_SPRING}
        className="flex items-center gap-3 sm:gap-6 rounded-[2.25rem] border border-white/15 bg-white/10 px-5 sm:px-8 py-3.5 sm:py-4 shadow-2xl backdrop-blur-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
