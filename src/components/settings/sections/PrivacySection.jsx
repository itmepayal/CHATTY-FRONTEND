import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsSegmented from "../common/SettingsSegmented";
import SettingsToggle from "../common/SettingsToggle";

const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My Contacts" },
  { value: "nobody", label: "Nobody" },
];

export default function PrivacySection({
  privacy,
  setPrivacy,
  privacyLoading = false,
  privacySaving = false,
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        title="Personal Information Visibility"
        subtitle="Control who can see your online presence, status, and profile details."
        headerAction={
          privacySaving ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving…</span>
            </span>
          ) : null
        }
      >
        {privacyLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-base-content/60">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-xs font-medium">Loading privacy settings…</span>
          </div>
        ) : (
          <>
            <SettingsRow
              title="Last seen"
              desc="Choose who can see when you were last active on Chatty"
              stack
            >
              <SettingsSegmented
                label="Last seen visibility"
                value={privacy.lastSeenVisibility}
                options={VISIBILITY_OPTIONS}
                onChange={(v) => setPrivacy("lastSeenVisibility", v)}
                disabled={privacySaving}
                fullWidth
              />
            </SettingsRow>

            <SettingsRow
              title="Online status"
              desc="Choose who can see the green active indicator when you are online"
              stack
            >
              <SettingsSegmented
                label="Online status visibility"
                value={privacy.onlineStatusVisibility ?? "everyone"}
                options={VISIBILITY_OPTIONS}
                onChange={(v) => setPrivacy("onlineStatusVisibility", v)}
                disabled={privacySaving}
                fullWidth
              />
            </SettingsRow>

            <SettingsRow
              title="Profile photo"
              desc="Control who can view your profile picture in chats, groups, and contact lists"
              stack
            >
              <SettingsSegmented
                label="Profile photo visibility"
                value={privacy.profilePhotoVisibility}
                options={VISIBILITY_OPTIONS}
                onChange={(v) => setPrivacy("profilePhotoVisibility", v)}
                disabled={privacySaving}
                fullWidth
              />
            </SettingsRow>

            <SettingsRow
              title="About bio & status"
              desc="Control who can read your profile bio and custom status message"
              stack
            >
              <SettingsSegmented
                label="About visibility"
                value={privacy.aboutVisibility}
                options={VISIBILITY_OPTIONS}
                onChange={(v) => setPrivacy("aboutVisibility", v)}
                disabled={privacySaving}
                fullWidth
              />
            </SettingsRow>

            <SettingsRow
              title="Who can add me to groups"
              desc="Define who can add you to group conversations directly without an invitation"
              stack
            >
              <SettingsSegmented
                label="Group add permission"
                value={privacy.groupAddPermission}
                options={VISIBILITY_OPTIONS}
                onChange={(v) => setPrivacy("groupAddPermission", v)}
                disabled={privacySaving}
                fullWidth
              />
            </SettingsRow>
          </>
        )}
      </SettingsCard>

      <SettingsCard
        title="Activity & Read Receipts"
        subtitle="Manage communication signals and indicators sent to other users."
        headerAction={
          privacySaving ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving…</span>
            </span>
          ) : null
        }
      >
        {privacyLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-base-content/60">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-xs font-medium">Loading activity settings…</span>
          </div>
        ) : (
          <>
            <SettingsRow
              title="Read receipts"
              desc="Show blue checkmarks when messages have been viewed. Note: if turned off, you will also not see read receipts from others."
            >
              <SettingsToggle
                checked={privacy.readReceipts}
                onChange={(v) => setPrivacy("readReceipts", v)}
                label="Read receipts"
                disabled={privacySaving}
              />
            </SettingsRow>

            <SettingsRow
              title="Typing indicator"
              desc="Transmit a real-time typing bubble to the other user when you are composing text."
            >
              <SettingsToggle
                checked={privacy.typingIndicator}
                onChange={(v) => setPrivacy("typingIndicator", v)}
                label="Typing indicator"
                disabled={privacySaving}
              />
            </SettingsRow>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
