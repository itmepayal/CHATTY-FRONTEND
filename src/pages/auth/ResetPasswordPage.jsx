import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Check,
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

const MIN_LEN = 6;
const MAX_LEN = 15;

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= MIN_LEN) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9!@#$%^&*]/.test(pwd)) s++;
  return Math.min(s, 4);
}

const STRENGTH_META = [
  { label: "", color: "bg-base-300" },
  { label: "Weak", color: "bg-error" },
  { label: "Fair", color: "bg-warning" },
  { label: "Good", color: "bg-info" },
  { label: "Strong", color: "bg-success" },
];

const spring = { type: "spring", stiffness: 140, damping: 18 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: spring },
};
const formCard = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...spring, staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const fieldItem = {
  hidden: { opacity: 0, y: 10 },
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

const EyeToggle = ({ show, onToggle, label }) => (
  <motion.button
    type="button"
    onClick={onToggle}
    aria-label={label}
    aria-pressed={show}
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.85 }}
    className="rounded-full p-1 text-base-content/40 outline-none transition-colors hover:text-base-content focus-visible:ring-2 focus-visible:ring-primary"
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

const ResultPanel = ({
  tone,
  icon: Icon,
  title,
  children,
  actionTo,
  actionLabel,
  showArrow,
}) => {
  const styles =
    tone === "success"
      ? "border-success/30 bg-success/10"
      : "border-error/30 bg-error/10";
  const iconColor = tone === "success" ? "text-success" : "text-error";

  return (
    <motion.div
      variants={panelVariant}
      initial="hidden"
      animate="show"
      exit="hidden"
      role={tone === "success" ? "status" : "alert"}
      className={`rounded-2xl border p-7 text-center shadow-xl ${styles}`}
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
        <Icon className={`size-12 ${iconColor}`} />
      </motion.div>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-5 text-sm leading-relaxed text-base-content/70">
        {children}
      </p>
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
        <Link
          to={actionTo}
          className="btn btn-primary h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/25"
        >
          {actionLabel}
          {showArrow && <ArrowRight className="size-4" />}
        </Link>
      </motion.div>
    </motion.div>
  );
};

const ResetPasswordPage = () => {
  const { token } = useParams();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [status, setStatus] = useState("idle");

  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();

  const { password, confirmPassword } = formData;
  const rawStrength = getStrength(password);
  const strength = password ? Math.max(rawStrength, 1) : 0;
  const meta = STRENGTH_META[strength];

  const lengthOk = password.length >= MIN_LEN && password.length <= MAX_LEN;
  const matchOk = confirmPassword.length > 0 && password === confirmPassword;

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
    if (!password) next.password = "Enter a new password.";
    else if (!lengthOk)
      next.password = `Use ${MIN_LEN} to ${MAX_LEN} characters.`;

    if (!confirmPassword) next.confirmPassword = "Confirm your new password.";
    else if (password !== confirmPassword)
      next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) {
      shakeForm();
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });
      setStatus("done");
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        "Couldn't reset your password. Please try again.";

      const isTokenError =
        err?.response?.status === 400 && /invalid|expired|link/i.test(msg);

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
          {/* Back link */}
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

              {status === "idle" && (
                <>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight">
                    Create a new password
                  </h1>
                  <p className="text-sm text-base-content/60">
                    Choose a password you haven't used before.
                  </p>
                </>
              )}
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            {status === "done" && (
              <ResultPanel
                key="success"
                tone="success"
                icon={CheckCircle2}
                title="Password updated"
                actionTo="/login"
                actionLabel="Go to login"
                showArrow
              >
                You can now sign in with your new password.
              </ResultPanel>
            )}

            {status === "invalid" && (
              <ResultPanel
                key="invalid"
                tone="error"
                icon={ShieldAlert}
                title="This link has expired"
                actionTo="/forgot-password"
                actionLabel="Request a new link"
              >
                Reset links work once and expire after{" "}
                <strong>30 minutes</strong>. Request a new one to continue.
              </ResultPanel>
            )}

            {status === "idle" && (
              <motion.div key="form" variants={formCard}>
                <motion.form
                  animate={shakeControls}
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={isLoading}
                  className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-5 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
                >
                  <motion.div variants={fieldItem}>
                    <InputField
                      label="New password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      icon={<Lock className="size-5" />}
                      placeholder="••••••••"
                      maxLength={MAX_LEN}
                      value={password}
                      onChange={handleChange}
                      error={errors.password}
                      rightIcon={
                        <EyeToggle
                          show={showPassword}
                          onToggle={() => setShowPassword((p) => !p)}
                          label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        />
                      }
                    />

                    <AnimatePresence initial={false}>
                      {password && (
                        <motion.div
                          key="strength"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                            marginTop: 10,
                          }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex flex-1 gap-1.5"
                              role="meter"
                              aria-label="Password strength"
                              aria-valuemin={0}
                              aria-valuemax={4}
                              aria-valuenow={strength}
                              aria-valuetext={meta.label}
                            >
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300"
                                >
                                  <motion.div
                                    className={`h-full origin-left rounded-full ${meta.color}`}
                                    initial={false}
                                    animate={{ scaleX: i <= strength ? 1 : 0 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 25,
                                      delay: i * 0.04,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div
                              className="h-4 w-12 overflow-hidden text-right"
                              aria-live="polite"
                            >
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
                      {[
                        {
                          ok: lengthOk,
                          text: `${MIN_LEN} to ${MAX_LEN} characters`,
                        },
                        {
                          ok: /[A-Z]/.test(password),
                          text: "An uppercase letter",
                        },
                        {
                          ok: /[0-9!@#$%^&*]/.test(password),
                          text: "A number or symbol",
                        },
                      ].map(({ ok, text }) => (
                        <li
                          key={text}
                          className={`flex items-center gap-1 transition-colors ${
                            ok ? "text-success" : ""
                          }`}
                        >
                          <Check
                            className={`size-3.5 transition-opacity ${
                              ok ? "opacity-100" : "opacity-30"
                            }`}
                          />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div variants={fieldItem}>
                    <InputField
                      label="Confirm new password"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      icon={<Lock className="size-5" />}
                      placeholder="••••••••"
                      maxLength={MAX_LEN}
                      value={confirmPassword}
                      onChange={handleChange}
                      error={errors.confirmPassword}
                      rightIcon={
                        <EyeToggle
                          show={showConfirm}
                          onToggle={() => setShowConfirm((p) => !p)}
                          label={
                            showConfirm
                              ? "Hide confirmed password"
                              : "Show confirmed password"
                          }
                        />
                      }
                    />

                    <AnimatePresence initial={false}>
                      {matchOk && (
                        <motion.p
                          key="match"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 6 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-1 overflow-hidden text-xs text-success"
                        >
                          <Check className="size-3.5" />
                          Passwords match
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={fieldItem}>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={
                        isLoading ? undefined : { scale: 1.02, y: -1 }
                      }
                      whileTap={isLoading ? undefined : { scale: 0.97 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
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
                            Updating password...
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
                            Update password
                            <ArrowRight className="size-5" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AuthImagePatter
        title="Secure reset"
        subtitle="Create a strong new password and get back to your conversations."
      />
    </div>
  );
};

export default ResetPasswordPage;
