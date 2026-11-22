import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Image as ImageIcon,
  Type,
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
  Check,
  RotateCw,
  Maximize2,
} from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";
import { customToast as toast } from "../toast/customToastService.js";
import PrivacySelectorModal from "./PrivacySelectorModal.jsx";

/* =========================================================
   Constants
   ========================================================= */

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const GRADIENT_PRESETS = [
  {
    id: "purple-pink",
    value: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    label: "Sunset Aura",
  },
  {
    id: "blue-cyan",
    value: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    label: "Ocean Breeze",
  },
  {
    id: "amber-rose",
    value: "linear-gradient(135deg, #f59e0b, #ef4444)",
    label: "Warm Flame",
  },
  {
    id: "emerald-teal",
    value: "linear-gradient(135deg, #10b981, #064e3b)",
    label: "Emerald Deep",
  },
  {
    id: "violet-indigo",
    value: "linear-gradient(135deg, #6366f1, #4c1d95)",
    label: "Midnight Sky",
  },
  {
    id: "fuchsia-purple",
    value: "linear-gradient(135deg, #d946ef, #701a75)",
    label: "Cosmic Glow",
  },
  { id: "solid-dark", value: "#0f172a", label: "Onyx Dark" },
  { id: "solid-crimson", value: "#881337", label: "Velvet Crimson" },
];

