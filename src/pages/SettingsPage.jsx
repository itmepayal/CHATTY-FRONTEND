import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Palette,
  RotateCcw,
  Send,
  Shield,
  Smile,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useAppearanceStore } from "../store/useAppearanceStore";
import { useSettingsStore, SETTINGS_DEFAULTS } from "../store/UseSettingsStore";
import { usePrivacyStore } from "../store/usePrivacyStore";
import { useChatPrefsStore } from "../store/useChatPrefsStore";
import { AI_TONES } from "../store/useAiStore";
import { THEME, PREVIEW_MESSAGE } from "../constants";

/* ------------------------------------------------------------------ */
/*  Motion presets (sirf framer-motion, koi CSS animation nahi)        */
/* ------------------------------------------------------------------ */
const SPRING = { type: "spring", stiffness: 420, damping: 32 };
const SOFT = { type: "spring", stiffness: 260, damping: 28 };

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.015 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: SOFT },
};

// short = chhoti screen par dikhne wala naam
const SECTIONS = [
  {
    id: "appearance",
    label: "Appearance",
    short: "Look",
    icon: Palette,
    desc: "Theme, text size and how messages look.",
  },
  {
    id: "chat",
    label: "Chat",
    short: "Chat",
    icon: MessageSquare,
    desc: "How the message box behaves.",
  },
  {
    id: "privacy",
    label: "Privacy",
    short: "Privacy",
    icon: Shield,
    desc: "Control what others can see about you.",
  },
  {
    id: "ai",
    label: "AI Assistant",
    short: "AI",
    icon: Sparkles,
    desc: "Rewrite and grammar tools in the message box.",
  },
];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
const Spinner = ({ className = "size-3.5 text-base-content/40" }) => (
  <motion.span
    className="inline-flex"
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, ease: "linear", duration: 0.8 }}
  >
    <Loader2 className={className} />
  </motion.span>
);

/**
 * wide  = control chauda hai (segmented / select): mobile par title ke neeche
 *         full-width, sm+ par right side.
 * stack = hamesha title ke neeche.
 */
