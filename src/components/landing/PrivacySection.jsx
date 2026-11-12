import { useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Lock,
  Eye,
  CheckCheck,
  Check,
  MessageSquareDot,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, SPRING } from "./landingData";
import {
  SectionHeading,
  Reveal,
  CheckBullet,
  BtnPrimary,
  TypingDots,
} from "./LandingPrimitives";

const Toggle = ({ checked, onChange, label, desc, icon: Icon }) => {
  const id = useId();
  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      transition={SPRING}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4 ${
        checked
          ? "border-primary/30 bg-primary/5"
          : "border-base-300 bg-base-100"
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors sm:size-10 ${
          checked
            ? "bg-primary text-primary-content shadow-md shadow-primary/30"
            : "bg-base-200 text-base-content/50"
        }`}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="block cursor-pointer text-sm font-medium"
        >
          {label}
        </label>
        <p className="text-xs text-base-content/55">{desc}</p>
      </div>
      <span
        aria-hidden="true"
        className={`hidden w-6 text-right text-[10px] font-semibold min-[380px]:block ${
          checked ? "text-primary" : "text-base-content/40"
        }`}
      >
        {checked ? "On" : "Off"}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="toggle toggle-primary shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </motion.div>
  );
};

const LivePreview = ({ s }) => {
  const reduce = useReducedMotion();
  return (
    <div
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-xl border border-base-300 bg-base-100"
    >
      <div className="flex items-center justify-between border-b border-base-300 bg-base-200/60 px-3.5 py-2">
        <p className="text-[11px] font-semibold text-base-content/70">
          What your friends see
        </p>
        <span className="flex items-center gap-1 text-[10px] text-base-content/45">
          <Eye className="size-3" /> Live preview
        </span>
      </div>

      <div className="space-y-2.5 p-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`${GRADIENT} relative flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold`}
          >
            Y
            <AnimatePresence>
              {s.online && (
                <motion.span
                  key="dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={SPRING}
                  className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-base-100 bg-success"
                />
              )}
            </AnimatePresence>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold">You</p>
            <p
              className={`text-[11px] transition-colors ${
                s.online ? "text-success" : "text-base-content/40"
              }`}
            >
              {s.online ? "Online" : "Status hidden"}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-base-300 px-3 py-2 text-xs">
            Did you see my message?
            <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-base-content/50">
              10:42 AM
              <CheckCheck
                className={`size-3.5 transition-colors ${
                  s.receipts ? "text-info" : "text-base-content/40"
                }`}
                aria-label={s.receipts ? "Read" : "Delivered"}
              />
            </span>
          </div>
        </div>
        <p className="text-right text-[10px] text-base-content/45">
          {s.receipts ? "Seen by you" : "Delivered, read status hidden"}
        </p>

        <div className="flex min-h-7 items-center">
          <AnimatePresence mode="wait" initial={false}>
            {s.typing ? (
              <motion.div
                key="typing"
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2"
              >
                <TypingDots />
                <span className="text-[11px] text-primary">
                  You are typing…
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="quiet"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-base-content/40"
              >
                Typing is private
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const PrivacyPanel = () => {
  const [s, setS] = useState({ online: true, receipts: true, typing: false });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-secondary/10 to-accent/20 blur-3xl"
      />
      <div className="rounded-2xl border border-base-300 bg-base-200 p-4 shadow-2xl shadow-primary/10 ring-1 ring-base-content/5 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5 px-1">
          <span
            className={`${GRADIENT} flex size-8 items-center justify-center rounded-lg shadow-md shadow-primary/30`}
          >
            <Lock className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Privacy settings</p>
            <p className="text-[11px] text-base-content/50">
              You decide what others see
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
            <ShieldCheck className="size-3" /> Yours
          </span>
        </div>

        <div className="space-y-3">
          <Toggle
            icon={Eye}
            label="Show online status"
            desc="Let others see when you're active"
            checked={s.online}
            onChange={set("online")}
          />
          <Toggle
            icon={CheckCheck}
            label="Read receipts"
            desc="Show blue ticks when you read"
            checked={s.receipts}
            onChange={set("receipts")}
          />
          <Toggle
            icon={MessageSquareDot}
            label="Typing indicators"
            desc="Show when you're writing"
            checked={s.typing}
            onChange={set("typing")}
          />
        </div>

        <LivePreview s={s} />

        <p className="mt-4 flex items-center gap-1.5 px-1 text-[11px] text-base-content/50">
          <Check className="size-3 text-primary" />
          Try the switches, this is how they work in Chatty.
        </p>
      </div>
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
      <Reveal className="relative grid items-center gap-10 overflow-hidden rounded-2xl border border-base-300 bg-gradient-to-br from-base-200 to-base-100 p-5 shadow-xl shadow-primary/5 sm:rounded-3xl sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-secondary/10 blur-3xl"
        />

        <div className="relative">
          <SectionHeading
            align="left"
            eyebrow="Privacy"
            title={
              <>
                Less friction.
                <br />
                <span className={GRADIENT_TEXT}>More conversation.</span>
              </>
            }
            sub="Every setting is yours to control, so conversations flow exactly the way you want."
            mb="mb-6 sm:mb-8"
          />
          <ul className="mb-7 space-y-3.5 sm:mb-9 sm:space-y-4">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckBullet />
                <span className="text-sm leading-relaxed text-base-content/70">
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <BtnPrimary
            to="/register"
            wrapperClassName="w-full sm:w-auto"
            className="w-full sm:w-auto"
          >
            Get started free{" "}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </BtnPrimary>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <PrivacyPanel />
        </div>
      </Reveal>
    </div>
  </section>
);
