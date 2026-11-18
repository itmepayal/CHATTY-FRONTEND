import { MessageSquare, Phone, Plus, UserPlus, UsersRound } from "lucide-react";
import { HeaderButton } from "./SidebarComponents.jsx";

export const SidebarHeader = ({
  mode,
  headerTitle,
  headerSub,
  openAddContact,
  openCreateGroup,
  setShowAddContact,
  setShowCreate,
  changeMode,
}) => {
  const onAddContact = openAddContact || (() => setShowAddContact?.(true));
  const onCreateGroup = openCreateGroup || (() => setShowCreate?.(true));
  const isOnlineSub = Boolean(headerSub && headerSub.includes("online"));

  return (
    <div className="h-13 sm:h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-base-300/80 bg-base-100/90 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className="flex size-8.5 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          {mode === "groups" ? (
            <UsersRound className="size-4.5 sm:size-5" />
          ) : mode === "calls" ? (
            <Phone className="size-4.5 sm:size-5" />
          ) : (
            <MessageSquare className="size-4.5 sm:size-5" />
          )}
        </span>
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
              onClick={() => changeMode("chats")}
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

export default SidebarHeader;
