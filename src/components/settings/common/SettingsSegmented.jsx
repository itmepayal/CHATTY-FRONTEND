import { LayoutGroup, motion } from "framer-motion";
import { SETTINGS_SPRING } from "./settingsTokens";

export default function SettingsSegmented({
  value,
  options = [],
  onChange,
  label = "Options",
  disabled = false,
  className = "",
  fullWidth = false,
}) {
  return (
    <LayoutGroup id={`seg-group-${label.replace(/\s+/g, "-")}`}>
      <div
        role="radiogroup"
        aria-label={label}
        className={`inline-flex items-center rounded-xl sm:rounded-2xl bg-base-200/80 p-1 border border-base-300/60 max-w-full overflow-x-auto no-scrollbar ${
          fullWidth ? "w-full" : "w-full sm:w-auto"
        } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
      >
        {options.map((option) => {
          const active = value === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              whileTap={disabled ? undefined : { scale: 0.95 }}
              className={`relative flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 min-h-[44px] sm:min-h-[36px] text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary select-none ${
                active
                  ? "text-primary"
                  : "text-base-content/65 hover:text-base-content"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`seg-active-${label.replace(/\s+/g, "-")}`}
                  transition={SETTINGS_SPRING}
                  className="absolute inset-0 rounded-lg sm:rounded-xl bg-base-100 shadow-sm border border-base-300/60"
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                {Icon && <Icon className="size-3.5 shrink-0" />}
                <span>{option.label}</span>
                {option.badge && (
                  <span className="badge badge-primary badge-xs scale-90">
                    {option.badge}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
