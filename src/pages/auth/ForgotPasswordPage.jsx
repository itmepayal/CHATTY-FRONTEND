import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
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
  LazyMotion,
  domAnimation,
  m,
  useAnimation,
  useReducedMotion,
} from "framer-motion";

import { axiosInstance } from "../../lib/axios";
import { ChattyLogo } from "../../components/common/ChattyLogo";
import InputField from "../../components/BaseForm/InputField";

const AuthImagePatter = lazy(() => import("../../components/AuthImagePatter"));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30;

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

const requestReset = async (email) => {
  try {
    await axiosInstance.post("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });
    return true;
  } catch (err) {
    toast.error(
      err?.response?.data?.message ??
        "Couldn't send the reset link. Please try again.",
    );
    return false;
  }
};

const RequestForm = ({ initialEmail, onSent }) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const value = email.trim();
    if (!value || !EMAIL_RE.test(value)) {
      setError(
        value ? "Enter a valid email address." : "Enter your email address.",
      );
      shakeForm();
      return;
    }

    setError("");
    setIsLoading(true);
    const ok = await requestReset(value);
    setIsLoading(false);

    if (ok) onSent(value);
    else shakeForm();
  };

  return (
    <m.form
      animate={shakeControls}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isLoading}
      className="space-y-5 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-lg sm:p-8"
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
          if (error) setError("");
        }}
        error={error}
        hint="We'll send the reset link to this address."
      />

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary h-12 w-full rounded-xl text-base shadow-md transition-transform duration-150 motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" />
            Sending link...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Send reset link
            <SendHorizonal className="size-4" />
          </span>
        )}
      </button>
    </m.form>
  );
};

const ResendButton = ({ email }) => {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (isLoading || cooldown > 0) return;
    setIsLoading(true);
    const ok = await requestReset(email);
    setIsLoading(false);
    if (ok) {
      toast.success("Reset link sent again.");
      setCooldown(RESEND_COOLDOWN);
    }
  };

  return (
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
  );
};

const SuccessPanel = ({ email, onUseDifferentEmail }) => (
  <m.div
    initial={{ opacity: 0, scale: 0.96, y: 12 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    role="status"
    className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center shadow-lg sm:p-7"
  >
    <div className="mb-4 flex justify-center">
      <MailCheck className="size-12 text-success" />
    </div>

    <h1 className="mb-2 text-xl font-semibold">Check your inbox</h1>
    <p className="text-sm leading-relaxed text-base-content/70">
      If an account exists for{" "}
      <span className="break-all font-medium text-base-content">{email}</span>,
      a reset link is on its way. It should arrive within a few minutes.
    </p>

    <div className="mt-6 space-y-2">
      <ResendButton email={email} />
      <button
        type="button"
        onClick={onUseDifferentEmail}
        className="btn btn-ghost h-10 w-full rounded-xl text-sm"
      >
        Use a different email
      </button>
    </div>

    <p className="mt-4 text-xs text-base-content/50">
      Nothing there? Check your spam folder.
    </p>
  </m.div>
);

const ForgotPasswordPage = () => {
  const [sentTo, setSentTo] = useState(null);
  const [prefill, setPrefill] = useState("");
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

  const handleUseDifferentEmail = () => {
    setPrefill(sentTo ?? "");
    setSentTo(null);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex flex-col items-center justify-center overflow-hidden p-5 sm:p-12">
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
            className="relative w-full max-w-md space-y-7"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 rounded text-sm text-base-content/60 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to login
            </Link>

            <header className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-sm ring-1 ring-base-300 transition-transform duration-200 motion-safe:hover:-rotate-6 motion-safe:hover:scale-105">
                <ChattyLogo className="size-9" />
              </div>

              {!sentTo && (
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
            </header>

            {sentTo ? (
              <SuccessPanel
                email={sentTo}
                onUseDifferentEmail={handleUseDifferentEmail}
              />
            ) : (
              <RequestForm initialEmail={prefill} onSent={setSentTo} />
            )}
          </m.div>
        </div>

        {isDesktop && (
          <Suspense fallback={<div className="bg-base-200" />}>
            <AuthImagePatter
              title="No worries"
              subtitle="We'll send you instructions to reset your password safely."
            />
          </Suspense>
        )}
      </div>
    </LazyMotion>
  );
};

export default ForgotPasswordPage;
