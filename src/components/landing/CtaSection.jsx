import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles, Users, ShieldCheck } from "lucide-react";
import { GRADIENT, GRADIENT_TEXT, SPRING, CTA_POINTS } from "./landingData";
import { Avatar, TypingDots, Reveal, BtnPrimary } from "./LandingPrimitives";

const CtaPreview = () => (
  <div className="relative mx-auto w-full max-w-sm">
    <div aria-hidden="true" className="absolute -inset-6 rounded-full bg-primary/25 blur-[70px]" />
    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative rounded-2xl border border-base-300 bg-base-100/90 p-4 shadow-2xl shadow-primary/20 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-3 border-b border-base-300 pb-3">
        <Avatar initials="PS" online size="sm" />
        <div className="leading-tight">
          <p className="text-xs font-semibold">Priya Sharma</p>
          <p className="text-[11px] text-success">Online</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <ShieldCheck className="size-3" /> Secured
        </span>
      </div>
      <div className="space-y-2.5 text-[12.5px]">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-base-300 px-3 py-2">Just joined Chatty 🎉</div>
        <div className={`${GRADIENT} ml-auto max-w-[80%] rounded-2xl rounded-br-md px-3 py-2`}>Welcome! Setup took me a minute ⚡</div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-secondary/30 bg-secondary/10 px-3 py-2">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-secondary"><Sparkles className="size-3" /> Chatty AI</p>
          Want me to draft a hello for the group?
        </div>
        <TypingDots />
      </div>
    </motion.div>
    <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute -bottom-5 -left-4 flex items-center gap-2.5 rounded-xl border border-base-300 bg-base-100/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <span className={`${GRADIENT} flex size-7 items-center justify-center rounded-lg`}><Users className="size-3.5" /></span>
      <span className="text-[11px] font-semibold leading-tight">Design Team<span className="block font-normal text-base-content/50">3 new messages</span></span>
    </motion.div>
  </div>
);

export const CtaSection = () => (
  <section className="px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-10 lg:pb-28">
    <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-primary/30 bg-base-200 sm:rounded-3xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-base-content/[0.06]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 80% at 70% 50%, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 70% 50%, black, transparent 80%)",
        }} />
      <motion.div aria-hidden="true" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-24 -top-24 size-60 rounded-full bg-primary/30 blur-[100px] sm:size-80" />

      <div className="relative grid items-center gap-12 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-5 lg:gap-14 lg:px-14 lg:py-16">
        <div className="text-center lg:col-span-3 lg:text-left">
          <span className="mb-3 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary sm:mb-4 sm:text-[11px]">
            Get started
          </span>
          <h2 className="text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
            Your next conversation <span className={GRADIENT_TEXT}>starts here.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-base-content/60 sm:mt-5 sm:text-base lg:mx-0">
            Chats, groups, AI and top-notch security. Create your free account in under a minute and start talking.
          </p>
          <div className="mx-auto mt-7 flex max-w-sm flex-col items-stretch gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            <BtnPrimary to="/register" size="lg" wrapperClassName="w-full sm:w-auto" className="w-full sm:w-auto">
              Get started for free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </BtnPrimary>
            <motion.div className="w-full sm:w-auto" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={SPRING}>
              <Link to="/login" className="btn btn-outline btn-lg w-full rounded-xl text-sm sm:w-auto sm:text-base">Log in</Link>
            </motion.div>
          </div>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-base-content/55 sm:mt-8 sm:gap-x-6 lg:justify-start">
            {CTA_POINTS.map(t => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/15"><Check className="size-2.5 text-primary" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden lg:col-span-2 lg:block"><CtaPreview /></div>
      </div>
    </Reveal>
  </section>
);
