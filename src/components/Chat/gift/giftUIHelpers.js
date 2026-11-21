export const RARITY_CONFIG = {
  common: {
    label: "COMMON",
    color: "#94a3b8",
    badgeBg: "bg-slate-700/60",
    badgeText: "text-slate-300",
    badgeBorder: "border-slate-600/40",
    glow: "rgba(148, 163, 184, 0.25)",
  },
  rare: {
    label: "RARE",
    color: "#38bdf8",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-500/40",
    glow: "rgba(56, 189, 248, 0.35)",
  },
  epic: {
    label: "EPIC",
    color: "#a855f7",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/40",
    glow: "rgba(168, 85, 247, 0.4)",
  },
  legendary: {
    label: "LEGENDARY",
    color: "#f59e0b",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/40",
    glow: "rgba(245, 158, 11, 0.45)",
  },
  mythic: {
    label: "MYTHIC",
    color: "#f43f5e",
    badgeBg: "bg-rose-500/25",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/50",
    glow: "rgba(244, 63, 94, 0.55)",
  },
};

export const CATEGORY_THEMES = {
  "Love & Romance": {
    accent: "#f43f5e",
    gradient: "from-rose-500/20 via-pink-600/10 to-transparent",
    border: "border-rose-500/30",
    text: "text-rose-400",
    icon: "💖",
    particles: ["🌹", "🌸", "💖", "✨"],
    animationType: "petals",
    glow: "rgba(244, 63, 94, 0.4)",
  },
  "Flowers & Nature": {
    accent: "#10b981",
    gradient: "from-emerald-500/20 via-teal-600/10 to-transparent",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: "🌸",
    particles: ["🌸", "🌺", "🍃", "✨"],
    animationType: "petals",
    glow: "rgba(16, 185, 129, 0.4)",
  },
  "Cute Animals": {
    accent: "#f59e0b",
    gradient: "from-amber-500/20 via-orange-600/10 to-transparent",
    border: "border-amber-500/30",
    text: "text-amber-400",
    icon: "🐾",
    particles: ["🐾", "⭐", "✨", "💛"],
    animationType: "flutter",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  "Pets & Companions": {
    accent: "#eab308",
    gradient: "from-yellow-500/20 via-amber-600/10 to-transparent",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    icon: "🐶",
    particles: ["🐶", "🐱", "🦴", "✨"],
    animationType: "flutter",
    glow: "rgba(234, 179, 8, 0.4)",
  },
  "Birthday & Celebration": {
    accent: "#d946ef",
    gradient: "from-fuchsia-500/20 via-purple-600/10 to-transparent",
    border: "border-fuchsia-500/30",
    text: "text-fuchsia-400",
    icon: "🎂",
    particles: ["🎉", "🎊", "🎂", "✨", "🎈"],
    animationType: "confetti",
    glow: "rgba(217, 70, 239, 0.4)",
  },
  Friendship: {
    accent: "#0ea5e9",
    gradient: "from-sky-500/20 via-blue-600/10 to-transparent",
    border: "border-sky-500/30",
    text: "text-sky-400",
    icon: "🤝",
    particles: ["🤝", "💙", "⭐", "✨"],
    animationType: "confetti",
    glow: "rgba(14, 165, 233, 0.4)",
  },
  "Festivals & Traditions": {
    accent: "#ef4444",
    gradient: "from-red-500/20 via-amber-600/10 to-transparent",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: "🏮",
    particles: ["🏮", "🎆", "✨", "🌟"],
    animationType: "fireworks",
    glow: "rgba(239, 68, 68, 0.4)",
  },
  "Food & Drinks": {
    accent: "#f97316",
    gradient: "from-orange-500/20 via-red-600/10 to-transparent",
    border: "border-orange-500/30",
    text: "text-orange-400",
    icon: "🍰",
    particles: ["🍰", "☕", "🍩", "✨"],
    animationType: "flutter",
    glow: "rgba(249, 115, 22, 0.4)",
  },
  "Luxury & Premium": {
    accent: "#fbbf24",
    gradient: "from-amber-400/25 via-yellow-600/10 to-transparent",
    border: "border-amber-400/40",
    text: "text-amber-300",
    icon: "👑",
    particles: ["💎", "👑", "✨", "⭐"],
    animationType: "diamonds",
    glow: "rgba(251, 191, 36, 0.45)",
  },
  "Fantasy & Magic": {
    accent: "#8b5cf6",
    gradient: "from-violet-500/20 via-indigo-600/10 to-transparent",
    border: "border-violet-500/30",
    text: "text-violet-400",
    icon: "✨",
    particles: ["🔮", "🪄", "✨", "🌟"],
    animationType: "magic",
    glow: "rgba(139, 92, 246, 0.45)",
  },
  "Gaming & Entertainment": {
    accent: "#06b6d4",
    gradient: "from-cyan-500/20 via-blue-600/10 to-transparent",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    icon: "🎮",
    particles: ["🎮", "🏆", "👾", "✨"],
    animationType: "magic",
    glow: "rgba(6, 182, 212, 0.4)",
  },
  "Travel & Adventure": {
    accent: "#3b82f6",
    gradient: "from-blue-500/20 via-indigo-600/10 to-transparent",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: "✈️",
    particles: ["✈️", "🗺️", "⭐", "✨"],
    animationType: "flutter",
    glow: "rgba(59, 130, 246, 0.4)",
  },
  "Funny & Memes": {
    accent: "#84cc16",
    gradient: "from-lime-500/20 via-emerald-600/10 to-transparent",
    border: "border-lime-500/30",
    text: "text-lime-400",
    icon: "🤪",
    particles: ["🔥", "🚀", "🤣", "✨"],
    animationType: "confetti",
    glow: "rgba(132, 204, 22, 0.4)",
  },
  "Special Occasions": {
    accent: "#a855f7",
    gradient: "from-purple-500/20 via-pink-600/10 to-transparent",
    border: "border-purple-500/30",
    text: "text-purple-400",
    icon: "🎓",
    particles: ["🎓", "🌟", "✨", "🎊"],
    animationType: "confetti",
    glow: "rgba(168, 85, 247, 0.4)",
  },
  "Seasonal & Limited Edition": {
    accent: "#f43f5e",
    gradient: "from-rose-500/20 via-indigo-600/10 to-transparent",
    border: "border-rose-500/30",
    text: "text-rose-400",
    icon: "❄️",
    particles: ["❄️", "🍁", "☀️", "✨"],
    animationType: "petals",
    glow: "rgba(244, 63, 94, 0.4)",
  },
};

/**
 * Returns theme config for a category (with safe fallback).
 */
export const getCategoryTheme = (category) => {
  if (!category) return CATEGORY_THEMES["Love & Romance"];
  return (
    CATEGORY_THEMES[category] || {
      accent: "#38bdf8",
      gradient: "from-sky-500/20 via-indigo-600/10 to-transparent",
      border: "border-sky-500/30",
      text: "text-sky-400",
      icon: "🎁",
      particles: ["✨", "⭐", "🎉"],
      animationType: "confetti",
      glow: "rgba(56, 189, 248, 0.4)",
    }
  );
};

/**
 * Returns rarity config for a gift.
 */
export const getRarityTheme = (rarity) => {
  const r = (rarity || "common").toLowerCase();
  return RARITY_CONFIG[r] || RARITY_CONFIG.common;
};

/**
 * Plays a pleasant celebratory chime using Web Audio API synthesis.
 * Clean, lightweight, zero dependencies, safe in all modern browsers.
 */
export const playCelebrationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (major chord)
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + i * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + i * 0.1 + 0.9,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.95);
    });
  } catch (_e) {}
};
