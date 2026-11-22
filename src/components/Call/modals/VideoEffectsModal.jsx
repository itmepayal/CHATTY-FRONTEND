import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Smile,
  RotateCcw,
  Upload,
  Check,
  Loader2,
  Trash2,
  Camera,
  AlertCircle,
} from "lucide-react";
import { CALL_SPRING } from "../common/callTokens";
import { VIRTUAL_BACKGROUND_PRESETS } from "../../../lib/videoProcessor";

const BLUR_OPTIONS = [
  { id: "blur-light", name: "Light Blur", blur: "8px", icon: "🌫️", desc: "Subtle depth" },
  { id: "blur-medium", name: "Medium Blur", blur: "16px", icon: "☁️", desc: "Balanced" },
  { id: "blur-strong", name: "Strong Blur", blur: "28px", icon: "💨", desc: "Max privacy" },
];

const VIRTUAL_PRESETS = VIRTUAL_BACKGROUND_PRESETS.filter(
  (p) => p.category === "virtual",
);

const FILTERS = [
  { id: "none", label: "Normal", color: "bg-white/10" },
  { id: "beauty", label: "Natural Beauty", color: "bg-rose-400/20 text-rose-300" },
  { id: "brightness", label: "Brightness+", color: "bg-amber-400/20 text-amber-300" },
  { id: "contrast", label: "Vivid Contrast", color: "bg-blue-400/20 text-blue-300" },
  { id: "saturation", label: "Vibrant Color", color: "bg-emerald-400/20 text-emerald-300" },
  { id: "warm", label: "Warm Sunset", color: "bg-orange-500/20 text-orange-300" },
  { id: "cool", label: "Cool Arctic", color: "bg-cyan-400/20 text-cyan-300" },
  { id: "bw", label: "Black & White", color: "bg-zinc-400/20 text-zinc-300" },
  { id: "vintage", label: "Vintage Sepia", color: "bg-yellow-600/20 text-yellow-300" },
];

const AR_STICKERS = [
  { id: "none", label: "None", emoji: "🚫" },
  { id: "sunglasses", label: "Cool Sunglasses", emoji: "🕶️" },
  { id: "party-hat", label: "Party Cone Hat", emoji: "🎉" },
  { id: "mustache", label: "Gentleman Mustache", emoji: "🥸" },
  { id: "cat-ears", label: "Cute Cat Ears", emoji: "🐱" },
];

