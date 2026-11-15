import { memo, useCallback, useMemo, useState } from "react";
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
import { customToast } from "../../components/toast";
import {
  LazyMotion,
  m,
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

const loadFeatures = () =>
  import("../../lib/motionFeatures").then((mod) => mod.default);

const UPPER_RE = /[A-Z]/;
const NUM_SYM_RE = /[0-9!@#$%^&*]/;
const TOKEN_ERR_RE = /invalid|expired|link/i;

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= MIN_LEN) s++;
  if (pwd.length >= 10) s++;
  if (UPPER_RE.test(pwd)) s++;
  if (NUM_SYM_RE.test(pwd)) s++;
  return Math.min(s, 4);
}

const STRENGTH_META = [
  { label: "", color: "bg-base-300" },
  { label: "Weak", color: "bg-error" },
  { label: "Fair", color: "bg-warning" },
  { label: "Good", color: "bg-info" },
  { label: "Strong", color: "bg-success" },
];

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

const panelVariant = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const EyeToggle = memo(({ show, onToggle, label }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={label}
    aria-pressed={show}
    className="rounded-full p-1 text-base-content/40 outline-none transition hover:scale-110 hover:text-base-content active:scale-90 focus-visible:ring-2 focus-visible:ring-primary"
  >
    {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
  </button>
));
EyeToggle.displayName = "EyeToggle";

const StrengthMeter = memo(({ strength }) => {
  const meta = STRENGTH_META[strength];
  return (
    <div className="mt-2.5 flex items-center gap-3">
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
            <div
              className={`h-full origin-left rounded-full transition-transform duration-300 ${meta.color}`}
              style={{ transform: `scaleX(${i <= strength ? 1 : 0})` }}
            />
          </div>
        ))}
      </div>
      <span
        className="w-12 text-right text-xs text-base-content/60"
        aria-live="polite"
      >
        {meta.label}
      </span>
    </div>
  );
});
StrengthMeter.displayName = "StrengthMeter";

const Rules = memo(({ lengthOk, hasUpper, hasNumSym }) => {
  const rules = [
    { ok: lengthOk, text: `${MIN_LEN} to ${MAX_LEN} characters` },
    { ok: hasUpper, text: "An uppercase letter" },
    { ok: hasNumSym, text: "A number or symbol" },
  ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
      {rules.map(({ ok, text }) => (
        <li
          key={text}
          className={`flex items-center gap-1 transition-colors ${ok ? "text-success" : ""}`}
        >
          <Check
            className={`size-3.5 transition-opacity ${ok ? "opacity-100" : "opacity-30"}`}
          />
          {text}
        </li>
      ))}
    </ul>
  );
});
Rules.displayName = "Rules";

const ResultPanel = memo(
  ({ tone, icon: Icon, title, children, actionTo, actionLabel, showArrow }) => {
    const success = tone === "success";
    return (
      <m.div
        variants={panelVariant}
        initial="hidden"
        animate="show"
        exit="hidden"
        role={success ? "status" : "alert"}
        className={`rounded-2xl border p-7 text-center shadow-xl ${
          success
            ? "border-success/30 bg-success/10"
            : "border-error/30 bg-error/10"
        }`}
      >
        <div className="mb-4 flex justify-center">
          <Icon
            className={`size-12 ${success ? "text-success" : "text-error"}`}
          />
        </div>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-base-content/70">
          {children}
        </p>
        <Link
          to={actionTo}
          className="btn btn-primary h-11 w-full rounded-xl text-sm shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          {actionLabel}
          {showArrow && <ArrowRight className="size-4" />}
        </Link>
      </m.div>
    );
  },
);
ResultPanel.displayName = "ResultPanel";

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

  const { strength, lengthOk, hasUpper, hasNumSym } = useMemo(
    () => ({
      strength: password ? Math.max(getStrength(password), 1) : 0,
      lengthOk: password.length >= MIN_LEN && password.length <= MAX_LEN,
      hasUpper: UPPER_RE.test(password),
      hasNumSym: NUM_SYM_RE.test(password),
    }),
    [password],
  );

  const matchOk = confirmPassword.length > 0 && password === confirmPassword;

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }, []);

  const togglePassword = useCallback(() => setShowPassword((p) => !p), []);
  const toggleConfirm = useCallback(() => setShowConfirm((p) => !p), []);

  const shakeForm = useCallback(() => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });
  }, [reduceMotion, shakeControls]);

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

      if (err?.response?.status === 400 && TOKEN_ERR_RE.test(msg)) {
        setStatus("invalid");
      } else {
        customToast.error(msg);
        shakeForm();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LazyMotion features={loadFeatures} strict>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex flex-col items-center justify-center overflow-hidden p-5 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-secondary/10 blur-3xl"
          />

          <m.div
            className="relative w-full max-w-md space-y-7"
            variants={fadeIn}
            initial="hidden"
            animate="show"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-1.5 rounded text-sm text-base-content/60 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to login
            </Link>

            <header className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-sm ring-1 ring-base-300">
                  <ChattyLogo className="size-9" />
                </div>

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
            </header>

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
                <m.form
                  key="form"
                  animate={shakeControls}
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={isLoading}
                  className="space-y-5 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-xl shadow-base-content/5 sm:p-8"
                >
                  <div>
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
                          onToggle={togglePassword}
                          label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        />
                      }
                    />

                    {password && <StrengthMeter strength={strength} />}

                    <Rules
                      lengthOk={lengthOk}
                      hasUpper={hasUpper}
                      hasNumSym={hasNumSym}
                    />
                  </div>

                  <div>
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
                          onToggle={toggleConfirm}
                          label={
                            showConfirm
                              ? "Hide confirmed password"
                              : "Show confirmed password"
                          }
                        />
                      }
                    />

                    {matchOk && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
                        <Check className="size-3.5" />
                        Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 active:scale-95"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-5 animate-spin" />
                        Updating password...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Update password
                        <ArrowRight className="size-5" />
                      </span>
                    )}
                  </button>
                </m.form>
              )}
            </AnimatePresence>
          </m.div>
        </div>

        <AuthImagePatter
          title="Secure reset"
          subtitle="Create a strong new password and get back to your conversations."
        />
      </div>
    </LazyMotion>
  );
};

export default ResetPasswordPage;
