import {
  CALL_FILTERS,
  callTime,
  hasConversation,
  KEEP_CONVERSATIONS,
  normalizeCall,
  PRESENCE,
  SHOW_ONLY_CONTACTS,
  TABS,
  timeValue,
} from "./sidebarUtils.js";

export const buildAllChatUsers = (users = [], contacts = [], contactIdSet = new Set()) => {
  const map = new Map();
  users.forEach((u) => {
    const id = String(u.id);
    if (
      !SHOW_ONLY_CONTACTS ||
      contactIdSet.has(id) ||
      (KEEP_CONVERSATIONS && hasConversation(u))
    ) {
      map.set(id, u);
    }
  });
  contacts.forEach((c) => {
    const id = String(c.id);
    if (!map.has(id)) map.set(id, c);
  });
  return Array.from(map.values());
};

export const filterSidebarUsers = ({
  chatUsers = [],
  tabMatch,
  tab,
  presenceMatch,
  presence,
  q,
}) => {
  return chatUsers
    .filter((user) => {
      if (!tabMatch[tab](user)) return false;
      if (!presenceMatch[presence](user)) return false;
      if (q && !user.fullName?.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = timeValue(b) - timeValue(a);
      if (diff !== 0) return diff;
      return (a.fullName || "").localeCompare(b.fullName || "");
    });
};

export const buildAllCalls = (userCalls = [], groupCalls = [], authUserId) => {
  return [
    ...(Array.isArray(userCalls) ? userCalls : []).map((c) =>
      normalizeCall(c, authUserId, false),
    ),
    ...(Array.isArray(groupCalls) ? groupCalls : []).map((c) =>
      normalizeCall(c, authUserId, true),
    ),
  ].sort((a, b) => callTime(b) - callTime(a));
};

export const getSidebarEmptyText = ({
  showArchived,
  q,
  hasActiveFilters,
  tab,
  presence,
}) => {
  if (showArchived && !q && !hasActiveFilters) return "No archived chats";
  if (q) return "No contacts match your search";
  if (tab !== "all" && presence !== "any")
    return "Nothing matches these filters";
  if (tab === "unread") return "You're all caught up";
  if (tab === "favorites") return "No favorite contacts yet";
  if (presence === "online") return "No one is online right now";
  if (presence === "offline") return "Everyone is online right now";
  return "No contacts yet";
};

const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

export const getSidebarHeaderTexts = ({
  mode,
  showArchived,
  showArchivedGroups,
  missedCount,
  allCallsCount,
  groupsCount,
  archivedGroupsCount,
  archivedUsersCount,
  onlineCount,
}) => {
  const headerTitle =
    mode === "calls"
      ? "Calls"
      : mode === "groups"
        ? showArchivedGroups
          ? "Archived groups"
          : "Groups"
        : showArchived
          ? "Archived chats"
          : "Messages";

  const headerSub =
    mode === "calls"
      ? missedCount > 0
        ? `${missedCount} missed`
        : `${allCallsCount} recent`
      : mode === "groups"
        ? showArchivedGroups
          ? plural(archivedGroupsCount, "group")
          : plural(groupsCount - archivedGroupsCount, "group")
        : showArchived
          ? plural(archivedUsersCount, "chat")
          : `${onlineCount} online`;

  return { headerTitle, headerSub };
};

export const buildSidebarFilterItems = ({ countFor, tab, presence, missedCount }) => {
  const tabItems = TABS.map(({ key, label }) => ({
    key,
    label,
    count: countFor(key, presence),
    badge: key === "unread" && countFor(key, presence) > 0,
  }));

  const presenceItems = PRESENCE.map(({ key, label }) => ({
    key,
    label,
    dot: key === "any" ? undefined : key,
    count: key === "any" ? undefined : countFor(tab, key),
  }));

  const callFilterItems = CALL_FILTERS.map(({ key, label }) => ({
    key,
    label,
    count: key === "missed" && missedCount > 0 ? missedCount : undefined,
    badge: key === "missed" && missedCount > 0,
    tone: "danger",
  }));

  return { tabItems, presenceItems, callFilterItems };
};
