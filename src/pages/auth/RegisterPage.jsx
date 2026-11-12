import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import {
  motion,
  AnimatePresence,
  useAnimate,
  useReducedMotion,
} from "framer-motion";

import { useAuthStore } from "../../store/useAuthStore";
import AuthImagePatter from "../../components/AuthImagePatter";
import InputField from "../../components/BaseForm/InputField";
import { ChattyLogo } from "../../components/common/ChattyLogo";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;
const PASSWORD_MIN = 4;
const PASSWORD_MAX = 12;

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
    transition: {
      ...spring,
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
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

const RegisterPage = () => {
  const { register, isSigninUp } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    avatar: null,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const reduceMotion = useReducedMotion();
  const [shakeScope, animate] = useAnimate();

  const shakeForm = () => {
    if (reduceMotion || !shakeScope.current) return;
    animate(
      shakeScope.current,
      { x: [0, -10, 10, -8, 8, -4, 4, 0] },
      { duration: 0.45, ease: "easeInOut" },
    );
  };

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const processFile = (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setFormData((prev) => ({ ...prev, avatar: file }));
    setFilePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFormData((prev) => ({ ...prev, avatar: null }));
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearForm = () => {
    setFormData({ fullName: "", email: "", password: "", avatar: null });
    setErrors({});
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const { fullName, email, password } = formData;
    const next = {};

    if (!fullName.trim()) next.fullName = "Enter your full name.";
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
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
      Object.entries(formData).forEach(([key, value]) => {
        if (value) form.append(key, value);
      });
      await register(form);
      clearForm();
    } catch (error) {
      console.error(error);
      shakeForm();
      toast.error(
        "Couldn't create your account. Check your details and try again.",
      );
    }
  };

  const strength = getStrength(formData.password);
  const meta = STRENGTH_META[formData.password ? Math.max(strength, 1) : 0];
  const activeStrength = formData.password ? Math.max(strength, 1) : 0;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col items-center justify-center overflow-hidden p-5 sm:p-12">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-secondary/10 blur-3xl"
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

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Create your account
              </h1>
              <p className="text-base-content/60">
                Join Chatty and start talking. It's free.
              </p>
            </div>
          </motion.header>

          <motion.div variants={formCard}>
            <form
              ref={shakeScope}
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSigninUp}
              className="space-y-5 rounded-2xl border border-base-300 bg-base-100/80 p-5 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8"
            >
              {/* Avatar uploader */}
              <motion.div
                variants={fieldItem}
                className="flex flex-col items-center gap-2"
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className="relative"
                >
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={
                      filePreview
                        ? "Change profile photo"
                        : "Upload profile photo"
                    }
                    animate={{ scale: dragging ? 1.1 : 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className={`group/avatar relative flex size-24 items-center justify-center overflow-hidden rounded-full border-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 ${
                      filePreview
                        ? "border-transparent"
                        : dragging
                          ? "border-dashed border-primary bg-primary/10"
                          : "border-dashed border-base-300 bg-base-200 hover:border-primary"
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {filePreview ? (
                        <motion.img
                          key={filePreview}
                          src={filePreview}
                          alt="Your profile photo preview"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                          }}
                          className="size-full object-cover"
                        />
                      ) : (
                        <motion.span
                          key="placeholder"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="flex"
                        >
                          <User className="size-10 text-base-content/30" />
                        </motion.span>
                      )}
                    </AnimatePresence>

                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
                      <Camera className="size-6 text-white" />
                    </span>
                  </motion.button>

                  <AnimatePresence>
                    {filePreview && (
                      <motion.button
                        key="remove"
                        type="button"
                        onClick={clearFile}
                        aria-label="Remove profile photo"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 16,
                        }}
                        className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-error text-error-content shadow-md outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
                      >
                        <X className="size-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    tabIndex={-1}
                  />
                </div>

                <p className="text-xs text-base-content/50">
                  {dragging
                    ? "Drop your photo here"
                    : `JPG, PNG or WEBP, up to ${MAX_SIZE_MB} MB.`}
                </p>
              </motion.div>

              <motion.div variants={fieldItem}>
                <InputField
                  label="Full name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  icon={<User className="size-5" />}
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                />
              </motion.div>

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
                  autoComplete="new-password"
                  icon={<Lock className="size-5" />}
                  placeholder="••••••••"
                  maxLength={PASSWORD_MAX}
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
                      className="rounded-full p-1 text-base-content/40 outline-none transition-colors hover:text-base-content focus-visible:ring-2 focus-visible:ring-primary"
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

                <AnimatePresence initial={false}>
                  {formData.password && (
                    <motion.div
                      key="strength"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 10 }}
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
                          aria-valuenow={activeStrength}
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
                                animate={{
                                  scaleX: i <= activeStrength ? 1 : 0,
                                }}
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

                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
                        {[
                          {
                            ok:
                              formData.password.length >= PASSWORD_MIN &&
                              formData.password.length <= PASSWORD_MAX,
                            text: `${PASSWORD_MIN} to ${PASSWORD_MAX} characters`,
                          },
                          {
                            ok:
                              /[A-Z]/.test(formData.password) &&
                              /[a-z]/.test(formData.password),
                            text: "Upper and lowercase",
                          },
                          {
                            ok:
                              /\d/.test(formData.password) &&
                              /[^A-Za-z0-9]/.test(formData.password),
                            text: "Number and symbol",
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
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={fieldItem}>
                <motion.button
                  type="submit"
                  className="btn btn-primary h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25"
                  disabled={isSigninUp}
                  whileHover={isSigninUp ? undefined : { scale: 1.02, y: -1 }}
                  whileTap={isSigninUp ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isSigninUp ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-5 animate-spin" />
                        Creating account...
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
                        Create account
                        <ArrowRight className="size-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </form>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-center text-sm text-base-content/60"
          >
            Already have an account?{" "}
            <Link
              to="/login"
              className="link link-primary font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>

      <AuthImagePatter
        title="Join our community"
        subtitle="Connect, collaborate, and grow with like-minded professionals worldwide."
      />
    </div>
  );
};

export default RegisterPage;
