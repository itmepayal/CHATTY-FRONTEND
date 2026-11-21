import { useState, useEffect, useCallback } from "react";
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
  Volume1,
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
} from "../../../services/notificationService";

export default function NotificationsSection() {
  const {
    settings,
    preferences,
    loading,
    saving,
    updateSetting,
    updatePreference,
    loadSettings,
    unmuteChat,
  } = useNotificationSettingsStore();

  const [permissionState, setPermissionState] = useState(getPermissionState());
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

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
      force: true,
    });
  };

  const handleSendTestNotification = () => {
    setIsTesting(true);

    if (settings.soundEnabled) {
      playMessageSound({
        volume: settings.soundVolume,
        soundEnabled: true,
        force: true,
      });
    }

    const perm = getPermissionState();
    if (settings.desktopNotifications && perm === "granted") {
      showDesktopNotification({
        senderName: "Chatty Team",
        text: "Test notification: audio chime and preview settings are functioning normally!",
        chatId: "test_preview_chat",
        messageType: "text",
        showPreview: settings.showPreview,
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

  const isPermissionRevoked =
    settings.desktopNotifications && permissionState === "denied";

  return (
    <div className="space-y-6">
      {/* 1. Sounds & Alerts */}
      <SettingsCard
        title="Sounds & Alerts"
        subtitle="Manage sound chimes, desktop banners, and message preview snippets."
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
          title="Message incoming sound"
          desc="Play an audio chime whenever a message is received in an active chat"
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
          desc="Adjust the playback loudness of audio chimes"
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
          title="Desktop push notifications"
          desc="Receive native system notifications when Chatty is in the background or minimized"
          icon={settings.desktopNotifications ? Bell : BellOff}
          toggle={
            <SettingsToggle
              checked={
                settings.desktopNotifications && permissionState !== "denied"
              }
              onChange={handleToggleDesktopNotifications}
              disabled={loading || saving || permissionState === "unsupported"}
              label="Desktop push notifications"
            />
          }
        />

        {isPermissionRevoked && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-3 text-xs text-error flex items-start gap-2.5 my-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Notification permission is blocked
              </p>
              <p className="text-error/80 leading-relaxed">
                Desktop notifications are enabled in your account, but your
                browser has blocked notifications for this site. To receive
                alerts, click the site settings icon in your browser address bar
                and change Notifications to <strong>Allow</strong>.
              </p>
            </div>
          </div>
        )}

        {permissionState === "unsupported" && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-xs text-warning flex items-start gap-2.5 my-2">
            <HelpCircle className="size-4 shrink-0 mt-0.5" />
            <p>
              Your browser does not support the HTML5 Notification API. Audio
              chimes will still function normally.
            </p>
          </div>
        )}

        <SettingsRow
          title="Show message preview snippet"
          desc={
            settings.desktopNotifications
              ? "Include message text and sender name in desktop notifications"
              : "Include message text and sender name when desktop notifications are active"
          }
          icon={settings.showPreview ? Eye : EyeOff}
          disabled={!settings.desktopNotifications}
          toggle={
            <SettingsToggle
              checked={settings.showPreview}
              onChange={(val) => updateSetting("showPreview", val)}
              disabled={loading || saving || !settings.desktopNotifications}
              label="Show message preview snippet"
            />
          }
        />

        <SettingsRow
          title="Test notification"
          desc="Verify your current audio chime and desktop notification settings"
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

      {/* 2. Do Not Disturb (DND) */}
      <SettingsCard
        title="Do Not Disturb (DND)"
        subtitle="Mute non-urgent notifications for a specified duration. Security alerts will always be delivered."
      >
        <SettingsRow
          title="Do Not Disturb"
          desc="Silence all personal message and group alerts while active"
          icon={preferences.dndEnabled ? MoonStar : Moon}
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
          <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-base-content/80">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>Mute duration</span>
              </span>
              {preferences.dndUntil && (
                <span className="text-[11px] text-primary font-mono">
                  Until {new Date(preferences.dndUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

            <p className="text-[11px] text-base-content/50 leading-relaxed pt-1">
              Important: Critical security alerts (new logins, password changes, 2FA alerts) will bypass DND for your protection.
            </p>
          </div>
        )}
      </SettingsCard>

      {/* 3. Granular Category Controls */}
      <SettingsCard
        title="Category Notification Toggles"
        subtitle="Fine-tune notifications for specific features across Chatty."
      >
        <SettingsRow
          title="Direct messages"
          desc="Alerts for one-on-one personal chat messages"
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
          title="Message replies"
          desc="Alerts when someone quotes or replies to your messages"
          icon={MessageSquare}
          toggle={
            <SettingsToggle
              checked={preferences.messageReplies !== false}
              onChange={(val) => updatePreference("messageReplies", val)}
              disabled={loading || saving}
              label="Message replies"
            />
          }
        />

        <SettingsRow
          title="Mentions"
          desc="Alerts when you are mentioned in group chats or with @all"
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
          title="Reactions"
          desc="Alerts when a user reacts with an emoji to your message"
          icon={Smile}
          toggle={
            <SettingsToggle
              checked={preferences.messageReactions !== false}
              onChange={(val) => updatePreference("messageReactions", val)}
              disabled={loading || saving}
              label="Reactions"
            />
          }
        />

        <SettingsRow
          title="Group conversations"
          desc="General message alerts for joined groups"
          icon={UsersRound}
          toggle={
            <SettingsToggle
              checked={preferences.messagesGroup !== false}
              onChange={(val) => updatePreference("messagesGroup", val)}
              disabled={loading || saving}
              label="Group conversations"
            />
          }
        />

        <SettingsRow
          title="Group invites & membership events"
          desc="Alerts when you are invited, added, removed, or promoted in groups"
          icon={UsersRound}
          toggle={
            <SettingsToggle
              checked={preferences.groupMembershipEvents !== false}
              onChange={(val) => updatePreference("groupMembershipEvents", val)}
              disabled={loading || saving}
              label="Group invites & membership events"
            />
          }
        />

        <SettingsRow
          title="Voice & video calls"
          desc="Alerts for incoming and missed calls"
          icon={Phone}
          toggle={
            <SettingsToggle
              checked={preferences.callsVoice !== false}
              onChange={(val) => updatePreference("callsVoice", val)}
              disabled={loading || saving}
              label="Voice & video calls"
            />
          }
        />

        <SettingsRow
          title="Contact requests"
          desc="Alerts when someone sends or accepts your contact connection"
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
          title="Security & device alerts"
          desc="Alerts when a new device logs in or linked devices are modified"
          icon={Shield}
          toggle={
            <SettingsToggle
              checked={preferences.securityNewDevice !== false}
              onChange={(val) => updatePreference("securityNewDevice", val)}
              disabled={loading || saving}
              label="Security & device alerts"
            />
          }
        />

        <SettingsRow
          title="System announcements"
          desc="Platform updates, maintenance windows, and system alerts"
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
      </SettingsCard>

      {/* 4. Muted Conversations */}
      {(preferences.mutedConversations?.length > 0 ||
        preferences.mutedGroups?.length > 0) && (
        <SettingsCard
          title="Muted Chats & Groups"
          subtitle="Conversations you have temporarily or permanently silenced."
        >
          <div className="space-y-2">
            {preferences.mutedConversations?.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-300 text-xs"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-base-content/50" />
                  <span className="font-semibold text-base-content">
                    Direct Chat ({id.slice(-6)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => unmuteChat(id, "user")}
                  className="btn btn-xs btn-ghost text-primary text-[11px]"
                >
                  Unmute
                </button>
              </div>
            ))}

            {preferences.mutedGroups?.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-300 text-xs"
              >
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4 text-base-content/50" />
                  <span className="font-semibold text-base-content">
                    Group Chat ({id.slice(-6)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => unmuteChat(id, "group")}
                  className="btn btn-xs btn-ghost text-primary text-[11px]"
                >
                  Unmute
                </button>
              </div>
            ))}
          </div>
        </SettingsCard>
      )}
    </div>
  );
}
