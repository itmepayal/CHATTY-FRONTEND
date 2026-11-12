import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  Check,
  CheckCheck,
  Copy,
  Heart,
  RotateCcw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, EASE, SPRING } from "./landingData";
import {
  SectionHeading,
  Reveal,
  CheckBullet,
  TypingDots,
} from "./LandingPrimitives";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const CHAT_CARD =
  "relative overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl shadow-primary/10 ring-1 ring-base-content/5";

const useTimeouts = () => {
  const ref = useRef([]);
  useEffect(() => () => ref.current.forEach(clearTimeout), []);
  const later = useCallback((fn, ms) => {
    ref.current.push(setTimeout(fn, ms));
  }, []);
  const clear = useCallback(() => {
    ref.current.forEach(clearTimeout);
    ref.current = [];
  }, []);
  return [later, clear];
};

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const BUBBLE_VARIANTS = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const Row = ({ mine, show = true, delay = 0, children }) => (
  <motion.div
    variants={BUBBLE_VARIANTS}
    initial="hidden"
    animate={show ? "show" : "hidden"}
    transition={{ duration: 0.3, ease: EASE, delay }}
    style={{ originX: mine ? 1 : 0 }}
    className={mine ? "flex justify-end" : ""}
  >
    {children}
  </motion.div>
);

const Meta = ({ time, read, mine }) => (
  <span
    className={`flex items-center gap-1 text-[10px] tabular-nums text-base-content/45 ${
      mine ? "justify-end" : ""
    }`}
  >
    {time}
    {mine &&
      (read ? (
        <CheckCheck className="size-3 text-primary" aria-label="Read" />
      ) : (
        <Check className="size-3" aria-label="Sent" />
      ))}
  </span>
);

const MineBubble = ({ children, time, read }) => (
  <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[80%]">
    <p
      className={`${GRADIENT} rounded-2xl rounded-br-md px-3.5 py-2.5 leading-snug shadow-md shadow-primary/20 [overflow-wrap:anywhere]`}
    >
      {children}
    </p>
    {time && <Meta mine time={time} read={read} />}
  </div>
);

const AVATAR = {
  Priya: "bg-primary text-primary-content",
  Aryan: "bg-secondary text-secondary-content",
  Sneha: "bg-accent text-accent-content",
  Jay: "bg-info text-info-content",
};

