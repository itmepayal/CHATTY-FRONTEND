import { AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  MessageCircle,
  Star,
  UserPlus,
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
        <EmptyState icon={MessageCircle}>
          {getEmptyText()}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-ghost btn-sm text-primary"
            >
              Clear filters
            </button>
          )}
          {!hasActiveFilters &&
            (showArchived ? (
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className="btn btn-ghost btn-sm text-primary"
              >
                Back to chats
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddContact}
                className="btn btn-primary btn-sm gap-1"
              >
                <UserPlus className="size-4" />
                {q ? "Find people to add" : "Add contacts"}
              </button>
            ))}
        </EmptyState>
      )}
    </>
  );
};

export default SidebarChatsTab;
