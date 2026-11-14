import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Bell,
  Monitor,
  Laptop,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  TriangleAlert,
  Loader2,
} from "lucide-react";
import ProfileCard from "../common/ProfileCard";
import {
  PROFILE_SPRING,
  PROFILE_SOFT,
  PW_MIN,
  PW_MAX,
  PASSWORD_RULES,
  STRENGTH_LABELS,
  STRENGTH_BAR,
  STRENGTH_TEXT,
} from "../common/ProfileTokens";

/**
 * Circular Security Score Gauge
 */
function SecurityScoreGauge({ value, stroke, text }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-32 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 size-full -rotate-90 pointer-events-none"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-base-200"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="8"
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
          <p className={`text-2xl sm:text-3xl font-bold leading-none tabular-nums ${text}`}>
            {value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-base-content/50">
            out of 100
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated Password Input Field
 */
function PasswordField({
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
}) {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs sm:text-sm font-medium text-base-content/80">
        {label}
      </label>
      <div className="group relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-base-content/40 transition-colors group-focus-within:text-primary" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          className={`w-full rounded-xl border bg-base-100 pl-10 pr-11 py-2.5 text-xs sm:text-sm shadow-sm outline-none transition-all ${
            error
              ? "border-error focus:ring-4 focus:ring-error/15"
              : "border-base-300 hover:border-base-content/40 focus:border-primary focus:ring-4 focus:ring-primary/15"
          }`}
        />
        <motion.button
          type="button"
          onClick={onToggle}
          whileTap={{ scale: 0.88 }}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-2 focus-visible:outline-primary"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={show ? "hide-icon" : "show-icon"}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              className="flex"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-error mt-0.5"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Standardized Row Switch / Setting
 */
function SecurityRow({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-base-300/80 bg-base-200/40 p-3.5 sm:p-4 transition-all hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-base-content leading-tight">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-base-content/60 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

/**
 * Security & Password Management Section (Tab 2)
 */
export default function SecuritySection({
  securityScore,
  securityLevel,
  securityChecks,
  pw,
  pwShow,
  pwErrors,
  setPwField,
  togglePwShow,
  handlePasswordSubmit,
  isChangingPassword,
  passedRules,
  strength,
  twoFA,
  openTwoFA,
  loginAlerts,
  handleLoginAlertsToggle,
  loginAlertsLoading,
  sessions,
  sessionsLoading,
  sessionsError,
  fetchSessions,
  revokingId,
  isRevokingOthers,
  onOpenRevokeSessionConfirm,
  onOpenRevokeOthersConfirm,
}) {
  const sessionIdOf = (s) => String(s?.id ?? s?._id ?? "");

  return (
    <div className="flex flex-1 flex-col gap-5 sm:gap-6">
      {/* 1. Security Checkup Card */}
      <ProfileCard
        icon={Fingerprint}
        title="Security checkup"
        subtitle="Review security recommendations and status based on your current settings."
        headerAction={
          <span
            className={`rounded-full bg-base-200 px-3 py-1 text-xs font-bold border border-base-300/80 ${securityLevel.text}`}
          >
            {securityLevel.label}
          </span>
        }
      >
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
          <SecurityScoreGauge
            value={securityScore}
            stroke={securityLevel.stroke}
            text={securityLevel.text}
          />

          <ul className="grid w-full flex-1 gap-2">
            {securityChecks.map((check) => (
              <li
                key={check.id}
                className={`flex items-center gap-3 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm border transition-colors ${
                  check.ok
                    ? "bg-success/5 border-success/20 text-base-content"
                    : "bg-warning/5 border-warning/20 text-base-content"
                }`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    check.ok
                      ? "bg-success text-success-content"
                      : "bg-warning text-warning-content"
                  }`}
                >
                  {check.ok ? <Check className="size-3.5 stroke-[3]" /> : "!"}
                </span>
                <span className="min-w-0 flex-1 font-medium leading-snug">
                  {check.ok ? check.label : check.fix}
                </span>
                <span className="text-xs font-semibold tabular-nums text-base-content/50 shrink-0">
                  {check.ok ? `+${check.points}` : `${check.points} pts`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ProfileCard>

      {/* 2. Change Password Card */}
      <ProfileCard
        icon={KeyRound}
        title="Change password"
        subtitle="Protect your account with a strong, distinct password that you do not reuse."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div className="max-w-md">
            <PasswordField
              id="current-password-input"
              label="Current password"
              value={pw.current}
              onChange={setPwField("current")}
              show={pwShow.current}
              onToggle={togglePwShow("current")}
              error={pwErrors.current}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordField
              id="new-password-input"
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
            <PasswordField
              id="confirm-password-input"
              label="Confirm new password"
              value={pw.confirm}
              onChange={setPwField("confirm")}
              show={pwShow.confirm}
              onToggle={togglePwShow("confirm")}
              error={pwErrors.confirm}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              maxLength={PW_MAX}
            />
          </div>

          {/* Strength Meter Bar & Rules Checklist */}
          <div className="rounded-2xl border border-base-300/80 bg-base-200/50 p-3.5 sm:p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-base-content/70">
                Password strength
              </span>
              <span
                className={`font-bold ${
                  pw.next ? STRENGTH_TEXT[strength] : "text-base-content/40"
                }`}
              >
                {pw.next ? STRENGTH_LABELS[strength] : "—"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => {
                const on = pw.next && strength >= i;
                return (
                  <span
                    key={i}
                    className="relative h-1.5 overflow-hidden rounded-full bg-base-300"
                  >
                    <motion.span
                      initial={false}
                      animate={{ scaleX: on ? 1 : 0 }}
                      transition={PROFILE_SPRING}
                      style={{ originX: 0 }}
                      className={`absolute inset-0 rounded-full ${
                        STRENGTH_BAR[strength]
                      }`}
                    />
                  </span>
                );
              })}
            </div>

            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(pw.next);
                return (
                  <li
                    key={rule.id}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      ok ? "text-success font-medium" : "text-base-content/60"
                    }`}
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-full ${
                        ok
                          ? "bg-success text-success-content"
                          : "bg-base-300 text-base-content/40"
                      }`}
                    >
                      {ok && <Check className="size-2.5 stroke-[3]" />}
                    </span>
                    <span>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex justify-end">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-sm rounded-xl font-semibold w-full sm:w-auto gap-2 shadow-sm shadow-primary/20"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              <span>{isChangingPassword ? "Updating..." : "Update password"}</span>
            </motion.button>
          </div>
        </form>
      </ProfileCard>

      {/* 3. Extra Protection Card */}
      <ProfileCard
        icon={ShieldCheck}
        title="Extra account protection"
        subtitle="Additional security safeguards to verify authorized logins and notify you of new sign-ins."
      >
        <div className="space-y-3">
          {/* 2FA Row */}
          <SecurityRow
            icon={Smartphone}
            title="Two-step verification (2FA)"
            desc={
              twoFA
                ? "Active. Requires a time-based 6-digit authenticator code on each sign in."
                : "Add an extra layer of authentication using your mobile authenticator app. Highly recommended."
            }
          >
            {twoFA ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success border border-success/20">
                  <Check className="size-3" />
                  Enabled
                </span>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openTwoFA("disable")}
                  className="btn btn-ghost btn-sm rounded-xl text-error font-medium"
                >
                  <ShieldOff className="size-3.5" />
                  <span>Disable</span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => openTwoFA("setup")}
                className="btn btn-primary btn-sm rounded-xl font-semibold gap-1.5 shadow-sm shadow-primary/20 w-full sm:w-auto"
              >
                <ShieldCheck className="size-3.5" />
                <span>Enable</span>
              </motion.button>
            )}
          </SecurityRow>

          {/* 2FA Note */}
          <AnimatePresence>
            {twoFA && (
              <motion.div
                key="twofa-active-infobox"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={PROFILE_SOFT}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-3.5 sm:p-4">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-success text-success-content">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs sm:text-sm font-semibold text-base-content leading-tight">
                      Your account is protected with 2FA
                    </p>
                    <p className="text-xs leading-relaxed text-base-content/70">
                      Even if someone obtains your password, they cannot access your account
                      without your authenticator device or emergency recovery codes.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Alerts Row */}
          <SecurityRow
            icon={Bell}
            title="Login alerts"
            desc="Send an email alert whenever an unrecognized device or browser logs into your account."
          >
            <motion.button
              type="button"
              role="switch"
              aria-checked={loginAlerts}
              aria-label="Toggle login alerts"
              disabled={loginAlertsLoading}
              onClick={() => handleLoginAlertsToggle(!loginAlerts)}
              whileTap={loginAlertsLoading ? undefined : { scale: 0.92 }}
              className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors border focus-visible:outline-2 focus-visible:outline-primary ${
                loginAlerts
                  ? "bg-primary border-primary justify-end"
                  : "bg-base-300 border-base-300 justify-start"
              } ${loginAlertsLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <motion.span
                layout
                transition={PROFILE_SPRING}
                className="size-5 rounded-full bg-base-100 shadow-sm"
              />
            </motion.button>
          </SecurityRow>
        </div>
      </ProfileCard>

      {/* 4. Active Sessions Card */}
      <ProfileCard
        icon={Monitor}
        title="Where you're signed in"
        subtitle="Review active devices and revoke access to any browser sessions you don't recognize."
        headerAction={
          sessions.length > 1 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onOpenRevokeOthersConfirm}
              disabled={isRevokingOthers || !!revokingId}
              className="btn btn-outline btn-xs sm:btn-sm rounded-xl font-semibold gap-1.5"
            >
              {isRevokingOthers ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5" />
              )}
              <span>Sign out all others</span>
            </motion.button>
          )
        }
      >
        {sessionsLoading && sessions.length === 0 && (
          <ul className="space-y-2.5">
            {[1, 2].map((i) => (
              <li
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-2xl border border-base-300/80 bg-base-200/40 p-3.5"
              >
                <span className="size-10 shrink-0 rounded-xl bg-base-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-base-300" />
                  <div className="h-2.5 w-20 rounded bg-base-300" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {sessionsError && !sessionsLoading && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
            <TriangleAlert className="size-6 text-error" />
            <p className="text-xs sm:text-sm text-base-content/70">{sessionsError}</p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={fetchSessions}
              className="btn btn-outline btn-xs sm:btn-sm rounded-xl gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span>Retry</span>
            </motion.button>
          </div>
        )}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/20 p-6 text-center">
            <Monitor className="mx-auto mb-2 size-8 text-base-content/30" />
            <p className="text-xs sm:text-sm text-base-content/60">
              No active sessions currently found.
            </p>
          </div>
        )}

        {!sessionsError && sessions.length > 0 && (
          <motion.ul layout className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {sessions.map((session, index) => {
                const sid = sessionIdOf(session);
                const DeviceIcon =
                  session.deviceType === "mobile"
                    ? Smartphone
                    : session.deviceType === "tablet"
                      ? Laptop
                      : Monitor;
                const isRevoking = revokingId === sid;

                return (
                  <motion.li
                    key={sid || index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { ...PROFILE_SOFT, delay: index * 0.04 },
                    }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 sm:p-3.5 transition-shadow hover:shadow-md ${
                      session.current
                        ? "border-success/30 bg-success/5"
                        : "border-base-300/80 bg-base-200/40"
                    }`}
                  >
                    <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-base-100 border border-base-300/80">
                      <DeviceIcon className="size-4 sm:size-5 text-primary" />
                      {session.current && (
                        <span
                          aria-hidden
                          className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-success ring-2 ring-base-100"
                        />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-xs sm:text-sm font-semibold text-base-content truncate">
                          {session.device || "Unknown device"}
                        </span>
                        {session.current && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success border border-success/20">
                            <Check className="size-2.5 stroke-[3]" />
                            This device
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] sm:text-xs text-base-content/60">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {session.location || "Unknown location"}
                          {session.lastActiveLabel ? ` · ${session.lastActiveLabel}` : ""}
                        </span>
                      </p>
                    </div>

                    {!session.current && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => onOpenRevokeSessionConfirm(sid)}
                        disabled={isRevoking || isRevokingOthers}
                        aria-label={`Sign out ${session.device || "device"}`}
                        title="Sign out device"
                        className="btn btn-ghost btn-xs sm:btn-sm rounded-xl text-error shrink-0 font-medium"
                      >
                        {isRevoking ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <>
                            <LogOut className="size-3.5 sm:hidden" />
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
      </ProfileCard>
    </div>
  );
}
