import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
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
  Eye,
  EyeOff,
  FileText,
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
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

/* ------------------------------------------------------------------ */
/*  Motion presets (Settings page jaise hi)                            */
/* ------------------------------------------------------------------ */
const SPRING = { type: "spring", stiffness: 420, damping: 32 };
const SOFT = { type: "spring", stiffness: 260, damping: 28 };

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: SOFT },
};
const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
const dialogVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } },
};

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const FIELDS = [
  {
    name: "fullName",
    label: "Full name",
    icon: User,
    type: "text",
    placeholder: "Your full name",
    required: true,
  },
  {
    name: "username",
    label: "Username",
    icon: AtSign,
    type: "text",
    placeholder: "username",
  },
  { name: "email", label: "Email", icon: Mail, type: "email", readOnly: true },
  {
    name: "phone",
    label: "Phone",
    icon: Phone,
    type: "tel",
    placeholder: "+91 98765 43210",
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
  },
];

const FIELD_MAP = Object.fromEntries(FIELDS.map((f) => [f.name, f]));

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

// Backend allows 6-15 characters; the meter only helps users pick a good one.
const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
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

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
const InfoRow = ({ icon: Icon, children }) => (
  <motion.li
    variants={itemVariants}
    className="flex min-w-0 items-center gap-3 text-sm"
  >
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-base-100">
      <Icon className="h-4 w-4 text-primary" />
    </span>
    <span className="truncate">{children}</span>
  </motion.li>
);

