import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Bell,
  Lock,
  MessageSquare,
  Palette,
  Shield,
  Sparkles,
  Eye,
} from "lucide-react";
import {
  useAppearanceStore,
  APPEARANCE_DEFAULTS,
} from "../store/useAppearanceStore";
import { useSettingsStore, SETTINGS_DEFAULTS } from "../store/UseSettingsStore";
import { usePrivacyStore } from "../store/usePrivacyStore";
import { useChatPrefsStore, DEFAULT_PREFS } from "../store/useChatPrefsStore";
import {
  useNotificationSettingsStore,
  NOTIFICATION_SETTINGS_DEFAULTS,
} from "../store/useNotificationSettingsStore";
import { E2EESettingsSection } from "../components/e2ee/E2EESettingsSection.jsx";
import {
  SETTINGS_SPRING,
  SETTINGS_VARIANTS,
} from "../components/settings/common/settingsTokens";
import SettingsHeader from "../components/settings/common/SettingsHeader";
import SettingsNavigation from "../components/settings/common/SettingsNavigation";
import SettingsSectionHeader from "../components/settings/common/SettingsSectionHeader";
import AppearanceSection from "../components/settings/sections/AppearanceSection";
import ChatSection from "../components/settings/sections/ChatSection";
import NotificationsSection from "../components/settings/sections/NotificationsSection";
import PrivacySection from "../components/settings/sections/PrivacySection";
import AiSection from "../components/settings/sections/AiSection";
import LiveChatPreview from "../components/settings/preview/LiveChatPreview";
import ConfirmDialog from "../components/profile/dialogs/ConfirmDialog";

const SECTIONS = [
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    desc: "Theme, text size, and bubble contours",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    desc: "Message composer, emoji scaling, and scroll behavior",
  },
  {
    id: "notifications",
    label: "Sounds & Notifications",
    icon: Bell,
    desc: "Manage sound alerts, desktop notifications, and message preview snippets",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: Shield,
    desc: "Visibility rules, read receipts, and typing indicators",
  },
  {
    id: "ai",
    label: "AI & Tools",
    icon: Sparkles,
    desc: "AI assistant tones, grammar assistance, and data export",
  },
  {
    id: "e2ee",
    label: "Encryption",
    icon: Lock,
    desc: "End-to-End Encryption, key rotation, and backup management",
  },
];

