import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  AtSign,
  Mail,
  Phone,
  Users,
  Calendar,
  MapPin,
  Globe,
  FileText,
  Check,
  Loader2,
  ChevronDown,
  AlertCircle,
  Lock,
  PencilLine,
} from "lucide-react";
import { FIELDS, BIO_MAX, PROFILE_SPRING } from "../common/ProfileTokens";

const FIELD_ICONS = {
  fullName: User,
  username: AtSign,
  email: Mail,
  phone: Phone,
  gender: Users,
  dob: Calendar,
  location: MapPin,
  website: Globe,
  bio: FileText,
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- Animation variants ---------- */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

/* ---------- Small reusable pieces ---------- */
function FieldError({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-error"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{message}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function BioCounter({ length }) {
  const ratio = Math.min(length / BIO_MAX, 1);
  const over = length > BIO_MAX;
  const warn = ratio >= 0.9 && !over;

  const radius = 9;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          className="stroke-base-300"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={`transition-all duration-300 ${
            over ? "stroke-error" : warn ? "stroke-warning" : "stroke-primary"
          }`}
        />
      </svg>
      <span
        className={`text-[11px] tabular-nums font-medium ${
          over ? "text-error" : warn ? "text-warning" : "text-base-content/50"
        }`}
      >
        {length} / {BIO_MAX}
      </span>
    </div>
  );
}

/* ---------- Main component ---------- */
export default function ProfileEditDrawer({
  isOpen,
  onClose,
  form,
  setForm,
  errors,
  setErrors,
  isDirty,
  onSave,
  isSaving,
  initialFocusField = null,
  onDiscardConfirmRequest = null,
}) {
  const drawerRef = useRef(null);
  const inputRefs = useRef({});

  const handleCloseAttempt = useCallback(() => {
    if (isSaving) return;
    if (isDirty && onDiscardConfirmRequest) {
      onDiscardConfirmRequest();
    } else {
      onClose();
    }
  }, [isSaving, isDirty, onDiscardConfirmRequest, onClose]);

  // Focus requested field when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    const target = initialFocusField || "fullName";
    const timer = setTimeout(() => {
      inputRefs.current[target]?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, initialFocusField]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  // Keyboard: Escape to close, Ctrl/Cmd + S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleCloseAttempt();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isDirty && !isSaving) {
          document.getElementById("profile-edit-form")?.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDirty, isSaving, handleCloseAttempt]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // SSR safety
  if (typeof document === "undefined") return null;

  // Bio is rendered separately below, so skip it here to avoid duplicates
  const regularFields = FIELDS.filter((f) => f.name !== "bio");
  const bioLength = (form.bio || "").length;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          key="profile-edit-drawer"
          className="fixed inset-0 z-[9999] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-drawer-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseAttempt}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={PROFILE_SPRING}
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-base-300 bg-base-100 shadow-2xl focus:outline-hidden"
          >
            {/* Top accent line */}
            <div className="h-1 w-full shrink-0 bg-linear-to-r from-primary via-secondary to-accent" />

            {/* Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 bg-base-100/90 px-4 py-4 backdrop-blur-md sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <PencilLine className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="profile-edit-drawer-title"
                    className="flex items-center gap-2 text-base font-bold text-base-content sm:text-lg"
                  >
                    Edit Profile
                    <AnimatePresence>
                      {isDirty && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="size-2 rounded-full bg-warning"
                          title="Unsaved changes"
                        />
                      )}
                    </AnimatePresence>
                  </h2>
                  <p className="truncate text-xs text-base-content/60">
                    Update your public identity and profile details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAttempt}
                disabled={isSaving}
                className="btn btn-ghost btn-circle btn-sm text-base-content/60 transition-transform hover:rotate-90 hover:text-base-content"
                aria-label="Close edit drawer"
              >
                <X className="size-5" />
              </button>
            </header>

            {/* Form body */}
            <motion.form
              id="profile-edit-form"
              onSubmit={onSave}
              noValidate
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:space-y-5 sm:px-6"
            >
              {regularFields.map((f) => {
                const Icon = FIELD_ICONS[f.name] || User;
                const error = errors[f.name];
                const isReadOnly = f.readOnly;
                const inputId = `drawer-input-${f.name}`;

                return (
                  <motion.div
                    key={f.name}
                    variants={itemVariants}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={inputId}
                        className="flex items-center gap-1 text-xs font-semibold text-base-content/80 sm:text-sm"
                      >
                        <span>{f.label}</span>
                        {f.required && (
                          <span
                            className="font-bold text-error"
                            aria-hidden="true"
                          >
                            *
                          </span>
                        )}
                      </label>
                      {isReadOnly && (
                        <span className="badge badge-ghost badge-sm gap-1 text-[10px] text-base-content/60">
                          <Lock className="size-2.5" />
                          Read-only
                        </span>
                      )}
                    </div>

                    <div className="group relative">
                      <Icon
                        className={`pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 transition-colors ${
                          error
                            ? "text-error"
                            : "text-base-content/40 group-focus-within:text-primary"
                        }`}
                      />

                      {f.type === "select" ? (
                        <div className="relative">
                          <select
                            id={inputId}
                            name={f.name}
                            ref={(el) => (inputRefs.current[f.name] = el)}
                            value={form[f.name] || ""}
                            onChange={handleFieldChange}
                            disabled={isSaving || isReadOnly}
                            aria-invalid={Boolean(error)}
                            className={`select select-bordered w-full rounded-xl bg-base-100 pl-10 pr-9 text-sm font-normal transition-shadow focus:shadow-[0_0_0_3px] focus:shadow-primary/15 disabled:bg-base-200/60 ${
                              error ? "select-error" : ""
                            }`}
                          >
                            <option value="">
                              Select {f.label.toLowerCase()}
                            </option>
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
                        </div>
                      ) : (
                        <input
                          id={inputId}
                          name={f.name}
                          ref={(el) => (inputRefs.current[f.name] = el)}
                          type={f.type}
                          value={form[f.name] || ""}
                          onChange={handleFieldChange}
                          disabled={isSaving || isReadOnly}
                          placeholder={f.placeholder}
                          autoComplete={f.autoComplete}
                          max={f.type === "date" ? todayISO() : undefined}
                          aria-invalid={Boolean(error)}
                          className={`input input-bordered w-full rounded-xl bg-base-100 pl-10 text-sm transition-shadow focus:shadow-[0_0_0_3px] focus:shadow-primary/15 disabled:bg-base-200/60 ${
                            error ? "input-error" : ""
                          }`}
                        />
                      )}
                    </div>

                    <FieldError message={error} />
                  </motion.div>
                );
              })}

              {/* Bio textarea */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="drawer-input-bio"
                    className="flex items-center gap-1 text-xs font-semibold text-base-content/80 sm:text-sm"
                  >
                    <span>Bio / About</span>
                  </label>
                  <BioCounter length={bioLength} />
                </div>

                <div className="group relative">
                  <FileText
                    className={`pointer-events-none absolute left-3.5 top-3.5 size-4 transition-colors ${
                      errors.bio
                        ? "text-error"
                        : "text-base-content/40 group-focus-within:text-primary"
                    }`}
                  />
                  <textarea
                    id="drawer-input-bio"
                    name="bio"
                    ref={(el) => (inputRefs.current.bio = el)}
                    value={form.bio || ""}
                    onChange={handleFieldChange}
                    disabled={isSaving}
                    rows={4}
                    placeholder="A few words about yourself, your hobbies or role…"
                    aria-invalid={Boolean(errors.bio)}
                    className={`textarea textarea-bordered w-full resize-none rounded-xl bg-base-100 pl-10 text-sm leading-relaxed transition-shadow focus:shadow-[0_0_0_3px] focus:shadow-primary/15 ${
                      errors.bio ? "textarea-error" : ""
                    }`}
                  />
                </div>

                <FieldError message={errors.bio} />
              </motion.div>
            </motion.form>

            {/* Footer action bar */}
            <footer className="shrink-0 border-t border-base-300 bg-base-100/95 p-3.5 backdrop-blur-md sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="hidden min-w-0 sm:block">
                  <AnimatePresence mode="wait" initial={false}>
                    {isDirty ? (
                      <motion.p
                        key="dirty"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="flex items-center gap-1.5 text-xs font-medium text-warning"
                      >
                        <span className="size-1.5 rounded-full bg-warning" />
                        Unsaved changes
                      </motion.p>
                    ) : (
                      <motion.p
                        key="clean"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="text-xs text-base-content/50"
                      >
                        No changes yet
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAttempt}
                    disabled={isSaving}
                    className="btn btn-ghost flex-1 rounded-xl font-medium sm:flex-initial"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="profile-edit-form"
                    disabled={isSaving || !isDirty}
                    className="btn btn-primary min-w-[130px] flex-1 gap-2 rounded-xl font-semibold shadow-lg shadow-primary/20 sm:flex-initial"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>Save changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