const Avatar = ({ name }) => (
  <span
    aria-hidden="true"
    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm ${
      AVATAR[name] || "bg-base-300"
    }`}
  >
    {name[0]}
  </span>
);

const TypedText = ({ text, animate, onDone }) => {
  const chars = useMemo(() => Array.from(text), [text]);
  const [n, setN] = useState(animate ? 0 : chars.length);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!animate) {
      setN(chars.length);
      return;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v + 2 >= chars.length) {
          clearInterval(id);
          return chars.length;
        }
        return v + 2;
      });
    }, 22);
    return () => clearInterval(id);
  }, [chars, animate]);

  useEffect(() => {
    if (animate && n >= chars.length) doneRef.current?.();
  }, [n, chars, animate]);

  return <>{chars.slice(0, n).join("")}</>;
};

const ChatScroller = ({ children, watch, follow }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [watch]);

  useEffect(() => {
    if (!follow) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
    return () => clearInterval(id);
  }, [follow]);

  return (
    <div
      ref={ref}
      role="log"
      aria-live={follow ? "off" : "polite"}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)",
      }}
      className="h-[19rem] space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-base-200/70 to-base-200/30 px-3 py-5 text-[12.5px] sm:h-[22rem] sm:px-4 sm:text-[13px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
};

const DaySeparator = ({ label }) => (
  <div className="flex justify-center">
    <span className="rounded-full bg-base-100/80 px-3 py-1 text-[10px] font-medium text-base-content/50 shadow-sm ring-1 ring-base-300">
      {label}
    </span>
  </div>
);

const QuickActions = ({ items, onPick, disabled }) => (
  <div className="flex gap-2 overflow-x-auto border-t border-base-300 bg-base-100 px-3 pt-3 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map((label) => (
      <button
        key={label}
        type="button"
        onClick={() => onPick(label)}
        disabled={disabled}
        className={`shrink-0 touch-manipulation rounded-full border border-primary/25 bg-primary/10 px-3.5 py-2 text-[11px] font-medium text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/15 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 sm:py-1.5 ${FOCUS}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const Composer = ({ value, onChange, onSubmit, disabled, placeholder }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
    className="bg-base-100 p-3 sm:px-4"
  >
    <div className="flex items-center gap-1.5 rounded-2xl border border-base-300 bg-base-200/50 p-1.5 transition-all focus-within:border-primary/60 focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary/25">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="send"
        autoComplete="off"
        maxLength={120}
        className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-base-content/40 sm:text-xs"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className={`${GRADIENT} flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-xl shadow-md shadow-primary/25 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:shadow-none sm:size-9 ${FOCUS}`}
      >
        <Send className="size-4" />
      </button>
    </div>
  </form>
);

const AI_FIRST =
  "Try: “Thanks so much for thinking of me! I'd love to join if there's still room. Let me know 🙌”";

const AI_ACTIONS = [
  {
    label: "✂️ Make it shorter",
    answer: "Thanks for the invite! I'd love to join if there's room 🙌",
  },
  {
    label: "🎩 More formal",
    answer:
      "Thank you kindly for the invitation. I would be delighted to attend, should space permit. Please do let me know.",
  },
  {
    label: "🌐 Translate to Hindi",
    answer:
      "आमंत्रण के लिए बहुत धन्यवाद! अगर जगह बची हो तो मुझे आना अच्छा लगेगा। बताइएगा 🙌",
  },
];

const AI_FALLBACK =
  "I can rewrite that, change the tone or translate it. Try one of the quick actions below.";

const INITIAL_AI = [
  {
    id: 1,
    from: "me",
    text: "Help me reply politely to a late invite 😅",
    time: "9:41 AM",
  },
];

const AiDemo = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [later, clearTimers] = useTimeouts();
  const nextId = useRef(2);

  const [messages, setMessages] = useState(INITIAL_AI);
  const [busy, setBusy] = useState("idle");
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const reply = (text) => {
    setBusy("typing");
    later(
      () => {
        setMessages((m) => [
          ...m.map((x) => (x.from === "me" ? { ...x, read: true } : x)),
          {
            id: nextId.current++,
            from: "ai",
            text,
            stream: !reduce,
            time: nowTime(),
          },
        ]);
        setBusy(reduce ? "idle" : "streaming");
      },
      reduce ? 150 : 900,
    );
  };

  useEffect(() => {
    if (!inView) return;
    later(() => {
      setReady(true);
      reply(AI_FIRST);
    }, 600);
  }, [inView]);

  const finish = (id) => {
    setMessages((m) =>
      m.map((x) => (x.id === id ? { ...x, stream: false } : x)),
    );
    setBusy("idle");
  };

  const ask = (text, answer) => {
    if (busy !== "idle") return;
    setMessages((m) => [
      ...m,
      { id: nextId.current++, from: "me", text, time: nowTime() },
    ]);
    reply(answer);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || busy !== "idle") return;
    setDraft("");
    ask(text, AI_FALLBACK);
  };

  const copy = async (m) => {
    try {
      await navigator.clipboard?.writeText(m.text);
    } catch {}
    setCopiedId(m.id);
    later(() => setCopiedId(null), 1500);
  };

  const restart = () => {
    clearTimers();
    setDraft("");
    setCopiedId(null);
    setMessages(INITIAL_AI);
    reply(AI_FIRST);
  };

  const working = busy !== "idle";

  return (
    <div ref={ref} className={CHAT_CARD}>
      <div className="flex items-center gap-3 border-b border-base-300 bg-base-100/90 px-4 py-3 backdrop-blur">
        <span
          className={`${GRADIENT} relative flex size-10 shrink-0 items-center justify-center rounded-full shadow-lg shadow-primary/30`}
        >
          {working && !reduce && (
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          )}
          <motion.span
            className="relative"
            animate={
              working && !reduce
                ? { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={{ duration: 1.6, repeat: working ? Infinity : 0 }}
          >
            <Sparkles className="size-5" />
          </motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Chatty AI</p>
          <p
            className={`flex items-center gap-1.5 text-xs ${
              working ? "text-primary" : "text-success"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {working ? "Typing…" : "Ready to help"}
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={working || messages.length < 3}
          aria-label="Restart demo"
          title="Restart demo"
          className={`flex size-9 touch-manipulation items-center justify-center rounded-full text-base-content/55 transition-colors hover:bg-base-200 hover:text-base-content disabled:pointer-events-none disabled:opacity-30 ${FOCUS}`}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <ChatScroller
        watch={messages.length + busy}
        follow={busy === "streaming"}
      >
        <DaySeparator label="Today" />
        {messages.map((m) => (
          <Row key={m.id} mine={m.from === "me"} show={inView}>
            {m.from === "me" ? (
              <MineBubble time={m.time} read={m.read}>
                {m.text}
              </MineBubble>
            ) : (
              <div className="flex max-w-[94%] items-end gap-2 sm:max-w-[90%]">
                <span
                  className={`${GRADIENT} flex size-7 shrink-0 items-center justify-center rounded-full`}
                  aria-hidden="true"
                >
                  <Sparkles className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="rounded-2xl rounded-bl-md border border-secondary/30 bg-secondary/10 px-3.5 py-2.5 leading-relaxed shadow-sm [overflow-wrap:anywhere]">
                    <TypedText
                      text={m.text}
                      animate={!!m.stream}
                      onDone={() => finish(m.id)}
                    />
                    {m.stream && (
                      <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-secondary" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-base-content/45">
                      {m.time}
                    </span>
                    {!m.stream && m.id > 1 && m.text !== AI_FALLBACK && (
                      <button
                        type="button"
                        onClick={() => copy(m)}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-base-content/55 transition-colors hover:bg-base-300/60 hover:text-base-content ${FOCUS}`}
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="size-3 text-success" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Row>
        ))}
        <AnimatePresence>
          {busy === "typing" && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pt-1"
            >
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>
      </ChatScroller>

      {ready && (
        <QuickActions
          items={AI_ACTIONS.map((a) => a.label)}
          disabled={working}
          onPick={(label) =>
            ask(label, AI_ACTIONS.find((a) => a.label === label).answer)
          }
        />
      )}
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={send}
        disabled={working}
        placeholder="Ask Chatty AI"
      />
    </div>
  );
};

