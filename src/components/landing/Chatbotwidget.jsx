import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MessageCircle,
  X,
  Sparkles,
  SendHorizontal,
  Smile,
  CheckCheck,
  RotateCcw,
} from "lucide-react";
// Adjust this path to wherever your store file lives
import {
  useAiStore,
  isAiAbort,
  AI_CHAT_MAX_LENGTH,
} from "../../store/useAiStore.js";

const QUICK_REPLIES = [
  "How do groups work?",
  "Is my chat secure?",
  "Change theme",
  "Talk to support",
];

const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "😎"];
const MAX_LENGTH = AI_CHAT_MAX_LENGTH; // 400, same limit the store enforces
const MAX_HISTORY = 10; // how many recent messages are sent to the AI

// Offline fallback: used only if the AI request fails
const ANSWERS = [
  {
    match: /group/i,
    text: "Create a group, add members and chat together. You can see who is online and who has seen each message.",
  },
  {
    match: /secur|privacy|safe|encrypt/i,
    text: "Your messages are sent over a secure connection and only the people in the chat can see them. We never share your conversations.",
  },
  {
    match: /theme|color|colour|dark|light/i,
    text: "Open Settings and choose Theme to switch between the available looks. Your choice is saved on this device.",
  },
  {
    match: /support|help|human|agent/i,
    text: "I've noted your request. A support member will reply by email within one business day. You can also keep asking me here.",
  },
  {
    match: /^(hi|hello|hey|namaste)\b/i,
    text: "Hello! Ask me about groups, themes or privacy and I'll point you the right way.",
  },
];

const getLocalAnswer = (text) => ANSWERS.find((a) => a.match.test(text))?.text;

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

let nextId = 1;
// `local: true` messages (welcome / errors) are never sent to the AI
const makeMessage = (from, text, local = false) => ({
  id: nextId++,
  from,
  text,
  local,
  time: formatTime(new Date()),
});

const WELCOME = () =>
  makeMessage(
    "bot",
    "Hi! 👋 I'm your Chatty assistant. Ask me anything about groups, themes or privacy.",
    true,
  );

// Convert UI messages -> API history ({ role, content }), ending with the user's message
const toHistory = (messages) => {
  const history = messages
    .filter((m) => !m.local)
    .map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }))
    .slice(-MAX_HISTORY);
  while (history.length && history[0].role !== "user") history.shift();
  return history;
};

const BotAvatar = () => (
  <div
    aria-hidden="true"
    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-base-300 text-primary"
  >
    <Sparkles className="size-4" />
  </div>
);

const TypingDots = ({ reduce }) => (
  <div
    className="flex items-center gap-1.5"
    role="status"
    aria-label="Assistant is typing"
  >
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1.5 rounded-full bg-primary/70"
        animate={
          reduce ? { opacity: 0.8 } : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }
        }
        transition={{
          duration: 0.9,
          repeat: reduce ? 0 : Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

const Message = ({ message, reduce }) => {
  const isUser = message.from === "user";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2.5 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && <BotAvatar />}
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap sm:max-w-[78%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-primary font-medium text-primary-content shadow-lg shadow-primary/20"
            : "rounded-2xl rounded-bl-md border border-base-300 bg-base-200 text-base-content"
        }`}
      >
        {message.text}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            isUser ? "justify-end opacity-70" : "text-base-content/40"
          }`}
        >
          {message.time}
          {isUser && <CheckCheck className="size-3.5" aria-label="Delivered" />}
        </div>
      </div>
    </motion.div>
  );
};

