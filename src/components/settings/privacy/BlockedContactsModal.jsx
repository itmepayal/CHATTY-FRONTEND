import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  ShieldAlert,
  UserX,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";

function BlockedUserAvatar({ user }) {
  const [failed, setFailed] = useState(false);
  const rawAvatar =
    typeof user.avatar === "string" ? user.avatar : user.avatar?.url;
  const avatarUrl = typeof rawAvatar === "string" ? rawAvatar.trim() : "";
  const initial = (user.fullName || user.username || "?").charAt(0).toUpperCase();

  return (
    <div className="relative size-10 shrink-0 rounded-full overflow-hidden bg-base-300 flex items-center justify-center border border-base-300">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={user.fullName || "User"}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold uppercase text-base-content/70">
          {initial}
        </span>
      )}
    </div>
  );
}

export default function BlockedContactsModal({ isOpen, onClose }) {
  const {
    blockedUsersList,
    isFetchingBlocked,
    blockedFetchError,
    fetchBlockedUsers,
    unblockUser,
  } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmUnblockUser, setConfirmUnblockUser] = useState(null);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
      setSearchQuery("");
      setConfirmUnblockUser(null);
    }
  }, [isOpen, fetchBlockedUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return blockedUsersList;
    const q = searchQuery.toLowerCase();
    return blockedUsersList.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)),
    );
  }, [blockedUsersList, searchQuery]);

  if (!isOpen) return null;

  const handleUnblock = async (user) => {
    const id = user._id || user.id;
    setUnblockingId(id);
    try {
      await unblockUser(id);
      setConfirmUnblockUser(null);
    } catch (err) {
      console.error("Unblock failed:", err);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-base-200/80 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
              <div className="p-2 rounded-xl bg-error/10 text-error">
                <ShieldAlert className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base sm:text-lg text-base-content tracking-tight">
                  Blocked Contacts
                </h3>
                <p className="text-xs sm:text-sm text-base-content/60 leading-relaxed">
                  Blocked contacts cannot call or message you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200/60 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-base-200/60">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blocked contacts..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-base-200/60 border border-base-300/60 text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto divide-y divide-base-200/40 p-2 sm:p-3">
            {isFetchingBlocked ? (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
                <Loader2 className="size-6 animate-spin text-primary mb-2" />
                <span className="text-xs">Loading blocked contacts…</span>
              </div>
            ) : blockedFetchError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-base-content/60 px-4">
                <AlertTriangle className="size-8 text-error mb-2 opacity-80" />
                <span className="text-sm font-medium text-base-content">
                  Failed to load blocked contacts
                </span>
                <span className="text-xs text-base-content/50 mt-1 max-w-xs">
                  {blockedFetchError}
                </span>
                <button
                  type="button"
                  onClick={() => fetchBlockedUsers()}
                  className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-base-content/60">
                <UserX className="size-8 opacity-40 mb-2" />
                <span className="text-sm font-medium">No blocked contacts</span>
                <span className="text-xs text-base-content/40 mt-0.5">
                  {searchQuery
                    ? "No matches found"
                    : "You haven't blocked anyone yet"}
                </span>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const id = user._id || user.id;

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-base-200/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <BlockedUserAvatar user={user} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-base-content truncate">
                          {user.fullName || user.username}
                        </p>
                        {user.username && (
                          <p className="text-xs text-base-content/50 truncate">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmUnblockUser(user)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-base-200 hover:bg-error/15 hover:text-error text-base-content/80 transition-colors shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Unblock Confirmation Dialog */}
          <AnimatePresence>
            {confirmUnblockUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-base-100/95 backdrop-blur-sm flex items-center justify-center p-6 z-10"
              >
                <div className="max-w-xs text-center space-y-3">
                  <div className="mx-auto size-12 rounded-2xl bg-warning/15 text-warning flex items-center justify-center">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-base-content">
                      Unblock{" "}
                      {confirmUnblockUser.fullName ||
                        confirmUnblockUser.username}
                      ?
                    </h4>
                    <p className="mt-1 text-xs text-base-content/60 leading-relaxed">
                      They will be able to send you messages and call you again.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmUnblockUser(null)}
                      disabled={unblockingId !== null}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-base-200 text-base-content hover:bg-base-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnblock(confirmUnblockUser)}
                      disabled={unblockingId !== null}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-error text-error-content hover:bg-error/90 transition-colors flex items-center gap-1.5"
                    >
                      {unblockingId && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      <span>Unblock</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-base-200/80 px-5 py-3.5 bg-base-200/30">
            <span className="text-xs text-base-content/50">
              {blockedUsersList.length} contact
              {blockedUsersList.length === 1 ? "" : "s"} blocked
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-base-200 hover:bg-base-300 text-base-content transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
