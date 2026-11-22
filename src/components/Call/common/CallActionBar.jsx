import { motion } from "framer-motion";
import { CALL_SPRING } from "./callTokens";

/**
 * Standardized Floating Call Action Dock
 * Sleek, balanced, translucent dark pill dock positioned at bottom center.
 */
export default function CallActionBar({ children, className = "" }) {
  return (
    <div
      className={`relative z-20 flex justify-center w-full px-2 xs:px-3 sm:px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:pt-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent ${className}`}
    >
      <motion.div
        layout
        transition={CALL_SPRING}
        className="flex items-center justify-start sm:justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 rounded-2xl sm:rounded-3xl border border-white/[0.12] bg-[#121620]/90 px-3 xs:px-4 sm:px-6 py-2 sm:py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-white/10 max-w-[min(98vw,56rem)] overflow-x-auto no-scrollbar touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
}
