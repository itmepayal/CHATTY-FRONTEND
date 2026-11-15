import {
  Phone,
  MapPin,
  Globe,
  Calendar,
  Sparkles,
  ShieldCheck,
  Plus,
} from "lucide-react";

function QuickInfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-xs sm:text-sm text-base-content/80">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase font-bold text-base-content/40 block leading-tight">
          {label}
        </span>
        <span className="truncate block font-medium">{value}</span>
      </div>
    </li>
  );
}

export default function ProfileSidebar({
  form = {},
  completion = 100,
  missing = [],
  securityScore = 0,
  securityLevel = { label: "Good", text: "text-info" },
  sessionsCount = 1,
  twoFA = false,
  memberSince = "—",
  onMissingClick = null,
  className = "",
}) {
  return (
    <aside className={`space-y-4 sm:space-y-5 ${className}`} aria-label="Profile sidebar snapshot">
      {/* 1. Account Snapshot & Security Tile */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-base-200">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <h3 className="font-semibold text-xs sm:text-sm text-base-content uppercase tracking-wider truncate">
              Account Snapshot
            </h3>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-base-200/80 border border-base-300/60 shrink-0 ${securityLevel.text}`}>
            {securityLevel.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3">
          <div className="rounded-xl bg-base-200/50 p-2 border border-base-300/60 text-center">
            <span className="text-[10px] uppercase font-semibold text-base-content/50 block">
              Profile
            </span>
            <span className="text-sm sm:text-base font-bold text-primary tabular-nums">
              {completion}%
            </span>
          </div>

          <div className="rounded-xl bg-base-200/50 p-2 border border-base-300/60 text-center">
            <span className="text-[10px] uppercase font-semibold text-base-content/50 block">
              Security
            </span>
            <span className="text-sm sm:text-base font-bold text-base-content tabular-nums">
              {securityScore}%
            </span>
          </div>

          <div className="rounded-xl bg-base-200/50 p-2 border border-base-300/60 text-center">
            <span className="text-[10px] uppercase font-semibold text-base-content/50 block">
              Devices
            </span>
            <span className="text-sm sm:text-base font-bold text-base-content tabular-nums">
              {sessionsCount}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-base-content/65 pt-2 border-t border-base-200/60">
          <span>2-Step Verification</span>
          <span className={`font-semibold ${twoFA ? "text-success" : "text-warning"}`}>
            {twoFA ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {/* 2. Contact & Identity Snapshot */}
      <div className="rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-3">
          Contact Details
        </h3>
        <ul className="space-y-3">
          <QuickInfoRow icon={Phone} label="Phone" value={form.phone} />
          <QuickInfoRow icon={MapPin} label="Location" value={form.location} />
          <QuickInfoRow icon={Globe} label="Website" value={form.website} />
          <QuickInfoRow icon={Calendar} label="Member Since" value={memberSince} />
        </ul>
      </div>

      {/* 3. Missing Profile Fields Nudge */}
      {missing.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-warning mb-2">
            <Sparkles className="size-4 shrink-0" />
            <h4 className="font-semibold text-xs uppercase tracking-wider">
              Complete Your Profile
            </h4>
          </div>
          <p className="text-xs text-base-content/70 mb-3 leading-relaxed">
            Adding more details makes your profile stand out in chats and group rosters.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onMissingClick?.(item.id)}
                className="btn btn-xs rounded-lg gap-1 border border-base-300 bg-base-100 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="size-3" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
