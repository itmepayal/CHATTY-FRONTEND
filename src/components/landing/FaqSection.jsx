import { useState } from "react";
import { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Mail, ArrowUpRight, LifeBuoy } from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, H2, EASE, SPRING, FAQS, SUPPORT_EMAIL } from "./landingData";
import { Eyebrow, Reveal } from "./LandingPrimitives";

const FAQItem = ({ q, a, index, open, onToggle }) => {
  const id = useId();
  return (
    <div className={`relative transition-colors duration-300 ${open ? "bg-primary/[0.04]" : "hover:bg-base-200/60"}`}>
      <motion.span aria-hidden="true" initial={false}
        animate={{ scaleY: open ? 1 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }} style={{ originY: 0.5 }}
        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary to-secondary" />
      <h3>
        <button onClick={onToggle} aria-expanded={open} aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:gap-5 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
          <span className={`hidden shrink-0 font-mono text-xs font-semibold tabular-nums transition-colors sm:block ${open ? "text-primary" : "text-base-content/30"}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={`min-w-0 flex-1 text-sm font-semibold leading-snug transition-colors sm:text-base ${open ? "text-base-content" : "text-base-content/80"}`}>{q}</span>
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.3, ease: EASE }}
            className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors sm:size-8 ${open ? "border-primary/40 bg-primary text-primary-content" : "border-base-300 bg-base-100 text-base-content/60"}`}>
            <Plus className="size-4" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" key="content"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <p className="px-4 pb-5 text-sm leading-relaxed text-base-content/65 sm:pb-6 sm:pl-[4.25rem] sm:pr-14 lg:pl-[4.75rem] lg:pr-16">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SupportCard = () => (
  <div className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-200/60 p-5 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/20 blur-2xl" />
    <span className={`${GRADIENT} relative mb-4 flex size-10 items-center justify-center rounded-xl shadow-lg shadow-primary/25`}>
      <LifeBuoy className="size-5" />
    </span>
    <p className="relative text-sm font-semibold">Still have questions?</p>
    <p className="relative mt-1 text-sm leading-relaxed text-base-content/60">Can't find what you're looking for? Our team is happy to help.</p>
    <a href={`mailto:${SUPPORT_EMAIL}`}
      className="group relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary focus:outline-none focus-visible:underline">
      <Mail className="size-4" /> Contact support
      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  </div>
);

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section id="faq" className={SECTION}>
      <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Reveal className="text-center lg:text-left">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className={H2}>Frequently asked <span className={GRADIENT_TEXT}>questions</span></h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-base-content/60 sm:mt-4 sm:text-base lg:mx-0">
                Everything you need to know about Chatty, from groups and AI to themes and security.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-6 hidden sm:mt-8 sm:block"><SupportCard /></Reveal>
          </div>
        </div>

        <Reveal delay={0.05} className="lg:col-span-8">
          <div className="divide-y divide-base-300 overflow-hidden rounded-xl border border-base-300 bg-base-100/60 shadow-xl shadow-primary/5 backdrop-blur-sm sm:rounded-2xl">
            {FAQS.map((f, i) => (
              <FAQItem key={f.q} {...f} index={i} open={openIndex === i} onToggle={() => setOpenIndex(o => (o === i ? -1 : i))} />
            ))}
          </div>
          <div className="mt-6 sm:hidden"><SupportCard /></div>
        </Reveal>
      </div>
    </section>
  );
};
