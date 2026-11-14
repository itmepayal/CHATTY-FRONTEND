import { LayoutGroup, motion } from "framer-motion";
import { User, ShieldCheck, Trash2 } from "lucide-react";
import { PROFILE_SPRING } from "../common/ProfileTokens";

export const PROFILE_TABS = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    title: "Personal information",
    hint: "Keep your public profile details up to date.",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    title: "Password & security",
    hint: "Protect your account and review active login sessions.",
  },
  {
    id: "account",
    label: "Account",
    icon: Trash2,
    title: "Account settings",
    hint: "Account details, identifiers, and permanent account actions.",
  },
];

/**
 * Standardized Profile Tab Navigation Pills
 * Matches SettingsNavigation visual styling with smooth sliding indicator.
 */
export default function ProfileTabNav({
  activeTab,
  onSelectTab,
  twoFAEnabled = false,
  className = "",
}) {
  const onTabKeyDown = (e, index) => {
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % PROFILE_TABS.length;
    if (e.key === "ArrowLeft") next = (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = PROFILE_TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    onSelectTab(PROFILE_TABS[next].id);
    document.getElementById(`tab-btn-${PROFILE_TABS[next].id}`)?.focus();
  };

  return (
    <LayoutGroup id="profile-tab-nav-group">
      <div
        role="tablist"
        aria-label="Profile navigation sections"
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl border border-base-300/80 bg-base-100/80 backdrop-blur-md shadow-sm ${className}`}
      >
        {PROFILE_TABS.map(({ id, label, icon: Icon }, index) => {
          const active = activeTab === id;
          const showWarning = id === "security" && !twoFAEnabled;

          return (
            <motion.button
              key={id}
              id={`tab-btn-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`profile-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelectTab(id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-primary select-none flex-1 sm:flex-initial ${
                active
                  ? "text-primary font-bold"
                  : "text-base-content/65 hover:text-base-content hover:bg-base-200/50"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="profile-tab-active-pill"
                  transition={PROFILE_SPRING}
                  className="absolute inset-0 rounded-xl bg-base-200 shadow-sm border border-base-300/80"
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
                {showWarning && (
                  <span
                    aria-label="Action recommended"
                    className="size-1.5 rounded-full bg-warning animate-pulse"
                  />
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
