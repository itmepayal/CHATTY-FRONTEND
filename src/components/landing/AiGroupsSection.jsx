import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, EASE, SPRING, bubbleStagger, bubble } from "./landingData";
import { SectionHeading, Reveal, CheckBullet } from "./LandingPrimitives";

const BubbleList = ({ children }) => (
  <motion.div variants={bubbleStagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
    className="space-y-3 text-[12.5px] sm:text-[13px]">
    {children}
  </motion.div>
);

const AiDemo = () => (
  <div className="rounded-2xl border border-base-300 bg-base-200 p-4 shadow-2xl shadow-primary/10 sm:p-5">
    <div className="mb-4 flex items-center gap-3 border-b border-base-300 pb-4">
      <span className={`${GRADIENT} flex size-10 shrink-0 items-center justify-center rounded-full`}>
        <motion.span animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}>
          <Sparkles className="size-5" />
        </motion.span>
      </span>
      <div>
        <p className="text-sm font-semibold">Chatty AI</p>
        <p className="text-xs text-success">● Ready to help</p>
      </div>
    </div>
    <BubbleList>
      <motion.div variants={bubble} style={{ originX: 1 }} className="flex justify-end">
        <p className={`${GRADIENT} max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 sm:max-w-[80%]`}>Help me reply politely to a late invite 😅</p>
      </motion.div>
      <motion.div variants={bubble} style={{ originX: 0 }} className="max-w-[92%] rounded-2xl rounded-bl-md border border-secondary/30 bg-secondary/10 px-3.5 py-2.5 leading-relaxed sm:max-w-[88%]">
        Try: "Thanks so much for thinking of me! I'd love to join if there's still room. Let me know 🙌"
      </motion.div>
      <motion.div variants={bubble} className="flex flex-wrap gap-2 pt-1">
        {["Make it shorter", "More formal", "Translate to Hindi"].map(s => (
          <motion.span key={s} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
            className="cursor-default rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">{s}</motion.span>
        ))}
      </motion.div>
    </BubbleList>
  </div>
);

const GroupDemo = () => {
  const members = ["PS", "AM", "SL", "JK", "+2"];
  return (
    <div className="rounded-2xl border border-base-300 bg-base-200 p-4 shadow-2xl shadow-primary/10 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-base-300 pb-4">
        <span className={`${GRADIENT} flex size-10 shrink-0 items-center justify-center rounded-xl`}><Users className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Weekend Plan 🏖️</p>
          <p className="text-xs text-base-content/50">6 members</p>
        </div>
        <div className="flex shrink-0 -space-x-2">
          {members.map((m, idx) => (
            <motion.span key={m}
              initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.08, ...SPRING }} whileHover={{ y: -3, zIndex: 10 }}
              className={`${GRADIENT} relative flex size-7 items-center justify-center rounded-full text-[9px] font-semibold ring-2 ring-base-200 ${idx > 2 ? "hidden min-[380px]:flex" : ""}`}>
              {m}
            </motion.span>
          ))}
        </div>
      </div>
      <BubbleList>
        <motion.div variants={bubble} style={{ originX: 0 }} className="max-w-[88%] rounded-2xl rounded-bl-md bg-base-300 px-3.5 py-2.5 sm:max-w-[85%]">
          <p className="mb-0.5 text-[11px] font-semibold text-primary">Priya</p>Beach or hills this weekend?
        </motion.div>
        <motion.div variants={bubble} style={{ originX: 0 }} className="max-w-[88%] rounded-2xl rounded-bl-md bg-base-300 px-3.5 py-2.5 sm:max-w-[85%]">
          <p className="mb-0.5 text-[11px] font-semibold text-secondary">Aryan</p>Beach! 🌊
        </motion.div>
        <motion.div variants={bubble} style={{ originX: 1 }} className="flex justify-end">
          <p className={`${GRADIENT} rounded-2xl rounded-br-md px-3.5 py-2.5`}>Beach it is. Booking now 🎉</p>
        </motion.div>
      </BubbleList>
    </div>
  );
};

const ShowcaseRow = ({ eyebrow, title, sub, bullets, demo, reverse = false }) => (
  <div className={`grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
    <div>
      <SectionHeading align="left" eyebrow={eyebrow} title={title} sub={sub} mb="mb-6 sm:mb-8" />
      <motion.ul className="space-y-3"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
        {bullets.map(b => (
          <motion.li key={b} className="flex items-start gap-3"
            variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}>
            <CheckBullet />
            <span className="text-sm leading-relaxed text-base-content/70">{b}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
    <Reveal className="mx-auto w-full max-w-md" x={reverse ? -24 : 24} y={0}>{demo}</Reveal>
  </div>
);

export const AiGroupsSection = () => (
  <section id="ai-groups" className={SECTION}>
    <div className="mx-auto max-w-6xl space-y-16 sm:space-y-24 lg:space-y-28">
      <ShowcaseRow
        eyebrow="AI assistant"
        title={<>Meet your built-in <span className={GRADIENT_TEXT}>Chatty AI</span></>}
        sub="Get help without leaving the conversation. Ask questions, draft replies or brainstorm ideas, any time."
        bullets={["Ask anything and get instant answers", "Draft and refine replies in seconds", "Lives right inside your chat list"]}
        demo={<AiDemo />}
      />
      <ShowcaseRow reverse
        eyebrow="Group chats"
        title={<>Bring everyone <span className={GRADIENT_TEXT}>into one chat</span></>}
        sub="Plan trips, run projects or just hang out. Create a group, add your people and keep everything together."
        bullets={["Create groups and add members", "See who said what, in real time", "Share images and emojis with everyone"]}
        demo={<GroupDemo />}
      />
    </div>
  </section>
);
