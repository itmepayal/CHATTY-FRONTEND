import { useRef } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Lock,
  Mail,
  Search,
  User,
  UserPlus,
} from "lucide-react";
import {
  SECTION,
  GRADIENT,
  SPRING,
  EASE,
  STEPS,
  gridContainer,
  gridItem,
} from "./landingData";
import { SectionHeading, BtnPrimary } from "./LandingPrimitives";

const Line = ({ w = "w-20" }) => (
  <span className={`h-2 ${w} rounded-full bg-base-content/20`} />
);

const SignupMock = () => (
  <div className="w-full max-w-[230px] space-y-2.5 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xl">
    <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
      <User className="size-3.5 text-base-content/40" />
      <Line w="w-24" />
    </div>
    <div className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-3 py-2">
      <Mail className="size-3.5 text-base-content/40" />
      <Line w="w-28" />
    </div>
    <div
      className={`${GRADIENT} flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold shadow-md shadow-primary/25`}
    >
      Create account <ArrowRight className="size-3.5" />
    </div>
  </div>
);

const Person = ({ tone, added }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-base-300 bg-base-200/50 p-2">
    <span
      className={`inline-flex size-8 shrink-0 rounded-full ${tone} opacity-80`}
    />
    <div className="flex-1 space-y-1.5">
      <Line w="w-16" />
      <span className="block h-1.5 w-10 rounded-full bg-base-content/10" />
    </div>
    <span
      className={`inline-flex size-7 items-center justify-center rounded-full ${
        added ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
      }`}
    >
      {added ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : (
        <UserPlus className="size-3.5" />
      )}
    </span>
  </div>
);

const FindMock = () => (
  <div className="w-full max-w-[230px] space-y-2.5 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xl">
    <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-base-200/60 px-3 py-1.5">
      <Search className="size-3.5 text-primary" />
      <Line w="w-16" />
    </div>
    <Person tone="bg-primary" added />
    <Person tone="bg-secondary" />
  </div>
);

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-base-300 bg-base-200 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1.5 rounded-full bg-base-content/40"
        animate={{ y: [0, -3, 0] }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      />
    ))}
  </span>
);

const ChatMock = () => (
  <div className="w-full max-w-[230px] space-y-2 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xl">
    <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-base-300 bg-base-200 px-3 py-2">
      <Line w="w-24" />
    </div>
    <div
      className={`${GRADIENT} ml-auto max-w-[70%] rounded-2xl rounded-br-md px-3 py-2`}
    >
      <span className="block h-2 w-16 rounded-full bg-white/70" />
    </div>
    <div className="flex items-center justify-between pt-1">
      <TypingDots />
      <span className="inline-flex items-center gap-1 text-[10px] text-base-content/50">
        <Lock className="size-3" /> Encrypted
      </span>
    </div>
  </div>
);

const MOCKS = [SignupMock, FindMock, ChatMock];

const StepCard = ({ step, index, reduceMotion }) => {
  const Icon = step.icon;
  const Mock = MOCKS[index % MOCKS.length];
  const number = String(index + 1).padStart(2, "0");

  return (
    <motion.li
      variants={gridItem}
      whileHover={{ y: -8 }}
      transition={SPRING}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-base-300 bg-base-200/50 transition-colors duration-300 hover:border-primary/40 hover:bg-base-200"
    >
      <div
        aria-hidden="true"
        className="relative flex h-48 items-center justify-center overflow-hidden border-b border-base-300 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent px-4"
      >
        <div className="absolute inset-0 text-base-content/15 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/25" />
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{
            duration: 4 + index,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex w-full justify-center"
        >
          <Mock />
        </motion.div>
      </div>

      <div className="relative flex flex-1 flex-col p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Step {number}
          </span>
          <span
            className={`${GRADIENT} inline-flex size-10 items-center justify-center rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110`}
          >
            <Icon className="size-[18px]" />
          </span>
        </div>

        <h3 className="mb-2 text-lg font-semibold tracking-tight">
          {step.title}
        </h3>
        <p className="text-sm leading-relaxed text-base-content/65">
          {step.desc}
        </p>
      </div>
    </motion.li>
  );
};

export const HowItWorksSection = () => {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.4,
  });

  return (
    <section id="how-it-works" className={SECTION}>
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How it works"
          title="Start chatting in three simple steps"
          sub="No complicated setup. Create your account, find your people and start talking."
        />

        <div ref={ref} className="relative">
          <div
            aria-hidden="true"
            className="relative mb-8 hidden grid-cols-3 gap-7 md:grid"
          >
            <div className="absolute inset-x-[16.66%] top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-base-300" />
            <motion.div
              style={{ scaleX: progress }}
              className="absolute inset-x-[16.66%] top-1/2 h-0.5 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-secondary"
            />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex justify-center">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.15, ...SPRING }}
                  className={`${GRADIENT} relative z-10 flex size-10 items-center justify-center rounded-full text-sm font-bold shadow-lg shadow-primary/30 ring-4 ring-base-100`}
                >
                  {i + 1}
                </motion.span>
              </div>
            ))}
          </div>

          <motion.ol
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-5 md:grid-cols-3 md:gap-7"
          >
            {STEPS.map((s, i) => (
              <StepCard
                key={s.title}
                step={s}
                index={i}
                reduceMotion={reduceMotion}
              />
            ))}
          </motion.ol>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative mt-12 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent px-6 py-8 text-center sm:mt-16 sm:px-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col items-center justify-between gap-5 md:flex-row md:text-left">
            <div>
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                Ready in under a minute
              </h3>
              <p className="mt-1 text-sm text-base-content/65">
                Join Chatty and start your first private conversation today.
              </p>
            </div>
            <BtnPrimary to="/register" className="rounded-full">
              <span className="inline-flex items-center gap-2">
                Get started free
                <ArrowRight className="size-4" />
              </span>
            </BtnPrimary>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
