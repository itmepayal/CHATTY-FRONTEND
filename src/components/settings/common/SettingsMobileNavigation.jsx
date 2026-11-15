import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SETTINGS_VARIANTS } from "./settingsTokens";

export default function SettingsMobileNavigation({
  sections = [],
  onSelectSection,
  className = "",
}) {
  return (
    <motion.div
      variants={SETTINGS_VARIANTS.list}
      initial="hidden"
      animate="show"
      className={`space-y-2.5 ${className}`}
    >
      <div className="px-1 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
          Categories
        </p>
      </div>

      <div className="divide-y divide-base-200/80 rounded-2xl border border-base-300/80 bg-base-100 shadow-sm overflow-hidden">
        {sections.map(({ id, label, icon: Icon, desc, badge }) => (
          <motion.button
            key={id}
            variants={SETTINGS_VARIANTS.item}
            type="button"
            onClick={() => onSelectSection(id)}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-base-200/50 active:bg-base-200 min-h-[56px] focus-visible:outline-2 focus-visible:outline-primary select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base text-base-content truncate">
                    {label}
                  </span>
                  {badge && (
                    <span className="badge badge-primary badge-xs shrink-0">
                      {badge}
                    </span>
                  )}
                </div>
                {desc && (
                  <p className="text-xs text-base-content/60 mt-0.5 line-clamp-1 leading-snug">
                    {desc}
                  </p>
                )}
              </div>
            </div>

            <ChevronRight
              className="size-5 text-base-content/35 shrink-0 ml-2"
              aria-hidden="true"
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
