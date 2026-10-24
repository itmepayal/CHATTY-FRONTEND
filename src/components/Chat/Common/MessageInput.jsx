import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import { useChatStore } from "../../../store/useChatStore";
import { Paperclip, SendHorizontal, Smile, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { formatFileSize, getFileIcon } from "./FileAttachment";

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;
const SPRING = { type: "spring", stiffness: 420, damping: 28 };

const isImage = (f) => Boolean(f?.type?.startsWith("image/"));

const MessageInput = () => {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null); // File (image ya koi bhi file)
  const [imagePreview, setImagePreview] = useState(null); // sirf images ke liye
  const [isDragging, setIsDragging] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const pickerWrapRef = useRef(null);
  const smileBtnRef = useRef(null);
  const dragDepth = useRef(0);
  const planeControls = useAnimationControls();
  const reduce = useReducedMotion();
  const { sendMessage } = useChatStore();

  const canSend = Boolean(text.trim() || attachment);
  const FileTypeIcon = attachment
    ? getFileIcon(attachment.type, attachment.name)
    : null;

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  // Close emoji picker on outside click / Escape
  useEffect(() => {
    if (!showPicker) return;
    const onDown = (e) => {
      const inPicker = pickerWrapRef.current?.contains(e.target);
      const onToggle = smileBtnRef.current?.contains(e.target);
      if (!inPicker && !onToggle) setShowPicker(false);
    };
    const onKey = (e) => e.key === "Escape" && setShowPicker(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [showPicker]);

  const selectFile = (file) => {
    if (!file) return;

    const img = isImage(file);
    const limitMb = img ? MAX_IMAGE_MB : MAX_FILE_MB;

    if (file.size > limitMb * 1024 * 1024) {
      toast.error(
        `${img ? "Image" : "File"} must be smaller than ${limitMb} MB`,
      );
      return;
    }
    if (file.size === 0) {
      toast.error("This file is empty");
      return;
    }

    setAttachment(file);
    setImagePreview(null);

    if (img) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmojiClick = (emojiData) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;

    setText(text.slice(0, start) + emojiData.emoji + text.slice(end));

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + emojiData.emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!canSend) return;
    sendMessage({ text: text.trim(), attachment });

    // Paper-plane "whoosh": flies out to the right, returns from the left
    if (!reduce) {
      planeControls.start({
        x: [0, 28, -28, 0],
        y: [0, -10, 10, 0],
        opacity: [1, 0, 0, 1],
        transition: { duration: 0.5, times: [0, 0.45, 0.46, 1] },
      });
    }

    setText("");
    setShowPicker(false);
    removeAttachment();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Paste: screenshot / copied file dono
  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find(
      (i) => i.kind === "file",
    );
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      selectFile(file);
    }
  };

  // Drag & drop (depth counter stops flicker when crossing child elements)
  const handleDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  return (
    <motion.div
      initial={reduce ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="relative bg-base-100 border-t border-base-300 p-3 sm:p-4"
    >
      {/* Emoji picker */}
      <div ref={pickerWrapRef}>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              key="picker"
              initial={reduce ? false : { opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 12 }}
              transition={SPRING}
              style={{ transformOrigin: "bottom left" }}
              className="absolute bottom-full left-3 mb-2 z-50 rounded-2xl shadow-2xl"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="auto"
                width="min(320px, calc(100vw - 2rem))"
                height={380}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.form
        layout
        onSubmit={handleSendMessage}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{ scale: isDragging && !reduce ? 1.015 : 1 }}
        transition={SPRING}
        className={`relative overflow-hidden rounded-3xl border bg-base-200/60 backdrop-blur transition-colors focus-within:border-primary focus-within:shadow-[0_0_0_4px_oklch(var(--p)/0.15)] ${
          isDragging
            ? "border-primary border-dashed bg-primary/10"
            : "border-base-300"
        }`}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              key="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-base-100/80 text-primary font-medium"
            >
              <motion.span
                animate={reduce ? undefined : { y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-xl"
              >
                📎
              </motion.span>
              Drop file to attach
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment preview lives inside the composer */}
        <AnimatePresence initial={false}>
          {attachment && (
            <motion.div
              key="preview"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-3 pt-3">
                <motion.div
                  initial={reduce ? false : { scale: 0.7, rotate: -4 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={SPRING}
                  className="relative inline-block max-w-full"
                >
                  {isImage(attachment) ? (
                    imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Selected image preview"
                        className="h-24 max-w-[200px] object-cover rounded-2xl border border-base-300 shadow-md"
                      />
                    )
                  ) : (
                    <div className="flex w-64 max-w-full items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-2.5 shadow-md">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        {FileTypeIcon && <FileTypeIcon className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {attachment.name}
                        </span>
                        <span className="block text-xs text-base-content/60">
                          {formatFileSize(attachment.size)}
                        </span>
                      </span>
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={removeAttachment}
                    whileHover={
                      reduce ? undefined : { scale: 1.15, rotate: 90 }
                    }
                    whileTap={{ scale: 0.85 }}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-base-100 border border-base-300 shadow flex items-center justify-center hover:bg-error hover:text-error-content hover:border-error transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X className="size-3.5" />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1 p-1.5">
          {/* Koi bhi file: image, pdf, doc, zip, ... */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => selectFile(e.target.files?.[0])}
            className="hidden"
          />

          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            whileHover={reduce ? undefined : { scale: 1.1, rotate: -8 }}
            whileTap={{ scale: 0.88 }}
            transition={SPRING}
            className="btn btn-ghost btn-circle btn-sm size-10 min-h-0 text-base-content/60 hover:text-primary"
            aria-label="Attach file"
          >
            <Paperclip className="size-5" />
          </motion.button>

          <motion.button
            ref={smileBtnRef}
            type="button"
            onClick={() => setShowPicker((p) => !p)}
            whileHover={reduce ? undefined : { scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            animate={{ rotate: showPicker && !reduce ? 20 : 0 }}
            transition={SPRING}
            className={`btn btn-ghost btn-circle btn-sm size-10 min-h-0 hover:text-primary ${
              showPicker ? "text-primary bg-primary/10" : "text-base-content/60"
            }`}
            aria-label="Add emoji"
            aria-expanded={showPicker}
          >
            <Smile className="size-5" />
          </motion.button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Write a message…"
            className="flex-1 resize-none bg-transparent outline-none py-2.5 px-1 leading-5 max-h-36 placeholder:text-base-content/40"
          />

          {/* Send button: dormant → alive */}
          <motion.button
            type="submit"
            disabled={!canSend}
            animate={{
              scale: canSend ? 1 : 0.9,
              rotate: canSend ? 0 : -12,
            }}
            whileHover={canSend && !reduce ? { scale: 1.1 } : undefined}
            whileTap={canSend ? { scale: 0.85 } : undefined}
            transition={SPRING}
            className={`btn btn-circle btn-sm size-10 min-h-0 border-0 overflow-hidden transition-colors ${
              canSend
                ? "btn-primary shadow-lg shadow-primary/30"
                : "bg-base-300 text-base-content/40"
            }`}
            aria-label="Send message"
          >
            <motion.span animate={planeControls} className="flex">
              <SendHorizontal className="size-5" />
            </motion.span>
          </motion.button>
        </div>
      </motion.form>

      <AnimatePresence>
        {text.length === 0 && !attachment && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="hidden sm:block mt-1.5 px-2 text-[11px] text-base-content/40"
          >
            Enter to send · Shift+Enter for a new line · Paste or drop a file 📎
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MessageInput;
