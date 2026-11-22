import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  FileText,
  Video,
  Film,
  Smile,
  Sticker,
  Sparkles,
  Gift,
  Clock,
  Mic,
  Send,
  Plus,
  X,
  Reply,
  Lock,
  Trash2,
  AlertCircle,
  BarChart2,
  Eye,
  Camera,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import StickerPicker from "../../stickers/StickerPicker.jsx";
import GifPicker from "../../stickers/GifPicker.jsx";
import AiAssist from "../../common/AiAssist.jsx";
import MoreAttachmentsMenu from "./MoreAttachmentsMenu.jsx";
import { customToast as toast } from "../../toast";

const MAX_IMAGE_MB = 5;
const MAX_FILE_MB = 10;
const MAX_VIDEO_MB = 25;

const FILE_ACCEPT = [
  ".pdf,.doc,.docx,.txt,.rtf,.odt",
  ".xls,.xlsx,.csv,.ods",
  ".ppt,.pptx,.odp",
  ".zip,.rar,.7z,.tar,.gz",
  ".json,.xml,.md",
].join(",");

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const getFileExtension = (filename = "") => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
};

const MessageComposer = forwardRef(function MessageComposer(
  {
    // Text state
    text = "",
    setText,
    placeholder = "Write a message…",
    maxLength = 2000,
    enterToSend = true,
    disabled = false,
    disabledReason = "",

    // File / attachment state
    file = null,
    setFile,
    clearFile,
    preview = null,
    isViewOnce = false,
    setIsViewOnce,

    // Reply & Edit state
    replyTarget = null,
    onCancelReply,
    editingMessage = null,
    onCancelEdit,

    // Submit / Send action
    onSendMessage,
    onSubmit,
    onSendSticker,
    onSendGif,

    // Voice recording
    onStartVoice,
    voiceRecordingState = null, // { state, seconds, cancel, stop }

    // Video recording
    onStartVideoCamera,
    videoRecordingState = null, // { state, seconds, cancel, stop, previewRef }

    // Modals & Pickers
    onOpenSchedule,
    canSchedule = true,
    onOpenPoll,
    canPoll = false,
    onOpenGift,
    canGift = true,
    onOpenLocation,
    onOpenStickerMarketplace,

    // Keyboard & slots
    onCustomKeyDown,
    mentionSlot = null,

    // Typing emitter
    onTyping,
    onStopTyping,

    // Peer metadata for reset
    peerId = null,
  },
  ref,
) {
  // Popover visibility states (mutually exclusive)
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // File inputs & DOM references
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const composerRootRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Expose textarea DOM element to parent container
  useImperativeHandle(ref, () => textareaRef.current);

  // Close all popovers
  const closeAllPopovers = () => {
    setShowEmoji(false);
    setShowStickers(false);
    setShowGifs(false);
    setShowMoreMenu(false);
  };

  // Toggle specific popover while ensuring mutual exclusivity
  const togglePopover = (popoverName) => {
    if (popoverName === "emoji") {
      setShowEmoji((prev) => !prev);
      setShowStickers(false);
      setShowGifs(false);
      setShowMoreMenu(false);
    } else if (popoverName === "stickers") {
      setShowStickers((prev) => !prev);
      setShowEmoji(false);
      setShowGifs(false);
      setShowMoreMenu(false);
    } else if (popoverName === "gifs") {
      setShowGifs((prev) => !prev);
      setShowEmoji(false);
      setShowStickers(false);
      setShowMoreMenu(false);
    } else if (popoverName === "more") {
      setShowMoreMenu((prev) => !prev);
      setShowEmoji(false);
      setShowStickers(false);
      setShowGifs(false);
    }
  };

  // Auto-grow textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !el.style) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [text]);

  // Reset popovers on peer/chat switch
  useEffect(() => {
    closeAllPopovers();
  }, [peerId]);

  // Global Escape key closes any active popover
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showEmoji || showStickers || showGifs || showMoreMenu) {
          closeAllPopovers();
          textareaRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showEmoji, showStickers, showGifs, showMoreMenu]);

  // Global click outside composer closes active popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        composerRootRef.current &&
        !composerRootRef.current.contains(e.target)
      ) {
        if (showEmoji || showStickers || showGifs || showMoreMenu) {
          closeAllPopovers();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji, showStickers, showGifs, showMoreMenu]);

  // File validator
  const validateAndSetFile = (selectedFile, kind = "any") => {
    if (!selectedFile) return;

    if (editingMessage) {
      toast.error("Finish editing before attaching files");
      return;
    }

    const isImg = selectedFile.type?.startsWith("image/");
    const isVid = selectedFile.type?.startsWith("video/");

    if (kind === "image" && !isImg) {
      toast.error("Please select an image file (JPG, PNG, WebP)");
      return;
    }
    if (kind === "video" && !isVid) {
      toast.error("Please select a video file (MP4, WebM, MOV)");
      return;
    }
    if (kind === "document" && (isImg || isVid)) {
      toast.error("Please select a document file (PDF, Word, Excel, TXT)");
      return;
    }

    const limitMb = isImg
      ? MAX_IMAGE_MB
      : isVid
        ? MAX_VIDEO_MB
        : MAX_FILE_MB;

    if (selectedFile.size > limitMb * 1024 * 1024) {
      toast.error(`File size exceeds ${limitMb} MB limit`);
      return;
    }

    setFile?.(selectedFile);
    closeAllPopovers();
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile, "any");
    }
  };

  // Keyboard navigation & Enter-to-send
  const handleKeyDown = (e) => {
    if (onCustomKeyDown && onCustomKeyDown(e)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (enterToSend) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  // Text change & typing emitter
  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= maxLength) {
      setText?.(val);
      if (val.trim()) {
        onTyping?.();
      } else {
        onStopTyping?.();
      }
    }
  };

  // Submit message
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (disabled) return;

    if (onSubmit) {
      onSubmit(e);
      closeAllPopovers();
      onStopTyping?.();
      return;
    }

    if (onSendMessage) {
      onSendMessage();
      closeAllPopovers();
      onStopTyping?.();
    }
  };

  // Send sticker action
  const handleSendSticker = (sticker) => {
    if (onSendSticker) {
      onSendSticker(sticker);
    } else if (onSendMessage) {
      onSendMessage({ sticker, messageType: "sticker" });
    }
    closeAllPopovers();
  };

  // Send GIF action
  const handleSendGif = (gif) => {
    if (onSendGif) {
      onSendGif(gif);
    } else if (onSendMessage) {
      onSendMessage({
        sticker: {
          url: gif.url,
          thumbnailUrl: gif.previewUrl || gif.url,
          name: gif.title,
          altText: gif.title,
          isAnimated: true,
          format: "gif",
        },
        messageType: "sticker",
      });
    }
    closeAllPopovers();
  };

  // Emoji click handler
  const handleEmojiClick = (emojiData) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const nextText = text.slice(0, start) + emojiData.emoji + text.slice(end);
    setText?.(nextText.slice(0, maxLength));
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        const pos = start + emojiData.emoji.length;
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const isVoiceBusy =
    voiceRecordingState?.state === "recording" ||
    voiceRecordingState?.state === "requesting";

  const isVideoBusy =
    videoRecordingState?.state === "recording" ||
    videoRecordingState?.state === "requesting";

  const hasContent = Boolean(text.trim() || file);
  const fileIsImage = Boolean(file?.type?.startsWith("image/"));
  const fileIsVideo = Boolean(file?.type?.startsWith("video/"));
  const fileIsDocument = Boolean(file && !fileIsImage && !fileIsVideo);

  return (
    <div
      ref={composerRootRef}
      className="relative z-30 border-t border-base-300/80 bg-base-100/90 backdrop-blur-xl px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] sm:px-5 md:px-6 sm:py-3 transition-colors"
    >
      {/* ========================================================================= */}
      {/* UNIFIED POPOVERS (Anchored to Composer Root — Never Clipped, High z-index) */}
      {/* ========================================================================= */}

      {/* 1. Sticker Picker Popover */}
      {showStickers && (
        <StickerPicker
          isOpen={showStickers}
          onClose={() => setShowStickers(false)}
          onSelectSticker={handleSendSticker}
          onOpenMarketplace={onOpenStickerMarketplace}
          className="absolute bottom-full mb-3 right-2 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px]"
        />
      )}

      {/* 2. Animated GIF Picker Popover */}
      {showGifs && (
        <GifPicker
          isOpen={showGifs}
          onClose={() => setShowGifs(false)}
          onSelectGif={handleSendGif}
          className="absolute bottom-full mb-3 right-2 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px]"
        />
      )}

      {/* 3. Emoji Picker Popover */}
      {showEmoji && (
        <div className="absolute bottom-full mb-3 left-2 sm:left-4 z-50 max-w-[calc(100vw-1.5rem)] shadow-2xl rounded-3xl overflow-hidden border border-base-300 bg-base-100 animate-in fade-in duration-150">
          <EmojiPicker
            theme="auto"
            width={Math.min(350, typeof window !== "undefined" ? window.innerWidth - 24 : 320)}
            height={420}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji…"
            previewConfig={{ showPreview: false }}
            onEmojiClick={handleEmojiClick}
          />
        </div>
      )}

      {/* 4. More Attachments Menu Popover */}
      <MoreAttachmentsMenu
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        onPickImage={() => imageInputRef.current?.click()}
        onPickDocument={() => docInputRef.current?.click()}
        onPickVideo={() => videoInputRef.current?.click()}
        onRecordVideo={onStartVideoCamera}
        onOpenStickers={() => {
          setShowStickers(true);
          setShowMoreMenu(false);
        }}
        onOpenGifs={() => {
          setShowGifs(true);
          setShowMoreMenu(false);
        }}
        onOpenPoll={onOpenPoll}
        canPoll={canPoll}
        onOpenGift={onOpenGift}
        canGift={canGift}
        onOpenSchedule={onOpenSchedule}
        canSchedule={canSchedule}
        onOpenLocation={onOpenLocation}
        className="absolute bottom-full mb-3 left-2 sm:left-4 z-50"
      />

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          validateAndSetFile(e.target.files?.[0], "image");
          e.target.value = "";
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept={FILE_ACCEPT}
        hidden
        onChange={(e) => {
          validateAndSetFile(e.target.files?.[0], "document");
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        hidden
        onChange={(e) => {
          validateAndSetFile(e.target.files?.[0], "video");
          e.target.value = "";
        }}
      />

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTarget && !editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-base-200/80 border-l-4 border-primary px-3.5 py-2 shadow-xs border border-base-300"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Reply className="size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-base-content truncate">
                  Replying to{" "}
                  {replyTarget.senderName ||
                    replyTarget.sender?.fullName ||
                    "Message"}
                </p>
                <p className="text-[11px] text-base-content/60 truncate">
                  {replyTarget.text ||
                    (replyTarget.image ? "Photo attachment" : "Attachment")}
                </p>
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-lg hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors cursor-pointer"
              aria-label="Cancel reply"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 px-3.5 py-2 shadow-xs border border-amber-500/20"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-500 truncate">
                  Editing Message
                </p>
                <p className="text-[11px] text-base-content/60 truncate">
                  {editingMessage.text}
                </p>
              </div>
            </div>
            <button
              onClick={onCancelEdit}
              className="text-xs font-semibold px-2 py-1 rounded-lg text-base-content/60 hover:text-rose-500 hover:bg-base-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Previews */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-2 inline-flex items-center gap-3 rounded-2xl bg-base-200 border border-base-300 p-2 pr-3 shadow-md max-w-full text-base-content"
          >
            {/* Image Preview Thumbnail */}
            {fileIsImage && (
              <div className="relative size-12 rounded-xl overflow-hidden bg-base-100 shrink-0 border border-base-300">
                <img
                  src={preview || (file ? URL.createObjectURL(file) : "")}
                  alt="Attachment preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Document Attachment Box */}
            {fileIsDocument && (
              <div className="size-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex flex-col items-center justify-center shrink-0 text-sky-500">
                <FileText className="size-5" />
                <span className="text-[8px] font-black uppercase mt-0.5">
                  {getFileExtension(file.name)}
                </span>
              </div>
            )}

            {/* Video Attachment Box */}
            {fileIsVideo && (
              <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col items-center justify-center shrink-0 text-purple-500">
                <Video className="size-5" />
                <span className="text-[8px] font-black uppercase mt-0.5">MP4</span>
              </div>
            )}

            {/* File info */}
            <div className="min-w-0 max-w-xs">
              <p className="text-xs font-bold text-base-content truncate">
                {file.name}
              </p>
              <p className="text-[10px] text-base-content/60">
                {formatFileSize(file.size)}
              </p>
            </div>

            {/* View Once Toggle Button */}
            {setIsViewOnce && (
              <button
                type="button"
                onClick={() => setIsViewOnce(!isViewOnce)}
                title={
                  isViewOnce
                    ? "View Once Enabled: media disappears after opening"
                    : "Enable View Once"
                }
                className={`ml-2 px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  isViewOnce
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-base-300 text-base-content/60 border-base-300 hover:text-base-content"
                }`}
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">1x</span>
              </button>
            )}

            {/* Remove File Button */}
            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 rounded-xl hover:bg-base-300 text-base-content/50 hover:text-rose-500 transition-colors cursor-pointer"
              aria-label="Remove attachment"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Live Bar */}
      {isVoiceBusy && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-3.5 py-2.5 shadow-sm text-base-content"
        >
          <button
            type="button"
            onClick={voiceRecordingState?.cancel}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
            aria-label="Cancel recording"
            title="Cancel"
          >
            <Trash2 className="size-4.5" />
          </button>

          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
          </span>

          <span className="font-mono text-sm font-bold tabular-nums text-base-content">
            {voiceRecordingState?.seconds
              ? `${Math.floor(voiceRecordingState.seconds / 60)}:${String(
                  voiceRecordingState.seconds % 60,
                ).padStart(2, "0")}`
              : "0:00"}
          </span>

          <div className="flex-1 flex items-center gap-1 justify-center px-2">
            {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 60].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className="w-0.5 bg-primary rounded-full animate-pulse max-h-5"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={voiceRecordingState?.stop}
            className="p-2 rounded-xl bg-primary hover:brightness-110 text-primary-content font-bold shadow-sm transition-colors cursor-pointer"
            aria-label="Send voice message"
            title="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      )}

      {/* Video Recording Live Camera Preview Panel */}
      {isVideoBusy && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-3xl border border-primary/40 bg-base-100 p-3 shadow-lg text-base-content"
        >
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-video max-h-56 mx-auto flex items-center justify-center">
            <video
              ref={videoRecordingState?.previewRef}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover -scale-x-100"
            />
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono text-white">
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              <span>
                {videoRecordingState?.seconds
                  ? `${Math.floor(videoRecordingState.seconds / 60)}:${String(
                      videoRecordingState.seconds % 60,
                    ).padStart(2, "0")}`
                  : "Recording…"}
              </span>
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={videoRecordingState?.cancel}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
              aria-label="Cancel video"
            >
              <Trash2 className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={videoRecordingState?.stop}
              className="p-2 rounded-xl bg-primary hover:brightness-110 text-primary-content font-bold shadow-sm transition-colors cursor-pointer"
              aria-label="Send video"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN COMPOSER BAR (Three Visually Organized Areas: Left, Center, Right)  */}
      {/* ========================================================================= */}
      {!isVoiceBusy && !isVideoBusy && (
        <form
          onSubmit={handleSubmit}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex items-end gap-1 sm:gap-2 rounded-2.5xl sm:rounded-3xl border bg-base-200/50 hover:bg-base-200/80 p-1.5 sm:p-2 transition-all focus-within:bg-base-100 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 shadow-xs ${
            isDragging
              ? "border-dashed border-primary bg-primary/10"
              : "border-base-300/80"
          }`}
        >
          {/* Optional Mention Slot for Group Chat */}
          {mentionSlot}

          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2.5xl sm:rounded-3xl bg-base-100/90 text-xs sm:text-sm font-bold text-primary backdrop-blur-xs"
              >
                Drop file to attach to message
              </motion.div>
            )}
          </AnimatePresence>

          {/* --------------------------------------------------------------------- */}
          {/* AREA 1: LEFT ATTACHMENT CONTROLS (Photos, Docs, Video, Emoji, Plus)   */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pb-0.5">
            {/* Image Attachment (Photos) */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || Boolean(editingMessage)}
              title="Attach Photos & Images (JPG, PNG, WebP)"
              aria-label="Attach Photo"
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center text-base-content/60 hover:text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
            >
              <ImageIcon className="size-4.5 sm:size-5" />
            </button>

            {/* Document Attachment */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={disabled || Boolean(editingMessage)}
              title="Attach Document (PDF, Word, Excel, TXT)"
              aria-label="Attach Document"
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center text-base-content/60 hover:text-sky-500 hover:bg-sky-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="size-4.5 sm:size-5" />
            </button>

            {/* Video Attachment / Camera */}
            <button
              type="button"
              onClick={() => {
                if (onStartVideoCamera) {
                  onStartVideoCamera();
                } else {
                  videoInputRef.current?.click();
                }
              }}
              disabled={disabled || Boolean(editingMessage)}
              title="Video Attachment / Camera"
              aria-label="Attach Video"
              className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center text-base-content/60 hover:text-purple-500 hover:bg-purple-500/10 active:scale-95 transition-all hidden xs:inline-flex cursor-pointer"
            >
              <Video className="size-4.5 sm:size-5" />
            </button>

            {/* Emoji Picker Button */}
            <button
              type="button"
              onClick={() => togglePopover("emoji")}
              disabled={disabled}
              title="Emojis"
              aria-label="Insert Emoji"
              aria-expanded={showEmoji}
              className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                showEmoji
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 font-bold"
                  : "text-base-content/60 hover:text-amber-500 hover:bg-amber-500/10 active:scale-95"
              }`}
            >
              <Smile className="size-4.5 sm:size-5" />
            </button>

            {/* More Attachments Menu Button (+) */}
            <button
              type="button"
              onClick={() => togglePopover("more")}
              disabled={disabled || Boolean(editingMessage)}
              title="More Attachments & Actions"
              aria-label="More Attachments"
              aria-expanded={showMoreMenu}
              className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                showMoreMenu
                  ? "bg-primary/20 text-primary border border-primary/40 rotate-45 font-bold"
                  : "text-base-content/60 hover:text-primary hover:bg-primary/10 active:scale-95"
              }`}
            >
              <Plus className="size-5 transition-transform" />
            </button>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* AREA 2: CENTER MESSAGE INPUT (Primary multiline auto-grow textarea)   */}
          {/* --------------------------------------------------------------------- */}
          <div className="relative flex-1 min-w-0 pb-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              maxLength={maxLength}
              disabled={disabled}
              placeholder={
                disabled ? disabledReason || "Sending disabled" : placeholder
              }
              className="w-full resize-none bg-transparent outline-none py-1 px-1.5 text-xs sm:text-sm font-medium text-base-content placeholder:text-base-content/40 leading-relaxed max-h-[130px] scrollbar-thin select-text"
            />
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* AREA 3: RIGHT ACTION CONTROLS (GIF, Sticker, AI, Gift, Clock, Send)   */}
          {/* --------------------------------------------------------------------- */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pb-0.5">
            {/* Animated GIF Button */}
            <button
              type="button"
              onClick={() => togglePopover("gifs")}
              disabled={disabled || Boolean(editingMessage)}
              title="Send Animated GIF"
              aria-label="Send Animated GIF"
              className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center leading-none transition-all hidden xs:inline-flex cursor-pointer ${
                showGifs
                  ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                  : "text-base-content/60 hover:text-primary hover:bg-primary/10 active:scale-95"
              }`}
            >
              <Film className="size-4" />
              <span className="text-[8px] font-extrabold uppercase mt-0.5 tracking-tighter">
                GIF
              </span>
            </button>

            {/* Sticker Button */}
            <button
              type="button"
              onClick={() => togglePopover("stickers")}
              disabled={disabled || Boolean(editingMessage)}
              title="Send Sticker"
              aria-label="Send Sticker"
              className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                showStickers
                  ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                  : "text-base-content/60 hover:text-primary hover:bg-primary/10 active:scale-95"
              }`}
            >
              <Sticker className="size-4.5 sm:size-5" />
            </button>

            {/* AI Assistant */}
            <AiAssist
              text={text}
              resetKey={peerId}
              disabled={disabled}
              onApply={(suggested) => {
                setText?.(suggested);
                textareaRef.current?.focus();
              }}
            />

            {/* Virtual Gift Button */}
            {canGift && onOpenGift && (
              <button
                type="button"
                onClick={onOpenGift}
                disabled={disabled || Boolean(editingMessage)}
                title="Send Digital Gift"
                aria-label="Send Digital Gift"
                className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 active:scale-95 transition-all hidden md:inline-flex cursor-pointer"
              >
                <Gift className="size-4.5 sm:size-5" />
              </button>
            )}

            {/* Schedule Message Button */}
            {canSchedule && onOpenSchedule && !editingMessage && (
              <button
                type="button"
                onClick={onOpenSchedule}
                disabled={disabled}
                title="Schedule Message"
                aria-label="Schedule Message"
                className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all hidden lg:inline-flex cursor-pointer ${
                  text.trim()
                    ? "text-primary hover:bg-primary/10 font-bold"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <Clock className="size-4.5 sm:size-5" />
              </button>
            )}

            {/* Dynamic Send / Mic Action Button */}
            {hasContent ? (
              <button
                type="submit"
                disabled={disabled}
                aria-label={editingMessage ? "Save edit" : "Send message"}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary hover:brightness-110 active:scale-95 text-primary-content font-bold flex items-center justify-center shadow-md shadow-primary/25 transition-all ml-0.5 cursor-pointer"
              >
                <Send className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartVoice}
                disabled={disabled || Boolean(editingMessage)}
                title="Record voice message"
                aria-label="Record voice message"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl text-base-content/60 hover:text-primary hover:bg-primary/10 active:scale-95 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
              >
                <Mic className="size-4.5" />
              </button>
            )}
          </div>
        </form>
      )}

      {/* Keyboard Shortcut & Character Counter Subtext */}
      {!isVoiceBusy && !isVideoBusy && (
        <div className="mt-1.5 hidden sm:flex items-center justify-between px-1 text-[11px] text-base-content/40 font-medium">
          <span className="flex items-center gap-1">
            <Lock className="size-3 shrink-0" />
            <span>
              {editingMessage
                ? "Esc to cancel · Enter to save"
                : enterToSend
                  ? "Enter to send · Shift+Enter for new line"
                  : "Enter for new line · Ctrl+Enter to send"}
            </span>
          </span>

          {/* Dynamic character counter warning */}
          <span
            className={`text-[10px] font-mono transition-colors ${
              text.length > maxLength * 0.85
                ? "text-amber-500 font-bold"
                : "text-base-content/40"
            }`}
          >
            {text.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
});

export default MessageComposer;
