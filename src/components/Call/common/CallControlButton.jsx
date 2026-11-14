import { motion } from "framer-motion";
import {
  CALL_SPRING,
  CALL_VARIANTS,
  CALL_BUTTON_SIZES,
} from "./callTokens";

/**
 * Standardized Circular Call Control Action Button
 */
export default function CallControlButton({
  icon: Icon,
  label,
  onClick,
  variant = "glass", // glass | active | danger | success | accent | subtle
  size = "md", // sm | md | lg | xl
  pulse = false,
  pulseColor = "bg-success/50",
  showLabel = true,
  disabled = false,
  className = "",
  badge = null,
}) {
  const variantClass = CALL_VARIANTS[variant] || CALL_VARIANTS.glass;
  const sizeConfig = CALL_BUTTON_SIZES[size] || CALL_BUTTON_SIZES.md;

  return (
    <div className={`flex flex-col items-center gap-1.5 sm:gap-2 ${className}`}>
      <div className="relative">
        {pulse && !disabled && (
          <motion.span
            aria-hidden="true"
            className={`absolute inset-0 rounded-full ${pulseColor} pointer-events-none`}
            animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        <motion.button
          type="button"
          onClick={onClick}
          disabled={disabled}
          whileHover={disabled ? undefined : { scale: 1.07 }}
          whileTap={disabled ? undefined : { scale: 0.92 }}
          transition={CALL_SPRING}
          aria-label={label}
          title={label}
          className={`relative flex items-center justify-center rounded-full shadow-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-40 ${variantClass} ${sizeConfig.btn}`}
        >
          <Icon className={sizeConfig.icon} />
          {badge && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
              {badge}
            </span>
          )}
        </motion.button>
      </div>

      {showLabel && label && (
        <span
          className={`font-medium tracking-tight text-white/80 select-none text-center max-w-[5rem] sm:max-w-[6rem] truncate ${sizeConfig.text}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
