import { LogOut, Settings } from "lucide-react";
import { FooterAction } from "./SidebarComponents.jsx";
import { avatarSrc } from "./sidebarUtils.js";

export const SidebarFooter = ({
  authUser,
  meOnline,
  onProfile,
  onSettings,
  navigate,
  setConfirmLogout,
}) => {
  return (
    <div className="border-t border-base-300 bg-base-100 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
      <div className="flex items-center gap-1.5 rounded-xl border border-base-300 bg-base-200/50 p-1.5">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open my profile"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-base-100"
        >
          <div className="relative shrink-0">
            <img
              src={avatarSrc(authUser?.avatar)}
              alt={authUser?.fullName || "Me"}
              className={`size-10 rounded-full object-cover ring-2 transition-colors ${
                onProfile ? "ring-primary" : "ring-transparent"
              }`}
            />
            {meOnline && (
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {authUser?.fullName}
            </p>
            <p
              className={`truncate text-xs ${
                meOnline ? "text-success" : "text-base-content/55"
              }`}
            >
              {meOnline ? "Online" : authUser?.email}
            </p>
          </div>
        </button>

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
    </div>
  );
};

export default SidebarFooter;
