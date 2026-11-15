import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  X,
  ArrowRight,
  Check,
  AtSign,
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
import BaseInputField from "../../components/BaseForm/InputField";
import { ChattyLogo } from "../../components/common/ChattyLogo";

const AuthImagePatter = lazy(() => import("../../components/AuthImagePatter"));

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;
const PASSWORD_MIN = 4;
const PASSWORD_MAX = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100";

const InputField = memo(BaseInputField);
const USER_ICON = <User className="size-5" />;
const AT_ICON = <AtSign className="size-5" />;
const MAIL_ICON = <Mail className="size-5" />;
const LOCK_ICON = <Lock className="size-5" />;

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

const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 4) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const STRENGTH_META = [
  { label: "", color: "bg-base-300" },
  { label: "Weak", color: "bg-error" },
  { label: "Okay", color: "bg-warning" },
  { label: "Good", color: "bg-info" },
  { label: "Strong", color: "bg-success" },
];

const PasswordStrength = memo(({ password }) => {
  const active = Math.max(getStrength(password), 1);
  const meta = STRENGTH_META[active];

  const rules = [
    {
      ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
      text: `${PASSWORD_MIN} to ${PASSWORD_MAX} characters`,
    },
    {
      ok: /[A-Z]/.test(password) && /[a-z]/.test(password),
      text: "Upper and lowercase",
    },
    {
      ok: /\d/.test(password) && /[^A-Za-z0-9]/.test(password),
      text: "Number and symbol",
    },
  ];

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-3">
        <div
          className="flex flex-1 gap-1.5"
          role="meter"
          aria-label="Password strength"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={active}
          aria-valuetext={meta.label}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-300"
            >
              <div
                className={`h-full origin-left rounded-full transition-transform duration-300 ${meta.color}`}
                style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
              />
            </div>
          ))}
        </div>
        <span
          className="w-12 text-right text-xs leading-4 text-base-content/60"
          aria-live="polite"
        >
          {meta.label}
        </span>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
        {rules.map(({ ok, text }) => (
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
    </div>
  );
});

const AvatarPicker = memo(({ file, onFile }) => {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const processFile = (f) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      customToast.error("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      customToast.error(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    onFile(f);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          processFile(e.dataTransfer.files[0]);
        }}
        className="relative"
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={preview ? "Change profile photo" : "Upload profile photo"}
          className={`group/avatar relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 motion-safe:hover:scale-105 motion-safe:active:scale-95 ${FOCUS} ${
            dragging ? "scale-110" : ""
          } ${
            preview
              ? "border-transparent"
              : dragging
                ? "border-dashed border-primary bg-primary/10"
                : "border-dashed border-base-300 bg-base-200 hover:border-primary"
          }`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Your profile photo preview"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <User className="size-10 text-base-content/30" />
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
            <Camera className="size-6 text-white" />
          </span>
        </button>

        {preview && (
          <button
            type="button"
            onClick={() => onFile(null)}
            aria-label="Remove profile photo"
            className={`absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-error text-error-content shadow-md transition-transform motion-safe:hover:scale-110 motion-safe:active:scale-90 ${FOCUS}`}
          >
            <X className="size-4" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
          tabIndex={-1}
        />
      </div>

      <p className="text-xs text-base-content/50">
        {dragging
          ? "Drop your photo here"
          : `JPG, PNG or WEBP, up to ${MAX_SIZE_MB} MB.`}
      </p>
    </div>
  );
});

const RegisterForm = () => {
  const register = useAuthStore((s) => s.register);
  const isSigninUp = useAuthStore((s) => s.isSigninUp);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();

  const shakeForm = () => {
    if (reduceMotion) return;
    shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });
  };

  const handleChange = useCallback((e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "username") value = value.toLowerCase().replace(/\s/g, "");

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }, []);

  const clearForm = () => {
    setFormData({ fullName: "", username: "", email: "", password: "" });
    setAvatar(null);
    setErrors({});
  };

  const validateForm = () => {
    const { fullName, username, email, password } = formData;
    const next = {};

    if (!fullName.trim()) next.fullName = "Enter your full name.";

    if (!username.trim()) next.username = "Choose a username.";
    else if (!USERNAME_RE.test(username))
      next.username = "3 to 20 characters: letters, numbers, _ or . only.";

    if (!email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";

    if (!password.trim()) next.password = "Enter a password.";
    else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      next.password = `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSigninUp) return;
    if (!validateForm()) {
      shakeForm();
      return;
    }

    try {
      const form = new FormData();
      Object.entries({ ...formData, avatar }).forEach(([key, value]) => {
        if (value) form.append(key, value);
      });
      await register(form);
      clearForm();
    } catch (error) {
      console.error(error);
      shakeForm();
      customToast.error(
        error?.response?.data?.message ||
          "Couldn't create your account. Check your details and try again.",
      );
    }
  };

  return (
    <m.form
      animate={shakeControls}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSigninUp}
      className="space-y-5 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-lg sm:p-8"
    >
      <AvatarPicker file={avatar} onFile={setAvatar} />

      <InputField
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        icon={USER_ICON}
        placeholder="John Doe"
        value={formData.fullName}
        onChange={handleChange}
        error={errors.fullName}
      />

      <InputField
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        icon={AT_ICON}
        placeholder="john_doe"
        maxLength={20}
        value={formData.username}
        onChange={handleChange}
        error={errors.username}
      />

      <InputField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        icon={MAIL_ICON}
        placeholder="john.doe@example.com"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
      />

      <div>
        <InputField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          icon={LOCK_ICON}
          placeholder="••••••••"
          maxLength={PASSWORD_MAX}
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

        {formData.password && <PasswordStrength password={formData.password} />}
      </div>

      <button
        type="submit"
        disabled={isSigninUp}
        className="btn btn-primary h-12 w-full rounded-xl text-base shadow-md transition-transform duration-150 motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
      >
        {isSigninUp ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" />
            Creating account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Create account
            <ArrowRight className="size-5" />
          </span>
        )}
      </button>
    </m.form>
  );
};

const RegisterPage = () => {
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

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
            <header className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 shadow-sm ring-1 ring-base-300 transition-transform duration-200 motion-safe:hover:-rotate-6 motion-safe:hover:scale-105">
                <ChattyLogo className="size-9" />
              </div>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Create your account
              </h1>
              <p className="text-base-content/60">
                Join Chatty and start talking. It's free.
              </p>
            </header>

            <RegisterForm />

            <p className="text-center text-sm text-base-content/60">
              Already have an account?{" "}
              <Link
                to="/login"
                className="link link-primary font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Sign in
              </Link>
            </p>
          </m.div>
        </div>

        {isDesktop && (
          <Suspense fallback={<div className="bg-base-200" />}>
            <AuthImagePatter
              title="Join our community"
              subtitle="Connect, collaborate, and grow with like-minded professionals worldwide."
            />
          </Suspense>
        )}
      </div>
    </LazyMotion>
  );
};

export default RegisterPage;
