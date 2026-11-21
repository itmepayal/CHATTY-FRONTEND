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
      <div className="relative w-full max-w-md bg-[#101827] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 max-h-[85vh] text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#0B1120]/60">
          <div className="flex items-center gap-2">
            <Users className="size-4.5 text-[#22C7F2] drop-shadow-[0_0_8px_rgba(34,199,242,0.5)]" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">{title}</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#22C7F2]/15 text-[#22C7F2] border border-[#22C7F2]/30 text-xs font-bold">
              {selectedIds.size} selected
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Description & Quick Actions */}
        <div className="p-3 bg-[#0B1120]/40 border-b border-white/10 flex items-center justify-between text-xs">
          <span className="text-[#94A3B8] text-[11px] truncate pr-2">
            {description}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={selectAll}
              className="text-[#22C7F2] hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Select All
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={clearAll}
              className="text-[#94A3B8] hover:text-[#F8FAFC] font-semibold text-[11px] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 rounded-xl bg-[#151F30] border border-white/10 px-3 py-1.5 focus-within:border-[#22C7F2]">
            <Search className="size-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-transparent text-xs text-[#F8FAFC] focus:outline-none placeholder:text-[#94A3B8]/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Chips */}
        {selectedArray.length > 0 && (
          <div className="p-2.5 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-h-16 bg-[#0B1120]/40">
            {selectedArray.map((id) => {
              const contactObj = contacts.find(
                (c) => String(c.contactId?._id || c.contactId || c._id) === id
              );
              const user = contactObj?.contactId || contactObj?.user || contactObj;
              const name = user?.fullName?.split(" ")[0] || user?.username || "Contact";

              return (
                <div
                  key={id}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22C7F2]/15 text-[#22C7F2] border border-[#22C7F2]/30 text-[11px] font-semibold shrink-0"
                >
                  <span className="truncate max-w-[80px]">{name}</span>
                  <button
                    onClick={() => toggleSelect(id)}
                    className="hover:text-white cursor-pointer"
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
            <div className="flex flex-col items-center justify-center py-10 gap-1 text-center text-[#94A3B8]">
              <Users className="size-8 stroke-[1.5] mb-1 opacity-40 text-[#22C7F2]" />
              <p className="text-xs font-semibold text-[#F8FAFC]">No contacts found</p>
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
                    isSelected ? "bg-[#22C7F2]/15 border border-[#22C7F2]/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full overflow-hidden bg-[#151F30] shrink-0 ring-1 ring-white/10">
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
                      <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                        {name}
                      </span>
                      {user.username && (
                        <span className="text-[10px] text-[#94A3B8] truncate">
                          @{user.username}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`size-5 rounded-lg flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-[#22C7F2] border-[#22C7F2] text-slate-950 font-bold"
                        : "border-white/20 bg-[#151F30]"
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
        <div className="flex items-center justify-end gap-2.5 border-t border-white/10 px-5 py-3.5 bg-[#0B1120]/60">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(34,199,242,0.35)] transition-all cursor-pointer"
          >
            Confirm ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySelectorModal;
