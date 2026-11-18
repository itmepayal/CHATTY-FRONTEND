import { AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  MessageCircle,
  Search,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Avatar,
  ArchivedRow,
  BackBar,
  EmptyState,
  Row,
  RowAction,
  SectionLabel,
  UnreadBadge,
} from "./SidebarComponents.jsx";
import {
  avatarSrc,
  formatListTime,
  getPreview,
  sameId,
} from "./sidebarUtils.js";
import { useChatLockStore } from "../../store/useChatLockStore.js";
import { usePrivacyStore } from "../../store/usePrivacyStore.js";

export const SidebarChatsTab = ({
  showArchived,
  setShowArchived,
  q,
  setQuery,
  tab,
  presence,
  archivedUsers,
  archivedUnread,
  showSections,
  favUsers,
  otherUsers,
  filteredUsers,
  selectedUser,
  selectedGroup,
  openChat,
  isOnline,
  isFavorite,
  authUser,
  setArchive,
  toggleFavorite,
  getEmptyText,
  hasActiveFilters,
  clearFilters,
  openAddContact,
  setShowAddContact,
}) => {
  usePrivacyStore((s) => s.privacy.lockedChats);
  useChatLockStore((s) => s.unlockedInSession);
  const onAddContact = openAddContact || (() => setShowAddContact?.(true));

  const renderUser = (user, i = 0) => {
    const favorite = isFavorite(user);
    const isSelected = !selectedGroup && sameId(selectedUser?.id, user.id);
    const unread = user.unreadCount || 0;
    const isLocked = useChatLockStore.getState().isChatLocked(user.id);

    return (
      <Row
        key={user.id}
        index={i}
        selected={isSelected}
        onClick={() => openChat(user)}
        avatar={
          <Avatar
            src={avatarSrc(user.avatar)}
            name={user.fullName}
            online={isOnline(user)}
            selected={isSelected}
          />
        }
        title={user.fullName}
        subtitle={
          isLocked
            ? "🔒 Locked conversation"
            : getPreview(user.lastMessage, authUser?.id)
        }
        time={formatListTime(user.lastMessageAt)}
        unread={unread}
        trailing={<UnreadBadge count={unread} />}
        actions={
          unread === 0 && (
            <>
              <RowAction
                onClick={() => setArchive(String(user.id), !user.isArchived)}
                label={user.isArchived ? "Unarchive chat" : "Archive chat"}
                className="hidden opacity-0 group-hover:opacity-100 lg:grid"
              >
                {user.isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </RowAction>
              <RowAction
                onClick={() => toggleFavorite(String(user.id), favorite)}
                label={favorite ? "Remove from favorites" : "Add to favorites"}
                pressed={favorite}
                className={
                  favorite
                    ? ""
                    : "opacity-60 lg:opacity-0 lg:group-hover:opacity-100"
                }
              >
                <Star
                  className={`size-4 ${
                    favorite
                      ? "fill-warning text-warning"
                      : "hover:text-warning"
                  }`}
                />
              </RowAction>
            </>
          )
        }
      />
    );
  };

  return (
    <>
      {showArchived ? (
        <BackBar
          label="Archived chats"
          onClick={() => setShowArchived(false)}
        />
      ) : (
        !q &&
        archivedUsers.length > 0 && (
          <ArchivedRow
            count={archivedUsers.length}
            unread={archivedUnread}
            onClick={() => setShowArchived(true)}
          />
        )
      )}

      {showSections ? (
        <>
          <SectionLabel>Favorites</SectionLabel>
          <AnimatePresence initial={false}>
            {favUsers.map((u, i) => renderUser(u, i))}
          </AnimatePresence>
          <SectionLabel>All chats</SectionLabel>
          <AnimatePresence initial={false}>
            {otherUsers.map((u, i) => renderUser(u, i))}
          </AnimatePresence>
        </>
      ) : (
        <AnimatePresence initial={false}>
          {filteredUsers.map((u, i) => renderUser(u, i))}
        </AnimatePresence>
      )}

      {filteredUsers.length === 0 && (
        (() => {
          if (q) {
            return (
              <EmptyState
                icon={Search}
                title="No conversations found"
                description={`We couldn't find any chats matching "${q}".`}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {setQuery && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                      >
                        Clear search
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onAddContact}
                      className="btn btn-primary btn-xs sm:btn-sm gap-1"
                    >
                      <UserPlus className="size-3.5" />
                      Find people
                    </button>
                  </div>
                }
              />
            );
          }

          if (showArchived) {
            return (
              <EmptyState
                icon={Archive}
                title="No archived chats"
                description="Archived chats will appear here once you archive a conversation."
                action={
                  <button
                    type="button"
                    onClick={() => setShowArchived(false)}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                  >
                    Back to chats
                  </button>
                }
              />
            );
          }

          if (hasActiveFilters) {
            let Icon = MessageCircle;
            let title = "No matching chats";
            let description = "Try selecting different filters to see conversations.";

            if (tab === "unread") {
              Icon = CheckCircle2;
              title = "All caught up";
              description = "You don't have any unread messages at the moment.";
            } else if (tab === "favorites") {
              Icon = Star;
              title = "No favorite chats";
              description = "Star contacts to keep your favorite conversations right here.";
            } else if (presence === "online") {
              Icon = Users;
              title = "No one online";
              description = "None of your contacts are currently active.";
            } else if (presence === "offline") {
              Icon = Users;
              title = "Everyone is online";
              description = "All of your contacts are currently active.";
            }

            return (
              <EmptyState
                icon={Icon}
                title={title}
                description={description}
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                  >
                    Reset filters
                  </button>
                }
              />
            );
          }

          return (
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              description="Connect with friends and colleagues to start chatting."
              action={
                <button
                  type="button"
                  onClick={onAddContact}
                  className="btn btn-primary btn-xs sm:btn-sm gap-1"
                >
                  <UserPlus className="size-3.5" />
                  Add contacts
                </button>
              }
            />
          );
        })()
      )}
    </>
  );
};

export default SidebarChatsTab;
