import { useState, useMemo } from "react";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Palette, Sparkles } from "lucide-react";
import { THEME } from "../../../constants";
import {
  SETTINGS_SPRING,
  SETTINGS_VARIANTS,
  THEME_CATEGORIES,
  THEME_CATEGORY_MAP,
} from "../common/settingsTokens";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsSegmented from "../common/SettingsSegmented";
import SettingsToggle from "../common/SettingsToggle";

export default function AppearanceSection({
  appearance,
  setAppearance,
  isSaving = false,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTheme, setSearchTheme] = useState("");

  const filteredThemes = useMemo(() => {
    return THEME.filter((t) => {
      if (selectedCategory !== "all") {
        const cat = THEME_CATEGORY_MAP[t] || "vibrant";
        if (cat !== selectedCategory) return false;
      }
      if (searchTheme && !t.toLowerCase().includes(searchTheme.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [selectedCategory, searchTheme]);

  return (
    <div className="space-y-5">
      {/* 1. Theme Palette Selector Card */}
      <SettingsCard
        title="Theme & Colors"
        subtitle="Choose from 35 handcrafted DaisyUI themes. Changes sync with your account."
        headerAction={
          isSaving ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving…</span>
            </span>
          ) : (
            <span className="badge badge-primary badge-outline text-xs capitalize font-semibold">
              Active: {appearance.theme}
            </span>
          )
        }
        divide={false}
      >
        {/* Category Filter Pills */}
        <div className="pt-3 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-content shadow-sm"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Grid */}
        <LayoutGroup id="theme-selection-grid">
          <motion.div
            layoutScroll
            variants={SETTINGS_VARIANTS.list}
            initial="hidden"
            animate="show"
            className="grid max-h-72 grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 overflow-y-auto pr-1 py-1"
          >
            {filteredThemes.map((t) => {
              const active = appearance.theme === t;

              return (
                <motion.button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  variants={SETTINGS_VARIANTS.item}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAppearance("theme", t)}
                  className={`group relative flex flex-col gap-1.5 rounded-xl p-1.5 text-left transition-all border ${
                    active
                      ? "bg-base-200/90 border-primary ring-2 ring-primary/40 shadow-md"
                      : "bg-base-100 border-base-300/70 hover:bg-base-200/50 hover:border-base-content/20"
                  }`}
                >
                  {/* Theme 4-Swatch Preview Box */}
                  <div
                    className="relative h-11 w-full overflow-hidden rounded-lg border border-base-content/10 bg-base-100 shadow-inner"
                    data-theme={t}
                  >
                    <div className="absolute inset-0 grid grid-cols-4 gap-0.5 p-1.5">
                      <div className="rounded bg-primary" />
                      <div className="rounded bg-secondary" />
                      <div className="rounded bg-accent" />
                      <div className="rounded bg-neutral" />
                    </div>

                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={SETTINGS_SPRING}
                          className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-content shadow"
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <span className="w-full truncate px-0.5 text-xs font-semibold capitalize text-base-content">
                    {t}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </LayoutGroup>
      </SettingsCard>

      {/* 2. Message Typography & Bubble Style Card */}
      <SettingsCard
        title="Chat Formatting"
        subtitle="Fine-tune font sizes, bubble contours, density, and timestamps."
      >
        <SettingsRow
          title="Font size"
          desc="Overall message text size in conversations and previews"
          wide
        >
          <SettingsSegmented
            label="Font size"
            value={appearance.fontSize}
            onChange={(v) => setAppearance("fontSize", v)}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          title="Bubble contour style"
          desc="Curvature of message conversation bubbles"
          wide
        >
          <SettingsSegmented
            label="Bubble style"
            value={appearance.bubbleStyle}
            onChange={(v) => setAppearance("bubbleStyle", v)}
            options={[
              { value: "rounded", label: "Round" },
              { value: "soft", label: "Soft" },
              { value: "sharp", label: "Sharp" },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          title="Message spacing"
          desc="Space between messages and breathing room between bubbles"
          wide
        >
          <SettingsSegmented
            label="Message spacing"
            value={appearance.density}
            onChange={(v) => setAppearance("density", v)}
            options={[
              { value: "comfortable", label: "Cozy" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          title="Show message timestamps"
          desc="Display the sent/delivered time under each message bubble"
        >
          <SettingsToggle
            checked={appearance.showTimestamps}
            onChange={(v) => setAppearance("showTimestamps", v)}
            label="Show message timestamps"
          />
        </SettingsRow>

        <SettingsRow
          title="Time format"
          desc="Choose between 12-hour (2:30 PM) or 24-hour (14:30) clock"
          disabled={!appearance.showTimestamps}
          wide
        >
          <SettingsSegmented
            label="Time format"
            value={appearance.timeFormat}
            onChange={(v) => setAppearance("timeFormat", v)}
            disabled={!appearance.showTimestamps}
            options={[
              { value: "12h", label: "12-hour" },
              { value: "24h", label: "24-hour" },
            ]}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
