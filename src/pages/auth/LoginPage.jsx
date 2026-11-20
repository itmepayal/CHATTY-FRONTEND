import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { customToast } from "../../components/toast";
import {
  LazyMotion,
  domAnimation,
  m,
  useAnimation,
  useReducedMotion,
} from "framer-motion";

import { useAuthStore } from "../../store/useAuthStore";
import InputField from "../../components/BaseForm/InputField";
import { ChattyLogo } from "../../components/common/ChattyLogo";

const AuthImagePatter = lazy(() => import("../../components/AuthImagePatter"));
const TwoFactorLoginModal = lazy(() =>
  import("../../components/security/TwoFactorModal").then((mod) => ({
    default: mod.TwoFactorLoginModal,
  })),
);

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const glow = (token) => ({
  background: `radial-gradient(closest-side, color-mix(in oklab, var(${token}) 16%, transparent), transparent)`,
});

const DESKTOP_QUERY = "(min-width: 1024px)";
const subscribeDesktop = (cb) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );

const TwoFactorGate = () => {
  const challenge = useAuthStore((s) => s.twoFactorChallenge);
  const clear = useAuthStore((s) => s.clearTwoFactorChallenge);
  if (!challenge) return null;
  return (
    <Suspense fallback={null}>
      <TwoFactorLoginModal onClose={clear} />
    </Suspense>
  );
};

const LoginForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);

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
      transition: { duration: 0.4, ease: "easeInOut" },
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
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";

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
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/chat";
      navigate(safeRedirect, { replace: true });
    } catch (error) {
      console.error(error);
      shakeForm();
      customToast.error("Login failed. Please try again.");
    }
  };

  return (
    <m.form
      animate={shakeControls}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isLoggingIn}
      className="relative space-y-5 overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-6 shadow-lg sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"
      />

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

      <div>
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
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className={`rounded-full p-1 text-base-content/40 transition-colors hover:text-base-content ${FOCUS}`}
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            }
          />
        </div>

        <div role="status" className="h-6 pt-1.5">
          {capsOn && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <AlertCircle className="size-3.5 shrink-0" />
              Caps Lock is on
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className={`rounded-sm text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline ${FOCUS}`}
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        className="btn btn-primary group h-12 w-full rounded-xl text-base shadow-md transition-transform duration-150 motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
      >
        {isLoggingIn ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" />
            Signing in…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Sign In
            <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-base-content/50">
        <ShieldCheck className="size-3.5 text-success" />
        Secure sign-in with two-factor support
      </p>
    </m.form>
  );
};

const LoginPage = () => {
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <TwoFactorGate />

        <div className="relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 -top-32 size-96"
            style={glow("--color-primary")}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-32 size-96"
            style={glow("--color-secondary")}
          />

          <m.div
            className="relative w-full max-w-md space-y-7 sm:space-y-8"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-md ring-1 ring-base-300 transition-transform duration-200 motion-safe:hover:-rotate-6 motion-safe:hover:scale-105">
                <ChattyLogo className="size-9" />
              </div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-[2rem]">
                Welcome back
              </h1>
              <p className="max-w-xs text-sm leading-relaxed text-base-content/60 sm:text-base">
                Sign in to continue your conversations.
              </p>
            </div>

            <LoginForm />

            <p className="text-center text-sm text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link
                to={
                  redirect
                    ? `/register?redirect=${encodeURIComponent(redirect)}`
                    : "/register"
                }
                className={`link link-primary rounded-sm font-medium ${FOCUS}`}
              >
                Sign Up
              </Link>
            </p>
          </m.div>
        </div>

        {isDesktop && (
          <Suspense fallback={<div className="bg-base-200" />}>
            <AuthImagePatter
              title="Welcome back!"
              subtitle="Sign in to continue your conversations and catch up with your friends."
            />
          </Suspense>
        )}
      </div>
    </LazyMotion>
  );
};

export default LoginPage;
