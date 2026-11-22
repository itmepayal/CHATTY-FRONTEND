import { AnimatePresence, motion } from "framer-motion";

/**
 * Floating Animated Emoji Reaction Particles Overlay
 */
export default function CallReactionsOverlay({ reactions = [] }) {
  if (!reactions.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 80, scale: 0.5, x: `${r.x ?? 50}vw` }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -360,
              scale: [0.5, 1.3, 1.1, 0.9],
              x: `${(r.x ?? 50) + (Math.random() * 8 - 4)}vw`,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: "easeOut" }}
            className="absolute bottom-24 flex flex-col items-center gap-1 select-none"
          >
            <span className="text-4xl sm:text-5xl drop-shadow-lg filter">{r.reaction}</span>
            {r.senderName && (
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md border border-white/10">
                {r.senderName}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
