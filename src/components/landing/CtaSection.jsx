import { forwardRef, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Sparkles,
  Users,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import {
  GRADIENT,
  GRADIENT_TEXT,
  SPRING,
  EASE,
  CTA_POINTS,
} from "./landingData";
import {
  Avatar,
  TypingDots,
  Ticks,
  Reveal,
  Eyebrow,
  BtnPrimary,
} from "./LandingPrimitives";

const CHAT_PATH = "/chat";

const AVATARS = [
  "from-primary to-secondary",
  "from-secondary to-accent",
  "from-accent to-primary",
  "from-primary to-accent",
];

const FEATURE_TILES = [
  {
    icon: ShieldCheck,
    title: "End-to-end encrypted",
    sub: "Only you and your contacts can read your chats",
  },
  {
    icon: Users,
    title: "Groups & calls",
    sub: "Audio and video, one-to-one or with the whole group",
  },
  {
    icon: Sparkles,
    title: "Built-in AI",
    sub: "Get a helping hand drafting replies",
  },
];

const Magnetic = ({ children, className = "", strength = 0.22, disabled }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const TOTAL_STEPS = 4;
const Msg = forwardRef(({ children, className = "" }, ref) => (
  <motion.div
    ref={ref}
    layout
    initial={{ opacity: 0, y: 12, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.35, ease: EASE }}
    className={className}
  >
    {children}
  </motion.div>
));
Msg.displayName = "Msg";

const CtaPreview = ({ reduceMotion }) => {
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { margin: "-80px" });
  const [step, setStep] = useState(reduceMotion ? TOTAL_STEPS : 0);

  useEffect(() => {
    if (reduceMotion) {
      setStep(TOTAL_STEPS);
      return;
    }
    if (!inView) return;
    const delay = step >= TOTAL_STEPS ? 3600 : step === 0 ? 900 : 1500;
    const t = setTimeout(
      () => setStep((s) => (s >= TOTAL_STEPS ? 0 : s + 1)),
      delay,
    );
    return () => clearTimeout(t);
  }, [step, reduceMotion, inView]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), {
    stiffness: 120,
    damping: 18,
  });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={reduceMotion ? undefined : onMove}
      onMouseLeave={reduceMotion ? undefined : onLeave}
      className="relative mx-auto w-full max-w-sm"
      style={{ perspective: 1000 }}
    >
      <span className="sr-only">
        Preview of a Chatty conversation: a new user joins, a friend welcomes
        them, and Chatty AI offers to draft a hello for the group.
      </span>

      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-full bg-primary/25 blur-[70px]"
      />

      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        className="relative rounded-2xl border border-base-300 bg-base-100/90 p-4 shadow-2xl shadow-primary/20 backdrop-blur-md"
      >
        <div className="mb-3 flex items-center gap-3 border-b border-base-300 pb-3">
          <Avatar initials="PS" online size="sm" ringClass="ring-base-100" />
          <div className="leading-tight">
            <p className="text-xs font-semibold">Priya Sharma</p>
            <p className="text-[11px] text-success">Online</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <ShieldCheck className="size-3" /> Secured
          </span>
        </div>

        <div
          aria-hidden="true"
          className="flex min-h-[15.5rem] flex-col justify-end space-y-2.5 text-[12.5px]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {step >= 1 && (
              <Msg
                key="m1"
                className="max-w-[80%] rounded-2xl rounded-bl-md bg-base-300 px-3 py-2"
              >
                Just joined Chatty 🎉
              </Msg>
            )}
            {step >= 2 && (
              <Msg
                key="m2"
                className={`${GRADIENT} ml-auto max-w-[80%] rounded-2xl rounded-br-md px-3 py-2`}
              >
                Welcome! Setup took me a minute ⚡
              </Msg>
            )}
            {step >= 3 && (
              <Msg
                key="m3"
                className="max-w-[85%] rounded-2xl rounded-bl-md border border-secondary/30 bg-secondary/10 px-3 py-2"
              >
                <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-secondary">
                  <Sparkles className="size-3" /> Chatty AI
                </p>
                Want me to draft a hello for the group?
              </Msg>
            )}
            {step >= 4 && (
              <Msg
                key="m4"
                className={`${GRADIENT} ml-auto max-w-[70%] rounded-2xl rounded-br-md px-3 py-2`}
              >
                <span className="flex items-end gap-2">
                  Yes, please!
                  <span className="mb-0.5 inline-flex">
                    <Ticks status="seen" />
                  </span>
                </span>
              </Msg>
            )}
            {step < TOTAL_STEPS && (
              <Msg key="typing" className="w-fit">
                <TypingDots />
              </Msg>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -bottom-5 -left-4 flex items-center gap-2.5 rounded-xl border border-base-300 bg-base-100/95 px-3 py-2 shadow-xl backdrop-blur-md"
      >
        <span
          className={`${GRADIENT} flex size-7 items-center justify-center rounded-lg`}
        >
          <Users className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold leading-tight">
          Design Team
          <span className="block font-normal text-base-content/50">
            3 new messages
          </span>
        </span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-xl border border-base-300 bg-base-100/95 px-3 py-2 shadow-xl backdrop-blur-md sm:flex"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-success/15 text-success">
          <ShieldCheck className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold leading-tight">
          2FA enabled
          <span className="block font-normal text-base-content/50">
            Account protected
          </span>
        </span>
      </motion.div>
    </div>
  );
};

