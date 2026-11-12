import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Check,
  Sparkles,
  Users,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import {
  EASE,
  SPRING,
  heroContainer,
  heroItem,
  CTA_POINTS,
  HIGHLIGHTS,
} from "./landingData";
import { BtnPrimary } from "./LandingPrimitives";
import { ProductPreview, FloatChip } from "./ProductPreview";

const CHAT_PATH = "/chat";

const AVATARS = [
  "from-primary to-secondary",
  "from-secondary to-accent",
  "from-accent to-primary",
  "from-primary to-accent",
];

const AUDIENCES = ["friends", "teams", "families", "communities"];

const MOBILE_CHIPS = [
  { icon: Sparkles, label: "AI replies" },
  { icon: Users, label: "Group chats" },
  { icon: ShieldCheck, label: "2FA protected" },
];
const HeroBackground = ({ reduceMotion }) => {
  const drift = (x, y, d) =>
    reduceMotion
      ? undefined
      : {
          animate: { x: [0, x, 0], y: [0, y, 0] },
          transition: { duration: d, repeat: Infinity, ease: "easeInOut" },
        };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 text-base-content/[0.06] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_25%,black,transparent)]" />

      <motion.div
        {...drift(70, 40, 16)}
        className="absolute -left-32 -top-24 size-[28rem] rounded-full bg-primary/25 blur-[120px]"
      />
      <motion.div
        {...drift(-60, 50, 19)}
        className="absolute -right-24 top-10 size-[26rem] rounded-full bg-secondary/25 blur-[120px]"
      />
      <motion.div
        {...drift(40, -50, 22)}
        className="absolute bottom-0 left-1/3 size-[24rem] rounded-full bg-accent/15 blur-[130px]"
      />
    </div>
  );
};

const GradientPhrase = ({ reduceMotion }) => (
  <span className="relative inline-block">
    <motion.span
      style={{ backgroundSize: "200% auto" }}
      animate={
        reduceMotion
          ? undefined
          : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
      }
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
    >
      bring people closer
    </motion.span>
    <svg
      aria-hidden="true"
      viewBox="0 0 300 14"
      preserveAspectRatio="none"
      className="absolute -bottom-2 left-0 h-2.5 w-full text-primary/60 sm:-bottom-3 sm:h-3"
    >
      <motion.path
        d="M2 9 C 60 2, 120 14, 180 6 S 270 4, 298 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
      />
    </svg>
  </span>
);

