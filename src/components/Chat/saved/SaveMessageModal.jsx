import React, { useState } from "react";
import { Bookmark, X, Tag, Folder, StickyNote, Check } from "lucide-react";
import { useSavedMessagesStore } from "../../../store/useSavedMessagesStore.js";

const DEFAULT_CATEGORIES = [
  "Important",
  "Work",
  "Personal",
  "Ideas",
  "Links",
  "Documents",
  "Reminders",
  "Custom",
];

const SaveMessageModal = ({ message, isGroup = false, onClose }) => {
  const { saveMessage } = useSavedMessagesStore();
  const [category, setCategory] = useState("Important");
  const [folder, setFolder] = useState("General");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    const val = tagInput.trim().replace(/^#/, "");
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveMessage({
        messageId: message.id || message._id,
        messageModel: isGroup ? "GroupMessage" : "Message",
        category,
        folder: folder.trim() || "General",
        tags,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      console.error("[SaveMessageModal] Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-base-content">
              Save Message
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Message Preview */}
          <div className="p-3 bg-base-200/50 rounded-xl border border-base-300/60 text-xs text-base-content/80 line-clamp-2 italic">
            "{message.text || "Media message"}"
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    category === cat
                      ? "bg-primary text-primary-content border-primary shadow-sm"
                      : "bg-base-200/60 hover:bg-base-200 border-base-300 text-base-content/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" /> Folder
            </label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. Work, Ideas, Client X"
              maxLength={50}
              className="input input-sm input-bordered w-full rounded-xl text-xs focus:input-primary"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type tag and press Enter"
                className="input input-sm input-bordered flex-1 rounded-xl text-xs focus:input-primary"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="btn btn-sm btn-ghost text-xs text-primary font-semibold"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary border border-primary/20"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-error"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Private Personal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Private Note (Only visible
              to you)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts, action items, or reminders..."
              rows={2}
              maxLength={1000}
              className="textarea textarea-bordered w-full text-xs rounded-xl focus:textarea-primary resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-sm btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-sm btn-primary text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              <Bookmark className="w-3.5 h-3.5" />
              {isSubmitting ? "Saving..." : "Save Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveMessageModal;
