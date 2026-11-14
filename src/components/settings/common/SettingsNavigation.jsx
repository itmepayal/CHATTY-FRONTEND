import { LayoutGroup, motion } from "framer-motion";
import { SETTINGS_SPRING } from "./settingsTokens";

/**
 * Standardized Settings Navigation Bar
 * Horizontally scrollable on mobile with zero text clipping; pill bar on desktop.
 */
export default function SettingsNavigation({
  sections = [],
  activeSection,
  onSelectSection,
  className = "",
}) {
  return (
    <LayoutGroup id="settings-nav-group">
      <div
        role="tablist"
        aria-label="Settings categories"
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl border border-base-300/80 bg-base-100/80 backdrop-blur-md shadow-sm ${className}`}
      >
        {sections.map(({ id, label, icon: Icon, badge }) => {
          const active = activeSection === id;

          return (
            <motion.button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={label}
              onClick={() => onSelectSection(id)}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-primary select-none ${
                active
                  ? "text-primary font-bold"
                  : "text-base-content/65 hover:text-base-content hover:bg-base-200/50"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="settings-nav-pill"
                  transition={SETTINGS_SPRING}
                  className="absolute inset-0 rounded-xl bg-base-200 shadow-sm border border-base-300/80"
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
                {badge && (
                  <span className="badge badge-primary badge-xs scale-90">
                    {badge}
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
