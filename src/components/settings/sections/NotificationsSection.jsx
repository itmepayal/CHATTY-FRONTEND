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
} from "lucide-react";
import toast from "react-hot-toast";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";
import { useNotificationSettings } from "../../../store/useNotificationSettingsStore";
import {
  getPermissionState,
  requestPermission,
  playMessageSound,
  showDesktopNotification,
} from "../../../services/notificationService";

export default function NotificationsSection() {
  const { settings, loading, saving, updateSetting, loadSettings } =
    useNotificationSettings();

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
      toast.error(
        "This browser does not support native desktop notifications.",
      );
      return;
    }

    if (currentPerm === "denied") {
      toast.error(
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
        toast.success("Desktop notifications enabled!");
      } else if (result === "denied") {
        toast.error(
          "Notification permission was denied. Please allow notifications in your browser address bar.",
        );
      } else {
        toast("Notification permission was dismissed.");
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
      toast.success("Test notification dispatched!");
    } else if (perm === "denied") {
      toast.error(
        "Sound played. Desktop notifications could not be shown because browser permission is blocked.",
      );
    } else if (!settings.desktopNotifications) {
      toast(
        "Audio chime played. Enable desktop notifications to see system alerts.",
        {
          icon: "🔔",
        },
      );
    } else {
      toast(
        "Audio chime played. Grant browser notification permission to view system banners.",
      );
    }

    setTimeout(() => setIsTesting(false), 600);
  };

  const isPermissionRevoked =
    settings.desktopNotifications && permissionState === "denied";

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Sounds & Notifications"
        subtitle="Manage sound alerts, desktop notifications, and message preview snippets."
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
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVolumePreview(settings.soundVolume)}
              disabled={!settings.soundEnabled || loading}
              className="btn btn-ghost btn-xs rounded-lg gap-1 border border-base-300 text-xs font-medium"
              title="Preview chime"
            >
              <Volume2 className="size-3 text-primary" />
              <span>Preview</span>
            </button>
            <SettingsToggle
              checked={settings.soundEnabled}
              onChange={(val) => updateSetting("soundEnabled", val)}
              disabled={loading || saving}
              label="Message incoming sound"
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title="Sound volume"
          desc="Adjust the playback loudness of audio chimes"
          stack
          disabled={!settings.soundEnabled || loading}
        >
          <div className="flex items-center gap-3">
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
              className="range range-primary range-xs flex-1 disabled:opacity-40"
              aria-label="Sound volume"
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-base-content/75 font-semibold">
              {settings.soundVolume}%
            </span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Desktop push notifications"
          desc="Receive native system notifications when Chatty is in the background or minimized"
          icon={settings.desktopNotifications ? Bell : BellOff}
        >
          <SettingsToggle
            checked={
              settings.desktopNotifications && permissionState !== "denied"
            }
            onChange={handleToggleDesktopNotifications}
            disabled={loading || saving || permissionState === "unsupported"}
            label="Desktop push notifications"
          />
        </SettingsRow>

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
        >
          <SettingsToggle
            checked={settings.showPreview}
            onChange={(val) => updateSetting("showPreview", val)}
            disabled={loading || saving}
            label="Show message preview snippet"
          />
        </SettingsRow>

        <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-base-content">
              Test notification
            </span>
            <p className="text-xs text-base-content/60">
              Verify your current audio chime and desktop notification settings
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={isTesting || loading}
            className="btn btn-primary btn-sm rounded-xl gap-2 shadow-sm font-semibold self-start sm:self-auto"
          >
            {isTesting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>Send test notification</span>
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
