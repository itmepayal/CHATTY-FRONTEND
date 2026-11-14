import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Trash2,
  Check,
  X,
  Copy,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  Lock,
  Monitor,
  Loader2,
  Plus,
} from "lucide-react";
import {
  PROFILE_SPRING,
  PROFILE_SOFT,
  PROFILE_VARIANTS,
  AVATAR_TYPES,
} from "../common/ProfileTokens";

/**
 * Avatar SVG Completion Ring
 */
function AvatarRing({ value = 0, dragging = false, children }) {
  const r = 66;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-32 sm:size-36">
      <div
        aria-hidden
        className="absolute inset-2 rounded-full bg-primary/25 blur-xl pointer-events-none"
      />
      <svg
        viewBox="0 0 144 144"
        className="absolute inset-0 size-full -rotate-90 pointer-events-none"
        aria-hidden
      >
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          strokeWidth="4.5"
          className="stroke-base-300"
        />
        <motion.circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          strokeWidth="4.5"
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
}

/**
 * Single Stat Tile
 */
function StatTile({ icon: Icon, value, label, tone = "" }) {
  return (
    <div className="group min-w-0 rounded-2xl bg-base-200/60 p-2.5 sm:p-3 text-center border border-base-300/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40">
      <Icon className="mx-auto mb-1 size-4 text-base-content/40 transition-colors group-hover:text-primary" />
      <p
        className={`text-base sm:text-lg font-bold leading-none tabular-nums text-base-content ${tone}`}
      >
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11px] text-base-content/60 font-medium">
        {label}
      </p>
    </div>
  );
}

/**
 * Sidebar Quick Info Item
 */
function QuickInfoRow({ icon: Icon, children }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-xs sm:text-sm text-base-content/80">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </li>
  );
}

/**
 * Left Profile Card & Sidebar Component
 */
