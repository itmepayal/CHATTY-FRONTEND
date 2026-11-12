import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  Smile,
  Paperclip,
  Send,
  Sparkles,
  Lock,
  Phone,
  Video,
} from "lucide-react";
import { ChattyLogo } from "../common/ChattyLogo";
import { Avatar, Ticks, TypingDots } from "./LandingPrimitives";
import {
  GRADIENT,
  GRADIENT_TEXT,
  EASE,
  SPRING,
  CHATS,
  CONVOS,
} from "./landingData";

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "group", label: "Groups" },
  { id: "ai", label: "AI" },
];

const HeaderIconBtn = ({ icon: Icon, label }) => (
  <span
    role="img"
    aria-label={label}
    className="hidden size-8 items-center justify-center rounded-full text-base-content/45 transition-colors hover:bg-base-300/60 hover:text-primary min-[420px]:flex"
  >
    <Icon className="size-4" />
  </span>
);

export const ProductPreview = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(1);
  const [filter, setFilter] = useState("all");
  const chat = CHATS.find((c) => c.id === active);
  const list = CHATS.filter((c) => filter === "all" || c.type === filter);

  const pick = (f) => {
    setFilter(f);
    const first = CHATS.find((c) => f === "all" || c.type === f);
    if (first) setActive(first.id);
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/25 via-secondary/15 to-accent/20 blur-3xl sm:-inset-8"
      />

      <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xl shadow-primary/20 ring-1 ring-base-content/5 sm:rounded-2xl">
        <div className="flex items-center gap-1.5 border-b border-base-300 bg-base-200 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
          <span className="size-2.5 rounded-full bg-error/70 sm:size-3" />
          <span className="size-2.5 rounded-full bg-warning/70 sm:size-3" />
          <span className="size-2.5 rounded-full bg-success/70 sm:size-3" />
          <span className="mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md bg-base-100 px-4 py-1 font-mono text-[10px] text-base-content/45 ring-1 ring-base-300 sm:px-12 sm:text-[11px]">
            <Lock className="size-3 shrink-0 text-success" />
            chatty.app/messages
          </span>
          <span className="w-10 shrink-0 sm:w-14" aria-hidden="true" />
        </div>

        <div
          role="group"
          aria-label="Filter conversations"
          className="flex gap-2 overflow-x-auto border-b border-base-300 bg-base-200/60 px-3 py-2.5 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => pick(f.id)}
              className={`relative shrink-0 touch-manipulation rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f.id
                  ? "text-primary-content"
                  : "bg-base-100 text-base-content/70"
              } ${FOCUS}`}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="filter-pill-mobile"
                  className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/30"
                  transition={SPRING}
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="flex h-[400px] sm:h-[440px] lg:h-[480px]">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-base-300 bg-base-200/60 sm:flex lg:w-72">
            <div className="flex items-center gap-2.5 border-b border-base-300 px-4 py-3.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-base-200 ring-1 ring-base-300">
                <ChattyLogo className="size-5" animated={false} />
              </div>
              <span className={`text-sm font-extrabold ${GRADIENT_TEXT}`}>
                Chatty
              </span>
            </div>

            <div className="space-y-3 px-3 pb-2 pt-4 lg:px-4">
              <div className="flex items-center gap-2 rounded-lg bg-base-100 px-3 py-2 text-xs text-base-content/40 ring-1 ring-base-300 transition-shadow hover:ring-primary/30">
                <Search className="size-3.5 shrink-0" />
                <span className="truncate">Search conversations</span>
              </div>
              <div
                role="group"
                aria-label="Filter conversations"
                className="flex flex-wrap gap-1.5"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => pick(f.id)}
                    className={`relative rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      filter === f.id
                        ? "text-primary-content"
                        : "bg-base-100 text-base-content/60 hover:bg-base-300"
                    } ${FOCUS}`}
                  >
                    {filter === f.id && (
                      <motion.span
                        layoutId="filter-pill"
                        className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/30"
                        transition={SPRING}
                      />
                    )}
                    <span className="relative">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 pt-1 [scrollbar-width:thin]">
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((c) => (
                  <motion.button
                    layout
                    type="button"
                    key={c.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    onClick={() => setActive(c.id)}
                    aria-pressed={active === c.id}
                    className={`relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-base-300/50 ${FOCUS}`}
                  >
                    {active === c.id && (
                      <motion.span
                        layoutId="chat-active"
                        className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/20"
                        transition={SPRING}
                      >
                        <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      </motion.span>
                    )}
                    <span className="relative flex w-full items-center gap-3">
                      <Avatar
                        initials={c.initials}
                        online={c.online}
                        size="sm"
                        ai={c.type === "ai"}
                        group={c.type === "group"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span className="flex items-center gap-1 truncate text-xs font-semibold">
                            {c.name}
                            {c.type === "ai" && (
                              <span className="rounded bg-secondary/15 px-1 text-[9px] font-bold text-secondary">
                                AI
                              </span>
                            )}
                          </span>
                          <span
                            className={`ml-1 shrink-0 text-[10px] ${
                              c.unread > 0
                                ? "font-semibold text-primary"
                                : "text-base-content/40"
                            }`}
                          >
                            {c.time}
                          </span>
                        </span>
                        <span
                          className={`block truncate text-[11px] ${
                            c.unread > 0
                              ? "font-medium text-base-content/70"
                              : "text-base-content/50"
                          }`}
                        >
                          {c.preview}
                        </span>
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-content shadow-sm shadow-primary/30">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-3 border-b border-base-300 bg-base-200/60 px-3 py-3 sm:px-5 sm:py-3.5">
              <Avatar
                initials={chat.initials}
                online={chat.online}
                ai={chat.type === "ai"}
                group={chat.type === "group"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{chat.name}</p>
                <p
                  className={`flex items-center gap-1.5 truncate text-xs ${
                    chat.type === "group"
                      ? "text-base-content/50"
                      : chat.online
                        ? "text-success"
                        : "text-base-content/40"
                  }`}
                >
                  {chat.type !== "group" && chat.online && (
                    <span className="size-1.5 shrink-0 rounded-full bg-current" />
                  )}
                  <span className="truncate">
                    {chat.type === "group"
                      ? chat.members
                      : chat.type === "ai"
                        ? "Always here to help"
                        : chat.online
                          ? "Online"
                          : "Offline"}
                  </span>
                </p>
              </div>
              {chat.type !== "ai" && (
                <div className="flex shrink-0 items-center">
                  <HeaderIconBtn icon={Phone} label="Voice call" />
                  <HeaderIconBtn icon={Video} label="Video call" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-base-100 to-base-200/30 px-3 py-4 sm:space-y-3 sm:px-5 sm:py-5 [scrollbar-width:thin]">
              <div className="flex justify-center">
                <span className="rounded-full bg-base-200 px-3 py-0.5 text-[10px] font-medium text-base-content/50 ring-1 ring-base-300">
                  Today
                </span>
              </div>

              {CONVOS[active].map((m, i) => (
                <motion.div
                  key={`${active}-${i}`}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: reduce ? 0 : i * 0.09,
                    duration: 0.4,
                    ease: EASE,
                  }}
                  style={{ originX: m.me ? 1 : 0 }}
                  className={`flex ${m.me ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed [overflow-wrap:anywhere] sm:max-w-[78%] sm:px-3.5 sm:py-2.5 sm:text-[13px] ${
                      m.me
                        ? `${GRADIENT} rounded-br-md shadow-md shadow-primary/20`
                        : m.ai
                          ? "rounded-bl-md border border-secondary/30 bg-secondary/10 shadow-sm"
                          : "rounded-bl-md bg-base-300 text-base-content shadow-sm"
                    }`}
                  >
                    {m.from && (
                      <p className="mb-0.5 text-[11px] font-semibold text-primary">
                        {m.from}
                      </p>
                    )}
                    {m.ai && (
                      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-secondary">
                        <Sparkles className="size-3" /> Chatty AI
                      </p>
                    )}
                    <p>{m.text}</p>
                    <div
                      className={`mt-0.5 flex items-center gap-1 ${
                        m.me ? "justify-end" : ""
                      }`}
                    >
                      <span className="text-[10px] opacity-60">{m.time}</span>
                      {m.me && <Ticks status={m.status} />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {(chat.online || chat.type === "group") && (
                <motion.div
                  key={`typing-${active}`}
                  className="flex"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: reduce ? 0 : CONVOS[active].length * 0.09 + 0.2,
                  }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </div>

            <div className="shrink-0 border-t border-base-300 bg-base-200/60 px-3 py-3 sm:px-5 sm:py-3.5">
              <div className="flex items-center gap-2 rounded-xl bg-base-100 px-3 py-2 ring-1 ring-base-300 transition-shadow hover:ring-primary/30 sm:gap-2.5 sm:px-3.5 sm:py-2.5">
                <Smile className="size-4 shrink-0 text-base-content/40" />
                <span className="min-w-0 flex-1 select-none truncate text-[12.5px] text-base-content/40 sm:text-[13px]">
                  {chat.type === "ai"
                    ? "Ask Chatty AI anything…"
                    : "Type a message…"}
                </span>
                <Paperclip className="hidden size-4 shrink-0 text-base-content/40 min-[380px]:block" />
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.08, rotate: -6 }}
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  className={`${GRADIENT} flex size-8 shrink-0 items-center justify-center rounded-lg shadow-md shadow-primary/25`}
                >
                  <Send className="size-3.5" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloatChip = ({
  icon: Icon,
  text,
  sub,
  className = "",
  delay = 0,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.9 + delay, duration: 0.5, ease: EASE }}
      className={`absolute z-20 hidden lg:block ${className}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
        className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100/90 px-4 py-3 shadow-xl shadow-primary/15 ring-1 ring-base-content/5 backdrop-blur-md"
      >
        <span
          className={`${GRADIENT} flex size-9 items-center justify-center rounded-xl shadow-md shadow-primary/30`}
        >
          <Icon className="size-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-xs font-semibold">{text}</span>
          <span className="block text-[11px] text-base-content/55">{sub}</span>
        </span>
      </motion.div>
    </motion.div>
  );
};
