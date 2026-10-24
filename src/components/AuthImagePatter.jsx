import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  CheckCheck,
  ShieldCheck,
  Zap,
  Sparkles,
  Phone,
  Video,
  Smile,
  Paperclip,
  SendHorizontal,
  Play,
} from "lucide-react";
import { ChattyLogo } from "./common/ChattyLogo";

const WAVE = [40, 70, 50, 90, 60, 100, 45, 80, 55, 75, 35, 65, 50, 85, 40, 60];
const TOTAL_MESSAGES = 4;

const bubble = {
  hidden: { opacity: 0, y: 18, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const titleContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } },
};

const titleWord = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 140, damping: 16 },
  },
};

const Avatar = ({ letter, className = "" }) => (
  <div
    className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-semibold text-white shadow-sm ${className}`}
  >
    {letter}
  </div>
);

const Chip = ({ icon, children, className = "", delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`absolute flex items-center gap-2 rounded-full border border-base-300 bg-base-100/95 px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur ${className}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, y: reduce ? 0 : [0, -10, 0] }}
      transition={{
        opacity: { delay: 0.9 + delay, duration: 0.3 },
        scale: {
          delay: 0.9 + delay,
          type: "spring",
          stiffness: 260,
          damping: 14,
        },
        y: {
          delay: 1.2 + delay,
          duration: 4 + delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      whileHover={{ scale: 1.08 }}
    >
      {icon}
      {children}
    </motion.div>
  );
};

const HeaderIconButton = ({ children, label }) => (
  <motion.button
    type="button"
    aria-label={label}
    whileHover={{ scale: 1.15, y: -1 }}
    whileTap={{ scale: 0.88 }}
    className="flex size-8 items-center justify-center rounded-full text-base-content/50 transition-colors hover:bg-base-200 hover:text-primary"
  >
    {children}
  </motion.button>
);

const TypingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-2 rounded-full bg-base-content/60"
        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

const AuthImagePatter = ({ title, subtitle }) => {
  const reduce = useReducedMotion();

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) {
      setStep(TOTAL_MESSAGES);
      return;
    }
    const wait = step >= TOTAL_MESSAGES ? 4200 : step === 0 ? 900 : 1200;
    const t = setTimeout(
      () => setStep((s) => (s >= TOTAL_MESSAGES ? 0 : s + 1)),
      wait,
    );
    return () => clearTimeout(t);
  }, [step, reduce]);

  const isTyping = step === TOTAL_MESSAGES;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), {
    stiffness: 140,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), {
    stiffness: 140,
    damping: 18,
  });
  const glowX = useSpring(useTransform(mx, [-0.5, 0.5], [-30, 30]), {
    stiffness: 80,
    damping: 20,
  });
  const glowY = useSpring(useTransform(my, [-0.5, 0.5], [-30, 30]), {
    stiffness: 80,
    damping: 20,
  });

  const handleMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const words = (title || "").split(" ");

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.15 }}
      className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-base-200 to-secondary/15 p-12 lg:flex"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, currentColor 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <motion.div
        style={{ x: glowX, y: glowY }}
        className="pointer-events-none absolute -top-20 -right-20"
      >
        <motion.div
          className="size-96 rounded-full bg-primary/25 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <motion.div
        style={{ x: glowX, y: glowY }}
        className="pointer-events-none absolute -bottom-24 -left-16"
      >
        <motion.div
          className="size-96 rounded-full bg-secondary/25 blur-3xl"
          animate={reduce ? undefined : { scale: [1.1, 1, 1.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="relative w-full max-w-xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 90,
            damping: 16,
            delay: 0.25,
          }}
          style={{
            rotateX: reduce ? 0 : rotateX,
            rotateY: reduce ? 0 : rotateY,
            transformPerspective: 1100,
          }}
          className="relative mx-auto mb-12 w-full max-w-lg"
        >
          <div className="absolute inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/30 to-secondary/30 blur-2xl" />

          <div className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 text-left shadow-2xl shadow-base-content/15">
            <div className="flex items-center gap-3 border-b border-base-300 bg-base-100 px-5 py-4">
              <div className="relative">
                <Avatar letter="A" className="size-12 text-base" />
                <span className="absolute right-0 bottom-0 flex size-3.5">
                  {!reduce && (
                    <motion.span
                      className="absolute inline-flex size-full rounded-full bg-success"
                      animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  )}
                  <span className="relative inline-flex size-3.5 rounded-full border-2 border-base-100 bg-success" />
                </span>
              </div>

              <div className="leading-tight">
                <p className="text-base font-semibold">Aarav Sharma</p>
                <div className="h-4 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={isTyping ? "typing" : "online"}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="text-xs text-success"
                    >
                      {isTyping ? "typing..." : "Online"}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-1">
                <HeaderIconButton label="Voice call">
                  <Phone className="size-4" />
                </HeaderIconButton>
                <HeaderIconButton label="Video call">
                  <Video className="size-4" />
                </HeaderIconButton>
                <ChattyLogo className="ml-1 size-7" animated={false} />
              </div>
            </div>

            <div className="min-h-[360px] space-y-4 bg-base-200/40 px-5 py-6">
              <div className="flex items-center justify-center">
                <span className="rounded-full bg-base-100 px-3 py-1 text-[11px] font-medium text-base-content/50 shadow-sm">
                  Today
                </span>
              </div>

              <AnimatePresence>
                {step >= 1 && (
                  <motion.div
                    key="m1"
                    layout
                    variants={bubble}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ originX: 0 }}
                    className="flex items-end gap-2.5"
                  >
                    <Avatar letter="A" />
                    <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-base-100 px-4 py-2.5 text-[15px] shadow-sm">
                      Hey! Kya chal raha hai? 👋
                    </div>
                  </motion.div>
                )}

                {step >= 2 && (
                  <motion.div
                    key="m2"
                    layout
                    variants={bubble}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ originX: 1 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-content shadow-md shadow-primary/25">
                      Bas naya account bana raha hu 😎
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                        9:41
                        <motion.span
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="flex"
                        >
                          <CheckCheck className="size-3.5" />
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 3 && (
                  <motion.div
                    key="m3"
                    layout
                    variants={bubble}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ originX: 0 }}
                    className="flex items-end gap-2.5"
                  >
                    <Avatar letter="A" />
                    <div className="relative mb-2 max-w-[75%] rounded-2xl rounded-bl-md bg-base-100 px-4 py-2.5 text-[15px] shadow-sm">
                      Mast! Jaldi join kar 🚀
                      <motion.span
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: 0.7,
                          type: "spring",
                          stiffness: 500,
                          damping: 12,
                        }}
                        className="absolute -right-2 -bottom-3 flex size-6 items-center justify-center rounded-full border border-base-300 bg-base-100 text-xs shadow-md"
                      >
                        ❤️
                      </motion.span>
                    </div>
                  </motion.div>
                )}

                {step >= 4 && (
                  <motion.div
                    key="m4"
                    layout
                    variants={bubble}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ originX: 1 }}
                    className="flex justify-end"
                  >
                    <div className="flex items-center gap-3 rounded-2xl rounded-br-md bg-primary px-3.5 py-3 text-primary-content shadow-md shadow-primary/25">
                      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-content/20">
                        {!reduce && (
                          <motion.span
                            className="absolute inset-0 rounded-full bg-primary-content/30"
                            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                        )}
                        <Play className="relative size-4 fill-current" />
                      </span>
                      <div className="flex h-8 items-center gap-[3px]">
                        {WAVE.map((h, i) => (
                          <motion.span
                            key={i}
                            className={`w-[3px] rounded-full bg-primary-content ${
                              i < 8 ? "opacity-100" : "opacity-40"
                            }`}
                            style={{ height: `${h}%` }}
                            animate={
                              reduce ? undefined : { scaleY: [1, 0.5, 1] }
                            }
                            transition={{
                              duration: 1.1,
                              repeat: Infinity,
                              delay: i * 0.07,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] opacity-80">0:12</span>
                    </div>
                  </motion.div>
                )}

                {isTyping && (
                  <motion.div
                    key="typing"
                    layout
                    variants={bubble}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    style={{ originX: 0 }}
                    className="flex items-end gap-2.5"
                  >
                    <Avatar letter="A" />
                    <div className="rounded-2xl rounded-bl-md bg-base-100 px-4 py-3.5 shadow-sm">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 border-t border-base-300 bg-base-100 px-4 py-3.5">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-base-200 px-4 py-2.5 text-sm text-base-content/40">
                <Smile className="size-5" />
                <span className="flex-1">Type a message...</span>
                <Paperclip className="size-5" />
              </div>
              <motion.span
                whileHover={{ scale: 1.1, rotate: -8 }}
                whileTap={{ scale: 0.9 }}
                className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30"
              >
                <SendHorizontal className="size-5" />
              </motion.span>
            </div>
          </div>

          <Chip
            icon={<ShieldCheck className="size-4 text-success" />}
            className="-top-5 -right-10"
          >
            Secure
          </Chip>
          <Chip
            icon={<Zap className="size-4 text-warning" />}
            className="-bottom-5 -left-10"
            delay={0.5}
          >
            Real-time
          </Chip>
          <Chip
            icon={<Sparkles className="size-4 text-secondary" />}
            className="top-1/2 -left-14 hidden xl:flex"
            delay={0.9}
          >
            Fast
          </Chip>
        </motion.div>

        <motion.h2
          variants={titleContainer}
          initial="hidden"
          animate="show"
          className="mb-3 text-4xl font-bold tracking-tight"
        >
          {words.map((w, i) => (
            <motion.span
              key={i}
              variants={titleWord}
              className={`mr-[0.25em] inline-block ${
                i === words.length - 1
                  ? "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                  : ""
              }`}
            >
              {w}
            </motion.span>
          ))}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mx-auto max-w-md text-sm text-base-content/60"
        >
          {subtitle}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default AuthImagePatter;
