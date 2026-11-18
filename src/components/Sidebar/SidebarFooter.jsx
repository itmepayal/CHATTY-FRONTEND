import { LogOut, Settings } from "lucide-react";
import { FooterAction } from "./SidebarComponents.jsx";
import { avatarSrc } from "./sidebarUtils.js";

/**
 * SidebarFooter
 * Compact, mobile-first account section.
 * Replaces bulky nested cards with a sleek, space-efficient horizontal bar.
 */
export const SidebarFooter = ({
  authUser,
  meOnline,
  onProfile,
  onSettings,
  navigate,
  setConfirmLogout,
}) => {
  return (
    <footer className="border-t border-base-300/80 bg-base-100/95 backdrop-blur-md px-2.5 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2 shrink-0">
      <div className="flex items-center justify-between gap-1.5">
        {/* Profile identity button */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open my profile"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-base-200/70 active:scale-[0.99] cursor-pointer"
        >
          <div className="relative shrink-0">
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "Me"}
              className={`size-8 sm:size-8.5 rounded-full object-cover ring-2 transition-colors ${
                onProfile ? "ring-primary" : "ring-base-300/70"
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
            <p className="truncate text-xs sm:text-sm font-semibold text-base-content">
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
                  {authUser?.email || "Offline"}
                </span>
              )}
            </p>
          </div>
        </button>

        {/* Account actions: Settings & Logout */}
        <div className="flex shrink-0 items-center gap-0.5">
          <FooterAction
            icon={Settings}
            label="Settings"
            active={onSettings}
            onClick={() => navigate("/settings")}
          />
          <FooterAction
            icon={LogOut}
            label="Log out"
            danger
            onClick={() => setConfirmLogout(true)}
          />
        </div>
      </div>
    </footer>
  );
};

export default SidebarFooter;
