import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, SendHorizonal, CheckCircle2, Loader2 } from "lucide-react";
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

// ─── Motion variants ──────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
};

const logoVariant = {
  hidden: { opacity: 0, scale: 0.5, rotate: -20 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 200, damping: 12 },
  },
};

const successVariant = {
  hidden: { opacity: 0, scale: 0.85, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 180, damping: 18 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
const ForgotPasswordPage = () => {
  const [email, setEmail]         = useState("");
  const [error, setError]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const shakeControls = useAnimation();
  const reduceMotion  = useReducedMotion();

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  const validate = () => {
    if (!email.trim()) { setError("Email is required."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) { shakeForm(); return; }
    if (isLoading) return; // debounce

    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSucceeded(true);
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Something went wrong. Please try again.";
      // Surface server-side errors (e.g. email delivery failure) — NOT account-existence info
      toast.error(msg);
      shakeForm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: form ── */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* Animated background glows */}
        <motion.div
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-secondary/10 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative w-full max-w-md space-y-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Back to login */}
          <motion.div variants={fadeUp}>
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 text-sm text-base-content/60 transition-colors hover:text-primary focus:outline-none focus-visible:underline"
            >
              <motion.span
                className="flex"
                animate={reduceMotion ? undefined : { x: [0, -3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowLeft className="size-4" />
              </motion.span>
              Back to login
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeUp} className="text-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                variants={logoVariant}
                whileHover={{ rotate: -6, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-sm ring-1 ring-base-300"
              >
                <motion.div
                  animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ChattyLogo className="size-9" />
                </motion.div>
              </motion.div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Forgot your password?
              </h1>
              <p className="text-sm text-base-content/60">
                Enter the email address linked to your account and we'll send you a reset link.
              </p>
            </div>
          </motion.div>

          {/* ── Success state ── */}
          <AnimatePresence mode="wait">
            {succeeded ? (
              <motion.div
                key="success"
                variants={successVariant}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center shadow-xl"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                  className="mb-4 flex justify-center"
                >
                  <CheckCircle2 className="size-12 text-success" />
                </motion.div>
                <h2 className="mb-2 text-lg font-semibold">Check your inbox</h2>
                <p className="text-sm leading-relaxed text-base-content/70">
                  If an account exists with <span className="font-medium text-base-content">{email}</span>, you will receive instructions to reset your password within a few minutes.
                </p>
                <p className="mt-3 text-xs text-base-content/50">
                  Didn't get the email? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setSucceeded(false)}
                    className="font-medium text-primary underline-offset-4 hover:underline focus:outline-none"
                  >
                    try again
                  </button>.
                </p>
              </motion.div>
            ) : (
              /* ── Form state ── */
              <motion.div key="form" variants={fadeUp}>
                <motion.form
                  animate={shakeControls}
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-6 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
                >
                  <InputField
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    icon={<Mail className="size-5" />}
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    error={error}
                    hint="We'll send a reset link to this address."
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
                          Sending link…
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
                          Send Reset Link
                          <SendHorizonal className="size-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer link */}
          <motion.p variants={fadeUp} className="text-center text-sm text-base-content/60">
            Remember your password?{" "}
            <motion.span
              className="inline-block"
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link to="/login" className="link link-primary font-medium">
                Sign in
              </Link>
            </motion.span>
          </motion.p>
        </motion.div>
      </div>

      {/* ── Right: animated panel ── */}
      <AuthImagePatter
        title="No worries"
        subtitle="We'll send you instructions to reset your password safely."
      />
    </div>
  );
};

export default ForgotPasswordPage;