const FONT_PRESETS = [
  { id: "sans", label: "Sans", family: "ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "Serif", family: "Georgia, 'Times New Roman', serif" },
  {
    id: "mono",
    label: "Mono",
    family: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  {
    id: "cursive",
    label: "Script",
    family: "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive",
  },
];

const FONT_FAMILY = Object.fromEntries(
  FONT_PRESETS.map((f) => [f.id, f.family]),
);

const COLOR_PRESETS = [
  { id: "white", value: "#FFFFFF", label: "White" },
  { id: "slate", value: "#1e293b", label: "Dark" },
  { id: "yellow", value: "#facc15", label: "Yellow" },
  { id: "cyan", value: "#22d3ee", label: "Cyan" },
  { id: "pink", value: "#f43f5e", label: "Pink" },
  { id: "green", value: "#4ade80", label: "Green" },
];

const TEXT_SIZE_PX = { sm: 16, md: 22, lg: 28, xl: 38 };

const STICKER_EMOJIS = [
  "✨",
  "🔥",
  "❤️",
  "😍",
  "🎉",
  "👏",
  "🚀",
  "💯",
  "⭐",
  "🌈",
  "☕",
  "🍕",
  "🌸",
  "🥳",
  "😎",
  "💪",
  "🙌",
  "✌️",
  "🎶",
  "💡",
  "🎈",
  "💖",
  "⚡",
  "🍀",
];

const PRIVACY_OPTIONS = [
  {
    id: "contacts",
    icon: Users,
    title: "My contacts",
    sub: "All accepted contacts",
  },
  {
    id: "everyone",
    icon: Globe,
    title: "Everyone",
    sub: "Visible to all users",
  },
  {
    id: "custom",
    icon: Lock,
    title: "Only share with…",
    sub: "Choose specific contacts",
  },
  {
    id: "excluded",
    icon: EyeOff,
    title: "Hide from…",
    sub: "Exclude specific contacts",
  },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* =========================================================
   Small presentational building blocks
   ========================================================= */

const Section = ({ title, action, children }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between min-h-6">
      <h3 className="text-sm font-semibold text-base-content">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const Row = ({ label, children }) => (
  <div className="flex items-center gap-3 min-h-8">
    <span className="w-14 shrink-0 text-xs text-base-content/60">{label}</span>
    <div className="flex items-center flex-wrap gap-2 min-w-0">{children}</div>
  </div>
);

const Segmented = ({ options, value, onChange, label }) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex p-0.5 rounded-lg bg-base-200 border border-base-300/70"
  >
    {options.map((o) => {
      const active = value === o.id;
      return (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={active}
          title={o.title || o.label}
          style={o.style}
          className={`h-7 min-w-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            active
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      );
    })}
  </div>
);

const Swatch = ({ color, label, active, onClick, size = "size-6" }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={`${size} rounded-full border border-base-content/15 grid place-items-center transition-transform cursor-pointer ${
      active
        ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
        : "hover:scale-110"
    }`}
    style={{ background: color }}
  >
    {active && <Check className="size-3 text-white mix-blend-difference" />}
  </button>
);

const RangeRow = ({
  icon: Icon,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => (
  <label className="flex items-center gap-2.5 text-xs text-base-content/60">
    <Icon className="size-3.5 shrink-0" aria-hidden />
    <span className="w-12 shrink-0">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="range range-primary range-xs grow"
    />
  </label>
);

/* =========================================================
   Main component
   ========================================================= */

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
  const [textAlignment, setTextAlignment] = useState("center");
  const [textSize, setTextSize] = useState("lg");
  const [selectedBg, setSelectedBg] = useState(GRADIENT_PRESETS[0]);
  const [selectedFont, setSelectedFont] = useState("sans");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [caption, setCaption] = useState("");

  // Overlays
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Privacy
  const [privacy, setPrivacy] = useState("contacts");
  const [selectedCustomUsers, setSelectedCustomUsers] = useState([]);
  const [selectedExcludedUsers, setSelectedExcludedUsers] = useState([]);
  const [privacyModalType, setPrivacyModalType] = useState(null);

  // Media
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(null);

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);

  /* ----- lifecycle ----- */

  const handleClose = useCallback(() => {
    if (isUploading) return;
    setCreatorOpen(false);
  }, [isUploading, setCreatorOpen]);

  useEffect(() => {
    if (!isCreatorOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !privacyModalType) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCreatorOpen, privacyModalType, handleClose]);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  if (!isCreatorOpen) return null;

  /* ----- media ----- */

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Max 50MB allowed.");
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMode("media");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ----- overlays ----- */

  const addTextOverlay = () => {
    const ov = {
      id: String(Date.now()),
      type: "text",
      content: "Tap to edit",
      x: 50,
      y: clamp(30 + overlays.length * 10, 10, 90),
      scale: 1,
      rotation: 0,
      color: "#FFFFFF",
      font: "sans",
    };
    setOverlays((p) => [...p, ov]);
    setSelectedOverlayId(ov.id);
    setShowStickerPicker(false);
  };

  const addEmojiOverlay = (emoji) => {
    const ov = {
      id: String(Date.now()),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 50,
      scale: 1.5,
      rotation: 0,
    };
    setOverlays((p) => [...p, ov]);
    setSelectedOverlayId(ov.id);
    setShowStickerPicker(false);
  };

  const removeOverlay = (id) => {
    setOverlays((p) => p.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  const updateSelectedOverlay = (patch) => {
    if (!selectedOverlayId) return;
    setOverlays((p) =>
      p.map((o) => (o.id === selectedOverlayId ? { ...o, ...patch } : o)),
    );
  };

  const onOverlayPointerDown = (e, id) => {
    e.stopPropagation();
    setSelectedOverlayId(id);
    dragRef.current = { id };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onOverlayPointerMove = (e) => {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 4, 96);
    const { id } = dragRef.current;
    setOverlays((p) => p.map((o) => (o.id === id ? { ...o, x, y } : o)));
  };

  const onOverlayPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /* ----- publish ----- */

  const canPublish =
    mode === "text" ? Boolean(textContent.trim()) : Boolean(mediaFile);

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
        }),
      );
    } else {
      if (!mediaFile) {
        toast.error("Please select a photo or video.");
        return;
      }
      const isVideo = mediaFile.type.startsWith("video/");
      formData.append("mediaType", isVideo ? "video" : "image");
      formData.append("media", mediaFile);
      if (caption.trim()) formData.append("caption", caption.trim());
    }

    try {
      await createStory(formData);
      setTextContent("");
      setCaption("");
      setOverlays([]);
      setSelectedOverlayId(null);
      clearMedia();
    } catch (_err) {
      // Toast handled by store
    }
  };

  /* ----- derived ----- */

  const alignClass =
    textAlignment === "left"
      ? "text-left"
      : textAlignment === "right"
        ? "text-right"
        : "text-center";

  const audience = PRIVACY_OPTIONS.find((p) => p.id === privacy);
  const audienceCount =
    privacy === "custom"
      ? selectedCustomUsers.length
      : privacy === "excluded"
        ? selectedExcludedUsers.length
        : 0;

  /* ----- overlay renderer ----- */

  const renderOverlays = () =>
    overlays.map((ov) => {
      const active = selectedOverlayId === ov.id;
      return (
        <div
          key={ov.id}
          onPointerDown={(e) => onOverlayPointerDown(e, ov.id)}
          onPointerMove={onOverlayPointerMove}
          onPointerUp={onOverlayPointerUp}
          onPointerCancel={onOverlayPointerUp}
          style={{
            left: `${ov.x}%`,
            top: `${ov.y}%`,
            transform: `translate(-50%, -50%) scale(${ov.scale}) rotate(${ov.rotation || 0}deg)`,
            color: ov.color || "#FFFFFF",
            fontFamily:
              ov.type === "text"
                ? FONT_FAMILY[ov.font] || FONT_FAMILY.sans
                : undefined,
            touchAction: "none",
          }}
          className={`absolute z-20 cursor-grab active:cursor-grabbing whitespace-nowrap rounded-md px-1.5 py-0.5 ${
            active
              ? "outline-1 outline-dashed outline-white/90 bg-black/20"
              : "hover:outline hover:outline-white/40"
          }`}
        >
          {ov.type === "emoji" ? (
            <span className="text-3xl select-none leading-none">
              {ov.content}
            </span>
          ) : (
            <span className="text-base font-bold select-none [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              {ov.content}
            </span>
          )}
        </div>
      );
    });

  /* =========================================================
     Render
     ========================================================= */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 select-none"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[94vh] bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden text-base-content">
        {/* Upload progress */}
        {isUploading && (
          <div className="absolute top-0 inset-x-0 z-50 h-1 bg-primary/15">
            <div
              className="h-full bg-primary transition-all duration-150 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* ---------- Header ---------- */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-base-200 shrink-0">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base font-semibold">New story</h2>
            <span className="text-xs text-base-content/50">
              Visible for 24 hours
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Close"
            className="btn btn-ghost btn-sm btn-circle text-base-content/60 disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* ---------- Body ---------- */}
        <div className="grow min-h-0 overflow-y-auto md:overflow-hidden grid md:grid-cols-[320px_1fr]">
          {/* Preview column */}
          <aside className="p-6 bg-base-200/40 md:border-r border-base-200 flex justify-center items-start md:items-center">
            <div
              ref={previewRef}
              onPointerDown={() => setSelectedOverlayId(null)}
              onDragOver={
                mode === "media" && !mediaPreview
                  ? (e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }
                  : undefined
              }
              onDragLeave={() => setIsDragging(false)}
              onDrop={
                mode === "media" && !mediaPreview ? handleDrop : undefined
              }
              className="relative w-full max-w-[260px] aspect-[9/16] max-h-[64vh] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10 bg-neutral"
              style={
                mode === "text"
                  ? { background: selectedBg.value, color: textColor }
                  : undefined
              }
            >
              {mode === "text" ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={500}
                    placeholder="Type something…"
                    aria-label="Story text"
                    rows={5}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-full bg-transparent focus:outline-none resize-none leading-snug placeholder-white/40 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)] ${alignClass}`}
                    style={{
                      fontSize: TEXT_SIZE_PX[textSize],
                      fontWeight: textSize === "sm" ? 500 : 700,
                      fontFamily: FONT_FAMILY[selectedFont],
                      color: textColor,
                    }}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] text-white/60 pointer-events-none">
                    {textContent.length}/500
                  </span>
                </div>
              ) : mediaPreview ? (
                <>
                  {mediaFile?.type.startsWith("video/") ? (
                    <video
                      src={mediaPreview}
                      controls
                      playsInline
                      className="absolute inset-0 size-full object-contain"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Story preview"
                      draggable={false}
                      className="absolute inset-0 size-full object-contain"
                    />
                  )}
                  {caption.trim() && (
                    <div className="absolute bottom-0 inset-x-0 z-10 px-4 pt-10 pb-4 bg-gradient-to-t from-black/70 to-transparent text-white text-sm text-center pointer-events-none">
                      {caption}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearMedia();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Remove media"
                    className="absolute top-3 right-3 z-30 grid place-items-center size-7 rounded-full bg-black/60 text-white hover:bg-black/85 transition-colors cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6 text-center transition-colors cursor-pointer border-2 border-dashed rounded-2xl ${
                    isDragging
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-content/20 bg-base-200 text-base-content hover:border-primary/60"
                  }`}
                >
                  <Upload className="size-6 text-base-content/50" />
                  <span className="text-sm font-medium">
                    Upload photo or video
                  </span>
                  <span className="text-xs text-base-content/50">
                    Drag &amp; drop, or click · up to 50MB
                  </span>
                </button>
              )}

              {renderOverlays()}
            </div>
          </aside>

          {/* Controls column */}
          <div className="md:overflow-y-auto px-6 py-5 space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />

            {/* Mode tabs */}
            <div
              role="tablist"
              className="flex gap-6 border-b border-base-200 -mx-6 px-6"
            >
              {[
                { id: "text", icon: Type, label: "Text" },
                { id: "media", icon: ImageIcon, label: "Photo / Video" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    if (id === "media" && !mediaFile)
                      fileInputRef.current?.click();
                  }}
                  className={`flex items-center gap-2 pb-3 -mb-px text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    mode === id
                      ? "border-primary text-primary"
                      : "border-transparent text-base-content/60 hover:text-base-content"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Mode-specific */}
            {mode === "text" ? (
              <>
                <Section title="Text style">
                  <div className="space-y-2">
                    <Row label="Align">
                      <Segmented
                        label="Text alignment"
                        value={textAlignment}
                        onChange={setTextAlignment}
                        options={[
                          {
                            id: "left",
                            title: "Align left",
                            icon: <AlignLeft className="size-3.5" />,
                          },
                          {
                            id: "center",
                            title: "Align center",
                            icon: <AlignCenter className="size-3.5" />,
                          },
                          {
                            id: "right",
                            title: "Align right",
                            icon: <AlignRight className="size-3.5" />,
                          },
                        ]}
                      />
                    </Row>
                    <Row label="Size">
                      <Segmented
                        label="Text size"
                        value={textSize}
                        onChange={setTextSize}
                        options={["sm", "md", "lg", "xl"].map((s) => ({
                          id: s,
                          label: s.toUpperCase(),
                        }))}
                      />
                    </Row>
                    <Row label="Font">
                      <Segmented
                        label="Font family"
                        value={selectedFont}
                        onChange={setSelectedFont}
                        options={FONT_PRESETS.map((f) => ({
                          id: f.id,
                          label: f.label,
                          style: { fontFamily: f.family },
                        }))}
                      />
                    </Row>
                    <Row label="Color">
                      {COLOR_PRESETS.map((c) => (
                        <Swatch
                          key={c.id}
                          color={c.value}
                          label={`Text color ${c.label}`}
                          active={textColor === c.value}
                          onClick={() => setTextColor(c.value)}
                        />
                      ))}
                    </Row>
                  </div>
                </Section>

                <Section title="Background">
                  <div className="flex flex-wrap gap-3">
                    {GRADIENT_PRESETS.map((bg) => (
                      <Swatch
                        key={bg.id}
                        color={bg.value}
                        label={bg.label}
                        size="size-8"
                        active={selectedBg.id === bg.id}
                        onClick={() => setSelectedBg(bg)}
                      />
                    ))}
                  </div>
                </Section>
              </>
            ) : (
              <Section
                title="Caption"
                action={
                  <span className="text-xs text-base-content/40">
                    {caption.length}/300
                  </span>
                }
              >
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Add a caption (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="input input-bordered input-sm w-full text-sm"
                />
              </Section>
            )}

            {/* Overlays */}
            <Section
              title={
                overlays.length > 0
                  ? `Overlays (${overlays.length})`
                  : "Overlays"
              }
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addTextOverlay}
                    className="btn btn-sm btn-ghost border border-base-300 gap-1.5 font-medium"
                  >
                    <Plus className="size-3.5" /> Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStickerPicker((s) => !s)}
                    className={`btn btn-sm border gap-1.5 font-medium ${
                      showStickerPicker
                        ? "btn-primary border-primary"
                        : "btn-ghost border-base-300"
                    }`}
                  >
                    <Smile className="size-3.5" /> Sticker
                  </button>
                </div>
              }
            >
              {showStickerPicker && (
                <div className="p-2 rounded-xl border border-base-300 bg-base-100 grid grid-cols-8 gap-0.5 text-xl">
                  {STICKER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmojiOverlay(emoji)}
                      className="aspect-square grid place-items-center rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {overlays.length === 0 && !showStickerPicker && (
                <p className="text-xs text-base-content/50">
                  Add text or stickers, then drag them on the preview to
                  reposition.
                </p>
              )}

              {selectedOverlay && (
                <div className="p-4 rounded-xl border border-base-300 bg-base-200/40 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-base-content/70">
                      {selectedOverlay.type === "emoji"
                        ? "Selected sticker"
                        : "Selected text"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOverlay(selectedOverlay.id)}
                      className="btn btn-ghost btn-xs text-error gap-1"
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  </div>

                  {selectedOverlay.type === "text" && (
                    <>
                      <input
                        type="text"
                        value={selectedOverlay.content}
                        onChange={(e) =>
                          updateSelectedOverlay({ content: e.target.value })
                        }
                        maxLength={60}
                        className="input input-bordered input-sm w-full text-sm"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {COLOR_PRESETS.map((c) => (
                            <Swatch
                              key={c.id}
                              color={c.value}
                              label={`Overlay color ${c.label}`}
                              size="size-5"
                              active={selectedOverlay.color === c.value}
                              onClick={() =>
                                updateSelectedOverlay({ color: c.value })
                              }
                            />
                          ))}
                        </div>
                        <select
                          value={selectedOverlay.font || "sans"}
                          onChange={(e) =>
                            updateSelectedOverlay({ font: e.target.value })
                          }
                          className="select select-bordered select-xs"
                          aria-label="Overlay font"
                        >
                          {FONT_PRESETS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <RangeRow
                    icon={Maximize2}
                    label="Size"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={selectedOverlay.scale}
                    onChange={(v) => updateSelectedOverlay({ scale: v })}
                  />
                  <RangeRow
                    icon={RotateCw}
                    label="Rotate"
                    min={-180}
                    max={180}
                    step={5}
                    value={selectedOverlay.rotation || 0}
                    onChange={(v) => updateSelectedOverlay({ rotation: v })}
                  />
                </div>
              )}
            </Section>

            {/* Privacy */}
            <Section title="Who can see this">
              <div
                role="radiogroup"
                aria-label="Story audience"
                className="rounded-xl border border-base-300 divide-y divide-base-200 overflow-hidden"
              >
                {PRIVACY_OPTIONS.map(({ id, icon: Icon, title, sub }) => {
                  const active = privacy === id;
                  const count =
                    id === "custom"
                      ? selectedCustomUsers.length
                      : id === "excluded"
                        ? selectedExcludedUsers.length
                        : 0;
                  const subtitle =
                    count > 0 ? `${count} selected · tap to edit` : sub;

                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setPrivacy(id);
                        if (id === "custom" || id === "excluded")
                          setPrivacyModalType(id);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                        active ? "bg-primary/5" : "hover:bg-base-200/60"
                      }`}
                    >
                      <Icon
                        className={`size-4 shrink-0 ${active ? "text-primary" : "text-base-content/50"}`}
                      />
                      <span className="flex flex-col grow min-w-0">
                        <span className="text-sm font-medium">{title}</span>
                        <span className="text-xs text-base-content/50 truncate">
                          {subtitle}
                        </span>
                      </span>
                      <span
                        className={`grid place-items-center size-4.5 rounded-full border shrink-0 ${
                          active
                            ? "border-primary bg-primary text-primary-content"
                            : "border-base-content/25"
                        }`}
                      >
                        {active && <Check className="size-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <footer className="flex items-center justify-between gap-3 px-6 h-16 border-t border-base-200 shrink-0 bg-base-100">
          <span className="text-xs text-base-content/55 truncate hidden sm:block">
            Sharing with{" "}
            <span className="font-medium text-base-content/80">
              {audience?.title.replace("…", "")}
            </span>
            {audienceCount > 0 && ` (${audienceCount})`}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isUploading || !canPublish}
              className="btn btn-primary btn-sm px-6 gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Sharing {uploadProgress}%</span>
                </>
              ) : (
                <span>Share story</span>
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* Privacy selector */}
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
            if (privacyModalType === "custom") setSelectedCustomUsers(selected);
            else setSelectedExcludedUsers(selected);
          }}
          onClose={() => setPrivacyModalType(null)}
        />
      )}
    </div>
  );
};

export default StoryCreatorModal;
