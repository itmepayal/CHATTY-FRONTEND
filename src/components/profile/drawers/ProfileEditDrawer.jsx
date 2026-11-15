import { useEffect, useRef } from "react";
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
} from "lucide-react";
import {
  FIELDS,
  BIO_MAX,
  PROFILE_SPRING,
} from "../common/ProfileTokens";

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

  // Focus requested field when drawer opens
  useEffect(() => {
    if (isOpen) {
      const target = initialFocusField || "fullName";
      const timer = setTimeout(() => {
        if (inputRefs.current[target]) {
          inputRefs.current[target].focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFocusField]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (isDirty && onDiscardConfirmRequest) {
          onDiscardConfirmRequest();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDirty, onClose, onDiscardConfirmRequest]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty && onDiscardConfirmRequest) {
      onDiscardConfirmRequest();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-drawer-title"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleCloseAttempt}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <motion.div
          ref={drawerRef}
          initial={{ x: "100%", opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={PROFILE_SPRING}
          className="relative z-10 flex h-full w-full max-w-lg flex-col bg-base-100 border-l border-base-300 shadow-2xl focus:outline-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base-300 px-4 sm:px-6 py-3.5 sm:py-4.5 bg-base-100/90 backdrop-blur-md">
            <div>
              <h2
                id="profile-edit-drawer-title"
                className="text-base sm:text-lg font-bold text-base-content"
              >
                Edit Profile
              </h2>
              <p className="text-xs text-base-content/60">
                Update your public identity and profile details
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
              aria-label="Close edit drawer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form body */}
          <form
            id="profile-edit-form"
            onSubmit={onSave}
            noValidate
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5"
          >
            {FIELDS.map((f) => {
              const Icon = FIELD_ICONS[f.name] || User;
              const error = errors[f.name];
              const isReadOnly = f.readOnly;

              return (
                <div key={f.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`drawer-input-${f.name}`}
                      className="text-xs sm:text-sm font-medium text-base-content/80 flex items-center gap-1"
                    >
                      <span>{f.label}</span>
                      {f.required && (
                        <span className="text-error font-bold" aria-hidden="true">
                          *
                        </span>
                      )}
                    </label>
                    {isReadOnly && (
                      <span className="badge badge-neutral badge-xs text-[10px]">
                        Read-only
                      </span>
                    )}
                  </div>

                  <div className="relative group">
                    <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-base-content/40 group-focus-within:text-primary transition-colors" />
                    {f.type === "select" ? (
                      <div className="relative">
                        <select
                          id={`drawer-input-${f.name}`}
                          name={f.name}
                          ref={(el) => (inputRefs.current[f.name] = el)}
                          value={form[f.name] || ""}
                          onChange={handleFieldChange}
                          disabled={isSaving || isReadOnly}
                          className={`select select-bordered select-sm w-full pl-10 pr-9 rounded-xl text-xs sm:text-sm font-normal bg-base-100 ${
                            error ? "select-error" : ""
                          }`}
                        >
                          <option value="">Select {f.label.toLowerCase()}</option>
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
                      </div>
                    ) : (
                      <input
                        id={`drawer-input-${f.name}`}
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
                        className={`input input-bordered input-sm w-full pl-10 rounded-xl text-xs sm:text-sm bg-base-100 ${
                          error ? "input-error" : ""
                        }`}
                      />
                    )}
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="text-xs text-error flex items-center gap-1 mt-1 font-medium"
                    >
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}
                </div>
              );
            })}

            {/* Bio textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="drawer-input-bio"
                  className="text-xs sm:text-sm font-medium text-base-content/80 flex items-center gap-1"
                >
                  <FileText className="size-3.5" />
                  <span>Bio / About</span>
                </label>
                <span
                  className={`text-[11px] tabular-nums ${
                    (form.bio || "").length > BIO_MAX
                      ? "text-error font-bold"
                      : "text-base-content/50"
                  }`}
                >
                  {(form.bio || "").length} / {BIO_MAX}
                </span>
              </div>
              <textarea
                id="drawer-input-bio"
                name="bio"
                ref={(el) => (inputRefs.current.bio = el)}
                value={form.bio || ""}
                onChange={handleFieldChange}
                disabled={isSaving}
                rows={3}
                placeholder="A few words about yourself, your hobbies or role…"
                className={`textarea textarea-bordered w-full rounded-xl text-xs sm:text-sm resize-none bg-base-100 ${
                  errors.bio ? "textarea-error" : ""
                }`}
              />
              {errors.bio && (
                <p
                  role="alert"
                  className="text-xs text-error flex items-center gap-1 mt-1 font-medium"
                >
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{errors.bio}</span>
                </p>
              )}
            </div>
          </form>

          {/* Footer action bar */}
          <div className="border-t border-base-300 p-3.5 sm:p-4 bg-base-200/50 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleCloseAttempt}
              disabled={isSaving}
              className="btn btn-ghost btn-sm rounded-xl font-medium flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="profile-edit-form"
              disabled={isSaving || !isDirty}
              className="btn btn-primary btn-sm rounded-xl font-semibold gap-2 shadow-xs flex-1 sm:flex-initial min-w-[100px]"
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