export default function ProfileSidebar({
  authUser,
  form,
  selectedImg,
  isDragging,
  setIsDragging,
  handleDrop,
  fileInputRef,
  handleFileChange,
  cancelAvatar,
  handleImageUpload,
  onOpenRemovePhotoConfirm,
  hasSavedAvatar,
  isUpdatingAvatar,
  completion,
  missing,
  securityScore,
  securityLevel,
  sessionsCount,
  twoFA,
  memberSince,
  onMissingClick,
  copyText,
  className = "",
}) {
  return (
    <aside
      className={`rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-sm transition-all overflow-hidden flex flex-col ${className}`}
    >
      {/* Hero Header Mesh Banner */}
      <div className="relative h-28 sm:h-32 shrink-0 overflow-hidden bg-gradient-to-br from-primary/30 via-base-300/60 to-base-200">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-8 -top-10 size-40 rounded-full bg-primary/20 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-12 -left-8 size-40 rounded-full bg-accent/20 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-base-100 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-5 sm:px-6 sm:pb-6">
        {/* Avatar Container with Overlapping Progress Ring */}
        <div className="-mt-16 sm:-mt-18 flex justify-center">
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
                key={selectedImg || authUser?.avatar || "default-avatar"}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={PROFILE_SPRING}
                src={selectedImg || authUser?.avatar || "/avatar.png"}
                alt="Profile Avatar"
                className="size-full rounded-full bg-base-200 object-cover shadow-xl ring-4 ring-base-100"
              />
            </AvatarRing>

            {/* Profile Completion Badge */}
            <span
              className="absolute bottom-1 left-0 rounded-full bg-base-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary shadow-sm border border-base-300/80"
              title="Profile completion rate"
            >
              {completion}%
            </span>

            {/* Remove Photo Button */}
            <AnimatePresence>
              {hasSavedAvatar && (
                <motion.button
                  key="remove-avatar-btn"
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={PROFILE_SPRING}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onOpenRemovePhotoConfirm}
                  disabled={isUpdatingAvatar}
                  aria-label="Remove profile photo"
                  title="Remove photo"
                  className="absolute right-0 top-0 grid size-8 sm:size-9 place-items-center rounded-full bg-error text-error-content shadow-md ring-3 ring-base-100 focus-visible:outline-2 focus-visible:outline-error disabled:opacity-60"
                >
                  <Trash2 className="size-3.5 sm:size-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Upload New Photo Button */}
            <motion.label
              htmlFor="avatar-file-upload-input"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08 }}
              transition={PROFILE_SPRING}
              className={`absolute bottom-0 right-0 grid size-8 sm:size-9 cursor-pointer place-items-center rounded-full bg-primary text-primary-content shadow-md shadow-primary/30 ring-3 ring-base-100 focus-within:outline-2 focus-within:outline-primary ${
                isUpdatingAvatar ? "pointer-events-none animate-pulse" : ""
              }`}
              title="Upload new photo"
            >
              <Camera className="size-3.5 sm:size-4" />
              <input
                type="file"
                id="avatar-file-upload-input"
                className="sr-only"
                accept={AVATAR_TYPES.join(",")}
                onChange={handleFileChange}
                disabled={isUpdatingAvatar}
                ref={fileInputRef}
                aria-label="Change profile photo"
              />
            </motion.label>
          </div>
        </div>

        {/* Identity Headings */}
        <div className="mt-3 text-center sm:mt-4">
          <h2 className="break-words text-lg sm:text-xl font-bold leading-tight tracking-tight text-base-content">
            {form.fullName || "Your name"}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm text-base-content/60">
            <span>{form.username ? `@${form.username}` : "No username set"}</span>
            {form.username && (
              <button
                type="button"
                onClick={() => copyText(form.username, "Username")}
                aria-label="Copy username"
                title="Copy username"
                className="grid size-6 place-items-center rounded-md text-base-content/40 transition-colors hover:bg-base-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Copy className="size-3" />
              </button>
            )}
          </div>

          {/* Verification Badges */}
          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success border border-success/20">
              <ShieldCheck className="size-3" />
              <span>Email verified</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                twoFA
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {twoFA ? <Lock className="size-3" /> : <ShieldOff className="size-3" />}
              <span>{twoFA ? "2-step active" : "2-step off"}</span>
            </span>
          </div>

          {form.bio && (
            <p className="mx-auto mt-3 max-w-prose break-words text-xs sm:text-sm leading-relaxed text-base-content/75 line-clamp-3">
              "{form.bio}"
            </p>
          )}
        </div>

        {/* Local Avatar Image Upload Preview Action */}
        <AnimatePresence>
          {selectedImg && (
            <motion.div
              key="avatar-upload-preview-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={PROFILE_SOFT}
              className="overflow-hidden mt-4"
            >
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-xs font-semibold text-base-content mb-2">
                  Use this as your profile photo?
                </p>
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={cancelAvatar}
                    className="btn btn-ghost btn-xs sm:btn-sm flex-1 rounded-xl text-base-content/75"
                    disabled={isUpdatingAvatar}
                  >
                    <X className="size-3.5" /> Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={handleImageUpload}
                    className="btn btn-primary btn-xs sm:btn-sm flex-1 rounded-xl font-semibold shadow-sm"
                    disabled={isUpdatingAvatar}
                  >
                    {isUpdatingAvatar ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>{isUpdatingAvatar ? "Uploading..." : "Save photo"}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statistics Grid */}
        <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2">
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
            value={sessionsCount}
            label="Devices"
            tone="text-base-content"
          />
        </div>

        {/* Quick Details & Completion Tracker */}
        <div className="mt-4 space-y-3">
          <ul className="rounded-2xl border border-base-300/80 bg-base-200/50 p-3 sm:p-4 space-y-2.5">
            <QuickInfoRow icon={Mail}>{form.email || "—"}</QuickInfoRow>
            {form.location && (
              <QuickInfoRow icon={MapPin}>{form.location}</QuickInfoRow>
            )}
            {form.website && (
              <QuickInfoRow icon={Globe}>
                <a
                  href={form.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:underline text-primary"
                >
                  {form.website.replace(/^https?:\/\//, "")}
                </a>
              </QuickInfoRow>
            )}
            <QuickInfoRow icon={Calendar}>Joined {memberSince}</QuickInfoRow>
          </ul>

          {/* Missing Checklist Shortcuts */}
          <div className="rounded-2xl border border-base-300/80 bg-base-200/40 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-base-content">
                <Sparkles className="size-3.5 sm:size-4 text-primary" />
                <span>
                  {missing.length ? `${missing.length} item(s) to complete` : "Profile 100% complete"}
                </span>
              </p>
              <span className="text-xs font-bold tabular-nums text-primary">
                {completion}%
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base-300">
              <motion.div
                initial={false}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>

            {missing.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onMissingClick(item.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-base-300 bg-base-100 px-2 py-0.5 text-[11px] font-medium text-base-content/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Plus className="size-2.5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
