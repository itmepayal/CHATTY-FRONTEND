import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChattyLogo } from "./ChattyLogo";

const DEFAULT_MESSAGES = [
  "Getting things ready…",
  "Securing your connection…",
  "Loading your chats…",
];

const GRADIENT =
  "linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-accent), var(--color-primary))";

const SHORT = "[@media(max-height:500px)]";

const ChattyLoader = ({
  fullScreen = true,
  label,
  messages = DEFAULT_MESSAGES,
}) => {
  const reduce = useReducedMotion();
  const list = label ? [label] : messages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 1900);
    return () => clearInterval(t);
  }, [list.length]);

  const loop = (animate, transition) =>
    reduce ? {} : { animate, transition: { repeat: Infinity, ...transition } };

  const current = list[index % list.length];

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative flex items-center justify-center overflow-hidden bg-base-100 text-base-content ${
        fullScreen
          ? "min-h-dvh pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          : "h-full min-h-72 w-full"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(circle at center, black 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 0%, transparent 70%)",
          }}
        />
        <motion.div
          className="absolute -left-16 -top-16 size-56 rounded-full bg-primary/20 blur-3xl sm:-left-24 sm:-top-24 sm:size-80 2xl:size-[28rem]"
          {...loop(
            { x: [0, 40, 0], y: [0, 24, 0] },
            { duration: 9, ease: "easeInOut" },
          )}
        />
        <motion.div
          className="absolute -bottom-20 -right-16 size-56 rounded-full bg-secondary/20 blur-3xl sm:-bottom-28 sm:-right-24 sm:size-80 2xl:size-[28rem]"
          {...loop(
            { x: [0, -40, 0], y: [0, -24, 0] },
            { duration: 11, ease: "easeInOut" },
          )}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl sm:size-64 2xl:size-96"
          {...loop(
            { scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] },
            { duration: 6, ease: "easeInOut" },
          )}
        />
      </div>

      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-base-300/50">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
          initial={{ x: "-100%" }}
          {...loop(
            { x: ["-100%", "300%"] },
            { duration: 1.6, ease: "easeInOut" },
          )}
        />
      </div>

      <div
        className={`relative flex flex-col items-center gap-5 px-4 sm:gap-7 sm:px-6 lg:gap-9 ${SHORT}:flex-row ${SHORT}:gap-8`}
      >
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: "clamp(8rem, 30vmin, 14rem)",
            aspectRatio: "1 / 1",
          }}
        >
          <motion.span
            className="absolute size-[64%] rounded-full bg-primary/40 blur-2xl"
            {...loop(
              { scale: [0.9, 1.25, 0.9], opacity: [0.4, 0.85, 0.4] },
              { duration: 2.6, ease: "easeInOut" },
            )}
          />

          <motion.span
            className="absolute size-[64%] rounded-full border border-primary/40"
            initial={{ scale: 0.85, opacity: 0 }}
            {...loop(
              { scale: [0.85, 1.6], opacity: [0.6, 0] },
              { duration: 2.4, ease: "easeOut" },
            )}
          />

          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-primary/25"
            {...loop({ rotate: 360 }, { duration: 10, ease: "linear" })}
          >
            <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] sm:size-2.5" />
            <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] sm:size-2" />
          </motion.div>

          <motion.div
            className="absolute inset-[12%] rounded-full border border-secondary/25"
            {...loop({ rotate: -360 }, { duration: 7, ease: "linear" })}
          >
            <span className="absolute left-0 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_10px_var(--color-secondary)] sm:size-2" />
          </motion.div>

          <motion.div
            className="aspect-square w-[46%]"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 13 }}
          >
            <motion.div
              className="size-full"
              {...loop({ y: [0, -6, 0] }, { duration: 3, ease: "easeInOut" })}
            >
              <ChattyLogo className="size-full drop-shadow-xl" />
            </motion.div>
          </motion.div>
        </div>

        <div
          className={`flex flex-col items-center gap-1.5 text-center sm:gap-2 ${SHORT}:items-start ${SHORT}:text-left`}
        >
          <motion.h1
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              ...(reduce ? {} : { backgroundPosition: ["0% 50%", "200% 50%"] }),
            }}
            transition={{
              opacity: { duration: 0.6, delay: 0.25 },
              y: { duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
              filter: { duration: 0.6, delay: 0.25 },
              backgroundPosition: {
                duration: 4,
                ease: "linear",
                repeat: Infinity,
              },
            }}
            className="bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl 2xl:text-6xl"
            style={{ backgroundImage: GRADIENT, backgroundSize: "200% 100%" }}
          >
            Chatty
          </motion.h1>

          <div className="h-5 overflow-hidden sm:h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="whitespace-nowrap text-xs text-base-content/60 sm:text-sm lg:text-base"
              >
                {current}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.6,
            type: "spring",
            stiffness: 220,
            damping: 16,
          }}
          className={`flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-base-300 bg-base-200/70 px-3.5 py-2.5 shadow-sm backdrop-blur sm:px-4 sm:py-3 ${SHORT}:hidden`}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-primary sm:size-2"
              {...loop(
                { y: [0, -5, 0], opacity: [0.4, 1, 0.4] },
                { duration: 1, ease: "easeInOut", delay: i * 0.16 },
              )}
            />
          ))}
        </motion.div>
      </div>

      <span className="sr-only">Loading</span>
    </motion.div>
  );
};

export default ChattyLoader;
