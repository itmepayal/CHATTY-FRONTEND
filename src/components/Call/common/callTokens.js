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
  glass: "bg-white/15 text-white hover:bg-white/25 active:bg-white/30 backdrop-blur-md border border-white/10",
  active: "bg-white text-neutral hover:bg-white/90 active:bg-white/80 shadow-md",
  danger: "bg-error text-error-content hover:brightness-110 active:brightness-95 shadow-md shadow-error/25",
  success: "bg-success text-success-content hover:brightness-110 active:brightness-95 shadow-md shadow-success/25",
  accent: "bg-primary text-primary-content hover:brightness-110 active:brightness-95 shadow-md shadow-primary/25",
  subtle: "bg-black/40 text-white/90 hover:bg-black/60 active:bg-black/70 backdrop-blur-md border border-white/10",
};

export const CALL_BUTTON_SIZES = {
  sm: {
    btn: "size-10 sm:size-11",
    icon: "size-4 sm:size-5",
    text: "text-[10px]",
  },
  md: {
    btn: "size-12 sm:size-14",
    icon: "size-5 sm:size-6",
    text: "text-[11px]",
  },
  lg: {
    btn: "size-14 sm:size-16",
    icon: "size-6 sm:size-7",
    text: "text-xs",
  },
  xl: {
    btn: "size-16 sm:size-[72px]",
    icon: "size-7 sm:size-8",
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
