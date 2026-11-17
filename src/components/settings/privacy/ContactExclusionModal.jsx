import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Ban, Users, Loader2 } from "lucide-react";
import { useContactStore } from "../../../store/useContactStore";

function ContactAvatar({ contact }) {
  const [failed, setFailed] = useState(false);
  const rawAvatar =
    typeof contact.avatar === "string" ? contact.avatar : contact.avatar?.url;
  const avatarUrl = typeof rawAvatar === "string" ? rawAvatar.trim() : "";
  const initial = (contact.fullName || contact.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="relative size-10 shrink-0 rounded-full overflow-hidden bg-base-300 flex items-center justify-center border border-base-300">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={contact.fullName || "User"}
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

export default function ContactExclusionModal({
  isOpen,
  onClose,
  title = "My contacts except...",
  description = "Selected contacts won't be able to see this information.",
  initialSelectedIds = [],
  onSave,
  mode = "exclude",
}) {
  const { contacts, loaded, fetchContacts } = useContactStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!loaded) fetchContacts();
      setSelected(new Set((initialSelectedIds || []).map(String)));
      setSearchQuery("");
    }
  }, [isOpen, initialSelectedIds, loaded, fetchContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)),
    );
  }, [contacts, searchQuery]);

  if (!isOpen) return null;

  const toggleUser = (id) => {
    const sId = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(contacts.map((c) => String(c.id ?? c._id))));
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (err) {
      console.error("Save exclusion failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const isExclude = mode === "exclude";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-base-200/80 px-5 py-4">
            <div className="min-w-0 flex-1 pr-3">
              <h3 className="font-semibold text-base sm:text-lg text-base-content tracking-tight">
                {title}
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-base-content/60 leading-relaxed">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200/60 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="p-4 border-b border-base-200/60 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-base-200/60 border border-base-300/60 text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-base-content/70 font-medium">
                {selected.size} {isExclude ? "excluded" : "included"} of{" "}
                {contacts.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={selected.size === 0 || saving}
                  className="text-base-content/60 hover:text-base-content transition-colors font-medium disabled:opacity-40"
                >
                  Clear all
                </button>
                <span className="text-base-content/30">•</span>
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={contacts.length === 0 || saving}
                  className="text-primary hover:underline transition-colors font-medium disabled:opacity-40"
                >
                  Select all
                </button>
              </div>
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-base-200/40 p-2 sm:p-3">
            {!loaded ? (
              <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
                <Loader2 className="size-6 animate-spin text-primary mb-2" />
                <span className="text-xs">Loading contacts…</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-base-content/60">
                <Users className="size-8 opacity-40 mb-2" />
                <span className="text-sm font-medium">No contacts found</span>
                <span className="text-xs text-base-content/40 mt-0.5">
                  {searchQuery
                    ? "Try a different search term"
                    : "Add contacts to customize privacy"}
                </span>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const contactId = String(contact.id ?? contact._id);
                const isSelected = selected.has(contactId);

                return (
                  <div
                    key={contactId}
                    onClick={() => toggleUser(contactId)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? isExclude
                          ? "bg-error/10 hover:bg-error/15"
                          : "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-base-200/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ContactAvatar contact={contact} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-base-content truncate">
                          {contact.fullName || contact.username}
                        </p>
                        {contact.username && (
                          <p className="text-xs text-base-content/50 truncate">
                            @{contact.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={`size-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? isExclude
                            ? "bg-error border-error text-error-content"
                            : "bg-primary border-primary text-primary-content"
                          : "border-base-300 bg-base-200/50"
                      }`}
                    >
                      {isSelected ? (
                        isExclude ? (
                          <Ban className="size-3.5 stroke-[2.5]" />
                        ) : (
                          <Check className="size-3.5 stroke-[2.5]" />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-base-200/80 px-5 py-3.5 bg-base-200/30">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-primary-content hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
