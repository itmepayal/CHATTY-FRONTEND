import { useState, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Type,
  Sparkles,
  Lock,
  Globe,
  Users,
  EyeOff,
  Upload,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
  Trash2,
  Plus,
} from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";
import { useContactStore } from "../../store/useContactStore.js";
import { customToast as toast } from "../toast/customToastService.js";
import PrivacySelectorModal from "./PrivacySelectorModal.jsx";

const GRADIENT_PRESETS = [
  { id: "purple-pink", value: "linear-gradient(135deg, #ec4899, #8b5cf6)", label: "Sunset Aura" },
  { id: "blue-cyan", value: "linear-gradient(135deg, #06b6d4, #3b82f6)", label: "Ocean Breeze" },
  { id: "amber-rose", value: "linear-gradient(135deg, #f59e0b, #ef4444)", label: "Warm Flame" },
  { id: "emerald-teal", value: "linear-gradient(135deg, #10b981, #064e3b)", label: "Emerald Deep" },
  { id: "violet-indigo", value: "linear-gradient(135deg, #6366f1, #4c1d95)", label: "Midnight Sky" },
  { id: "fuchsia-purple", value: "linear-gradient(135deg, #d946ef, #701a75)", label: "Cosmic Glow" },
  { id: "solid-dark", value: "#0f172a", label: "Onyx Dark" },
  { id: "solid-crimson", value: "#881337", label: "Velvet Crimson" },
];

const FONT_PRESETS = [
  { id: "sans", label: "Sans", style: "font-sans" },
  { id: "serif", label: "Serif", style: "font-serif" },
  { id: "mono", label: "Mono", style: "font-mono" },
  { id: "cursive", label: "Script", style: "font-cursive" },
];

const COLOR_PRESETS = [
  { id: "white", value: "#FFFFFF", label: "White" },
  { id: "slate", value: "#1e293b", label: "Dark" },
  { id: "yellow", value: "#facc15", label: "Yellow" },
  { id: "cyan", value: "#22d3ee", label: "Cyan" },
  { id: "pink", value: "#f43f5e", label: "Pink" },
  { id: "green", value: "#4ade80", label: "Green" },
];

const STICKER_EMOJIS = [
  "✨", "🔥", "❤️", "😍", "🎉", "👏", "🚀", "💯",
  "⭐", "🌈", "☕", "🍕", "🌸", "🥳", "😎", "💪",
  "🙌", "✌️", "🎶", "💡", "🎈", "💖", "⚡", "🍀",
];