export default function VideoEffectsModal({
  isOpen,
  onClose,
  currentBackground = "none",
  currentFilter = "none",
  currentAr = "none",
  onApplyEffects,
  localStream = null,
  processorStatus = "idle",
  processorMessage = "",
}) {
  const [tab, setTab] = useState("background"); // 'background' | 'filter' | 'ar'
  const [selectedBg, setSelectedBg] = useState(currentBackground);
  const [selectedFilter, setSelectedFilter] = useState(currentFilter);
  const [selectedAr, setSelectedAr] = useState(currentAr);
  const [customFilePreview, setCustomFilePreview] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const previewVideoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync state with incoming props on open
  useEffect(() => {
    if (isOpen) {
      setSelectedBg(currentBackground);
      setSelectedFilter(currentFilter);
      setSelectedAr(currentAr);
      setUploadError("");
    }
  }, [isOpen, currentBackground, currentFilter, currentAr]);

  // Attach localStream to preview video safely via effect and callback ref
  const setPreviewVideoRef = (el) => {
    previewVideoRef.current = el;
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      if (previewVideoRef.current.srcObject !== localStream) {
        previewVideoRef.current.srcObject = localStream;
      }
      previewVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isOpen]);

  if (!isOpen) return null;

  const handleSelectBg = (bgId) => {
    setSelectedBg(bgId);
    setUploadError("");
    onApplyEffects?.({ background: bgId });
  };

  const handleSelectFilter = (filterId) => {
    setSelectedFilter(filterId);
    onApplyEffects?.({ filter: filterId });
  };

  const handleSelectAr = (arId) => {
    setSelectedAr(arId);
    onApplyEffects?.({ ar: arId });
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images are supported.");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB.");
      return;
    }

    setUploadError("");
    const previewUrl = URL.createObjectURL(file);
    setCustomFilePreview(previewUrl);
    setSelectedBg("custom");
    onApplyEffects?.({ background: "custom", customImage: file });
  };

  const handleRemoveCustom = (e) => {
    e.stopPropagation();
    if (customFilePreview) {
      URL.revokeObjectURL(customFilePreview);
      setCustomFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleSelectBg("none");
  };

  const handleReset = () => {
    setSelectedBg("none");
    setSelectedFilter("none");
    setSelectedAr("none");
    setUploadError("");
    onApplyEffects?.({ background: "none", filter: "none", ar: "none" });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Video Call Background and Studio Effects"
        initial={{ opacity: 0, y: 50, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={CALL_SPRING}
        className="relative flex flex-col w-full max-w-2xl max-h-[min(92dvh,680px)] rounded-t-3xl sm:rounded-3xl border border-white/15 bg-neutral/95 p-4 sm:p-6 text-white shadow-2xl backdrop-blur-2xl overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Background & Studio Effects
              </h3>
              <p className="text-[11px] text-white/60">
                MediaPipe AI person segmentation & virtual backgrounds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/20 active:scale-95 transition-all min-h-[36px]"
              title="Reset all effects to original"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors min-w-[36px] min-h-[36px]"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Live Camera Preview Stage */}
        <div className="relative mt-3 sm:mt-4 h-24 xs:h-32 sm:h-44 w-full overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-inner shrink-0">
          {localStream ? (
            <video
              ref={setPreviewVideoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center justify-center size-full text-white/50 gap-2">
              <Camera className="size-8" />
              <span className="text-xs">Camera preview unavailable</span>
            </div>
          )}

          {/* Model Status Pill */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/15">
            {processorStatus === "loading-model" ? (
              <>
                <Loader2 className="size-3 animate-spin text-primary" />
                <span>{processorMessage || "Loading AI model…"}</span>
              </>
            ) : processorStatus === "camera-initializing" || processorStatus === "waiting-for-camera" ? (
              <>
                <Loader2 className="size-3 animate-spin text-amber-400" />
                <span>{processorMessage || "Connecting camera…"}</span>
              </>
            ) : processorStatus === "camera-ready" ? (
              <>
                <span className="size-2 rounded-full bg-blue-400" />
                <span>{processorMessage || "Camera Ready"}</span>
              </>
            ) : processorStatus === "segmentation-ready" ? (
              <>
                <span className="size-2 rounded-full bg-teal-400" />
                <span>{processorMessage || "AI Segmentation Ready"}</span>
              </>
            ) : processorStatus === "fallback" ? (
              <>
                <span className="size-2 rounded-full bg-amber-400" />
                <span>{processorMessage || "Camera Fallback Active"}</span>
              </>
            ) : processorStatus === "error" ? (
              <>
                <AlertCircle className="size-3 text-red-400" />
                <span>{processorMessage || "Effects Unavailable"}</span>
              </>
            ) : processorStatus === "active" ? (
              <>
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{processorMessage || "AI Segmentation Active"}</span>
              </>
            ) : selectedBg !== "none" ? (
              <>
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{processorMessage || "AI Segmentation Active"}</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-white/40" />
                <span>Original Camera</span>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setTab("background")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === "background"
                ? "bg-primary text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ImageIcon className="size-3.5" />
            <span>Virtual Backgrounds</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("filter")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === "filter"
                ? "bg-primary text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Color Filters</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("ar")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              tab === "ar"
                ? "bg-primary text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Smile className="size-3.5" />
            <span>AR Stickers</span>
          </button>
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-error/20 border border-error/30 px-3 py-1.5 text-xs text-error font-medium">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Scrollable Options Body */}
        <div className="mt-3.5 flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          {tab === "background" && (
            <div className="space-y-4">
              {/* Category 1: Original Camera */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                  Original
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectBg("none")}
                  className={`flex items-center gap-3 w-full p-2.5 rounded-2xl border text-left transition-all ${
                    selectedBg === "none"
                      ? "border-primary bg-primary/20 ring-2 ring-primary/40 text-white font-semibold"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                  }`}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                    🚫
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">Original Camera</p>
                    <p className="text-[11px] text-white/50">Restore raw camera stream</p>
                  </div>
                  {selectedBg === "none" && <Check className="size-4 text-primary" />}
                </button>
              </div>

              {/* Category 2: Background Blur */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                  Background Blur
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {BLUR_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectBg(item.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                        selectedBg === item.id
                          ? "border-primary bg-primary/20 ring-2 ring-primary/40 text-white"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs font-bold leading-tight">{item.name}</span>
                      <span className="text-[10px] text-white/50">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 3: Virtual Backgrounds (10 Presets) */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                  Virtual Backgrounds
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {VIRTUAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectBg(preset.id)}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all text-left ${
                        selectedBg === preset.id
                          ? "border-primary ring-2 ring-primary/50 shadow-lg"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative h-20 w-full overflow-hidden bg-neutral">
                        <img
                          src={preset.src}
                          alt={preset.name}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {selectedBg === preset.id && (
                          <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white shadow">
                            <Check className="size-3" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-neutral/90">
                        <p className="text-[11px] font-bold truncate text-white">{preset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 4: Custom Image Upload */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                  Custom Background
                </p>
                <div className="flex items-center gap-3">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-dashed cursor-pointer transition-all ${
                      selectedBg === "custom"
                        ? "border-primary bg-primary/15 text-white"
                        : "border-white/20 bg-white/5 hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <Upload className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold">
                      {customFilePreview ? "Replace Custom Photo" : "Upload Custom Photo"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCustomUpload}
                      className="hidden"
                    />
                  </label>

                  {customFilePreview && (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-primary">
                      <img
                        src={customFilePreview}
                        alt="Custom Preview"
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCustom}
                        title="Remove custom photo"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity text-error"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "filter" && (
            <div className="grid grid-cols-3 gap-2.5">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFilter(item.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${item.color} ${
                    selectedFilter === item.id
                      ? "border-primary ring-2 ring-primary/50 shadow-lg font-bold"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  {selectedFilter === item.id && (
                    <Check className="size-3.5 text-primary mt-1" />
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === "ar" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AR_STICKERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAr(item.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                    selectedAr === item.id
                      ? "border-primary bg-primary/20 ring-2 ring-primary/50 text-white font-bold"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-xs font-semibold">{item.label}</span>
                  {selectedAr === item.id && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-white/50">
            {selectedBg === "none"
              ? "Using standard camera"
              : `Active: ${
                  VIRTUAL_BACKGROUND_PRESETS.find((p) => p.id === selectedBg)?.name ||
                  selectedBg
                }`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-md active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
