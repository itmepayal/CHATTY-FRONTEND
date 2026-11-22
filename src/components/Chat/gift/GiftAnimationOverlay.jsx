import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Coins,
  Quote,
  CheckCircle2,
} from "lucide-react";
import { useGiftStore } from "../../../store/useGiftStore.js";
import GiftArtwork from "./GiftArtwork.jsx";
import { getCategoryTheme, getRarityTheme, playCelebrationSound } from "./giftUIHelpers.js";

/**
 * GiftAnimationOverlay
 * Celebration experience when gifts are received or previewed.
 * Renders using the active viewer's theme with smooth motion and responsive layout.
 */
const GiftAnimationOverlay = () => {
  const { celebrationGift, dismissCelebration } = useGiftStore();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Auto-dismiss after 6.5 seconds
  useEffect(() => {
    if (!celebrationGift) return;

    const timer = setTimeout(() => {
      dismissCelebration();
    }, 6500);

    return () => clearTimeout(timer);
  }, [celebrationGift, dismissCelebration, replayKey]);

  if (!celebrationGift) return null;

  const categoryTheme = getCategoryTheme(celebrationGift.category);
  const rarityTheme = getRarityTheme(celebrationGift.rarity);
  const particles = categoryTheme.particles || ["✨", "⭐", "🎉"];

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      playCelebrationSound();
    }
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
    if (soundEnabled) {
      playCelebrationSound();
    }
  };

  const isPetals = categoryTheme.animationType === "petals";
  const isDiamonds = categoryTheme.animationType === "diamonds";

  return (
    <AnimatePresence>
      <div
        key={`overlay_${replayKey}`}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden pointer-events-auto select-none"
      >
        {/* Atmosphere Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xl"
          onClick={dismissCelebration}
        />

        {/* Ambient Spotlight Behind the Gift */}
        <div
          className="pointer-events-none absolute w-[420px] h-[420px] sm:w-[620px] sm:h-[620px] rounded-full opacity-40 blur-3xl transition-all duration-700 animate-pulse"
          style={{
            background: `radial-gradient(circle at center, ${categoryTheme.accent}55 0%, ${rarityTheme.color}35 45%, transparent 75%)`,
          }}
        />

        {/* Floating Festive Particles */}
        {!prefersReducedMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(14)].map((_, i) => {
              const particleSymbol = particles[i % particles.length];
              const leftPercent = 8 + (i * 84) / 14 + Math.sin(i) * 5;
              const delay = (i * 0.18) % 1.6;
              const duration = isPetals ? 3.8 + (i % 3) * 0.5 : 3.0 + (i % 3) * 0.4;

              return (
                <motion.div
                  key={`particle_${replayKey}_${i}`}
                  initial={{
                    x: `${leftPercent}vw`,
                    y: isPetals ? "-10vh" : "105vh",
                    opacity: 0,
                    scale: 0.5,
                    rotate: 0,
                  }}
                  animate={{
                    y: isPetals ? "105vh" : "-10vh",
                    opacity: [0, 0.9, 0.7, 0],
                    scale: isDiamonds ? [0.6, 1.25, 0.7] : [0.7, 1.1, 0.8],
                    rotate: isPetals ? (i % 2 === 0 ? 180 : -180) : i % 2 === 0 ? 360 : -360,
                  }}
                  transition={{
                    duration,
                    ease: isPetals ? "easeInOut" : "easeOut",
                    delay,
                    repeat: 1,
                  }}
                  className="absolute text-xl sm:text-2xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
                >
                  {particleSymbol}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Main Theme-Aware Celebration Modal Card */}
        <motion.div
          initial={{ scale: 0.35, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.45, y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative z-10 flex flex-col items-center text-center p-6 sm:p-8 max-w-md sm:max-w-lg w-full rounded-3xl bg-base-100/95 border border-base-300 text-base-content shadow-2xl backdrop-blur-2xl"
        >
          {/* Top Control Bar */}
          <div className="w-full flex items-center justify-between mb-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-xs"
                  : "bg-base-200/80 text-base-content/60 border-base-300 hover:text-base-content hover:bg-base-200"
              }`}
              title={soundEnabled ? "Mute celebration chime" : "Unmute celebration chime"}
              aria-label="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Celebratory Banner Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-base-200 border border-base-300 text-base-content shadow-xs">
              <Sparkles className="size-3 text-amber-500 animate-spin-slow" />
              <span>Virtual Gift Celebration</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={dismissCelebration}
              className="p-2 rounded-xl bg-base-200/80 text-base-content/60 border border-base-300 hover:text-base-content hover:bg-base-200 transition-colors"
              aria-label="Close celebration"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* THE CENTERPIECE: Animated Artwork Area */}
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    y: [-4, 6, -4],
                    rotate: isDiamonds ? [-1.5, 1.5, -1.5] : [0, 0, 0],
                  }
            }
            transition={{
              repeat: Infinity,
              duration: 4.2,
              ease: "easeInOut",
            }}
            className="relative my-3 flex items-center justify-center"
          >
            {/* Visual Frame Container */}
            <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-3xl p-4 bg-base-200/70 border border-base-300 shadow-xl flex items-center justify-center relative overflow-hidden group">
              {/* Category Glow Aura */}
              <div
                className="pointer-events-none absolute inset-4 rounded-2xl opacity-40 blur-2xl"
                style={{ background: categoryTheme.glow }}
              />

              {/* Artwork Asset */}
              <GiftArtwork
                gift={celebrationGift}
                className="w-full h-full"
                imgClassName="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
                fallbackSize="text-8xl"
                glow={false}
              />

              {/* Coin Price Floating Tag */}
              <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-base-100/90 border border-amber-500/40 text-amber-500 font-black text-xs shadow-md backdrop-blur-md">
                <Coins className="size-3.5 text-amber-500" />
                <span>{celebrationGift.coinPrice || 50}</span>
              </div>
            </div>
          </motion.div>

          {/* Gift Name & Category Badge */}
          <h3 className="mt-1 text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            {celebrationGift.name}
          </h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${categoryTheme.border} ${categoryTheme.text} bg-base-200/60`}
            >
              {celebrationGift.category}
            </span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${rarityTheme.badgeBorder} ${rarityTheme.badgeText} ${rarityTheme.badgeBg}`}
            >
              {celebrationGift.rarity || "COMMON"}
            </span>
            {celebrationGift.isAnimated && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="size-2.5" />
                ANIMATED
              </span>
            )}
          </div>

          {/* Gift Description */}
          <p className="text-xs text-base-content/70 mt-2 max-w-sm line-clamp-2">
            {celebrationGift.description || "A wonderful token of celebration sent to make your day special!"}
          </p>

          {/* Personal Greeting Message Box (if present) */}
          {celebrationGift.message && (
            <div className="mt-3.5 w-full p-3 rounded-2xl bg-base-200/80 border border-base-300 text-xs italic text-base-content relative flex items-start gap-2 shadow-inner">
              <Quote className="size-4 text-primary shrink-0 mt-0.5 opacity-80" />
              <span className="text-left flex-1 font-medium">"{celebrationGift.message}"</span>
            </div>
          )}

          {/* Attribution footer */}
          <div className="mt-3 text-[11px] text-base-content/60 font-medium">
            {celebrationGift.senderName ? (
              <span>
                Sent with warmth by <strong className="text-base-content">{celebrationGift.senderName}</strong>
              </span>
            ) : (
              <span>Sent with joy in your conversation</span>
            )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="mt-5 flex items-center gap-2.5 w-full">
            {/* Replay Animation Action */}
            <button
              type="button"
              onClick={handleReplay}
              className="btn btn-sm flex-1 rounded-2xl bg-base-200 hover:bg-base-300 text-base-content border-base-300 text-xs font-bold gap-1.5 transition-colors"
              title="Replay celebration particles and animation"
            >
              <RotateCcw className="size-3.5 text-primary" />
              Replay
            </button>

            {/* Acknowledge / Close Action */}
            <button
              type="button"
              onClick={dismissCelebration}
              className="btn btn-sm btn-primary flex-1 rounded-2xl px-5 text-xs font-bold text-primary-content gap-1.5 shadow-md shadow-primary/20"
            >
              <CheckCircle2 className="size-3.5" />
              Awesome! ✨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GiftAnimationOverlay;
