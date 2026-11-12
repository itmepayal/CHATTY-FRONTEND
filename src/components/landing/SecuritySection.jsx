import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  AlertCircle,
  Check,
  KeyRound,
  Lock,
  MailCheck,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { SECTION, GRADIENT, GRADIENT_TEXT, EASE, SPRING } from "./landingData";
import { SectionHeading, Reveal } from "./LandingPrimitives";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const CARD =
  "rounded-2xl border border-base-300 bg-base-100 p-5 shadow-xl shadow-base-content/5 sm:p-7";

const DEMO_CODE = "482719";
const LEN = 6;
const RESEND_SECONDS = 30;

const OtpDemo = () => {
  const reduce = useReducedMotion();
  const cardRef = useRef(null);
  const inputRef = useRef(null);
  const inView = useInView(cardRef, { margin: "-80px" });

  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorKey, setErrorKey] = useState(0);
  const [resend, setResend] = useState(RESEND_SECONDS);
  const [note, setNote] = useState(false);

  const autoplaying = !touched && !reduce;

  useEffect(() => {
    if (!autoplaying || !inView) return;
    const id = setInterval(() => {
      setValue((v) =>
        v.length >= LEN ? "" : DEMO_CODE.slice(0, v.length + 1),
      );
    }, 900);
    return () => clearInterval(id);
  }, [autoplaying, inView]);

  useEffect(() => {
    if (reduce && !touched) setValue("482");
  }, [reduce, touched]);

  useEffect(() => {
    if (!inView || resend <= 0 || status === "success") return;
    const id = setTimeout(() => setResend((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [inView, resend, status]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(false), 2600);
    return () => clearTimeout(id);
  }, [note]);

  const handleFocus = () => {
    setFocused(true);
    if (!touched) {
      setTouched(true);
      setValue("");
    }
  };

  const handleChange = (e) => {
    setTouched(true);
    setStatus("idle");
    setNote(false);
    setValue(e.target.value.replace(/\D/g, "").slice(0, LEN));
  };

  const fillDemo = () => {
    setTouched(true);
    setStatus("idle");
    setValue(DEMO_CODE);
    inputRef.current?.focus();
  };

  const submit = (e) => {
    e.preventDefault();
    if (value.length < LEN) return;
    setTouched(true);
    if (value === DEMO_CODE) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorKey((k) => k + 1);
    }
  };

  const startOver = () => {
    setStatus("idle");
    setValue("");
    setTouched(true);
    setResend(RESEND_SECONDS);
    inputRef.current?.focus();
  };

  const resendCode = () => {
    if (resend > 0) return;
    setResend(RESEND_SECONDS);
    setValue("");
    setStatus("idle");
    setNote(true);
    inputRef.current?.focus();
  };

  const activeIdx = value.length < LEN ? value.length : -1;
  const showCaret = (focused || autoplaying) && status !== "success";

  const slotTone = (i) => {
    if (status === "success")
      return "border-success/50 bg-success/10 text-success";
    if (status === "error") return "border-error/60 bg-error/5 text-error";
    if (showCaret && i === activeIdx)
      return "border-primary bg-base-100 ring-2 ring-primary/30";
    if (value[i]) return "border-primary/50 bg-primary/10 text-primary";
    return "border-base-300 bg-base-200/60";
  };

  return (
    <div ref={cardRef} className={CARD}>
      <div className="flex items-center gap-3">
        <span
          className={`${GRADIENT} flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/20 sm:size-11`}
        >
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold sm:text-base">
            Two-factor authentication
          </p>
          <p className="text-xs text-base-content/60">
            Enter the 6-digit verification code
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-base-300 bg-base-200/70 px-2.5 py-1 text-[11px] font-medium text-base-content/70 sm:block">
          Try it
        </span>
      </div>

      <form onSubmit={submit} className="mt-6">
        <div className="relative">
          <motion.div
            key={errorKey}
            animate={
              status === "error" && !reduce
                ? { x: [0, -8, 8, -6, 6, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.4 }}
            className="flex justify-between gap-2 sm:gap-3"
            aria-hidden="true"
          >
            {Array.from({ length: LEN }).map((_, i) => {
              const ch = value[i];
              return (
                <div
                  key={i}
                  className={`relative flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl border text-lg font-semibold tabular-nums transition-colors sm:h-14 sm:text-xl ${slotTone(i)}`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {ch && (
                      <motion.span
                        key={`${i}-${ch}`}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={SPRING}
                      >
                        {ch}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {showCaret && i === activeIdx && status === "idle" && (
                    <motion.span
                      className="absolute h-5 w-px bg-primary"
                      animate={reduce ? undefined : { opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              );
            })}
          </motion.div>
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={() => setFocused(false)}
            disabled={status === "success"}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={LEN}
            aria-label="6-digit verification code"
            aria-describedby="otp-hint"
            aria-invalid={status === "error"}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
          />
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex min-h-5 items-center gap-1.5 text-xs"
        >
          {status === "success" && (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check className="size-3.5" strokeWidth={3} />
              Verified. You're signed in.
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1.5 font-medium text-error">
              <AlertCircle className="size-3.5" />
              That code doesn't match. Check the digits and try again.
            </span>
          )}
          {status === "idle" && note && (
            <span className="text-base-content/60">A new code was sent.</span>
          )}
        </div>

        <div className="mt-3">
          {status === "success" ? (
            <button
              type="button"
              onClick={startOver}
              className={`flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-base-300 bg-base-100 text-sm font-medium transition-colors hover:bg-base-200 ${FOCUS}`}
            >
              <RotateCcw className="size-4" />
              Start over
            </button>
          ) : (
            <button
              type="submit"
              disabled={value.length < LEN}
              className={`flex h-11 w-full touch-manipulation items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-content shadow-sm transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none ${FOCUS}`}
            >
              Verify code
            </button>
          )}
        </div>

        {status !== "success" && (
          <p
            id="otp-hint"
            className="mt-3 text-center text-xs text-base-content/55"
          >
            Demo code is{" "}
            <span className="font-mono font-medium text-base-content/80">
              {DEMO_CODE}
            </span>
            .{" "}
            <button
              type="button"
              onClick={fillDemo}
              className={`rounded font-medium text-primary underline-offset-2 hover:underline ${FOCUS}`}
            >
              Fill it in
            </button>
          </p>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-base-300 pt-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <ShieldCheck className="size-3.5" /> Extra layer enabled
        </span>
        <button
          type="button"
          onClick={resendCode}
          disabled={resend > 0 || status === "success"}
          className={`inline-flex min-h-8 touch-manipulation items-center gap-1.5 rounded-lg px-2 text-base-content/70 transition-colors enabled:hover:bg-base-200 enabled:hover:text-base-content disabled:opacity-50 ${FOCUS}`}
        >
          <RefreshCcw className="size-3.5" />
          {resend > 0
            ? `Resend in 0:${String(resend).padStart(2, "0")}`
            : "Resend code"}
        </button>
      </div>
    </div>
  );
};

const Field = ({ children }) => (
  <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs text-base-content/55">
    {children}
  </div>
);

const LoginPreview = () => (
  <div className="space-y-2.5 rounded-xl border border-base-300 bg-base-200/50 p-3 sm:p-4">
    <Field>you@example.com</Field>
    <Field>••••••••</Field>
    <div className="flex items-center justify-between gap-3 pt-0.5">
      <span className="rounded-md px-1.5 py-0.5 text-xs font-medium text-primary ring-2 ring-primary/30">
        Forgot password?
      </span>
      <span className="rounded-lg bg-base-300 px-3 py-1.5 text-xs font-medium text-base-content/50">
        Sign in
      </span>
    </div>
  </div>
);

const VerifyPreview = () => (
  <div className="space-y-3 rounded-xl border border-base-300 bg-base-200/50 p-3 sm:p-4">
    <p className="text-xs text-base-content/60">
      We sent a verification code to your email.
    </p>
    <div className="flex gap-1.5 sm:gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-sm font-semibold text-primary"
        >
          •
        </span>
      ))}
    </div>
    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
      <Check className="size-3.5" strokeWidth={3} /> Identity confirmed
    </p>
  </div>
);

const PasswordPreview = () => (
  <div className="space-y-3 rounded-xl border border-base-300 bg-base-200/50 p-3 sm:p-4">
    <Field>••••••••••••</Field>
    <div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < 3 ? "bg-success" : "bg-base-300"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-base-content/60">Strong password</p>
    </div>
    <span className="flex h-9 items-center justify-center rounded-lg bg-primary text-xs font-medium text-primary-content">
      Update password
    </span>
  </div>
);

const RESET_STEPS = [
  {
    icon: KeyRound,
    title: "Forgot password",
    desc: "Tap “Forgot password” on the login page.",
    Preview: LoginPreview,
  },
  {
    icon: MailCheck,
    title: "Verify it's you",
    desc: "Confirm your identity with a secure verification step.",
    Preview: VerifyPreview,
  },
  {
    icon: Lock,
    title: "Set a new password",
    desc: "Reset your password and jump straight back into your chats.",
    Preview: PasswordPreview,
  },
];

const ResetFlow = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-80px" });
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || reduce || !inView) return;
    const id = setInterval(
      () => setActive((a) => (a + 1) % RESET_STEPS.length),
      3800,
    );
    return () => clearInterval(id);
  }, [manual, reduce, inView]);

  const choose = (i) => {
    setManual(true);
    setActive(i);
  };

  return (
    <div ref={ref} className={CARD}>
      <h3 className="text-sm font-semibold sm:text-base">
        Forgot your password?
      </h3>
      <p className="mt-0.5 text-xs text-base-content/60">
        Three quick steps and you're back in.
      </p>

      <ol className="mt-6">
        {RESET_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          const last = i === RESET_STEPS.length - 1;
          const panelId = `reset-step-${i}`;
          return (
            <li key={step.title} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:size-11 ${
                    current
                      ? `${GRADIENT} shadow-lg shadow-primary/25 ring-4 ring-primary/15`
                      : done
                        ? "bg-primary text-primary-content"
                        : "border border-base-300 bg-base-200 text-base-content/50"
                  }`}
                >
                  {done ? (
                    <Check className="size-5" strokeWidth={3} />
                  ) : (
                    <step.icon className="size-5" />
                  )}
                </span>
                {!last && (
                  <span
                    aria-hidden="true"
                    className={`my-1.5 w-0.5 flex-1 rounded-full transition-colors duration-500 ${
                      done ? "bg-primary" : "bg-base-300"
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "" : "pb-5"}`}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-expanded={current}
                  aria-controls={panelId}
                  className={`-mx-2 block w-[calc(100%+1rem)] touch-manipulation rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-base-200/70 ${FOCUS}`}
                >
                  <span className="block text-xs text-base-content/50">
                    Step {i + 1}
                  </span>
                  <span
                    className={`block text-sm font-semibold transition-colors ${
                      current ? "text-base-content" : "text-base-content/75"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-base-content/60">
                    {step.desc}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {current && (
                    <motion.div
                      id={panelId}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                      aria-hidden="true"
                    >
                      <div className="pt-3">
                        <step.Preview />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const SecuritySection = () => (
  <section id="security" className={`${SECTION} overflow-x-clip`}>
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <SectionHeading
        eyebrow="Security"
        title={
          <>
            Your account, <span className={GRADIENT_TEXT}>locked down</span>
          </>
        }
        sub="Two-factor authentication keeps intruders out, and password recovery gets you back in when you forget."
      />
      <div className="grid items-start gap-5 sm:gap-8 lg:grid-cols-2">
        <Reveal>
          <OtpDemo />
        </Reveal>
        <Reveal>
          <ResetFlow />
        </Reveal>
      </div>
    </div>
  </section>
);
