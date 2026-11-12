import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  MoreHorizontal,
  Moon,
  Paperclip,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Search,
  Send,
  Shuffle,
  ShieldCheck,
  Smile,
  SlidersHorizontal,
  Sun,
  Video,
  X,
} from "lucide-react";
import { SECTION, GRADIENT_TEXT, SPRING, EASE, THEMES } from "./landingData";
import {
  SectionHeading,
  Reveal,
  TypingDots,
  Avatar,
} from "./LandingPrimitives";

const DEFAULT_THEME = THEMES[1] || THEMES[0];

const DEFAULTS = {
  fontSize: "md",
  bubble: "rounded",
  density: "comfortable",
  wallpaper: "dots",
  timestamps: true,
  timeFormat: "12h",
  receipts: true,
};

const DARK_THEMES = new Set([
  "dark",
  "synthwave",
  "halloween",
  "forest",
  "black",
  "luxury",
  "dracula",
  "business",
  "night",
  "coffee",
  "dim",
  "sunset",
  "abyss",
]);

const FONT_CLASS = { sm: "text-[12px]", md: "text-[13px]", lg: "text-[15px]" };

const BUBBLE = {
  rounded: {
    base: "rounded-2xl",
    inTail: "rounded-bl-md",
    outTail: "rounded-br-md",
  },
  soft: { base: "rounded-[1.6rem]", inTail: "", outTail: "" },
  sharp: { base: "rounded-md", inTail: "", outTail: "" },
};

const DENSITY = {
  comfortable: { gap: "space-y-2.5", pad: "px-3.5 py-2.5" },
  compact: { gap: "space-y-1", pad: "px-3 py-1.5" },
};

const WALLPAPER = {
  none: "",
  dots: "text-base-content/[0.12] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px]",
  grid: "text-base-content/[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:28px_28px]",
  aurora: "bg-gradient-to-br from-primary/15 via-transparent to-secondary/20",
};

const CONVOS = {
  "Priya Sharma": {
    kind: "dm",
    initials: "PS",
    online: true,
    sub: "Online",
    replies: [
      "Haha, exactly what I was thinking! 😄",
      "Love it. The bubbles look so clean.",
      "Okay that is actually really smooth ✨",
      "Send me the link when it's live!",
    ],
    seed: [
      { from: "them", text: "Wow, this theme looks great! 😍", h: 10, m: 42 },
      {
        from: "me",
        text: "Right? Switch themes anytime in Settings.",
        h: 10,
        m: 43,
        status: "read",
      },
      { from: "ai", text: "Want a darker one for night? 🌙", h: 10, m: 43 },
      {
        from: "me",
        text: "Yes, show me the dark ones!",
        h: 10,
        m: 44,
        status: "read",
      },
    ],
  },
  "Design Team": {
    kind: "group",
    sub: "6 members",
    unread: 3,
    replies: [
      "Arjun: Nice, adding that to the board.",
      "Neha: Can we try a softer radius?",
      "Arjun: Shipping the mockups tonight 🚀",
    ],
    seed: [
      { from: "them", text: "Updated the mockups, take a look!", h: 10, m: 18 },
      { from: "them", text: "Dark variants are in Figma too.", h: 10, m: 20 },
    ],
  },
  "Chatty AI": {
    kind: "ai",
    sub: "Always on",
    replies: [
      "Try typing “dark” or “light” and watch the whole stage change.",
      "I can summarise long threads for you in one tap.",
      "Pro tip: double-tap any bubble to react ❤️",
    ],
    seed: [
      {
        from: "ai",
        text: "Hi! Ask me anything, or type “dark” to switch themes.",
        h: 10,
        m: 40,
      },
      { from: "ai", text: "Want a darker one for night? 🌙", h: 10, m: 43 },
    ],
  },
  "Arjun Mehta": {
    kind: "dm",
    initials: "AM",
    sub: "Last seen Mon",
    replies: ["Sounds good 👍", "Give me 5 minutes.", "On it!"],
    seed: [
      { from: "them", text: "Call at 5?", h: 9, m: 15 },
      { from: "me", text: "Works for me.", h: 9, m: 20, status: "read" },
    ],
  },
};

