import { Loader2 } from "lucide-react";
import SettingsCard from "../common/SettingsCard";
import SettingsRow from "../common/SettingsRow";
import SettingsSegmented from "../common/SettingsSegmented";

const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My Contacts" },
  { value: "contacts_except", label: "Except…" },
  { value: "nobody", label: "Nobody" },
];

const ONLINE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "same_as_last_seen", label: "Same as Last Seen" },
];

const STATUS_OPTIONS = [
  { value: "contacts", label: "My Contacts" },
  { value: "contacts_except", label: "Except…" },
  { value: "only_share_with", label: "Only Share…" },
];

export default function PersonalInfoCard({
  privacy,
  setPrivacy,
  privacyLoading = false,
  privacySaving = false,
  openExclusion,
}) {
  const handleVisibilityChange = (field, val, excField, title, desc) => {
    setPrivacy(field, val);
    if (val === "contacts_except" || val === "only_share_with") {
      openExclusion(
        excField,
        title,
        desc,
        val === "only_share_with" ? "include" : "exclude"
      );
    }
  };

  return (
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
          {/* Last Seen */}
          <SettingsRow
            title="Last seen"
            desc="Choose who can see when you were last active on Chatty"
            stack
          >
            <SettingsSegmented
              label="Last seen visibility"
              value={privacy.lastSeenVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) =>
                handleVisibilityChange(
                  "lastSeenVisibility",
                  v,
                  "lastSeenExceptions",
                  "Hide Last Seen From...",
                  "Selected contacts will not be able to see your last seen timestamp."
                )
              }
              disabled={privacySaving}
              fullWidth
            />
            {privacy.lastSeenVisibility === "contacts_except" && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-base-content/60">
                  {privacy.lastSeenExceptions?.length || 0} contact(s) excluded
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openExclusion(
                      "lastSeenExceptions",
                      "Hide Last Seen From...",
                      "Selected contacts will not be able to see your last seen timestamp."
                    )
                  }
                  className="text-primary font-medium hover:underline"
                >
                  Edit exclusions
                </button>
              </div>
            )}
          </SettingsRow>

          {/* Online Status */}
          <SettingsRow
            title="Who can see when I'm online"
            desc="If you don't share when you were last seen, you won't be able to see when other people are online."
            stack
          >
            <SettingsSegmented
              label="Online status visibility"
              value={privacy.onlineStatusVisibility ?? "everyone"}
              options={ONLINE_OPTIONS}
              onChange={(v) => setPrivacy("onlineStatusVisibility", v)}
              disabled={privacySaving}
              fullWidth
            />
          </SettingsRow>

          {/* Profile Photo */}
          <SettingsRow
            title="Profile photo"
            desc="Control who can view your profile picture in chats and group conversations"
            stack
          >
            <SettingsSegmented
              label="Profile photo visibility"
              value={privacy.profilePhotoVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) =>
                handleVisibilityChange(
                  "profilePhotoVisibility",
                  v,
                  "profilePhotoExceptions",
                  "Hide Profile Photo From...",
                  "Selected contacts will see the default placeholder avatar instead."
                )
              }
              disabled={privacySaving}
              fullWidth
            />
            {privacy.profilePhotoVisibility === "contacts_except" && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-base-content/60">
                  {privacy.profilePhotoExceptions?.length || 0} contact(s) excluded
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openExclusion(
                      "profilePhotoExceptions",
                      "Hide Profile Photo From...",
                      "Selected contacts will see the default placeholder avatar instead."
                    )
                  }
                  className="text-primary font-medium hover:underline"
                >
                  Edit exclusions
                </button>
              </div>
            )}
          </SettingsRow>

          {/* About Bio */}
          <SettingsRow
            title="About bio"
            desc="Control who can read your profile bio and custom status message"
            stack
          >
            <SettingsSegmented
              label="About visibility"
              value={privacy.aboutVisibility}
              options={VISIBILITY_OPTIONS}
              onChange={(v) =>
                handleVisibilityChange(
                  "aboutVisibility",
                  v,
                  "aboutExceptions",
                  "Hide About From...",
                  "Selected contacts will not see your about bio."
                )
              }
              disabled={privacySaving}
              fullWidth
            />
            {privacy.aboutVisibility === "contacts_except" && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-base-content/60">
                  {privacy.aboutExceptions?.length || 0} contact(s) excluded
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openExclusion(
                      "aboutExceptions",
                      "Hide About From...",
                      "Selected contacts will not see your about bio."
                    )
                  }
                  className="text-primary font-medium hover:underline"
                >
                  Edit exclusions
                </button>
              </div>
            )}
          </SettingsRow>

          {/* Status Updates */}
          <SettingsRow
            title="Status privacy"
            desc="Choose who can see your status updates and stories"
            stack
          >
            <SettingsSegmented
              label="Status visibility"
              value={privacy.statusVisibility || "contacts"}
              options={STATUS_OPTIONS}
              onChange={(v) =>
                handleVisibilityChange(
                  "statusVisibility",
                  v,
                  v === "only_share_with" ? "statusIncluded" : "statusExceptions",
                  v === "only_share_with"
                    ? "Only Share Status With..."
                    : "Hide Status From...",
                  v === "only_share_with"
                    ? "Only selected contacts will be able to see your status."
                    : "Selected contacts will not see your status updates."
                )
              }
              disabled={privacySaving}
              fullWidth
            />
          </SettingsRow>
        </>
      )}
    </SettingsCard>
  );
}
