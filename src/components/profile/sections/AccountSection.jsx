import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  TriangleAlert,
  Lock,
  Copy,
  Calendar,
  ShieldCheck,
  X,
  Loader2,
  KeyRound,
  Fingerprint,
} from "lucide-react";
import ProfileCard from "../common/ProfileCard";
import { PROFILE_SOFT } from "../common/ProfileTokens";

/**
 * Account Overview & Permanent Account Actions (Tab 3)
 */
export default function AccountSection({
  authUser,
  memberSince,
  deleteText,
  setDeleteText,
  deletePassword,
  setDeletePassword,
  deleteCode,
  setDeleteCode,
  deleteUseRecovery,
  setDeleteUseRecovery,
  deleteError,
  setDeleteError,
  handleDeleteAccount,
  isDeletingAccount,
  twoFA,
  copyText,
}) {
  const accountId = authUser?._id || authUser?.id || "—";

  return (
    <div className="flex flex-1 flex-col gap-5 sm:gap-6">
      {/* 1. Account Identity & Credentials Overview Card */}
      <ProfileCard
        icon={Fingerprint}
        title="Account details"
        subtitle="Unique system identifiers, account metadata, and verification records."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Account ID */}
          <div className="rounded-2xl border border-base-300/80 bg-base-200/40 p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
                User ID
              </span>
              <button
                type="button"
                onClick={() => copyText(accountId, "User ID")}
                className="grid size-6 place-items-center rounded text-base-content/40 hover:text-primary transition-colors"
                title="Copy User ID"
              >
                <Copy className="size-3" />
              </button>
            </div>
            <p className="mt-1 font-mono text-xs text-base-content break-all">
              {accountId}
            </p>
          </div>

          {/* Member Since */}
          <div className="rounded-2xl border border-base-300/80 bg-base-200/40 p-3 sm:p-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
              Registration Date
            </span>
            <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm font-medium text-base-content">
              <Calendar className="size-3.5 text-primary" />
              <span>{memberSince}</span>
            </div>
          </div>
        </div>
      </ProfileCard>

      {/* 2. Danger Zone: Delete Account */}
      <ProfileCard
        icon={TriangleAlert}
        tone="error"
        title="Danger zone: Delete account"
        subtitle="Permanently remove your account profile, personal messages, and media uploads."
      >
        <div className="relative overflow-hidden rounded-2xl border border-error/30 bg-error/5 p-4 sm:p-6">
          {/* Top striped caution pattern */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 opacity-60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, currentColor 0 8px, transparent 8px 16px)",
              color: "var(--color-error, #ef4444)",
            }}
          />

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-base-content/80">
            Deleting your account is permanent and cannot be undone. Once confirmed, all your
            conversations will be removed from recipient devices and your username will become
            available to others.
          </p>

          {/* Deletion impact list */}
          <ul className="mt-3.5 grid gap-2 text-xs text-base-content/75 sm:grid-cols-3">
            {["Profile & media uploads", "Message history & threads", "Active sessions & tokens"].map(
              (item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-xl bg-error/10 border border-error/20 px-3 py-2"
                >
                  <X className="size-3.5 text-error shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ),
            )}
          </ul>

          {/* Confirmation Form Inputs */}
          <div className="mt-5 w-full max-w-md space-y-3.5">
            {/* Input 1: Type DELETE */}
            <div className="space-y-1">
              <label
                htmlFor="delete-confirm-input"
                className="text-xs sm:text-sm font-medium text-base-content/80"
              >
                Type <span className="font-bold text-error">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteText}
                onChange={(e) => {
                  setDeleteText(e.target.value);
                  setDeleteError("");
                }}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isDeletingAccount}
                className="w-full rounded-xl border border-base-300 bg-base-100 px-3.5 py-2.5 text-xs sm:text-sm shadow-sm outline-none transition-all hover:border-base-content/40 focus:border-error focus:ring-4 focus:ring-error/15 disabled:opacity-50"
              />
            </div>

            {/* Input 2: Password */}
            <div className="space-y-1">
              <label
                htmlFor="delete-password-input"
                className="text-xs sm:text-sm font-medium text-base-content/80"
              >
                Confirm your account password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-error" />
                <input
                  id="delete-password-input"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  disabled={isDeletingAccount}
                  className="w-full rounded-xl border border-base-300 bg-base-100 py-2.5 pl-10 pr-4 text-xs sm:text-sm shadow-sm outline-none transition-all hover:border-base-content/40 focus:border-error focus:ring-4 focus:ring-error/15 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Input 3: Two-factor verification code if 2FA is active */}
            <AnimatePresence>
              {twoFA && (
                <motion.div
                  key="delete-twofa-box"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={PROFILE_SOFT}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 rounded-2xl border border-base-300/80 bg-base-100 p-3 sm:p-3.5">
                    <p className="text-xs font-semibold text-base-content">
                      Two-step verification required
                    </p>
                    <p className="text-xs text-base-content/65">
                      {deleteUseRecovery
                        ? "Enter one of your emergency recovery codes."
                        : "Enter the current 6-digit code from your authenticator app."}
                    </p>
                    <input
                      type="text"
                      inputMode={deleteUseRecovery ? "text" : "numeric"}
                      value={deleteCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDeleteCode(deleteUseRecovery ? val : val.replace(/\D/g, ""));
                        setDeleteError("");
                      }}
                      placeholder={
                        deleteUseRecovery ? "Recovery code" : "000000"
                      }
                      autoComplete="one-time-code"
                      disabled={isDeletingAccount}
                      maxLength={deleteUseRecovery ? 12 : 6}
                      className="w-full rounded-xl border border-base-300 bg-base-100 px-3.5 py-2 text-xs sm:text-sm font-mono tracking-widest outline-none focus:border-error focus:ring-4 focus:ring-error/15"
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-base-content/70">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs rounded"
                        checked={deleteUseRecovery}
                        onChange={(e) => {
                          setDeleteUseRecovery(e.target.checked);
                          setDeleteCode("");
                        }}
                        disabled={isDeletingAccount}
                      />
                      <span>Use a recovery code instead</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {deleteError && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-error font-medium"
                >
                  {deleteError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Delete Account Submit Button */}
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
              className="btn btn-error btn-sm rounded-xl font-semibold gap-2 shadow-md shadow-error/20 w-full sm:w-auto mt-2"
            >
              {isDeletingAccount ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              <span>{isDeletingAccount ? "Deleting account..." : "Delete my account permanently"}</span>
            </motion.button>
          </div>
        </div>
      </ProfileCard>
    </div>
  );
}
