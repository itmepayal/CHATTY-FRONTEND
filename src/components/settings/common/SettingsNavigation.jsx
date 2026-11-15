import { useRef, useEffect } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { SETTINGS_SPRING } from "./settingsTokens";

export default function SettingsNavigation({
  sections = [],
  activeSection,
  onSelectSection,
  className = "",
}) {
  const tabRefs = useRef({});

  useEffect(() => {
    const activeEl = tabRefs.current[activeSection];
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeSection]);

  const onTabKeyDown = (e, index) => {
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % sections.length;
    if (e.key === "ArrowLeft")
      next = (index - 1 + sections.length) % sections.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = sections.length - 1;
    if (next === null) return;
    e.preventDefault();
    const nextSection = sections[next];
    if (nextSection) {
      onSelectSection(nextSection.id);
      tabRefs.current[nextSection.id]?.focus();
    }
  };

  return (
    <LayoutGroup id="settings-horizontal-nav-group">
      <nav
        aria-label="Settings categories navigation"
        className={`w-full rounded-2xl border border-base-300/80 bg-base-100/90 backdrop-blur-md p-1.5 shadow-sm overflow-hidden ${className}`}
      >
        <div
          role="tablist"
          aria-label="Settings categories"
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-full"
        >
          {sections.map(({ id, label, icon: Icon, badge }, index) => {
            const active = activeSection === id;

            return (
              <motion.button
                key={id}
                ref={(el) => {
                  if (el) tabRefs.current[id] = el;
                }}
                id={`settings-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`settings-panel-${id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelectSection(id)}
                onKeyDown={(e) => onTabKeyDown(e, index)}
                whileTap={{ scale: 0.96 }}
                className={`group relative flex items-center justify-center gap-2 sm:gap-2.5 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-primary select-none min-h-[44px] flex-1 sm:flex-initial ${
                  active
                    ? "text-primary font-bold"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200/60"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="settings-nav-active-pill"
                    transition={SETTINGS_SPRING}
                    className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/25 shadow-xs"
                  />
                )}

                <span
                  className={`relative z-10 grid size-6 sm:size-7 shrink-0 place-items-center rounded-lg transition-colors ${
                    active
                      ? "bg-primary text-primary-content shadow-xs shadow-primary/30"
                      : "bg-base-200 text-base-content/60 group-hover:bg-base-300 group-hover:text-base-content"
                  }`}
                >
                  <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
                </span>

                <span className="relative z-10 truncate">{label}</span>

                {badge && (
                  <span className="relative z-10 badge badge-primary badge-xs scale-90 shrink-0">
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </LayoutGroup>
  );
}
