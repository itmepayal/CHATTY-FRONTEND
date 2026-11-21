import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Crown,
  LogOut,
  Pencil,
  Pin,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  AtSign,
} from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
} from "../chat-ui";

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
  const [confirm, setConfirm] = useState(null);
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

  const myId = String(authUser?.id);
  const onlineIds = toIds(onlineUsers);
  const members = Array.isArray(group?.members) ? group.members : [];

  const addable = useMemo(() => {
    if (!group) return [];
    const inGroup = new Set(
      members.map((m) => String(m.id || m._id || m.userId)),
    );
    return users.filter(
      (u) =>
        !u.isBlocked &&
        u.canAddToGroup !== false &&
        !inGroup.has(String(u.id)),
    );
  }, [users, group, members]);

  if (!group) return null;

  const me = members.find((m) => sameId(m.id || m._id || m.userId, myId));
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
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return setEditing(false);
    await run(() => updateGroup(group.id, { name: trimmed }));
    setEditing(false);
  };

  const changePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await run(() => updateGroup(group.id, { avatarFile: file }));
    e.target.value = "";
  };

  const submitAdd = async () => {
    if (!picked.length) return;
    await run(() => addMembers(group.id, picked));
    setPicked([]);
    setAdding(false);
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

  return (
    <ModalLayout
      open={open}
      onClose={onClose}
      preventClose={busy}
      size="md"
      aria-labelledby="manage-group-title"
    >
      <ModalHeader
        id="manage-group-title"
        icon={Users}
        title="Manage group"
        subtitle={`${members.length} members`}
        onClose={busy ? undefined : onClose}
      />

      <ModalBody className="space-y-4">
        {/* Identity */}
        <div className="flex flex-col items-center px-4 py-4 gap-3 select-none">
          <div className="relative">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt=""
                className="size-24 rounded-full object-cover ring-2 ring-base-300 shadow-md"
              />
            ) : (
              <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold ring-2 ring-base-300 shadow-md uppercase">
                {group.name?.[0]?.toUpperCase()}
              </div>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="absolute bottom-0 right-0 size-8 rounded-full bg-base-100 border border-base-300 flex items-center justify-center hover:bg-base-200 shadow-xs transition-colors"
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
                className="input input-bordered input-sm flex-1 rounded-xl"
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
              <h4 className="text-lg font-bold tracking-tight text-base-content/95 [overflow-wrap:anywhere]">
                {group.name}
              </h4>
              {isAdmin && (
                <button
                  className="btn btn-ghost btn-xs btn-circle hover:bg-base-200"
                  onClick={() => setEditing(true)}
                  aria-label="Rename group"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-base-content/60">
            {members.length} members
          </p>
        </div>

        <div className="border-t border-base-200/70" />

        {/* Add Members */}
        {isAdmin && (
          <div className="space-y-2">
            {!adding ? (
              <button
                className="btn btn-ghost btn-sm gap-2 text-primary hover:bg-primary/10 rounded-xl"
                onClick={() => setAdding(true)}
              >
                <UserPlus className="size-4" /> Add members
              </button>
            ) : (
              <div className="space-y-2 bg-base-200/50 p-3 rounded-xl border border-base-200">
                <div className="max-h-44 overflow-y-auto space-y-1">
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
                        className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg hover:bg-base-100 text-left transition-colors"
                      >
                        <img
                          src={avatarSrc(u.avatar)}
                          alt=""
                          className="size-8 rounded-full object-cover"
                        />
                        <span className="flex-1 truncate text-sm font-medium">
                          {u.fullName}
                        </span>
                        <span
                          className={`size-5 rounded-full border flex items-center justify-center transition-all ${
                            on
                              ? "bg-primary border-primary text-primary-content"
                              : "border-base-content/30"
                          }`}
                        >
                          {on && <Check className="size-3" />}
                        </span>
                      </button>
                    );
                  })}
                  {addable.length === 0 && (
                    <p className="text-xs text-base-content/50 py-3 text-center">
                      No one left to add
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-base-200">
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

        {/* Group Permissions */}
        {isAdmin && (
          <div className="space-y-2 rounded-xl border border-base-200 bg-base-200/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Pin className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold truncate">Who can pin messages</h5>
                  <p className="text-[11px] text-base-content/60 truncate">
                    Control group message pin permissions
                  </p>
                </div>
              </div>
              <select
                className="select select-bordered select-xs rounded-lg shrink-0"
                value={group.whoCanPin || "all"}
                disabled={busy}
                onChange={async (e) => {
                  const val = e.target.value;
                  await run(() => updateGroup(group.id, { whoCanPin: val }));
                }}
              >
                <option value="all">All members</option>
                <option value="admins">Only admins</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-base-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <AtSign className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold truncate">Who can mention @all</h5>
                  <p className="text-[11px] text-base-content/60 truncate">
                    Control who can notify all members with @all
                  </p>
                </div>
              </div>
              <select
                className="select select-bordered select-xs rounded-lg shrink-0"
                value={group.mentionAllPermission || "everyone"}
                disabled={busy}
                onChange={async (e) => {
                  const val = e.target.value;
                  await run(() => updateGroup(group.id, { mentionAllPermission: val }));
                }}
              >
                <option value="everyone">All members</option>
                <option value="admins_only">Only admins</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-1">
          <h5 className="text-xs font-bold uppercase tracking-wider text-base-content/60 px-1">
            Group members ({members.length})
          </h5>
          <ul className="space-y-1 max-h-56 overflow-y-auto overscroll-contain pr-1">
            {members.map((m) => {
              const online = onlineIds.includes(String(m.id));
              const isGroupOwner = sameId(m.id, group.owner);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-base-200/50 transition-colors"
                >
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc(m.avatar)}
                      alt=""
                      className="size-9 rounded-full object-cover"
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full ring-2 ring-base-100" />
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
                      className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
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
      </ModalBody>

      <ModalFooter>
        {confirm ? (
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-xs font-semibold text-error truncate">{confirmText}</p>
            <div className="flex gap-2 shrink-0">
              <SecondaryButton
                size="sm"
                onClick={() => setConfirm(null)}
                disabled={busy}
              >
                Cancel
              </SecondaryButton>
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={doConfirm}
                disabled={busy}
              >
                Confirm
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error gap-1.5 hover:bg-error/10"
              onClick={() => setConfirm("leave")}
            >
              <LogOut className="size-4" /> Leave group
            </button>
            {isOwner && (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error gap-1.5 hover:bg-error/10"
                onClick={() => setConfirm("delete")}
              >
                <Trash2 className="size-4" /> Delete group
              </button>
            )}
          </div>
        )}
      </ModalFooter>
    </ModalLayout>
  );
};

export default GroupInfoModal;
