/**
 * Chatty Design Tokens
 * Centralized configuration for responsive breakpoints, typography, spacing,
 * colors, transitions, and z-index layers.
 */

export const BREAKPOINTS = Object.freeze({
  xs: 320, // Small phones (iPhone SE, etc.)
  sm: 640, // Standard phones / Small tablets
  md: 768, // Tablets (iPad Mini, etc.)
  lg: 1024, // Large tablets / Small laptops
  xl: 1280, // Laptops / Desktops
  "2xl": 1536, // Large displays
});

export const MEDIA_QUERIES = Object.freeze({
  xs: `(min-width: ${BREAKPOINTS.xs}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  "2xl": `(min-width: ${BREAKPOINTS["2xl"]}px)`,
  mobileOnly: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tabletOnly: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktopUp: `(min-width: ${BREAKPOINTS.lg}px)`,
  reducedMotion: "(prefers-reduced-motion: reduce)",
});

export const SPACING = Object.freeze({
  0: "0rem",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
});

export const TOUCH_TARGET = Object.freeze({
  min: "44px", // Minimum touch target size for WCAG 2.5.5
  comfortable: "48px",
});

export const TYPOGRAPHY = Object.freeze({
  fontFamily: '"Saira", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
});

export const RADIUS = Object.freeze({
  none: "0px",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
});

export const Z_INDEX = Object.freeze({
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
});

export const MOTION = Object.freeze({
  durations: {
    fast: "150ms",
    normal: "250ms",
    slow: "350ms",
  },
  easings: {
    standard: "cubic-bezier(0.2, 0.0, 0, 1.0)",
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",
    spring: { type: "spring", stiffness: 400, damping: 28 },
  },
});

export const SEMANTIC_COLORS = Object.freeze({
  primary: "var(--color-primary)",
  primaryContent: "var(--color-primary-content)",
  secondary: "var(--color-secondary)",
  secondaryContent: "var(--color-secondary-content)",
  accent: "var(--color-accent)",
  accentContent: "var(--color-accent-content)",
  neutral: "var(--color-neutral)",
  neutralContent: "var(--color-neutral-content)",
  base100: "var(--color-base-100)",
  base200: "var(--color-base-200)",
  base300: "var(--color-base-300)",
  baseContent: "var(--color-base-content)",
  info: "var(--color-info)",
  infoContent: "var(--color-info-content)",
  success: "var(--color-success)",
  successContent: "var(--color-success-content)",
  warning: "var(--color-warning)",
  warningContent: "var(--color-warning-content)",
  error: "var(--color-error)",
  errorContent: "var(--color-error-content)",
});

export default {
  BREAKPOINTS,
  MEDIA_QUERIES,
  SPACING,
  TOUCH_TARGET,
  TYPOGRAPHY,
  RADIUS,
  Z_INDEX,
  MOTION,
  SEMANTIC_COLORS,
};
