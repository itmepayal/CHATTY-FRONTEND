import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Smartphone, ShieldCheck, RefreshCcw, KeyRound, MailCheck, Lock } from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, EASE, SPRING } from "./landingData";
import { SectionHeading, Reveal } from "./LandingPrimitives";

const OtpDemo = () => {
  const target = ["4", "8", "2", "7", "1", "9"];
  const [count, setCount] = useState(3);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setCount(c => (c >= 6 ? 3 : c + 1)), 1100);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="rounded-2xl border border-base-300 bg-base-200 p-5 shadow-2xl shadow-primary/10 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className={`${GRADIENT} flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11`}>
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Two-factor authentication</p>
          <p className="text-xs text-base-content/50">Enter the 6-digit verification code</p>
        </div>
      </div>
      <div className="flex justify-between gap-1.5 sm:gap-2" aria-hidden="true">
        {target.map((d, i) => {
          const filled = i < count;
          const current = i === count;
          return (
            <div key={i} className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg border text-base font-bold transition-colors sm:h-12 sm:rounded-xl sm:text-lg ${filled ? "border-primary/50 bg-primary/10 text-primary" :
              current ? "border-primary bg-base-100 ring-2 ring-primary/30" :
                "border-base-300 bg-base-100"
              }`}>
              <AnimatePresence mode="popLayout">
                {filled && (
                  <motion.span key="d" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={SPRING}>{d}</motion.span>
                )}
              </AnimatePresence>
              {current && <motion.span className="h-5 w-px bg-primary" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/50">
        <span className="inline-flex items-center gap-1.5 text-success"><ShieldCheck className="size-3.5" /> Extra layer enabled</span>
        <span className="inline-flex items-center gap-1"><RefreshCcw className="size-3" /> Resend code</span>
      </div>
    </div>
  );
};

const RESET_STEPS = [
  { icon: KeyRound, title: "Forgot password", desc: "Tap \u201cForgot password\u201d on the login page." },
  { icon: MailCheck, title: "Verify it's you", desc: "Confirm your identity with a secure verification step." },
  { icon: Lock, title: "Set a new password", desc: "Reset your password and jump straight back into your chats." },
];

const ResetFlow = () => (
  <motion.ol className="relative space-y-4 sm:space-y-5"
    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18 } } }}
    initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
    <motion.span aria-hidden="true"
      variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.9, ease: EASE } } }}
      style={{ originY: 0 }}
      className="absolute left-[39px] top-6 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-primary/60 to-secondary/20" />
    {RESET_STEPS.map((s, i) => (
      <motion.li key={s.title}
        variants={{ hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } } }}
        whileHover={{ x: 4 }}
        className="relative flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/50 p-4 transition-colors hover:border-primary/40 sm:gap-4">
        <span className={`${GRADIENT} z-10 flex size-11 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/25`}><s.icon className="size-5" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold"><span className="mr-1.5 text-primary">0{i + 1}</span>{s.title}</p>
          <p className="mt-0.5 text-sm text-base-content/60">{s.desc}</p>
        </div>
      </motion.li>
    ))}
  </motion.ol>
);

export const SecuritySection = () => (
  <section id="security" className={SECTION}>
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Security"
        title={<>Your account, <span className={GRADIENT_TEXT}>locked down</span></>}
        sub="Two-factor authentication keeps intruders out, and password recovery gets you back in when you forget."
      />
      <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-2">
        <Reveal><OtpDemo /></Reveal>
        <ResetFlow />
      </div>
    </div>
  </section>
);
