import { Volume2, Loader2, Bell, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";

export default function ChatSection({
  chatPrefs,
  setChatPref,
  chatPrefsLoading = false,
  chatPrefsSaving = false,
  settings,
  setSetting,
}) {
  const playTestSound = () => {
    if (!settings.messageSound) {
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
      gain.gain.value = (settings.soundVolume / 100) * 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } catch {}
    toast("🔔 Ding!");
  };

  const handleDesktopNotifications = async (enabled) => {
    if (!enabled) return setSetting("desktopNotifications", false);
    if (!("Notification" in window)) {
      toast.error("This browser doesn't support notifications");
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setSetting("desktopNotifications", true);
    } else {
      toast.error("Allow notifications in your browser to turn this on");
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Composer & Messaging Experience */}
      <SettingsCard
        title="Message Composer & Reading"
        subtitle="Configure send shortcuts, emoji scaling, and scroll behavior."
        headerAction={
          chatPrefsSaving && (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving…</span>
            </span>
          )
        }
      >
        <SettingsRow
          title="Enter to send"
          desc="Press Enter to send messages immediately. When off, Enter creates a new line and Ctrl+Enter sends."
        >
          <SettingsToggle
            checked={chatPrefs.enterToSend}
            onChange={(v) => setChatPref("enterToSend", v)}
            label="Enter to send"
            disabled={chatPrefsLoading}
          />
        </SettingsRow>

        <SettingsRow
          title="Large emoji"
          desc="Show messages containing only emojis in an enlarged display style"
        >
          <SettingsToggle
            checked={chatPrefs.largeEmoji}
            onChange={(v) => setChatPref("largeEmoji", v)}
            label="Large emoji"
            disabled={chatPrefsLoading}
          />
        </SettingsRow>

        <SettingsRow
          title="Auto-scroll to new messages"
          desc="Automatically scroll to the bottom when receiving new incoming messages"
        >
          <SettingsToggle
            checked={chatPrefs.autoScroll}
            onChange={(v) => setChatPref("autoScroll", v)}
            label="Auto-scroll"
            disabled={chatPrefsLoading}
          />
        </SettingsRow>
      </SettingsCard>

      {/* 2. Sounds & Notifications */}
      <SettingsCard
        title="Sounds & Notifications"
        subtitle="Manage sound alerts, desktop notifications, and message preview snippets."
      >
        <SettingsRow
          title="Message incoming sound"
          desc="Play an audio chime whenever a message is received in an active chat"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-lg gap-1 border border-base-300"
              onClick={playTestSound}
              title="Test notification chime"
            >
              <Volume2 className="size-3.5 text-primary" />
              <span>Test</span>
            </button>
            <SettingsToggle
              checked={settings.messageSound}
              onChange={(v) => setSetting("messageSound", v)}
              label="Message incoming sound"
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title="Sound volume"
          desc="Adjust the playback loudness of audio chimes"
          stack
          disabled={!settings.messageSound}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={settings.soundVolume}
              disabled={!settings.messageSound}
              onChange={(e) => setSetting("soundVolume", Number(e.target.value))}
              className="range range-primary range-xs flex-1"
              aria-label="Sound volume"
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-base-content/70">
              {settings.soundVolume}%
            </span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Desktop push notifications"
          desc="Receive native system notifications when Chatty is in the background or minimized"
        >
          <SettingsToggle
            checked={settings.desktopNotifications}
            onChange={handleDesktopNotifications}
            label="Desktop push notifications"
          />
        </SettingsRow>

        <SettingsRow
          title="Show message preview snippet"
          desc="Include message text and sender name in desktop notifications"
          disabled={!settings.desktopNotifications}
        >
          <SettingsToggle
            checked={settings.messagePreview}
            onChange={(v) => setSetting("messagePreview", v)}
            label="Show message preview snippet"
            disabled={!settings.desktopNotifications}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
