import { useState } from "react";
import {
  MessageCircle,
  Phone,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "framer-motion";
import SidebarSkeleton from "../components/Skeleton/SidebarSkeleton";
import CreateGroupModal from "./modal/CreateGroupModal";
import AddContactModal from "./contact/AddContactModal";
import { Segmented } from "./Sidebar/SidebarComponents.jsx";
import { LogoutConfirm } from "./Sidebar/LogoutConfirmModal.jsx";
import { SidebarHeader } from "./Sidebar/SidebarHeader.jsx";
import { SidebarFooter } from "./Sidebar/SidebarFooter.jsx";
import { SidebarFilterBar } from "./Sidebar/SidebarFilterBar.jsx";
import { SidebarChatsTab } from "./Sidebar/SidebarChatsTab.jsx";
import { SidebarGroupsTab } from "./Sidebar/SidebarGroupsTab.jsx";
import { SidebarCallsTab } from "./Sidebar/SidebarCallsTab.jsx";
import { ContactRequestsTab } from "./contact/ContactRequestsTab.jsx";
import { useSidebarData } from "./Sidebar/useSidebarData.js";
import { paneVariants } from "./Sidebar/sidebarUtils.js";
import ChatUnlockModal from "./settings/privacy/ChatUnlockModal.jsx";
import NotificationCenterModal from "./contact/NotificationCenterModal.jsx";
import BlockedUsersModal from "./contact/BlockedUsersModal.jsx";
import StoryTray from "./stories/StoryTray.jsx";
import { SidebarSearchInput } from "./Sidebar/SidebarSearchInput.jsx";

const Sidebar = () => {
  const data = useSidebarData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  if (data.isUsersLoading || !data.contactsLoaded) {
    return <SidebarSkeleton />;
  }

  const {
    mode,
    dir,
    showCreate,
    setShowCreate,
    showAddContact,
    setShowAddContact,
    openAddContact,
    closeAddContact,
    openCreateGroup,
    closeCreateGroup,
    tab,
    setTab,
    presence,
    setPresence,
    callFilter,
    setCallFilter,
    query,
    setQuery,
    scrolled,
    setScrolled,
    confirmLogout,
    setConfirmLogout,
    isLoggingOut,
    showArchived,
    setShowArchived,
    showArchivedGroups,
    setShowArchivedGroups,
    navigate,
    selectedUser,
    groups,
    selectedGroup,
    archiveGroup,
    unarchiveGroup,
    setArchive,
    authUser,
    toggleFavorite,
    isOnline,
    isFavorite,
    meOnline,
    archivedUsers,
    archivedUnread,
    archivedGroups,
    archivedGroupUnread,
    filteredUsers,
    filteredGroups,
    filteredCalls,
    favUsers,
    otherUsers,
    showSections,
    hasActiveFilters,
    clearFilters,
    getEmptyText,
    missedCount,
    callsInitialLoading,
    chatUnread,
    groupUnread,
    hasOpenChat,
    changeMode,
    openChat,
    openGroup,
    openFromCall,
    handleLogout,
    onSettings,
    onProfile,
    headerTitle,
    headerSub,
    tabItems,
    presenceItems,
    callFilterItems,
    searchPlaceholder,
    q,
    allChatUsers,
  } = data;

  const handleChatUnlocked = (id) => {
    const user = (allChatUsers || []).find((u) => String(u.id) === String(id));
    if (user) {
      openChat(user);
      return;
    }
    const group = (groups || []).find(
      (g) => String(g.id || g._id) === String(id),
    );
    if (group) {
      openGroup(group);
    }
  };

  const modes = [
    {
      key: "chats",
      label: "Chats",
      icon: MessageCircle,
      count: chatUnread || null,
      badge: true,
    },
    {
      key: "groups",
      label: "Groups",
      icon: UsersRound,
      count: groupUnread || null,
      badge: true,
    },
    {
      key: "calls",
      label: "Calls",
      icon: Phone,
      count: missedCount || null,
      badge: true,
      tone: "danger",
    },
    {
      key: "requests",
      label: "Requests",
      icon: UserPlus,
      count: data.requestsCount || null,
      badge: true,
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <aside
        className={`h-full w-full min-w-0 shrink-0 flex-col border-r border-base-300/80 bg-base-100 md:w-[290px] lg:w-[310px] xl:w-[320px] ${
          hasOpenChat ? "hidden lg:flex" : "flex"
        }`}
      >
        <SidebarHeader
          mode={mode}
          headerTitle={headerTitle}
          headerSub={headerSub}
          openAddContact={openAddContact}
          openCreateGroup={openCreateGroup}
          openNotifications={() => setShowNotifications(true)}
          openBlockedUsers={() => setShowBlockedUsers(true)}
          setShowAddContact={setShowAddContact}
          setShowCreate={setShowCreate}
          changeMode={changeMode}
        />

        <div className="px-3 pt-2 pb-1 sm:px-4 sm:pt-2.5 sm:pb-1.5">
          <Segmented
            items={modes}
            value={mode}
            onChange={changeMode}
            layoutId="sidebar-modes"
            label="Sidebar section"
          />
        </div>

        {mode === "chats" && <StoryTray />}

        <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-3.5 sm:pb-2.5 space-y-3">
          <SidebarSearchInput
            query={query}
            setQuery={setQuery}
            placeholder={searchPlaceholder}
          />

          <AnimatePresence initial={false} mode="wait">
            {mode === "chats" && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <SidebarFilterBar
                  tabItems={tabItems}
                  tab={tab}
                  setTab={setTab}
                  presenceItems={presenceItems}
                  presence={presence}
                  setPresence={setPresence}
                  hasActiveFilters={hasActiveFilters}
                  clearFilters={clearFilters}
                />
              </motion.div>
            )}

            {mode === "calls" && (
              <motion.div
                key="call-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div
                  className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5"
                  role="tablist"
                  aria-label="Filter calls"
                >
                  {callFilterItems.map(({ key, label: text, count, badge }) => {
                    const active = callFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setCallFilter(key)}
                        className={`relative inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-primary text-primary-content shadow-xs"
                            : "bg-base-200/70 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                        }`}
                      >
                        <span>{text}</span>
                        {count !== undefined && count !== null && count > 0 && (
                          <span
                            className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
                              active
                                ? "bg-primary-content/20 text-primary-content"
                                : badge
                                  ? "bg-error text-error-content"
                                  : "bg-base-300 text-base-content/70"
                            }`}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className={`relative z-10 border-t border-base-300 transition-shadow ${
            scrolled ? "shadow-[0_6px_12px_-8px_rgba(0,0,0,0.2)]" : ""
          }`}
        />

        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain py-2"
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={mode}
              custom={dir}
              variants={paneVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {mode === "calls" && (
                <SidebarCallsTab
                  callsInitialLoading={callsInitialLoading}
                  filteredCalls={filteredCalls}
                  openFromCall={openFromCall}
                  q={q}
                  callFilter={callFilter}
                  setCallFilter={setCallFilter}
                />
              )}

              {mode === "groups" && (
                <SidebarGroupsTab
                  showArchivedGroups={showArchivedGroups}
                  setShowArchivedGroups={setShowArchivedGroups}
                  q={q}
                  archivedGroups={archivedGroups}
                  archivedGroupUnread={archivedGroupUnread}
                  filteredGroups={filteredGroups}
                  selectedGroup={selectedGroup}
                  openGroup={openGroup}
                  authUser={authUser}
                  unarchiveGroup={unarchiveGroup}
                  archiveGroup={archiveGroup}
                  openCreateGroup={openCreateGroup}
                  setShowCreate={setShowCreate}
                />
              )}

              {mode === "chats" && (
                <SidebarChatsTab
                  showArchived={showArchived}
                  setShowArchived={setShowArchived}
                  q={q}
                  setQuery={setQuery}
                  tab={tab}
                  presence={presence}
                  archivedUsers={archivedUsers}
                  archivedUnread={archivedUnread}
                  showSections={showSections}
                  favUsers={favUsers}
                  otherUsers={otherUsers}
                  filteredUsers={filteredUsers}
                  selectedUser={selectedUser}
                  selectedGroup={selectedGroup}
                  openChat={openChat}
                  isOnline={isOnline}
                  isFavorite={isFavorite}
                  authUser={authUser}
                  setArchive={setArchive}
                  toggleFavorite={toggleFavorite}
                  getEmptyText={getEmptyText}
                  hasActiveFilters={hasActiveFilters}
                  clearFilters={clearFilters}
                  openAddContact={openAddContact}
                  setShowAddContact={setShowAddContact}
                />
              )}

              {mode === "requests" && <ContactRequestsTab />}
            </motion.div>
          </AnimatePresence>
        </div>

        <SidebarFooter
          authUser={authUser}
          meOnline={meOnline}
          onProfile={onProfile}
          onSettings={onSettings}
          navigate={navigate}
          setConfirmLogout={setConfirmLogout}
        />

        <CreateGroupModal
          open={showCreate && !showAddContact}
          onClose={closeCreateGroup}
          onOpenAddContacts={openAddContact}
        />

        <AddContactModal
          open={showAddContact && !showCreate}
          onClose={closeAddContact}
        />

        {showNotifications && (
          <NotificationCenterModal
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        )}

        {showBlockedUsers && (
          <BlockedUsersModal
            open={showBlockedUsers}
            onClose={() => setShowBlockedUsers(false)}
          />
        )}

        <LogoutConfirm
          open={confirmLogout}
          loading={isLoggingOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={handleLogout}
        />

        <ChatUnlockModal onUnlocked={handleChatUnlocked} />
      </aside>
    </MotionConfig>
  );
};

export default Sidebar;
