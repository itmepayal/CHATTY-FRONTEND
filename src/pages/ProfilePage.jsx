import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MotionConfig, motion, AnimatePresence } from "framer-motion";
import { customToast } from "../components/toast";
import { useAuthStore } from "../store/useAuthStore";
import { useSecurityStore } from "../store/useSecurityStore";
import { axiosInstance } from "../lib/axios.js";
import { TwoFactorModal } from "../components/security/TwoFactorModal";
import ProfileHeader from "../components/profile/common/ProfileHeader";
import ProfileSidebar from "../components/profile/sidebar/ProfileSidebar";
import ProfileTabNav from "../components/profile/tabs/ProfileTabNav";
import ProfileInfoSection from "../components/profile/sections/ProfileInfoSection";
import BadgesSection from "../components/badges/BadgesSection";
import BadgeDetailModal from "../components/badges/BadgeDetailModal";
import SecuritySection from "../components/profile/sections/SecuritySection";
import AccountSection from "../components/profile/sections/AccountSection";
import ConfirmDialog from "../components/profile/dialogs/ConfirmDialog";
import ProfileEditDrawer from "../components/profile/drawers/ProfileEditDrawer";
import { normalizeDobToISO, validateDob } from "../lib/dobUtils.js";
import {
  FIELDS,
  READ_ONLY_FIELDS,
  BIO_MAX,
  PW_MIN,
  PW_MAX,
  AVATAR_MAX_MB,
  AVATAR_TYPES,
  PASSWORD_RULES,
} from "../components/profile/common/ProfileTokens";

const EMPTY_PW = { current: "", next: "", confirm: "" };
const HIDDEN_PW = { current: false, next: false, confirm: false };

const buildInitialForm = (user) => ({
  fullName: user?.fullName || "",
  username: user?.username || "",
  email: user?.email || "",
  phone: user?.phone || "",
  gender: user?.gender || "",
  dob: user?.dob ? normalizeDobToISO(user.dob) : "",
  location: user?.location || "",
  website: user?.website || "",
  bio: user?.bio || "",
});

const buildUpdatePayload = (form) =>
  Object.fromEntries(
    Object.entries(form).filter(([key]) => !READ_ONLY_FIELDS.includes(key)),
  );

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