const CHAT_NAMES = Object.keys(CONVOS);

const QUICK_REPLIES = [
  "Love it 😍",
  "Show dark themes 🌙",
  "Try a light one ☀️",
];

const formatTime = (h, m, fmt) => {
  const mm = String(m).padStart(2, "0");
  if (fmt === "24h") return `${String(h).padStart(2, "0")}:${mm}`;
  const hr = h % 12 || 12;
  return `${hr}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const buildInitialChats = () => {
  let id = 0;
  const out = {};
  for (const name of CHAT_NAMES) {
    out[name] = CONVOS[name].seed.map((m) => ({
      ...m,
      id: ++id,
      liked: false,
    }));
  }
  return { chats: out, nextId: id + 1 };
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const ControlLabel = ({ children }) => (
  <p className="mb-1.5 text-xs font-medium text-base-content/60">{children}</p>
);

const ToolBtn = ({ label, onClick, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full transition-colors sm:size-9 ${FOCUS} ${
      active
        ? "bg-primary text-primary-content shadow-sm"
        : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    {children}
  </button>
);

const Segmented = ({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  reduceMotion,
}) => {
  const groupId = useId();
  return (
    <div className="min-w-0">
      {label && <ControlLabel>{label}</ControlLabel>}
      <div
        role="radiogroup"
        aria-label={label || ariaLabel || "Options"}
        className="relative isolate flex rounded-xl border border-base-300 bg-base-200/70 p-1"
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`relative min-h-10 flex-1 touch-manipulation rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors sm:min-h-9 sm:px-2 ${FOCUS} ${
                active
                  ? "text-base-content"
                  : "text-base-content/55 hover:text-base-content"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={groupId}
                  transition={reduceMotion ? { duration: 0 } : SPRING}
                  className="absolute inset-0 -z-10 rounded-lg bg-base-100 shadow-sm ring-1 ring-base-300"
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Switch = ({ label, hint, checked, onChange }) => (
  <div className="flex min-h-10 items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium leading-tight">{label}</p>
      {hint && (
        <p className="mt-0.5 text-xs leading-snug text-base-content/55">
          {hint}
        </p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 touch-manipulation rounded-full transition-colors ${FOCUS} ${
        checked ? "bg-primary" : "bg-base-300"
      }`}
    >
      <motion.span
        layout
        transition={SPRING}
        className={`absolute top-0.5 size-5 rounded-full bg-base-100 shadow ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  </div>
);

const Swatches = ({ className = "" }) => (
  <span
    className={`flex items-center -space-x-1 ${className}`}
    aria-hidden="true"
  >
    <span className="size-3 rounded-full bg-primary ring-2 ring-base-100" />
    <span className="size-3 rounded-full bg-secondary ring-2 ring-base-100" />
    <span className="size-3 rounded-full bg-accent ring-2 ring-base-100" />
    <span className="size-3 rounded-full bg-neutral ring-2 ring-base-100" />
  </span>
);

const ThemeCard = ({ t, active, onSelect }) => (
  <button
    type="button"
    data-theme={t}
    data-card={t}
    onClick={() => onSelect(t)}
    aria-pressed={active}
    className={`group relative w-32 shrink-0 touch-manipulation snap-center rounded-2xl border bg-base-100 p-2 text-left text-base-content transition-all duration-200 hover:border-primary/50 hover:shadow-lg sm:w-36 ${FOCUS} ${
      active
        ? "border-primary shadow-lg ring-2 ring-primary/40"
        : "border-base-300"
    }`}
  >
    <div className="relative space-y-1.5 rounded-xl border border-base-300 bg-base-200 p-2">
      <div className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="h-1 w-8 rounded-full bg-base-300" />
      </div>
      <span className="block h-2.5 w-3/4 rounded-md rounded-bl-sm bg-base-300" />
      <span className="ml-auto block h-2.5 w-2/3 rounded-md rounded-br-sm bg-primary" />
      <span className="block h-2.5 w-1/2 rounded-md rounded-bl-sm bg-secondary/70" />
      {active && (
        <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-content shadow">
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
    </div>
    <div className="mt-2 flex items-center justify-between gap-2 px-0.5 pb-0.5">
      <span className="truncate text-xs font-semibold capitalize">{t}</span>
      <Swatches />
    </div>
  </button>
);

const Bubble = ({ msg, s, onLike }) => {
  const b = BUBBLE[s.bubble];
  const d = DENSITY[s.density];
  const mine = msg.from === "me";
  const ai = msg.from === "ai";
  const lastTap = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      onLike(msg.id);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const tone = mine
    ? "bg-primary text-primary-content shadow-sm shadow-primary/20"
    : ai
      ? "border border-secondary/30 bg-secondary/10"
      : "border border-base-300 bg-base-100 shadow-sm";

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE }}
      onClick={handleTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onLike(msg.id);
        }
      }}
      tabIndex={0}
      title="Double-tap to react"
      className={`relative w-fit max-w-[88%] cursor-default touch-manipulation select-none transition-[border-radius,padding] duration-300 sm:max-w-[75%] ${FOCUS} ${d.pad} ${b.base} ${mine ? `ml-auto ${b.outTail}` : b.inTail} ${tone} ${
        msg.liked ? "mb-3" : ""
      }`}
    >
      {ai && (
        <p className="mb-0.5 text-[11px] font-semibold text-secondary">
          Chatty AI
        </p>
      )}
      <p className="break-words leading-snug [overflow-wrap:anywhere]">
        {msg.text}
      </p>
      {(s.timestamps || (mine && s.receipts)) && (
        <p
          className={`mt-1 flex items-center gap-1 text-[10px] tabular-nums ${
            mine
              ? "justify-end text-primary-content/70"
              : "text-base-content/50"
          }`}
        >
          {s.timestamps && formatTime(msg.h, msg.m, s.timeFormat)}
          {mine && s.receipts && (
            <span
              aria-label={msg.status === "read" ? "Read" : "Sent"}
              className={msg.status === "read" ? "text-accent" : ""}
            >
              {msg.status === "read" ? (
                <CheckCheck className="size-3" />
              ) : (
                <Check className="size-3" />
              )}
            </span>
          )}
        </p>
      )}
      <AnimatePresence>
        {msg.liked && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={SPRING}
            className={`absolute -bottom-2.5 flex size-5 items-center justify-center rounded-full border border-base-300 bg-base-100 text-error shadow ${
              mine ? "left-2" : "right-2"
            }`}
          >
            <Heart className="size-3 fill-current" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SidebarItem = ({ c, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(c.name)}
    aria-current={c.active ? "true" : undefined}
    className={`relative flex w-full touch-manipulation items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${FOCUS} ${
      c.active ? "bg-primary/10" : "hover:bg-base-200"
    }`}
  >
    {c.active && (
      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
    )}
    <Avatar
      size="sm"
      initials={c.initials}
      online={c.online}
      ai={c.kind === "ai"}
      group={c.kind === "group"}
      ringClass="ring-base-100"
    />
    <div className="min-w-0 flex-1 leading-tight">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold">{c.name}</p>
        <span className="shrink-0 text-[10px] text-base-content/45">
          {c.time}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-base-content/55">{c.last}</p>
        {c.unread > 0 && (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-content">
            {c.unread}
          </span>
        )}
      </div>
    </div>
  </button>
);

const ChatWindow = ({
  s,
  theme,
  chats,
  active,
  onSelect,
  typing,
  draft,
  setDraft,
  onSend,
  onLike,
  sidebar,
}) => {
  const convo = CONVOS[active];
  const messages = chats[active];
  const scrollerRef = useRef(null);
  const [chatQuery, setChatQuery] = useState("");

  const filteredSidebar = sidebar.filter((c) =>
    c.name.toLowerCase().includes(chatQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing, active]);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl shadow-base-content/5 transition-colors duration-500">
      <div className="flex items-center gap-3 border-b border-base-300 bg-base-100 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-content">
            C
          </span>
          <span className="text-xs font-semibold">Chatty</span>
        </div>
        <span className="mx-auto hidden items-center gap-1.5 text-[11px] text-base-content/50 sm:flex">
          <ShieldCheck className="size-3" /> End-to-end encrypted
        </span>
        <div className="ml-auto overflow-hidden sm:ml-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="block rounded-full border border-base-300 bg-base-200 px-2.5 py-0.5 text-[11px] font-medium capitalize"
            >
              {theme}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex h-[clamp(28rem,78dvh,33rem)] sm:h-[clamp(30rem,72dvh,34rem)]">
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-base-300 bg-base-100 p-3 md:flex lg:hidden xl:flex">
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-base-300 bg-base-200/60 px-3 py-2 text-base-content/50 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25">
            <Search className="size-3.5 shrink-0" />
            <input
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="min-w-0 flex-1 bg-transparent text-xs text-base-content outline-none placeholder:text-base-content/45"
            />
          </label>
          <div className="space-y-0.5">
            {filteredSidebar.map((c) => (
              <SidebarItem key={c.name} c={c} onSelect={onSelect} />
            ))}
            {filteredSidebar.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-base-content/50">
                No chats match “{chatQuery}”.
              </p>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-base-300 px-3 py-2.5 sm:px-4 sm:py-3">
            <Avatar
              initials={convo.initials}
              online={convo.online}
              ai={convo.kind === "ai"}
              group={convo.kind === "group"}
              ringClass="ring-base-100"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{active}</p>
              <p
                className={`truncate text-xs ${
                  typing === active
                    ? "text-primary"
                    : convo.online
                      ? "text-success"
                      : "text-base-content/50"
                }`}
              >
                {typing === active ? "typing…" : convo.sub}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden items-center gap-1 text-base-content/40 sm:flex"
            >
              <span className="flex size-8 items-center justify-center rounded-full">
                <Phone className="size-4" />
              </span>
              <span className="flex size-8 items-center justify-center rounded-full">
                <Video className="size-4" />
              </span>
              <span className="flex size-8 items-center justify-center rounded-full">
                <MoreHorizontal className="size-4" />
              </span>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Conversations"
            className="flex gap-1.5 overflow-x-auto border-b border-base-300 px-3 py-2 md:hidden lg:flex xl:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CHAT_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={n === active}
                onClick={() => onSelect(n)}
                className={`shrink-0 touch-manipulation rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${FOCUS} ${
                  n === active
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="relative min-h-0 flex-1 bg-base-200/50 transition-colors duration-300">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${WALLPAPER[s.wallpaper]}`}
            />
            <div
              ref={scrollerRef}
              role="log"
              aria-live="polite"
              aria-label={`Conversation with ${active}`}
              className={`relative h-full overflow-y-auto overscroll-contain px-3 py-4 transition-all duration-300 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${FONT_CLASS[s.fontSize]} ${DENSITY[s.density].gap}`}
            >
              <p className="mx-auto w-fit rounded-full bg-base-100/90 px-2.5 py-0.5 text-[10px] font-medium text-base-content/55 shadow-sm">
                Today
              </p>
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <Bubble key={m.id} msg={m} s={s} onLike={onLike} />
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {typing === active && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pt-1"
                  >
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-t border-base-300 bg-base-100 px-3 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSend(q)}
                className={`shrink-0 touch-manipulation rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-primary/50 hover:bg-primary/10 ${FOCUS}`}
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend(draft);
            }}
            className="bg-base-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center gap-1.5 rounded-2xl border border-base-300 bg-base-200/50 p-1.5 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25">
              <Paperclip
                aria-hidden="true"
                className="ml-2 hidden size-4 shrink-0 text-base-content/40 sm:block"
              />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder='Type a message… try "dark"'
                aria-label="Type a message"
                enterKeyHint="send"
                autoComplete="off"
                maxLength={120}
                className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-base-content/40 sm:text-xs"
              />
              <Smile
                aria-hidden="true"
                className="hidden size-4 shrink-0 text-base-content/40 sm:block"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
                className={`flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none sm:size-9 ${FOCUS}`}
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const ThemeShowcase = () => {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef(null);
  const railRef = useRef(null);
  const settingsRef = useRef(null);
  const timers = useRef([]);
  const nextId = useRef(1);
  const inView = useInView(stageRef, { margin: "-120px" });
  const isSm = useMediaQuery("(min-width: 640px)");

  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [s, setS] = useState(DEFAULTS);
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [chats, setChats] = useState(() => {
    const init = buildInitialChats();
    nextId.current = init.nextId;
    return init.chats;
  });
  const [unread, setUnread] = useState({ "Design Team": 3 });
  const [active, setActive] = useState("Priya Sharma");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return THEMES.filter((t) => {
      if (filter === "dark" && !DARK_THEMES.has(t)) return false;
      if (filter === "light" && DARK_THEMES.has(t)) return false;
      return !q || t.toLowerCase().includes(q);
    });
  }, [filter, query]);

  const pool = visible.length ? visible : THEMES;

  const collapsed = !isSm && !panelOpen;
  useEffect(() => {
    if (settingsRef.current) settingsRef.current.inert = collapsed;
  }, [collapsed]);

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pick = (t) => {
    setAuto(false);
    setTheme(t);
  };

  const step = (dir) => {
    setAuto(false);
    setTheme((cur) => {
      const i = pool.indexOf(cur);
      if (i < 0) return dir > 0 ? pool[0] : pool[pool.length - 1];
      return pool[(i + dir + pool.length) % pool.length];
    });
  };

  const shuffle = () => {
    setAuto(false);
    const others = pool.filter((t) => t !== theme);
    if (others.length) setTheme(pickRandom(others));
  };

  const set = (key) => (value) => setS((p) => ({ ...p, [key]: value }));
  const changed = JSON.stringify(s) !== JSON.stringify(DEFAULTS);
  const reset = () => setS(DEFAULTS);

  const copyTheme = async () => {
    try {
      await navigator.clipboard.writeText(`<html data-theme="${theme}">`);
      setCopied(true);
      later(() => setCopied(false), 1600);
    } catch {}
  };

  const selectChat = (name) => {
    setActive(name);
    setUnread((u) => ({ ...u, [name]: 0 }));
  };

  const like = useCallback(
    (id) =>
      setChats((prev) => ({
        ...prev,
        [active]: prev[active].map((m) =>
          m.id === id ? { ...m, liked: !m.liked } : m,
        ),
      })),
    [active],
  );

  const send = (raw) => {
    const text = raw.trim();
    if (!text) return;
    setAuto(false);
    setDraft("");

    const chat = active;
    const now = new Date();
    const myId = nextId.current++;
    const mine = {
      id: myId,
      from: "me",
      text,
      h: now.getHours(),
      m: now.getMinutes(),
      status: "sent",
      liked: false,
    };
    setChats((p) => ({ ...p, [chat]: [...p[chat], mine] }));

    const wantsDark = /\b(dark|night)\b/i.test(text);
    const wantsLight = /\b(light|day|bright)\b/i.test(text);
    if (wantsDark || wantsLight) {
      const options = THEMES.filter((t) =>
        wantsDark ? DARK_THEMES.has(t) : !DARK_THEMES.has(t),
      ).filter((t) => t !== theme);
      if (options.length) later(() => setTheme(pickRandom(options)), 500);
    }

    later(() => {
      setChats((p) => ({
        ...p,
        [chat]: p[chat].map((m) =>
          m.id === myId ? { ...m, status: "read" } : m,
        ),
      }));
      setTyping(chat);
    }, 700);

    later(() => {
      const convo = CONVOS[chat];
      let reply = pickRandom(convo.replies);
      if (wantsDark) reply = "Switching to something darker 🌙";
      else if (wantsLight) reply = "Here's a brighter one ☀️";
      const t = new Date();
      setChats((p) => ({
        ...p,
        [chat]: [
          ...p[chat],
          {
            id: nextId.current++,
            from: convo.kind === "ai" ? "ai" : "them",
            text: reply,
            h: t.getHours(),
            m: t.getMinutes(),
            liked: false,
          },
        ],
      }));
      setTyping(null);
    }, 1900);
  };

  const sidebar = CHAT_NAMES.map((name) => {
    const list = chats[name];
    const last = list[list.length - 1];
    return {
      name,
      kind: CONVOS[name].kind,
      initials: CONVOS[name].initials,
      online: CONVOS[name].online,
      active: name === active,
      unread: unread[name] || 0,
      last: last.text,
      time: formatTime(last.h, last.m, s.timeFormat),
    };
  });

  useEffect(() => {
    if (!auto || !inView || reduceMotion) return;
    const id = setInterval(() => {
      setTheme((cur) => {
        const i = pool.indexOf(cur);
        return pool[(i + 1) % pool.length];
      });
    }, 3200);
    return () => clearInterval(id);
  }, [auto, inView, reduceMotion, pool]);

  useEffect(() => {
    const rail = railRef.current;
    const card = rail?.querySelector(`[data-card="${theme}"]`);
    if (!rail || !card) return;
    rail.scrollTo({
      left: card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [theme, reduceMotion, filter, query]);

  const onRailKey = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const themeIdx = visible.indexOf(theme);
  const isDark = DARK_THEMES.has(theme);

  return (
    <div
      ref={stageRef}
      data-theme={theme}
      className="relative isolate w-full min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-100 text-base-content shadow-2xl shadow-base-content/10 transition-colors duration-500 sm:rounded-[2rem]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/10 via-secondary/5 to-transparent transition-colors duration-500"
      />

      <div className="p-3 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="h-8 overflow-hidden sm:h-9">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h3
                  key={theme}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -24, opacity: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="truncate text-2xl font-semibold capitalize leading-8 tracking-tight sm:text-[1.75rem] sm:leading-9"
                >
                  {theme}
                </motion.h3>
              </AnimatePresence>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-base-content/60">
              <Swatches />
              <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200/70 px-2 py-0.5 font-medium text-base-content/75">
                {isDark ? (
                  <Moon className="size-3" />
                ) : (
                  <Sun className="size-3" />
                )}
                {isDark ? "Dark" : "Light"}
              </span>
              <span className="tabular-nums">
                {themeIdx >= 0
                  ? `${themeIdx + 1} of ${visible.length}`
                  : `${visible.length} shown`}
              </span>
            </div>
          </div>

          <div
            role="toolbar"
            aria-label="Theme controls"
            className="flex items-center justify-between gap-1 self-stretch rounded-full border border-base-300 bg-base-100/80 p-1 shadow-sm backdrop-blur sm:self-auto"
          >
            <ToolBtn label="Previous theme" onClick={() => step(-1)}>
              <ChevronLeft className="size-4" />
            </ToolBtn>
            <ToolBtn label="Next theme" onClick={() => step(1)}>
              <ChevronRight className="size-4" />
            </ToolBtn>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-base-300" />
            <ToolBtn label="Random theme" onClick={shuffle}>
              <Shuffle className="size-4" />
            </ToolBtn>
            <ToolBtn
              label={auto ? "Pause autoplay" : "Play themes automatically"}
              onClick={() => setAuto((a) => !a)}
              active={auto && !reduceMotion}
            >
              {auto ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </ToolBtn>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-h-10 flex-1 items-center gap-2 rounded-xl border border-base-300 bg-base-100/80 px-3 text-base-content/50 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 sm:min-h-9">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAuto(false);
              }}
              placeholder="Search themes"
              aria-label="Search themes"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-base-content outline-none placeholder:text-base-content/45 sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className={`flex size-6 items-center justify-center rounded-full hover:bg-base-200 ${FOCUS}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </label>
          <div className="w-full sm:w-72">
            <Segmented
              ariaLabel="Theme brightness"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setAuto(false);
              }}
              reduceMotion={reduceMotion}
              options={[
                { value: "all", label: `All ${THEMES.length}` },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>

        <div className="relative -mx-3 sm:-mx-6 lg:-mx-8 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
          {visible.length > 0 ? (
            <div
              ref={railRef}
              role="group"
              aria-label="Choose a theme (use left and right arrow keys)"
              onKeyDown={onRailKey}
              className="relative flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-5 pt-4 sm:gap-3 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visible.map((t) => (
                <ThemeCard key={t} t={t} active={theme === t} onSelect={pick} />
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-base-content/60 lg:px-8">
              No themes match “{query}”.{" "}
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className={`rounded font-medium text-primary underline-offset-2 hover:underline ${FOCUS}`}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="mt-1 grid items-start gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="min-w-0 lg:col-span-8">
            <ChatWindow
              s={s}
              theme={theme}
              chats={chats}
              active={active}
              onSelect={selectChat}
              typing={typing}
              draft={draft}
              setDraft={setDraft}
              onSend={send}
              onLike={like}
              sidebar={sidebar}
            />
          </div>

          <div className="min-w-0 rounded-2xl border border-base-300 bg-base-200/50 sm:bg-base-100 sm:shadow-lg sm:shadow-base-content/5 lg:sticky lg:top-6 lg:col-span-4">
            <div className="flex items-center gap-2 p-3 sm:items-start sm:p-6 sm:pb-0">
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                aria-expanded={panelOpen}
                aria-controls="theme-settings"
                className={`flex min-h-12 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-1 text-left sm:pointer-events-none sm:min-h-0 sm:px-0 ${FOCUS}`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:hidden"
                >
                  <SlidersHorizontal className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base font-semibold leading-tight">
                    Appearance
                    {changed && (
                      <span
                        className="size-1.5 rounded-full bg-primary"
                        title="Modified"
                        aria-label="Modified"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-base-content/60">
                    {panelOpen || isSm
                      ? "The preview updates as you change things."
                      : "Font, bubbles, background and more"}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-base-100 text-base-content/70 ring-1 ring-base-300 sm:hidden"
                >
                  <ChevronDown
                    className={`size-4 transition-transform duration-300 ${
                      panelOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={!changed}
                className={`hidden h-8 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border border-base-300 px-3 text-xs font-medium transition-colors hover:bg-base-200 disabled:pointer-events-none disabled:opacity-40 sm:flex ${FOCUS}`}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            </div>

            <div
              id="theme-settings"
              className={`grid transition-[grid-template-rows] duration-300 ease-out sm:grid-rows-[1fr] ${
                panelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div
                ref={settingsRef}
                className="-mx-1 min-h-0 overflow-hidden px-1"
              >
                <div className="grid gap-6 px-3 pb-4 pt-3 sm:grid-cols-2 sm:px-6 sm:pb-6 sm:pt-5 lg:grid-cols-1">
                  <section className="space-y-4" aria-label="Text and bubbles">
                    <Segmented
                      label="Font size"
                      value={s.fontSize}
                      onChange={set("fontSize")}
                      reduceMotion={reduceMotion}
                      options={[
                        { value: "sm", label: "Small" },
                        { value: "md", label: "Medium" },
                        { value: "lg", label: "Large" },
                      ]}
                    />
                    <Segmented
                      label="Bubble style"
                      value={s.bubble}
                      onChange={set("bubble")}
                      reduceMotion={reduceMotion}
                      options={[
                        { value: "rounded", label: "Rounded" },
                        { value: "soft", label: "Soft" },
                        { value: "sharp", label: "Sharp" },
                      ]}
                    />
                    <Segmented
                      label="Spacing"
                      value={s.density}
                      onChange={set("density")}
                      reduceMotion={reduceMotion}
                      options={[
                        { value: "comfortable", label: "Cozy" },
                        { value: "compact", label: "Compact" },
                      ]}
                    />
                  </section>

                  <section
                    className="space-y-4 border-t border-base-300 pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-6"
                    aria-label="Background and messages"
                  >
                    <Segmented
                      label="Chat background"
                      value={s.wallpaper}
                      onChange={set("wallpaper")}
                      reduceMotion={reduceMotion}
                      options={[
                        { value: "none", label: "Plain" },
                        { value: "dots", label: "Dots" },
                        { value: "grid", label: "Grid" },
                        { value: "aurora", label: "Glow" },
                      ]}
                    />
                    <div className="space-y-1 pt-1">
                      <Switch
                        label="Read receipts"
                        hint="Show ticks on sent messages"
                        checked={s.receipts}
                        onChange={set("receipts")}
                      />
                      <Switch
                        label="Timestamps"
                        hint="Show the time on each message"
                        checked={s.timestamps}
                        onChange={set("timestamps")}
                      />
                    </div>
                    <div
                      className={`transition-opacity ${
                        s.timestamps ? "" : "pointer-events-none opacity-40"
                      }`}
                    >
                      <Segmented
                        label="Time format"
                        value={s.timeFormat}
                        onChange={set("timeFormat")}
                        reduceMotion={reduceMotion}
                        options={[
                          { value: "12h", label: "12-hour" },
                          { value: "24h", label: "24-hour" },
                        ]}
                      />
                    </div>
                  </section>

                  <section
                    className="border-t border-base-300 pt-6 sm:col-span-2 lg:col-span-1"
                    aria-label="Use this theme"
                  >
                    <ControlLabel>Use this theme</ControlLabel>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-base-300 bg-base-100 py-1.5 pl-3 pr-1.5 sm:bg-base-200/60">
                      <code className="min-w-0 truncate font-mono text-[11px] text-base-content/80">
                        {`<html data-theme="${theme}">`}
                      </code>
                      <button
                        type="button"
                        onClick={copyTheme}
                        aria-live="polite"
                        className={`flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg bg-base-100 px-3 text-xs font-medium shadow-sm ring-1 ring-base-300 transition-colors hover:bg-base-200 sm:h-8 ${FOCUS}`}
                      >
                        {copied ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </section>

                  <button
                    type="button"
                    onClick={reset}
                    disabled={!changed}
                    className={`flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 text-sm font-medium transition-colors hover:bg-base-200 disabled:opacity-40 sm:hidden ${FOCUS}`}
                  >
                    <RotateCcw className="size-4" />
                    Reset to defaults
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ThemesSection = () => (
  <section id="themes" className={`${SECTION} overflow-x-clip`}>
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <SectionHeading
        eyebrow="Themes"
        title={
          <>
            Chat in <span className={GRADIENT_TEXT}>your own style</span>
          </>
        }
        sub="Pick a theme and the whole stage changes with it. Type in the chat, switch conversations, and fine-tune bubbles, background and spacing."
      />
      <Reveal>
        <ThemeShowcase />
      </Reveal>
    </div>
  </section>
);
