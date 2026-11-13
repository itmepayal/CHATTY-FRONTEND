import {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useId,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from "framer-motion";
import { useAuthStore } from "../store/useAuthStore";
import { useSecurityStore } from "../store/useSecurityStore";
import { axiosInstance } from "../lib/axios.js";
import { TwoFactorModal } from "../components/security/TwoFactorModal";
import {
  ArrowLeft,
  AtSign,
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

const SPRING = { type: "spring", stiffness: 420, damping: 32 };
const SOFT = { type: "spring", stiffness: 260, damping: 28 };

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SOFT },
};
const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
const dialogVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
};

const FIELDS = [
  {
    name: "fullName",
    label: "Full name",
    icon: User,
    type: "text",
    placeholder: "Your full name",
    required: true,
    autoComplete: "name",
  },
  {
    name: "username",
    label: "Username",
    icon: AtSign,
    type: "text",
    placeholder: "username",
    autoComplete: "username",
    copyable: true,
  },
  {
    name: "email",
    label: "Email",
    icon: Mail,
    type: "email",
    readOnly: true,
    copyable: true,
  },
  {
    name: "phone",
    label: "Phone",
    icon: Phone,
    type: "tel",
    placeholder: "+91 98765 43210",
    autoComplete: "tel",
  },
  {
    name: "gender",
    label: "Gender",
    icon: Users,
    type: "select",
    options: ["Female", "Male", "Other", "Prefer not to say"],
  },
  { name: "dob", label: "Date of birth", icon: Calendar, type: "date" },
  {
    name: "location",
    label: "Location",
    icon: MapPin,
    type: "text",
    placeholder: "City, Country",
  },
  {
    name: "website",
    label: "Website / Portfolio",
    icon: Globe,
    type: "url",
    placeholder: "https://yoursite.com",
    autoComplete: "url",
  },
];

const FIELD_MAP = Object.fromEntries(FIELDS.map((f) => [f.name, f]));
const READ_ONLY_FIELDS = FIELDS.filter((f) => f.readOnly).map((f) => f.name);

const GROUPS = [
  {
    title: "Basic details",
    hint: "How you appear to other people.",
    icon: User,
    fields: ["fullName", "username", "gender", "dob"],
  },
  {
    title: "Contact",
    hint: "Your email is verified and can't be changed here.",
    icon: Mail,
    fields: ["email", "phone"],
  },
  {
    title: "Find me online",
    hint: "Where people can reach or learn more about you.",
    icon: Globe,
    fields: ["location", "website"],
  },
];

const TABS = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    title: "Personal information",
    hint: "Keep your details up to date.",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    title: "Password & security",
    hint: "Protect your account and manage where you're signed in.",
  },
  {
    id: "account",
    label: "Account",
    icon: Trash2,
    title: "Account",
    hint: "Permanent actions for your account.",
  },
];

const BIO_MAX = 160;
const PW_MIN = 8;
const PW_MAX = 15;
const AVATAR_MAX_MB = 2;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const validators = {
  fullName: (v) =>
    !v.trim() ? "Name is required" : v.trim().length < 2 ? "Too short" : "",
  username: (v) =>
    v && !/^[a-zA-Z0-9_.]{3,20}$/.test(v)
      ? "3-20 chars: letters, numbers, _ or ."
      : "",
  phone: (v) =>
    v && !/^[+\d][\d\s-]{7,15}$/.test(v) ? "Invalid phone number" : "",
  website: (v) =>
    v && !/^https?:\/\/.+\..+/.test(v)
      ? "Must start with http:// or https://"
      : "",
  bio: (v) => (v.length > BIO_MAX ? `Max ${BIO_MAX} characters` : ""),
};

const buildInitialForm = (user) => ({
  fullName: user?.fullName || "",
  username: user?.username || "",
  email: user?.email || "",
  phone: user?.phone || "",
  gender: user?.gender || "",
  dob: user?.dob ? String(user.dob).slice(0, 10) : "",
  location: user?.location || "",
  website: user?.website || "",
  bio: user?.bio || "",
});

const buildUpdatePayload = (form) =>
  Object.fromEntries(
    Object.entries(form).filter(([key]) => !READ_ONLY_FIELDS.includes(key)),
  );

const todayISO = () => new Date().toISOString().slice(0, 10);

const sessionIdOf = (s) => String(s?.id ?? s?._id ?? "");

const pickBool = (obj, paths) => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const path of paths) {
    const v = path.split(".").reduce((o, k) => o?.[k], obj);
    if (typeof v === "boolean") return v;
  }
  return undefined;
};
const TWO_FA_PATHS = [
  "twoFactorEnabled",
  "twoFactor.enabled",
  "isTwoFactorEnabled",
  "twoFAEnabled",
  "twoFaEnabled",
  "is2FAEnabled",
  "twoFactorAuthEnabled",
  "mfaEnabled",
  "twoFactorAuth.enabled",
  "twoFA.enabled",
  "security.twoFactorEnabled",
  "security.twoFactor.enabled",
];
const LOGIN_ALERT_PATHS = [
  "loginAlerts",
  "loginAlertsEnabled",
  "security.loginAlerts",
  "notifications.loginAlerts",
];

const readTwoFactor = (u) => pickBool(u, TWO_FA_PATHS);
const readLoginAlerts = (u) => pickBool(u, LOGIN_ALERT_PATHS);

