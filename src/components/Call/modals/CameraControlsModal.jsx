import { motion } from "framer-motion";
import {
  X,
  Camera,
  Layers,
  Zap,
  Repeat,
  Maximize,
  SlidersHorizontal,
} from "lucide-react";
import { CALL_SPRING } from "../common/callTokens";
import { RESOLUTION_PRESETS } from "../../../lib/videoManager";

export default function CameraControlsModal({
  isOpen,
  onClose,
  videoInputs = [],
  selectedVideoInput = "",
  onSelectVideoInput,
  resolutionPreset = "720p",
  onSelectResolution,
  lowBandwidthMode = false,
  onToggleLowBandwidth,
  facingMode = "user",
  onToggleFacingMode,
  mirrorLocal = true,
  onToggleMirror,
  supportsZoom = false,
  zoomLevel = 1,
  onSetZoom,
  supportsTorch = false,
  torchOn = false,
  onToggleTorch,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Camera and HD Resolution Settings"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={CALL_SPRING}
        className="w-full max-w-md max-h-[min(90dvh,580px)] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/15 bg-neutral/95 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white">
              Camera & Quality Controls
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

        <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1 text-xs scrollbar-thin">
          {/* Resolution Selector */}
          <div>
            <label className="text-white/70 font-semibold mb-2 block flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>Video Resolution & Bitrate</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RESOLUTION_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectResolution?.(key)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border transition-all ${
                    resolutionPreset === key
                      ? "border-primary bg-primary/20 text-white font-bold"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{item.label}</span>
                    <span className="rounded bg-black/40 px-1 py-0.5 text-[9px] font-bold text-emerald-400">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/50 font-normal">
                    {Math.round(item.maxBitrate / 1000)} kbps
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Low Bandwidth Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/10">
            <div>
              <p className="font-semibold text-white">Low Bandwidth Mode</p>
              <p className="text-[11px] text-white/50">
                Caps video to 360p to preserve network stability
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleLowBandwidth}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                lowBandwidthMode ? "bg-primary" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  lowBandwidthMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Camera Selection */}
          {videoInputs.length > 0 && (
            <div>
              <label className="text-white/70 font-semibold mb-1.5 block">
                Camera Input Device
              </label>
              <select
                value={selectedVideoInput}
                onChange={(e) => onSelectVideoInput?.(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                {videoInputs.map((device) => (
                  <option
                    key={device.deviceId}
                    value={device.deviceId}
                    className="bg-neutral text-white"
                  >
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Camera Actions & Toggles */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onToggleFacingMode}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 p-2.5 font-semibold text-white border border-white/5 transition-colors"
            >
              <Repeat className="size-3.5 text-primary" />
              <span>Flip Camera ({facingMode === "user" ? "Front" : "Back"})</span>
            </button>

            <button
              type="button"
              onClick={onToggleMirror}
              className={`flex items-center justify-center gap-2 rounded-xl p-2.5 font-semibold border transition-colors ${
                mirrorLocal
                  ? "bg-primary/20 border-primary text-white"
                  : "bg-white/10 hover:bg-white/15 border-white/5 text-white/80"
              }`}
            >
              <Maximize className="size-3.5 text-primary" />
              <span>Mirror Preview: {mirrorLocal ? "On" : "Off"}</span>
            </button>
          </div>

          {/* Zoom Slider if supported */}
          {supportsZoom && (
            <div>
              <div className="flex justify-between text-white/70 mb-1">
                <span className="font-semibold flex items-center gap-1">
                  <SlidersHorizontal className="size-3" /> Zoom Level
                </span>
                <span>{zoomLevel}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => onSetZoom?.(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          )}

          {/* Torch if supported */}
          {supportsTorch && (
            <button
              type="button"
              onClick={onToggleTorch}
              className={`w-full flex items-center justify-center gap-2 rounded-xl p-2.5 font-semibold border transition-colors ${
                torchOn
                  ? "bg-amber-400/20 border-amber-400 text-amber-300"
                  : "bg-white/10 hover:bg-white/15 border-white/5 text-white"
              }`}
            >
              <Zap className="size-4" />
              <span>Flashlight: {torchOn ? "ON" : "OFF"}</span>
            </button>
          )}
        </div>

        {/* Done */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
