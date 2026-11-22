import { motion } from "framer-motion";
import { CALL_SPRING } from "./callTokens";

const DEFAULT_REACTIONS = ["❤️", "😂", "👍", "👏", "🎉", "😮", "😢", "🔥"];

export default function CallReactionsBar({
  isOpen,
  onClose,
  onSelectReaction,
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={CALL_SPRING}
      className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-2 rounded-full bg-[#121620]/95 px-3.5 py-1.5 border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-white/10"
    >
      {DEFAULT_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelectReaction?.(emoji);
            onClose?.();
          }}
          className="flex size-9 sm:size-10 items-center justify-center rounded-full text-xl hover:bg-white/15 active:scale-125 transition-all select-none cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
