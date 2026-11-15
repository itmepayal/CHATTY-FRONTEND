import { motion } from "framer-motion";
import { Wand2, Download, RotateCcw } from "lucide-react";
import { AI_TONES } from "../../../store/useAiStore";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";

export default function AiSection({
  settings,
  setSetting,
  appearance,
  setAppearance,
  exportSettings,
  handleReset,
  confirmReset = false,
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="AI Assistant & Writing Tools"
        subtitle="Configure smart composer rewrites, tone suggestions, and grammar fixes."
      >
        <SettingsRow
          title="Enable AI assistant"
          desc="Display the ✨ AI assist button directly in the chat composer bar"
        >
          <SettingsToggle
            checked={settings.aiEnabled}
            onChange={(v) => setSetting("aiEnabled", v)}
            label="Enable AI assistant"
          />
        </SettingsRow>

        <SettingsRow
          title="Default rewrite tone"
          desc="The primary tone selected when opening the AI rewrite dropdown menu"
          disabled={!settings.aiEnabled}
          wide
        >
          <select
            className="select select-bordered select-sm w-full sm:w-44 rounded-xl text-xs font-semibold"
            value={settings.aiDefaultTone}
            disabled={!settings.aiEnabled}
            onChange={(e) => setSetting("aiDefaultTone", e.target.value)}
            aria-label="Default rewrite tone"
          >
            {AI_TONES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow
          title="Highlight grammar corrections"
          desc="Visually highlight words that were corrected by the AI grammar tool"
          disabled={!settings.aiEnabled}
        >
          <SettingsToggle
            checked={settings.aiShowChanges}
            onChange={(v) => setSetting("aiShowChanges", v)}
            label="Highlight grammar corrections"
            disabled={!settings.aiEnabled}
          />
        </SettingsRow>
      </SettingsCard>

      <div className="rounded-2xl sm:rounded-3xl border border-base-300 bg-base-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="size-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/75">
            Grammar Correction Example
          </h4>
        </div>

        <div className="rounded-xl bg-base-200/60 p-3.5 space-y-2 text-xs sm:text-sm">
          <p className="text-base-content/50 line-through decoration-base-content/30 font-mono">
            i dont think we can make it tmrw
          </p>
          <p className="font-medium text-base-content flex items-center flex-wrap gap-0.5">
            {[
              ["I", true],
              [" don’t", true],
              [" think we can make it", false],
              [" tomorrow.", true],
            ].map(([text, changed], i) => (
              <motion.span
                key={i}
                animate={{
                  backgroundColor:
                    changed && settings.aiShowChanges
                      ? "rgba(34, 197, 94, 0.2)"
                      : "transparent",
                  color:
                    changed && settings.aiShowChanges
                      ? "rgb(22, 163, 74)"
                      : "inherit",
                }}
                className="rounded px-1 py-0.5 font-semibold transition-colors"
              >
                {text}
              </motion.span>
            ))}
          </p>
        </div>
      </div>

      <SettingsCard
        title="Accessibility & Motion"
        subtitle="Control motion animations and font scaling preferences."
      >
        <SettingsRow
          title="Reduce motion"
          desc="Disables non-essential looping animations and spring transitions across the app"
        >
          <SettingsToggle
            checked={settings.reduceMotion}
            onChange={(v) => setSetting("reduceMotion", v)}
            label="Reduce motion"
          />
        </SettingsRow>

        <SettingsRow
          title="Large text mode"
          desc="Quick shortcut to set your global message font size to Large"
        >
          <SettingsToggle
            checked={appearance.fontSize === "lg"}
            onChange={(v) => setAppearance("fontSize", v ? "lg" : "md")}
            label="Large text mode"
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title="Data & Preferences Management"
        subtitle="Export your user preferences as JSON or reset to application defaults."
      >
        <SettingsRow
          title="Export settings"
          desc="Download your appearance, chat, and notification preferences as a JSON file"
        >
          <button
            type="button"
            onClick={exportSettings}
            className="btn btn-outline btn-sm rounded-xl gap-2 font-semibold text-xs"
          >
            <Download className="size-3.5" />
            <span>Export JSON</span>
          </button>
        </SettingsRow>

        <SettingsRow
          title="Reset to factory defaults"
          desc="Restores appearance, composer preferences, and settings to original defaults"
        >
          <button
            type="button"
            onClick={handleReset}
            className={`btn btn-sm rounded-xl gap-2 font-semibold text-xs ${
              confirmReset ? "btn-error shadow-sm" : "btn-outline btn-error"
            }`}
          >
            <RotateCcw className="size-3.5" />
            <span>{confirmReset ? "Confirm Reset?" : "Reset Defaults"}</span>
          </button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
