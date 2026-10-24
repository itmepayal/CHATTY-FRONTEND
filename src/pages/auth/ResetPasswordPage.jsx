import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Lock, Eye, EyeOff, ArrowLeft, CheckCircle2,
  Loader2, ShieldAlert, ArrowRight,
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

// ─── Password policy (must mirror the backend User model) ────────────────────
const MIN_LEN = 6;
const MAX_LEN = 15;

// ─── Strength meter ───────────────────────────────────────────────────────────
function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= MIN_LEN)           s++;
  if (pwd.length >= 10)                s++;
  if (/[A-Z]/.test(pwd))              s++;
  if (/[0-9!@#$%^&*]/.test(pwd))      s++;
  return Math.min(s, 4);
}
const STRENGTH_META = [
  { label: "",       color: "bg-base-300"  },
  { label: "Weak",   color: "bg-error"     },
  { label: "Fair",   color: "bg-warning"   },
  { label: "Good",   color: "bg-info"      },
  { label: "Strong", color: "bg-success"   },
];

// ─── Motion variants ──────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } },
};
const fieldItem = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 140, damping: 18 } },
};
const logoVariant = {
  hidden: { opacity: 0, scale: 0.5, rotate: -20 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 200, damping: 12 } },
};
const panelVariant = {
  hidden: { opacity: 0, scale: 0.88, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 18 } },
};

// ─── Component ────────────────────────────────────────────────────────────────
const ResetPasswordPage = () => {
  const { token } = useParams();

  const [formData, setFormData]         = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errors, setErrors]             = useState({});
  const [isLoading, setIsLoading]       = useState(false);

  // "done" = success | "invalid" = token rejected by server
  const [status, setStatus] = useState("idle");

  const shakeControls = useAnimation();
  const reduceMotion  = useReducedMotion();

  const strength = getStrength(formData.password);
  const meta     = STRENGTH_META[strength];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  const validate = () => {
    const next = {};
    if (!formData.password)
      next.password = "Password is required.";
    else if (formData.password.length < MIN_LEN || formData.password.length > MAX_LEN)
      next.password = `Password must be ${MIN_LEN}–${MAX_LEN} characters.`;

    if (!formData.confirmPassword)
      next.confirmPassword = "Please confirm your new password.";
    else if (formData.password !== formData.confirmPassword)
      next.confirmPassword = "Passwords do not match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { shakeForm(); return; }
    if (isLoading) return;

    setIsLoading(true);
    try {
      await axiosInstance.post(`/auth/reset-password/${token}`, {
        password:        formData.password,
        confirmPassword: formData.confirmPassword,
      });
      setStatus("done");
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Something went wrong. Please try again.";

      // Detect token-invalid / token-expired responses
      const isTokenError =
        err?.response?.status === 400 &&
        /invalid|expired|link/i.test(msg);

      if (isTokenError) {
        setStatus("invalid");
      } else {
        toast.error(msg);
        shakeForm();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Toggler button (consistent with LoginPage / RegisterPage) ─────────────
  const EyeToggle = ({ show, onToggle, label }) => (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label={label}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      className="rounded-full p-1 text-base-content/40 transition-colors hover:text-base-content"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={show ? "hide" : "show"}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.15 }}
          className="block"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: form ── */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-12">
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
          {/* Back link */}
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
                Create a new password
              </h1>
              <p className="text-sm text-base-content/60">
                Your new password must be {MIN_LEN}–{MAX_LEN} characters long.
              </p>
            </div>
          </motion.div>

          {/* ── States ── */}
          <AnimatePresence mode="wait">

            {/* SUCCESS */}
            {status === "done" && (
              <motion.div
                key="success"
                variants={panelVariant}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="rounded-2xl border border-success/30 bg-success/10 p-7 text-center shadow-xl"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                  className="mb-4 flex justify-center"
                >
                  <CheckCircle2 className="size-12 text-success" />
                </motion.div>
                <h2 className="mb-2 text-lg font-semibold">Password reset!</h2>
                <p className="mb-5 text-sm leading-relaxed text-base-content/70">
                  Your password has been updated successfully. You can now sign in with your new password.
                </p>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/login"
                    className="btn btn-primary h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/25"
                  >
                    Go to login
                    <ArrowRight className="size-4" />
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {/* INVALID / EXPIRED TOKEN */}
            {status === "invalid" && (
              <motion.div
                key="invalid"
                variants={panelVariant}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="rounded-2xl border border-error/30 bg-error/10 p-7 text-center shadow-xl"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                  className="mb-4 flex justify-center"
                >
                  <ShieldAlert className="size-12 text-error" />
                </motion.div>
                <h2 className="mb-2 text-lg font-semibold">Link invalid or expired</h2>
                <p className="mb-5 text-sm leading-relaxed text-base-content/70">
                  This password-reset link has expired or already been used. Reset links are valid for <strong>30 minutes</strong>.
                </p>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/forgot-password"
                    className="btn btn-primary h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/25"
                  >
                    Request a new link
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {/* FORM */}
            {status === "idle" && (
              <motion.div key="form" variants={fadeUp}>
                <motion.form
                  animate={shakeControls}
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-6 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
                >
                  {/* New password */}
                  <motion.div variants={fieldItem}>
                    <InputField
                      label="New password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      icon={<Lock className="size-5" />}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      rightIcon={
                        <EyeToggle
                          show={showPassword}
                          onToggle={() => setShowPassword((p) => !p)}
                          label={showPassword ? "Hide password" : "Show password"}
                        />
                      }
                    />

                    {/* Strength meter */}
                    <AnimatePresence initial={false}>
                      {formData.password && (
                        <motion.div
                          key="strength"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center gap-3 overflow-hidden"
                        >
                          <div className="flex flex-1 gap-1.5">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300">
                                <motion.div
                                  className={`h-full origin-left rounded-full ${meta.color}`}
                                  initial={false}
                                  animate={{ scaleX: i <= strength ? 1 : 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.04 }}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="h-4 w-12 overflow-hidden text-right">
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={meta.label}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -10, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="block text-xs leading-4 text-base-content/60"
                              >
                                {meta.label}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Confirm password */}
                  <motion.div variants={fieldItem}>
                    <InputField
                      label="Confirm new password"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      icon={<Lock className="size-5" />}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      error={errors.confirmPassword}
                      rightIcon={
                        <EyeToggle
                          show={showConfirm}
                          onToggle={() => setShowConfirm((p) => !p)}
                          label={showConfirm ? "Hide password" : "Show confirm password"}
                        />
                      }
                    />
                  </motion.div>

                  {/* Password requirements hint */}
                  <motion.p variants={fieldItem} className="text-xs text-base-content/50">
                    Password must be {MIN_LEN}–{MAX_LEN} characters. Use uppercase letters, numbers, or symbols to make it stronger.
                  </motion.p>

                  {/* Submit */}
                  <motion.div variants={fieldItem}>
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
                            Resetting…
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
                            Reset Password
                            <motion.span
                              animate={reduceMotion ? undefined : { x: [0, 4, 0] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                              className="flex"
                            >
                              <ArrowRight className="size-5" />
                            </motion.span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
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
        title="Secure reset"
        subtitle="Create a strong new password and get back to your conversations."
      />
    </div>
  );
};

export default ResetPasswordPage;
