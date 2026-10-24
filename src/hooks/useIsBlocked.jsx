import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

// id string, ObjectId ya populated object, teeno handle karta hai
const idOf = (v) => String(v?._id ?? v?.id ?? v);

/**
 * Kya maine `user` ko block kiya hai?
 *
 * Priority:
 *  1. Socket ka "relationsUpdated" event (live, multi-tab sync)
 *  2. authUser.blockedUsers (agar formatUser ye field bhejta hai)
 *  3. user.isBlocked (sidebar API se aata hai)
 */
export const useIsBlocked = (user) => {
  const authUser = useAuthStore((s) => s.authUser);
  const socket = useAuthStore((s) => s.socket);

  const [liveList, setLiveList] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onUpdate = ({ blockedUsers }) =>
      setLiveList((blockedUsers || []).map(String));

    socket.on("relationsUpdated", onUpdate);
    return () => socket.off("relationsUpdated", onUpdate);
  }, [socket]);

  if (!user?.id) return false;

  if (liveList) return liveList.includes(String(user.id));

  if (Array.isArray(authUser?.blockedUsers)) {
    return authUser.blockedUsers.some((b) => idOf(b) === String(user.id));
  }

  return Boolean(user.isBlocked);
};

export const BlockedBanner = ({ name }) => (
  <div className="shrink-0 border-t border-base-300 bg-base-100 px-4 py-4">
    <div className="flex items-center justify-center gap-2 text-sm text-base-content/60">
      <Ban className="size-4 shrink-0" />
      <span className="text-center">
        You blocked {name || "this user"}. Unblock to send messages.
      </span>
    </div>
  </div>
);
