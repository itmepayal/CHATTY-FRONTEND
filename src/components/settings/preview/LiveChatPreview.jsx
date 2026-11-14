import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCheck,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Sparkles,
} from "lucide-react";
import { SETTINGS_SPRING, SETTINGS_SPRING_GENTLE } from "../common/settingsTokens";
import { chatStyle } from "../../../hooks/useApplySettings";

const INITIAL_MESSAGES = [
  {
    id: 1,
    content: "Hey! How do you like this new theme?",
    isSent: false,
    time: "2:28 PM",
  },
  {
    id: 2,
    content: "Looks super clean! Love the typography and message styling.",
    isSent: true,
    time: "2:30 PM",
  },
  {
    id: 3,
    content: "Notice how spacing between consecutive messages adjusts!",
    isSent: true,
    time: "2:30 PM",
  },
];

export default function LiveChatPreview({
  appearance,
  privacy,
  chatPrefs,
  settings,
  isSaving = false,
  className = "",
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");

  const handleSend = (e) => {
    e?.preventDefault?.();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      content: inputText.trim(),
      isSent: true,
      time: appearance.timeFormat === "24h" ? "14:31" : "2:31 PM",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  const handleKeyDown = (e) => {
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

  // Appearance mappings
  const cs = chatStyle(appearance);
  const radius = cs.radius;
  const tailSent = cs.tailMine;
  const tailRecv = cs.tailTheirs;
  const padY = cs.bubblePadding;
  const textSize = cs.text;
  const timeText = appearance.timeFormat === "24h" ? "14:30" : "2:30 PM";

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Preview Section Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-bold text-base text-base-content flex items-center gap-2">
            <span>Live Chat Preview</span>
            <span className="flex size-2 rounded-full bg-success animate-pulse" />
          </h3>
          <p className="text-xs text-base-content/60">
            {isSaving ? "Saving appearance…" : "Updates reflect in real time"}
          </p>
        </div>

        <span className="badge badge-primary badge-outline text-xs capitalize font-semibold tracking-wide">
          {appearance.theme}
        </span>
      </div>

      {/* Smartphone Mockup Container with Theme Applied */}
      <motion.div
        layout
        transition={SETTINGS_SPRING_GENTLE}
        data-theme={appearance.theme}
        className="relative flex h-[min(580px,calc(100dvh_-_12rem))] min-h-[420px] flex-col overflow-hidden rounded-[2.25rem] border-4 border-base-300/80 bg-base-100 shadow-2xl ring-1 ring-black/5"
      >
        {/* Device Notch / Camera Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-full bg-base-300/50 z-20 flex items-center justify-center">
          <div className="size-2 rounded-full bg-base-content/20" />
        </div>

        {/* Chat Header */}
        <div className="shrink-0 bg-gradient-to-r from-primary to-secondary px-4 pt-6 pb-3 text-primary-content shadow-sm z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="flex size-10 items-center justify-center rounded-full bg-base-100 font-bold text-primary shadow-sm ring-2 ring-white/30">
                  J
                </div>
                <AnimatePresence>
                  {privacy.showOnlineStatus && (
                    <motion.span
                      key="online-dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={SETTINGS_SPRING}
                      className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100"
                    />
                  )}
                </AnimatePresence>
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-sm leading-tight truncate">
                  John Duo
                </h4>
                <p className="text-[11px] opacity-80 leading-tight truncate">
                  {privacy.showOnlineStatus ? "Online" : "Status hidden"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-90">
              <MoreVertical className="size-4" />
            </div>
          </div>
        </div>

        {/* Messages Stream Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 bg-base-100/95">
          {/* Day Separator */}
          <div className={`flex justify-center ${cs.dayMargin}`}>
            <span className="rounded-full bg-base-200/90 border border-base-300/60 px-3 py-0.5 text-[10px] font-semibold text-base-content/60">
              Today
            </span>
          </div>

          {/* Conversation Messages */}
          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const startsGroup = !prev || prev.isSent !== m.isSent;
            const gapClass = startsGroup ? cs.groupGap : cs.rowGap;
            const showTicks = m.isSent && privacy.readReceipts;

            return (
              <motion.div
                key={m.id}
                layout
                transition={SETTINGS_SPRING}
                className={`flex ${m.isSent ? "justify-end" : "justify-start"} ${gapClass}`}
              >
                <div
                  className={`min-w-0 max-w-[85%] sm:max-w-[80%] shadow-sm ${padY} ${radius} ${
                    m.isSent
                      ? `bg-gradient-to-br from-primary to-secondary text-primary-content ${tailSent}`
                      : `bg-base-200 text-base-content border border-base-300/40 ${tailRecv}`
                  }`}
                >
                  <p className={`[overflow-wrap:anywhere] leading-snug ${textSize}`}>
                    {m.content}
                  </p>

                  {(appearance.showTimestamps || showTicks) && (
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        m.isSent
                          ? "text-primary-content/80"
                          : "text-base-content/60"
                      }`}
                    >
                      {appearance.showTimestamps && <span>{timeText}</span>}
                      {showTicks && (
                        <CheckCheck className="size-3 text-current" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Large Emoji Demo */}
          <div className="flex justify-end pt-1">
            <AnimatePresence mode="wait">
              {chatPrefs.largeEmoji ? (
                <motion.span
                  key="large-emoji"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={SETTINGS_SPRING}
                  className="text-4xl leading-tight select-none"
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
                  className={`bg-primary px-3 py-1.5 ${textSize} text-primary-content ${radius} ${tailSent}`}
                >
                  👍🔥
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Typing Indicator */}
          <AnimatePresence>
            {privacy.typingIndicator && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex justify-start pt-1"
              >
                <div
                  className={`flex items-center gap-1 bg-base-200 px-3.5 py-2.5 shadow-sm border border-base-300/40 ${radius} ${tailRecv}`}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.9,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      }}
                      className="size-1.5 rounded-full bg-base-content/60"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message Composer Bar */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-base-300/80 bg-base-100 p-2.5 sm:p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-base-300 bg-base-200/70 px-3 transition-colors focus-within:border-primary">
              <Smile className="size-4 shrink-0 text-base-content/50" />

              {settings.aiEnabled && (
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-sm"
                  title="AI assist enabled"
                >
                  <Sparkles className="size-3" />
                </span>
              )}

              <input
                type="text"
                className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm outline-none text-base-content placeholder:text-base-content/50"
                placeholder="Test type message…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Test chat composer"
              />

              <Paperclip className="size-4 shrink-0 text-base-content/50" />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content shadow-md transition-colors hover:brightness-105"
              aria-label="Send test message"
            >
              <Send className="size-4" />
            </motion.button>
          </div>

          {/* Keyboard shortcut caption */}
          <p className="mt-1.5 px-2 text-[10px] text-base-content/50 truncate">
            {chatPrefs.enterToSend
              ? "Enter to send · Shift+Enter for new line"
              : "Enter for new line · Ctrl+Enter to send"}
          </p>
        </form>
      </motion.div>
    </div>
  );
}
