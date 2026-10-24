import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Check,
  Crown,
  LogOut,
  Pencil,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

const sameId = (a, b) => String(a) === String(b);
const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "./avatar.png";
const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

const GroupInfoModal = ({ open, onClose }) => {
  const {
    selectedGroup: group,
    updateGroup,
    addMembers,
    removeMember,
    changeRole,
    leaveGroup,
    deleteGroup,
  } = useGroupStore();
  const users = useChatStore((s) => s.users);
  const { authUser, onlineUsers } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirm, setConfirm] = useState(null); // "leave" | "delete" | { remove: member }
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setAdding(false);
      setPicked([]);
      setConfirm(null);
    } else if (group) {
      setName(group.name);
    }
  }, [open, group?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const myId = String(authUser?.id);
  const onlineIds = toIds(onlineUsers);

  const addable = useMemo(() => {
    if (!group) return [];
    const inGroup = new Set(group.members.map((m) => String(m.id)));
    return users.filter((u) => !u.isBlocked && !inGroup.has(String(u.id)));
  }, [users, group]);

  if (!open || !group) return null;

  const me = group.members.find((m) => sameId(m.id, myId));
  const isAdmin = me?.role === "admin";
  const isOwner = sameId(group.owner, myId);

  const canRemove = (m) =>
    isAdmin &&
    !sameId(m.id, myId) &&
    !sameId(m.id, group.owner) &&
    (m.role !== "admin" || isOwner);
  const canToggleRole = (m) =>
    isAdmin &&
    !sameId(m.id, myId) &&
    !sameId(m.id, group.owner) &&
    (m.role !== "admin" || isOwner);

  const run = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    const n = name.trim();
    if (n.length < 2 || n === group.name) return setEditing(false);
    const ok = await run(() => updateGroup(group.id, { name: n }));
    if (ok) setEditing(false);
  };

  const changePhoto = (e) => {
    const f = e.target.files?.[0];
    if (f) run(() => updateGroup(group.id, { avatarFile: f }));
    e.target.value = "";
  };

  const submitAdd = async () => {
    if (!picked.length) return;
    const ok = await run(() => addMembers(group.id, picked));
    if (ok) {
      setPicked([]);
      setAdding(false);
    }
  };

  const doConfirm = async () => {
    if (confirm === "leave") {
      const ok = await run(() => leaveGroup(group.id));
      if (ok) onClose();
    } else if (confirm === "delete") {
      const ok = await run(() => deleteGroup(group.id));
      if (ok) onClose();
    } else if (confirm?.remove) {
      await run(() => removeMember(group.id, confirm.remove.id));
      setConfirm(null);
    }
  };

  const confirmText =
    confirm === "leave"
      ? "Leave this group?"
      : confirm === "delete"
        ? "Delete this group for everyone? This can't be undone."
        : confirm?.remove
          ? `Remove ${confirm.remove.fullName} from the group?`
          : "";

  return createPortal(
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-md p-0 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h3 className="font-semibold text-lg">Group info</h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Identity */}
          <div className="flex flex-col items-center px-5 py-5 gap-3">
            <div className="relative">
              {group.avatar ? (
                <img
                  src={group.avatar}
                  alt=""
                  className="size-24 rounded-full object-cover"
                />
              ) : (
                <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-semibold">
                  {group.name?.[0]?.toUpperCase()}
                </div>
              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="absolute bottom-0 right-0 size-8 rounded-full bg-base-100 border border-base-300 flex items-center justify-center hover:bg-base-200"
                    aria-label="Change group photo"
                  >
                    <Camera className="size-4" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={changePhoto}
                  />
                </>
              )}
            </div>

            {editing ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  className="input input-bordered input-sm flex-1"
                  value={name}
                  maxLength={50}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                />
                <button
                  className="btn btn-primary btn-sm btn-circle"
                  onClick={saveName}
                  disabled={busy}
                  aria-label="Save name"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold [overflow-wrap:anywhere]">
                  {group.name}
                </h4>
                {isAdmin && (
                  <button
                    className="btn btn-ghost btn-xs btn-circle"
                    onClick={() => setEditing(true)}
                    aria-label="Rename group"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-base-content/60">
              {group.members.length} members
            </p>
          </div>

          <div className="border-t border-base-300" />

          {/* Add members */}
          {isAdmin && (
            <div className="px-5 py-3">
              {!adding ? (
                <button
                  className="btn btn-ghost btn-sm gap-2 text-primary"
                  onClick={() => setAdding(true)}
                >
                  <UserPlus className="size-4" /> Add members
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-44 overflow-y-auto">
                    {addable.map((u) => {
                      const on = picked.includes(String(u.id));
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setPicked((p) =>
                              on
                                ? p.filter((x) => x !== String(u.id))
                                : [...p, String(u.id)],
                            )
                          }
                          className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-base-200 text-left"
                        >
                          <img
                            src={avatarSrc(u.avatar)}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                          <span className="flex-1 truncate text-sm">
                            {u.fullName}
                          </span>
                          <span
                            className={`size-5 rounded-full border flex items-center justify-center ${on ? "bg-primary border-primary text-primary-content" : "border-base-content/30"}`}
                          >
                            {on && <Check className="size-3" />}
                          </span>
                        </button>
                      );
                    })}
                    {addable.length === 0 && (
                      <p className="text-sm text-base-content/50 py-3 text-center">
                        No one left to add
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setAdding(false);
                        setPicked([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={submitAdd}
                      disabled={!picked.length || busy}
                    >
                      Add {picked.length || ""}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <ul className="px-3 pb-3">
            {group.members.map((m) => {
              const online = onlineIds.includes(String(m.id));
              const isGroupOwner = sameId(m.id, group.owner);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-base-200/60"
                >
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc(m.avatar)}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.fullName}
                      {sameId(m.id, myId) && (
                        <span className="text-base-content/50"> (You)</span>
                      )}
                    </div>
                    <div className="text-xs text-base-content/50 flex items-center gap-1">
                      {isGroupOwner ? (
                        <>
                          <Crown className="size-3 text-warning" /> Owner
                        </>
                      ) : m.role === "admin" ? (
                        <>
                          <Shield className="size-3 text-primary" /> Admin
                        </>
                      ) : (
                        "Member"
                      )}
                    </div>
                  </div>

                  {canToggleRole(m) && (
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          changeRole(
                            group.id,
                            m.id,
                            m.role === "admin" ? "member" : "admin",
                          ),
                        )
                      }
                    >
                      {m.role === "admin" ? "Remove admin" : "Make admin"}
                    </button>
                  )}
                  {canRemove(m) && (
                    <button
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      disabled={busy}
                      onClick={() => setConfirm({ remove: m })}
                      aria-label={`Remove ${m.fullName}`}
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer actions */}
        <div className="border-t border-base-300 px-5 py-3">
          {confirm ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{confirmText}</p>
              <div className="flex gap-2 shrink-0">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirm(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error btn-sm"
                  onClick={doConfirm}
                  disabled={busy}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm text-error gap-2"
                onClick={() => setConfirm("leave")}
              >
                <LogOut className="size-4" /> Leave group
              </button>
              {isOwner && (
                <button
                  className="btn btn-ghost btn-sm text-error gap-2"
                  onClick={() => setConfirm("delete")}
                >
                  <Trash2 className="size-4" /> Delete group
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !busy && onClose()}
      />
    </div>,
    document.body,
  );
};

export default GroupInfoModal;