const Row = ({
  title,
  desc,
  children,
  stack = false,
  wide = false,
  disabled = false,
}) => (
  <motion.div variants={itemVariants}>
    <motion.div
      animate={{ opacity: disabled ? 0.5 : 1 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 py-4 ${
        stack
          ? "flex-col"
          : wide
            ? "flex-col sm:flex-row sm:items-center sm:justify-between"
            : "items-center justify-between"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {desc && (
          <p className="mt-1 text-xs leading-snug text-base-content/60">
            {desc}
          </p>
        )}
      </div>
      <div
        className={
          stack
            ? ""
            : wide
              ? "flex items-center gap-2 sm:shrink-0"
              : "flex shrink-0 items-center gap-2"
        }
      >
        {children}
      </div>
    </motion.div>
  </motion.div>
);

// Custom switch: knob layout-animation se slide hota hai
const Toggle = ({ checked, onChange, label, disabled }) => (
  <motion.button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    whileTap={disabled ? undefined : { scale: 0.92 }}
    className={`relative flex h-7 w-12 shrink-0 items-center rounded-full bg-base-300 p-1 ring-1 ring-base-content/10 before:absolute before:-inset-2 before:content-[''] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary ${
      checked ? "justify-end" : "justify-start"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
  >
    <motion.span
      aria-hidden
      className="absolute inset-0 rounded-full bg-primary"
      initial={false}
      animate={{ opacity: checked ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    />
    <motion.span
      layout
      transition={SPRING}
      className="relative z-10 size-5 rounded-full bg-base-100 shadow-md"
    />
  </motion.button>
);

// Active pill options ke beech slide karta hai (layoutId)
const Segmented = ({ value, options, onChange, label }) => (
  <LayoutGroup id={`seg-${label}`}>
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-full max-w-full rounded-xl bg-base-200 p-1 sm:w-auto"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.94 }}
            className={`relative flex-1 rounded-lg px-3 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-primary sm:flex-none sm:py-1.5 ${
              active
                ? "text-primary"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            {active && (
              <motion.span
                layoutId="seg-pill"
                transition={SPRING}
                className="absolute inset-0 rounded-lg bg-base-100 shadow-sm"
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  </LayoutGroup>
);

const Card = ({ children }) => (
  <motion.div
    variants={listVariants}
    initial="hidden"
    animate="show"
    className="divide-y divide-base-300/70 rounded-2xl border border-base-300 bg-base-100 px-4 sm:px-5"
  >
    {children}
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, desc }) => (
  <div className="flex items-center gap-3">
    <motion.span
      initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={SPRING}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
    >
      <Icon className="size-5" />
    </motion.span>
    <div className="min-w-0">
      <h2 className="text-base font-semibold leading-tight">{title}</h2>
      <p className="text-xs text-base-content/60">{desc}</p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    appearance,
    setAppearance,
    isSaving: appearanceSaving,
  } = useAppearanceStore();
  const theme = appearance.theme;
  const { settings: s, setSetting: set, resetSettings } = useSettingsStore();
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

  const [section, setSection] = useState("appearance");
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef(null);

  // OS "reduce motion" ya app ki Reduce motion setting, dono me loops band
  const prefersReduced = useReducedMotion();
  const reduce = Boolean(prefersReduced || s.reduceMotion);

  useEffect(() => {
    fetchPrivacy();
    fetchChatPrefs();
  }, [fetchPrivacy, fetchChatPrefs]);

  // Page khula hai to peeche wali app scroll na ho
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // unmount par reset-confirm timer saaf
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  // location.key === "default" => ye app ki pehli entry hai (back karne par
  // app se bahar chala jaata), isliye home par bhejo.
  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  // Esc dabane par wapas
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const changedCount = useMemo(
    () =>
      Object.keys(SETTINGS_DEFAULTS).filter(
        (k) => s[k] !== SETTINGS_DEFAULTS[k],
      ).length,
    [s],
  );

  const current = SECTIONS.find((x) => x.id === section);

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearTimeout(resetTimer.current);
    resetSettings();
    setConfirmReset(false);
    toast.success("Settings reset");
  };

  const playTestSound = () => {
    if (!s.messageSound) {
      toast("Turn on message sound to test it");
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = (s.soundVolume / 100) * 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } catch {}
    toast("🔔 Ding!");
  };

  const handleDesktopNotifications = async (enabled) => {
    if (!enabled) return set("desktopNotifications", false);
    if (!("Notification" in window)) {
      toast.error("This browser doesn't support notifications");
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      set("desktopNotifications", true);
    } else {
      toast.error("Allow notifications in your browser to turn this on");
    }
  };

  const a = appearance;
  const radius =
    a.bubbleStyle === "sharp"
      ? "rounded-md"
      : a.bubbleStyle === "soft"
        ? "rounded-xl"
        : "rounded-2xl";
  const tailSent = a.bubbleStyle === "sharp" ? "" : "rounded-br-sm";
  const tailRecv = a.bubbleStyle === "sharp" ? "" : "rounded-bl-sm";
  const padY = a.density === "compact" ? "py-1" : "py-2";
  const gapY = a.density === "compact" ? "space-y-1.5" : "space-y-3";
  const textSize =
    a.fontSize === "sm"
      ? "text-xs"
      : a.fontSize === "lg"
        ? "text-base"
        : "text-sm";
  const timeText = a.timeFormat === "24h" ? "14:30" : "2:30 PM";

  /* ---------------------------- sections --------------------------- */
  const renderSection = () => {
    switch (section) {
      case "appearance":
        return (
          <>
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-5">
              <h3 className="text-sm font-semibold">Theme</h3>
              <p className="mb-4 mt-1 text-xs text-base-content/60">
                Pick a colour theme. The preview updates right away.
              </p>
              <LayoutGroup id="theme-grid">
                {/* layoutScroll: scroll hone wale container ke andar layoutId
                    animation sahi position par chale */}
                <motion.div
                  layoutScroll
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                  className="grid max-h-72 grid-cols-3 gap-2.5 overflow-y-auto p-1 pr-2 min-[480px]:grid-cols-4 md:grid-cols-6 lg:max-h-60 lg:grid-cols-4 xl:grid-cols-5"
                >
                  {THEME.map((t) => {
                    const active = theme === t;
                    return (
                      <motion.button
                        key={t}
                        type="button"
                        aria-pressed={active}
                        variants={itemVariants}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        className={`relative flex min-w-0 flex-col gap-1.5 rounded-xl p-1.5 text-left focus-visible:outline focus-visible:outline-primary ${
                          active ? "bg-base-200" : "hover:bg-base-200/60"
                        }`}
                        onClick={() => setAppearance("theme", t)}
                      >
                        {active && (
                          <motion.span
                            layoutId="theme-ring"
                            transition={SPRING}
                            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary"
                          />
                        )}
                        <div
                          className="relative h-10 w-full overflow-hidden rounded-lg border border-base-300/60 bg-base-100"
                          data-theme={t}
                        >
                          <div className="absolute inset-0 grid grid-cols-4 gap-px p-1.5">
                            <div className="rounded-sm bg-primary" />
                            <div className="rounded-sm bg-secondary" />
                            <div className="rounded-sm bg-accent" />
                            <div className="rounded-sm bg-neutral" />
                          </div>
                          <AnimatePresence>
                            {active && (
                              <motion.span
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={SPRING}
                                className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-content shadow"
                              >
                                <Check className="size-3" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="relative w-full truncate px-0.5 text-xs font-medium">
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </LayoutGroup>
            </div>

            <Card>
              <Row title="Font size" desc="Size of message text" wide>
                <Segmented
                  label="Font size"
                  value={a.fontSize}
                  onChange={(v) => setAppearance("fontSize", v)}
                  options={[
                    { value: "sm", label: "Small" },
                    { value: "md", label: "Medium" },
                    { value: "lg", label: "Large" },
                  ]}
                />
              </Row>
              <Row title="Bubble style" desc="Shape of message bubbles" wide>
                <Segmented
                  label="Bubble style"
                  value={a.bubbleStyle}
                  onChange={(v) => setAppearance("bubbleStyle", v)}
                  options={[
                    { value: "rounded", label: "Round" },
                    { value: "soft", label: "Soft" },
                    { value: "sharp", label: "Sharp" },
                  ]}
                />
              </Row>
              <Row title="Message spacing" desc="Space between messages" wide>
                <Segmented
                  label="Message spacing"
                  value={a.density}
                  onChange={(v) => setAppearance("density", v)}
                  options={[
                    { value: "comfortable", label: "Cozy" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
              </Row>
              <Row title="Show timestamps" desc="Time under each message">
                <Toggle
                  checked={a.showTimestamps}
                  onChange={(v) => setAppearance("showTimestamps", v)}
                  label="Show timestamps"
                />
              </Row>
              <Row
                title="Time format"
                desc="Format used for message times"
                disabled={!a.showTimestamps}
                wide
              >
                <Segmented
                  label="Time format"
                  value={a.timeFormat}
                  onChange={(v) => setAppearance("timeFormat", v)}
                  options={[
                    { value: "12h", label: "12-hour" },
                    { value: "24h", label: "24-hour" },
                  ]}
                />
              </Row>
            </Card>
          </>
        );

      case "chat":
        return (
          <Card>
            <Row
              title="Enter to send"
              desc="Off: Enter adds a new line, Ctrl+Enter sends"
            >
              {chatPrefsSaving && <Spinner />}
              <Toggle
                checked={chatPrefs.enterToSend}
                onChange={(v) => setChatPref("enterToSend", v)}
                label="Enter to send"
                disabled={chatPrefsLoading}
              />
            </Row>
            <Row title="Large emoji" desc="Show emoji-only messages bigger">
              {chatPrefsSaving && <Spinner />}
              <Toggle
                checked={chatPrefs.largeEmoji}
                onChange={(v) => setChatPref("largeEmoji", v)}
                label="Large emoji"
                disabled={chatPrefsLoading}
              />
            </Row>
            <Row
              title="Auto-scroll to new messages"
              desc="Jump to the latest message when you're at the bottom"
            >
              {chatPrefsSaving && <Spinner />}
              <Toggle
                checked={chatPrefs.autoScroll}
                onChange={(v) => setChatPref("autoScroll", v)}
                label="Auto-scroll"
                disabled={chatPrefsLoading}
              />
            </Row>
          </Card>
        );

      case "notifications":
        return (
          <>
            <Card>
              <Row title="Message sound" desc="Play a sound for new messages">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={playTestSound}
                >
                  <Volume2 className="size-3.5" />
                  Test
                </motion.button>
                <Toggle
                  checked={s.messageSound}
                  onChange={(v) => set("messageSound", v)}
                  label="Message sound"
                />
              </Row>
              <Row title="Volume" stack disabled={!s.messageSound}>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={s.soundVolume}
                    disabled={!s.messageSound}
                    onChange={(e) => set("soundVolume", Number(e.target.value))}
                    className="range range-primary range-xs flex-1"
                    aria-label="Volume"
                  />
                  <span className="w-10 text-right text-xs tabular-nums text-base-content/60">
                    {s.soundVolume}%
                  </span>
                </div>
              </Row>
              <Row
                title="Desktop notifications"
                desc="Get alerts when the tab is in the background"
              >
                <Toggle
                  checked={s.desktopNotifications}
                  onChange={handleDesktopNotifications}
                  label="Desktop notifications"
                />
              </Row>
              <Row
                title="Show message preview"
                desc="Off: notification only says “New message”"
                disabled={!s.desktopNotifications}
              >
                <Toggle
                  checked={s.messagePreview}
                  onChange={(v) => set("messagePreview", v)}
                  label="Message preview"
                  disabled={!s.desktopNotifications}
                />
              </Row>
            </Card>

            {/* notification sample */}
            <div>
              <p className="mb-2 text-xs font-medium text-base-content/60">
                How an alert will look
              </p>
              <motion.div
                animate={{ opacity: s.desktopNotifications ? 1 : 0.4 }}
                className="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-100 p-3.5 shadow-sm"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
                  J
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    John Duo
                  </p>
                  <p className="mt-0.5 truncate text-xs text-base-content/70">
                    {s.messagePreview
                      ? "Are we still on for tonight?"
                      : "New message"}
                  </p>
                </div>
              </motion.div>
              {!s.desktopNotifications && (
                <p className="mt-2 text-xs text-base-content/50">
                  Turn on desktop notifications to see alerts.
                </p>
              )}
            </div>
          </>
        );

      case "privacy":
        return (
          <Card>
            {privacyLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-base-content/50">
                <Spinner className="size-4" />
                <span className="text-sm">Loading privacy settings…</span>
              </div>
            ) : (
              <>
                <Row
                  title="Show online status"
                  desc="Let others see when you're online"
                >
                  <Toggle
                    checked={privacy.showOnlineStatus}
                    onChange={(v) => setPrivacy("showOnlineStatus", v)}
                    label="Show online status"
                    disabled={privacySaving}
                  />
                </Row>
                <Row
                  title="Read receipts"
                  desc="Show blue ticks when messages are seen"
                >
                  <Toggle
                    checked={privacy.readReceipts}
                    onChange={(v) => setPrivacy("readReceipts", v)}
                    label="Read receipts"
                    disabled={privacySaving}
                  />
                </Row>
                <Row
                  title="Typing indicator"
                  desc="Let others see when you're typing"
                >
                  <Toggle
                    checked={privacy.typingIndicator}
                    onChange={(v) => setPrivacy("typingIndicator", v)}
                    label="Typing indicator"
                    disabled={privacySaving}
                  />
                </Row>
                <AnimatePresence initial={false}>
                  {privacySaving && (
                    <motion.div
                      key="saving"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 px-1 py-2 text-xs text-base-content/50">
                        <Spinner className="size-3" />
                        Saving…
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </Card>
        );

      case "ai":
        return (
          <>
            <Card>
              <Row
                title="Enable AI assist"
                desc="Show the ✨ button in the message box"
              >
                <Toggle
                  checked={s.aiEnabled}
                  onChange={(v) => set("aiEnabled", v)}
                  label="Enable AI assist"
                />
              </Row>
              <Row
                title="Default rewrite tone"
                desc="Highlighted first in the AI menu"
                disabled={!s.aiEnabled}
                wide
              >
                <select
                  className="select select-bordered select-sm w-full sm:w-auto"
                  value={s.aiDefaultTone}
                  disabled={!s.aiEnabled}
                  onChange={(e) => set("aiDefaultTone", e.target.value)}
                  aria-label="Default rewrite tone"
                >
                  {AI_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </Row>
              <Row
                title="Highlight grammar changes"
                desc="Show what changed after “Fix grammar”"
                disabled={!s.aiEnabled}
              >
                <Toggle
                  checked={s.aiShowChanges}
                  onChange={(v) => set("aiShowChanges", v)}
                  label="Highlight grammar changes"
                  disabled={!s.aiEnabled}
                />
              </Row>
            </Card>

            {/* grammar sample */}
            <motion.div
              animate={{ opacity: s.aiEnabled ? 1 : 0.4 }}
              className="rounded-2xl border border-base-300 bg-base-100 p-4 text-sm"
            >
              <p className="mb-3 text-xs font-medium text-base-content/60">
                Fix grammar example
              </p>
              <p className="text-base-content/60 line-through decoration-base-content/30">
                i dont think we can make it tmrw
              </p>
              <p className="mt-1.5">
                {[
                  ["I", true],
                  [" don’t", true],
                  [" think we can make it", false],
                  [" tomorrow.", true],
                ].map(([text, changed], i) => (
                  <motion.span
                    key={i}
                    animate={{
                      backgroundColor:
                        changed && s.aiShowChanges
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(34,197,94,0)",
                    }}
                    transition={{ duration: 0.25 }}
                    className="rounded px-0.5"
                  >
                    {text}
                  </motion.span>
                ))}
              </p>
            </motion.div>
          </>
        );

      case "accessibility":
        return (
          <Card>
            <Row
              title="Reduce motion"
              desc="Turns off animations and transitions"
            >
              <Toggle
                checked={s.reduceMotion}
                onChange={(v) => set("reduceMotion", v)}
                label="Reduce motion"
              />
            </Row>
            <Row
              title="Larger text"
              desc="Quick shortcut for the font size option"
            >
              <Toggle
                checked={a.fontSize === "lg"}
                onChange={(v) => setAppearance("fontSize", v ? "lg" : "md")}
                label="Larger text"
              />
            </Row>
          </Card>
        );

      case "data":
        return (
          <Card>
            <Row
              title="Export settings"
              desc="Download your preferences as a JSON file"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                className="btn btn-outline btn-sm gap-1.5"
                onClick={exportSettings}
              >
                <Download className="size-4" />
                Export
              </motion.button>
            </Row>
            <Row
              title="Reset to defaults"
              desc="Restores every option on this page"
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                className={`btn btn-sm gap-1.5 ${
                  confirmReset ? "btn-error" : "btn-outline btn-error"
                }`}
                onClick={handleReset}
              >
                <RotateCcw className="size-4" />
                {confirmReset ? "Click again to confirm" : "Reset"}
              </motion.button>
            </Row>
          </Card>
        );

      default:
        return null;
    }
  };

  /* ------------------------------ page ----------------------------- */
  return (
    <MotionConfig reducedMotion={s.reduceMotion ? "always" : "user"}>
      {/* Full-screen layer: global Navbar ke upar aata hai, isliye navbar nahi dikhta.
          layoutRoot + layoutScroll: fixed + scroll container ke andar layout
          animations (tab pill, theme ring) sahi jagah par chalte hain. */}
      <motion.div
        layoutRoot
        layoutScroll
        className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-base-200"
      >
        {/* floating colour blobs (slow loop) */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
            animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
            animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
            transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
          />
        </div>

        {/* Header: Back button + title + reset (notch-safe) */}
        <motion.header
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SOFT}
          className="sticky top-0 z-20 border-b border-base-300 bg-base-100/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        >
          <div className="container mx-auto flex h-16 items-center gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
            <motion.button
              type="button"
              onClick={goBack}
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.92 }}
              aria-label="Go back"
              title="Back (Esc)"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-primary sm:size-10"
            >
              <motion.span
                variants={{ rest: { x: 0 }, hover: { x: -3 } }}
                transition={SPRING}
                className="flex"
              >
                <ArrowLeft className="size-5" />
              </motion.span>
            </motion.button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                Settings
              </h1>
              <p className="hidden truncate text-xs text-base-content/60 sm:block">
                Personalize how your chat looks and behaves
              </p>
            </div>

            <AnimatePresence initial={false}>
              {changedCount > 0 && (
                <motion.button
                  key="reset-all"
                  type="button"
                  onClick={handleReset}
                  initial={{ opacity: 0, scale: 0.8, x: 12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 12 }}
                  transition={SPRING}
                  whileTap={{ scale: 0.94 }}
                  className={`btn btn-sm shrink-0 gap-1.5 ${
                    confirmReset ? "btn-error" : "btn-ghost"
                  }`}
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">
                    {confirmReset
                      ? "Click again to confirm"
                      : `${changedCount} changed · Reset all`}
                  </span>
                  <span className="sm:hidden">
                    {confirmReset ? "Confirm?" : `Reset (${changedCount})`}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        <main className="container relative mx-auto pb-[max(3rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-5 sm:pt-6">
          <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* LEFT: settings */}
            <section className="min-w-0">
              <LayoutGroup id="settings-tabs">
                {/* Mobile: 4 barabar tabs (icon upar, naam neeche). sm+: ek line me */}
                <div
                  role="tablist"
                  aria-label="Settings sections"
                  className="mb-5 grid grid-cols-4 gap-1 rounded-2xl border border-base-300 bg-base-100/70 p-1.5 backdrop-blur sm:mb-6 sm:flex"
                >
                  {SECTIONS.map(({ id, label, short, icon: Icon }) => {
                    const active = section === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-label={label}
                        onClick={() => setSection(id)}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:gap-1.5 sm:px-3 sm:text-[13px] ${
                          active
                            ? "text-primary"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="tab-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl bg-base-100 shadow-sm ring-1 ring-base-300"
                          />
                        )}
                        <span className="relative z-10 flex min-w-0 flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5">
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate sm:hidden">{short}</span>
                          <span className="hidden whitespace-nowrap sm:inline">
                            {label}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={section}
                  role="tabpanel"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  <SectionHeader
                    icon={current.icon}
                    title={current.label}
                    desc={current.desc}
                  />
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* RIGHT: live preview */}
            <section className="flex min-h-0 min-w-0 flex-col gap-4 lg:sticky lg:top-24">
              <div className="flex shrink-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Live preview</h3>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={appearanceSaving ? "saving" : "idle"}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="truncate text-xs text-base-content/60"
                    >
                      {appearanceSaving
                        ? "Saving your appearance…"
                        : "Changes show up here instantly"}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING}
                    className="badge badge-primary badge-outline shrink-0 capitalize"
                  >
                    {theme}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Height viewport ke hisaab se: chhoti/landscape screen par kategi nahi */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={SOFT}
                className="relative flex h-[min(480px,calc(100dvh_-_9rem))] min-h-[340px] flex-col overflow-hidden rounded-3xl border border-base-300 shadow-2xl sm:h-[min(560px,calc(100dvh_-_9rem))] lg:h-[min(560px,calc(100dvh_-_11rem))]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20" />
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
                <div className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-6">
                  <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-xl">
                      {/* header */}
                      <div className="shrink-0 bg-gradient-to-r from-primary to-secondary px-4 py-3 text-primary-content">
                        <div className="flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-100 font-bold text-primary shadow-md ring-2 ring-white/40">
                                J
                              </div>
                              <AnimatePresence>
                                {privacy.showOnlineStatus && (
                                  <motion.span
                                    key="online-dot"
                                    initial={{ scale: 0 }}
                                    animate={
                                      reduce
                                        ? { scale: 1 }
                                        : { scale: [1, 1.25, 1] }
                                    }
                                    // exit ka apna transition: warna infinite repeat
                                    // ki wajah se element kabhi remove nahi hota
                                    exit={{ scale: 0, transition: SPRING }}
                                    transition={
                                      reduce
                                        ? SPRING
                                        : {
                                            repeat: Infinity,
                                            duration: 1.8,
                                            ease: "easeInOut",
                                          }
                                    }
                                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success ring-2 ring-base-100"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <div className="flex min-w-0 flex-col leading-tight">
                              <h4 className="truncate text-sm font-semibold">
                                John Duo
                              </h4>
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.p
                                  key={privacy.showOnlineStatus ? "on" : "off"}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.15 }}
                                  className="text-xs opacity-80"
                                >
                                  {privacy.showOnlineStatus
                                    ? "Online"
                                    : "Status hidden"}
                                </motion.p>
                              </AnimatePresence>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 opacity-90">
                            <MoreVertical size={16} />
                          </div>
                        </div>
                      </div>

                      {/* messages */}
                      <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="show"
                        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-base-100 p-3 sm:p-4 ${gapY}`}
                      >
                        <motion.div
                          variants={itemVariants}
                          className="flex justify-center"
                        >
                          <span className="rounded-full bg-base-200 px-3 py-1 text-[10px] font-medium text-base-content/60">
                            Today
                          </span>
                        </motion.div>

                        {PREVIEW_MESSAGE.map((message) => {
                          const showTicks =
                            message.isSent && privacy.readReceipts;
                          return (
                            <motion.div
                              key={message.id}
                              variants={itemVariants}
                              layout
                              transition={SOFT}
                              className={`flex ${
                                message.isSent ? "justify-end" : "justify-start"
                              }`}
                            >
                              <motion.div
                                layout
                                transition={SOFT}
                                className={`min-w-0 max-w-[85%] px-3.5 sm:max-w-[80%] ${padY} shadow-sm ${radius} ${
                                  message.isSent
                                    ? `bg-gradient-to-br from-primary to-secondary text-primary-content ${tailSent}`
                                    : `bg-base-200 text-base-content ${tailRecv}`
                                }`}
                              >
                                <motion.p
                                  layout="position"
                                  className={`[overflow-wrap:anywhere] ${textSize}`}
                                >
                                  {message.content}
                                </motion.p>
                                <AnimatePresence initial={false}>
                                  {(a.showTimestamps || showTicks) && (
                                    <motion.div
                                      key="meta"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className={`flex items-center justify-end gap-1 overflow-hidden text-[10px] ${
                                        message.isSent
                                          ? "text-primary-content/80"
                                          : "text-base-content/60"
                                      }`}
                                    >
                                      <span className="mt-1 flex items-center gap-1">
                                        {a.showTimestamps && (
                                          <span>{timeText}</span>
                                        )}
                                        <AnimatePresence initial={false}>
                                          {showTicks && (
                                            <motion.span
                                              key="ticks"
                                              initial={{
                                                scale: 0,
                                                opacity: 0,
                                              }}
                                              animate={{
                                                scale: 1,
                                                opacity: 1,
                                              }}
                                              exit={{ scale: 0, opacity: 0 }}
                                              transition={SPRING}
                                              className="flex"
                                            >
                                              <CheckCheck size={12} />
                                            </motion.span>
                                          )}
                                        </AnimatePresence>
                                      </span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            </motion.div>
                          );
                        })}

                        {/* emoji-only sample */}
                        <motion.div
                          variants={itemVariants}
                          layout
                          className="flex justify-end"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {chatPrefs.largeEmoji ? (
                              <motion.span
                                key="large"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={SPRING}
                                className="text-4xl leading-tight"
                              >
                                👍🔥
                              </motion.span>
                            ) : (
                              <motion.span
                                key="small"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={SPRING}
                                className={`bg-primary px-3.5 ${padY} ${textSize} text-primary-content ${radius} ${tailSent}`}
                              >
                                👍🔥
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <AnimatePresence initial={false}>
                          {privacy.typingIndicator && (
                            <motion.div
                              key="typing"
                              layout
                              initial={{ opacity: 0, y: 8, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.9 }}
                              transition={SPRING}
                              className="flex justify-start"
                            >
                              <div
                                className={`flex items-center gap-1 bg-base-200 px-4 py-3 shadow-sm ${radius} ${tailRecv}`}
                                aria-label="John is typing"
                              >
                                {[0, 1, 2].map((i) => (
                                  <motion.span
                                    key={i}
                                    animate={
                                      reduce ? undefined : { y: [0, -4, 0] }
                                    }
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.9,
                                      delay: i * 0.15,
                                      ease: "easeInOut",
                                    }}
                                    className="h-1.5 w-1.5 rounded-full bg-base-content/50"
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* input */}
                      <div className="shrink-0 border-t border-base-300 bg-base-100 p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-base-300 bg-base-200 px-3">
                            <Smile
                              size={18}
                              className="shrink-0 text-base-content/60"
                            />
                            <AnimatePresence initial={false}>
                              {s.aiEnabled && (
                                <motion.span
                                  key="ai"
                                  initial={{ scale: 0, rotate: -90, width: 0 }}
                                  animate={{ scale: 1, rotate: 0, width: 24 }}
                                  exit={{ scale: 0, rotate: 90, width: 0 }}
                                  transition={SPRING}
                                  className="flex h-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content"
                                  title="AI assist"
                                >
                                  <Sparkles className="size-3.5" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                            <input
                              type="text"
                              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                              placeholder="Type a message..."
                              value="This is a preview"
                              readOnly
                              tabIndex={-1}
                              aria-label="Message preview"
                            />
                            <Paperclip
                              size={16}
                              className="shrink-0 text-base-content/60"
                            />
                          </div>
                          <motion.button
                            type="button"
                            aria-label="Send"
                            tabIndex={-1}
                            whileHover={reduce ? undefined : { scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={SPRING}
                            className="btn btn-circle btn-primary h-11 min-h-0 w-11 shrink-0 shadow-lg"
                          >
                            <Send size={18} />
                          </motion.button>
                        </div>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.p
                            key={chatPrefs.enterToSend ? "enter" : "ctrl"}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="mt-1.5 px-1 text-[10px] text-base-content/50"
                          >
                            {chatPrefs.enterToSend
                              ? "Enter to send · Shift+Enter for a new line"
                              : "Enter for a new line · Ctrl+Enter to send"}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>
          </div>
        </main>
      </motion.div>
    </MotionConfig>
  );
};

export default SettingsPage;
