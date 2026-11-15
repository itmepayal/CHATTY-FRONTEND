import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { usePrivacyStore } from "../store/usePrivacyStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { formatLastSeen } from "../lib/lastSeen.js";

const sameId = (a, b) => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

export const useLastSeen = (userId) => {
  const uid = useMemo(() => {
    if (!userId) return null;
    if (typeof userId === "object") {
      return String(userId.id ?? userId._id ?? "");
    }
    return String(userId);
  }, [userId]);

  const [, setTick] = useState(0);

  // Re-evaluate relative timestamps every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const hiddenUsers = useAuthStore((s) => s.hiddenUsers);
  const presenceMap = useAuthStore((s) => s.presenceMap);
  const myStatusVisible = usePrivacyStore((s) => s.privacy.showOnlineStatus);

  const selectedUser = useChatStore((s) => s.selectedUser);
  const users = useChatStore((s) => s.users);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);

  const storeUser = useMemo(() => {
    if (!uid) return null;
    if (selectedUser && sameId(selectedUser.id ?? selectedUser._id, uid)) {
      return selectedUser;
    }
    const found = users.find((u) => sameId(u.id ?? u._id, uid));
    if (found) return found;
    if (typeof userId === "object" && userId !== null) {
      return userId;
    }
    return null;
  }, [uid, selectedUser, users, userId]);

  const isTargetHidden = uid
    ? hiddenUsers.some((id) => String(id) === uid) ||
      Boolean(storeUser?.isOnlineRestricted)
    : false;

  const isStatusHidden = Boolean(isTargetHidden || !myStatusVisible);

  const isOnline = Boolean(
    !isStatusHidden && uid && onlineUsers.some((id) => String(id) === uid),
  );

  const isLastSeenRestricted = Boolean(storeUser?.isLastSeenRestricted);

  const livePresence = uid ? presenceMap?.[uid] : null;

  const timestamp =
    livePresence?.lastSeen !== undefined
      ? livePresence.lastSeen
      : (storeUser?.lastSeen ?? null);

  const isLoading = Boolean(!storeUser && !timestamp && isUsersLoading);

  const text = formatLastSeen(
    {
      lastSeen: timestamp,
      isLastSeenRestricted,
    },
    {
      isOnline,
      isStatusHidden,
      isLoading,
    },
  );

  return {
    text,
    isOnline,
    timestamp,
    isLoading,
    toString: () => text,
    valueOf: () => text,
  };
};

export default useLastSeen;