const MEMBERS = ["PS", "AM", "SL", "JK", "+2"];

const WHO_COLOR = {
  Priya: "text-primary",
  Aryan: "text-secondary",
  Sneha: "text-accent",
  Jay: "text-info",
};

const REPLIES = {
  Sneha: [
    "Count me in! 🙌",
    "Can someone share the booking link?",
    "I'll bring the snacks 🍿",
  ],
  Jay: [
    "Sounds perfect to me.",
    "Leaving Friday evening works for me.",
    "Beach gang 🌊",
  ],
};

const GROUP_ACTIONS = ["Beach it is 🏖️", "Hills for me ⛰️", "Booking now 🎉"];

const POLL = [
  { id: "beach", label: "Beach 🌊", base: 3 },
  { id: "hills", label: "Hills ⛰️", base: 2 },
];

const Poll = ({ choice, onVote }) => {
  const reduce = useReducedMotion();
  const total = 5 + (choice ? 1 : 0);
  const counts = POLL.map((o) => o.base + (choice === o.id ? 1 : 0));
  const lead = Math.max(...counts);

  return (
    <div
      role="group"
      aria-label="Weekend vote"
      className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-md sm:p-4"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Weekend vote</p>
        <p className="text-[11px] tabular-nums text-base-content/55">
          {total} votes
        </p>
      </div>
      <div className="space-y-2">
        {POLL.map((o, i) => {
          const selected = choice === o.id;
          const count = counts[i];
          const pct = Math.round((count / total) * 100);
          const leading = count === lead;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onVote(selected ? null : o.id)}
              className={`relative block min-h-11 w-full touch-manipulation overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.99] ${
                selected
                  ? "border-primary shadow-sm shadow-primary/20"
                  : "border-base-300 hover:border-primary/40"
              } ${FOCUS}`}
            >
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.55, ease: EASE }
                }
                className={`absolute inset-y-0 left-0 ${
                  selected
                    ? "bg-primary/20"
                    : leading
                      ? "bg-primary/10"
                      : "bg-base-200"
                }`}
              />
              <span className="relative flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  {selected && (
                    <Check className="size-3.5 text-primary" strokeWidth={3} />
                  )}
                  {o.label}
                </span>
                <span className="tabular-nums text-base-content/60">
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] text-base-content/45">
        {choice ? "Tap your vote again to remove it" : "Tap an option to vote"}
      </p>
    </div>
  );
};

