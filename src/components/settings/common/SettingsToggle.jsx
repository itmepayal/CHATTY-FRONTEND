import { motion } from "framer-motion";
import { SETTINGS_SPRING } from "./settingsTokens";

export default function SettingsToggle({
  checked = false,
  onChange,
  label = "Toggle option",
  disabled = false,
  className = "",
}) {
  return (
    <div
      className={`relative flex items-center justify-center p-1 ${className}`}
    >
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        whileTap={disabled ? undefined : { scale: 0.92 }}
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          checked ? "bg-primary justify-end" : "bg-base-300 justify-start"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <motion.span
          layout
          transition={SETTINGS_SPRING}
          className="size-5 rounded-full bg-white shadow-md ring-1 ring-black/10"
        />
      </motion.button>
    </div>
  );
}
