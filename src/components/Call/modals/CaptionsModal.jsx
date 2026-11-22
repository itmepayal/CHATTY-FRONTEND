import { motion } from "framer-motion";
import {
  X,
  MessageSquareQuote,
  Download,
  Trash2,
  Globe,
  Type,
} from "lucide-react";
import { CALL_SPRING } from "../common/callTokens";
import { CAPTION_LANGUAGES } from "../../../lib/liveCaptions";

export default function CaptionsModal({
  isOpen,
  onClose,
  captionsEnabled = false,
  onToggleCaptions,
  sourceLang = "en-US",
  targetLang = "en",
  onSelectLanguages,
  fontSize = "base",
  onSelectFontSize,
  captionHistory = [],
  onExportTranscript,
  onClearTranscript,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Live Captions and Speech Translation"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={CALL_SPRING}
        className="w-full max-w-lg max-h-[min(90dvh,580px)] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/15 bg-neutral/95 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="size-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white">
              Live AI Captions & Subtitles
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white min-w-[36px] min-h-[36px]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          {/* Captions Master Toggle */}
          <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <div>
              <p className="font-semibold text-white">Enable Real-Time Captions</p>
              <p className="text-[11px] text-white/50">
                Speech-to-text processed with user consent
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCaptions}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                captionsEnabled ? "bg-primary" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  captionsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Language Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/70 font-semibold mb-1.5 flex items-center gap-1.5 block">
                <Globe className="size-3.5 text-primary" />
                <span>Spoken Language</span>
              </label>
              <select
                value={sourceLang}
                onChange={(e) => onSelectLanguages?.(e.target.value, targetLang)}
                className="w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                {CAPTION_LANGUAGES.map((lang) => (
                  <option
                    key={lang.bcp47}
                    value={lang.bcp47}
                    className="bg-neutral text-white"
                  >
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/70 font-semibold mb-1.5 flex items-center gap-1.5 block">
                <Globe className="size-3.5 text-primary" />
                <span>Translate To</span>
              </label>
              <select
                value={targetLang}
                onChange={(e) => onSelectLanguages?.(sourceLang, e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                {CAPTION_LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    className="bg-neutral text-white"
                  >
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtitle Font Size */}
          <div>
            <label className="text-white/70 font-semibold mb-1.5 flex items-center gap-1.5 block">
              <Type className="size-3.5 text-primary" />
              <span>Subtitle Font Size</span>
            </label>
            <div className="flex gap-2">
              {["sm", "base", "lg"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSelectFontSize?.(size)}
                  className={`flex-1 py-1.5 rounded-xl border font-semibold text-center transition-all ${
                    fontSize === size
                      ? "border-primary bg-primary/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  {size === "sm" ? "Small" : size === "base" ? "Medium" : "Large"}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white/80">Call Transcript History</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onExportTranscript}
                  disabled={!captionHistory.length}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
                >
                  <Download className="size-3" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={onClearTranscript}
                  disabled={!captionHistory.length}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-white/20 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="size-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="h-32 overflow-y-auto rounded-xl bg-black/40 p-3 border border-white/10 space-y-2">
              {captionHistory.length === 0 ? (
                <p className="text-center text-white/40 italic py-6">
                  {captionsEnabled
                    ? "Listening for speech…"
                    : "Enable captions above to see live transcription."}
                </p>
              ) : (
                captionHistory.map((item) => (
                  <div key={item.id} className="text-xs leading-relaxed">
                    <span className="text-[10px] text-white/40 font-mono mr-1.5">
                      [{item.timestamp}]
                    </span>
                    <span className="font-bold text-primary-content mr-1">
                      {item.speaker}:
                    </span>
                    <span className="text-white/90">{item.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Done */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
