import { useEffect } from "react";
import { useSettingsStore } from "../store/UseSettingsStore.js";
import { useAppearanceStore } from "../store/useAppearanceStore.js";

export const useApplySettings = () => {
  const reduceMotion = useSettingsStore((st) => st.settings.reduceMotion);
  const appearance = useAppearanceStore((st) => st.appearance);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (!appearance) return;
    const root = document.documentElement;

    // Font size variable
    const fontSizeMap = { sm: "13px", md: "14px", lg: "16px" };
    root.style.setProperty(
      "--chat-font-size",
      fontSizeMap[appearance.fontSize] || "14px",
    );

    // Bubble radius variable
    const radiusMap = {
      sharp: "0.25rem",
      soft: "0.75rem",
      rounded: "1.25rem",
    };
    root.style.setProperty(
      "--bubble-radius",
      radiusMap[appearance.bubbleStyle] || "1.25rem",
    );

    // Message gap variable
    const gapMap = { compact: "0.375rem", comfortable: "0.75rem" };
    root.style.setProperty(
      "--message-gap",
      gapMap[appearance.density] || "0.75rem",
    );
  }, [appearance]);
};

export const MESSAGE_SPACING = Object.freeze({
  comfortable: {
    groupGap: "mt-3.5 sm:mt-4",
    rowGap: "mt-1.5 sm:mt-2",
    bubblePadding: "px-3.5 py-2 sm:px-4 sm:py-2.5",
    bubblePaddingDeleted: "px-3.5 py-2",
    dayMargin: "my-3.5 sm:my-4",
    callMargin: "my-2.5 sm:my-3",
  },
  compact: {
    groupGap: "mt-2 sm:mt-2.5",
    rowGap: "mt-0.5 sm:mt-1",
    bubblePadding: "px-3 py-1 sm:px-3.5 sm:py-1.5",
    bubblePaddingDeleted: "px-3 py-1 sm:px-3.5 sm:py-1.5",
    dayMargin: "my-2 sm:my-2.5",
    callMargin: "my-1.5 sm:my-2",
  },
});

export const isCompact = (density) => density === "compact";

export const chatStyle = (s = {}) => {
  const densityKey = s.density === "compact" ? "compact" : "comfortable";
  const spacing = MESSAGE_SPACING[densityKey];

  return {
    density: densityKey,
    isCompact: densityKey === "compact",
    text:
      s.fontSize === "sm"
        ? "text-xs"
        : s.fontSize === "lg"
          ? "text-base"
          : "text-sm",
    radius:
      s.bubbleStyle === "sharp"
        ? "rounded-md"
        : s.bubbleStyle === "soft"
          ? "rounded-xl"
          : "rounded-2xl",
    tailMine: s.bubbleStyle === "sharp" ? "" : "rounded-br-md",
    tailTheirs: s.bubbleStyle === "sharp" ? "" : "rounded-bl-md",
    groupGap: spacing.groupGap,
    rowGap: spacing.rowGap,
    bubblePadding: spacing.bubblePadding,
    bubblePaddingDeleted: spacing.bubblePaddingDeleted,
    dayMargin: spacing.dayMargin,
    callMargin: spacing.callMargin,
  };
};

export const formatTime = (value, timeFormat = "12h") => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });
};
