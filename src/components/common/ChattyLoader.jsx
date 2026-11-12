import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChattyLogo } from "./ChattyLogo";

const DEFAULT_MESSAGES = [
  "Getting things ready…",
  "Securing your connection…",
  "Loading your chats…",
];

const TYPING_MS = 750;
const MESSAGE_MS = 2400;

const GRADIENT =
  "linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-accent))";

const ChattyLoader = ({
  fullScreen = true,
  label,
  messages = DEFAULT_MESSAGES,
}) => {
  const reduce = useReducedMotion();
  const list = label ? [label] : messages;

  const [index, setIndex] = useState(0);
  const [typing, setTyping] = useState(!reduce);

  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), TYPING_MS);
    return () => clearTimeout(t);
  }, [typing, index]);

  useEffect(() => {
    if (typing || list.length < 2) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % list.length);
      if (!reduce) setTyping(true);
    }, MESSAGE_MS);
    return () => clearTimeout(t);
  }, [typing, index, list.length, reduce]);

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
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
            { duration: 10, ease: "easeInOut" },
          )}
        />
        <motion.div
          className="absolute -bottom-20 -right-16 size-56 rounded-full bg-secondary/20 blur-3xl sm:-bottom-28 sm:-right-24 sm:size-80 2xl:size-[28rem]"
          {...loop(
            { x: [0, -40, 0], y: [0, -24, 0] },
            { duration: 12, ease: "easeInOut" },
          )}
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-base-300/50"
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
          initial={reduce ? false : { x: "-100%" }}
          {...loop(
            { x: ["-100%", "300%"] },
            { duration: 1.6, ease: "easeInOut" },
          )}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-4 sm:gap-8 sm:px-6 lg:gap-10 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:gap-8">
        <div
          aria-hidden="true"
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: "clamp(8rem, 30vmin, 14rem)",
            aspectRatio: "1 / 1",
          }}
        >
          <motion.span
            className="absolute size-[64%] rounded-full bg-primary/40 blur-2xl"
            {...loop(
              { scale: [0.9, 1.2, 0.9], opacity: [0.4, 0.8, 0.4] },
              { duration: 2.8, ease: "easeInOut" },
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
            className="aspect-square w-[46%]"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 13 }}
          >
            <ChattyLogo className="size-full drop-shadow-xl" />
          </motion.div>
        </div>

        <div
          aria-hidden="true"
          className="flex flex-col items-center gap-3 text-center sm:gap-4 [@media(max-height:500px)]:items-start [@media(max-height:500px)]:text-left"
        >
          <motion.p
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl 2xl:text-6xl"
            style={{ backgroundImage: GRADIENT }}
          >
            Chatty
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.5,
              type: "spring",
              stiffness: 220,
              damping: 16,
            }}
            className="flex h-10 max-w-[85vw] items-center sm:h-11"
          >
            <motion.div
              layout={!reduce}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex h-full items-center overflow-hidden rounded-2xl rounded-bl-sm border border-base-300 bg-base-200/80 px-4 shadow-sm backdrop-blur"
            >
              <AnimatePresence mode="wait" initial={false}>
                {typing ? (
                  <motion.span
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-center gap-1.5"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-primary sm:size-2"
                        {...loop(
                          { y: [0, -4, 0], opacity: [0.4, 1, 0.4] },
                          { duration: 0.9, ease: "easeInOut", delay: i * 0.15 },
                        )}
                      />
                    ))}
                  </motion.span>
                ) : (
                  <motion.span
                    key={current}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="truncate text-sm text-base-content/80 sm:text-base"
                  >
                    {current}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <span className="sr-only">{label || "Loading Chatty"}</span>
    </motion.div>
  );
};

export default ChattyLoader;
