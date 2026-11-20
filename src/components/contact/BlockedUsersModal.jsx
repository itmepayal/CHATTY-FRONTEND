import { useState, useEffect } from "react";
import { ModalLayout, ModalHeader, ModalBody, ModalFooter, SecondaryButton, PrimaryButton } from "../chat-ui";
import { ShieldAlert, UserCheck, Loader2, Users, Search } from "lucide-react";
import { useContactStore } from "../../store/useContactStore";
import { Avatar, EmptyState } from "../Sidebar/SidebarComponents.jsx";
import { avatarSrc } from "../Sidebar/sidebarUtils.js";

export const BlockedUsersModal = ({ open, onClose }) => {
  const { blockedUsers, isBlockedLoading, fetchBlockedUsers, unblockUser } = useContactStore();
  const [unblockingId, setUnblockingId] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
    }
  }, [open, fetchBlockedUsers]);

  const handleUnblock = async (userId) => {
    setUnblockingId(userId);
    try {
      await unblockUser(userId);
      setConfirmUser(null);
    } finally {
      setUnblockingId(null);
    }
  };

  const filtered = blockedUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <ModalLayout open={open} onClose={onClose} size="md">
        <ModalHeader
          icon={ShieldAlert}
          title="Blocked Users"
          subtitle={`${blockedUsers.length} blocked account${blockedUsers.length === 1 ? "" : "s"}`}
          onClose={onClose}
        />

        <ModalBody className="space-y-3">
          {blockedUsers.length > 0 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blocked users..."
                className="input input-sm input-bordered w-full rounded-xl text-xs pl-8"
              />
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
            </div>
          )}

          <div className="h-64 overflow-y-auto divide-y divide-base-300/40 rounded-xl border border-base-300/60 bg-base-200/20">
            {isBlockedLoading ? (
              <div className="flex h-full items-center justify-center text-primary">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title={blockedUsers.length === 0 ? "No blocked users" : "No results found"}
                subtitle={
                  blockedUsers.length === 0
                    ? "Users you block will appear here."
                    : "Try a different search term."
                }
              />
            ) : (
              filtered.map((u) => {
                const busy = unblockingId === u.id;
                return (
                  <div
                    key={u.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-base-200/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={avatarSrc(u.avatar)} name={u.fullName} />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-base-content truncate">
                          {u.fullName || "User"}
                        </h4>
                        {u.username && (
                          <p className="text-xs text-base-content/60 truncate">
                            @{u.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmUser(u)}
                      className="btn btn-xs btn-outline btn-error rounded-lg shrink-0 gap-1"
                    >
                      {busy ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span>Unblock</span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </ModalBody>

        <ModalFooter className="justify-end">
          <SecondaryButton size="sm" onClick={onClose}>
            Close
          </SecondaryButton>
        </ModalFooter>
      </ModalLayout>

      {/* Confirmation Modal */}
      {confirmUser && (
        <ModalLayout
          open={Boolean(confirmUser)}
          onClose={() => setConfirmUser(null)}
          size="sm"
        >
          <ModalHeader
            icon={ShieldAlert}
            title="Unblock User?"
            onClose={() => setConfirmUser(null)}
          />
          <ModalBody>
            <p className="text-xs text-base-content/70">
              Are you sure you want to unblock{" "}
              <strong className="text-base-content">{confirmUser.fullName}</strong>?
              They will be able to search for you and send messages or contact requests again according to your privacy settings.
            </p>
          </ModalBody>
          <ModalFooter className="justify-end gap-2">
            <SecondaryButton size="sm" onClick={() => setConfirmUser(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              onClick={() => handleUnblock(confirmUser.id)}
              disabled={Boolean(unblockingId)}
            >
              Confirm Unblock
            </PrimaryButton>
          </ModalFooter>
        </ModalLayout>
      )}
    </>
  );
};

export default BlockedUsersModal;
