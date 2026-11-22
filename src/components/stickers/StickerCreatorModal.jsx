import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Plus, Image, Sparkles, Check, Trash2 } from "lucide-react";
import { useStickerStore } from "../../store/useStickerStore.js";
import { customToast as toast } from "../toast/customToastService.js";

const DEFAULT_CATEGORIES = [
  { slug: "reactions", name: "Reactions" },
  { slug: "funny", name: "Funny & Memes" },
  { slug: "love", name: "Love & Romance" },
  { slug: "animals", name: "Animals & Pets" },
  { slug: "gaming", name: "Gaming" },
  { slug: "celebration", name: "Party & Celebration" },
  { slug: "emotions", name: "Emotions" },
  { slug: "work", name: "Work & Office" },
  { slug: "anime", name: "Anime & Chibi" },
  { slug: "festivals", name: "Festivals" },
  { slug: "greetings", name: "Greetings" },
  { slug: "daily", name: "Daily Conversations" },
  { slug: "custom", name: "Creator Custom" },
];

export default function StickerCreatorModal({ isOpen, onClose }) {
  const {
    categories,
    createPackDraft,
    uploadStickersToPack,
    submitPackForReview,
  } = useStickerStore();

  const [step, setStep] = useState(1); // 1 = Details, 2 = Upload Stickers
  const [createdPack, setCreatedPack] = useState(null);

  // Step 1 Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("reactions");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isAnimated, setIsAnimated] = useState(false);
  const [coinPrice, setCoinPrice] = useState(0);

  // Step 2 Upload Files
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableCategories =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a pack name");
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isAnimated,
      coinPrice: Number(coinPrice) || 0,
      isPremium: Number(coinPrice) > 0,
    };

    const draft = await createPackDraft(payload);
    if (draft) {
      setCreatedPack(draft);
      setStep(2);
    }
  };

  const handleFilesSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    // Filter valid image types
    const validFiles = selected.filter((file) =>
      ["image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.type),
    );

    if (validFiles.length < selected.length) {
      toast.info("Some files were skipped. Only PNG, WebP, GIF, and SVG are supported.");
    }

    if (!validFiles.length) return;

    setFiles((prev) => [...prev, ...validFiles]);
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadAndPublish = async () => {
    if (!files.length) {
      toast.error("Please select at least 1 sticker file to upload");
      return;
    }

    setIsSubmitting(true);
    const packId = createdPack._id || createdPack.id;

    // 1. Upload sticker images
    const uploadRes = await uploadStickersToPack(packId, files);
    if (uploadRes) {
      // 2. Submit for review
      await submitPackForReview(packId);
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-base-100 border border-base-300 shadow-2xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-base-300">
            <div>
              <h3 className="text-lg font-bold text-base-content">
                Sticker Creator Studio
              </h3>
              <p className="text-xs text-base-content/60">
                {step === 1 ? "Step 1: Pack Information" : "Step 2: Upload Artwork"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-base-200 text-base-content/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: Pack Info Form */}
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-base-content/70 block mb-1">
                  Pack Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Playful Kittens"
                  className="w-full px-3.5 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 focus:outline-none focus:border-primary text-base-content"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-base-content/70 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 focus:outline-none focus:border-primary text-base-content capitalize"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-base-content/70 block mb-1">
                    Coin Price (0 = Free)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={coinPrice}
                    onChange={(e) => setCoinPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 focus:outline-none focus:border-primary text-base-content"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-base-content/70 block mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your stickers..."
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 focus:outline-none focus:border-primary text-base-content"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-base-content/70 block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cat, cute, funny, happy"
                  className="w-full px-3.5 py-2 text-xs bg-base-200/50 rounded-xl border border-base-300 focus:outline-none focus:border-primary text-base-content"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="animatedCheck"
                  checked={isAnimated}
                  onChange={(e) => setIsAnimated(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-sm rounded-lg"
                />
                <label
                  htmlFor="animatedCheck"
                  className="text-xs font-semibold text-base-content cursor-pointer"
                >
                  Contains Animated Stickers (WebP / GIF)
                </label>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm rounded-xl font-bold px-5"
                >
                  Continue to Upload Art →
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Upload Files */
            <div className="space-y-4 mt-4">
              <label className="border-2 border-dashed border-base-300 hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-base-200/30 transition-colors">
                <Upload className="w-8 h-8 text-primary mb-2" />
                <span className="text-xs font-bold text-base-content">
                  Choose sticker files
                </span>
                <span className="text-[11px] text-base-content/50 mt-1">
                  Supports PNG, WebP, GIF, SVG (transparent background recommended)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/webp,image/gif,image/svg+xml"
                  onChange={handleFilesSelect}
                  className="hidden"
                />
              </label>

              {/* Uploaded Previews */}
              {previews.length > 0 && (
                <div className="max-h-48 overflow-y-auto grid grid-cols-4 gap-2.5 p-2 bg-base-200/40 rounded-2xl">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl bg-base-100 border border-base-300 p-1 flex items-center justify-center group"
                    >
                      <img
                        src={src}
                        alt={`Preview ${i}`}
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-error/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs text-base-content/60 font-medium">
                  {files.length} sticker{files.length === 1 ? "" : "s"} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="btn btn-ghost btn-sm rounded-xl"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleUploadAndPublish}
                    disabled={isSubmitting || !files.length}
                    className="btn btn-primary btn-sm rounded-xl font-bold flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Submit for Review
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
