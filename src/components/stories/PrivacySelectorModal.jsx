import { useState, useMemo } from "react";
import { X, Search, Check, Users } from "lucide-react";
import { useContactStore } from "../../store/useContactStore.js";

const DEFAULT_AVATAR = "/avatar.png";

export const PrivacySelectorModal = ({
  open,
  title = "Select Contacts",
  description = "Choose which contacts can see this story",
  initialSelected = [],
  onConfirm,
  onClose,
}) => {
  const contacts = useContactStore((s) => s.contacts) || [];
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelected));
  const [query, setQuery] = useState("");

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const user = c.contactId || c.user || c;
      const fullName = (user.fullName || "").toLowerCase();
      const username = (user.username || "").toLowerCase();
      return fullName.includes(q) || username.includes(q);
    });
  }, [contacts, query]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(contacts.map((c) => String(c.contactId?._id || c.contactId || c._id)));
    setSelectedIds(all);
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  if (!open) return null;

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-md bg-base-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-base-300 max-h-[85vh] text-base-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200/80 px-5 py-4 bg-base-200/40">
          <div className="flex items-center gap-2">
            <Users className="size-4.5 text-primary drop-shadow-xs" />
            <h3 className="text-sm font-bold text-base-content">{title}</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
              {selectedIds.size} selected
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Description & Quick Actions */}
        <div className="p-3 bg-base-200/40 border-b border-base-200/80 flex items-center justify-between text-xs">
          <span className="text-base-content/70 text-[11px] truncate pr-2">
            {description}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={selectAll}
              className="text-primary hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Select All
            </button>
            <span className="text-base-content/20">•</span>
            <button
              onClick={clearAll}
              className="text-base-content/60 hover:text-base-content font-semibold text-[11px] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-base-200/80">
          <div className="flex items-center gap-2 rounded-xl bg-base-200/80 border border-base-300 px-3 py-1.5 focus-within:border-primary">
            <Search className="size-3.5 text-base-content/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-transparent text-xs text-base-content focus:outline-none placeholder:text-base-content/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-base-content/50 hover:text-base-content"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Chips */}
        {selectedArray.length > 0 && (
          <div className="p-2.5 border-b border-base-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-h-16 bg-base-200/30">
            {selectedArray.map((id) => {
              const contactObj = contacts.find(
                (c) => String(c.contactId?._id || c.contactId || c._id) === id
              );
              const user = contactObj?.contactId || contactObj?.user || contactObj;
              const name = user?.fullName?.split(" ")[0] || user?.username || "Contact";

              return (
                <div
                  key={id}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-[11px] font-semibold shrink-0"
                >
                  <span className="truncate max-w-[80px]">{name}</span>
                  <button
                    onClick={() => toggleSelect(id)}
                    className="hover:text-primary-content cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Contacts List */}
        <div className="overflow-y-auto p-3 space-y-1 grow min-h-[180px]">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1 text-center text-base-content/60">
              <Users className="size-8 stroke-[1.5] mb-1 opacity-40 text-primary" />
              <p className="text-xs font-semibold text-base-content">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const user = c.contactId || c.user || c;
              const id = String(user._id || c._id);
              const isSelected = selectedIds.has(id);
              const avatar =
                user.avatar?.url ||
                (typeof user.avatar === "string" ? user.avatar : "") ||
                user.profilePic ||
                DEFAULT_AVATAR;
              const name = user.fullName || user.username || "Friend";

              return (
                <div
                  key={id}
                  onClick={() => toggleSelect(id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-base-200/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full overflow-hidden bg-base-200 shrink-0 ring-1 ring-base-300">
                      <img
                        src={avatar}
                        alt={name}
                        className="size-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-base-content truncate">
                        {name}
                      </span>
                      {user.username && (
                        <span className="text-[10px] text-base-content/60 truncate">
                          @{user.username}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`size-5 rounded-lg flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-primary-content font-bold"
                        : "border-base-300 bg-base-200"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-base-200/80 px-5 py-3.5 bg-base-200/40">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-base-content/70 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary btn-sm px-5 font-bold shadow-md cursor-pointer"
          >
            Confirm ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySelectorModal;
