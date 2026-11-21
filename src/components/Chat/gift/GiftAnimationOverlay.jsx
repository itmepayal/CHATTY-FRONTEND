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

  // Determine specific particle animation trajectories based on category
  const isPetals = categoryTheme.animationType === "petals";
  const isDiamonds = categoryTheme.animationType === "diamonds";

  return (
    <AnimatePresence>
      <div
        key={`overlay_${replayKey}`}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden pointer-events-auto select-none"
      >
        {/* Deep Navy Atmosphere Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 bg-[#0B1120]/90 backdrop-blur-2xl"
          onClick={dismissCelebration}
        />

        {/* Ambient Radial Spotlight Behind the Gift */}
        <div
          className="pointer-events-none absolute w-[420px] h-[420px] sm:w-[620px] sm:h-[620px] rounded-full opacity-60 blur-3xl transition-all duration-700 animate-pulse"
          style={{
            background: `radial-gradient(circle at center, ${categoryTheme.accent}55 0%, ${rarityTheme.color}35 45%, transparent 75%)`,
          }}
        />

        {/* Controlled, Elegant Floating Particles (Theme-Specific) */}
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
                  className="absolute text-xl sm:text-2xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                >
                  {particleSymbol}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Main Luxury Celebration Modal Card */}
        <motion.div
          initial={{ scale: 0.35, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.45, y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative z-10 flex flex-col items-center text-center p-6 sm:p-8 max-w-md sm:max-w-lg w-full rounded-3xl bg-[#111827]/95 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          {/* Top Control Bar */}
          <div className="w-full flex items-center justify-between mb-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-slate-200"
              }`}
              title={soundEnabled ? "Mute celebration chime" : "Unmute celebration chime"}
              aria-label="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Celebratory Banner Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-purple-500/20 border border-white/10 text-white shadow-md">
              <Sparkles className="size-3 text-amber-400 animate-spin-slow" />
              <span>Virtual Gift Celebration</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={dismissCelebration}
              className="p-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close celebration"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* THE CENTERPIECE: Large 220–288px Animated Artwork Area */}
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
            <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-3xl p-4 bg-gradient-to-b from-white/10 via-slate-900/60 to-black/60 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex items-center justify-center relative overflow-hidden group">
              {/* Category Glow Aura */}
              <div
                className="pointer-events-none absolute inset-4 rounded-2xl opacity-50 blur-2xl"
                style={{ background: categoryTheme.glow }}
              />

              {/* Artwork Asset */}
              <GiftArtwork
                gift={celebrationGift}
                className="w-full h-full"
                imgClassName="w-full h-full object-contain filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.6)]"
                fallbackSize="text-8xl"
                glow={false}
              />

              {/* Coin Price Floating Tag */}
              <div className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#151F32]/95 border border-amber-500/40 text-amber-400 font-black text-xs shadow-lg backdrop-blur-md">
                <Coins className="size-3.5 text-amber-500" />
                <span>{celebrationGift.coinPrice || 50}</span>
              </div>
            </div>
          </motion.div>

          {/* Gift Name & Category Badge */}
          <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">
            {celebrationGift.name}
          </h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${categoryTheme.border} ${categoryTheme.text} bg-white/5`}
            >
              {celebrationGift.category}
            </span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${rarityTheme.badgeBorder} ${rarityTheme.badgeText} ${rarityTheme.badgeBg}`}
            >
              {celebrationGift.rarity || "COMMON"}
            </span>
            {celebrationGift.isAnimated && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="size-2.5" />
                ANIMATED
              </span>
            )}
          </div>

          {/* Gift Description */}
          <p className="text-xs text-slate-400 mt-2 max-w-sm line-clamp-2">
            {celebrationGift.description || "A wonderful token of celebration sent to make your day special!"}
          </p>

          {/* Personal Greeting Message Box (if present) */}
          {celebrationGift.message && (
            <div className="mt-3.5 w-full p-3 rounded-2xl bg-[#151F32]/90 border border-white/10 text-xs italic text-slate-200 relative flex items-start gap-2 shadow-inner">
              <Quote className="size-4 text-sky-400 shrink-0 mt-0.5 opacity-80" />
              <span className="text-left flex-1 font-medium">"{celebrationGift.message}"</span>
            </div>
          )}

          {/* Attribution footer */}
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            {celebrationGift.senderName ? (
              <span>
                Sent with warmth by <strong className="text-slate-200">{celebrationGift.senderName}</strong>
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
              className="btn btn-sm flex-1 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 border-white/10 text-xs font-bold gap-1.5 transition-colors"
              title="Replay celebration particles and animation"
            >
              <RotateCcw className="size-3.5 text-sky-400" />
              Replay
            </button>

            {/* Acknowledge / Close Action */}
            <button
              type="button"
              onClick={dismissCelebration}
              className="btn btn-sm btn-primary flex-1 rounded-2xl px-5 text-xs font-bold gap-1.5 shadow-lg shadow-sky-500/25"
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