const SectionTitle = ({ icon: Icon, title, hint, tone = "primary" }) => (
  <div className="mb-4 flex items-start gap-3">
    <motion.span
      initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={SPRING}
      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
        tone === "error" ? "bg-error/15" : "bg-primary/15"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${tone === "error" ? "text-error" : "text-primary"}`}
      />
    </motion.span>
    <div>
      <h3 className="text-base font-semibold leading-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-base-content/60">{hint}</p>}
    </div>
  </div>
);

// Panel stagger me aate hain (parent par variants=listVariants chahiye)
const Panel = ({ children }) => (
  <motion.section variants={itemVariants} className="px-6 py-6 sm:px-8">
    {children}
  </motion.section>
);

// Custom switch (Settings page wala) - knob layout animation se slide hota hai
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

const ToggleRow = ({
  title,
  desc,
  checked,
  onChange,
  icon: Icon,
  disabled,
}) => (
  <motion.div
    whileHover={{ y: -1 }}
    transition={SOFT}
    className="flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-100/70 p-4"
  >
    <div className="flex min-w-0 items-start gap-3">
      {Icon && (
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-base-200">
          <Icon className="h-4 w-4 text-primary" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-1 text-xs leading-snug text-base-content/60">{desc}</p>
      </div>
    </div>
    <Toggle
      checked={checked}
      onChange={onChange}
      label={title}
      disabled={disabled}
    />
  </motion.div>
);

/* shared input look: readable in view mode, clear border in edit mode */
const controlClass = (error, editable) =>
  `w-full rounded-xl pl-10 pr-3 py-3 text-sm border outline-none transition-colors
   disabled:text-base-content disabled:opacity-100 disabled:cursor-default
   ${
     error
       ? "border-error bg-base-100"
       : editable
         ? "bg-base-100 border-base-content/20 hover:border-base-content/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
         : "bg-base-100/70 border-base-content/10"
   }`;

const FieldError = ({ children }) => (
  <AnimatePresence initial={false}>
    {children && (
      <motion.p
        key="err"
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
}) => (
  <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium text-base-content/80">
      {label}
    </label>
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={15}
        className={`${controlClass(error, true)} pr-11`}
      />
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.88 }}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline focus-visible:outline-primary"
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

// Confirm dialog (revoke session etc.) - animated, page level par render hota hai
const ConfirmDialog = ({
  open,
  title,
  text,
  onCancel,
  onConfirm,
  confirmLabel,
  busy,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={onCancel}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <motion.div
          variants={dialogVariants}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="w-full max-w-sm rounded-2xl border border-base-content/10 bg-base-200 p-6 shadow-2xl"
        >
          <h3 className="mb-2 text-base font-bold">{title}</h3>
          <p className="mb-5 text-sm text-base-content/60">{text}</p>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onCancel}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onConfirm}
              disabled={busy}
              className="btn btn-error flex-1"
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
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
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  const [tab, setTab] = useState("profile");

  /* avatar state */
  const [selectedImg, setSelectedImg] = useState(null);
  const [file, setFile] = useState(null);

  /* form state */
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(authUser));
  const [errors, setErrors] = useState({});

  /* password state */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [pwErrors, setPwErrors] = useState({});

  // ── 2FA / security ────────────────────────────────────────────────────────
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
  } = useSecurityStore();

  // IMPORTANT: twoFactorEnabled / loginAlerts are returned by /auth/check,
  // but NOT by /users/me. fetchCurrentUser() replaces authUser with the
  // /users/me response, which wiped these flags and made the "Enable" button
  // show even when 2FA was already on. So we keep them in local state and
  // refresh them straight from /auth/check.
  const [twoFA, setTwoFA] = useState(authUser?.twoFactorEnabled ?? false);
  const [loginAlerts, setLoginAlerts] = useState(authUser?.loginAlerts ?? true);

  const refreshSecurityFlags = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/auth/check", {
        withCredentials: true,
      });
      const data = res?.data?.data?.user ?? res?.data?.data;
      if (typeof data?.twoFactorEnabled === "boolean") {
        setTwoFA(data.twoFactorEnabled);
      }
      if (typeof data?.loginAlerts === "boolean") {
        setLoginAlerts(data.loginAlerts);
      }
    } catch (err) {
      console.error("Refresh security flags error:", err);
    }
  }, []);

  // Only adopt values from authUser when they are actually present
  useEffect(() => {
    if (typeof authUser?.twoFactorEnabled === "boolean") {
      setTwoFA(authUser.twoFactorEnabled);
    }
  }, [authUser?.twoFactorEnabled]);

  useEffect(() => {
    if (typeof authUser?.loginAlerts === "boolean") {
      setLoginAlerts(authUser.loginAlerts);
    }
  }, [authUser?.loginAlerts]);

  /* account state */
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteUseRecovery, setDeleteUseRecovery] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const initialForm = useMemo(() => buildInitialForm(authUser), [authUser]);
  const isDirty = useMemo(
    () => Object.keys(form).some((k) => form[k] !== initialForm[k]),
    [form, initialForm],
  );

  // Load full profile + real security flags on mount
  useEffect(() => {
    fetchCurrentUser();
    refreshSecurityFlags();
  }, [fetchCurrentUser, refreshSecurityFlags]);

  // Fetch real sessions + fresh security flags when the security tab opens
  useEffect(() => {
    if (tab === "security") {
      fetchSessions();
      refreshSecurityFlags();
    }
  }, [tab, fetchSessions, refreshSecurityFlags]);

  // Listen for server-side session events (from another device)
  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener("chatty:session-revoked", handler);
    window.addEventListener("chatty:sessions-changed", handler);
    return () => {
      window.removeEventListener("chatty:session-revoked", handler);
      window.removeEventListener("chatty:sessions-changed", handler);
    };
  }, [fetchSessions]);

  // Handle server-pushed account:deleted (e.g., deletion confirmed via socket)
  useEffect(() => {
    if (!socket) return;
    const handleAccountDeleted = () => {
      navigate("/login", { replace: true });
    };
    socket.on("account:deleted", handleAccountDeleted);
    return () => socket.off("account:deleted", handleAccountDeleted);
  }, [socket, navigate]);

  useEffect(() => {
    if (!isEditing) setForm(initialForm);
  }, [initialForm, isEditing]);

  // Page khula hai to peeche wali app scroll na ho (Settings jaisa)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Back: pehli entry ho to home par, warna history back
  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  }, [location.key, navigate]);

  // Esc dabane par wapas (input/modal khula ho to nahi)
  const anyDialogOpen =
    twoFAModal.open || confirmRevoke.open || confirmRevokeOthers;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || anyDialogOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, anyDialogOpen]);

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
    ).map((f) => f.label);
    if (!initialForm.bio.trim()) list.push("Bio");
    if (!authUser?.avatar) list.push("Photo");
    return list;
  }, [initialForm, authUser]);

  const memberSince = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const currentTab = TABS.find((t) => t.id === tab);

  /* password strength */
  const passedRules = PASSWORD_RULES.filter((r) => r.test(pw.next));
  const strength = pw.next ? passedRules.length : 0;

  /* ---------------------------- avatar ---------------------------- */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeMB = 2;

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only JPG, PNG, and WEBP formats are allowed.");
      return;
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast.error("File size should be under 2MB.");
      return;
    }

    if (selectedImg) URL.revokeObjectURL(selectedImg);
    setFile(selectedFile);
    setSelectedImg(URL.createObjectURL(selectedFile));
  };

  const cancelAvatar = () => {
    if (selectedImg) URL.revokeObjectURL(selectedImg);
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

  /* ------------------------- form handlers ------------------------- */
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
      const { email, ...payload } = form;
      await updateProfile(payload);
      setIsEditing(false);
    } catch (err) {
      console.error("Update profile error:", err);
    }
  };

  /* ----------------------- security handlers ----------------------- */
  const setPwField = (key) => (e) => {
    setPw((p) => ({ ...p, [key]: e.target.value }));
    if (pwErrors[key]) setPwErrors((p) => ({ ...p, [key]: "" }));
  };

  const togglePwShow = (key) => () =>
    setPwShow((p) => ({ ...p, [key]: !p[key] }));

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation (mirrors backend rules)
    const next = {};
    if (!pw.current) next.current = "Enter your current password";
    if (!pw.next) next.next = "Enter a new password";
    else if (pw.next.length < 6) next.next = "Use at least 6 characters";
    else if (pw.next.length > 15) next.next = "Maximum 15 characters";
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
      // Only clear form after confirmed backend success
      setPw({ current: "", next: "", confirm: "" });
      setPwShow({ current: false, next: false, confirm: false });
      setPwErrors({});
    } catch (err) {
      // Store already toasted the error. Surface server-specific messages
      // inline when the field can be inferred from the error text.
      const msg = err?.response?.data?.message ?? "";
      if (/current password/i.test(msg)) {
        setPwErrors((p) => ({ ...p, current: msg }));
      } else if (/match|confirm/i.test(msg)) {
        setPwErrors((p) => ({ ...p, confirm: msg }));
      } else if (/different|same/i.test(msg)) {
        setPwErrors((p) => ({ ...p, next: msg }));
      }
      // Do NOT clear the form — preserve input so the user can correct it
    }
  };

  const handleLoginAlertsToggle = async (enabled) => {
    // Optimistic UI
    setLoginAlerts(enabled);
    const ok = await updateLoginAlerts(enabled);
    if (!ok) {
      // Revert on failure
      setLoginAlerts(!enabled);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setConfirmRevoke({ open: false, sessionId: null });
    await revokeSession(sessionId);
  };

  const handleRevokeOthers = async () => {
    setConfirmRevokeOthers(false);
    await revokeOtherSessions();
  };

  // When the 2FA modal closes (after enable OR disable), re-read the real
  // twoFactorEnabled value from the server so the button flips correctly.
  const handleTwoFAModalClose = useCallback(() => {
    setTwoFAModal({ open: false, mode: "setup" });
    refreshSecurityFlags();
    fetchCurrentUser();
  }, [refreshSecurityFlags, fetchCurrentUser]);

  const handleDeleteAccount = async () => {
    // Prevent duplicate submissions
    if (isDeletingAccount) return;

    // Client-side guard: button should already be disabled, but double-check
    if (deleteText.trim() !== "DELETE") {
      setDeleteError("Type DELETE exactly to confirm.");
      return;
    }
    if (!deletePassword) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleteError("");

    try {
      await deleteAccount({
        password: deletePassword,
        // twoFA (local, always fresh) use kiya; authUser flag /users/me se wipe ho jaata hai
        ...(twoFA && deleteCode
          ? { code: deleteCode.trim(), useRecoveryCode: deleteUseRecovery }
          : {}),
      });
      // On success, authUser becomes null → App.jsx redirects to /login automatically
    } catch (err) {
      // Store already toasted the error; display it inline as well
      const msg =
        err?.response?.data?.message || "Deletion failed. Please try again.";
      setDeleteError(msg);
      // Preserve deletePassword so user can retry without re-entering (do NOT log it)
    }
  };

  /* ---------------------------- UI pieces ---------------------------- */
  const renderField = (name) => {
    const f = FIELD_MAP[name];
    const Icon = f.icon;
    const disabled = !isEditing || f.readOnly || isUpdateProfile;
    const error = errors[f.name];
    const editable = !disabled;

    return (
      <div key={f.name} className="min-w-0 space-y-1.5">
        <label
          htmlFor={f.name}
          className="flex items-center gap-1.5 text-sm font-medium text-base-content/80"
        >
          {f.label}
          <AnimatePresence initial={false}>
            {f.required && isEditing && (
              <motion.span
                key="req"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={SPRING}
                className="text-error"
              >
                *
              </motion.span>
            )}
          </AnimatePresence>
          {f.readOnly && (
            <span title="Verified" className="inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
            </span>
          )}
        </label>

        <div className="relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
          {f.type === "select" ? (
            <select
              id={f.name}
              name={f.name}
              value={form[f.name]}
              onChange={handleChange}
              disabled={disabled}
              className={controlClass(error, editable)}
            >
              <option value="">Select</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              value={form[f.name]}
              onChange={handleChange}
              disabled={disabled}
              placeholder={
                disabled && !form[f.name] ? "Not added" : f.placeholder
              }
              max={
                f.type === "date"
                  ? new Date().toISOString().slice(0, 10)
                  : undefined
              }
              className={controlClass(error, editable)}
            />
          )}
        </div>

        <FieldError>{error}</FieldError>
      </div>
    );
  };

  /* ---------------------------- tab contents ---------------------------- */
  const profileTab = (
    <form onSubmit={handleSave} className="flex flex-1 flex-col">
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="flex-1 divide-y divide-base-content/10"
      >
        {GROUPS.map((g) => (
          <Panel key={g.title}>
            <SectionTitle icon={g.icon} title={g.title} hint={g.hint} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              disabled={!isEditing || isUpdateProfile}
              placeholder={
                !isEditing && !form.bio
                  ? "Not added"
                  : "Tell people something about you..."
              }
              className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors
                disabled:cursor-default disabled:text-base-content disabled:opacity-100
                ${
                  errors.bio
                    ? "border-error bg-base-100"
                    : isEditing
                      ? "border-base-content/20 bg-base-100 hover:border-base-content/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      : "border-base-content/10 bg-base-100/70"
                }`}
            />
            <div className="flex justify-between text-xs">
              <span className="text-error">{errors.bio}</span>
              <AnimatePresence initial={false}>
                {isEditing && (
                  <motion.span
                    key="count"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    className={
                      form.bio.length > BIO_MAX
                        ? "text-error"
                        : "text-base-content/50"
                    }
                  >
                    {form.bio.length}/{BIO_MAX}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
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
            className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-2xl border-t border-base-content/10 bg-base-300/95 px-6 py-4 backdrop-blur sm:px-8"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={isDirty ? "dirty" : "clean"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-base-content/60"
              >
                {isDirty ? "You have unsaved changes." : "No changes yet."}
              </motion.p>
            </AnimatePresence>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="btn btn-ghost btn-sm"
                disabled={isUpdateProfile}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary btn-sm gap-2"
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

  const securityTab = (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex-1 divide-y divide-base-content/10"
    >
      {/* change password */}
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
            />
          </div>

          {/* strength meter */}
          <div className="rounded-xl border border-base-content/10 bg-base-100/70 p-4">
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
              className="btn btn-primary btn-sm gap-2"
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

      {/* extra protection */}
      <Panel>
        <SectionTitle
          icon={ShieldCheck}
          title="Extra protection"
          hint="Add more layers so only you can get in."
        />
        <div className="space-y-3">
          {/* Two-step verification — reflects the real server-side state */}
          <motion.div
            whileHover={{ y: -1 }}
            transition={SOFT}
            className="flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-100/70 p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-base-200">
                <Smartphone className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  Two-step verification
                </p>
                <p className="mt-1 text-xs leading-snug text-base-content/60">
                  Ask for a code from your authenticator app when you sign in.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
                    <span className="badge badge-success badge-sm hidden sm:inline-flex">
                      Enabled
                    </span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setTwoFAModal({ open: true, mode: "disable" })
                      }
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
                    onClick={() => setTwoFAModal({ open: true, mode: "setup" })}
                    className="btn btn-primary btn-sm gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Enable
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Login alerts toggle — persisted to backend */}
          <ToggleRow
            icon={Bell}
            title="Login alerts"
            desc="Email me when someone signs in from a new device."
            checked={loginAlerts}
            onChange={handleLoginAlertsToggle}
            disabled={loginAlertsLoading}
          />
        </div>
      </Panel>

      {/* sessions */}
      <Panel>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15">
              <Monitor className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-tight">
                Where you're signed in
              </h3>
              <p className="mt-0.5 text-xs text-base-content/60">
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
                disabled={isRevokingOthers}
                className="btn btn-outline btn-sm gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                Sign out all others
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Loading skeleton */}
        {sessionsLoading && (
          <ul className="space-y-2.5">
            {[1, 2].map((i) => (
              <li
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-xl border border-base-content/10 bg-base-100/70 p-3.5"
              >
                <span className="size-10 shrink-0 rounded-xl bg-base-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 rounded bg-base-300" />
                  <div className="h-2.5 w-24 rounded bg-base-300" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Error state */}
        {sessionsError && !sessionsLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SOFT}
            className="flex flex-col items-center gap-3 rounded-xl border border-error/30 bg-error/5 p-6 text-center"
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

        {/* Empty state */}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SOFT}
            className="rounded-xl border border-base-content/10 bg-base-100/50 p-6 text-center"
          >
            <Monitor className="mx-auto mb-2 h-8 w-8 text-base-content/30" />
            <p className="text-sm text-base-content/60">
              No active sessions found.
            </p>
          </motion.div>
        )}

        {/* Real sessions list */}
        {!sessionsLoading && !sessionsError && sessions.length > 0 && (
          <motion.ul layout className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {sessions.map((x, idx) => {
                const DeviceIcon =
                  x.deviceType === "mobile"
                    ? Smartphone
                    : x.deviceType === "tablet"
                      ? Laptop
                      : Monitor;
                const isRevoking = revokingId === String(x.id);

                return (
                  <motion.li
                    key={x.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { ...SOFT, delay: idx * 0.05 },
                    }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    whileHover={{ y: -1 }}
                    className="flex items-center gap-3 rounded-xl border border-base-content/10 bg-base-100/70 p-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-base-200">
                      <DeviceIcon className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium leading-tight">
                        <span className="truncate">{x.device}</span>
                        {x.current && (
                          <span className="badge badge-success badge-sm">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="mt-1 truncate text-xs text-base-content/60">
                        {x.location} · {x.lastActiveLabel}
                      </p>
                    </div>
                    {!x.current && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() =>
                          setConfirmRevoke({
                            open: true,
                            sessionId: String(x.id),
                          })
                        }
                        disabled={isRevoking}
                        className="btn btn-ghost btn-sm text-error"
                      >
                        {isRevoking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Sign out"
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
      className="flex-1 divide-y divide-base-content/10"
    >
      <Panel>
        <SectionTitle
          icon={TriangleAlert}
          tone="error"
          title="Delete account"
          hint="This removes your profile, messages and photos for good."
        />
        <div className="rounded-xl border border-error/30 bg-error/5 p-4">
          <p className="text-sm leading-relaxed text-base-content/80">
            Once you delete your account, you can't get it back. Your chats will
            be removed from other people's lists too.
          </p>

          <div className="mt-4 max-w-sm space-y-3">
            {/* Step 1: type DELETE */}
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
                className="w-full rounded-xl border border-base-content/20 bg-base-100 px-4 py-3 text-sm outline-none transition-colors hover:border-base-content/40 focus:border-error focus:ring-2 focus:ring-error/20 disabled:opacity-50"
              />
            </div>

            {/* Step 2: current password */}
            <div className="space-y-1.5">
              <label
                htmlFor="delete-password"
                className="text-sm font-medium text-base-content/80"
              >
                Your password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
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
                  className="w-full rounded-xl border border-base-content/20 bg-base-100 py-3 pl-10 pr-4 text-sm outline-none transition-colors hover:border-base-content/40 focus:border-error focus:ring-2 focus:ring-error/20 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Step 3: 2FA (only shown when twoFactorEnabled) */}
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
                  <div className="space-y-2 rounded-xl border border-base-content/10 bg-base-100/70 p-3">
                    <p className="text-xs font-medium text-base-content/70">
                      Two-step verification required
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={deleteCode}
                      onChange={(e) => {
                        setDeleteCode(e.target.value);
                        setDeleteError("");
                      }}
                      placeholder={
                        deleteUseRecovery
                          ? "Recovery code"
                          : "6-digit authenticator code"
                      }
                      autoComplete="one-time-code"
                      disabled={isDeletingAccount}
                      maxLength={deleteUseRecovery ? 12 : 6}
                      className="w-full rounded-xl border border-base-content/20 bg-base-100 px-4 py-2.5 text-sm outline-none transition-colors focus:border-error focus:ring-2 focus:ring-error/20 disabled:opacity-50"
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-base-content/60">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={deleteUseRecovery}
                        onChange={(e) => setDeleteUseRecovery(e.target.checked)}
                        disabled={isDeletingAccount}
                      />
                      Use a recovery code instead
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline error */}
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
            className="btn btn-error btn-sm mt-4 gap-2"
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

  /* ------------------------------ page ----------------------------- */
  return (
    <MotionConfig reducedMotion="user">
      {/* Full-screen layer: global Navbar ke upar aata hai, isliye navbar nahi dikhta.
          layoutRoot + layoutScroll: fixed + scroll container ke andar layout
          animations (tab pill) sahi jagah par chalte hain. */}
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200"
      >
        {/* floating colour blobs (slow loop) */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
            animate={
              prefersReduced ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }
            }
            transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
            animate={
              prefersReduced ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }
            }
            transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
          />
        </div>

        {/* Header: Back button (Settings wala) + title (notch-safe) */}
        <motion.header
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SOFT}
          className="sticky top-0 z-20 border-b border-base-300 bg-base-100/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        >
          <div className="container mx-auto flex h-16 items-center gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
            <motion.button
              type="button"
              onClick={goBack}
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.92 }}
              aria-label="Go back"
              title="Back (Esc)"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-primary sm:size-10"
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
              <h1 className="truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                My profile
              </h1>
              <p className="hidden truncate text-xs text-base-content/60 sm:block">
                Manage your details, security and account
              </p>
            </div>
          </div>
        </motion.header>

        <main className="container relative mx-auto pb-[max(3rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-5 sm:pt-6">
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* ============================ LEFT ============================ */}
            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={SOFT}
              className="flex flex-col self-start overflow-hidden rounded-2xl bg-base-300 shadow-lg lg:sticky lg:top-24"
            >
              {/* banner */}
              <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/40 via-secondary/25 to-accent/30">
                <motion.div
                  className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-2xl"
                  animate={prefersReduced ? undefined : { scale: [1, 1.25, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 7,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex flex-1 flex-col px-6 pb-6"
              >
                {/* avatar */}
                <motion.div
                  variants={itemVariants}
                  className="-mt-16 flex justify-center"
                >
                  <div className="relative">
                    <motion.img
                      key={selectedImg || authUser?.avatar || "default"}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING}
                      whileHover={{ scale: 1.03 }}
                      src={selectedImg || authUser?.avatar || "/avatar.png"}
                      alt="Profile"
                      className="size-32 rounded-full bg-base-200 object-cover ring-4 ring-base-300"
                    />
                    <motion.label
                      htmlFor="avatar-upload"
                      whileHover={{ scale: 1.12, rotate: 8 }}
                      whileTap={{ scale: 0.9 }}
                      transition={SPRING}
                      className={`absolute bottom-1 right-1 cursor-pointer rounded-full bg-primary p-2 text-primary-content shadow-md ${
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
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={isUpdatingAvatar}
                        ref={fileInputRef}
                      />
                    </motion.label>
                  </div>
                </motion.div>

                {/* identity */}
                <motion.div
                  variants={itemVariants}
                  className="mt-4 text-center"
                >
                  <h2 className="text-2xl font-semibold leading-tight">
                    {initialForm.fullName || "Your name"}
                  </h2>
                  <p className="mt-0.5 text-sm text-base-content/60">
                    {initialForm.username
                      ? `@${initialForm.username}`
                      : "No username yet"}
                  </p>
                  {initialForm.bio && (
                    <p className="mt-3 text-sm leading-relaxed text-base-content/80">
                      {initialForm.bio}
                    </p>
                  )}
                </motion.div>

                {/* avatar confirm */}
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
                      <div className="mt-5 rounded-xl border border-base-content/10 bg-base-100 p-3">
                        <p className="mb-2.5 text-center text-sm text-base-content/70">
                          Use this as your profile photo?
                        </p>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={cancelAvatar}
                            className="btn btn-ghost btn-sm flex-1"
                            disabled={isUpdatingAvatar}
                          >
                            <X className="h-4 w-4" /> Cancel
                          </motion.button>
                          <motion.button
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

                {/* remove photo */}
                <AnimatePresence initial={false}>
                  {!selectedImg && authUser?.avatar && (
                    <motion.button
                      key="remove-photo"
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={deleteAvatar}
                      disabled={isUpdatingAvatar}
                      className="btn btn-ghost btn-sm mx-auto mt-4 gap-2 text-error"
                    >
                      <Trash2 className="h-4 w-4" /> Remove photo
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* quick facts */}
                <motion.ul variants={listVariants} className="mt-6 space-y-3">
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

                {/* completion */}
                <motion.div
                  variants={itemVariants}
                  className="mt-6 flex items-center gap-4 rounded-xl bg-base-100 p-4"
                >
                  <div
                    className="radial-progress shrink-0 text-sm font-semibold text-primary"
                    style={{
                      "--value": completion,
                      "--size": "3.75rem",
                      "--thickness": "5px",
                    }}
                    role="progressbar"
                    aria-valuenow={completion}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Profile completion"
                  >
                    {completion}%
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      Profile completion
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-base-content/60">
                      {missing.length
                        ? `Still to add: ${missing.join(", ")}.`
                        : "Your profile is complete."}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.aside>

            {/* ============================ RIGHT =========================== */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={SOFT}
              className="flex min-w-0 flex-col rounded-2xl bg-base-300 shadow-lg"
            >
              {/* header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-content/10 px-6 py-5 sm:px-8">
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
                      <h2 className="text-xl font-semibold">
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
                      className="btn btn-primary btn-sm gap-2"
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

              {/* tabs - sliding pill (layoutId) */}
              <LayoutGroup id="profile-tabs">
                <div
                  role="tablist"
                  aria-label="Profile sections"
                  className="mx-6 mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-base-content/10 bg-base-100/50 p-1.5 sm:mx-8 sm:flex"
                >
                  {TABS.map(({ id, label, icon: Icon }) => {
                    const active = tab === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(id)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium focus-visible:outline focus-visible:outline-primary ${
                          active
                            ? "text-primary"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="profile-tab-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl bg-base-100 shadow-sm ring-1 ring-base-content/10"
                          />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>

              {/* content */}
              <div className="mt-2 flex flex-1 flex-col">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    role="tabpanel"
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

      {/* ── Dialogs: page level par, taaki transform wale parent se fixed na toote ── */}
      {twoFAModal.open && (
        <TwoFactorModal
          mode={twoFAModal.mode}
          onClose={handleTwoFAModalClose}
        />
      )}

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
    </MotionConfig>
  );
};

export default ProfilePage;
