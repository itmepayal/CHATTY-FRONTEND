import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating Live Subtitle Caption Bubble
 */
export default function CallCaptionsOverlay({ caption, fontSize = "base" }) {
  if (!caption || !caption.text) return null;

  const fontClass = {
    sm: "text-xs sm:text-sm",
    base: "text-sm sm:text-base",
    lg: "text-base sm:text-lg",
  }[fontSize] || "text-sm sm:text-base";

  return (
    <div className="pointer-events-none absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={caption.text}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="inline-flex max-w-full flex-col items-center rounded-2xl bg-black/80 px-4 py-2.5 backdrop-blur-md border border-white/15 shadow-2xl"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-content opacity-80 mb-0.5">
            {caption.speaker || "Speaker"}
          </span>
          <p className={`${fontClass} font-medium text-white tracking-wide leading-relaxed drop-shadow`}>
            {caption.text}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