const AudienceRotator = ({ reduceMotion }) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setI((n) => (n + 1) % AUDIENCES.length), 2400);
    return () => clearInterval(t);
  }, [reduceMotion]);

  return (
    <p className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-medium text-base-content/70 sm:text-base">
      Made for
      <span
        className="relative inline-flex h-7 min-w-[7.5rem] items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-primary/10 px-3 text-primary sm:h-8"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={AUDIENCES[i]}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="font-semibold"
          >
            {AUDIENCES[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
};

const PreviewStage = ({ reduceMotion }) => {
  const stageRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });

  const rawRotate = useTransform(scrollYProgress, [0, 0.35], [14, 0]);
  const rawScale = useTransform(scrollYProgress, [0, 0.35], [0.94, 1]);
  const rotateX = useSpring(rawRotate, { stiffness: 90, damping: 22 });
  const scale = useSpring(rawScale, { stiffness: 90, damping: 22 });

  const chipsA = useTransform(scrollYProgress, [0, 1], [40, -50]);
  const chipsB = useTransform(scrollYProgress, [0, 1], [-30, 60]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const mask = useMotionTemplate`radial-gradient(380px circle at ${mx}px ${my}px, black, transparent 70%)`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
      className="relative mt-14 sm:mt-16 lg:mt-20"
      style={{ perspective: 1400 }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[12%] -top-8 h-32 rounded-full bg-primary/30 blur-[90px]"
      />

      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y: chipsA }}
        className="pointer-events-none absolute inset-0 z-20 hidden md:block"
      >
        <FloatChip
          icon={Sparkles}
          text="Chatty AI replied"
          sub="Instant answers"
          className="-left-4 top-16 xl:-left-10"
        />
        <FloatChip
          icon={ShieldCheck}
          text="2FA enabled"
          sub="Your account is protected"
          className="-left-4 bottom-24 xl:-left-10"
          delay={2.2}
        />
      </motion.div>
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y: chipsB }}
        className="pointer-events-none absolute inset-0 z-20 hidden md:block"
      >
        <FloatChip
          icon={Users}
          text="Design Team"
          sub="3 new messages"
          className="-right-4 top-40 xl:-right-10"
          delay={1.2}
        />
      </motion.div>

      <motion.div
        ref={stageRef}
        onMouseMove={onMove}
        style={
          reduceMotion
            ? undefined
            : { rotateX, scale, transformOrigin: "50% 100%" }
        }
        className="group relative"
      >
        <div className="rounded-[1.75rem] bg-gradient-to-b from-primary/40 via-base-300/70 to-transparent p-px shadow-2xl shadow-primary/10">
          <div className="relative overflow-hidden rounded-[calc(1.75rem-1px)] bg-base-100">
            <ProductPreview />

            <motion.div
              aria-hidden="true"
              style={{ WebkitMaskImage: mask, maskImage: mask }}
              className="pointer-events-none absolute inset-0 bg-primary/20 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-base-100 to-transparent"
            />
          </div>
        </div>
      </motion.div>

      <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 md:hidden">
        {MOBILE_CHIPS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
          >
            <Icon className="size-3.5" />
            {label}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export const HeroSection = ({ scrollTo, isLoggedIn = false }) => {
  const reduceMotion = useReducedMotion();

  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const glowRaw = useMotionValue(0);
  const glowOpacity = useSpring(glowRaw, { stiffness: 120, damping: 24 });
  const glowMask = useMotionTemplate`radial-gradient(420px circle at ${gx}px ${gy}px, black, transparent 70%)`;

  const onHeroMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    gx.set(e.clientX - r.left);
    gy.set(e.clientY - r.top);
  };

  return (
    <>
      <section
        onMouseMove={reduceMotion ? undefined : onHeroMove}
        onMouseEnter={() => glowRaw.set(1)}
        onMouseLeave={() => glowRaw.set(0)}
        className="relative isolate overflow-x-clip px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:pt-40"
      >
        <HeroBackground reduceMotion={reduceMotion} />

        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            style={{
              opacity: glowOpacity,
              WebkitMaskImage: glowMask,
              maskImage: glowMask,
            }}
            className="pointer-events-none absolute inset-0 -z-10 hidden bg-primary/15 lg:block"
          />
        )}

        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={heroItem} className="mb-6 sm:mb-8">
              <button
                type="button"
                onClick={() => scrollTo("features")}
                className="group inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1.5 pl-2 pr-2 text-xs text-primary backdrop-blur transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-sm"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-content sm:text-[11px]">
                  <span className="relative flex size-1.5 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-content opacity-70 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary-content" />
                  </span>
                  New
                </span>
                <span className="truncate">
                  Chats, groups &amp; AI — all in one place
                </span>
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="size-3" />
                </span>
              </button>
            </motion.div>

            <motion.h1
              variants={heroItem}
              className="text-balance text-[2rem] font-extrabold leading-[1.1] tracking-tight min-[400px]:text-4xl sm:text-5xl sm:leading-[1.06] lg:text-6xl xl:text-7xl"
            >
              Conversations that <GradientPhrase reduceMotion={reduceMotion} />
            </motion.h1>

            <motion.div variants={heroItem}>
              <AudienceRotator reduceMotion={reduceMotion} />
            </motion.div>

            <motion.p
              variants={heroItem}
              className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-base-content/65 sm:mt-6 sm:text-base lg:text-lg"
            >
              One-to-one chats, group conversations and a built-in AI — wrapped
              in beautiful themes and protected with two-factor authentication.
            </motion.p>

            <motion.div
              variants={heroItem}
              className="mx-auto mt-8 flex max-w-sm flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center"
            >
              {isLoggedIn ? (
                <BtnPrimary
                  to={CHAT_PATH}
                  size="lg"
                  wrapperClassName="w-full sm:w-auto"
                  className="w-full sm:w-auto"
                >
                  <MessageSquare className="size-4" />
                  Open Chats
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </BtnPrimary>
              ) : (
                <BtnPrimary
                  to="/register"
                  size="lg"
                  wrapperClassName="w-full sm:w-auto"
                  className="w-full sm:w-auto"
                >
                  Get started — it's free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </BtnPrimary>
              )}

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                onClick={() => scrollTo("features")}
                className="btn btn-outline btn-lg w-full gap-2 rounded-xl border-base-300 bg-base-100/60 text-sm backdrop-blur hover:border-primary/50 hover:bg-base-200 sm:w-auto sm:text-base"
              >
                Explore features
                <ChevronDown className="size-4" />
              </motion.button>
            </motion.div>

            <motion.div
              variants={heroItem}
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row sm:gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {AVATARS.map((g) => (
                    <span
                      key={g}
                      className={`size-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-base-100`}
                    />
                  ))}
                </div>
                <p className="text-xs text-base-content/60 sm:text-sm">
                  Private, secure conversations for everyone
                </p>
              </div>

              <span
                aria-hidden="true"
                className="hidden h-4 w-px bg-base-300 sm:block"
              />

              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-base-content/55">
                {CTA_POINTS.map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" /> {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          <PreviewStage reduceMotion={reduceMotion} />
        </div>
      </section>

      <section
        aria-label="Highlights"
        className="relative overflow-hidden border-y border-base-300 bg-base-200/40 py-4 sm:py-5"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
        <div className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="marquee flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:[animation:none] sm:gap-12">
            {[...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS].map(
              ({ icon: Icon, label }, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 text-xs font-medium text-base-content/65 sm:gap-2.5 sm:text-sm"
                >
                  <Icon className="size-4 text-primary" /> {label}
                  <span className="ml-6 size-1 rounded-full bg-base-content/20 sm:ml-10" />
                </span>
              ),
            )}
          </div>
        </div>
      </section>
    </>
  );
};
