import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Lock,
  MessageSquare,
  Palette,
  Shield,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useAppearanceStore,
  APPEARANCE_DEFAULTS,
} from "../store/useAppearanceStore";
import { useSettingsStore, SETTINGS_DEFAULTS } from "../store/UseSettingsStore";
import { usePrivacyStore } from "../store/usePrivacyStore";
import { useChatPrefsStore } from "../store/useChatPrefsStore";
import { E2EESettingsSection } from "../components/e2ee/E2EESettingsSection.jsx";
import {
  SETTINGS_SPRING,
  SETTINGS_VARIANTS,
} from "../components/settings/common/settingsTokens";
import SettingsHeader from "../components/settings/common/SettingsHeader";
import SettingsNavigation from "../components/settings/common/SettingsNavigation";
import AppearanceSection from "../components/settings/sections/AppearanceSection";
import ChatSection from "../components/settings/sections/ChatSection";
import PrivacySection from "../components/settings/sections/PrivacySection";
import AiSection from "../components/settings/sections/AiSection";
import LiveChatPreview from "../components/settings/preview/LiveChatPreview";

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
    desc: "Message composer, emoji scaling, and sound alerts",
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
    fetchChatPrefs,
  } = useChatPrefsStore();

  const [activeSection, setActiveSection] = useState("appearance");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const resetTimer = useRef(null);

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

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.key]);

  const changedCount = useMemo(
    () =>
      Object.keys(SETTINGS_DEFAULTS).filter(
        (k) => settings[k] !== SETTINGS_DEFAULTS[k],
      ).length +
      Object.keys(APPEARANCE_DEFAULTS).filter(
        (k) => appearance[k] !== APPEARANCE_DEFAULTS[k],
      ).length,
    [settings, appearance],
  );

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearTimeout(resetTimer.current);
    resetSettings();
    resetAppearance?.();
    setConfirmReset(false);
    toast.success("Settings restored to factory defaults");
  };

  const exportSettings = () => {
    const exportData = {
      settings,
      appearance,
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

  const currentSectionMeta = SECTIONS.find((s) => s.id === activeSection);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200/90 text-base-content"
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-32 top-16 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-32 bottom-20 size-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <SettingsHeader
          onBack={goBack}
          changedCount={changedCount}
          onResetAll={handleReset}
          confirmReset={confirmReset}
        />

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,420px)] xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,450px)] lg:gap-8">
            <div className="flex flex-col gap-5 min-w-0">
              <SettingsNavigation
                sections={SECTIONS}
                activeSection={activeSection}
                onSelectSection={setActiveSection}
              />

              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-base-content">
                    {currentSectionMeta?.label}
                  </h2>
                  <p className="text-xs text-base-content/65 mt-0.5">
                    {currentSectionMeta?.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobilePreview(!showMobilePreview)}
                  className="lg:hidden flex items-center gap-1.5 btn btn-ghost btn-sm rounded-full border border-base-300 text-xs font-semibold"
                >
                  {showMobilePreview ? (
                    <>
                      <EyeOff className="size-3.5 text-primary" />
                      <span>Hide Preview</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5 text-primary" />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showMobilePreview && (
                  <motion.div
                    key="mobile-preview-box"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SETTINGS_SPRING}
                    className="lg:hidden overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-3 sm:p-4 shadow-xl"
                  >
                    <LiveChatPreview
                      appearance={appearance}
                      privacy={privacy}
                      chatPrefs={chatPrefs}
                      settings={settings}
                      isSaving={appearanceSaving}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection}
                  role="tabpanel"
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
                      handleReset={handleReset}
                      confirmReset={confirmReset}
                    />
                  )}

                  {activeSection === "e2ee" && <E2EESettingsSection />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hidden lg:flex flex-col sticky top-24 min-w-0">
              <LiveChatPreview
                appearance={appearance}
                privacy={privacy}
                chatPrefs={chatPrefs}
                settings={settings}
                isSaving={appearanceSaving}
              />
            </div>
          </div>
        </main>
      </motion.div>
    </MotionConfig>
  );
}
