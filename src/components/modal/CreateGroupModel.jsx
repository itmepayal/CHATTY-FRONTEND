import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Loader2, Search, Users, X } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useContactStore } from "../../store/useContactStore";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
} from "../chat-ui";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const UserRow = ({ user, sub, picked, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(user)}
    aria-pressed={picked}
    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
      picked ? "bg-primary/10 border border-primary/20" : "hover:bg-base-200/80"
    }`}
  >
    <img
      src={avatarSrc(user.avatar)}
      alt=""
      className="size-10 shrink-0 rounded-full object-cover ring-1 ring-base-content/10 shadow-xs"
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-base-content/90">
        {user.fullName}
      </span>
      {sub && (
        <span className="block truncate text-xs text-base-content/55">
          {sub}
        </span>
      )}
    </span>
    <span
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
        picked
          ? "border-primary bg-primary text-primary-content shadow-xs scale-105"
          : "border-base-content/30"
      }`}
    >
      {picked && <Check className="size-3 stroke-[3]" />}
    </span>
  </button>
);

const CreateGroupModal = ({ open, onClose }) => {
  const contacts = useContactStore((s) => s.contacts);
  const contactsLoaded = useContactStore((s) => s.loaded);
  const fetchContacts = useContactStore((s) => s.fetchContacts);

  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const { createGroup, selectGroup } = useGroupStore();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && !contactsLoaded) fetchContacts();
  }, [open, contactsLoaded, fetchContacts]);

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

  const blockedIds = useMemo(
    () => new Set(users.filter((u) => u.isBlocked).map((u) => String(u.id))),
    [users],
  );

  const q = query.trim().toLowerCase();

  const candidates = useMemo(
    () =>
      contacts
        .filter(
          (u) =>
            !blockedIds.has(String(u.id)) &&
            u.canAddToGroup !== false &&
            (!q ||
              u.fullName?.toLowerCase().includes(q) ||
              u.username?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)),
        )
        .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")),
    [contacts, blockedIds, q],
  );

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

  return (
    <ModalLayout
      open={open}
      onClose={onClose}
      preventClose={saving}
      size="md"
      aria-labelledby="create-group-title"
    >
      <ModalHeader
        id="create-group-title"
        icon={Users}
        title="New group"
        subtitle="Choose from your contacts"
        onClose={saving ? undefined : onClose}
      />

      <ModalBody className="space-y-4">
        {/* Photo + Name */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-200 ring-2 ring-base-300 transition-all hover:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-xs"
            aria-label="Choose group photo"
          >
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <Camera className="size-6 text-base-content/50 group-hover:text-primary transition-colors" />
            )}
            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
              Edit
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="input input-bordered w-full h-12 rounded-xl focus:border-primary text-sm sm:text-base font-medium"
            />
          </div>
        </div>

        {/* Member Selection Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-base-content/70">
            <span>Add members</span>
            <span className="text-primary font-bold">
              {picked.length} selected
            </span>
          </div>

          {/* Selected Member Chips */}
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-base-200/50 rounded-xl border border-base-200/80 max-h-24 overflow-y-auto">
              {picked.map((u) => (
                <span
                  key={u.id}
                  className="badge badge-lg gap-1.5 bg-base-100 border-base-300 py-3 shadow-2xs font-medium text-xs"
                >
                  <img
                    src={avatarSrc(u.avatar)}
                    alt=""
                    className="size-4.5 rounded-full object-cover"
                  />
                  <span className="truncate max-w-[120px]">{u.fullName}</span>
                  <button
                    type="button"
                    onClick={() => toggle(u)}
                    aria-label={`Remove ${u.fullName}`}
                    className="hover:text-error transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div
            className={`flex h-11 w-full items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-3 transition-all duration-150 ${
              searchFocused
                ? "border-primary/60 ring-2 ring-primary/10 shadow-xs"
                : "hover:border-base-content/30"
            }`}
          >
            <Search
              className={`size-4 shrink-0 transition-colors ${
                searchFocused ? "text-primary" : "text-base-content/50"
              }`}
            />
            <input
              type="text"
              className="min-w-0 grow bg-transparent text-sm outline-none placeholder:text-base-content/45"
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
                className="grid size-6 place-items-center rounded-full text-base-content/40 hover:bg-base-200 hover:text-base-content"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Member List */}
          <div className="max-h-56 overflow-y-auto overscroll-contain space-y-1 pr-1">
            {candidates.length > 0 ? (
              candidates.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  sub={u.username ? `@${u.username}` : u.email}
                  picked={isPicked(u.id)}
                  onToggle={toggle}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-base-content/50">
                {!contactsLoaded ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <Users className="size-6 text-base-content/30" />
                )}
                <p className="text-xs max-w-xs">{emptyText}</p>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <SecondaryButton
          size="sm"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton
          size="sm"
          onClick={submit}
          disabled={!canSubmit}
          loading={saving}
          loadingText="Creating..."
        >
          Create group
        </PrimaryButton>
      </ModalFooter>
    </ModalLayout>
  );
};

export default CreateGroupModal;
