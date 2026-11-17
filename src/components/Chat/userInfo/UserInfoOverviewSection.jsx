import {
  AtSign,
  Cake,
  CalendarDays,
  Clock,
  Globe,
  History,
  Info,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { Section, InfoRow } from "./UserInfoUI.jsx";

export const UserInfoOverviewSection = ({
  targetUser,
  isAboutRestricted,
  birthday,
  birthdayHintText,
  age,
  location,
  localTime,
  website,
  websiteLabel,
  isOnlineActive,
  isBlocked,
  userLastSeenTimestamp,
  formattedLastSeen,
  lastMessagePreview,
  chattingSince,
  memberSince,
}) => {
  return (
    <>
      {/* SECTION C: PERSONAL INFORMATION */}
      <Section title="Personal Information">
        <div className="space-y-3">
          <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/40">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-base-content/60">
              <Info className="size-3.5" />
              <span>About Bio</span>
            </div>
            {isAboutRestricted ? (
              <div className="flex items-center gap-2 text-xs text-base-content/50 italic py-0.5">
                <ShieldAlert className="size-3.5 shrink-0 text-base-content/40" />
                <span>About information is unavailable.</span>
              </div>
            ) : targetUser.bio ? (
              <p className="text-sm text-base-content/85 leading-relaxed [overflow-wrap:anywhere]">
                {targetUser.bio}
              </p>
            ) : (
              <p className="text-xs text-base-content/45 italic py-0.5">
                No bio provided yet.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-base-200/50 p-3.5 border border-base-300/40">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-base-content/60">
              <Sparkles className="size-3.5" />
              <span>Custom Status</span>
            </div>
            {isAboutRestricted ? (
              <div className="flex items-center gap-2 text-xs text-base-content/50 italic py-0.5">
                <Lock className="size-3.5 shrink-0 text-base-content/40" />
                <span>Status information is unavailable.</span>
              </div>
            ) : targetUser.customStatus ? (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">
                  {targetUser.customStatus}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-base-content/60 py-0.5">
                <span className="size-2 rounded-full bg-success" />
                <span>Available</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="border-t border-base-300" />

      {/* SECTION D: DETAILS & CONTACT OVERVIEW */}
      <Section title="Overview & Details">
        <div className="divide-y divide-base-200">
          <InfoRow
            icon={Mail}
            label="Email"
            value={targetUser.email}
            href={targetUser.email ? `mailto:${targetUser.email}` : ""}
          />
          <InfoRow
            icon={AtSign}
            label="Username"
            value={targetUser.username ? `@${targetUser.username}` : ""}
          />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={targetUser.phone}
            href={
              targetUser.phone
                ? `tel:${String(targetUser.phone).replace(/\s/g, "")}`
                : ""
            }
          />
          <InfoRow icon={Users} label="Gender" value={targetUser.gender} />
          <InfoRow
            icon={Cake}
            label="Birthday"
            value={birthday}
            hint={birthdayHintText}
          />
          {age !== null && (
            <InfoRow icon={CalendarDays} label="Age" value={`${age} years`} />
          )}
          {location && (
            <InfoRow icon={MapPin} label="Location" value={location} />
          )}
          <InfoRow icon={Clock} label="Local time" value={localTime} />
          {website && (
            <InfoRow
              icon={Globe}
              label="Website"
              value={websiteLabel}
              href={website}
            />
          )}
          <InfoRow
            icon={History}
            label={isOnlineActive ? "Active" : "Last active"}
            value={
              isOnlineActive
                ? "Now"
                : isBlocked ||
                    !userLastSeenTimestamp ||
                    targetUser.isLastSeenRestricted
                  ? "Unavailable"
                  : formattedLastSeen?.replace(/^Last seen /, "") ||
                    "Unavailable"
            }
          />
          <InfoRow
            icon={MessageSquare}
            label="Last message"
            value={lastMessagePreview}
          />
          <InfoRow
            icon={CalendarDays}
            label="Chatting since"
            value={chattingSince}
          />
          <InfoRow
            icon={CalendarDays}
            label="Member since"
            value={memberSince}
          />
        </div>
      </Section>
    </>
  );
};
