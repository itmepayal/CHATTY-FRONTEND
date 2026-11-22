import { useRef, useEffect, useCallback, useId } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { User, ShieldCheck, Trash2, Award } from "lucide-react";
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
    id: "badges",
    label: "Badges",
    icon: Award,
    title: "Badges & Achievements",
    hint: "Showcase earned badges, track achievements, and set visibility.",
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

const TAB_IDS = PROFILE_TABS.map((t) => t.id);

/**
 * Standardized Profile Tab Navigation Pills
 * - Sliding active indicator (shared layout animation)
 * - Full keyboard support (Arrow keys, Home, End) with roving tabindex
 * - Active tab auto-centers horizontally on small screens (no vertical page jump)
 * - Respects prefers-reduced-motion
 * - 2FA warning dot on the Security tab
 */
export default function ProfileTabNav({
  activeTab,
  onSelectTab,
  twoFAEnabled = false,
  className = "",
}) {
  const reduceMotion = useReducedMotion();
  const groupId = useId();
  const tabRefs = useRef({});
  const navContainerRef = useRef(null);

  // Fall back to the first tab if an unknown id is passed in
  const currentTab = TAB_IDS.includes(activeTab) ? activeTab : TAB_IDS[0];

  // Center the active tab horizontally inside the scroll container only.
  // Uses bounding rects so it works regardless of offsetParent.
  const centerTab = useCallback(
    (id, smooth = true) => {
      const el = tabRefs.current[id];
      const container = navContainerRef.current;
      if (!el || !container) return;

      // Nothing to scroll -> do nothing
      if (container.scrollWidth <= container.clientWidth) return;

      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta = eRect.left - cRect.left - (cRect.width - eRect.width) / 2;

      container.scrollTo({
        left: Math.max(0, container.scrollLeft + delta),
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
      });
    },
    [reduceMotion],
  );

  useEffect(() => {
    centerTab(currentTab);
  }, [currentTab, centerTab]);

  // Re-center on resize / orientation change so the active tab stays visible
  useEffect(() => {
    const onResize = () => centerTab(currentTab, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [currentTab, centerTab]);

  const onTabKeyDown = (e, index) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    let next = null;
    switch (e.key) {
      case "ArrowRight":
        next = (index + 1) % PROFILE_TABS.length;
        break;
      case "ArrowLeft":
        next = (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = PROFILE_TABS.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextId = PROFILE_TABS[next].id;
    onSelectTab?.(nextId);
    tabRefs.current[nextId]?.focus({ preventScroll: true });
  };

  return (
    <LayoutGroup id={`profile-tab-nav-${groupId}`}>
      <div
        ref={navContainerRef}
        role="tablist"
        aria-label="Profile navigation sections"
        aria-orientation="horizontal"
        className={`relative flex items-center gap-1 sm:gap-1.5 overflow-x-auto overscroll-x-contain no-scrollbar p-1.5 rounded-2xl border border-base-300/80 bg-base-100/90 backdrop-blur-md shadow-sm ${className}`}
      >
        {PROFILE_TABS.map(({ id, label, icon: Icon }, index) => {
          const active = currentTab === id;
          const showWarning = id === "security" && !twoFAEnabled;

          return (
            <motion.button
              key={id}
              ref={(el) => {
                if (el) tabRefs.current[id] = el;
                else delete tabRefs.current[id];
              }}
              id={`tab-btn-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`profile-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelectTab?.(id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 flex-1 sm:flex-initial min-h-[44px] select-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? "text-primary font-bold"
                  : "text-base-content/65 hover:text-base-content hover:bg-base-200/50"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="profile-tab-active-pill"
                  transition={reduceMotion ? { duration: 0 } : PROFILE_SPRING}
                  // Inline radius keeps corners crisp during layout animation
                  style={{ borderRadius: 12 }}
                  className="absolute inset-0 bg-base-200 shadow-sm border border-base-300/80"
                  aria-hidden="true"
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>

                {showWarning && (
                  <span
                    className="tooltip tooltip-bottom tooltip-warning inline-flex items-center"
                    data-tip="2-step verification is off"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-warning inline-block motion-safe:animate-pulse"
                    />
                    <span className="sr-only">2-step verification is off</span>
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
