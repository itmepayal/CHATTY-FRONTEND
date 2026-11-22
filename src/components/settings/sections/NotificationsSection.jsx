import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Moon,
  MoonStar,
  MessageSquare,
  UsersRound,
  Phone,
  UserPlus,
  Shield,
  Info,
  AtSign,
  Smile,
  Paperclip,
  Clock,
  Sparkles,
  Smartphone,
  Vibrate,
  Lock,
  Calendar,
  Radio,
  Sliders,
  Check,
  Search,
} from "lucide-react";
import { customToast } from "../../toast";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";
import { useNotificationSettingsStore } from "../../../store/useNotificationSettingsStore";
import {
  getPermissionState,
  requestPermission,
  playMessageSound,
  showDesktopNotification,
  triggerVibration,
} from "../../../services/notificationService";

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const RINGTONES = [
  { id: "default", name: "Default Chime" },
  { id: "soft_bell", name: "Soft Bell" },
  { id: "crisp_pulse", name: "Crisp Pulse" },
  { id: "subtle_ding", name: "Subtle Ding" },
];

export default function NotificationsSection() {
  const {
    settings,
    preferences,
    loading,
    saving,
    updateSetting,
    updatePreference,
    toggleMasterNotifications,
    enableAllNotifications,
    disableAllNotifications,
    loadSettings,
    unmuteChat,
  } = useNotificationSettingsStore();

  const [permissionState, setPermissionState] = useState(getPermissionState());
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [mutedSearch, setMutedSearch] = useState("");

  const syncPermission = useCallback(() => {
    setPermissionState(getPermissionState());
  }, []);

  useEffect(() => {
    syncPermission();
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, [syncPermission]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (saving) {
      setShowSavedFeedback(false);
    } else {
      setShowSavedFeedback(true);
      const timer = setTimeout(() => setShowSavedFeedback(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saving]);

  const masterActive =
    settings.masterEnabled !== false && preferences.masterEnabled !== false;

  const handleToggleDesktopNotifications = async (enabled) => {
    if (!enabled) {
      await updateSetting("desktopNotifications", false);
      return;
    }

    const currentPerm = getPermissionState();

    if (currentPerm === "unsupported") {
      customToast.error(
        "This browser does not support native desktop notifications.",
      );
      return;
    }

    if (currentPerm === "denied") {
      customToast.error(
        "Notifications are blocked in your browser settings. Please allow notifications for this site to enable this feature.",
        { duration: 5000 },
      );
      return;
    }

    if (currentPerm === "default") {
      const result = await requestPermission();
      setPermissionState(result);

      if (result === "granted") {
        await updateSetting("desktopNotifications", true);
        customToast.success("Desktop notifications enabled!");
      } else if (result === "denied") {
        customToast.error(
          "Notification permission was denied. Please allow notifications in your browser address bar.",
        );
      } else {
        customToast.info("Notification permission was dismissed.");
      }
      return;
    }

    if (currentPerm === "granted") {
      await updateSetting("desktopNotifications", true);
    }
  };

  const handleVolumePreview = (vol) => {
    playMessageSound({
      volume: vol,
      soundEnabled: true,
      masterEnabled: true,
      force: true,
    });
  };

  const handleSendTestNotification = () => {
    setIsTesting(true);

    if (settings.soundEnabled) {
      playMessageSound({
        volume: settings.soundVolume,
        soundEnabled: true,
        masterEnabled: true,
        force: true,
      });
    }

    if (settings.vibrationEnabled) {
      triggerVibration([150, 80, 150]);
    }

    const perm = getPermissionState();
    if (settings.desktopNotifications && perm === "granted") {
      showDesktopNotification({
        senderName: "Chatty Team",
        text: "Test notification: audio chime, vibration, and preview settings are functioning normally!",
        chatId: "test_preview_chat",
        messageType: "text",
        showPreview: settings.showPreview,
        previewPrivacy: settings.previewPrivacy,
        masterEnabled: true,
        desktopNotifications: true,
        force: true,
      });
      customToast.success("Test notification dispatched!");
    } else if (perm === "denied") {
      customToast.error(
        "Sound played. Desktop notifications could not be shown because browser permission is blocked.",
      );
    } else if (!settings.desktopNotifications) {
      customToast.info(
        "Audio chime played. Enable desktop notifications to see system alerts.",
      );
    } else {
      customToast.info(
        "Audio chime played. Grant browser notification permission to view system banners.",
      );
    }

    setTimeout(() => setIsTesting(false), 600);
  };

  const handleDndDurationChange = async (durationHours) => {
    if (durationHours === 0) {
      await updatePreference("dndEnabled", false);
      await updatePreference("dndUntil", null);
      customToast.info("Do Not Disturb disabled");
      return;
    }

    const untilDate =
      durationHours === -1
        ? null
        : new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

    await updatePreference("dndEnabled", true);
    await updatePreference("dndUntil", untilDate);
    customToast.success(
      durationHours === -1
        ? "Do Not Disturb enabled indefinitely"
        : `Do Not Disturb enabled for ${durationHours} hour${durationHours > 1 ? "s" : ""}`,
    );
  };

  const handleToggleQuietHoursDay = async (dayVal) => {
    const currentDays = preferences.quietHoursDays || [0, 1, 2, 3, 4, 5, 6];
    let nextDays;
    if (currentDays.includes(dayVal)) {
      if (currentDays.length === 1) {
        customToast.info("Quiet Hours schedule requires at least one active day.");
        return;
      }
      nextDays = currentDays.filter((d) => d !== dayVal);
    } else {
      nextDays = [...currentDays, dayVal].sort((a, b) => a - b);
    }
    await updatePreference("quietHoursDays", nextDays);
  };

  const filteredMutedConversations = useMemo(() => {
    const list = preferences.mutedConversations || [];
    if (!mutedSearch.trim()) return list;
    return list.filter((id) =>
      id.toLowerCase().includes(mutedSearch.trim().toLowerCase()),
    );
  }, [preferences.mutedConversations, mutedSearch]);

  const filteredMutedGroups = useMemo(() => {
    const list = preferences.mutedGroups || [];
    if (!mutedSearch.trim()) return list;
    return list.filter((id) =>
      id.toLowerCase().includes(mutedSearch.trim().toLowerCase()),
    );
  }, [preferences.mutedGroups, mutedSearch]);

  const isPermissionRevoked =
    settings.desktopNotifications && permissionState === "denied";

  return (
    <div className="space-y-6">
      {/* 1. MASTER NOTIFICATION CONTROL CENTER */}
      <SettingsCard
        title="Master Notification Control"
        subtitle="Manage global notification delivery across all devices and channels."
        headerAction={
          saving ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving…</span>
            </span>
          ) : showSavedFeedback ? (
            <span className="flex items-center gap-1 text-xs text-success font-medium">
              <CheckCircle2 className="size-3.5" />
              <span>Saved</span>
            </span>
          ) : null
        }
      >
        <SettingsRow
          title="Master Notification Switch"
          desc="Turn all incoming message, call, group, and story notifications on or off globally."
          icon={masterActive ? Bell : BellOff}
          badge={masterActive ? "ACTIVE" : "PAUSED"}
          toggle={
            <SettingsToggle
              checked={masterActive}
              onChange={(val) => toggleMasterNotifications(val)}
              disabled={loading || saving}
              label="Master Notification Switch"
            />
          }
        >
          <div className="w-full space-y-3 pt-1">
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                masterActive
                  ? "bg-primary/5 border-primary/20 text-base-content/80"
                  : "bg-warning/10 border-warning/30 text-warning-content"
              }`}
            >
              <Shield className="size-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="font-semibold text-base-content">
                  {masterActive
                    ? "Notifications are currently active"
                    : "All notifications are currently paused"}
                </p>
                <p className="text-base-content/65 leading-relaxed text-[11px]">
                  When disabled, audio chimes, desktop popups, and in-app banners
                  are silenced across all categories.{" "}
                  <strong className="text-primary font-semibold">
                    Critical security alerts (new device logins, password resets)
                    are always delivered
                  </strong>{" "}
                  to protect your account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => enableAllNotifications()}
                disabled={masterActive || saving}
                className="btn btn-xs btn-primary rounded-lg font-semibold text-[11px] h-8 px-3 disabled:opacity-40"
              >
                Enable All Notifications
              </button>
              <button
                type="button"
                onClick={() => disableAllNotifications()}
                disabled={!masterActive || saving}
                className="btn btn-xs btn-outline rounded-lg text-base-content/70 hover:text-base-content font-semibold text-[11px] h-8 px-3 disabled:opacity-40"
              >
                Disable All Notifications
              </button>
            </div>
          </div>
        </SettingsRow>
      </SettingsCard>

      {/* 2. CATEGORY-WISE NOTIFICATION CONTROLS */}
      <SettingsCard
        title="Category Notification Controls"
        subtitle="Fine-tune notifications for messages, calls, groups, contacts, stories, and security."
      >
        {/* Messages */}
        <div className="pt-3 pb-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <MessageSquare className="size-3.5" />
            <span>Messages & Content</span>
          </div>

          <SettingsRow
            title="Direct messages"
            desc="Notifications for one-on-one personal conversations"
            icon={MessageSquare}
            toggle={
              <SettingsToggle
                checked={preferences.messagesPersonal !== false}
                onChange={(val) => updatePreference("messagesPersonal", val)}
                disabled={loading || saving}
                label="Direct messages"
              />
            }
          />

          <SettingsRow
            title="Group messages"
            desc="Notifications for messages in joined group chats"
            icon={UsersRound}
            toggle={
              <SettingsToggle
                checked={preferences.messagesGroup !== false}
                onChange={(val) => updatePreference("messagesGroup", val)}
                disabled={loading || saving}
                label="Group messages"
              />
            }
          />

          <SettingsRow
            title="Replies & quotes"
            desc="Alerts when someone replies directly to your message"
            icon={MessageSquare}
            toggle={
              <SettingsToggle
                checked={preferences.messageReplies !== false}
                onChange={(val) => updatePreference("messageReplies", val)}
                disabled={loading || saving}
                label="Replies & quotes"
              />
            }
          />

          <SettingsRow
            title="Mentions & @all"
            desc="Alerts when you are mentioned by name or with group tags"
            icon={AtSign}
            toggle={
              <SettingsToggle
                checked={preferences.messageMentions !== false}
                onChange={(val) => updatePreference("messageMentions", val)}
                disabled={loading || saving}
                label="Mentions"
              />
            }
          />

          <SettingsRow
            title="Message reactions"
            desc="Alerts when someone reacts with an emoji to your messages"
            icon={Smile}
            toggle={
              <SettingsToggle
                checked={preferences.messageReactions !== false}
                onChange={(val) => updatePreference("messageReactions", val)}
                disabled={loading || saving}
                label="Message reactions"
              />
            }
          />

          <SettingsRow
            title="Media & attachments"
            desc="Alerts for photos, videos, voice notes, documents, and shared locations"
            icon={Paperclip}
            toggle={
              <SettingsToggle
                checked={preferences.mediaNotifications !== false}
                onChange={(val) => updatePreference("mediaNotifications", val)}
                disabled={loading || saving}
                label="Media & attachments"
              />
            }
          />
        </div>

        {/* Calls */}
        <div className="pt-4 pb-1 border-t border-base-200">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <Phone className="size-3.5" />
            <span>Voice & Video Calling</span>
          </div>

          <SettingsRow
            title="Voice calls"
            desc="Incoming audio call alerts and ringtones"
            icon={Phone}
            toggle={
              <SettingsToggle
                checked={preferences.callsVoice !== false}
                onChange={(val) => updatePreference("callsVoice", val)}
                disabled={loading || saving}
                label="Voice calls"
              />
            }
          />

          <SettingsRow
            title="Video calls"
            desc="Incoming video calling invitations"
            icon={Phone}
            toggle={
              <SettingsToggle
                checked={preferences.callsVideo !== false}
                onChange={(val) => updatePreference("callsVideo", val)}
                disabled={loading || saving}
                label="Video calls"
              />
            }
          />

          <SettingsRow
            title="Missed call alerts"
            desc="Notifications when you miss an incoming audio or video call"
            icon={Phone}
            toggle={
              <SettingsToggle
                checked={preferences.callsMissed !== false}
                onChange={(val) => updatePreference("callsMissed", val)}
                disabled={loading || saving}
                label="Missed call alerts"
              />
            }
          />

          <SettingsRow
            title="Group call invitations"
            desc="Alerts when a group video or audio call starts"
            icon={UsersRound}
            toggle={
              <SettingsToggle
                checked={preferences.callsGroup !== false}
                onChange={(val) => updatePreference("callsGroup", val)}
                disabled={loading || saving}
                label="Group call invitations"
              />
            }
          />
        </div>

        {/* Contacts & Groups */}
        <div className="pt-4 pb-1 border-t border-base-200">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <UserPlus className="size-3.5" />
            <span>Contacts & Group Management</span>
          </div>

          <SettingsRow
            title="Contact connection requests"
            desc="Alerts when someone invites you to connect"
            icon={UserPlus}
            toggle={
              <SettingsToggle
                checked={preferences.contactRequests !== false}
                onChange={(val) => updatePreference("contactRequests", val)}
                disabled={loading || saving}
                label="Contact requests"
              />
            }
          />

          <SettingsRow
            title="Contact request acceptances"
            desc="Alerts when someone accepts your connection request"
            icon={CheckCircle2}
            toggle={
              <SettingsToggle
                checked={preferences.contactAcceptance !== false}
                onChange={(val) => updatePreference("contactAcceptance", val)}
                disabled={loading || saving}
                label="Contact acceptances"
              />
            }
          />

          <SettingsRow
            title="Group invitations"
            desc="Alerts when you are invited to join a group"
            icon={UsersRound}
            toggle={
              <SettingsToggle
                checked={preferences.groupInvitations !== false}
                onChange={(val) => updatePreference("groupInvitations", val)}
                disabled={loading || saving}
                label="Group invitations"
              />
            }
          />

          <SettingsRow
            title="Group membership changes"
            desc="Alerts when members join, leave, are promoted to admin, or removed"
            icon={UsersRound}
            toggle={
              <SettingsToggle
                checked={preferences.groupMembershipEvents !== false}
                onChange={(val) => updatePreference("groupMembershipEvents", val)}
                disabled={loading || saving}
                label="Group membership events"
              />
            }
          />
        </div>

        {/* Stories */}
        <div className="pt-4 pb-1 border-t border-base-200">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
            <Sparkles className="size-3.5" />
            <span>Stories & Status</span>
          </div>

          <SettingsRow
            title="Story replies"
            desc="Alerts when friends send a direct reply to your active story"
            icon={Sparkles}
            toggle={
              <SettingsToggle
                checked={preferences.storiesReplies !== false}
                onChange={(val) => updatePreference("storiesReplies", val)}
                disabled={loading || saving}
                label="Story replies"
              />
            }
          />

          <SettingsRow
            title="Story reactions"
            desc="Alerts when friends react with emojis to your story"
            icon={Smile}
            toggle={
              <SettingsToggle
                checked={preferences.storiesReactions !== false}
                onChange={(val) => updatePreference("storiesReactions", val)}
                disabled={loading || saving}
                label="Story reactions"
              />
            }
          />

          <SettingsRow
            title="Story mentions"
            desc="Alerts when someone tags you in their story"
            icon={AtSign}
            toggle={
              <SettingsToggle
                checked={preferences.storiesMentions !== false}
                onChange={(val) => updatePreference("storiesMentions", val)}
                disabled={loading || saving}
                label="Story mentions"
              />
            }
          />

          <SettingsRow
            title="Favorites new stories"
            desc="Alerts when your favorite contacts share a new story"
            icon={Sparkles}
            toggle={
              <SettingsToggle
                checked={preferences.storiesFavorites !== false}
                onChange={(val) => updatePreference("storiesFavorites", val)}
                disabled={loading || saving}
                label="Favorites stories"
              />
            }
          />
        </div>

        {/* Security & System */}
        <div className="pt-4 pb-1 border-t border-base-200">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warning mb-2">
            <Shield className="size-3.5" />
            <span>Security & System (Mandatory Protections)</span>
          </div>

          <SettingsRow
            title="Security & new device logins"
            desc="Alerts when a new browser or device logs into your account"
            icon={Shield}
            badge="MANDATORY"
            toggle={
              <SettingsToggle
                checked={true}
                onChange={() => {
                  customToast.info("Security notifications are mandatory for account safety.");
                }}
                disabled={true}
                label="Security alerts"
              />
            }
          />

          <SettingsRow
            title="System announcements"
            desc="Platform maintenance windows and critical system status updates"
            icon={Info}
            toggle={
              <SettingsToggle
                checked={preferences.systemAnnouncements !== false}
                onChange={(val) => updatePreference("systemAnnouncements", val)}
                disabled={loading || saving}
                label="System announcements"
              />
            }
          />
        </div>
      </SettingsCard>

      {/* 3. DELIVERY CHANNELS */}
      <SettingsCard
        title="Delivery Channels"
        subtitle="Choose how and where notifications appear across your active devices."
      >
        <SettingsRow
          title="In-app alerts & badges"
          desc="Show floating toast banners and unread badges within the Chatty web app"
          icon={Bell}
          toggle={
            <SettingsToggle
              checked={settings.inAppNotifications !== false}
              onChange={(val) => updateSetting("inAppNotifications", val)}
              disabled={loading || saving}
              label="In-app alerts"
            />
          }
        />

        <SettingsRow
          title="Browser / desktop notifications"
          desc="Display native operating system banners when Chatty is in the background or minimized"
          icon={settings.desktopNotifications ? Bell : BellOff}
          toggle={
            <SettingsToggle
              checked={
                settings.desktopNotifications && permissionState !== "denied"
              }
              onChange={handleToggleDesktopNotifications}
              disabled={loading || saving || permissionState === "unsupported"}
              label="Desktop notifications"
            />
          }
        />

        {isPermissionRevoked && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error flex items-start gap-2.5 my-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Desktop notifications are blocked by your browser
              </p>
              <p className="text-error/80 leading-relaxed text-[11px]">
                To receive desktop banners, click the permissions lock icon next
                to the URL in your browser address bar and set Notifications to{" "}
                <strong>Allow</strong>.
              </p>
            </div>
          </div>
        )}

        {permissionState === "unsupported" && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-xs text-warning flex items-start gap-2.5 my-2">
            <HelpCircle className="size-4 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              Your browser does not support the Web Notification API. Audio
              chimes and in-app banners will continue to function normally.
            </p>
          </div>
        )}

        <SettingsRow
          title="Push notifications"
          desc="Synchronize notifications with mobile devices and background service workers"
          icon={Smartphone}
          toggle={
            <SettingsToggle
              checked={settings.pushNotifications !== false}
              onChange={(val) => updateSetting("pushNotifications", val)}
              disabled={loading || saving}
              label="Push notifications"
            />
          }
        />
      </SettingsCard>

      {/* 4. NOTIFICATION PREVIEW PRIVACY */}
      <SettingsCard
        title="Notification Preview Privacy"
        subtitle="Control how much sensitive message content is visible in system popups and previews."
      >
        <div className="py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "full",
                title: "Full Preview",
                desc: "Sender name, avatar, and message content/caption are displayed.",
                sampleSender: "Alex Rivera",
                sampleBody: "Hey, are you free for the design sync?",
              },
              {
                id: "sender_only",
                title: "Sender Only",
                desc: "Sender name is shown; message text is hidden for privacy.",
                sampleSender: "Alex Rivera",
                sampleBody: "New message",
              },
              {
                id: "hidden",
                title: "Hidden / Generic",
                desc: "All sender and message details are completely redacted.",
                sampleSender: "Chatty",
                sampleBody: "New notification",
              },
            ].map((option) => {
              const selected =
                (settings.previewPrivacy || "full") === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => updateSetting("previewPrivacy", option.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    selected
                      ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                      : "bg-base-200/50 border-base-300 hover:bg-base-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-base-content flex items-center gap-1.5">
                      {selected ? (
                        <Check className="size-3.5 text-primary" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-base-content/40 inline-block" />
                      )}
                      <span>{option.title}</span>
                    </span>
                    {selected && (
                      <span className="badge badge-primary badge-xs font-bold text-[9px]">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-base-content/65 leading-relaxed">
                    {option.desc}
                  </p>

                  {/* Mock Preview Card */}
                  <div className="p-2.5 rounded-xl bg-base-100 border border-base-300/80 shadow-2xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-primary/20 text-primary grid place-items-center text-[10px] font-bold">
                        {option.sampleSender.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-base-content truncate">
                        {option.sampleSender}
                      </span>
                      <span className="text-[9px] text-base-content/40 ml-auto">
                        now
                      </span>
                    </div>
                    <p className="text-[11px] text-base-content/75 truncate pl-7">
                      {option.sampleBody}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SettingsCard>

      {/* 5. SOUND AND VIBRATION CONTROLS */}
      <SettingsCard
        title="Sound & Vibration"
        subtitle="Configure incoming audio chimes, custom ringtones, and haptic feedback."
      >
        <SettingsRow
          title="Message incoming chime"
          desc="Play an audio chime whenever a message arrives in an active chat"
          icon={settings.soundEnabled ? Volume2 : VolumeX}
          toggle={
            <SettingsToggle
              checked={settings.soundEnabled}
              onChange={(val) => updateSetting("soundEnabled", val)}
              disabled={loading || saving}
              label="Message incoming sound"
            />
          }
        >
          <button
            type="button"
            onClick={() => handleVolumePreview(settings.soundVolume)}
            disabled={!settings.soundEnabled || loading}
            className="btn btn-ghost btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 border border-base-300 text-xs font-semibold px-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Preview chime"
            aria-label="Preview message sound"
          >
            <Volume2
              className={`size-4 ${
                settings.soundEnabled ? "text-primary" : "text-base-content/40"
              }`}
            />
            <span>Preview</span>
          </button>
        </SettingsRow>

        <SettingsRow
          title="Sound volume"
          desc="Adjust the playback volume of audio chimes and incoming alerts"
          icon={settings.soundVolume > 0 ? Volume2 : VolumeX}
          stack
          disabled={!settings.soundEnabled || loading}
          badge={`${settings.soundVolume}%`}
        >
          <div className="w-full space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/70">
              <span>Volume level</span>
              <span className="font-mono tabular-nums text-primary">
                {settings.soundVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.soundVolume}
              disabled={!settings.soundEnabled || loading}
              onChange={(e) =>
                updateSetting("soundVolume", Number(e.target.value))
              }
              onMouseUp={() => handleVolumePreview(settings.soundVolume)}
              onTouchEnd={() => handleVolumePreview(settings.soundVolume)}
              className="range range-primary range-sm w-full disabled:opacity-40 cursor-pointer"
              aria-label="Sound volume"
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title="Chime ringtone"
          desc="Select your preferred notification alert melody"
          icon={Sliders}
        >
          <select
            value={settings.ringtone || "default"}
            onChange={(e) => updateSetting("ringtone", e.target.value)}
            disabled={!settings.soundEnabled || loading}
            className="select select-sm rounded-xl bg-base-200 border-base-300 text-xs font-medium focus:outline-primary"
          >
            {RINGTONES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow
          title="Haptic vibration"
          desc="Vibrate on mobile and supported touch devices when alerts arrive"
          icon={Vibrate}
          toggle={
            <SettingsToggle
              checked={settings.vibrationEnabled !== false}
              onChange={(val) => updateSetting("vibrationEnabled", val)}
              disabled={loading || saving}
              label="Haptic vibration"
            />
          }
        />

        <SettingsRow
          title="Test notification"
          desc="Verify your current chime, vibration, and desktop notification settings"
          icon={Send}
        >
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={isTesting || loading}
            className="btn btn-primary btn-sm min-h-[44px] sm:min-h-[36px] rounded-xl gap-2 shadow-sm font-semibold w-full sm:w-auto"
          >
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span>Send test notification</span>
          </button>
        </SettingsRow>
      </SettingsCard>

      {/* 6. QUIET HOURS & DO NOT DISTURB */}
      <SettingsCard
        title="Quiet Hours & Do Not Disturb"
        subtitle="Automatically silence notifications during sleep hours or set quick timed mutes."
      >
        {/* Quick DND */}
        <SettingsRow
          title="Quick Do Not Disturb (DND)"
          desc="Temporarily silence incoming alerts. Security alerts will always bypass DND."
          icon={preferences.dndEnabled ? MoonStar : Moon}
          badge={preferences.dndEnabled ? "ACTIVE" : null}
          toggle={
            <SettingsToggle
              checked={preferences.dndEnabled}
              onChange={(val) => handleDndDurationChange(val ? -1 : 0)}
              disabled={loading || saving}
              label="Do Not Disturb"
            />
          }
        />

        {preferences.dndEnabled && (
          <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 space-y-2.5 mb-2">
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>Mute duration</span>
              </span>
              {preferences.dndUntil && (
                <span className="text-[11px] text-primary font-mono">
                  Until{" "}
                  {new Date(preferences.dndUntil).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: "1 hour", hours: 1 },
                { label: "8 hours", hours: 8 },
                { label: "24 hours", hours: 24 },
                { label: "Until turned off", hours: -1 },
              ].map(({ label, hours }) => {
                const isSelected =
                  hours === -1
                    ? !preferences.dndUntil
                    : preferences.dndUntil &&
                      Math.abs(
                        new Date(preferences.dndUntil).getTime() -
                          Date.now() -
                          hours * 3600 * 1000,
                      ) < 180000;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleDndDurationChange(hours)}
                    className={`btn btn-xs rounded-lg border-0 h-8 text-[11px] font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scheduled Quiet Hours */}
        <SettingsRow
          title="Scheduled Quiet Hours"
          desc="Automatically silence non-critical notifications on a recurring daily or weekly schedule"
          icon={Calendar}
          toggle={
            <SettingsToggle
              checked={preferences.quietHoursEnabled}
              onChange={(val) => updatePreference("quietHoursEnabled", val)}
              disabled={loading || saving}
              label="Scheduled Quiet Hours"
            />
          }
        />

        {preferences.quietHoursEnabled && (
          <div className="p-4 bg-base-200/50 rounded-2xl border border-base-300 space-y-4 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-base-content/80 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>Start time</span>
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursStart || "22:00"}
                  onChange={(e) =>
                    updatePreference("quietHoursStart", e.target.value)
                  }
                  className="input input-sm h-9 w-full rounded-xl bg-base-100 border-base-300 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-base-content/80 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>End time (supports overnight)</span>
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursEnd || "08:00"}
                  onChange={(e) =>
                    updatePreference("quietHoursEnd", e.target.value)
                  }
                  className="input input-sm h-9 w-full rounded-xl bg-base-100 border-base-300 text-xs font-mono"
                />
              </div>
            </div>

            {/* Days of Week */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-base-content/80">
                Active schedule days
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((d) => {
                  const active = (
                    preferences.quietHoursDays || [0, 1, 2, 3, 4, 5, 6]
                  ).includes(d.value);

                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleToggleQuietHoursDay(d.value)}
                      className={`btn btn-xs rounded-xl h-8 px-3 text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-content shadow-2xs"
                          : "bg-base-200 text-base-content/60 hover:bg-base-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-base-content/50 pt-1 border-t border-base-300/60">
              <span>
                Detected timezone:{" "}
                <strong className="text-base-content font-mono">
                  {preferences.quietHoursTimezone || "UTC"}
                </strong>
              </span>
              <span className="text-primary font-medium">
                Security alerts always delivered
              </span>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* 7. MUTED CONVERSATIONS & GROUPS */}
      <SettingsCard
        title="Muted Conversations & Groups"
        subtitle="Manage personal chats and groups that you have silenced."
      >
        <div className="py-2 space-y-3">
          {((preferences.mutedConversations || []).length > 0 ||
            (preferences.mutedGroups || []).length > 0) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-base-content/40" />
              <input
                type="text"
                placeholder="Search muted chats by ID…"
                value={mutedSearch}
                onChange={(e) => setMutedSearch(e.target.value)}
                className="input input-sm h-8 w-full rounded-xl bg-base-200/60 border-base-300 pl-8 pr-3 text-xs"
              />
            </div>
          )}

          {(!preferences.mutedConversations ||
            preferences.mutedConversations.length === 0) &&
          (!preferences.mutedGroups || preferences.mutedGroups.length === 0) ? (
            <div className="p-6 text-center rounded-2xl bg-base-200/30 border border-base-300/60 space-y-2">
              <Bell className="size-8 text-base-content/30 mx-auto" />
              <p className="text-xs font-semibold text-base-content">
                No muted chats
              </p>
              <p className="text-[11px] text-base-content/50 max-w-xs mx-auto">
                Conversations you mute from the chat menu will appear here so you
                can manage and unmute them at any time.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredMutedConversations.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-300 text-xs hover:bg-base-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="size-4 text-primary" />
                    <div>
                      <span className="font-semibold text-base-content block">
                        Direct Chat
                      </span>
                      <span className="text-[10px] text-base-content/50 font-mono">
                        {id}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => unmuteChat(id, "user")}
                    className="btn btn-xs btn-outline rounded-lg text-primary hover:bg-primary hover:text-primary-content text-[11px] h-7 px-2.5"
                  >
                    Unmute
                  </button>
                </div>
              ))}

              {filteredMutedGroups.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-300 text-xs hover:bg-base-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <UsersRound className="size-4 text-secondary" />
                    <div>
                      <span className="font-semibold text-base-content block">
                        Group Chat
                      </span>
                      <span className="text-[10px] text-base-content/50 font-mono">
                        {id}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => unmuteChat(id, "group")}
                    className="btn btn-xs btn-outline rounded-lg text-secondary hover:bg-secondary hover:text-secondary-content text-[11px] h-7 px-2.5"
                  >
                    Unmute
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