const PASSWORD_RULES = [
  {
    id: "len",
    label: `${PW_MIN} to ${PW_MAX} characters`,
    test: (v) => v.length >= PW_MIN && v.length <= PW_MAX,
  },
  {
    id: "case",
    label: "Upper and lower case letters",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { id: "num", label: "A number", test: (v) => /\d/.test(v) },
  {
    id: "sym",
    label: "A symbol (e.g. ! @ # $)",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_BAR = [
  "bg-error",
  "bg-error",
  "bg-warning",
  "bg-info",
  "bg-success",
];
const STRENGTH_TEXT = [
  "text-error",
  "text-error",
  "text-warning",
  "text-info",
  "text-success",
];

const formatDob = (v) => {
  if (!v) return "";
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const EMPTY_PW = { current: "", next: "", confirm: "" };
const HIDDEN_PW = { current: false, next: false, confirm: false };

const CARD =
  "rounded-3xl bg-base-300/90 shadow-2xl shadow-black/10 ring-1 ring-base-content/10 backdrop-blur";
const TILE =
  "rounded-2xl border border-base-content/10 bg-base-100/60 transition-all duration-200";

const controlClass = (error) =>
  `w-full rounded-xl border bg-base-100 pl-10 pr-3 py-3 text-sm shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
    error
      ? "border-error focus:ring-4 focus:ring-error/15"
      : "border-base-content/15 hover:border-base-content/40 focus:border-primary focus:ring-4 focus:ring-primary/15"
  }`;

const InfoRow = ({ icon: Icon, children }) => (
  <motion.li
    variants={itemVariants}
    className="flex min-w-0 items-center gap-3 text-sm"
  >
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
      <Icon className="h-4 w-4 text-primary" />
    </span>
    <span className="min-w-0 truncate">{children}</span>
  </motion.li>
);

const StatTile = ({ icon: Icon, value, label, tone }) => (
  <div className="group min-w-0 rounded-2xl bg-base-100/70 px-2 py-3 text-center ring-1 ring-base-content/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30">
    <Icon className="mx-auto mb-1.5 h-4 w-4 text-base-content/40 transition-colors group-hover:text-primary" />
    <p
      className={`text-lg font-bold leading-none tabular-nums sm:text-xl ${
        tone || ""
      }`}
    >
      {value}
    </p>
    <p className="mt-1.5 truncate text-[11px] text-base-content/60">{label}</p>
  </div>
);

const SectionTitle = ({ icon: Icon, title, hint, tone = "primary", aside }) => (
  <div className="mb-5 flex items-start gap-3">
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ${
        tone === "error"
          ? "from-error/20 to-error/5 ring-error/25"
          : "from-primary/25 to-primary/5 ring-primary/25"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] ${
          tone === "error" ? "text-error" : "text-primary"
        }`}
      />
    </span>
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-semibold leading-tight">{title}</h3>
      {hint && <p className="mt-1 text-xs text-base-content/60">{hint}</p>}
    </div>
    {aside}
  </div>
);

const Panel = ({ children }) => (
  <motion.section variants={itemVariants} className="px-4 py-6 sm:px-8 sm:py-8">
    {children}
  </motion.section>
);

const Toggle = ({ checked, onChange, label, disabled }) => (
  <motion.button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    whileTap={disabled ? undefined : { scale: 0.92 }}
    className={`relative flex h-7 w-12 shrink-0 items-center rounded-full bg-base-300 p-1 ring-1 ring-base-content/10 before:absolute before:-inset-2 before:content-[''] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary ${
      checked ? "justify-end" : "justify-start"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
  >
    <motion.span
      aria-hidden
      className="absolute inset-0 rounded-full bg-primary"
      initial={false}
      animate={{ opacity: checked ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    />
    <motion.span
      layout
      transition={SPRING}
      className="relative z-10 size-5 rounded-full bg-base-100 shadow-md"
    />
  </motion.button>
);

const SettingRow = ({ icon: Icon, title, desc, children }) => (
  <div
    className={`${TILE} flex flex-col gap-3 p-4 hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4`}
  >
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-1 text-xs leading-snug text-base-content/60">{desc}</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center justify-end gap-2">
      {children}
    </div>
  </div>
);

const FieldError = ({ children }) => (
  <AnimatePresence initial={false}>
    {children && (
      <motion.p
        key="err"
        role="alert"
        initial={{ opacity: 0, height: 0, y: -4 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.15 }}
        className="overflow-hidden text-xs text-error"
      >
        {children}
      </motion.p>
    )}
  </AnimatePresence>
);

const Chip = ({ icon: Icon, tone = "neutral", children }) => {
  const tones = {
    success: "bg-success/10 text-success ring-success/25",
    warning: "bg-warning/10 text-warning ring-warning/25",
    neutral: "bg-base-100 text-base-content/70 ring-base-content/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
};

const AvatarRing = ({ value, dragging, children }) => {
  const r = 66;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-32 sm:size-40">
      <div
        aria-hidden
        className="absolute inset-3 rounded-full bg-primary/30 blur-2xl"
      />
      <svg
        viewBox="0 0 144 144"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          strokeWidth="5"
          className="stroke-base-content/10"
        />
        <motion.circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={dragging ? "stroke-accent" : "stroke-primary"}
        />
      </svg>
      <div className="absolute inset-[10px] sm:inset-3">{children}</div>
    </div>
  );
};

const ScoreGauge = ({ value, stroke, text }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-base-content/10"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={stroke}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={`text-3xl font-bold leading-none tabular-nums ${text}`}>
            {value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-base-content/50">
            out of 100
          </p>
        </div>
      </div>
    </div>
  );
};

const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
  autoComplete,
  placeholder,
  maxLength,
}) => (
  <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium text-base-content/80">
      {label}
    </label>
    <div className="group relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-primary" />
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={`${controlClass(error)} pr-11`}
      />
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.88 }}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline focus-visible:outline-primary"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={show ? "hide" : "show"}
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
            transition={{ duration: 0.12 }}
            className="flex"
          >
            {show ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
    <FieldError>{error}</FieldError>
  </div>
);

const ConfirmDialog = ({
  open,
  title,
  text,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "error",
  busy,
}) => {
  const cancelRef = useRef(null);
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onCancel}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
        >
          <motion.div
            variants={dialogVariants}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-describedby={descId}
            className="w-full max-w-sm rounded-3xl border border-base-content/10 bg-base-200 p-5 shadow-2xl sm:p-6"
          >
            <span
              className={`mb-3 grid size-12 place-items-center rounded-2xl ring-1 ${
                tone === "error"
                  ? "bg-error/10 text-error ring-error/20"
                  : "bg-primary/10 text-primary ring-primary/20"
              }`}
            >
              <TriangleAlert className="h-5 w-5" />
            </span>
            <h3 className="mb-1.5 text-base font-bold">{title}</h3>
            <p
              id={descId}
              className="mb-5 text-sm leading-relaxed text-base-content/60"
            >
              {text}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <motion.button
                ref={cancelRef}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                className="btn btn-ghost flex-1"
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onConfirm}
                disabled={busy}
                className={`btn flex-1 ${
                  tone === "error" ? "btn-error" : "btn-primary"
                }`}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const ProfilePage = () => {
  const {
    authUser,
    isUpdateProfile,
    isUpdatingAvatar,
    isChangingPassword,
    isFetchingUser,
    isDeletingAccount,
    updateAvatar,
    updateProfile,
    changePassword,
    deleteAvatar,
    fetchCurrentUser,
    deleteAccount,
    socket,
  } = useAuthStore();
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState("profile");

  /* ----- Avatar state ----- */
  const [selectedImg, setSelectedImg] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  /* ----- Profile form state ----- */
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(authUser));
  const [errors, setErrors] = useState({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  /* ----- Password state ----- */
  const [pw, setPw] = useState(EMPTY_PW);
  const [pwShow, setPwShow] = useState(HIDDEN_PW);
  const [pwErrors, setPwErrors] = useState({});

  /* ----- Security dialogs ----- */
  const [twoFAModal, setTwoFAModal] = useState({ open: false, mode: "setup" });
  const [confirmRevoke, setConfirmRevoke] = useState({
    open: false,
    sessionId: null,
  });
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    revokingId,
    isRevokingOthers,
    fetchSessions,
    revokeSession,
    revokeOtherSessions,
    loginAlertsLoading,
    updateLoginAlerts,
    resetTwoFaState,
    startTwoFaSetup,
    openTwoFaDisable,
  } = useSecurityStore();

  const [loginAlerts, setLoginAlerts] = useState(
    readLoginAlerts(authUser) ?? true,
  );

  // GET /auth/check -> latest loginAlerts flag.
  // (2FA is derived from authUser, which fetchCurrentUser keeps fresh.)
  const refreshSecurityFlags = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/auth/check", {
        withCredentials: true,
      });
      const root = res?.data?.data ?? res?.data;
      const data = root?.user ?? root;
      const la = readLoginAlerts(data) ?? readLoginAlerts(root);
      if (typeof la === "boolean") setLoginAlerts(la);
    } catch (err) {
      console.error("Refresh security flags error:", err);
    }
  }, []);

  const authLoginAlerts = readLoginAlerts(authUser);

  // authUser is the single source of truth for 2FA. No separate state to go stale.
  const twoFA = readTwoFactor(authUser) ?? false;

  useEffect(() => {
    if (typeof authLoginAlerts === "boolean") setLoginAlerts(authLoginAlerts);
  }, [authLoginAlerts]);

  /* ----- Delete-account state ----- */
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteUseRecovery, setDeleteUseRecovery] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const resetDeleteForm = useCallback(() => {
    setDeleteText("");
    setDeletePassword("");
    setDeleteCode("");
    setDeleteUseRecovery(false);
    setDeleteError("");
  }, []);

  const initialForm = useMemo(() => buildInitialForm(authUser), [authUser]);
  const isDirty = useMemo(
    () => Object.keys(form).some((k) => form[k] !== initialForm[k]),
    [form, initialForm],
  );

  /* ----- Data loading & syncing ----- */

  // First load: user + flags + sessions
  useEffect(() => {
    fetchCurrentUser();
    refreshSecurityFlags();
    fetchSessions();
  }, [fetchCurrentUser, refreshSecurityFlags, fetchSessions]);

  // Re-sync whenever the Security tab is opened
  useEffect(() => {
    if (tab === "security") {
      fetchSessions();
      refreshSecurityFlags();
    }
  }, [tab, fetchSessions, refreshSecurityFlags]);

  // Never keep typed passwords / codes around after leaving their tab
  useEffect(() => {
    if (tab !== "security") {
      setPw(EMPTY_PW);
      setPwShow(HIDDEN_PW);
      setPwErrors({});
    }
    if (tab !== "account") resetDeleteForm();
  }, [tab, resetDeleteForm]);

  // Sessions changed elsewhere (socket / other tab)
  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener("chatty:session-revoked", handler);
    window.addEventListener("chatty:sessions-changed", handler);
    return () => {
      window.removeEventListener("chatty:session-revoked", handler);
      window.removeEventListener("chatty:sessions-changed", handler);
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (!socket) return;
    const handleAccountDeleted = () => {
      navigate("/login", { replace: true });
    };
    socket.on("account:deleted", handleAccountDeleted);
    return () => socket.off("account:deleted", handleAccountDeleted);
  }, [socket, navigate]);

  // Make sure 2FA secrets / recovery codes never outlive this page
  useEffect(() => () => resetTwoFaState(), [resetTwoFaState]);

  useEffect(() => {
    if (!isEditing) setForm(initialForm);
  }, [initialForm, isEditing]);

  // Lock background scroll while this full-screen page is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Free the local preview URL when it is replaced or the page unmounts
  useEffect(
    () => () => {
      if (selectedImg) URL.revokeObjectURL(selectedImg);
    },
    [selectedImg],
  );

  /* ----- Navigation & keyboard shortcuts ----- */

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  }, [location.key, navigate]);

  const requestBack = useCallback(() => {
    if (isEditing && isDirty) {
      setConfirmDiscard(true);
      return;
    }
    goBack();
  }, [isEditing, isDirty, goBack]);

  const anyDialogOpen =
    twoFAModal.open ||
    confirmRevoke.open ||
    confirmRevokeOthers ||
    confirmDiscard ||
    confirmRemovePhoto;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || anyDialogOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      requestBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestBack, anyDialogOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (tab === "profile" && isEditing && !anyDialogOpen) {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, isEditing, anyDialogOpen]);

  const completion = useMemo(() => {
    const keys = [...FIELDS.map((f) => f.name), "bio"];
    const filled = keys.filter((k) =>
      (initialForm[k] || "").toString().trim(),
    ).length;
    const withAvatar = authUser?.avatar ? 1 : 0;
    return Math.round(((filled + withAvatar) / (keys.length + 1)) * 100);
  }, [initialForm, authUser]);

  const missing = useMemo(() => {
    const list = FIELDS.filter(
      (f) => !(initialForm[f.name] || "").toString().trim(),
    ).map((f) => ({ id: f.name, label: f.label }));
    if (!initialForm.bio.trim()) list.push({ id: "bio", label: "Bio" });
    if (!authUser?.avatar) list.push({ id: "photo", label: "Photo" });
    return list;
  }, [initialForm, authUser]);

  const memberSince = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const currentTab = TABS.find((t) => t.id === tab);

  const passedRules = PASSWORD_RULES.filter((r) => r.test(pw.next));
  const strength = pw.next ? passedRules.length : 0;

  const securityChecks = useMemo(
    () => [
      {
        id: "2fa",
        label: "Two-step verification is on",
        points: 50,
        ok: twoFA,
        fix: "Turn on two-step verification (recommended)",
      },
      {
        id: "alerts",
        label: "Login alerts",
        points: 25,
        ok: loginAlerts,
        fix: "Turn on login alerts",
      },
      {
        id: "sessions",
        label: "Few active devices",
        points: 25,
        ok: sessions.length <= 2,
        fix: "Sign out devices you don't use",
      },
    ],
    [twoFA, loginAlerts, sessions.length],
  );
  const securityScore = securityChecks.reduce(
    (sum, c) => sum + (c.ok ? c.points : 0),
    0,
  );
  const securityLevel =
    securityScore >= 90
      ? { label: "Excellent", text: "text-success", stroke: "stroke-success" }
      : securityScore >= 60
        ? { label: "Good", text: "text-info", stroke: "stroke-info" }
        : {
            label: "Needs attention",
            text: "text-warning",
            stroke: "stroke-warning",
          };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!AVATAR_TYPES.includes(selectedFile.type)) {
      toast.error("Only JPG, PNG, and WEBP formats are allowed.");
      return;
    }
    if (selectedFile.size > AVATAR_MAX_MB * 1024 * 1024) {
      toast.error(`File size should be under ${AVATAR_MAX_MB}MB.`);
      return;
    }

    setFile(selectedFile);
    setSelectedImg(URL.createObjectURL(selectedFile));
  };

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUpdatingAvatar) return;
    processFile(e.dataTransfer.files?.[0]);
  };

  const cancelAvatar = () => {
    setSelectedImg(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async () => {
    if (!file) return toast.error("Please select a file first");

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      await updateAvatar(formData);
      cancelAvatar();
    } catch (err) {
      console.error("Update avatar error:", err);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await deleteAvatar();
    } catch (err) {
      console.error("Delete avatar error:", err);
    } finally {
      setConfirmRemovePhoto(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    Object.keys(validators).forEach((k) => {
      const msg = validators[k](form[k] || "");
      if (msg) next[k] = msg;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCancel = () => {
    setForm(initialForm);
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Please fix the highlighted fields");
    if (!isDirty) return setIsEditing(false);

    try {
      await updateProfile(buildUpdatePayload(form));
      setIsEditing(false);
    } catch (err) {
      console.error("Update profile error:", err);
    }
  };

  const handleMissingClick = (id) => {
    if (id === "photo") {
      fileInputRef.current?.click();
      return;
    }
    setTab("profile");
    setIsEditing(true);
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const setPwField = (key) => (e) => {
    setPw((p) => ({ ...p, [key]: e.target.value }));
    if (pwErrors[key]) setPwErrors((p) => ({ ...p, [key]: "" }));
  };

  const togglePwShow = (key) => () =>
    setPwShow((p) => ({ ...p, [key]: !p[key] }));

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const next = {};
    if (!pw.current) next.current = "Enter your current password";
    if (!pw.next) next.next = "Enter a new password";
    else if (pw.next.length < PW_MIN)
      next.next = `Use at least ${PW_MIN} characters`;
    else if (pw.next.length > PW_MAX)
      next.next = `Maximum ${PW_MAX} characters`;
    else if (pw.next === pw.current)
      next.next = "New password must be different from the current one";
    else if (strength < 3) next.next = "Make it a bit stronger";
    if (pw.confirm !== pw.next) next.confirm = "Passwords don’t match";

    setPwErrors(next);
    if (Object.keys(next).length) return;

    if (isChangingPassword) return;

    try {
      await changePassword({
        currentPassword: pw.current,
        newPassword: pw.next,
        confirmPassword: pw.confirm,
      });
      setPw(EMPTY_PW);
      setPwShow(HIDDEN_PW);
      setPwErrors({});
      fetchSessions();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "";
      if (/current password/i.test(msg)) {
        setPwErrors((p) => ({ ...p, current: msg }));
      } else if (/match|confirm/i.test(msg)) {
        setPwErrors((p) => ({ ...p, confirm: msg }));
      } else if (/different|same/i.test(msg)) {
        setPwErrors((p) => ({ ...p, next: msg }));
      }
    }
  };

  const handleLoginAlertsToggle = async (enabled) => {
    setLoginAlerts(enabled);
    const ok = await updateLoginAlerts(enabled);
    if (!ok) setLoginAlerts(!enabled);
  };

  const handleRevokeSession = async (sessionId) => {
    setConfirmRevoke({ open: false, sessionId: null });
    if (!sessionId) return;
    const ok = await revokeSession(sessionId);
    if (!ok) fetchSessions();
  };

  const handleRevokeOthers = async () => {
    setConfirmRevokeOthers(false);
    const ok = await revokeOtherSessions();
    if (!ok) fetchSessions();
  };

  const openTwoFA = async (mode) => {
    setTwoFAModal({ open: true, mode });
    if (mode === "disable") {
      openTwoFaDisable();
      return;
    }
    const ok = await startTwoFaSetup();
    if (!ok) {
      const msg = useSecurityStore.getState().twoFaError || "";
      if (/already/i.test(msg)) {
        fetchCurrentUser();
        setTwoFAModal({ open: false, mode: "setup" });
        resetTwoFaState();
      }
    }
  };
  const handleTwoFAModalClose = useCallback(() => {
    setTwoFAModal({ open: false, mode: "setup" });
    resetTwoFaState();
    refreshSecurityFlags();
    fetchCurrentUser();
  }, [resetTwoFaState, refreshSecurityFlags, fetchCurrentUser]);

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;

    if (deleteText.trim() !== "DELETE") {
      setDeleteError("Type DELETE exactly to confirm.");
      return;
    }
    if (!deletePassword) {
      setDeleteError("Password is required.");
      return;
    }

    const code = deleteCode.trim();
    if (twoFA) {
      if (!code) {
        setDeleteError(
          deleteUseRecovery
            ? "Enter one of your recovery codes."
            : "Enter the 6-digit code from your authenticator app.",
        );
        return;
      }
      if (!deleteUseRecovery && !/^\d{6}$/.test(code)) {
        setDeleteError("The code must be exactly 6 digits.");
        return;
      }
    }
    setDeleteError("");

    try {
      await deleteAccount({
        password: deletePassword,
        ...(twoFA && code ? { code, useRecoveryCode: deleteUseRecovery } : {}),
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Deletion failed. Please try again.";
      setDeleteError(msg);
    }
  };

  const renderField = (name) => {
    const f = FIELD_MAP[name];
    const Icon = f.icon;
    const error = errors[f.name];

    if (!isEditing || f.readOnly) {
      const raw = form[f.name];
      const shown = f.type === "date" ? formatDob(raw) : raw;
      return (
        <div
          key={f.name}
          className={`${TILE} group flex min-w-0 items-start gap-3 p-3.5 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md`}
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">
              {f.label}
              {f.readOnly && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-success">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 break-words text-sm font-medium">
                {shown ? (
                  f.type === "url" ? (
                    <a
                      href={raw}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link link-hover"
                    >
                      {raw.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    shown
                  )
                ) : (
                  <span className="font-normal text-base-content/40">
                    Not added
                  </span>
                )}
              </p>
              {f.copyable && shown && (
                <button
                  type="button"
                  onClick={() => copyText(shown, f.label)}
                  aria-label={`Copy ${f.label.toLowerCase()}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-base-content/40 opacity-100 transition hover:bg-base-200 hover:text-base-content focus-visible:outline focus-visible:outline-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={f.name} className="min-w-0 space-y-1.5">
        <label
          htmlFor={f.name}
          className="flex items-center gap-1 text-sm font-medium text-base-content/80"
        >
          {f.label}
          {f.required && <span className="text-error">*</span>}
        </label>

        <div className="group relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-primary" />
          {f.type === "select" ? (
            <>
              <select
                id={f.name}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                disabled={isUpdateProfile}
                className={`${controlClass(error)} appearance-none pr-10`}
              >
                <option value="">Select</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
            </>
          ) : (
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              value={form[f.name]}
              onChange={handleChange}
              disabled={isUpdateProfile}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              aria-invalid={!!error}
              max={f.type === "date" ? todayISO() : undefined}
              style={
                f.type === "date" ? { colorScheme: "light dark" } : undefined
              }
              className={controlClass(error)}
            />
          )}
        </div>

        <FieldError>{error}</FieldError>
      </div>
    );
  };

  /* ----- Tab: Profile ----- */

  const profileTab = (
    <form
      ref={formRef}
      onSubmit={handleSave}
      noValidate
      className="flex flex-1 flex-col"
    >
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="flex-1 divide-y divide-base-content/10"
      >
        {GROUPS.map((g) => (
          <Panel key={g.title}>
            <SectionTitle icon={g.icon} title={g.title} hint={g.hint} />
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                isEditing ? "gap-4" : "gap-3"
              }`}
            >
              {g.fields.map(renderField)}
            </div>
          </Panel>
        ))}

        <Panel>
          <SectionTitle
            icon={FileText}
            title="About"
            hint="A short line about you, shown on your profile."
          />
          {isEditing ? (
            <div className="space-y-1.5">
              <label
                htmlFor="bio"
                className="text-sm font-medium text-base-content/80"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={form.bio}
                onChange={handleChange}
                disabled={isUpdateProfile}
                aria-invalid={!!errors.bio}
                placeholder="Tell people something about you..."
                className={`w-full resize-none rounded-xl border bg-base-100 px-4 py-3 text-sm shadow-sm outline-none transition-all disabled:opacity-60 ${
                  errors.bio
                    ? "border-error focus:ring-4 focus:ring-error/15"
                    : "border-base-content/15 hover:border-base-content/40 focus:border-primary focus:ring-4 focus:ring-primary/15"
                }`}
              />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span role="alert" className="text-error">
                  {errors.bio}
                </span>
                <span
                  className={`tabular-nums ${
                    form.bio.length > BIO_MAX
                      ? "text-error"
                      : "text-base-content/50"
                  }`}
                >
                  {form.bio.length}/{BIO_MAX}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-base-content/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    form.bio.length > BIO_MAX * 0.9 ? "bg-error" : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(100, (form.bio.length / BIO_MAX) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className={`${TILE} relative p-5`}>
              <span
                aria-hidden
                className="absolute left-0 top-4 h-[calc(100%-2rem)] w-1 rounded-r-full bg-primary/60"
              />
              <p className="max-w-prose whitespace-pre-wrap break-words pl-2 text-sm leading-relaxed">
                {form.bio || (
                  <span className="text-base-content/40">Not added</span>
                )}
              </p>
            </div>
          )}
        </Panel>
      </motion.div>

      <AnimatePresence initial={false}>
        {isEditing && (
          <motion.div
            key="savebar"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={SPRING}
            className="sticky bottom-3 z-10 mx-3 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-100/90 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:mx-6 sm:mb-5 sm:px-5"
          >
            <p className="hidden items-center gap-2 text-xs text-base-content/60 sm:flex">
              <span
                className={`size-2 rounded-full ${
                  isDirty ? "animate-pulse bg-warning" : "bg-base-content/20"
                }`}
              />
              {isDirty
                ? "Unsaved changes · Press Ctrl/⌘ + S to save"
                : "No changes yet"}
            </p>
            <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="btn btn-ghost btn-sm flex-1 sm:flex-none"
                disabled={isUpdateProfile}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary btn-sm flex-1 gap-2 shadow-lg shadow-primary/30 sm:flex-none"
                disabled={isUpdateProfile || !isDirty}
              >
                {isUpdateProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isUpdateProfile ? "Saving..." : "Save changes"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );

  /* ----- Tab: Security ----- */

  const securityTab = (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex-1 divide-y divide-base-content/10"
    >
      <Panel>
        <SectionTitle
          icon={Fingerprint}
          title="Security checkup"
          hint="Based on your current settings."
          aside={
            <span
              className={`rounded-full bg-base-100 px-3 py-1 text-xs font-semibold ring-1 ring-base-content/10 ${securityLevel.text}`}
            >
              {securityLevel.label}
            </span>
          }
        />
        <div
          className={`${TILE} flex flex-col items-center gap-5 p-5 sm:flex-row sm:gap-7`}
        >
          <ScoreGauge
            value={securityScore}
            stroke={securityLevel.stroke}
            text={securityLevel.text}
          />
          <ul className="grid w-full flex-1 gap-2">
            {securityChecks.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
                  c.ok ? "bg-success/10" : "bg-warning/10"
                }`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full ${
                    c.ok
                      ? "bg-success text-success-content"
                      : "bg-warning text-warning-content"
                  }`}
                >
                  {c.ok ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold leading-none">!</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 leading-snug text-base-content/80">
                  {c.ok ? c.label : c.fix}
                </span>
                <span className="text-xs font-semibold tabular-nums text-base-content/50">
                  {c.ok ? `+${c.points}` : `${c.points} pts`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          icon={KeyRound}
          title="Change password"
          hint="Use a password you don't use anywhere else."
        />
        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div className="max-w-md">
            <PasswordInput
              id="current-password"
              label="Current password"
              value={pw.current}
              onChange={setPwField("current")}
              show={pwShow.current}
              onToggle={togglePwShow("current")}
              error={pwErrors.current}
              autoComplete="current-password"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordInput
              id="new-password"
              label="New password"
              value={pw.next}
              onChange={setPwField("next")}
              show={pwShow.next}
              onToggle={togglePwShow("next")}
              error={pwErrors.next}
              autoComplete="new-password"
              placeholder={`${PW_MIN} to ${PW_MAX} characters`}
              maxLength={PW_MAX}
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              value={pw.confirm}
              onChange={setPwField("confirm")}
              show={pwShow.confirm}
              onToggle={togglePwShow("confirm")}
              error={pwErrors.confirm}
              autoComplete="new-password"
              maxLength={PW_MAX}
            />
          </div>

          <div className={`${TILE} p-4`}>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-base-content/70">
                Password strength
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={pw.next ? STRENGTH_LABELS[strength] : "none"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  aria-live="polite"
                  className={`font-semibold ${
                    pw.next ? STRENGTH_TEXT[strength] : "text-base-content/40"
                  }`}
                >
                  {pw.next ? STRENGTH_LABELS[strength] : "—"}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => {
                const on = pw.next && strength >= i;
                return (
                  <span
                    key={i}
                    className="relative h-1.5 overflow-hidden rounded-full bg-base-content/15"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scaleX: on ? 1 : 0 }}
                      transition={SPRING}
                      style={{ originX: 0 }}
                      className={`absolute inset-0 rounded-full transition-colors ${
                        STRENGTH_BAR[strength]
                      }`}
                    />
                  </span>
                );
              })}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(pw.next);
                return (
                  <li
                    key={r.id}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      ok ? "text-success" : "text-base-content/60"
                    }`}
                  >
                    <motion.span
                      animate={{ scale: ok ? [1, 1.3, 1] : 1 }}
                      transition={{ duration: 0.25 }}
                      className={`grid size-4 shrink-0 place-items-center rounded-full ${
                        ok
                          ? "bg-success text-success-content"
                          : "bg-base-content/15"
                      }`}
                    >
                      {ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </motion.span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex justify-end">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-sm w-full gap-2 shadow-lg shadow-primary/25 sm:w-auto"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {isChangingPassword ? "Updating..." : "Update password"}
            </motion.button>
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionTitle
          icon={ShieldCheck}
          title="Extra protection"
          hint="Add more layers so only you can get in."
        />
        <div className="space-y-3">
          <SettingRow
            icon={Smartphone}
            title="Two-step verification"
            desc={
              twoFA
                ? "On. We ask for a 6-digit code from your authenticator app every time you sign in."
                : "Add a second step at sign-in using a code from your authenticator app. Recommended."
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              {twoFA ? (
                <motion.div
                  key="on"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Chip icon={Check} tone="success">
                    Enabled
                  </Chip>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openTwoFA("disable")}
                    className="btn btn-ghost btn-sm gap-1 text-error"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    Disable
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  key="off"
                  type="button"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openTwoFA("setup")}
                  className="btn btn-primary btn-sm w-full gap-1.5 shadow-lg shadow-primary/25 sm:w-auto"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Enable
                </motion.button>
              )}
            </AnimatePresence>
          </SettingRow>

          <AnimatePresence initial={false}>
            {twoFA && (
              <motion.div
                key="twofa-note"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SOFT}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-success text-success-content">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-tight">
                      Your account is protected
                    </p>
                    <p className="text-xs leading-relaxed text-base-content/70">
                      Even if someone gets your password, they can't sign in
                      without your authenticator app. Lost your phone? Use one
                      of your recovery codes. Each code works only once, so keep
                      them somewhere safe.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SettingRow
            icon={Bell}
            title="Login alerts"
            desc="Email me when someone signs in from a new device."
          >
            <Toggle
              checked={loginAlerts}
              onChange={handleLoginAlertsToggle}
              label="Login alerts"
              disabled={loginAlertsLoading}
            />
          </SettingRow>
        </div>
      </Panel>

      <Panel>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-sm ring-1 ring-primary/25">
              <Monitor className="h-[18px] w-[18px] text-primary" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-tight">
                Where you're signed in
              </h3>
              <p className="mt-1 text-xs text-base-content/60">
                Sign out of any device you don't recognise.
              </p>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {sessions.length > 1 && (
              <motion.button
                key="others"
                type="button"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={SPRING}
                whileTap={{ scale: 0.95 }}
                onClick={() => setConfirmRevokeOthers(true)}
                disabled={isRevokingOthers || !!revokingId}
                className="btn btn-outline btn-sm w-full gap-1.5 sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Sign out all others
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {sessionsLoading && sessions.length === 0 && (
          <ul className="space-y-2.5">
            {[1, 2].map((i) => (
              <li
                key={i}
                className={`${TILE} flex animate-pulse items-center gap-3 p-3.5`}
              >
                <span className="size-11 shrink-0 rounded-xl bg-base-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 rounded bg-base-300" />
                  <div className="h-2.5 w-24 rounded bg-base-300" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {sessionsError && !sessionsLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SOFT}
            className="flex flex-col items-center gap-3 rounded-2xl border border-error/30 bg-error/5 p-6 text-center"
          >
            <TriangleAlert className="h-6 w-6 text-error" />
            <p className="text-sm text-base-content/60">{sessionsError}</p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchSessions()}
              className="btn btn-outline btn-sm gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </motion.button>
          </motion.div>
        )}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SOFT}
            className="rounded-2xl border border-dashed border-base-content/15 bg-base-100/40 p-6 text-center"
          >
            <Monitor className="mx-auto mb-2 h-8 w-8 text-base-content/30" />
            <p className="text-sm text-base-content/60">
              No active sessions found.
            </p>
          </motion.div>
        )}

        {!sessionsError && sessions.length > 0 && (
          <motion.ul layout className="relative space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {sessions.map((x, idx) => {
                const sid = sessionIdOf(x);
                const DeviceIcon =
                  x.deviceType === "mobile"
                    ? Smartphone
                    : x.deviceType === "tablet"
                      ? Laptop
                      : Monitor;
                const isRevoking = revokingId === sid;

                return (
                  <motion.li
                    key={sid || idx}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { ...SOFT, delay: idx * 0.05 },
                    }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition-shadow hover:shadow-md sm:p-3.5 ${
                      x.current
                        ? "border-success/30 bg-gradient-to-r from-success/10 to-success/0"
                        : "border-base-content/10 bg-base-100/60"
                    }`}
                  >
                    <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-base-200 ring-1 ring-base-content/5">
                      <DeviceIcon className="h-5 w-5 text-primary" />
                      {x.current && (
                        <span
                          aria-hidden
                          className="absolute -right-0.5 -top-0.5 size-3 animate-pulse rounded-full bg-success ring-2 ring-base-300"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-tight">
                        <span className="min-w-0 truncate">
                          {x.device || "Unknown device"}
                        </span>
                        {x.current && (
                          <Chip icon={Check} tone="success">
                            This device
                          </Chip>
                        )}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-base-content/60">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {x.location || "Unknown location"}
                          {x.lastActiveLabel ? ` · ${x.lastActiveLabel}` : ""}
                        </span>
                      </p>
                    </div>
                    {!x.current && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() =>
                          setConfirmRevoke({ open: true, sessionId: sid })
                        }
                        disabled={isRevoking || isRevokingOthers}
                        aria-label={`Sign out ${x.device || "device"}`}
                        className="btn btn-ghost btn-sm shrink-0 text-error"
                      >
                        {isRevoking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Sign out</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </Panel>
    </motion.div>
  );

  const accountTab = (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex-1"
    >
      <Panel>
        <SectionTitle
          icon={TriangleAlert}
          tone="error"
          title="Delete account"
          hint="This removes your profile, messages and photos for good."
        />
        <div className="relative overflow-hidden rounded-2xl border border-error/30 bg-error/5 p-4 sm:p-6">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, currentColor 0 8px, transparent 8px 16px)",
              color: "var(--color-error, #ef4444)",
            }}
          />
          <p className="mt-2 text-sm leading-relaxed text-base-content/80">
            Once you delete your account, you can't get it back. Your chats will
            be removed from other people's lists too.
          </p>

          <ul className="mt-3 grid gap-1.5 text-xs text-base-content/70 sm:grid-cols-3">
            {["Profile & photo", "Messages & chats", "Active sessions"].map(
              (t) => (
                <li
                  key={t}
                  className="flex items-center gap-1.5 rounded-lg bg-error/10 px-2.5 py-1.5"
                >
                  <X className="h-3.5 w-3.5 text-error" />
                  {t}
                </li>
              ),
            )}
          </ul>

          <div className="mt-5 w-full max-w-sm space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="delete-confirm"
                className="text-sm font-medium text-base-content/80"
              >
                Type <span className="font-semibold text-error">DELETE</span> to
                confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteText}
                onChange={(e) => {
                  setDeleteText(e.target.value);
                  setDeleteError("");
                }}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isDeletingAccount}
                className="w-full rounded-xl border border-base-content/15 bg-base-100 px-4 py-3 text-sm shadow-sm outline-none transition-all hover:border-base-content/40 focus:border-error focus:ring-4 focus:ring-error/15 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="delete-password"
                className="text-sm font-medium text-base-content/80"
              >
                Your password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-error" />
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isDeletingAccount}
                  className="w-full rounded-xl border border-base-content/15 bg-base-100 py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition-all hover:border-base-content/40 focus:border-error focus:ring-4 focus:ring-error/15 disabled:opacity-50"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {twoFA && (
                <motion.div
                  key="twofa"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SOFT}
                  className="overflow-hidden"
                >
                  <div className={`${TILE} space-y-2 p-3`}>
                    <p className="text-xs font-medium text-base-content/80">
                      Confirm it's really you
                    </p>
                    <p className="text-xs leading-relaxed text-base-content/60">
                      {deleteUseRecovery
                        ? "Enter one of your unused recovery codes. Each code works only once."
                        : "Two-step verification is on. Enter the 6-digit code from your authenticator app."}
                    </p>
                    <input
                      type="text"
                      inputMode={deleteUseRecovery ? "text" : "numeric"}
                      value={deleteCode}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDeleteCode(
                          deleteUseRecovery ? v : v.replace(/\D/g, ""),
                        );
                        setDeleteError("");
                      }}
                      placeholder={
                        deleteUseRecovery
                          ? "Enter a recovery code"
                          : "Enter 6-digit code"
                      }
                      autoComplete="one-time-code"
                      disabled={isDeletingAccount}
                      maxLength={deleteUseRecovery ? 12 : 6}
                      aria-label={
                        deleteUseRecovery ? "Recovery code" : "6-digit code"
                      }
                      className="w-full rounded-xl border border-base-content/15 bg-base-100 px-4 py-2.5 text-sm tabular-nums outline-none transition-all focus:border-error focus:ring-4 focus:ring-error/15 disabled:opacity-50"
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-base-content/60">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={deleteUseRecovery}
                        onChange={(e) => {
                          setDeleteUseRecovery(e.target.checked);
                          setDeleteCode("");
                        }}
                        disabled={isDeletingAccount}
                      />
                      Use a recovery code instead
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <FieldError>{deleteError}</FieldError>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteAccount}
            disabled={
              deleteText.trim() !== "DELETE" ||
              !deletePassword ||
              isDeletingAccount ||
              (twoFA && !deleteCode.trim())
            }
            className="btn btn-error btn-sm mt-5 w-full gap-2 sm:w-auto"
          >
            {isDeletingAccount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeletingAccount ? "Deleting..." : "Delete my account"}
          </motion.button>
        </div>
      </Panel>
    </motion.div>
  );

  const onTabKeyDown = (e, index) => {
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  };

  const hasSavedAvatar = !!authUser?.avatar && !selectedImg;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200"
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -left-40 -top-40 size-[34rem] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -right-32 top-1/3 size-[30rem] rounded-full bg-secondary/15 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 size-[28rem] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <motion.header
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SOFT}
          className="sticky top-0 z-20 border-b border-base-content/10 bg-base-100/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        >
          <div className="container mx-auto flex h-14 items-center gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:h-16">
            <motion.button
              type="button"
              onClick={requestBack}
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.92 }}
              aria-label="Go back"
              title="Back (Esc)"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-base-content/10 bg-base-100 shadow-sm hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-primary sm:size-10"
            >
              <motion.span
                variants={{ rest: { x: 0 }, hover: { x: -3 } }}
                transition={SPRING}
                className="flex"
              >
                <ArrowLeft className="size-5" />
              </motion.span>
            </motion.button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight tracking-tight sm:text-xl">
                Account settings
              </h1>
              <p className="hidden truncate text-xs text-base-content/60 sm:block">
                Manage your details, security and account
              </p>
            </div>

            <kbd className="kbd kbd-sm hidden text-base-content/50 md:inline-flex">
              Esc
            </kbd>

            <AnimatePresence initial={false}>
              {tab === "profile" && !isEditing && (
                <motion.button
                  key="edit-mobile"
                  type="button"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={SPRING}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsEditing(true)}
                  disabled={isFetchingUser}
                  aria-label="Edit profile"
                  className="btn btn-primary btn-sm gap-2 sm:hidden"
                >
                  {isFetchingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  Edit
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        <main className="container relative z-10 mx-auto pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-4 sm:px-4 sm:pt-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SOFT}
              className={`${CARD} flex flex-col self-start overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto`}
            >
              <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-primary/70 via-secondary/45 to-accent/45 sm:h-36">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(currentColor 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute -right-10 -top-12 size-44 rounded-full bg-base-100/25 blur-2xl"
                />
                <div
                  aria-hidden
                  className="absolute -bottom-16 -left-10 size-44 rounded-full bg-accent/40 blur-2xl"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-base-300 to-transparent"
                />
              </div>

              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex flex-1 flex-col px-4 pb-5 sm:px-6 sm:pb-6"
              >
                <motion.div
                  variants={itemVariants}
                  className="-mt-16 flex justify-center sm:-mt-20"
                >
                  <div
                    className="relative"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <AvatarRing value={completion} dragging={isDragging}>
                      <motion.img
                        key={selectedImg || authUser?.avatar || "default"}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING}
                        src={selectedImg || authUser?.avatar || "/avatar.png"}
                        alt="Profile"
                        className="size-full rounded-full bg-base-200 object-cover shadow-xl ring-4 ring-base-300"
                      />
                    </AvatarRing>

                    <span
                      className="absolute bottom-1 left-0 rounded-full bg-base-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary shadow-md ring-1 ring-base-content/10"
                      title="Profile completion"
                    >
                      {completion}%
                    </span>

                    <AnimatePresence initial={false}>
                      {hasSavedAvatar && (
                        <motion.button
                          key="delete-photo"
                          type="button"
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={SPRING}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setConfirmRemovePhoto(true)}
                          disabled={isUpdatingAvatar}
                          aria-label="Remove photo"
                          title="Remove photo"
                          className="absolute right-1 top-1 grid size-10 place-items-center rounded-full bg-error text-error-content shadow-lg ring-4 ring-base-300 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60 sm:size-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <motion.label
                      htmlFor="avatar-upload"
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.08 }}
                      transition={SPRING}
                      className={`absolute bottom-1 right-1 grid size-10 cursor-pointer place-items-center rounded-full bg-primary text-primary-content shadow-lg shadow-primary/40 ring-4 ring-base-300 focus-within:outline focus-within:outline-offset-2 focus-within:outline-primary sm:size-9 ${
                        isUpdatingAvatar
                          ? "pointer-events-none animate-pulse"
                          : ""
                      }`}
                      title="Change photo"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        id="avatar-upload"
                        className="sr-only"
                        accept={AVATAR_TYPES.join(",")}
                        onChange={handleFileChange}
                        disabled={isUpdatingAvatar}
                        ref={fileInputRef}
                        aria-label="Change profile photo"
                      />
                    </motion.label>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="mt-3 text-center sm:mt-4"
                >
                  <h2 className="break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                    {initialForm.fullName || "Your name"}
                  </h2>
                  <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-base-content/60">
                    {initialForm.username
                      ? `@${initialForm.username}`
                      : "No username yet"}
                    {initialForm.username && (
                      <button
                        type="button"
                        onClick={() =>
                          copyText(initialForm.username, "Username")
                        }
                        aria-label="Copy username"
                        className="grid size-6 place-items-center rounded-md text-base-content/40 transition-colors hover:bg-base-200 hover:text-primary focus-visible:outline focus-visible:outline-primary"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <Chip icon={ShieldCheck} tone="success">
                      Email verified
                    </Chip>
                    <Chip
                      icon={twoFA ? Lock : ShieldOff}
                      tone={twoFA ? "success" : "warning"}
                    >
                      {twoFA ? "2-step protected" : "2-step off"}
                    </Chip>
                  </div>
                  {initialForm.bio && (
                    <p className="mx-auto mt-4 max-w-prose break-words text-sm leading-relaxed text-base-content/75">
                      {initialForm.bio}
                    </p>
                  )}
                </motion.div>

                <AnimatePresence initial={false}>
                  {selectedImg && (
                    <motion.div
                      key="avatar-confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={SOFT}
                      className="overflow-hidden"
                    >
                      <div className={`${TILE} mt-5 p-3`}>
                        <p className="mb-2.5 text-center text-sm text-base-content/70">
                          Use this as your profile photo?
                        </p>
                        <div className="flex gap-2">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={cancelAvatar}
                            className="btn btn-ghost btn-sm flex-1"
                            disabled={isUpdatingAvatar}
                          >
                            <X className="h-4 w-4" /> Cancel
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={handleImageUpload}
                            className="btn btn-primary btn-sm flex-1"
                            disabled={isUpdatingAvatar}
                          >
                            {isUpdatingAvatar ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            {isUpdatingAvatar ? "Uploading..." : "Save photo"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  variants={itemVariants}
                  className="mt-5 grid grid-cols-3 gap-2"
                >
                  <StatTile
                    icon={Sparkles}
                    value={`${completion}%`}
                    label="Profile"
                    tone="text-primary"
                  />
                  <StatTile
                    icon={ShieldCheck}
                    value={securityScore}
                    label="Security"
                    tone={securityLevel.text}
                  />
                  <StatTile
                    icon={Monitor}
                    value={sessions.length}
                    label="Devices"
                  />
                </motion.div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-start lg:grid-cols-1">
                  <motion.ul
                    variants={listVariants}
                    className={`${TILE} space-y-3 p-4`}
                  >
                    <InfoRow icon={Mail}>{initialForm.email || "—"}</InfoRow>
                    {initialForm.location && (
                      <InfoRow icon={MapPin}>{initialForm.location}</InfoRow>
                    )}
                    {initialForm.website && (
                      <InfoRow icon={Globe}>
                        <a
                          href={initialForm.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link link-hover"
                        >
                          {initialForm.website.replace(/^https?:\/\//, "")}
                        </a>
                      </InfoRow>
                    )}
                    <InfoRow icon={Calendar}>Joined {memberSince}</InfoRow>
                  </motion.ul>

                  <motion.div
                    variants={itemVariants}
                    className="rounded-2xl bg-base-100 p-4 ring-1 ring-base-content/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-medium leading-tight">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {missing.length
                          ? `${missing.length} to go`
                          : "Profile complete"}
                      </p>
                      <span className="text-xs font-semibold tabular-nums text-primary">
                        {completion}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-base-content/10">
                      <motion.div
                        initial={false}
                        animate={{ width: `${completion}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                      />
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-base-content/60">
                      {missing.length
                        ? "Add these to finish your profile."
                        : "Nice, everything is filled in."}
                    </p>
                    {missing.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {missing.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => handleMissingClick(m.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-dashed border-base-content/25 px-2.5 py-1 text-xs text-base-content/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline focus-visible:outline-primary"
                            >
                              <Plus className="h-3 w-3" />
                              {m.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.aside>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SOFT}
              className={`${CARD} flex min-w-0 flex-col`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-3xl border-b border-base-content/10 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">
                <div className="min-w-0">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={
                        tab + (tab === "profile" && isEditing ? "-edit" : "")
                      }
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                        {currentTab.title}
                      </h2>
                      <p className="text-sm text-base-content/60">
                        {tab === "profile" && isEditing
                          ? "Make your changes, then save."
                          : currentTab.hint}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false}>
                  {tab === "profile" && !isEditing && (
                    <motion.button
                      key="edit"
                      type="button"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={SPRING}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setIsEditing(true)}
                      disabled={isFetchingUser}
                      className="btn btn-primary btn-sm hidden gap-2 shadow-lg shadow-primary/30 sm:inline-flex"
                    >
                      {isFetchingUser ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                      Edit profile
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <LayoutGroup id="profile-tabs">
                <div
                  role="tablist"
                  aria-label="Profile sections"
                  className="mx-4 mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-base-content/10 bg-base-100/60 p-1.5 shadow-inner sm:mx-8 sm:mt-5 sm:flex"
                >
                  {TABS.map(({ id, label, icon: Icon }, index) => {
                    const active = tab === id;
                    return (
                      <motion.button
                        key={id}
                        id={`tab-${id}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={`panel-${id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setTab(id)}
                        onKeyDown={(e) => onTabKeyDown(e, index)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-primary sm:px-4 sm:text-[13px] ${
                          active
                            ? "text-primary"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="profile-tab-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl bg-base-100 shadow-md ring-1 ring-primary/20"
                          />
                        )}
                        <span className="relative z-10 inline-flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5">
                          <Icon className="h-4 w-4" />
                          {label}
                          {id === "security" && !twoFA && (
                            <span
                              aria-label="Action recommended"
                              className="size-1.5 animate-pulse rounded-full bg-warning"
                            />
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>

              <div className="mt-2 flex flex-1 flex-col">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    id={`panel-${tab}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${tab}`}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-1 flex-col"
                  >
                    {tab === "profile" && profileTab}
                    {tab === "security" && securityTab}
                    {tab === "account" && accountTab}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </main>
      </motion.div>

      {twoFAModal.open && (
        <div className="relative z-[80]">
          <TwoFactorModal
            mode={twoFAModal.mode}
            onClose={handleTwoFAModalClose}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmRemovePhoto}
        title="Remove your profile photo?"
        text="Your photo will be deleted and replaced with the default avatar. You can upload a new one anytime."
        confirmLabel="Delete photo"
        busy={isUpdatingAvatar}
        onCancel={() => setConfirmRemovePhoto(false)}
        onConfirm={handleRemovePhoto}
      />

      <ConfirmDialog
        open={confirmRevoke.open}
        title="Sign out this device?"
        text="This device will be signed out immediately. Any unsaved data on that device will be lost."
        confirmLabel="Sign out"
        onCancel={() => setConfirmRevoke({ open: false, sessionId: null })}
        onConfirm={() => handleRevokeSession(confirmRevoke.sessionId)}
      />

      <ConfirmDialog
        open={confirmRevokeOthers}
        title="Sign out of all other devices?"
        text="All other active sessions will be signed out. Your current session will remain active."
        confirmLabel="Sign out all"
        busy={isRevokingOthers}
        onCancel={() => setConfirmRevokeOthers(false)}
        onConfirm={handleRevokeOthers}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard your changes?"
        text="You have unsaved changes to your profile. If you leave now, they'll be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          handleCancel();
          goBack();
        }}
      />
    </MotionConfig>
  );
};

export default ProfilePage;