const validators = {
  fullName: (v) =>
    !v.trim() ? "Name is required" : v.trim().length < 2 ? "Too short" : "",
  username: (v) =>
    v && !/^[a-zA-Z0-9_.]{3,20}$/.test(v)
      ? "3-20 chars: letters, numbers, _ or ."
      : "",
  phone: (v) =>
    v && !/^[+\d][\d\s-]{7,15}$/.test(v) ? "Invalid phone number" : "",
  dob: validateDob,
  website: (v) =>
    v && !/^https?:\/\/.+\..+/.test(v)
      ? "Must start with http:// or https://"
      : "",
  bio: (v) => (v.length > BIO_MAX ? `Max ${BIO_MAX} characters` : ""),
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const VALID_TABS = ["profile", "badges", "security", "account"];
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab")?.toLowerCase();
  const tab = VALID_TABS.includes(rawTab) ? rawTab : "profile";

  const setTab = useCallback(
    (newTab) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newTab === "profile") {
          next.delete("tab");
        } else {
          next.set("tab", newTab);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const [selectedImg, setSelectedImg] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [initialFocusField, setInitialFocusField] = useState(null);
  const [form, setForm] = useState(() => buildInitialForm(authUser));
  const [errors, setErrors] = useState({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showcaseBadge, setShowcaseBadge] = useState(null);

  const [pw, setPw] = useState(EMPTY_PW);
  const [pwShow, setPwShow] = useState(HIDDEN_PW);
  const [pwErrors, setPwErrors] = useState({});

  const [twoFAModal, setTwoFAModal] = useState({ open: false, mode: "setup" });
  const [confirmRevoke, setConfirmRevoke] = useState({
    open: false,
    sessionId: null,
  });
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);

  const [loginAlerts, setLoginAlerts] = useState(
    readLoginAlerts(authUser) ?? true,
  );

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
  const twoFA = readTwoFactor(authUser) ?? false;

  useEffect(() => {
    if (typeof authLoginAlerts === "boolean") setLoginAlerts(authLoginAlerts);
  }, [authLoginAlerts]);

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

  useEffect(() => {
    fetchCurrentUser();
    refreshSecurityFlags();
    fetchSessions();
  }, [fetchCurrentUser, refreshSecurityFlags, fetchSessions]);

  useEffect(() => {
    if (tab === "security") {
      fetchSessions();
      refreshSecurityFlags();
    }
  }, [tab, fetchSessions, refreshSecurityFlags]);

  useEffect(() => {
    if (tab !== "security") {
      setPw(EMPTY_PW);
      setPwShow(HIDDEN_PW);
      setPwErrors({});
    }
    if (tab !== "account") resetDeleteForm();
  }, [tab, resetDeleteForm]);

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

  useEffect(() => () => resetTwoFaState(), [resetTwoFaState]);

  useEffect(() => {
    if (!isEditDrawerOpen) setForm(initialForm);
  }, [initialForm, isEditDrawerOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(
    () => () => {
      if (selectedImg) URL.revokeObjectURL(selectedImg);
    },
    [selectedImg],
  );

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  }, [location.key, navigate]);

  const requestBack = useCallback(() => {
    if (isEditDrawerOpen && isDirty) {
      setConfirmDiscard(true);
      return;
    }
    goBack();
  }, [isEditDrawerOpen, isDirty, goBack]);

  const anyDialogOpen =
    isEditDrawerOpen ||
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
        if (isEditDrawerOpen) {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditDrawerOpen]);

  // Profile completion score
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

  // Security calculations
  const passedRules = PASSWORD_RULES.filter((r) => r.test(pw.next));
  const strength = pw.next ? passedRules.length : 0;

  const securityChecks = useMemo(
    () => [
      {
        id: "2fa",
        label: "Two-step verification is enabled",
        points: 50,
        ok: twoFA,
        fix: "Turn on two-step verification (recommended)",
      },
      {
        id: "alerts",
        label: "Login alerts are active",
        points: 25,
        ok: loginAlerts,
        fix: "Turn on login alerts for new sign-ins",
      },
      {
        id: "sessions",
        label: "Active device count is minimal",
        points: 25,
        ok: sessions.length <= 2,
        fix: "Sign out unused or unfamiliar devices",
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

  // Avatar Handlers
  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!AVATAR_TYPES.includes(selectedFile.type)) {
      customToast.error("Only JPG, PNG, and WEBP formats are allowed.");
      return;
    }
    if (selectedFile.size > AVATAR_MAX_MB * 1024 * 1024) {
      customToast.error(`File size should be under ${AVATAR_MAX_MB}MB.`);
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
    if (!file) return customToast.error("Please select a file first");
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

  // Profile Form Handlers
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

  const openEditDrawer = useCallback((field = "fullName") => {
    setInitialFocusField(field);
    setIsEditDrawerOpen(true);
  }, []);

  const closeEditDrawer = useCallback(() => {
    setIsEditDrawerOpen(false);
    setInitialFocusField(null);
    setErrors({});
    setForm(initialForm);
  }, [initialForm]);

  const handleSaveProfile = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return customToast.error("Please fix the highlighted fields");
    if (!isDirty) {
      setIsEditDrawerOpen(false);
      return;
    }

    try {
      await updateProfile(buildUpdatePayload(form));
      setIsEditDrawerOpen(false);
      customToast.success("Profile updated successfully");
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
    openEditDrawer(id);
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      customToast.success(`${label} copied to clipboard`);
    } catch {
      customToast.error("Couldn't copy to clipboard");
    }
  };

  // Password Handlers
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

  // Security actions
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

  // Delete account action
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

  const hasSavedAvatar = !!authUser?.avatar && !selectedImg;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200/90 text-base-content"
      >
        {/* Ambient Glow Blobs matching Settings Page */}
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-32 top-16 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-32 bottom-20 size-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        {/* Sticky Header with Profile Identity Hero */}
        <ProfileHeader
          onBack={requestBack}
          tab={tab}
          isEditing={isEditDrawerOpen}
          onStartEditing={() => openEditDrawer("fullName")}
          isFetchingUser={isFetchingUser}
          authUser={authUser}
          form={form}
          isOnline={Boolean(socket?.connected || authUser?.isOnline || true)}
          selectedImg={selectedImg}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          handleDrop={handleDrop}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          cancelAvatar={cancelAvatar}
          handleImageUpload={handleImageUpload}
          onOpenRemovePhotoConfirm={() => setConfirmRemovePhoto(true)}
          hasSavedAvatar={hasSavedAvatar}
          isUpdatingAvatar={isUpdatingAvatar}
          completion={completion}
          copyText={copyText}
        />

        {/* Main Content Layout */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7 relative z-10">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)] lg:gap-8">
            {/* Desktop Left Sidebar: Account Snapshot, Contact Info & Missing Checklist */}
            <div className="hidden lg:block lg:sticky lg:top-24">
              <ProfileSidebar
                authUser={authUser}
                form={form}
                completion={completion}
                missing={missing}
                securityScore={securityScore}
                securityLevel={securityLevel}
                sessionsCount={sessions.length}
                twoFA={twoFA}
                memberSince={memberSince}
                onMissingClick={handleMissingClick}
              />
            </div>

            {/* Right Main Content Pane */}
            <div className="flex flex-col gap-5 min-w-0">
              {/* Segmented Pill Tabs Navigation */}
              <ProfileTabNav
                activeTab={tab}
                onSelectTab={setTab}
                twoFAEnabled={twoFA}
              />

              {/* Tab Panels */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  id={`profile-panel-${tab}`}
                  role="tabpanel"
                  aria-labelledby={`tab-btn-${tab}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-1 flex-col"
                >
                  {tab === "profile" && (
                    <ProfileInfoSection
                      formRef={formRef}
                      form={form}
                      errors={errors}
                      isEditing={false}
                      isDirty={isDirty}
                      handleChange={handleChange}
                      handleCancel={closeEditDrawer}
                      handleSave={handleSaveProfile}
                      isUpdateProfile={isUpdateProfile}
                      copyText={copyText}
                      onEditField={(field) => openEditDrawer(field)}
                      onNavigateBadges={() => setTab("badges")}
                      onSelectBadge={(b) => setShowcaseBadge(b)}
                    />
                  )}

                  {showcaseBadge && (
                    <BadgeDetailModal
                      badge={showcaseBadge}
                      isOwned={true}
                      isFeatured={
                        authUser?.featuredBadge?._id === showcaseBadge._id ||
                        authUser?.featuredBadge?.slug === showcaseBadge.slug
                      }
                      onClose={() => setShowcaseBadge(null)}
                    />
                  )}

                  {tab === "badges" && <BadgesSection />}

                  {tab === "security" && (
                    <SecuritySection
                      securityScore={securityScore}
                      securityLevel={securityLevel}
                      securityChecks={securityChecks}
                      pw={pw}
                      pwShow={pwShow}
                      pwErrors={pwErrors}
                      setPwField={setPwField}
                      togglePwShow={togglePwShow}
                      handlePasswordSubmit={handlePasswordSubmit}
                      isChangingPassword={isChangingPassword}
                      passedRules={passedRules}
                      strength={strength}
                      twoFA={twoFA}
                      openTwoFA={openTwoFA}
                      loginAlerts={loginAlerts}
                      handleLoginAlertsToggle={handleLoginAlertsToggle}
                      loginAlertsLoading={loginAlertsLoading}
                      sessions={sessions}
                      sessionsLoading={sessionsLoading}
                      sessionsError={sessionsError}
                      fetchSessions={fetchSessions}
                      revokingId={revokingId}
                      isRevokingOthers={isRevokingOthers}
                      onOpenRevokeSessionConfirm={(sid) =>
                        setConfirmRevoke({ open: true, sessionId: sid })
                      }
                      onOpenRevokeOthersConfirm={() =>
                        setConfirmRevokeOthers(true)
                      }
                    />
                  )}

                  {tab === "account" && (
                    <AccountSection
                      authUser={authUser}
                      memberSince={memberSince}
                      deleteText={deleteText}
                      setDeleteText={setDeleteText}
                      deletePassword={deletePassword}
                      setDeletePassword={setDeletePassword}
                      deleteCode={deleteCode}
                      setDeleteCode={setDeleteCode}
                      deleteUseRecovery={deleteUseRecovery}
                      setDeleteUseRecovery={setDeleteUseRecovery}
                      deleteError={deleteError}
                      setDeleteError={setDeleteError}
                      handleDeleteAccount={handleDeleteAccount}
                      isDeletingAccount={isDeletingAccount}
                      twoFA={twoFA}
                      copyText={copyText}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Mobile Bottom Snapshot: Account Snapshot & Missing Checklist */}
              <div className="block lg:hidden pt-2">
                <ProfileSidebar
                  authUser={authUser}
                  form={form}
                  completion={completion}
                  missing={missing}
                  securityScore={securityScore}
                  securityLevel={securityLevel}
                  sessionsCount={sessions.length}
                  twoFA={twoFA}
                  memberSince={memberSince}
                  onMissingClick={handleMissingClick}
                />
              </div>
            </div>
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
        text="This device will be signed out immediately and will require a fresh login to access your chats."
        confirmLabel="Sign out"
        onCancel={() => setConfirmRevoke({ open: false, sessionId: null })}
        onConfirm={() => handleRevokeSession(confirmRevoke.sessionId)}
      />

      <ConfirmDialog
        open={confirmRevokeOthers}
        title="Sign out of all other devices?"
        text="All other active sessions will be terminated. Your current session on this device will remain active."
        confirmLabel="Sign out all"
        busy={isRevokingOthers}
        onCancel={() => setConfirmRevokeOthers(false)}
        onConfirm={handleRevokeOthers}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        text="You have unsaved changes to your profile. If you leave now, your modifications will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          closeEditDrawer();
        }}
      />

      <ProfileEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={closeEditDrawer}
        form={form}
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        isDirty={isDirty}
        onSave={handleSaveProfile}
        isSaving={isUpdateProfile}
        initialFocusField={initialFocusField}
        onDiscardConfirmRequest={() => setConfirmDiscard(true)}
      />
    </MotionConfig>
  );
}
