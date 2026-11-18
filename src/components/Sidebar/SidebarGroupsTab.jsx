import { AnimatePresence } from "framer-motion";
import { Archive, ArchiveRestore, Plus, Search, UsersRound } from "lucide-react";
import {
  Avatar,
  ArchivedRow,
  BackBar,
  EmptyState,
  Row,
  RowAction,
  UnreadBadge,
} from "./SidebarComponents.jsx";
import {
  avatarSrc,
  formatListTime,
  getGroupPreview,
  sameId,
} from "./sidebarUtils.js";
import { useChatLockStore } from "../../store/useChatLockStore.js";
import { usePrivacyStore } from "../../store/usePrivacyStore.js";

export const SidebarGroupsTab = ({
  showArchivedGroups,
  setShowArchivedGroups,
  q,
  archivedGroups,
  archivedGroupUnread,
  filteredGroups,
  selectedGroup,
  openGroup,
  authUser,
  unarchiveGroup,
  archiveGroup,
  openCreateGroup,
  setShowCreate,
}) => {
  usePrivacyStore((s) => s.privacy.lockedChats);
  useChatLockStore((s) => s.unlockedInSession);
  const onCreateGroup = openCreateGroup || (() => setShowCreate?.(true));

  const renderGroup = (group, i = 0) => {
    const isSelected = sameId(selectedGroup?.id, group.id);
    const unread = group.unreadCount || 0;
    const gid = String(group.id || group._id);
    const isLocked = useChatLockStore.getState().isChatLocked(gid);

    return (
      <Row
        key={group.id}
        index={i}
        selected={isSelected}
        onClick={() => openGroup(group)}
        avatar={
          <Avatar
            group
            src={group.avatar ? avatarSrc(group.avatar) : null}
            name={group.name}
            selected={isSelected}
          />
        }
        title={group.name}
        subtitle={
          isLocked
            ? "🔒 Locked group"
            : getGroupPreview(group.lastMessage, authUser?.id)
        }
        time={formatListTime(group.lastMessage?.createdAt)}
        unread={unread}
        trailing={<UnreadBadge count={unread} />}
        actions={
          unread === 0 && (
            <RowAction
              onClick={() =>
                group.archived
                  ? unarchiveGroup(group.id)
                  : archiveGroup(group.id)
              }
              label={group.archived ? "Unarchive group" : "Archive group"}
              className="hidden opacity-0 group-hover:opacity-100 lg:grid"
            >
              {group.archived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </RowAction>
          )
        }
      />
    );
  };

  return (
    <>
      {showArchivedGroups ? (
        <BackBar
          label="Archived groups"
          onClick={() => setShowArchivedGroups(false)}
        />
      ) : (
        !q &&
        archivedGroups.length > 0 && (
          <ArchivedRow
            noun="group"
            count={archivedGroups.length}
            unread={archivedGroupUnread}
            onClick={() => setShowArchivedGroups(true)}
          />
        )
      )}

      <AnimatePresence initial={false}>
        {filteredGroups.map((g, i) => renderGroup(g, i))}
      </AnimatePresence>

      {filteredGroups.length === 0 && (
        (() => {
          if (q) {
            return (
              <EmptyState
                icon={Search}
                title="No groups found"
                description={`No groups matching "${q}".`}
              />
            );
          }
          if (showArchivedGroups) {
            return (
              <EmptyState
                icon={Archive}
                title="No archived groups"
                description="Archived groups will appear here."
                action={
                  <button
                    type="button"
                    onClick={() => setShowArchivedGroups(false)}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                  >
                    Back to groups
                  </button>
                }
              />
            );
          }
          return (
            <EmptyState
              icon={UsersRound}
              title="No groups yet"
              description="Create a group to chat and share with multiple friends at once."
              action={
                <button
                  type="button"
                  onClick={onCreateGroup}
                  className="btn btn-primary btn-xs sm:btn-sm gap-1"
                >
                  <Plus className="size-3.5" />
                  Create a group
                </button>
              }
            />
          );
        })()
      )}
    </>
  );
};

export default SidebarGroupsTab;
