import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, Settings, User } from "lucide-react";
import { ChattyLogo } from "./common/ChattyLogo";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { pathname } = useLocation();

  const navBtn = (path) =>
    `btn btn-sm btn-ghost gap-2 rounded-full px-3 transition-colors ${
      pathname === path
        ? "bg-primary/10 text-primary hover:bg-primary/15"
        : "hover:bg-base-200"
    }`;

  return (
    <header className="fixed top-0 z-40 w-full border-b border-base-300 bg-base-100/80 backdrop-blur-lg">
      <div className="container mx-auto h-16 px-4">
        <div className="flex h-full items-center justify-between">
          {/* Logo + naam */}
          <Link
            to="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Chatty home"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-base-200 ring-1 ring-base-300 shadow-sm transition-transform group-hover:-rotate-3 group-hover:scale-105">
              <ChattyLogo className="size-7" />
            </div>
            <div className="leading-tight">
              <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Chatty
              </h1>
              <p className="hidden text-[11px] text-base-content/60 sm:block">
                Baat karo, bina ruke
              </p>
            </div>
          </Link>

          {/* Actions */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/settings"
              className={navBtn("/settings")}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link
                  to="/profile"
                  className={navBtn("/profile")}
                  aria-label="Profile"
                  title="Profile"
                >
                  {authUser.profilePic ? (
                    <img
                      src={authUser.profilePic}
                      alt=""
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <User className="size-4" />
                  )}
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <div className="mx-1 hidden h-6 w-px bg-base-300 sm:block" />

                <button
                  className="btn btn-sm btn-ghost gap-2 rounded-full px-3 text-error hover:bg-error/10"
                  onClick={logout}
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
