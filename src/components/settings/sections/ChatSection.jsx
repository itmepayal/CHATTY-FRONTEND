import { Loader2 } from "lucide-react";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsToggle from "../common/SettingsToggle";

export default function ChatSection({
  chatPrefs,
  setChatPref,
  chatPrefsLoading = false,
  chatPrefsSaving = false,
}) {
  return (
    <div className="space-y-5">
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
          toggle={
            <SettingsToggle
              checked={chatPrefs.enterToSend}
              onChange={(v) => setChatPref("enterToSend", v)}
              label="Enter to send"
              disabled={chatPrefsLoading}
            />
          }
        />

        <SettingsRow
          title="Large emoji"
          desc="Show messages containing only emojis in an enlarged display style"
          toggle={
            <SettingsToggle
              checked={chatPrefs.largeEmoji}
              onChange={(v) => setChatPref("largeEmoji", v)}
              label="Large emoji"
              disabled={chatPrefsLoading}
            />
          }
        />

        <SettingsRow
          title="Auto-scroll to new messages"
          desc="Automatically scroll to the bottom when receiving new incoming messages"
          toggle={
            <SettingsToggle
              checked={chatPrefs.autoScroll}
              onChange={(v) => setChatPref("autoScroll", v)}
              label="Auto-scroll"
              disabled={chatPrefsLoading}
            />
          }
        />
      </SettingsCard>
    </div>
  );
}
