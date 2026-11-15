import { motion } from "framer-motion";
import { SETTINGS_SPRING } from "./settingsTokens";

export default function SettingsSidebar({
  sections = [],
  activeSection,
  onSelectSection,
  changedCount = 0,
  onResetAll,
  confirmReset = false,
  className = "",
}) {
  return (
    <aside
      className={`rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-2 sm:p-2.5 shadow-sm transition-all overflow-hidden flex flex-col ${className}`}
      aria-label="Settings navigation sidebar"
    >
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-base-content/50">
          Preferences
        </h2>
      </div>

      <nav
        role="tablist"
        aria-label="Settings categories"
        className="space-y-1"
      >
        {sections.map(({ id, label, icon: Icon, desc, badge }) => {
          const active = activeSection === id;

          return (
            <motion.button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`settings-panel-${id}`}
              id={`settings-nav-item-${id}`}
              onClick={() => onSelectSection(id)}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm font-medium transition-all select-none min-h-[44px] focus-visible:outline-2 focus-visible:outline-primary ${
                active
                  ? "text-primary font-bold"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-200/60"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="settings-sidebar-pill"
                  transition={SETTINGS_SPRING}
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20 shadow-xs"
                />
              )}

              <span
                className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${
                  active
                    ? "bg-primary text-primary-content shadow-xs shadow-primary/30"
                    : "bg-base-200 text-base-content/60 group-hover:bg-base-300 group-hover:text-base-content"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>

              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate">{label}</span>
                  {badge && (
                    <span className="badge badge-primary badge-xs scale-90 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>
                {desc && (
                  <p className="truncate text-[11px] font-normal text-base-content/50">
                    {desc}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {changedCount > 0 && (
        <div className="mt-4 pt-3 border-t border-base-200 px-2 pb-1">
          <button
            type="button"
            onClick={onResetAll}
            className={`btn btn-sm w-full rounded-xl text-xs font-semibold ${
              confirmReset ? "btn-error" : "btn-ghost text-base-content/70"
            }`}
          >
            {confirmReset
              ? "Confirm reset?"
              : `Reset changes (${changedCount})`}
          </button>
        </div>
      )}
    </aside>
  );
}
