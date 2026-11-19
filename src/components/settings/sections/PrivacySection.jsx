import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ChevronRight,
  UserX,
  Lock,
  Shield,
  LockKeyhole,
  MessageSquareText,
  Users,
  Settings2,
} from "lucide-react";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";
import { usePrivacyStore } from "../../../store/usePrivacyStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useAppLockStore } from "../../../store/useAppLockStore";
import { useGroupStore } from "../../../store/useGroupStore";
import PersonalInfoCard from "../privacy/PersonalInfoCard";
import ContactExclusionModal from "../privacy/ContactExclusionModal";
import BlockedContactsModal from "../privacy/BlockedContactsModal";
import PrivacyCheckupModal from "../privacy/PrivacyCheckupModal";
import AppLockModal from "../privacy/AppLockModal";

export default function PrivacySection({
  privacy,
  setPrivacy,
  privacyLoading = false,
  privacySaving = false,
}) {
  const { updateExceptions } = usePrivacyStore();
  const { authUser, blockedUsersList, fetchBlockedUsers } = useAuthStore();
  const {
    isConfigured,
    autoLockDuration,
    biometricsEnabled,
    lockNow,
  } = useAppLockStore();
  const groups = useGroupStore((s) => s.groups || []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // Modals state
  const [checkupOpen, setCheckupOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [appLockModal, setAppLockModal] = useState({
    open: false,
    initialMode: "VIEW",
  });

  const [exclusionConfig, setExclusionConfig] = useState({
    isOpen: false,
    title: "",
    description: "",
    field: "",
    mode: "exclude",
    selectedIds: [],
  });

  const openExclusion = (field, title, description, mode = "exclude") => {
    const currentList =
      usePrivacyStore.getState().privacy?.[field] || privacy?.[field] || [];
    setExclusionConfig({
      isOpen: true,
      title,
      description,
      field,
      mode,
      selectedIds: currentList,
    });
  };

  const handleExclusionSave = async (ids) => {
    if (exclusionConfig.field) {
      await updateExceptions(exclusionConfig.field, ids);
    }
  };

  const blockedCount = Math.max(
    authUser?.blockedUsers?.length || 0,
    blockedUsersList?.length || 0,
  );
  const lockedList = (privacy?.lockedChats || []).map(String);
  const groupIds = new Set(groups.map((g) => String(g._id ?? g.id)));
  const lockedGroupCount = lockedList.filter((id) => groupIds.has(id)).length;
  const lockedIndividualCount = lockedList.filter((id) => !groupIds.has(id)).length;

  return (
    <div className="space-y-5">
      {/* Privacy Checkup Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-primary text-primary-content shadow-sm shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-base-content tracking-tight">
                Privacy Checkup
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-base-content/70 max-w-md leading-relaxed">
                Control your privacy and choose the right settings for you.
                Review personal info, read receipts, and screen lock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCheckupOpen(true)}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-primary text-primary-content text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
          >
            Start Checkup
          </button>
        </div>
      </div>

      {/* Card 1: Personal Information Visibility */}
      <PersonalInfoCard
        privacy={privacy}
        setPrivacy={setPrivacy}
        privacyLoading={privacyLoading}
        privacySaving={privacySaving}
        openExclusion={openExclusion}
      />

      {/* Card 2: Activity & Read Receipts */}
      <SettingsCard
        title="Activity & Read Receipts"
        subtitle="Manage communication signals and indicators sent to other users."
      >
        <SettingsRow
          title="Read receipts"
          desc="Show blue checkmarks when messages have been viewed. Note: if turned off, you will also not see read receipts from others."
          toggle={
            <SettingsToggle
              checked={privacy.readReceipts}
              onChange={(v) => setPrivacy("readReceipts", v)}
              label="Read receipts"
              disabled={privacySaving}
            />
          }
        />

        <SettingsRow
          title="Typing indicator"
          desc="Transmit a real-time typing bubble to the other user when you are composing text."
          toggle={
            <SettingsToggle
              checked={privacy.typingIndicator}
              onChange={(v) => setPrivacy("typingIndicator", v)}
              label="Typing indicator"
              disabled={privacySaving}
            />
          }
        />
      </SettingsCard>

      {/* Card 3: Security & Screen Lock */}
      <SettingsCard
        title="Security & Screen Lock"
        subtitle="Lock Chatty with a secure PIN and manage blocked contacts."
      >
        <div
          onClick={() => setBlockedOpen(true)}
          className="flex items-center justify-between py-3.5 cursor-pointer hover:bg-base-200/50 -mx-4 px-4 sm:-mx-6 sm:px-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-error/10 text-error">
              <UserX className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-base-content">
                Blocked Contacts
              </p>
              <p className="text-xs text-base-content/60">
                {blockedCount} contact{blockedCount === 1 ? "" : "s"} blocked
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-base-content/40" />
        </div>

        {/* Category 1: App Lock */}
        <div className="py-4 border-t border-base-200/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Lock className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-base-content">
                    App Lock
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isConfigured
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-base-200 text-base-content/60 border-base-300"
                    }`}
                  >
                    {isConfigured ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  {isConfigured
                    ? `Authentication: 4-digit PIN${biometricsEnabled ? " + Biometrics" : ""} · Locks ${
                        autoLockDuration === "immediately"
                          ? "immediately upon leaving"
                          : `after ${autoLockDuration}`
                      }`
                    : "Require PIN to unlock Chatty and secure your messages on this device."}
                </p>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {isConfigured ? (
                    <>
                      <button
                        type="button"
                        onClick={() => lockNow()}
                        className="px-2.5 py-1 rounded-lg bg-base-200 hover:bg-base-300 text-base-content text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Lock Chatty immediately"
                      >
                        <LockKeyhole className="size-3" />
                        <span>Lock Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAppLockModal({ open: true, initialMode: "VIEW" })
                        }
                        className="px-2.5 py-1 rounded-lg bg-base-200 hover:bg-base-300 text-base-content text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Settings2 className="size-3" />
                        <span>Manage App Lock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAppLockModal({
                            open: true,
                            initialMode: "VERIFY_FOR_DISABLE",
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error text-xs font-semibold transition-colors"
                      >
                        Disable
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setAppLockModal({
                          open: true,
                          initialMode: "ENTER_NEW",
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-content text-xs font-semibold transition-colors"
                    >
                      Set Up App Lock
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              <SettingsToggle
                checked={isConfigured}
                onChange={(targetChecked) => {
                  if (targetChecked) {
                    setAppLockModal({ open: true, initialMode: "ENTER_NEW" });
                  } else {
                    setAppLockModal({
                      open: true,
                      initialMode: "VERIFY_FOR_DISABLE",
                    });
                  }
                }}
                label="Toggle App Lock"
              />
            </div>
          </div>
        </div>

        {/* Category 2: Individual Chat Lock */}
        <div className="py-4 border-t border-base-200/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <MessageSquareText className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-base-content">
                    Individual Chat Lock
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      lockedIndividualCount > 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-base-200 text-base-content/60 border-base-300"
                    }`}
                  >
                    {lockedIndividualCount > 0 ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Individual direct conversations have independent lock settings.
                  Open any chat&apos;s Contact Info to lock or unlock it with your PIN.
                </p>
                <p className="text-xs font-medium text-base-content/80 mt-2">
                  {lockedIndividualCount > 0
                    ? `${lockedIndividualCount} conversation${
                        lockedIndividualCount === 1 ? "" : "s"
                      } locked with PIN`
                    : "No individual conversations locked"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category 3: Group Chat Lock */}
        <div className="py-4 border-t border-base-200/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Users className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-base-content">
                    Group Chat Lock
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      lockedGroupCount > 0
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-base-200 text-base-content/60 border-base-300"
                    }`}
                  >
                    {lockedGroupCount > 0 ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Each group chat has an independent security configuration. Open
                  any group&apos;s Group Info panel to manage its lock.
                </p>
                <p className="text-xs font-medium text-base-content/80 mt-2">
                  {lockedGroupCount > 0
                    ? `${lockedGroupCount} group${
                        lockedGroupCount === 1 ? "" : "s"
                      } locked with PIN`
                    : "No group chats locked"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Modals */}
      <ContactExclusionModal
        isOpen={exclusionConfig.isOpen}
        onClose={() =>
          setExclusionConfig((prev) => ({ ...prev, isOpen: false }))
        }
        title={exclusionConfig.title}
        description={exclusionConfig.description}
        initialSelectedIds={exclusionConfig.selectedIds}
        onSave={handleExclusionSave}
        mode={exclusionConfig.mode}
      />

      <BlockedContactsModal
        isOpen={blockedOpen}
        onClose={() => setBlockedOpen(false)}
      />

      <PrivacyCheckupModal
        isOpen={checkupOpen}
        onClose={() => setCheckupOpen(false)}
        privacy={privacy}
        setPrivacy={setPrivacy}
        onOpenBlocked={() => {
          setCheckupOpen(false);
          setBlockedOpen(true);
        }}
        onOpenAppLock={() => {
          setCheckupOpen(false);
          setAppLockModal({ open: true, initialMode: "ENTER_NEW" });
        }}
      />

      <AppLockModal
        isOpen={appLockModal.open}
        initialMode={appLockModal.initialMode}
        onClose={() =>
          setAppLockModal({ open: false, initialMode: "VIEW" })
        }
      />
    </div>
  );
}
