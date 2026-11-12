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
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  useAiStore,
  isAiAbort,
  AI_CHAT_MAX_LENGTH,
} from "../../store/useAiStore.js";

const QUICK_REPLIES = [
  { label: "How do groups work?", emoji: "👥" },
  { label: "Is my chat secure?", emoji: "🔒" },
  { label: "Change theme", emoji: "🎨" },
  { label: "Talk to support", emoji: "💬" },
];

const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "😎"];
const MAX_LENGTH = AI_CHAT_MAX_LENGTH;
const MAX_HISTORY = 10;

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
const makeMessage = (from, text, local = false, error = false) => ({
  id: nextId++,
  from,
  text,
  local,
  error,
  time: formatTime(new Date()),
});

const WELCOME = () =>
  makeMessage(
    "bot",
    "Hi! 👋 I'm your Chatty assistant. Ask me anything about groups, themes or privacy.",
    true,
  );

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

const BotAvatar = ({ size = "size-8" }) => (
  <div
    aria-hidden="true"
    className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-md shadow-primary/30`}
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

const Message = ({ message, showAvatar, reduce }) => {
  const isUser = message.from === "user";
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(message.text);
    } catch {}
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const canCopy = !isUser && !message.local;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
      style={{ originX: isUser ? 1 : 0 }}
      className={`group flex items-end gap-2.5 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser &&
        (showAvatar ? <BotAvatar /> : <span className="size-8 shrink-0" />)}

      <div
        className={`flex max-w-[85%] items-center gap-1 sm:max-w-[78%] ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className={`min-w-0 px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap ${
            isUser
              ? "rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-secondary font-medium text-primary-content shadow-lg shadow-primary/25"
              : message.error
                ? "rounded-2xl rounded-bl-md border border-error/40 bg-error/10 text-base-content"
                : "rounded-2xl rounded-bl-md border border-base-300 bg-base-200 text-base-content shadow-sm"
          }`}
        >
          {message.error && (
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-error">
              <AlertCircle className="size-3.5" /> Something went wrong
            </span>
          )}
          {message.text}
          <div
            className={`mt-1 flex items-center gap-1 text-[10px] ${
              isUser ? "justify-end opacity-75" : "text-base-content/40"
            }`}
          >
            {message.time}
            {isUser && (
              <CheckCheck className="size-3.5" aria-label="Delivered" />
            )}
          </div>
        </div>

        {canCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy reply"}
            title={copied ? "Copied" : "Copy reply"}
            className={`flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-base-content/40 transition-all hover:bg-base-200 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${
              copied ? "!opacity-100 text-success" : ""
            } ${FOCUS}`}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        )}
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
  const [teaser, setTeaser] = useState(false);
  const [teaserSeen, setTeaserSeen] = useState(false);
  const [showJump, setShowJump] = useState(false);

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

  useEffect(() => {
    if (open || teaserSeen) {
      setTeaser(false);
      return;
    }
    const t = setTimeout(() => setTeaser(true), 3500);
    return () => clearTimeout(t);
  }, [open, teaserSeen]);

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

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    setTeaserSeen(true);
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = scrollRef.current;
      if (el)
        el.scrollTo({
          top: el.scrollHeight,
          behavior: reduce || !smooth ? "auto" : "smooth",
        });
    },
    [reduce],
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [draft, open]);

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
      let isError = false;
      try {
        replyText = await askChatbot(toHistory(next), {
          signal: controller.signal,
        });
      } catch (error) {
        if (isAiAbort(error)) return;
        const fallback = getLocalAnswer(text);
        isError = !fallback;
        replyText =
          fallback ??
          error?.message ??
          "AI is unavailable right now. Please try again.";
        isLocal = true;
      }

      if (abortRef.current !== controller) return; // stale
      setMessages((m) => [
        ...m,
        makeMessage("bot", replyText, isLocal, isError),
      ]);
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
            className="flex max-h-[calc(100dvh-6.5rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl shadow-black/50 ring-1 ring-primary/10"
          >
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden border-b border-base-300 bg-gradient-to-br from-primary/20 via-base-200/60 to-secondary/15 px-4 py-3.5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-primary/20 blur-2xl"
              />
              <div className="relative">
                <BotAvatar size="size-10" />
                <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-base-100 bg-success" />
              </div>
              <div className="relative leading-tight">
                <p className="text-sm font-semibold text-base-content">
                  Chatty Assistant
                </p>
                <p
                  className={`text-xs ${typing ? "text-primary" : "text-success"}`}
                >
                  {typing ? "Typing…" : "Online, replies instantly"}
                </p>
              </div>
              <div className="relative ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Start a new conversation"
                  title="New conversation"
                  className={`flex size-9 items-center justify-center rounded-full text-base-content/55 transition-colors hover:bg-base-100/70 hover:text-primary sm:size-8 ${FOCUS}`}
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
                  className={`flex size-9 items-center justify-center rounded-full text-base-content/55 transition-colors hover:bg-base-100/70 hover:text-primary sm:size-8 ${FOCUS}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0">
              <div
                ref={scrollRef}
                onScroll={onScroll}
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                className="h-[clamp(14rem,50dvh,26rem)] min-h-0 space-y-2.5 overflow-y-auto overscroll-contain bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-4 [scrollbar-color:var(--color-base-300)_transparent] [scrollbar-width:thin] sm:h-96"
              >
                <div className="flex justify-center pb-1">
                  <span className="rounded-full border border-base-300 bg-base-200/60 px-3 py-0.5 text-[11px] font-medium text-base-content/70">
                    Today
                  </span>
                </div>

                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const showAvatar = !prev || prev.from !== m.from;
                  return (
                    <div
                      key={m.id}
                      className={showAvatar && i > 0 ? "pt-1.5" : ""}
                    >
                      <Message
                        message={m}
                        showAvatar={showAvatar}
                        reduce={reduce}
                      />
                    </div>
                  );
                })}

                {typing && (
                  <div className="flex items-end gap-2.5">
                    <BotAvatar />
                    <div className="rounded-2xl rounded-bl-md border border-base-300 bg-base-200 px-3.5 py-3">
                      <TypingDots reduce={reduce} />
                    </div>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showJump && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={() => scrollToBottom()}
                    aria-label="Scroll to latest message"
                    className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-[11px] font-medium text-base-content/70 shadow-lg transition-colors hover:text-primary ${FOCUS}`}
                  >
                    <ChevronDown className="size-3.5" /> Latest
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

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
                        key={q.label}
                        type="button"
                        disabled={typing}
                        onClick={() => send(q.label)}
                        className={`flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-primary/30 bg-base-200/60 px-3.5 py-1.5 text-xs font-medium text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-primary-content active:translate-y-0 disabled:opacity-50 sm:px-3 sm:py-1 ${FOCUS}`}
                      >
                        <span aria-hidden="true">{q.emoji}</span>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative shrink-0 border-t border-base-300 bg-base-100 px-3 pt-2.5 pb-2">
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
                        className={`flex size-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-110 hover:bg-base-200 sm:size-8 ${FOCUS}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 rounded-3xl border border-base-300 bg-base-200/60 py-1.5 pr-1.5 pl-2 transition-all focus-within:border-primary/60 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/20">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  aria-label="Add emoji"
                  aria-expanded={emojiOpen}
                  className={`mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:text-primary sm:size-8 ${
                    emojiOpen ? "text-primary" : "text-base-content/50"
                  } ${FOCUS}`}
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
                  className="max-h-24 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base text-base-content outline-none placeholder:text-base-content/40 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={() => send(draft)}
                  disabled={!canSend}
                  aria-label="Send message"
                  className={`flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-md shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-40 disabled:shadow-none sm:size-8 ${FOCUS}`}
                >
                  <SendHorizontal className="size-4" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between px-1.5 text-[11px] text-base-content/40">
                <span>Enter to send, Shift+Enter for a new line</span>
                {remaining <= 50 && (
                  <span
                    className={`tabular-nums ${
                      remaining <= 10 ? "font-semibold text-warning" : ""
                    }`}
                  >
                    {remaining}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && teaser && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            style={{ originX: 1, originY: 1 }}
            className="relative max-w-[16rem] rounded-2xl rounded-br-md border border-base-300 bg-base-100 py-2.5 pr-9 pl-3.5 shadow-xl shadow-black/30"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(true);
              }}
              className={`text-left text-[13px] leading-snug text-base-content ${FOCUS} rounded-md`}
            >
              <span className="font-semibold">Need a hand? 👋</span>
              <span className="block text-base-content/60">
                Ask me about groups, themes or privacy.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTeaser(false);
                setTeaserSeen(true);
              }}
              aria-label="Dismiss"
              className={`absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full text-base-content/45 transition-colors hover:bg-base-200 hover:text-base-content ${FOCUS}`}
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        whileHover={reduce ? undefined : { scale: 1.08 }}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        className={`relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content shadow-xl shadow-primary/40 ${FOCUS}`}
      >
        {!open && unread > 0 && !reduce && (
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40"
          />
        )}
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