export const StoryCreatorModal = () => {
  const {
    isCreatorOpen,
    setCreatorOpen,
    createStory,
    isUploading,
    uploadProgress,
  } = useStoryStore();

  const [mode, setMode] = useState("text"); // "text" | "media"
  const [textContent, setTextContent] = useState("");
  const [textAlignment, setTextAlignment] = useState("center"); // "left" | "center" | "right"
  const [textSize, setTextSize] = useState("lg"); // "sm" | "md" | "lg" | "xl"
  const [selectedBg, setSelectedBg] = useState(GRADIENT_PRESETS[0]);
  const [selectedFont, setSelectedFont] = useState("sans");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [caption, setCaption] = useState("");

  // Creative Overlays State
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Privacy State
  const [privacy, setPrivacy] = useState("contacts"); // "everyone" | "contacts" | "custom" | "excluded"
  const [selectedCustomUsers, setSelectedCustomUsers] = useState([]);
  const [selectedExcludedUsers, setSelectedExcludedUsers] = useState([]);
  const [privacyModalType, setPrivacyModalType] = useState(null); // null | "custom" | "excluded"

  // Media Upload State
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  if (!isCreatorOpen) return null;

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Max 50MB allowed.");
      return;
    }
    setMediaFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMediaPreview(objectUrl);
    setMode("media");
  };

  const handleFileChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Overlay operations
  const addTextOverlay = () => {
    const newOverlay = {
      id: String(Date.now()),
      type: "text",
      content: "Double tap to edit",
      x: 50,
      y: 40 + overlays.length * 10,
      scale: 1,
      color: "#FFFFFF",
      font: "sans",
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const addEmojiOverlay = (emoji) => {
    const newOverlay = {
      id: String(Date.now()),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 50,
      scale: 1.5,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setShowStickerPicker(false);
  };

  const removeOverlay = (id) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  const updateSelectedOverlay = (key, val) => {
    if (!selectedOverlayId) return;
    setOverlays((prev) =>
      prev.map((o) => (o.id === selectedOverlayId ? { ...o, [key]: val } : o))
    );
  };

  const handlePublish = async () => {
    if (isUploading) return;

    const formData = new FormData();
    formData.append("privacy", privacy);

    if (privacy === "custom") {
      formData.append("allowedViewers", JSON.stringify(selectedCustomUsers));
    } else if (privacy === "excluded") {
      formData.append("excludedViewers", JSON.stringify(selectedExcludedUsers));
    }

    if (overlays.length > 0) {
      formData.append("overlays", JSON.stringify(overlays));
    }

    if (mode === "text") {
      if (!textContent.trim()) {
        toast.error("Please enter text for your story.");
        return;
      }
      formData.append("mediaType", "text");
      formData.append("textContent", textContent.trim());
      formData.append("textAlignment", textAlignment);
      formData.append("textSize", textSize);
      formData.append(
        "background",
        JSON.stringify({
          type: selectedBg.value.startsWith("linear") ? "gradient" : "color",
          value: selectedBg.value,
          textColor,
          font: selectedFont,
        })
      );
    } else {
      if (!mediaFile) {
        toast.error("Please select a photo or video.");
        return;
      }
      const isVideo = mediaFile.type.startsWith("video/");
      formData.append("mediaType", isVideo ? "video" : "image");
      formData.append("media", mediaFile);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }
    }

    try {
      await createStory(formData);
      // Reset state
      setTextContent("");
      setCaption("");
      setOverlays([]);
      clearMedia();
    } catch (_err) {
      // Toast handled by store
    }
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-xl max-h-[94vh] bg-[#101827] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 text-[#F8FAFC]">
        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="absolute top-0 inset-x-0 z-50 h-1.5 bg-[#22C7F2]/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#22C7F2] to-[#397BFF] transition-all duration-150 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#0B1120]/60">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-[#22C7F2] drop-shadow-[0_0_8px_rgba(34,199,242,0.5)]" />
            <h2 className="text-base font-bold text-[#F8FAFC]">Create Story</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#22C7F2]/10 text-[#22C7F2] border border-[#22C7F2]/30 text-[10px] font-semibold">
              24h Status
            </span>
          </div>

          <button
            onClick={() => !isUploading && setCreatorOpen(false)}
            disabled={isUploading}
            className="p-1.5 rounded-full text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Content Mode Switcher */}
        <div className="flex border-b border-white/10 bg-[#0B1120] p-1.5">
          <button
            onClick={() => setMode("text")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              mode === "text"
                ? "bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold shadow-md"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <Type className="size-3.5" />
            <span>Text Status</span>
          </button>

          <button
            onClick={() => {
              setMode("media");
              if (!mediaFile && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              mode === "media"
                ? "bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold shadow-md"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            <ImageIcon className="size-3.5" />
            <span>Photo / Video</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 grow">
          {mode === "text" ? (
            /* TEXT STORY CREATOR */
            <div className="space-y-3.5">
              {/* Live Preview Box with Overlays */}
              <div
                className="relative h-64 sm:h-72 w-full rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-inner overflow-hidden transition-all duration-300 border border-white/10"
                style={{
                  background: selectedBg.value,
                  color: textColor,
                }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  maxLength={500}
                  placeholder="Type your status story here..."
                  className={`w-full bg-transparent focus:outline-none resize-none leading-relaxed drop-shadow-md placeholder-white/40 ${
                    textAlignment === "left"
                      ? "text-left"
                      : textAlignment === "right"
                      ? "text-right"
                      : "text-center"
                  } ${
                    textSize === "sm"
                      ? "text-sm"
                      : textSize === "md"
                      ? "text-base sm:text-lg"
                      : textSize === "xl"
                      ? "text-2xl sm:text-3xl font-extrabold"
                      : "text-lg sm:text-xl font-bold"
                  } ${
                    selectedFont === "serif"
                      ? "font-serif"
                      : selectedFont === "mono"
                      ? "font-mono"
                      : selectedFont === "cursive"
                      ? "font-cursive"
                      : "font-sans"
                  }`}
                  rows={4}
                />

                {/* Overlays on Preview */}
                {overlays.map((ov) => (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedOverlayId(ov.id)}
                    style={{
                      left: `${ov.x}%`,
                      top: `${ov.y}%`,
                      transform: `translate(-50%, -50%) scale(${ov.scale}) rotate(${ov.rotation || 0}deg)`,
                      color: ov.color || "#FFFFFF",
                    }}
                    className={`absolute cursor-pointer transition-all ${
                      selectedOverlayId === ov.id
                        ? "ring-2 ring-[#22C7F2] ring-offset-2 ring-offset-black/50 rounded-lg p-1 bg-black/40"
                        : "hover:scale-105"
                    }`}
                  >
                    {ov.type === "emoji" ? (
                      <span className="text-2xl select-none">{ov.content}</span>
                    ) : (
                      <span className="text-sm font-semibold select-none drop-shadow-md">
                        {ov.content}
                      </span>
                    )}
                  </div>
                ))}

                <div className="absolute bottom-2 right-3 text-[10px] text-white/70">
                  {textContent.length}/500
                </div>
              </div>

              {/* Formatting Toolbar: Alignment & Size */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#151F30] border border-white/10">
                {/* Alignment */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTextAlignment("left")}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      textAlignment === "left"
                        ? "bg-[#22C7F2]/20 text-[#22C7F2]"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <AlignLeft className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setTextAlignment("center")}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      textAlignment === "center"
                        ? "bg-[#22C7F2]/20 text-[#22C7F2]"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <AlignCenter className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setTextAlignment("right")}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      textAlignment === "right"
                        ? "bg-[#22C7F2]/20 text-[#22C7F2]"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <AlignRight className="size-3.5" />
                  </button>
                </div>

                {/* Size */}
                <div className="flex items-center gap-1 text-xs">
                  {["sm", "md", "lg", "xl"].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTextSize(sz)}
                      className={`px-2 py-1 rounded-lg font-bold uppercase text-[10px] cursor-pointer transition-colors ${
                        textSize === sz
                          ? "bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                {/* Text Color */}
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setTextColor(col.value)}
                      title={col.label}
                      className={`size-5 rounded-full border border-white/20 transition-transform ${
                        textColor === col.value ? "ring-2 ring-[#22C7F2] scale-110" : ""
                      }`}
                      style={{ background: col.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color & Gradient Palette */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#94A3B8]">
                  Background Style
                </span>
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
                  {GRADIENT_PRESETS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBg(bg)}
                      title={bg.label}
                      className={`size-8 rounded-full shrink-0 transition-transform cursor-pointer shadow-md ${
                        selectedBg.id === bg.id
                          ? "ring-2 ring-[#22C7F2] ring-offset-2 ring-offset-[#101827] scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ background: bg.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Typography / Font Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#94A3B8]">
                  Font Family
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFont(f.id)}
                      className={`py-1.5 px-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                        selectedFont === f.id
                          ? "border-[#22C7F2] bg-[#22C7F2]/15 text-[#22C7F2] font-bold"
                          : "border-white/10 bg-[#151F30] text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* MEDIA STORY CREATOR */
            <div className="space-y-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />

              {mediaPreview ? (
                <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                  {mediaFile?.type.startsWith("video/") ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="size-full object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Media preview"
                      className="size-full object-contain"
                    />
                  )}

                  {/* Overlays on Media Preview */}
                  {overlays.map((ov) => (
                    <div
                      key={ov.id}
                      onClick={() => setSelectedOverlayId(ov.id)}
                      style={{
                        left: `${ov.x}%`,
                        top: `${ov.y}%`,
                        transform: `translate(-50%, -50%) scale(${ov.scale}) rotate(${ov.rotation || 0}deg)`,
                        color: ov.color || "#FFFFFF",
                      }}
                      className={`absolute cursor-pointer transition-all z-20 ${
                        selectedOverlayId === ov.id
                          ? "ring-2 ring-[#22C7F2] ring-offset-2 ring-offset-black/50 rounded-lg p-1 bg-black/50"
                          : "hover:scale-105"
                      }`}
                    >
                      {ov.type === "emoji" ? (
                        <span className="text-2xl select-none">{ov.content}</span>
                      ) : (
                        <span className="text-sm font-semibold select-none drop-shadow-md">
                          {ov.content}
                        </span>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={clearMedia}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-30"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-64 sm:h-72 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragging
                      ? "border-[#22C7F2] bg-[#22C7F2]/10"
                      : "border-white/20 hover:border-[#22C7F2]/60 bg-[#151F30]/40"
                  }`}
                >
                  <div className="size-12 rounded-full bg-[#22C7F2]/10 text-[#22C7F2] flex items-center justify-center">
                    <Upload className="size-6" />
                  </div>
                  <span className="text-sm font-semibold text-[#F8FAFC]">
                    Drag and drop or click to upload
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    Supports JPG, PNG, WEBP, MP4 (Max 50MB)
                  </span>
                </div>
              )}

              {/* Caption Input */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#94A3B8]">
                  Caption (Optional)
                </span>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-[#151F30] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-white/40 focus:outline-none focus:border-[#22C7F2] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Creative Editing: Text & Sticker Overlays Section */}
          <div className="p-3 rounded-2xl bg-[#151F30] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#22C7F2]" />
                <span>Creative Overlays</span>
                {overlays.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#22C7F2]/20 text-[#22C7F2] text-[10px] font-bold">
                    {overlays.length}
                  </span>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={addTextOverlay}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-[#22C7F2]/40 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="size-3 text-[#22C7F2]" />
                  <span>Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStickerPicker(!showStickerPicker)}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-[#22C7F2]/40 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Smile className="size-3 text-[#22C7F2]" />
                  <span>Sticker</span>
                </button>
              </div>
            </div>

            {/* Sticker Picker Popup */}
            {showStickerPicker && (
              <div className="p-2.5 rounded-xl bg-[#101827] border border-white/10 grid grid-cols-8 gap-1.5 text-xl">
                {STICKER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmojiOverlay(emoji)}
                    className="p-1 hover:scale-125 transition-transform text-center cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Overlay Position & Text Control */}
            {selectedOverlay && (
              <div className="p-2.5 rounded-xl bg-[#101827] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#22C7F2]">
                    Edit {selectedOverlay.type === "emoji" ? "Sticker" : "Text"}
                  </span>
                  <button
                    onClick={() => removeOverlay(selectedOverlay.id)}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Trash2 className="size-3" />
                    <span>Delete</span>
                  </button>
                </div>

                {selectedOverlay.type === "text" && (
                  <input
                    type="text"
                    value={selectedOverlay.content}
                    onChange={(e) => updateSelectedOverlay("content", e.target.value)}
                    className="w-full bg-[#151F30] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22C7F2]"
                  />
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <span>Vertical</span>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={selectedOverlay.y}
                      onChange={(e) => updateSelectedOverlay("y", Number(e.target.value))}
                      className="grow accent-[#22C7F2]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Horizontal</span>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={selectedOverlay.x}
                      onChange={(e) => updateSelectedOverlay("x", Number(e.target.value))}
                      className="grow accent-[#22C7F2]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Controls */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-xs font-semibold text-[#94A3B8] flex items-center gap-1.5">
              <Lock className="size-3.5 text-[#22C7F2]" />
              <span>Audience & Privacy</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                onClick={() => setPrivacy("contacts")}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  privacy === "contacts"
                    ? "border-[#22C7F2] bg-[#22C7F2]/10 text-[#22C7F2] font-semibold"
                    : "border-white/10 bg-[#151F30]/40 hover:bg-[#151F30] text-[#94A3B8]"
                }`}
              >
                <Users className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[#F8FAFC]">My Contacts</span>
                  <span className="text-[10px] font-normal opacity-70">
                    All accepted contacts
                  </span>
                </div>
              </label>

              <label
                onClick={() => setPrivacy("everyone")}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  privacy === "everyone"
                    ? "border-[#22C7F2] bg-[#22C7F2]/10 text-[#22C7F2] font-semibold"
                    : "border-white/10 bg-[#151F30]/40 hover:bg-[#151F30] text-[#94A3B8]"
                }`}
              >
                <Globe className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[#F8FAFC]">Everyone</span>
                  <span className="text-[10px] font-normal opacity-70">
                    Public to all users
                  </span>
                </div>
              </label>

              <label
                onClick={() => {
                  setPrivacy("custom");
                  setPrivacyModalType("custom");
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  privacy === "custom"
                    ? "border-[#22C7F2] bg-[#22C7F2]/10 text-[#22C7F2] font-semibold"
                    : "border-white/10 bg-[#151F30]/40 hover:bg-[#151F30] text-[#94A3B8]"
                }`}
              >
                <Lock className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[#F8FAFC]">Custom Contacts</span>
                  <span className="text-[10px] font-normal opacity-70">
                    {selectedCustomUsers.length > 0
                      ? `${selectedCustomUsers.length} selected`
                      : "Choose who can see"}
                  </span>
                </div>
              </label>

              <label
                onClick={() => {
                  setPrivacy("excluded");
                  setPrivacyModalType("excluded");
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  privacy === "excluded"
                    ? "border-[#22C7F2] bg-[#22C7F2]/10 text-[#22C7F2] font-semibold"
                    : "border-white/10 bg-[#151F30]/40 hover:bg-[#151F30] text-[#94A3B8]"
                }`}
              >
                <EyeOff className="size-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[#F8FAFC]">Hide From</span>
                  <span className="text-[10px] font-normal opacity-70">
                    {selectedExcludedUsers.length > 0
                      ? `${selectedExcludedUsers.length} excluded`
                      : "Hide from specific contacts"}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 bg-[#0B1120]/60">
          <span className="text-xs text-[#94A3B8]">
            Expires in 24 hours
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCreatorOpen(false)}
              disabled={isUploading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handlePublish}
              disabled={isUploading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(34,199,242,0.35)] transition-all cursor-pointer flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Sharing ({uploadProgress}%)...</span>
                </>
              ) : (
                <span>Share Story</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Privacy Selector Modal */}
      {privacyModalType && (
        <PrivacySelectorModal
          open={Boolean(privacyModalType)}
          title={
            privacyModalType === "custom"
              ? "Share with Specific Contacts"
              : "Hide Story From Contacts"
          }
          description={
            privacyModalType === "custom"
              ? "Only the selected contacts will be able to view this story"
              : "The selected contacts will not be able to view this story"
          }
          initialSelected={
            privacyModalType === "custom"
              ? selectedCustomUsers
              : selectedExcludedUsers
          }
          onConfirm={(selected) => {
            if (privacyModalType === "custom") {
              setSelectedCustomUsers(selected);
            } else {
              setSelectedExcludedUsers(selected);
            }
          }}
          onClose={() => setPrivacyModalType(null)}
        />
      )}
    </div>
  );
};

export default StoryCreatorModal;
