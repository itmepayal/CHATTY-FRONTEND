import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Loader2, Search, Users, X } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
// ⚠️ apna axios instance ka sahi path/naam yahan rakho (jo useChatStore me use karte ho)
import { axiosInstance } from "../../lib/axios";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "./avatar.png";

const CreateGroupModal = ({ open, onClose }) => {
  const users = useChatStore((s) => s.users); // ab sirf related users aate hain
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const { createGroup, selectGroup } = useGroupStore();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]); // poore user objects: { id, fullName, avatar, ... }
  const [results, setResults] = useState([]); // server search se mile "other people"
  const [searching, setSearching] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // reset when closed
  useEffect(() => {
    if (!open) {
      setName("");
      setQuery("");
      setPicked([]);
      setResults([]);
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

  const q = query.trim().toLowerCase();

  const candidates = useMemo(
    () =>
      users.filter(
        (u) =>
          !u.isBlocked &&
          (!q ||
            u.fullName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)),
      ),
    [users, q],
  );

  useEffect(() => {
    if (!open || q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const t = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/users/search", { params: { q } });
        if (cancelled) return;
        const found = res.data?.data || [];
        // jo pehle se contacts me hain unhe dobara mat dikhao
        setResults(
          found.filter(
            (u) => !users.some((c) => String(c.id) === String(u.id)),
          ),
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open, users]);

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

  const UserRow = ({ u, sub }) => {
    const on = isPicked(u.id);
    return (
      <button
        type="button"
        onClick={() => toggle(u)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-base-200 text-left"
      >
        <img
          src={avatarSrc(u.avatar)}
          alt=""
          className="size-9 rounded-full object-cover"
        />
        <span className="flex-1 min-w-0">
          <span className="block truncate text-sm">{u.fullName}</span>
          {sub && (
            <span className="block truncate text-xs text-base-content/50">
              {sub}
            </span>
          )}
        </span>
        <span
          className={`size-5 rounded-full border flex items-center justify-center ${
            on
              ? "bg-primary border-primary text-primary-content"
              : "border-base-content/30"
          }`}
        >
          {on && <Check className="size-3" />}
        </span>
      </button>
    );
  };

  const nothingToShow = candidates.length === 0 && results.length === 0;

  return createPortal(
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-md p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h3 className="font-semibold text-lg">New group</h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative size-16 shrink-0 rounded-full bg-base-200 flex items-center justify-center overflow-hidden hover:bg-base-300 transition-colors"
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Add members</span>
              <span className="text-xs text-base-content/50">
                {picked.length} selected
              </span>
            </div>

            {/* selected chips */}
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
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

            <label className="input input-bordered input-sm h-10 flex items-center gap-2 mb-2">
              <Search className="size-4 text-base-content/50" />
              <input
                type="text"
                className="grow"
                placeholder="Search contacts or type full email / @username"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <Loader2 className="size-4 animate-spin" />}
            </label>

            <div className="max-h-60 overflow-y-auto -mx-1">
              {candidates.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs text-base-content/50">
                    Your contacts
                  </p>
                  {candidates.map((u) => (
                    <UserRow key={u.id} u={u} sub={u.email} />
                  ))}
                </>
              )}

              {results.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs text-base-content/50">
                    Other people
                  </p>
                  {results.map((u) => (
                    <UserRow
                      key={u.id}
                      u={u}
                      sub={u.username ? `@${u.username}` : ""}
                    />
                  ))}
                </>
              )}

              {nothingToShow && !searching && (
                <div className="flex flex-col items-center gap-2 py-8 px-4 text-center text-sm text-base-content/50">
                  <Users className="size-6 text-base-content/20" />
                  {q.length >= 3
                    ? "No one found. Check the full email or username."
                    : users.length
                      ? "No contacts found"
                      : "No contacts yet. Type a full email or @username to find someone."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-base-300">
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
