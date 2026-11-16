import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Trash2, Users } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useContactStore } from "../../store/useContactStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
} from "../chat-ui";
import { ContactSelectionList } from "./ContactSelectionList.jsx";

const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));

/**
 * CreateGroupModal
 * Dedicated modal for creating new groups with member selection and avatar upload.
 */
export const CreateGroupModal = ({ open, onClose, onOpenAddContacts }) => {
  const contacts = useContactStore((s) => s.contacts);
  const contactsLoaded = useContactStore((s) => s.loaded);
  const fetchContacts = useContactStore((s) => s.fetchContacts);

  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const { createGroup, selectGroup } = useGroupStore();
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // Load contacts when modal opens if not loaded yet
  useEffect(() => {
    if (open && !contactsLoaded) fetchContacts();
  }, [open, contactsLoaded, fetchContacts]);

  // Reset isolated state whenever modal closes
  useEffect(() => {
    if (!open) {
      setName("");
      setPicked([]);
      setFile(null);
      setSaving(false);
    }
  }, [open]);

  // Handle avatar preview URL
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onlineSet = useMemo(
    () => new Set(toIds(onlineUsers)),
    [onlineUsers],
  );

  const blockedIds = useMemo(
    () => new Set(users.filter((u) => u.isBlocked).map((u) => String(u.id ?? u._id))),
    [users],
  );

  // Filter out blocked contacts or those who disallowed group invites
  const availableContacts = useMemo(() => {
    return contacts.filter(
      (u) =>
        !blockedIds.has(String(u.id ?? u._id)) &&
        u.canAddToGroup !== false,
    );
  }, [contacts, blockedIds]);

  const toggleMember = (user) => {
    const id = String(user.id ?? user._id);
    setPicked((prev) =>
      prev.some((u) => String(u.id ?? u._id) === id)
        ? prev.filter((u) => String(u.id ?? u._id) !== id)
        : [...prev, user],
    );
  };

  const removeMember = (user) => {
    const id = String(user.id ?? user._id);
    setPicked((prev) => prev.filter((u) => String(u.id ?? u._id) !== id));
  };

  const isNameValid = name.trim().length >= 2;
  const hasMembers = picked.length > 0;
  const canSubmit = isNameValid && hasMembers && !saving;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        memberIds: picked.map((u) => String(u.id ?? u._id)),
        avatarFile: file,
      });
      if (group) {
        setSelectedUser(null);
        selectGroup(group);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalLayout
      open={open}
      onClose={onClose}
      preventClose={saving}
      size="md"
      aria-labelledby="create-group-modal-title"
    >
      <ModalHeader
        id="create-group-modal-title"
        icon={Users}
        title="New group"
        subtitle="Create a conversation and invite your contacts"
        onClose={saving ? undefined : onClose}
      />

      <ModalBody className="space-y-4">
        {/* Photo + Group Name input */}
        <div className="flex items-center gap-3.5 pt-1">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative flex size-14 sm:size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-200 ring-2 ring-base-300 transition-all hover:ring-primary focus-visible:outline-2 focus-visible:outline-primary shadow-xs"
              aria-label="Upload group profile picture"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Group preview"
                  className="size-full object-cover"
                />
              ) : (
                <Camera className="size-5 sm:size-6 text-base-content/50 group-hover:text-primary transition-colors" />
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-semibold">
                {preview ? "Change" : "Photo"}
              </span>
            </button>

            {preview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                aria-label="Remove photo"
                className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-error text-error-content shadow-xs hover:scale-110 transition-transform"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <div className="flex-1 min-w-0 space-y-1">
            <label htmlFor="group-name-input" className="sr-only">
              Group name
            </label>
            <input
              id="group-name-input"
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name (required)"
              className="input input-bordered w-full h-10 sm:h-11 rounded-xl focus:border-primary text-sm font-medium placeholder:text-base-content/40"
              autoComplete="off"
            />
            <div className="flex items-center justify-between px-1 text-[11px] text-base-content/50">
              <span>Min 2 characters</span>
              <span>{name.length}/50</span>
            </div>
          </div>
        </div>

        {/* Member selection section */}
        <ContactSelectionList
          contacts={availableContacts}
          contactsLoaded={contactsLoaded}
          picked={picked}
          onToggle={toggleMember}
          onRemove={removeMember}
          onlineSet={onlineSet}
          onOpenAddContacts={onOpenAddContacts}
        />
      </ModalBody>

      <ModalFooter>
        <SecondaryButton size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={saving}
          loadingText="Creating group…"
        >
          Create group
        </PrimaryButton>
      </ModalFooter>
    </ModalLayout>
  );
};

export default CreateGroupModal;
