import { useState } from "react";
import { useId } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, CheckCheck, MessageSquareDot } from "lucide-react";
import { SECTION, GRADIENT_TEXT, SPRING } from "./landingData";
import { SectionHeading, Reveal, CheckBullet, BtnPrimary } from "./LandingPrimitives";
import { ArrowRight } from "lucide-react";

const Toggle = ({ checked, onChange, label, desc, icon: Icon }) => {
  const id = useId();
  return (
    <motion.div whileHover={{ scale: 1.015 }} transition={SPRING}
      className="flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 sm:gap-4 sm:p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">{label}</label>
        <p className="text-xs text-base-content/50">{desc}</p>
      </div>
      <input id={id} type="checkbox" role="switch" className="toggle toggle-primary shrink-0"
        checked={checked} onChange={e => onChange(e.target.checked)} />
    </motion.div>
  );
};

const PrivacyPanel = () => {
  const [s, setS] = useState({ online: true, receipts: true, typing: false });
  return (
    <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-200 p-4 shadow-2xl shadow-primary/10 sm:p-5">
      <div className="mb-4 flex items-center gap-2 px-1">
        <Lock className="size-4 text-primary" />
        <p className="text-sm font-semibold">Privacy settings</p>
      </div>
      <div className="space-y-3">
        <Toggle icon={Eye} label="Show online status" desc="Let others see when you're active" checked={s.online} onChange={v => setS(p => ({ ...p, online: v }))} />
        <Toggle icon={CheckCheck} label="Read receipts" desc="Show blue ticks when you read" checked={s.receipts} onChange={v => setS(p => ({ ...p, receipts: v }))} />
        <Toggle icon={MessageSquareDot} label="Typing indicators" desc="Show when you're writing" checked={s.typing} onChange={v => setS(p => ({ ...p, typing: v }))} />
      </div>
      <p className="mt-4 px-1 text-[11px] text-base-content/40">Try the switches — this is how they look in Chatty.</p>
    </div>
  );
};

const BULLETS = [
  "Fast, intuitive conversations with zero lag",
  "A personalised experience that's truly yours",
  "Independent switches for status, receipts and typing",
  "A clean, beautiful interface on every screen size",
];

export const PrivacySection = () => (
  <section id="privacy" className={SECTION}>
    <div className="mx-auto max-w-7xl">
      <Reveal className="grid items-center gap-10 rounded-2xl border border-base-300 bg-gradient-to-br from-base-200 to-base-100 p-5 sm:rounded-3xl sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Privacy"
            title={<>Less friction.<br /><span className={GRADIENT_TEXT}>More conversation.</span></>}
            sub="Every setting is yours to control, so conversations flow exactly the way you want."
            mb="mb-6 sm:mb-8"
          />
          <ul className="mb-7 space-y-3.5 sm:mb-9 sm:space-y-4">
            {BULLETS.map(b => (
              <li key={b} className="flex items-start gap-3">
                <CheckBullet />
                <span className="text-sm leading-relaxed text-base-content/70">{b}</span>
              </li>
            ))}
          </ul>
          <BtnPrimary to="/register" wrapperClassName="w-full sm:w-auto" className="w-full sm:w-auto">
            Get started free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </BtnPrimary>
        </div>
        <div className="flex justify-center lg:justify-end"><PrivacyPanel /></div>
      </Reveal>
    </div>
  </section>
);
