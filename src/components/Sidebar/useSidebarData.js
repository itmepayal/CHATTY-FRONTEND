import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useContactStore } from "../../store/useContactStore";
import { usePrivacyStore } from "../../store/usePrivacyStore";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useGroupCallHistoryStore } from "../../store/useGroupCallHistoryStore";
import { useChatLockStore } from "../../store/useChatLockStore";
import { MODE_ORDER, sameId, timeValue, toIds } from "./sidebarUtils.js";
import {
  buildAllCalls,
  buildAllChatUsers,
  buildSidebarFilterItems,
  filterSidebarUsers,
  getSidebarEmptyText,
  getSidebarHeaderTexts,
} from "./sidebarFilters.js";

export const useSidebarData = () => {
  const [mode, setMode] = useState("chats");
  const [dir, setDir] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [tab, setTab] = useState("all");
  const [presence, setPresence] = useState("any");
  const [callFilter, setCallFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedGroups, setShowArchivedGroups] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    setArchive,
  } = useChatStore();

  const {
    groups,
    selectedGroup,
    selectGroup,
    closeGroup,
    fetchGroups,
    archiveGroup,
    unarchiveGroup,
  } = useGroupStore();

  const { onlineUsers, hiddenUsers, authUser, toggleFavorite, logout } =
    useAuthStore();

  const {
    contacts,
    contactIds,
    loaded: contactsLoaded,
    fetchContacts,
    reset: resetContacts,
  } = useContactStore();

  const {
    calls: userCalls,
    isLoading: isCallsLoading,
    fetchCalls,
    clear: clearCalls,
  } = useCallHistoryStore();

  const {
    all: groupCalls,
    isLoadingAll: isGroupCallsLoading,
    fetchAll: fetchGroupCalls,
    clear: clearGroupCalls,
  } = useGroupCallHistoryStore();

  const myStatusVisible = usePrivacyStore((st) => st.privacy.showOnlineStatus);
  const favorites = toIds(authUser?.favorites);

  useEffect(() => {
    getUsers();
    fetchGroups();
    fetchContacts();
  }, [getUsers, fetchGroups, fetchContacts]);

  useEffect(() => {
    if (mode !== "calls") return;
    fetchCalls();
    fetchGroupCalls();
  }, [mode, fetchCalls, fetchGroupCalls]);

  const openAddContact = useCallback(() => {
    setShowCreate(false);
    setShowAddContact(true);
  }, []);

  const closeAddContact = useCallback(() => {
    setShowAddContact(false);
  }, []);

  const openCreateGroup = useCallback(() => {
    setShowAddContact(false);
    setShowCreate(true);
  }, []);

  const closeCreateGroup = useCallback(() => {
    setShowCreate(false);
  }, []);

  const onlineIds = toIds(onlineUsers);
  const hiddenIds = toIds(hiddenUsers);
  const isOnline = (user) =>
    Boolean(
      myStatusVisible &&
        !user.isOnlineRestricted &&
        !hiddenIds.includes(String(user.id)) &&
        onlineIds.includes(String(user.id)),
    );
  const isHidden = (user) => hiddenIds.includes(String(user.id));
  const isFavorite = (user) => favorites.includes(String(user.id));
  const meOnline = authUser ? onlineIds.includes(String(authUser.id)) : false;

  const contactIdSet = new Set((contactIds || []).map(String));
  const allChatUsers = buildAllChatUsers(users, contacts, contactIdSet);

  const archivedUsers = allChatUsers.filter((u) => u.isArchived);
  const archivedUnread = archivedUsers.reduce(
    (sum, u) => sum + (u.unreadCount || 0),
    0,
  );
  const chatUsers = allChatUsers.filter((u) =>
    showArchived ? u.isArchived : !u.isArchived,
  );

  const archivedGroups = groups.filter((g) => g.archived);
  const archivedGroupUnread = archivedGroups.reduce(
    (sum, g) => sum + (g.unreadCount || 0),
    0,
  );
  const visibleGroups = groups.filter((g) =>
    showArchivedGroups ? g.archived : !g.archived,
  );

  const tabMatch = {
    all: () => true,
    unread: (u) => (u.unreadCount || 0) > 0,
    favorites: (u) => isFavorite(u),
  };
  const presenceMatch = {
    any: () => true,
    online: (u) => isOnline(u),
    offline: (u) => !isOnline(u) && !isHidden(u),
  };
  const countFor = (t, p) =>
    chatUsers.filter((u) => tabMatch[t](u) && presenceMatch[p](u)).length;

  const q = query.trim().toLowerCase();
  const filteredUsers = filterSidebarUsers({
    chatUsers,
    tabMatch,
    tab,
    presenceMatch,
    presence,
    q,
  });

  const filteredGroups = visibleGroups
    .filter((g) => !q || g.name?.toLowerCase().includes(q))
    .sort((a, b) => timeValue(b) - timeValue(a));

  const favUsers = filteredUsers.filter(isFavorite);
  const otherUsers = filteredUsers.filter((u) => !isFavorite(u));
  const showSections =
    tab === "all" && !q && favUsers.length > 0 && otherUsers.length > 0;

  const hasActiveFilters = tab !== "all" || presence !== "any";
  const clearFilters = () => {
    setTab("all");
    setPresence("any");
  };

  const getEmptyText = () =>
    getSidebarEmptyText({ showArchived, q, hasActiveFilters, tab, presence });

  const allCalls = buildAllCalls(userCalls, groupCalls, authUser?.id);
  const filteredCalls = allCalls.filter((c) => {
    if (callFilter === "missed" && !c.missed) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const missedCount = allCalls.filter((c) => c.missed).length;
  const isCallsBusy = isCallsLoading || isGroupCallsLoading;
  const callsInitialLoading = isCallsBusy && allCalls.length === 0;

  const chatUnread = allChatUsers
    .filter((u) => !u.isArchived)
    .reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  const groupUnread = groups
    .filter((g) => !g.archived)
    .reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const onlineCount = allChatUsers.filter(
    (u) => !u.isArchived && isOnline(u),
  ).length;

  const hasOpenChat = !!(selectedUser || selectedGroup);

  const changeMode = (key) => {
    if (key === mode) return;
    setDir(MODE_ORDER.indexOf(key) > MODE_ORDER.indexOf(mode) ? 1 : -1);
    setMode(key);
  };

  const openChat = (user) => {
    if (useChatLockStore.getState().isChatLocked(user.id)) {
      useChatLockStore.getState().openUnlockModal(user.id);
      return;
    }
    closeGroup();
    setSelectedUser(user);
  };
  const openGroup = (group) => {
    const gid = group.id || group._id;
    if (useChatLockStore.getState().isChatLocked(gid)) {
      useChatLockStore.getState().openUnlockModal(gid);
      return;
    }
    setSelectedUser(null);
    selectGroup(group);
  };
  const openFromCall = (call) => {
    if (call.isGroup) {
      const g = groups.find((x) => sameId(x.id, call.groupId));
      if (g) openGroup(g);
      return;
    }
    const u =
      allChatUsers.find((x) => sameId(x.id, call.otherId)) ||
      users.find((x) => sameId(x.id, call.otherId));
    if (u) openChat(u);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      clearCalls();
      clearGroupCalls();
      resetContacts();
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  const onSettings = pathname === "/settings";
  const onProfile = pathname === "/profile";

  const { headerTitle, headerSub } = getSidebarHeaderTexts({
    mode,
    showArchived,
    showArchivedGroups,
    missedCount,
    allCallsCount: allCalls.length,
    groupsCount: groups.length,
    archivedGroupsCount: archivedGroups.length,
    archivedUsersCount: archivedUsers.length,
    onlineCount,
  });

  const { tabItems, presenceItems, callFilterItems } = buildSidebarFilterItems({
    countFor,
    tab,
    presence,
    missedCount,
  });

  const searchPlaceholder =
    mode === "groups"
      ? "Search groups"
      : mode === "calls"
        ? "Search calls"
        : "Search contacts";

  return {
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
    isUsersLoading,
    contactsLoaded,
  };
};

export default useSidebarData;