const GroupBubble = ({ m, first, onLike }) => {
  const count = (m.likes || 0) + (m.liked ? 1 : 0);
  return (
    <div className="group flex max-w-[92%] items-end gap-2 sm:max-w-[88%]">
      {first ? <Avatar name={m.who} /> : <span className="size-7 shrink-0" />}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="rounded-2xl rounded-bl-md border border-base-300 bg-base-100 px-3.5 py-2.5 shadow-sm [overflow-wrap:anywhere]">
            {first && (
              <p
                className={`mb-0.5 text-[11px] font-semibold ${
                  WHO_COLOR[m.who] || "text-primary"
                }`}
              >
                {m.who}
              </p>
            )}
            {m.text}
          </div>
          <button
            type="button"
            onClick={() => onLike(m.id)}
            aria-label={m.liked ? "Remove like" : "Like message"}
            aria-pressed={!!m.liked}
            className={`flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-base-content/40 transition-all hover:bg-base-300/60 hover:text-error sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${
              m.liked ? "!opacity-100 text-error" : ""
            } ${FOCUS}`}
          >
            <Heart className={`size-4 ${m.liked ? "fill-current" : ""}`} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key="likes"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={SPRING}
                className="flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-error"
              >
                <Heart className="size-2.5 fill-current" /> {count}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-[10px] tabular-nums text-base-content/45">
            {m.time}
          </span>
        </div>
      </div>
    </div>
  );
};

const GroupDemo = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [later] = useTimeouts();
  const nextId = useRef(4);
  const turn = useRef(0);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "msg",
      who: "Priya",
      text: "Beach or hills this weekend?",
      time: "10:02 AM",
    },
    {
      id: 2,
      type: "msg",
      who: "Aryan",
      text: "Beach! 🌊",
      time: "10:03 AM",
      likes: 2,
    },
    { id: 3, type: "poll" },
  ]);
  const [choice, setChoice] = useState(null);
  const [typer, setTyper] = useState(null);
  const [draft, setDraft] = useState("");

  const like = (id) =>
    setMessages((m) =>
      m.map((x) => (x.id === id ? { ...x, liked: !x.liked } : x)),
    );

  const send = (raw) => {
    const text = raw.trim();
    if (!text || typer) return;
    setDraft("");
    setMessages((m) => [
      ...m,
      {
        id: nextId.current++,
        type: "msg",
        who: "You",
        mine: true,
        text,
        time: nowTime(),
      },
    ]);

    const name = turn.current++ % 2 === 0 ? "Sneha" : "Jay";
    const pool = REPLIES[name];
    const line = pool[Math.floor(Math.random() * pool.length)];
    later(() => setTyper(name), reduce ? 100 : 700);
    later(
      () => {
        setMessages((m) => [
          ...m.map((x) => (x.mine ? { ...x, read: true } : x)),
          {
            id: nextId.current++,
            type: "msg",
            who: name,
            text: line,
            time: nowTime(),
          },
        ]);
        setTyper(null);
      },
      reduce ? 300 : 1900,
    );
  };

  return (
    <div ref={ref} className={CHAT_CARD}>
      <div className="flex items-center gap-3 border-b border-base-300 bg-base-100/90 px-4 py-3 backdrop-blur">
        <span
          className={`${GRADIENT} flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/30`}
        >
          <Users className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Weekend Plan 🏖️</p>
          <p
            className={`flex items-center gap-1.5 truncate text-xs ${
              typer ? "text-primary" : "text-base-content/55"
            }`}
          >
            {!typer && <span className="size-1.5 rounded-full bg-success" />}
            {typer ? `${typer} is typing…` : "6 members, 4 online"}
          </p>
        </div>
        <div className="flex shrink-0 -space-x-2" aria-hidden="true">
          {MEMBERS.map((m, idx) => (
            <motion.span
              key={m}
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + idx * 0.08, ...SPRING }}
              className={`${GRADIENT} relative flex size-7 items-center justify-center rounded-full text-[9px] font-semibold ring-2 ring-base-100 ${
                idx > 2 ? "hidden min-[380px]:flex" : ""
              }`}
            >
              {m}
            </motion.span>
          ))}
        </div>
      </div>

      <ChatScroller watch={messages.length + (typer || "")}>
        <DaySeparator label="Today" />
        {messages.map((m, i) => {
          if (m.type === "poll") {
            return (
              <Row key={m.id} show={inView} delay={reduce ? 0 : i * 0.12}>
                <Poll choice={choice} onVote={setChoice} />
              </Row>
            );
          }
          const prev = messages[i - 1];
          const first = !prev || prev.type === "poll" || prev.who !== m.who;
          return (
            <Row
              key={m.id}
              mine={m.mine}
              show={inView}
              delay={reduce || m.id > 3 ? 0 : i * 0.12}
            >
              {m.mine ? (
                <MineBubble time={m.time} read={m.read}>
                  {m.text}
                </MineBubble>
              ) : (
                <GroupBubble m={m} first={first} onLike={like} />
              )}
            </Row>
          );
        })}
        <AnimatePresence>
          {typer && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2 pt-1"
            >
              <Avatar name={typer} />
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>
      </ChatScroller>

      <QuickActions items={GROUP_ACTIONS} disabled={!!typer} onPick={send} />
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => send(draft)}
        disabled={!!typer}
        placeholder="Message the group"
      />
    </div>
  );
};

