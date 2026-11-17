import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  UserX,
  UserCheck,
  Eye,
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import SettingsToggle from "../common/SettingsToggle";
import SettingsSegmented from "../common/SettingsSegmented";

const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "Contacts" },
  { value: "nobody", label: "Nobody" },
];

export default function PrivacyCheckupModal({
  isOpen,
  onClose,
  privacy,
  setPrivacy,
  onOpenBlocked,
  onOpenAppLock,
}) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Choose who can contact you",
      subtitle: "Review and manage blocked contacts.",
      icon: UserX,
      render: () => (
        <div className="space-y-4">
          <div
            onClick={onOpenBlocked}
            className="p-4 rounded-2xl bg-base-200/50 border border-base-300/60 flex items-center justify-between cursor-pointer hover:bg-base-200 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-base-content">
                Blocked Contacts
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                Manage accounts you have blocked from messaging or calling you.
              </p>
            </div>
            <ChevronRight className="size-4 text-base-content/40 shrink-0" />
          </div>
        </div>
      ),
    },
    {
      title: "Control your personal info",
      subtitle:
        "Choose who can see when you're online and your personal profile details.",
      icon: Eye,
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-base-content">
                Last Seen
              </span>
              <span className="text-[11px] text-base-content/60 capitalize">
                {privacy.lastSeenVisibility}
              </span>
            </div>
            <SettingsSegmented
              label="Checkup Last seen"
              value={privacy.lastSeenVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) => setPrivacy("lastSeenVisibility", v)}
              fullWidth
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-base-content">
                Profile Photo
              </span>
              <span className="text-[11px] text-base-content/60 capitalize">
                {privacy.profilePhotoVisibility}
              </span>
            </div>
            <SettingsSegmented
              label="Checkup Profile photo"
              value={privacy.profilePhotoVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) => setPrivacy("profilePhotoVisibility", v)}
              fullWidth
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-base-content">
                About Bio
              </span>
              <span className="text-[11px] text-base-content/60 capitalize">
                {privacy.aboutVisibility}
              </span>
            </div>
            <SettingsSegmented
              label="Checkup About"
              value={privacy.aboutVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) => setPrivacy("aboutVisibility", v)}
              fullWidth
            />
          </div>
        </div>
      ),
    },
    {
      title: "Add more privacy to your chats",
      subtitle:
        "Decide whether to share read checkmarks and real-time typing signals.",
      icon: UserCheck,
      render: () => (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300/60 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-base-content">
                Read Receipts
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                Shows blue double checkmarks when messages are seen.
              </p>
            </div>
            <SettingsToggle
              checked={Boolean(privacy.readReceipts)}
              onChange={(v) => setPrivacy("readReceipts", v)}
              label="Read receipts"
            />
          </div>

          <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300/60 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-base-content">
                Typing Indicator
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                Broadcasts when you are typing inside a conversation.
              </p>
            </div>
            <SettingsToggle
              checked={Boolean(privacy.typingIndicator)}
              onChange={(v) => setPrivacy("typingIndicator", v)}
              label="Typing indicator"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Add more protection to your account",
      subtitle:
        "Lock Chatty with a secure 4-digit PIN for device-level security.",
      icon: Lock,
      render: () => (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-base-200/50 border border-base-300/60 text-center space-y-3">
            <div className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-base-content">
                App Lock & PIN
              </p>
              <p className="text-xs text-base-content/60 mt-1 max-w-sm mx-auto">
                {privacy.appLockEnabled
                  ? "App Lock is currently ENABLED. You will be asked for your PIN when reopening Chatty."
                  : "Protect your conversations from unauthorized access when leaving your device unattended."}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAppLock}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-content hover:bg-primary/90 transition-colors shadow-sm"
            >
              {privacy.appLockEnabled
                ? "Change or Disable PIN"
                : "Configure App Lock PIN"}
            </button>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-base-200/80 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base sm:text-lg text-base-content tracking-tight">
                    Privacy Checkup
                  </h3>
                  <span className="badge badge-primary badge-sm">
                    {currentStep + 1} of {steps.length}
                  </span>
                </div>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Review and strengthen your security posture
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200/60 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-base-200 w-full">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "25%" }}
              animate={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div>
              <h4 className="font-semibold text-base text-base-content flex items-center gap-2">
                <step.icon className="size-4 text-primary" />
                <span>{step.title}</span>
              </h4>
              <p className="text-xs text-base-content/60 mt-0.5 leading-relaxed">
                {step.subtitle}
              </p>
            </div>

            {step.render()}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-base-200/80 px-5 py-3.5 bg-base-200/30">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-base-200 hover:bg-base-300 text-base-content transition-colors flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-content hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>{isLast ? "Done" : "Next"}</span>
              {isLast ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
