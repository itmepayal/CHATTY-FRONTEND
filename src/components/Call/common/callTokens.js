/**
 * Centralized Design Tokens for All Call & Group Call Screens
 * Provides consistent physics, transitions, color variants, and layout constants.
 */

export const CALL_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

export const CALL_SPRING_FAST = {
  type: "spring",
  stiffness: 450,
  damping: 32,
};

export const CALL_SPRING_GENTLE = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

export const CALL_VARIANTS = {
  glass:
    "bg-white/[0.09] text-white/90 hover:bg-white/[0.18] active:bg-white/[0.24] hover:text-white backdrop-blur-xl border border-white/[0.12] shadow-sm transition-all duration-200",
  active:
    "bg-white text-neutral-900 hover:bg-white/90 active:bg-white/80 shadow-md font-semibold border border-white/40 transition-all duration-200",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-lg shadow-rose-950/40 border border-rose-400/30 transition-all duration-200",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all duration-200",
  accent:
    "bg-primary text-primary-content hover:brightness-110 active:brightness-95 shadow-md shadow-primary/25 border border-primary/30 transition-all duration-200",
  subtle:
    "bg-black/45 text-white/90 hover:bg-black/65 active:bg-black/80 backdrop-blur-md border border-white/[0.10] transition-all duration-200",
};

export const CALL_BUTTON_SIZES = {
  sm: {
    btn: "size-11 min-w-[44px] min-h-[44px]",
    icon: "size-4 sm:size-4.5",
    text: "text-[10px]",
  },
  md: {
    btn: "size-11 sm:size-12 min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]",
    icon: "size-5 sm:size-5",
    text: "text-[10px] sm:text-[11px]",
  },
  lg: {
    btn: "size-11 sm:size-12 min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]",
    icon: "size-5 sm:size-5.5",
    text: "text-[10px] sm:text-[11px]",
  },
  xl: {
    btn: "size-14 xs:size-16 min-w-[56px] min-h-[56px]",
    icon: "size-6 xs:size-7",
    text: "text-xs",
  },
};

/**
 * Format call seconds into MM:SS or HH:MM:SS (tabular nums safe)
 */
export const formatCallTimer = (totalSeconds = 0) => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/**
 * Compute responsive participant grid classes based on total user count
 */
export const getParticipantGridCols = (count) => {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
};
