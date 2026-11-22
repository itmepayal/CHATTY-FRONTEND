import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Users,
  AtSign,
  FileText,
  Copy,
  ShieldCheck,
  ChevronDown,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";
import ProfileCard from "../common/ProfileCard";
import ProfileAchievementsShowcase from "./ProfileAchievementsShowcase.jsx";
import {
  PROFILE_SPRING,
  PROFILE_SOFT,
  GROUPS,
  FIELD_MAP,
  BIO_MAX,
} from "../common/ProfileTokens";
import { formatDob } from "../../../lib/dobUtils.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Animated Field Error Message
 */
function FieldError({ children }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden text-xs text-error mt-1"
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * Profile Personal Information Section (Tab 1)
 */
export default function ProfileInfoSection({
  formRef,
  form,
  errors,
  isEditing,
  isDirty,
  handleChange,
  handleCancel,
  handleSave,
  isUpdateProfile,
  copyText,
  onEditField = null,
  onNavigateBadges = null,
  onSelectBadge = null,
}) {
  const controlClass = (error) =>
    `w-full rounded-xl border bg-base-100 pl-10 pr-3 py-2.5 text-xs sm:text-sm shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
      error
        ? "border-error focus:ring-4 focus:ring-error/15"
        : "border-base-300 hover:border-base-content/40 focus:border-primary focus:ring-4 focus:ring-primary/15"
    }`;

  const renderField = (name) => {
    const f = FIELD_MAP[name];
    if (!f) return null;
    const Icon = f.icon;
    const error = errors[f.name];

    // View Mode or Read-only Field
    if (!isEditing || f.readOnly) {
      const raw = form[f.name];
      const shown = f.type === "date" ? formatDob(raw) : raw;

      return (
        <div
          key={f.name}
          className="group flex min-w-0 items-start gap-3 rounded-2xl border border-base-300/80 bg-base-200/40 p-3 sm:p-3.5 transition-all hover:border-primary/40 hover:bg-base-200/60"
        >
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
                {f.label}
              </span>
              {f.readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success border border-success/20">
                  <ShieldCheck className="size-3" />
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 break-words text-xs sm:text-sm font-medium text-base-content">
                {shown ? (
                  f.type === "url" ? (
                    <a
                      href={raw}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:underline"
                    >
                      {raw.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    shown
                  )
                ) : (
                  <span className="font-normal text-base-content/40 italic">
                    Not provided
                  </span>
                )}
              </p>
              {f.copyable && shown && (
                <button
                  type="button"
                  onClick={() => copyText(shown, f.label)}
                  aria-label={`Copy ${f.label.toLowerCase()}`}
                  title={`Copy ${f.label.toLowerCase()}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-base-content/40 opacity-100 transition hover:bg-base-300 hover:text-base-content focus-visible:outline-2 focus-visible:outline-primary sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Copy className="size-3.5" />
                </button>
              )}
              {!f.readOnly && onEditField && (
                <button
                  type="button"
                  onClick={() => onEditField(f.name)}
                  aria-label={`Edit ${f.label.toLowerCase()}`}
                  title={`Edit ${f.label.toLowerCase()}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-base-content/40 opacity-100 transition hover:bg-base-300 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Edit Mode Input
    return (
      <div key={f.name} className="min-w-0 space-y-1">
        <label
          htmlFor={f.name}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-base-content/80"
        >
          <span>{f.label}</span>
          {f.required && <span className="text-error font-bold">*</span>}
        </label>

        <div className="group relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-primary" />
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
                <option value="">Select gender</option>
                {f.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
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
              style={f.type === "date" ? { colorScheme: "dark light" } : undefined}
              className={controlClass(error)}
            />
          )}
        </div>

        <FieldError>{error}</FieldError>
      </div>
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSave}
      noValidate
      className="flex flex-1 flex-col gap-5 sm:gap-6"
    >
      {!isEditing && (
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-base-content">
              Personal information
            </h2>
            <p className="text-xs text-base-content/60">
              Review and update your public identity and contact channels
            </p>
          </div>
        </div>
      )}

      {GROUPS.map((group) => (
        <ProfileCard
          key={group.title}
          icon={group.icon}
          title={group.title}
          subtitle={group.hint}
        >
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              isEditing ? "gap-4" : "gap-3"
            }`}
          >
            {group.fields.map(renderField)}
          </div>
        </ProfileCard>
      ))}

      <ProfileCard
        icon={FileText}
        title="About / Bio"
        subtitle="A short biography displayed on your chat profile and contact sheet."
      >
        {isEditing ? (
          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="text-xs sm:text-sm font-medium text-base-content/80"
            >
              Bio summary
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={form.bio}
              onChange={handleChange}
              disabled={isUpdateProfile}
              aria-invalid={!!errors.bio}
              placeholder="Tell people something interesting about yourself..."
              className={`w-full resize-none rounded-xl border bg-base-100 px-4 py-3 text-xs sm:text-sm shadow-sm outline-none transition-all disabled:opacity-60 ${
                errors.bio
                  ? "border-error focus:ring-4 focus:ring-error/15"
                  : "border-base-300 hover:border-base-content/40 focus:border-primary focus:ring-4 focus:ring-primary/15"
              }`}
            />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span role="alert" className="text-error">
                {errors.bio}
              </span>
              <span
                className={`tabular-nums font-medium ${
                  form.bio.length > BIO_MAX ? "text-error" : "text-base-content/50"
                }`}
              >
                {form.bio.length}/{BIO_MAX}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-base-200">
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
          <div className="relative rounded-2xl border border-base-300/80 bg-base-200/40 p-4 sm:p-5">
            <span
              aria-hidden
              className="absolute left-0 top-4 h-[calc(100%-2rem)] w-1 rounded-r-full bg-primary"
            />
            <p className="max-w-prose whitespace-pre-wrap break-words pl-2 text-xs sm:text-sm leading-relaxed text-base-content/90">
              {form.bio || (
                <span className="italic text-base-content/40">
                  No bio added yet. Click Edit profile to add a brief introduction.
                </span>
              )}
            </p>
          </div>
        )}
      </ProfileCard>

      {/* Gamification / Profile Achievements Showcase */}
      {!isEditing && (
        <ProfileAchievementsShowcase
          onNavigateBadges={onNavigateBadges}
          onSelectBadge={onSelectBadge}
        />
      )}

      <AnimatePresence>
        {isEditing && (
          <motion.div
            key="profile-edit-savebar"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={PROFILE_SPRING}
            className="sticky bottom-4 z-20 mx-auto w-full flex items-center justify-between gap-3 rounded-2xl border border-base-300/80 bg-base-100/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="hidden sm:flex items-center gap-2 text-xs text-base-content/70">
              <span
                className={`size-2 rounded-full ${
                  isDirty ? "animate-pulse bg-warning" : "bg-base-300"
                }`}
              />
              <span>
                {isDirty
                  ? "Unsaved changes · Press Ctrl/⌘ + S to save"
                  : "No modifications made"}
              </span>
            </div>

            <div className="flex w-full sm:w-auto items-center justify-end gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="btn btn-ghost btn-sm rounded-xl font-medium flex-1 sm:flex-initial"
                disabled={isUpdateProfile}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary btn-sm rounded-xl font-semibold gap-1.5 shadow-md shadow-primary/25 flex-1 sm:flex-initial"
                disabled={isUpdateProfile || !isDirty}
              >
                {isUpdateProfile ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>{isUpdateProfile ? "Saving..." : "Save changes"}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
