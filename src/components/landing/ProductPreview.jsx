import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Smile, Paperclip, Send, Sparkles } from "lucide-react";
import { ChattyLogo } from "../common/ChattyLogo";
import { Avatar, Ticks, TypingDots } from "./LandingPrimitives";
import { GRADIENT, GRADIENT_TEXT, EASE, SPRING, CHATS, CONVOS } from "./landingData";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "group", label: "Groups" },
  { id: "ai", label: "AI" },
];

export const ProductPreview = () => {
  const [active, setActive] = useState(1);
  const [filter, setFilter] = useState("all");
  const chat = CHATS.find(c => c.id === active);
  const list = CHATS.filter(c => filter === "all" || c.type === filter);

  const pick = f => {
    setFilter(f);
    const first = CHATS.find(c => f === "all" || c.type === f);
    if (first) setActive(first.id);
  };

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xl shadow-primary/20 ring-1 ring-base-content/5 sm:rounded-2xl">
      <div className="flex items-center gap-1.5 border-b border-base-300 bg-base-200 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
        <span className="size-2.5 rounded-full bg-error/70 sm:size-3" />
        <span className="size-2.5 rounded-full bg-warning/70 sm:size-3" />
        <span className="size-2.5 rounded-full bg-success/70 sm:size-3" />
        <span className="mx-auto truncate rounded-md bg-base-100 px-4 py-1 font-mono text-[10px] text-base-content/40 sm:px-12 sm:text-[11px]">chatty.app/messages</span>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-base-300 bg-base-200/60 px-3 py-2.5 sm:hidden">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => pick(f.id)}
            className={`relative shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.id ? "text-primary-content" : "bg-base-100 text-base-content/70"}`}>
            {filter === f.id && <motion.span layoutId="filter-pill-mobile" className="absolute inset-0 rounded-full bg-primary" transition={SPRING} />}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      <div className="flex h-[400px] sm:h-[440px] lg:h-[460px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-base-300 bg-base-200/60 sm:flex lg:w-72">
          <div className="flex items-center gap-2.5 border-b border-base-300 px-4 py-3.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-base-200 ring-1 ring-base-300">
              <ChattyLogo className="size-5" animated={false} />
            </div>
            <span className={`text-sm font-extrabold ${GRADIENT_TEXT}`}>Chatty</span>
          </div>
          <div className="space-y-3 px-3 pb-2 pt-4 lg:px-4">
            <div className="flex items-center gap-2 rounded-lg bg-base-100 px-3 py-2 text-xs text-base-content/40 ring-1 ring-base-300">
              <Search className="size-3.5 shrink-0" /> <span className="truncate">Search conversations</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => pick(f.id)}
                  className={`relative rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === f.id ? "text-primary-content" : "bg-base-100 text-base-content/60 hover:bg-base-300"}`}>
                  {filter === f.id && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-primary" transition={SPRING} />}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 pt-1">
            <AnimatePresence initial={false} mode="popLayout">
              {list.map(c => (
                <motion.button layout key={c.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  onClick={() => setActive(c.id)} aria-pressed={active === c.id}
                  className="relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-base-300/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {active === c.id && <motion.span layoutId="chat-active" className="absolute inset-0 rounded-xl bg-primary/10" transition={SPRING} />}
                  <span className="relative flex w-full items-center gap-3">
                    <Avatar initials={c.initials} online={c.online} size="sm" ai={c.type === "ai"} group={c.type === "group"} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between">
                        <span className="flex items-center gap-1 truncate text-xs font-semibold">
                          {c.name}
                          {c.type === "ai" && <span className="rounded bg-secondary/15 px-1 text-[9px] font-bold text-secondary">AI</span>}
                        </span>
                        <span className="ml-1 shrink-0 text-[10px] text-base-content/40">{c.time}</span>
                      </span>
                      <span className="block truncate text-[11px] text-base-content/50">{c.preview}</span>
                    </span>
                    {c.unread > 0 && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-content">{c.unread}</span>
                    )}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-base-300 bg-base-200/60 px-3 py-3 sm:px-5 sm:py-3.5">
            <Avatar initials={chat.initials} online={chat.online} ai={chat.type === "ai"} group={chat.type === "group"} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{chat.name}</p>
              <p className={`truncate text-xs ${chat.type === "group" ? "text-base-content/50" : chat.online ? "text-success" : "text-base-content/40"}`}>
                {chat.type === "group" ? chat.members : chat.type === "ai" ? "Always here to help" : chat.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-base-100 px-3 py-4 sm:space-y-3 sm:px-5 sm:py-5">
            {CONVOS[active].map((m, i) => (
              <motion.div key={`${active}-${i}`}
                initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.09, duration: 0.4, ease: EASE }}
                style={{ originX: m.me ? 1 : 0 }}
                className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed sm:max-w-[78%] sm:px-3.5 sm:py-2.5 sm:text-[13px] ${m.me ? `${GRADIENT} rounded-br-md` : m.ai ? "rounded-bl-md border border-secondary/30 bg-secondary/10" : "rounded-bl-md bg-base-300 text-base-content"}`}>
                  {m.from && <p className="mb-0.5 text-[11px] font-semibold text-primary">{m.from}</p>}
                  {m.ai && <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-secondary"><Sparkles className="size-3" /> Chatty AI</p>}
                  <p>{m.text}</p>
                  <div className={`mt-0.5 flex items-center gap-1 ${m.me ? "justify-end" : ""}`}>
                    <span className="text-[10px] opacity-60">{m.time}</span>
                    {m.me && <Ticks status={m.status} />}
                  </div>
                </div>
              </motion.div>
            ))}
            {(chat.online || chat.type === "group") && (
              <motion.div key={`typing-${active}`} className="flex"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: CONVOS[active].length * 0.09 + 0.2 }}>
                <TypingDots />
              </motion.div>
            )}
          </div>

          <div className="shrink-0 border-t border-base-300 bg-base-200/60 px-3 py-3 sm:px-5 sm:py-3.5">
            <div className="flex items-center gap-2 rounded-xl bg-base-100 px-3 py-2 ring-1 ring-base-300 sm:gap-2.5 sm:px-3.5 sm:py-2.5">
              <Smile className="size-4 shrink-0 text-base-content/40" />
              <span className="min-w-0 flex-1 select-none truncate text-[12.5px] text-base-content/40 sm:text-[13px]">
                {chat.type === "ai" ? "Ask Chatty AI anything…" : "Type a message…"}
              </span>
              <Paperclip className="hidden size-4 shrink-0 text-base-content/40 min-[380px]:block" />
              <motion.div whileHover={{ scale: 1.08, rotate: -6 }} whileTap={{ scale: 0.9 }} className={`${GRADIENT} flex size-8 shrink-0 items-center justify-center rounded-lg`}>
                <Send className="size-3.5" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloatChip = ({ icon: Icon, text, sub, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.9 + delay, duration: 0.5, ease: EASE }}
    className={`absolute z-20 hidden lg:block ${className}`}
  >
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
      className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100/90 px-4 py-3 shadow-xl shadow-primary/10 backdrop-blur-md"
    >
      <span className={`${GRADIENT} flex size-9 items-center justify-center rounded-xl`}><Icon className="size-4" /></span>
      <span className="leading-tight">
        <span className="block text-xs font-semibold">{text}</span>
        <span className="block text-[11px] text-base-content/50">{sub}</span>
      </span>
    </motion.div>
  </motion.div>
);
