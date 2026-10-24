import { useEffect } from "react";
import { useSettingsStore } from "../store/UseSettingsStore.js";

export const useApplySettings = () => {
  const reduceMotion = useSettingsStore((st) => st.settings.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
};

export const chatStyle = (s) => ({
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
  groupGap: s.density === "compact" ? "mt-1" : "mt-10",
  rowGap: s.density === "compact" ? "mt-px" : "mt-0.5",
});

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
