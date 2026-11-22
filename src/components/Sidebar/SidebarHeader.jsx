import { MessageSquare, Phone, Plus, ShieldAlert, UserPlus, UsersRound, Bookmark, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeaderButton } from "./SidebarComponents.jsx";
import { NotificationBell } from "../notifications/NotificationBell.jsx";
import { useSlidingSidebarStore } from "../../store/useSlidingSidebarStore.js";

export const SidebarHeader = ({
  mode,
  headerTitle,
  headerSub,
  openAddContact,
  openCreateGroup,
  openNotifications,
  openBlockedUsers,
  setShowAddContact,
  setShowCreate,
  changeMode,
  onNewCall,
}) => {
  const onAddContact = openAddContact || (() => setShowAddContact?.(true));
  const onCreateGroup = openCreateGroup || (() => setShowCreate?.(true));
  const isOnlineSub = Boolean(headerSub && headerSub.includes("online"));
  const navigate = useNavigate();

  return (
    <div className="h-13 sm:h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-base-300/80 bg-base-100/90 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              useSlidingSidebarStore.getState().openMobile();
            } else {
              useSlidingSidebarStore.getState().toggleCollapse();
            }
          }}
          aria-label="Toggle navigation menu"
          title="Toggle sidebar navigation (Cmd+B)"
          className="flex size-8.5 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="size-4.5 sm:size-5" />
        </button>
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-sm sm:text-base font-bold text-base-content">
            {headerTitle}
          </h2>
          {Boolean(headerSub) && (
            <p className="truncate text-[11px] sm:text-xs text-base-content/60 font-medium flex items-center gap-1.5 mt-0.5">
              {isOnlineSub && (
                <span className="size-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
              )}
              <span>{headerSub}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {/* Saved messages link */}
        <HeaderButton
          icon={Bookmark}
          label="Saved messages"
          onClick={() => navigate("/saved")}
        />

        {/* Modern interactive notification bell with dropdown & center modal toggle */}
        <NotificationBell onOpenCenter={openNotifications} />

        {mode === "calls" ? (
          <>
            <HeaderButton
              icon={UserPlus}
              label="Add contact"
              onClick={onAddContact}
            />
            <HeaderButton
              icon={Phone}
              label="New call"
              onClick={onNewCall || (() => changeMode("chats"))}
            />
          </>
        ) : (
          <>
            <HeaderButton
              icon={UserPlus}
              label="Add contact"
              onClick={onAddContact}
            />
            <HeaderButton
              icon={Plus}
              label="New group"
              onClick={onCreateGroup}
            />
          </>
        )}
      </div>
    </div>
  );
};
