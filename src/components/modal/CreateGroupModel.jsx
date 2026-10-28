import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Loader2, Search, Users, X } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useContactStore } from "../../store/useContactStore";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

/* ---------- member row (component ke bahar, taaki har render par remount na ho) ---------- */
const UserRow = ({ user, sub, picked, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(user)}
    aria-pressed={picked}
    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
      picked ? "bg-primary/10" : "hover:bg-base-200"
    }`}
  >
    <img
      src={avatarSrc(user.avatar)}
      alt=""
      className="size-10 shrink-0 rounded-full object-cover"
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">
        {user.fullName}
      </span>
      {sub && (
        <span className="block truncate text-xs text-base-content/50">
          {sub}
        </span>
      )}
    </span>
    <span
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        picked
          ? "border-primary bg-primary text-primary-content"
          : "border-base-content/30"
      }`}
    >
      {picked && <Check className="size-3" />}
    </span>
  </button>
);

const CreateGroupModal = ({ open, onClose }) => {
  // Sirf wahi log jinhe aapne contacts me add kiya hai
  const contacts = useContactStore((s) => s.contacts);
  const contactsLoaded = useContactStore((s) => s.loaded);
  const fetchContacts = useContactStore((s) => s.fetchContacts);

  // blocked users ko hide karne ke liye (chat store me isBlocked flag hota hai)
  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const { createGroup, selectGroup } = useGroupStore();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]); // poore user objects: { id, fullName, avatar, ... }
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const fileRef = useRef(null);

  // modal khulte hi contacts ready rakho (agar sidebar ne abhi load nahi kiye)
  useEffect(() => {
    if (open && !contactsLoaded) fetchContacts();
  }, [open, contactsLoaded, fetchContacts]);

  // reset when closed
  useEffect(() => {
    if (!open) {
      setName("");
      setQuery("");
      setPicked([]);
      setFile(null);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const blockedIds = useMemo(
    () => new Set(users.filter((u) => u.isBlocked).map((u) => String(u.id))),
    [users],
  );

  const q = query.trim().toLowerCase();

  // contacts only: search by name / username / email
  const candidates = useMemo(
    () =>
      contacts
        .filter(
          (u) =>
            !blockedIds.has(String(u.id)) &&
            (!q ||
              u.fullName?.toLowerCase().includes(q) ||
              u.username?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)),
        )
        .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")),
    [contacts, blockedIds, q],
  );

  if (!open) return null;

  const isPicked = (id) => picked.some((u) => String(u.id) === String(id));

  const toggle = (user) =>
    setPicked((p) =>
      p.some((u) => String(u.id) === String(user.id))
        ? p.filter((u) => String(u.id) !== String(user.id))
        : [...p, user],
    );

  const canSubmit = name.trim().length >= 2 && picked.length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const group = await createGroup({
      name: name.trim(),
      memberIds: picked.map((u) => String(u.id)),
      avatarFile: file,
    });
    setSaving(false);
    if (group) {
      setSelectedUser(null);
      selectGroup(group);
      onClose();
    }
  };

  const emptyText = !contactsLoaded
    ? "Loading contacts…"
    : contacts.length === 0
      ? "You haven't added any contacts yet. Add contacts first, then create a group."
      : q
        ? "No contacts match your search"
        : "No contacts available";

  return createPortal(
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-md p-0">
        {/* header */}
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">New group</h3>
            <p className="text-xs text-base-content/50">
              Choose from your contacts
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* photo + name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-200 transition-colors hover:bg-base-300"
              aria-label="Choose group photo"
            >
              {preview ? (
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <Camera className="size-6 text-base-content/50" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="input input-bordered w-full"
            />
          </div>

          {/* members */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Add members</span>
              <span className="text-xs text-base-content/50">
                {picked.length} selected
              </span>
            </div>

            {/* selected chips */}
            {picked.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {picked.map((u) => (
                  <span key={u.id} className="badge badge-lg gap-1">
                    {u.fullName}
                    <button
                      type="button"
                      onClick={() => toggle(u)}
                      aria-label={`Remove ${u.fullName}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <label
              className={`input input-bordered mb-2 flex h-11 w-full items-center gap-2 rounded-xl transition-all duration-200 ${
                searchFocused
                  ? "border-primary/50 shadow-md shadow-primary/10"
                  : ""
              }`}
            >
              <Search
                className={`size-4 shrink-0 transition-colors ${
                  searchFocused ? "text-primary" : "text-base-content/50"
                }`}
              />
              <input
                type="text"
                className="min-w-0 grow bg-transparent text-base outline-none sm:text-sm"
                placeholder="Search your contacts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="grid size-6 place-items-center rounded-full text-base-content/40 hover:bg-base-300/60 hover:text-base-content"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>

            <div className="-mx-1 max-h-60 overflow-y-auto px-1">
              {candidates.length > 0 ? (
                <>
                  <p className="px-2 py-1 text-xs text-base-content/50">
                    Your contacts ({candidates.length})
                  </p>
                  {candidates.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      sub={u.username ? `@${u.username}` : u.email}
                      picked={isPicked(u.id)}
                      onToggle={toggle}
                    />
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-base-content/50">
                  {!contactsLoaded ? (
                    <Loader2 className="size-6 animate-spin text-base-content/30" />
                  ) : (
                    <Users className="size-6 text-base-content/20" />
                  )}
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 border-t border-base-300 px-5 py-4">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={!canSubmit}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create group
          </button>
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !saving && onClose()}
      />
    </div>,
    document.body,
  );
};

export default CreateGroupModal;
