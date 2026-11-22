/**
 * emojiUtils.js
 * Comprehensive utility for Unicode emoji detection, grapheme counting,
 * and adaptive message typography sizing.
 */

// Matches full string composed of emojis, keycap sequences, regional flags, modifiers, ZWJ, and variation selectors
const EMOJI_ONLY_PATTERN =
  /^(\s*(\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Emoji_Modifier}|\u200d|\ufe0f|\ufe0e)+\s*)+$/u;

// Ensures the string has at least one core visual emoji / indicator / keycap
const CORE_EMOJI_PATTERN =
  /(\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3)/u;

/**
 * Checks whether a string consists strictly of emoji characters.
 * Supports:
 * - Single emojis (😊, ❤️, 😂, 🔥, 😍)
 * - Multiple emojis (😊😊😊, ❤️🔥😂)
 * - Emoji sequences (flags like 🇮🇳, keycaps like 1️⃣)
 * - Skin-tone modifiers (👍🏽, 🧑🏾‍💻)
 * - Zero-width joiners (👨‍👩‍👧‍👦, 👩‍💻, 🏳️‍🌈)
 * - Variation selectors (\ufe0f)
 */
export const isEmojiOnly = (t) => {
  if (!t || typeof t !== "string") return false;
  const s = t.trim();
  if (!s) return false;
  return EMOJI_ONLY_PATTERN.test(s) && CORE_EMOJI_PATTERN.test(s);
};

/**
 * Accurately returns visual emoji count (graphemes) using Intl.Segmenter.
 */
export const getEmojiCount = (t) => {
  if (!isEmojiOnly(t)) return 0;
  const s = t.trim();
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return [...segmenter.segment(s)].filter(
        (seg) => seg.segment.trim().length > 0,
      ).length;
    } catch {
      // Fallback
    }
  }
  return [...s.replace(/\s/g, "")].length;
};

/**
 * Checks if a string is eligible for large emoji display (1 to 6 visual emojis).
 */
export const isLargeEmojiCandidate = (t) => {
  const count = getEmojiCount(t);
  return count >= 1 && count <= 6;
};

/**
 * Returns Tailwind typography sizing class for emoji-only messages.
 * 1-3 emojis -> text-4xl sm:text-5xl
 * 4-6 emojis -> text-3xl sm:text-4xl
 * >6 emojis -> fallback (standard text size)
 */
export const getEmojiSizeClass = (t, fallback = "text-sm") => {
  const count = getEmojiCount(t);
  if (count >= 1 && count <= 3) {
    return "text-4xl sm:text-5xl leading-tight select-none py-0.5 filter drop-shadow-xs";
  }
  if (count >= 4 && count <= 6) {
    return "text-3xl sm:text-4xl leading-tight select-none py-0.5 filter drop-shadow-xs";
  }
  return fallback;
};

export default {
  isEmojiOnly,
  getEmojiCount,
  isLargeEmojiCandidate,
  getEmojiSizeClass,
};
