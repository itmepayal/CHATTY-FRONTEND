import { Settings } from "lucide-react";
import { FooterAction } from "./SidebarComponents.jsx";
import { avatarSrc } from "./sidebarUtils.js";

/**
 * SidebarFooter
 * Compact, mobile-first account section focused exclusively on user profile and settings.
 * The duplicate Logout action has been eliminated; Logout is centralized exclusively in the Main Sidebar.
 */
export const SidebarFooter = ({
  authUser,
  meOnline,
  onProfile,
  onSettings,
  navigate,
}) => {
  return (
    <footer className="border-t border-base-300/70 bg-base-100/95 backdrop-blur-md px-2.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        {/* Profile identity button */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open my profile"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-base-200/70 active:scale-[0.99] cursor-pointer group"
        >
          <div className="relative shrink-0">
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "Me"}
              className={`size-8 sm:size-8.5 rounded-full object-cover ring-2 transition-colors ${
                onProfile ? "ring-primary" : "ring-base-300/80 group-hover:ring-primary/60"
              }`}
            />
            {meOnline && (
              <span
                className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100"
                aria-label="Online status"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs sm:text-[13px] font-semibold text-base-content group-hover:text-primary transition-colors">
              {authUser?.fullName || "My Account"}
            </p>
            <p className="truncate text-[11px] mt-0.5">
              {meOnline ? (
                <span className="text-success font-medium inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-success inline-block" />
                  Online
                </span>
              ) : (
                <span className="text-base-content/55">
                  {authUser?.username
                    ? `@${authUser.username}`
                    : authUser?.email || "Offline"}
                </span>
              )}
            </p>
          </div>
        </button>

        {/* Account action: Settings only (Logout is exclusively in the Main Navigation Sidebar) */}
        <div className="flex shrink-0 items-center">
          <FooterAction
            icon={Settings}
            label="Settings"
            active={onSettings}
            onClick={() => navigate("/settings")}
          />
        </div>
      </div>
    </footer>
  );
};

export default SidebarFooter;
