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

  return (
    <div className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-base-300/80 bg-base-100/90 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          {mode === "groups" ? (
            <UsersRound className="size-5" />
          ) : mode === "calls" ? (
            <Phone className="size-5" />
          ) : (
            <MessageSquare className="size-5" />
          )}
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-base sm:text-lg font-bold text-base-content">
            {headerTitle}
          </h2>
          {Boolean(headerSub) && (
            <p className="truncate text-xs text-base-content/60 font-medium">
              {headerSub}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
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
