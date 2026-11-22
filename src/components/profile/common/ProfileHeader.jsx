import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Camera,
  Trash2,
  Copy,
  Check,
  X,
  Mail,
  AtSign,
  Sparkles,
  Menu,
} from "lucide-react";
import { PROFILE_SPRING, AVATAR_TYPES } from "./ProfileTokens";
import { useSlidingSidebarStore } from "../../../store/useSlidingSidebarStore.js";
import BadgePill from "../../badges/BadgePill.jsx";

export default function ProfileHeader({
  onBack,
  tab,
  isEditing,
  onStartEditing,
  isFetchingUser = false,
  authUser = null,
  form = {},
  isOnline = true,
  selectedImg = null,
  isDragging = false,
  setIsDragging = null,
  handleDrop = null,
  fileInputRef = null,
  handleFileChange = null,
  cancelAvatar = null,
  handleImageUpload = null,
  onOpenRemovePhotoConfirm = null,
  hasSavedAvatar = false,
  isUpdatingAvatar = false,
  completion = 100,
  copyText = null,
  className = "",
}) {
  const avatarSrc = selectedImg || authUser?.avatar || "/avatar.png";
  const fullName = form?.fullName || authUser?.fullName || "Your Name";
  const username = form?.username || authUser?.username;
  const email = form?.email || authUser?.email || "";
  const bio = form?.bio || authUser?.bio || "";

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* 1. Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-base-300/80 bg-base-100/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              onClick={onBack}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.92 }}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/80 shadow-xs transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary min-h-[44px] min-w-[44px]"
              aria-label="Go back"
              title="Go back (Esc)"
            >
              <ArrowLeft className="size-5" />
            </motion.button>

            <button
              type="button"
              onClick={() => useSlidingSidebarStore.getState().openMobile()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/80 shadow-xs transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary min-h-[44px] min-w-[44px] cursor-pointer"
              aria-label="Open navigation menu"
              title="Navigation Menu (Cmd+B)"
            >
              <Menu className="size-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-base-content">
                Profile
              </h1>
              <p className="hidden sm:block text-xs text-base-content/60 truncate">
                Manage your personal information, security credentials, and
                preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <kbd className="kbd kbd-sm hidden md:inline-flex text-base-content/50 border-base-300 bg-base-200/50">
              Esc
            </kbd>

            <AnimatePresence>
              {tab === "profile" && !isEditing && (
                <motion.button
                  key="edit-top-btn"
                  type="button"
                  initial={{ opacity: 0, scale: 0.85, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: 10 }}
                  transition={PROFILE_SPRING}
                  whileTap={{ scale: 0.94 }}
                  onClick={onStartEditing}
                  disabled={isFetchingUser}
                  aria-label="Edit profile"
                  className="btn btn-primary btn-sm rounded-full font-semibold gap-1.5 shadow-xs shadow-primary/20 min-h-[36px]"
                >
                  {isFetchingUser ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Pencil className="size-3.5" />
                  )}
                  <span className="hidden min-[380px]:inline">Edit profile</span>
                  <span className="min-[380px]:hidden">Edit</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* 2. Hero Profile Identity Header Card */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-sm overflow-hidden">
          {/* Banner Graphic Mesh */}
          <div className="relative h-28 sm:h-36 shrink-0 overflow-hidden bg-gradient-to-br from-primary/30 via-base-300/60 to-base-200">
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(currentColor 1px, transparent 1px)",
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
              className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base-100 to-transparent"
            />
          </div>

          {/* Profile Identity Details */}
          <div className="relative px-4 pb-5 sm:px-6 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16">
              {/* Left: Avatar with Status Indicator and Photo Actions */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                <div
                  className={`relative size-24 sm:size-28 shrink-0 transition-transform ${
                    isDragging ? "scale-105" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging?.(true);
                  }}
                  onDragLeave={() => setIsDragging?.(false)}
                  onDrop={handleDrop}
                >
                  <motion.img
                    key={avatarSrc}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={PROFILE_SPRING}
                    src={avatarSrc}
                    alt={fullName}
                    className={`size-full rounded-full bg-base-200 object-cover shadow-xl ring-4 ring-base-100 ${
                      isDragging ? "ring-primary" : ""
                    }`}
                  />

                  {/* Online / Offline Status Indicator */}
                  <span
                    className={`absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-base-100 shadow-xs ${
                      isOnline ? "bg-success" : "bg-base-content/30"
                    }`}
                    title={isOnline ? "Active now" : "Offline"}
                    aria-label={isOnline ? "Online" : "Offline"}
                  >
                    {isOnline && (
                      <span className="size-2 rounded-full bg-success-content animate-pulse" />
                    )}
                  </span>

                  {/* Camera Upload Button */}
                  {fileInputRef && (
                    <motion.label
                      htmlFor="header-avatar-upload"
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.08 }}
                      transition={PROFILE_SPRING}
                      className={`absolute top-0 right-0 grid size-7 sm:size-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-content shadow-md shadow-primary/30 ring-2 ring-base-100 focus-within:outline-2 focus-within:outline-primary ${
                        isUpdatingAvatar
                          ? "pointer-events-none animate-pulse"
                          : ""
                      }`}
                      title="Upload new photo"
                    >
                      <Camera className="size-3.5" />
                      <input
                        type="file"
                        id="header-avatar-upload"
                        className="sr-only"
                        accept={AVATAR_TYPES.join(",")}
                        onChange={handleFileChange}
                        disabled={isUpdatingAvatar}
                        ref={fileInputRef}
                        aria-label="Upload profile photo"
                      />
                    </motion.label>
                  )}

                  {/* Remove Photo Button */}
                  {hasSavedAvatar &&
                    onOpenRemovePhotoConfirm &&
                    !selectedImg && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.08 }}
                        transition={PROFILE_SPRING}
                        onClick={onOpenRemovePhotoConfirm}
                        disabled={isUpdatingAvatar}
                        className="absolute top-0 left-0 grid size-7 sm:size-8 place-items-center rounded-full bg-error text-error-content shadow-md ring-2 ring-base-100 focus-visible:outline-2 focus-visible:outline-error"
                        title="Remove photo"
                        aria-label="Remove profile photo"
                      >
                        <Trash2 className="size-3.5" />
                      </motion.button>
                    )}
                </div>

                {/* Name, Username, Email */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content break-words">
                      {fullName}
                    </h2>
                    {authUser?.featuredBadge && (
                      <BadgePill badge={authUser.featuredBadge} size="sm" />
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                      <Sparkles className="size-3" />
                      <span>{completion}% Complete</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs sm:text-sm text-base-content/65">
                    {username && (
                      <span className="flex items-center gap-1 font-mono font-medium text-base-content/80">
                        <AtSign className="size-3.5 text-primary" />
                        <span>{username}</span>
                        {copyText && (
                          <button
                            type="button"
                            onClick={() => copyText(username, "Username")}
                            className="text-base-content/40 hover:text-primary transition-colors p-0.5 rounded"
                            title="Copy username"
                            aria-label="Copy username"
                          >
                            <Copy className="size-3" />
                          </button>
                        )}
                      </span>
                    )}

                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-base-content/50 shrink-0" />
                        <span className="truncate max-w-[160px] min-[360px]:max-w-[200px] sm:max-w-none">
                          {email}
                        </span>
                        {copyText && (
                          <button
                            type="button"
                            onClick={() => copyText(email, "Email")}
                            className="text-base-content/40 hover:text-primary transition-colors p-0.5 rounded shrink-0"
                            title="Copy email"
                            aria-label="Copy email"
                          >
                            <Copy className="size-3" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>

                  {bio && (
                    <p className="text-xs sm:text-sm text-base-content/75 line-clamp-2 max-w-2xl mt-1 leading-relaxed break-words">
                      {bio}
                    </p>
                  )}

                  {/* New Photo Confirmation Strip */}
                  <AnimatePresence>
                    {selectedImg && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="flex items-center justify-center sm:justify-start gap-2 pt-1"
                      >
                        <span className="text-xs text-primary font-medium">
                          New photo selected:
                        </span>
                        <button
                          type="button"
                          onClick={handleImageUpload}
                          disabled={isUpdatingAvatar}
                          className="btn btn-primary btn-xs rounded-lg gap-1 font-semibold"
                        >
                          {isUpdatingAvatar ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          <span>Save photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelAvatar}
                          disabled={isUpdatingAvatar}
                          className="btn btn-ghost btn-xs rounded-lg gap-1 text-base-content/60"
                        >
                          <X className="size-3" />
                          <span>Cancel</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Actions slot (empty now that Edit Profile is strictly centralized in sticky header) */}
              <div className="hidden sm:flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
