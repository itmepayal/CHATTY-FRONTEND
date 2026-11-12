import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useReducedMotion,
} from "framer-motion";

import { useAuthStore } from "../../store/useAuthStore";
import AuthImagePatter from "../../components/AuthImagePatter";
import InputField from "../../components/BaseForm/InputField";
import { ChattyLogo } from "../../components/common/ChattyLogo";
import { TwoFactorLoginModal } from "../../components/security/TwoFactorModal";

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
};

const fieldItem = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 140, damping: 18 },
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

const LoginPage = () => {
  const { login, isLoggingIn, twoFactorChallenge, clearTwoFactorChallenge } =
    useAuthStore();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePasswordKey = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"));
    }
  };

  const validateForm = () => {
    const { email, password } = formData;
    const next = {};

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";

    if (!password.trim()) next.password = "Password is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      shakeForm();
      return;
    }

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });
    } catch (error) {
      console.error(error);
      shakeForm();
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {twoFactorChallenge && (
        <TwoFactorLoginModal onClose={clearTwoFactorChallenge} />
      )}

      <div className="relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-12">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }
          }
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-secondary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative w-full max-w-md space-y-7 sm:space-y-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="text-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                variants={logoVariant}
                whileHover={
                  reduceMotion ? undefined : { rotate: -6, scale: 1.08 }
                }
                whileTap={{ scale: 0.95 }}
                className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-lg shadow-primary/15 ring-1 ring-base-300"
              >
                <ChattyLogo className="size-9" />
              </motion.div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-[2rem]">
                Welcome back
              </h1>
              <p className="max-w-xs text-sm leading-relaxed text-base-content/60 sm:text-base">
                Sign in to continue your conversations.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.form
              animate={shakeControls}
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isLoggingIn}
              className="relative space-y-5 overflow-hidden rounded-2xl border border-base-300 bg-base-100/85 p-6 shadow-2xl shadow-primary/10 ring-1 ring-base-content/5 backdrop-blur sm:p-8"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"
              />

              <motion.div variants={fieldItem}>
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  icon={<Mail className="size-5" />}
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                />
              </motion.div>

              <motion.div variants={fieldItem}>
                <div onKeyUp={handlePasswordKey} onKeyDown={handlePasswordKey}>
                  <InputField
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    icon={<Lock className="size-5" />}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    rightIcon={
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        className={`rounded-full p-1 text-base-content/40 transition-colors hover:text-base-content ${FOCUS}`}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={showPassword ? "hide" : "show"}
                            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {showPassword ? (
                              <EyeOff className="size-5" />
                            ) : (
                              <Eye className="size-5" />
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </motion.button>
                    }
                  />
                </div>

                <AnimatePresence initial={false}>
                  {capsOn && (
                    <motion.p
                      key="caps"
                      role="status"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-1.5 overflow-hidden pt-1.5 text-xs font-medium text-warning"
                    >
                      <AlertCircle className="size-3.5 shrink-0" />
                      Caps Lock is on
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={fieldItem} className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className={`rounded-sm text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline ${FOCUS}`}
                >
                  Forgot password?
                </Link>
              </motion.div>

              <motion.div variants={fieldItem}>
                <motion.button
                  type="submit"
                  className="btn btn-primary group h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25"
                  disabled={isLoggingIn}
                  whileHover={
                    isLoggingIn || reduceMotion
                      ? undefined
                      : { scale: 1.02, y: -1 }
                  }
                  whileTap={isLoggingIn ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isLoggingIn ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-5 animate-spin" />
                        Signing in…
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
                        Sign In
                        <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <motion.p
                variants={fieldItem}
                className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-base-content/50"
              >
                <ShieldCheck className="size-3.5 text-success" />
                Secure sign-in with two-factor support
              </motion.p>
            </motion.form>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-center text-sm text-base-content/60"
          >
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className={`link link-primary rounded-sm font-medium ${FOCUS}`}
            >
              Sign Up
            </Link>
          </motion.p>
        </motion.div>
      </div>

      <AuthImagePatter
        title="Welcome back!"
        subtitle="Sign in to continue your conversations and catch up with your friends."
      />
    </div>
  );
};

export default LoginPage;
