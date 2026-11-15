import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCheck,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Sparkles,
  Video,
} from "lucide-react";
import {
  SETTINGS_SPRING,
  SETTINGS_SPRING_GENTLE,
} from "../common/settingsTokens";
import { chatStyle, formatTime } from "../../../hooks/useApplySettings";

const INITIAL_MESSAGES = [
  {
    id: 1,
    content: "Hey! How does the new chat theme look on your screen?",
    isSent: false,
    time: "2:28 PM",
  },
  {
    id: 2,
    content:
      "Looks super clean and spacious! Notice how message bubbles and typography adapt.",
    isSent: true,
    time: "2:30 PM",
  },
  {
    id: 3,
    content:
      "Everything updates in real time as you fine-tune font size, bubble radius, and density.",
    isSent: false,
    time: "2:31 PM",
  },
];

export default function LiveChatPreview({
  appearance = {},
  privacy = {},
  chatPrefs = {},
  settings = {},
  isSaving = false,
  className = "",
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatPrefs.autoScroll !== false) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatPrefs.autoScroll]);

  const handleSend = (e) => {
    e?.preventDefault?.();
    if (!inputText.trim()) return;

    const now = new Date();
    const formatted = formatTime(now, appearance.timeFormat || "12h");

    const newMsg = {
      id: Date.now(),
      content: inputText.trim(),
      isSent: true,
      time: formatted,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent?.isComposing) return;
    if (chatPrefs.enterToSend) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const cs = chatStyle(appearance);
  const radius = cs.radius;
  const tailSent = cs.tailMine;
  const tailRecv = cs.tailTheirs;
  const padY = cs.bubblePadding;
  const textSize = cs.text;
  const sampleTime =
    formatTime(new Date(), appearance.timeFormat || "12h") || "2:30 PM";

  return (
    <div className={`flex flex-col gap-3 w-full ${className}`}>
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-base-300/60 min-h-[52px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-base-content break-words">
                Live Chat Preview
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-semibold shrink-0">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-base-content/60 leading-relaxed break-words">
              {isSaving
                ? "Saving appearance to your account…"
                : "Real-time preview of your selected theme and typography"}
            </p>
          </div>
        </div>

        <span className="badge badge-primary badge-outline text-xs capitalize font-semibold tracking-wide shrink-0">
          {appearance.theme || "light"}
        </span>
      </div>

      <motion.div
        layout
        transition={SETTINGS_SPRING_GENTLE}
        data-theme={appearance.theme}
        className="relative flex flex-col w-full h-[500px] min-[400px]:h-[540px] sm:h-[580px] lg:h-[620px] rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-xl overflow-hidden text-base-content"
      >
        <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 bg-base-200/70 border-b border-base-300/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-content shadow-sm ring-2 ring-base-100 text-sm">
                SD
              </div>
              <AnimatePresence>
                {privacy.showOnlineStatus !== false && (
                  <motion.span
                    key="online-indicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={SETTINGS_SPRING}
                    className="absolute -bottom-0.5 -right-0.5 size-3 sm:size-3.5 rounded-full bg-success ring-2 ring-base-100 flex items-center justify-center"
                    title="Online"
                  >
                    <span className="size-1.5 rounded-full bg-success-content animate-pulse" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-base-content truncate leading-snug">
                  Sarah Duo
                </h4>
                <span className="badge badge-xs badge-neutral text-[10px] opacity-70">
                  Contact
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-base-content/65 truncate leading-snug">
                {privacy.showOnlineStatus !== false ? (
                  <span className="text-success font-medium">Online</span>
                ) : (
                  <span className="text-base-content/50">Status hidden</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 text-base-content/70">
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-xs sm:btn-sm text-base-content/70 hover:text-primary"
              aria-label="Voice call preview"
              title="Voice Call"
            >
              <Phone className="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              className="hidden min-[360px]:inline-flex btn btn-ghost btn-circle btn-xs sm:btn-sm text-base-content/70 hover:text-primary"
              aria-label="Video call preview"
              title="Video Call"
            >
              <Video className="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-xs sm:btn-sm text-base-content/70 hover:text-primary"
              aria-label="More options"
              title="More options"
            >
              <MoreVertical className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 bg-base-100">
          <div className={`flex justify-center ${cs.dayMargin}`}>
            <span className="rounded-full bg-base-200/80 border border-base-300/60 px-3.5 py-1 text-[11px] font-medium text-base-content/65 shadow-2xs">
              Today
            </span>
          </div>

          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const startsGroup = !prev || prev.isSent !== m.isSent;
            const gapClass = startsGroup ? cs.groupGap : cs.rowGap;
            const showTicks = m.isSent && privacy.readReceipts !== false;

            return (
              <motion.div
                key={m.id}
                layout
                transition={SETTINGS_SPRING}
                className={`flex ${m.isSent ? "justify-end" : "justify-start"} ${gapClass}`}
              >
                <div
                  className={`min-w-0 max-w-[82%] sm:max-w-[75%] md:max-w-[70%] shadow-2xs ${padY} ${radius} ${
                    m.isSent
                      ? `bg-primary text-primary-content ${tailSent}`
                      : `bg-base-200 text-base-content border border-base-300/60 ${tailRecv}`
                  }`}
                >
                  <p
                    className={`leading-relaxed break-words whitespace-pre-wrap ${textSize}`}
                  >
                    {m.content}
                  </p>

                  {(appearance.showTimestamps !== false || showTicks) && (
                    <div
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] select-none ${
                        m.isSent
                          ? "text-primary-content/80"
                          : "text-base-content/55"
                      }`}
                    >
                      {appearance.showTimestamps !== false && (
                        <span>{m.time || sampleTime}</span>
                      )}
                      {showTicks && (
                        <CheckCheck className="size-3.5 text-current inline" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <div className="flex justify-end pt-1.5">
            <AnimatePresence mode="wait">
              {chatPrefs.largeEmoji !== false ? (
                <motion.span
                  key="large-emoji"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={SETTINGS_SPRING}
                  className="text-4xl leading-tight select-none py-1 filter drop-shadow-sm"
                >
                  👍🔥
                </motion.span>
              ) : (
                <motion.span
                  key="normal-emoji"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={SETTINGS_SPRING}
                  className={`bg-primary px-3 py-1.5 ${textSize} text-primary-content ${radius} ${tailSent} shadow-2xs`}
                >
                  👍🔥
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {privacy.typingIndicator !== false && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex justify-start pt-1.5"
              >
                <div
                  className={`flex items-center gap-1.5 bg-base-200 px-3.5 py-2.5 shadow-2xs border border-base-300/60 ${radius} ${tailRecv}`}
                >
                  <span className="text-xs text-base-content/60 mr-1 font-medium">
                    Sarah is typing
                  </span>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -3.5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.85,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      }}
                      className="size-1.5 rounded-full bg-primary"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-base-300/80 bg-base-200/50 p-3 sm:p-3.5 backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-primary shrink-0"
              aria-label="Add attachment"
              title="Add attachment"
            >
              <Paperclip className="size-4" />
            </button>

            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3.5 transition-colors focus-within:border-primary shadow-2xs">
              <button
                type="button"
                className="text-base-content/50 hover:text-primary transition-colors shrink-0"
                aria-label="Add emoji"
                title="Add emoji"
              >
                <Smile className="size-4" />
              </button>

              {settings.aiEnabled !== false && (
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                  title="AI assist enabled"
                >
                  <Sparkles className="size-3" />
                </span>
              )}

              <input
                type="text"
                className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm outline-none text-base-content placeholder:text-base-content/45"
                placeholder="Type a message to preview settings…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Test message input"
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content shadow-md shadow-primary/25 hover:brightness-105 transition-all"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="size-4 ml-0.5" />
            </motion.button>
          </div>

          <div className="mt-2 px-3 flex items-center justify-between text-[11px] text-base-content/50 select-none">
            <span className="truncate">
              {chatPrefs.enterToSend
                ? "Enter to send · Shift+Enter for new line"
                : "Ctrl+Enter to send · Enter for new line"}
            </span>
            <span className="hidden sm:inline font-mono opacity-60">
              Interactive Preview
            </span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
