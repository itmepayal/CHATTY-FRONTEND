import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  SendHorizonal,
  MailCheck,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useReducedMotion,
} from "framer-motion";

import { axiosInstance } from "../../lib/axios";
import { ChattyLogo } from "../../components/common/ChattyLogo";
import AuthImagePatter from "../../components/AuthImagePatter";
import InputField from "../../components/BaseForm/InputField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30;

const spring = { type: "spring", stiffness: 140, damping: 18 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: spring },
};

const logoVariant = {
  hidden: { opacity: 0, scale: 0.6, rotate: -16 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 200, damping: 12 },
  },
};

const panelVariant = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 180, damping: 18 },
  },
};

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const validate = () => {
    const value = email.trim();
    if (!value) {
      setError("Enter your email address.");
      return false;
    }
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  const sendLink = useCallback(async () => {
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSucceeded(true);
      setCooldown(RESEND_COOLDOWN);
      return true;
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        "Couldn't send the reset link. Please try again.";
      toast.error(msg);
      shakeForm();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");

    if (!validate()) {
      shakeForm();
      return;
    }
    await sendLink();
  };

  const handleResend = async () => {
    if (isLoading || cooldown > 0) return;
    const ok = await sendLink();
    if (ok) toast.success("Reset link sent again.");
  };

  const handleUseDifferentEmail = () => {
    setSucceeded(false);
    setCooldown(0);
    setError("");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col items-center justify-center overflow-hidden p-5 sm:p-12">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-secondary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }
          }
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative w-full max-w-md space-y-7"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 rounded text-sm text-base-content/60 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to login
            </Link>
          </motion.div>

          <motion.header variants={fadeUp} className="text-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                variants={logoVariant}
                whileHover={
                  reduceMotion ? undefined : { rotate: -6, scale: 1.08 }
                }
                whileTap={{ scale: 0.95 }}
                className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-sm ring-1 ring-base-300"
              >
                <ChattyLogo className="size-9" />
              </motion.div>

              {!succeeded && (
                <>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight">
                    Forgot your password?
                  </h1>
                  <p className="max-w-sm text-sm text-base-content/60">
                    Enter the email linked to your account and we'll send you a
                    link to reset it.
                  </p>
                </>
              )}
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            {succeeded ? (
              <motion.div
                key="success"
                variants={panelVariant}
                initial="hidden"
                animate="show"
                exit="hidden"
                role="status"
                className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center shadow-xl sm:p-7"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.15,
                    type: "spring",
                    stiffness: 260,
                    damping: 14,
                  }}
                  className="mb-4 flex justify-center"
                >
                  <MailCheck className="size-12 text-success" />
                </motion.div>

                <h1 className="mb-2 text-xl font-semibold">Check your inbox</h1>
                <p className="text-sm leading-relaxed text-base-content/70">
                  If an account exists for{" "}
                  <span className="break-all font-medium text-base-content">
                    {email.trim()}
                  </span>
                  , a reset link is on its way. It should arrive within a few
                  minutes.
                </p>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading || cooldown > 0}
                    className="btn btn-outline h-11 w-full rounded-xl text-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending link...
                      </>
                    ) : cooldown > 0 ? (
                      `Resend link in ${cooldown}s`
                    ) : (
                      "Resend link"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleUseDifferentEmail}
                    className="btn btn-ghost h-10 w-full rounded-xl text-sm"
                  >
                    Use a different email
                  </button>
                </div>

                <p className="mt-4 text-xs text-base-content/50">
                  Nothing there? Check your spam folder.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" variants={fadeUp}>
                <motion.form
                  animate={shakeControls}
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={isLoading}
                  className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-5 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
                >
                  <InputField
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    icon={<Mail className="size-5" />}
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    error={error}
                    hint="We'll send the reset link to this address."
                  />

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={isLoading ? undefined : { scale: 1.02, y: -1 }}
                    whileTap={isLoading ? undefined : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="btn btn-primary h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isLoading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="size-5 animate-spin" />
                          Sending link...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          Send reset link
                          <SendHorizonal className="size-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AuthImagePatter
        title="No worries"
        subtitle="We'll send you instructions to reset your password safely."
      />
    </div>
  );
};

export default ForgotPasswordPage;
