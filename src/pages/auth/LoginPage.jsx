import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
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
  const { login, isLoggingIn, twoFactorChallenge, clearTwoFactorChallenge } = useAuthStore();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

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

  const validateForm = () => {
    const { email, password } = formData;
    const next = {};

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";

    if (!password.trim()) next.password = "Password is required.";
    else if (password.length < 4 || password.length > 12)
      next.password = "Password must be 4 to 12 characters.";

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
      {/* 2FA challenge modal — rendered whenever the server requests a second factor */}
      {twoFactorChallenge && (
        <TwoFactorLoginModal onClose={clearTwoFactorChallenge} />
      )}

      {/* Left: Form */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* Animated background glows */}
        <motion.div
          className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }
          }
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-secondary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative w-full max-w-md space-y-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
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
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <ChattyLogo className="size-9" />
                </motion.div>
              </motion.div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-base-content/60">
                Sign in to continue your conversations.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.form
              animate={shakeControls}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-6 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
            >
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
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      className="rounded-full p-1 text-base-content/40 transition-colors hover:text-base-content"
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
              </motion.div>

              <motion.div variants={fieldItem} className="flex justify-end">
                <motion.span
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="inline-block"
                >
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:underline"
                  >
                    Forgot password?
                  </Link>
                </motion.span>
              </motion.div>

              <motion.div variants={fieldItem}>
                <motion.button
                  type="submit"
                  className="btn btn-primary h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25"
                  disabled={isLoggingIn}
                  whileHover={isLoggingIn ? undefined : { scale: 1.02, y: -1 }}
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
                        Signing in...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="group flex items-center gap-2"
                      >
                        Sign In
                        <motion.span
                          animate={reduceMotion ? undefined : { x: [0, 4, 0] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
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

          <motion.p
            variants={fadeUp}
            className="text-center text-base-content/60 text-sm"
          >
            Don&apos;t have an account?{" "}
            <motion.span
              className="inline-block"
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link to="/register" className="link link-primary font-medium">
                Sign Up
              </Link>
            </motion.span>
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