const ShowcaseRow = ({
  eyebrow,
  title,
  sub,
  bullets,
  tags = [],
  demo,
  hint,
  reverse = false,
}) => (
  <div
    className={`grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16 ${
      reverse ? "lg:[&>*:first-child]:order-2" : ""
    }`}
  >
    <div>
      <SectionHeading
        align="left"
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        mb="mb-6 sm:mb-8"
      />
      <motion.ul
        className="space-y-3.5"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12 } },
        }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {bullets.map((b) => (
          <motion.li
            key={b}
            className="flex items-start gap-3"
            variants={{
              hidden: { opacity: 0, x: -16 },
              show: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.5, ease: EASE },
              },
            }}
          >
            <CheckBullet />
            <span className="text-sm leading-relaxed text-base-content/70">
              {b}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      {tags.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/65 shadow-sm"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>

    <Reveal
      className="relative mx-auto w-full max-w-md"
      x={reverse ? -24 : 24}
      y={0}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/25 via-secondary/15 to-accent/25 blur-3xl"
      />
      {demo}
      <p className="mt-4 text-center text-xs text-base-content/55">{hint}</p>
    </Reveal>
  </div>
);

export const AiGroupsSection = () => (
  <section id="ai-groups" className={`${SECTION} overflow-x-clip`}>
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-20 sm:space-y-28 lg:space-y-32">
      <ShowcaseRow
        eyebrow="AI assistant"
        title={
          <>
            Meet your built-in <span className={GRADIENT_TEXT}>Chatty AI</span>
          </>
        }
        sub="Get help without leaving the conversation. Ask questions, draft replies or brainstorm ideas, any time."
        bullets={[
          "Ask anything and get instant answers",
          "Draft and refine replies in seconds",
          "Lives right inside your chat list",
        ]}
        tags={["Rewrite", "Translate", "Brainstorm", "Summarise"]}
        demo={<AiDemo />}
        hint="Tap a quick action to see how Chatty AI rewrites a reply."
      />
      <ShowcaseRow
        reverse
        eyebrow="Group chats"
        title={
          <>
            Bring everyone <span className={GRADIENT_TEXT}>into one chat</span>
          </>
        }
        sub="Plan trips, run projects or just hang out. Create a group, add your people and keep everything together."
        bullets={[
          "Create groups and add members",
          "See who said what, in real time",
          "Share images and emojis with everyone",
        ]}
        tags={["Polls", "Reactions", "Read receipts", "Typing status"]}
        demo={<GroupDemo />}
        hint="Vote in the poll, like a message or send one to the group."
      />
    </div>
  </section>
);
