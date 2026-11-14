/**
 * Centralized Design Tokens for Settings Module
 * Standardizes physics, spacing, transitions, and responsive limits.
 */

export const SETTINGS_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const SETTINGS_SPRING_GENTLE = {
  type: "spring",
  stiffness: 280,
  damping: 26,
};

export const SETTINGS_SPRING_BOUNCE = {
  type: "spring",
  stiffness: 500,
  damping: 25,
};

export const SETTINGS_VARIANTS = {
  list: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.02 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 28 },
    },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
};

export const THEME_CATEGORIES = [
  { id: "all", label: "All Themes" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "vibrant", label: "Color / Vibrant" },
];

export const THEME_CATEGORY_MAP = {
  // Dark themes
  dark: "dark",
  synthwave: "dark",
  halloween: "dark",
  forest: "dark",
  black: "dark",
  luxury: "dark",
  dracula: "dark",
  business: "dark",
  night: "dark",
  coffee: "dark",
  dim: "dark",
  sunset: "dark",

  // Light themes
  light: "light",
  cupcake: "light",
  emerald: "light",
  corporate: "light",
  garden: "light",
  lofi: "light",
  pastel: "light",
  fantasy: "light",
  wireframe: "light",
  cmyk: "light",
  autumn: "light",
  acid: "light",
  lemonade: "light",
  winter: "light",
  nord: "light",

  // Vibrant / Stylized
  bumblebee: "vibrant",
  retro: "vibrant",
  cyberpunk: "vibrant",
  valentine: "vibrant",
  aqua: "vibrant",
};
