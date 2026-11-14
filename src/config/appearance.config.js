/**
 * Appearance Configuration
 * Centralized registry for all 35 DaisyUI themes, typography scales,
 * bubble styling, layout density, and timestamp options.
 */

export const THEMES_LIST = Object.freeze([
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "caramellatte",
  "abyss",
  "silk",
]);

export const DARK_THEMES = new Set([
  "dark",
  "synthwave",
  "halloween",
  "forest",
  "black",
  "luxury",
  "dracula",
  "business",
  "night",
  "coffee",
  "dim",
  "sunset",
  "abyss",
]);

export const FONT_SIZES = Object.freeze({
  sm: {
    id: "sm",
    label: "Small",
    bodyClass: "text-xs sm:text-sm",
    messageClass: "text-xs",
    scale: 0.9,
  },
  md: {
    id: "md",
    label: "Medium",
    bodyClass: "text-sm sm:text-base",
    messageClass: "text-sm",
    scale: 1.0,
  },
  lg: {
    id: "lg",
    label: "Large",
    bodyClass: "text-base sm:text-lg",
    messageClass: "text-base",
    scale: 1.1,
  },
});

export const BUBBLE_STYLES = Object.freeze({
  rounded: {
    id: "rounded",
    label: "Rounded",
    radiusClass: "rounded-2xl",
    myRadiusClass: "rounded-2xl rounded-br-sm",
    theirRadiusClass: "rounded-2xl rounded-bl-sm",
  },
  soft: {
    id: "soft",
    label: "Soft",
    radiusClass: "rounded-lg",
    myRadiusClass: "rounded-lg rounded-br-xs",
    theirRadiusClass: "rounded-lg rounded-bl-xs",
  },
  sharp: {
    id: "sharp",
    label: "Sharp",
    radiusClass: "rounded-xs",
    myRadiusClass: "rounded-xs",
    theirRadiusClass: "rounded-xs",
  },
});

export const DENSITIES = Object.freeze({
  comfortable: {
    id: "comfortable",
    label: "Cozy",
    spacingClass: "py-2 px-3 gap-2",
    listClass: "py-2.5 px-3",
  },
  compact: {
    id: "compact",
    label: "Compact",
    spacingClass: "py-1 px-2.5 gap-1",
    listClass: "py-1.5 px-2.5",
  },
});

export const TIME_FORMATS = Object.freeze({
  "12h": { id: "12h", label: "12-hour", hour12: true },
  "24h": { id: "24h", label: "24-hour", hour12: false },
});

export const APPEARANCE_DEFAULTS = Object.freeze({
  theme: "light",
  fontSize: "md",
  bubbleStyle: "rounded",
  density: "comfortable",
  showTimestamps: true,
  timeFormat: "12h",
});

export const isThemeDark = (theme) => DARK_THEMES.has(theme);

export default {
  THEMES_LIST,
  DARK_THEMES,
  FONT_SIZES,
  BUBBLE_STYLES,
  DENSITIES,
  TIME_FORMATS,
  APPEARANCE_DEFAULTS,
  isThemeDark,
};