const FeatureStrip = () => (
  <ul className="relative grid divide-y divide-base-300/70 border-t border-base-300/70 bg-base-100/40 backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    {FEATURE_TILES.map(({ icon: Icon, title, sub }) => (
      <li
        key={title}
        className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-base-100/60 sm:px-6 sm:py-5 lg:px-8"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-base-content/60">
            {sub}
          </p>
        </div>
      </li>
    ))}
  </ul>
);

export const CtaSection = ({ isLoggedIn = false }) => {
  const reduceMotion = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const opacityRaw = useMotionValue(0);
  const spotOpacity = useSpring(opacityRaw, { stiffness: 120, damping: 24 });
  const spotMask = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, black, transparent 70%)`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-10 lg:pb-28">
      <Reveal className="mx-auto max-w-6xl">
        <div className="rounded-[1.6rem] bg-gradient-to-br from-primary/60 via-secondary/30 to-accent/40 p-px shadow-2xl shadow-primary/10 sm:rounded-[2rem]">
          <div
            onMouseMove={reduceMotion ? undefined : onMove}
            onMouseEnter={() => opacityRaw.set(1)}
            onMouseLeave={() => opacityRaw.set(0)}
            className="relative isolate overflow-hidden rounded-[calc(1.6rem-1px)] bg-base-200 sm:rounded-[calc(2rem-1px)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 text-base-content/[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage:
                  "radial-gradient(ellipse 80% 80% at 70% 50%, black, transparent 80%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 80% 80% at 70% 50%, black, transparent 80%)",
              }}
            />
            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }
              }
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -left-24 -top-24 -z-10 size-60 rounded-full bg-primary/30 blur-[100px] sm:size-80"
            />
            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.4, 0.8, 0.4], scale: [1.05, 1, 1.05] }
              }
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-24 right-0 -z-10 size-60 rounded-full bg-secondary/25 blur-[100px] sm:size-80"
            />

            {!reduceMotion && (
              <motion.span
                aria-hidden="true"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute left-0 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            )}

            {!reduceMotion && (
              <motion.div
                aria-hidden="true"
                style={{
                  opacity: spotOpacity,
                  WebkitMaskImage: spotMask,
                  maskImage: spotMask,
                }}
                className="pointer-events-none absolute inset-0 -z-10 hidden bg-primary/15 lg:block"
              />
            )}

            <div className="relative grid items-center gap-14 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-5 lg:gap-14 lg:px-14 lg:py-16">
              <div className="text-center lg:col-span-3 lg:text-left">
                <Eyebrow icon={Sparkles}>Get started</Eyebrow>

                <h2 className="text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                  Your next conversation{" "}
                  <span className={GRADIENT_TEXT}>starts here.</span>
                </h2>

                <p className="mx-auto mt-4 max-w-lg text-pretty text-sm leading-relaxed text-base-content/65 sm:mt-5 sm:text-base lg:mx-0">
                  Chats, groups, AI and top-notch security. Create your free
                  account in under a minute and start talking.
                </p>

                <div className="mx-auto mt-7 flex max-w-sm flex-col items-stretch gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                  {isLoggedIn ? (
                    <Magnetic
                      disabled={reduceMotion}
                      className="w-full sm:w-auto"
                    >
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
                    </Magnetic>
                  ) : (
                    <>
                      <Magnetic
                        disabled={reduceMotion}
                        className="w-full sm:w-auto"
                      >
                        <BtnPrimary
                          to="/register"
                          size="lg"
                          wrapperClassName="w-full sm:w-auto"
                          className="w-full sm:w-auto"
                        >
                          Get started for free
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </BtnPrimary>
                      </Magnetic>
                      <motion.div
                        className="w-full sm:w-auto"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                      >
                        <Link
                          to="/login"
                          className="btn btn-outline btn-lg w-full rounded-xl border-base-300 bg-base-100/60 text-sm backdrop-blur hover:border-primary/50 hover:bg-base-100 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 sm:w-auto sm:text-base"
                        >
                          Log in
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 sm:mt-9 lg:items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2" aria-hidden="true">
                      {AVATARS.map((g) => (
                        <span
                          key={g}
                          className={`size-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-base-200`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-base-content/60 sm:text-sm">
                      Join people who value private conversations
                    </p>
                  </div>

                  <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-base-content/60 sm:gap-x-6 lg:justify-start">
                    {CTA_POINTS.map((t) => (
                      <li key={t} className="flex items-center gap-1.5">
                        <span className="flex size-4 items-center justify-center rounded-full bg-primary/15">
                          <Check
                            className="size-2.5 text-primary"
                            strokeWidth={3}
                          />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-2">
                <CtaPreview reduceMotion={reduceMotion} />
              </div>
            </div>

            <FeatureStrip />
          </div>
        </div>
      </Reveal>
    </section>
  );
};