const VALID_SECTION_IDS = SECTIONS.map((s) => s.id);

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section: routeSection } = useParams();

  const {
    appearance,
    setAppearance,
    resetAppearance,
    isSaving: appearanceSaving,
  } = useAppearanceStore();

  const { settings, setSetting, resetSettings } = useSettingsStore();

  const {
    privacy,
    isLoading: privacyLoading,
    isSaving: privacySaving,
    setPrivacy,
    fetchPrivacy,
  } = usePrivacyStore();

  const {
    prefs: chatPrefs,
    isLoading: chatPrefsLoading,
    isSaving: chatPrefsSaving,
    setChatPref,
    setChatPrefs,
    fetchChatPrefs,
  } = useChatPrefsStore();

  const {
    settings: notificationSettings,
    resetSettings: resetNotificationSettings,
    updateNotificationSettings,
  } = useNotificationSettingsStore();

  const activeSection = useMemo(() => {
    if (routeSection && VALID_SECTION_IDS.includes(routeSection)) {
      return routeSection;
    }
    return "appearance";
  }, [routeSection]);

  const [confirmResetModal, setConfirmResetModal] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState(null);

  const undoSnapshotRef = useRef(null);

  const prefersReduced = useReducedMotion();
  const reduceMotion = Boolean(prefersReduced || settings.reduceMotion);

  useEffect(() => {
    fetchPrivacy();
    fetchChatPrefs();
  }, [fetchPrivacy, fetchChatPrefs]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  }, [location.key, navigate]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleSelectSection = useCallback(
    (id) => {
      navigate(`/settings/${id}`);
    },
    [navigate],
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      handleBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBack]);

  const changedCount = useMemo(() => {
    const appDiffs = Object.keys(APPEARANCE_DEFAULTS).filter(
      (k) => appearance[k] !== APPEARANCE_DEFAULTS[k],
    ).length;

    const chatDiffs = Object.keys(DEFAULT_PREFS).filter(
      (k) => chatPrefs[k] !== DEFAULT_PREFS[k],
    ).length;

    const notifDiffs = Object.keys(NOTIFICATION_SETTINGS_DEFAULTS).filter(
      (k) => notificationSettings[k] !== NOTIFICATION_SETTINGS_DEFAULTS[k],
    ).length;

    const genDiffs = Object.keys(SETTINGS_DEFAULTS).filter(
      (k) => settings[k] !== SETTINGS_DEFAULTS[k],
    ).length;

    return appDiffs + chatDiffs + notifDiffs + genDiffs;
  }, [appearance, chatPrefs, notificationSettings, settings]);

  const handleExecuteReset = () => {
    undoSnapshotRef.current = {
      appearance: { ...appearance },
      chatPrefs: { ...chatPrefs },
      notifications: { ...notificationSettings },
      settings: { ...settings },
    };

    resetSettings();
    resetAppearance?.();
    setChatPrefs?.(DEFAULT_PREFS);
    resetNotificationSettings?.();
    setConfirmResetModal(false);

    toast(
      (t) => (
        <div className="flex items-center justify-between gap-4 w-full">
          <span className="text-xs sm:text-sm font-medium text-base-content">
            Settings restored to defaults
          </span>
          <button
            type="button"
            onClick={() => {
              const snapshot = undoSnapshotRef.current;
              if (snapshot) {
                if (snapshot.appearance) {
                  Object.entries(snapshot.appearance).forEach(([k, v]) =>
                    setAppearance(k, v),
                  );
                }
                if (snapshot.chatPrefs) {
                  setChatPrefs(snapshot.chatPrefs);
                }
                if (snapshot.notifications && updateNotificationSettings) {
                  updateNotificationSettings(snapshot.notifications);
                }
                if (snapshot.settings) {
                  Object.entries(snapshot.settings).forEach(([k, v]) =>
                    setSetting(k, v),
                  );
                }
              }
              toast.dismiss(t.id);
              toast.success("Settings restored!");
            }}
            className="btn btn-warning btn-xs rounded-lg font-bold shadow-xs shrink-0"
          >
            Undo (10s)
          </button>
        </div>
      ),
      { duration: 10000, id: "settings-reset-undo" },
    );
  };

  const exportSettings = () => {
    const exportData = {
      settings,
      appearance,
      chatPrefs,
      notificationSettings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatty-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported successfully");
  };

  const currentSectionMeta =
    SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];
  const isPreviewEligible =
    activeSection === "appearance" || activeSection === "chat";

  const previewAppearance = useMemo(
    () => ({
      ...appearance,
      theme: hoveredTheme || appearance.theme,
    }),
    [appearance, hoveredTheme],
  );

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200/90 text-base-content"
      >
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -left-32 top-16 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-32 bottom-20 size-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <SettingsHeader
          onBack={handleBack}
          title="Settings"
          subtitle="Personalize your appearance, privacy, chat experience, and encryption"
          changedCount={changedCount}
          onResetAll={() => setConfirmResetModal(true)}
          confirmReset={false}
          actions={
            isPreviewEligible ? (
              <button
                type="button"
                onClick={() => {
                  const target =
                    document.getElementById("live-chat-preview-stacked") ||
                    document.getElementById("live-chat-preview-desktop");
                  target?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                className="lg:hidden flex items-center gap-1.5 btn btn-ghost btn-sm rounded-full border border-base-300 text-xs font-semibold px-2.5 sm:px-3"
                aria-label="Jump to live preview"
                title="Scroll down to Live Preview"
              >
                <Eye className="size-3.5 text-primary shrink-0" />
                <span className="hidden min-[380px]:inline">Live Preview</span>
                <span className="min-[380px]:hidden">Preview</span>
              </button>
            ) : null
          }
        />

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7 relative z-10 space-y-6 sm:space-y-7">
          <SettingsNavigation
            sections={SECTIONS}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
          />

          <div
            className={
              isPreviewEligible
                ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)] items-start gap-6 lg:gap-8"
                : "w-full min-w-0"
            }
          >
            <div className="min-w-0 space-y-6">
              <SettingsSectionHeader
                title={currentSectionMeta?.label}
                desc={currentSectionMeta?.desc}
                icon={currentSectionMeta?.icon}
                actions={
                  isPreviewEligible ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = document.getElementById(
                          "live-chat-preview-stacked",
                        );
                        target?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className="lg:hidden flex items-center gap-1.5 btn btn-ghost btn-xs rounded-full border border-base-300 text-xs font-semibold px-2 sm:px-2.5"
                    >
                      <Eye className="size-3 text-primary shrink-0" />
                      <span className="hidden min-[380px]:inline">
                        Jump to Preview
                      </span>
                      <span className="min-[380px]:hidden">Preview</span>
                    </button>
                  ) : null
                }
              />

              <div className="min-w-0 space-y-5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeSection}
                    role="tabpanel"
                    id={`settings-panel-${activeSection}`}
                    aria-labelledby={`settings-tab-${activeSection}`}
                    variants={SETTINGS_VARIANTS.fade}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="space-y-5"
                  >
                    {activeSection === "appearance" && (
                      <AppearanceSection
                        appearance={appearance}
                        setAppearance={setAppearance}
                        isSaving={appearanceSaving}
                        onThemeHover={setHoveredTheme}
                      />
                    )}

                    {activeSection === "chat" && (
                      <ChatSection
                        chatPrefs={chatPrefs}
                        setChatPref={setChatPref}
                        chatPrefsLoading={chatPrefsLoading}
                        chatPrefsSaving={chatPrefsSaving}
                        settings={settings}
                        setSetting={setSetting}
                      />
                    )}

                    {activeSection === "notifications" && (
                      <NotificationsSection />
                    )}

                    {activeSection === "privacy" && (
                      <PrivacySection
                        privacy={privacy}
                        setPrivacy={setPrivacy}
                        privacyLoading={privacyLoading}
                        privacySaving={privacySaving}
                      />
                    )}

                    {activeSection === "ai" && (
                      <AiSection
                        settings={settings}
                        setSetting={setSetting}
                        appearance={appearance}
                        setAppearance={setAppearance}
                        exportSettings={exportSettings}
                        handleReset={() => setConfirmResetModal(true)}
                        confirmReset={false}
                      />
                    )}

                    {activeSection === "e2ee" && <E2EESettingsSection />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {isPreviewEligible && (
                <div
                  id="live-chat-preview-stacked"
                  className="lg:hidden mt-8 pt-6 border-t border-base-300/70 scroll-mt-24"
                >
                  <LiveChatPreview
                    appearance={previewAppearance}
                    privacy={privacy}
                    chatPrefs={chatPrefs}
                    settings={settings}
                    isSaving={appearanceSaving}
                  />
                </div>
              )}
            </div>

            {isPreviewEligible && (
              <div
                id="live-chat-preview-desktop"
                className="hidden lg:block sticky top-24 min-w-0"
              >
                <LiveChatPreview
                  appearance={previewAppearance}
                  privacy={privacy}
                  chatPrefs={chatPrefs}
                  settings={settings}
                  isSaving={appearanceSaving}
                />
              </div>
            )}
          </div>
        </main>
      </motion.div>

      <ConfirmDialog
        open={confirmResetModal}
        title="Reset all settings to defaults?"
        text="This will restore all appearance preferences, chat formatting, and notification settings back to their original factory defaults. You can undo this action within 10 seconds."
        confirmLabel="Reset all"
        cancelLabel="Keep current"
        onCancel={() => setConfirmResetModal(false)}
        onConfirm={handleExecuteReset}
      />
    </MotionConfig>
  );
}