export function ChatbotWidget() {
  const reduce = useReducedMotion();
  const askChatbot = useAiStore((s) => s.askChatbot);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [WELCOME()]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(1);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const abortRef = useRef(null);
  const openRef = useRef(open);
  const messagesRef = useRef(messages);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Escape closes the emoji tray first, then the chat
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (emojiOpen) setEmojiOpen(false);
      else {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, emojiOpen]);

  // Clear unread + focus input when opened
  useEffect(() => {
    if (!open) return;
    setUnread(0);
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: reduce ? "auto" : "smooth",
      });
  }, [messages, typing, reduce]);

  // Auto-grow textarea (max ~4 lines)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [draft, open]);

  // Cancel any in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text || typing) return;
      if (text.length > MAX_LENGTH) return;

      const userMsg = makeMessage("user", text);
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      setDraft("");
      setEmojiOpen(false);
      setTyping(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let replyText;
      let isLocal = false;
      try {
        replyText = await askChatbot(toHistory(next), {
          signal: controller.signal,
        });
      } catch (error) {
        if (isAiAbort(error)) return; // reset / unmount: stay silent
        // AI failed: use a built-in answer if one matches, else show the error
        const fallback = getLocalAnswer(text);
        replyText =
          fallback ??
          error?.message ??
          "AI is unavailable right now. Please try again.";
        isLocal = true;
      }

      if (abortRef.current !== controller) return; // stale
      setMessages((m) => [...m, makeMessage("bot", replyText, isLocal)]);
      setTyping(false);
      if (!openRef.current) setUnread((u) => u + 1);
    },
    [typing, askChatbot],
  );

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTyping(false);
    setDraft("");
    setEmojiOpen(false);
    setMessages([WELCOME()]);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  const hasUserMessages = messages.some((m) => m.from === "user");
  const canSend = draft.trim().length > 0 && !typing;
  const remaining = MAX_LENGTH - draft.length;

  return (
    <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Chatty assistant"
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{ originX: 1, originY: 1 }}
            className="flex max-h-[calc(100dvh-6.5rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl shadow-black/50"
          >
            {/* header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-base-300 bg-base-200/40 px-4 py-3.5">
              <div className="relative">
                <div className="flex size-10 items-center justify-center rounded-full border border-primary/40 bg-base-300 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-base-100 bg-success" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-base-content">
                  Chatty Assistant
                </p>
                <p className="text-xs text-success">
                  {typing ? "Typing…" : "Online · replies instantly"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Start a new conversation"
                  title="New conversation"
                  className="flex size-9 items-center justify-center rounded-full text-base-content/50 transition-colors hover:bg-base-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:size-8"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    launcherRef.current?.focus();
                  }}
                  aria-label="Close chat"
                  className="flex size-9 items-center justify-center rounded-full text-base-content/50 transition-colors hover:bg-base-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:size-8"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* messages */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="h-[clamp(14rem,50dvh,26rem)] min-h-0 space-y-3.5 overflow-y-auto overscroll-contain bg-base-100 px-4 py-4 [scrollbar-color:var(--color-base-300)_transparent] [scrollbar-width:thin] sm:h-96"
            >
              <div className="flex justify-center">
                <span className="rounded-full border border-base-300 bg-base-200/60 px-3 py-0.5 text-[11px] font-medium text-base-content/70">
                  Today
                </span>
              </div>

              {messages.map((m) => (
                <Message key={m.id} message={m} reduce={reduce} />
              ))}

              {typing && (
                <div className="flex items-end gap-2.5">
                  <BotAvatar />
                  <div className="rounded-2xl rounded-bl-md border border-base-300 bg-base-200 px-3.5 py-3">
                    <TypingDots reduce={reduce} />
                  </div>
                </div>
              )}
            </div>

            {/* quick replies (shown until the user starts chatting) */}
            <AnimatePresence initial={false}>
              {!hasUserMessages && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto border-t border-base-300 px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={typing}
                        onClick={() => send(q)}
                        className="shrink-0 touch-manipulation rounded-full border border-primary/30 bg-base-200/60 px-3.5 py-1.5 text-xs font-medium sm:px-3 sm:py-1 text-primary transition-colors hover:bg-primary hover:text-primary-content focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* composer */}
            <div className="relative shrink-0 border-t border-base-300 px-3 pt-2.5 pb-2">
              <AnimatePresence>
                {emojiOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-3 mb-1 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl shadow-black/40"
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        aria-label={`Insert ${emoji}`}
                        onClick={() => {
                          setDraft((d) => (d + emoji).slice(0, MAX_LENGTH));
                          inputRef.current?.focus();
                        }}
                        className="flex size-9 items-center justify-center rounded-lg text-lg sm:size-8 transition-colors hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 rounded-3xl border border-base-300 bg-base-200/60 py-1.5 pr-1.5 pl-2 transition-colors focus-within:border-primary/60">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  aria-label="Add emoji"
                  aria-expanded={emojiOpen}
                  className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-base-content/50 sm:size-8 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Smile className="size-[18px]" />
                </button>

                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={MAX_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="max-h-24 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base text-base-content sm:text-sm outline-none placeholder:text-base-content/40"
                />

                <button
                  type="button"
                  onClick={() => send(draft)}
                  disabled={!canSend}
                  aria-label="Send message"
                  className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-primary text-primary-content shadow-md sm:size-8 shadow-primary/30 transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <SendHorizontal className="size-4" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between px-1.5 text-[11px] text-base-content/40">
                <span>Enter to send · Shift+Enter for a new line</span>
                {remaining <= 50 && (
                  <span className={remaining <= 10 ? "text-warning" : ""}>
                    {remaining}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* launcher */}
      <motion.button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        whileHover={reduce ? undefined : { scale: 1.08 }}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-content shadow-xl shadow-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "x" : "chat"}
            initial={{ rotate: reduce ? 0 : -80, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: reduce ? 0 : 80, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            {open ? (
              <X className="size-6" />
            ) : (
              <MessageCircle className="size-6" />
            )}
          </motion.span>
        </AnimatePresence>

        {!open && unread > 0 && (
          <span
            aria-label={`${unread} unread message${unread > 1 ? "s" : ""}`}
            className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full border-2 border-base-100 bg-error px-1 text-[10px] font-bold text-error-content"
          >
            {unread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
