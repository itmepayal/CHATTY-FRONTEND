import { useMemo, useState } from "react";
import { Check, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { SelectedMembers } from "./SelectedMembers.jsx";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const ContactRow = ({ user, sub, picked, isOnline, onToggle }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={picked}
    onClick={() => onToggle(user)}
    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors min-h-[44px] ${
      picked
        ? "bg-primary/10 border border-primary/25 shadow-2xs"
        : "hover:bg-base-200/80 border border-transparent"
    }`}
  >
    <div className="relative shrink-0">
      <img
        src={avatarSrc(user.avatar)}
        alt=""
        className="size-9 sm:size-10 rounded-full object-cover ring-1 ring-base-content/10 shadow-xs"
      />
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100"
          title="Online"
        />
      )}
    </div>

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

/**
 * ContactSelectionList
 * Searchable contact list with multiple member selection for group creation.
 */
export const ContactSelectionList = ({
  contacts = [],
  contactsLoaded = true,
  picked = [],
  onToggle,
  onRemove,
  onlineSet = new Set(),
  onOpenAddContacts,
}) => {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const q = query.trim().toLowerCase();

  const candidates = useMemo(() => {
    return contacts
      .filter((u) => {
        if (!q) return true;
        return (
          u.fullName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [contacts, q]);

  const isPicked = (id) => picked.some((u) => String(u.id ?? u._id) === String(id));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-base-content/70 px-0.5">
        <span>Select group members</span>
        <span
          className={
            picked.length > 0
              ? "text-primary font-bold"
              : "text-base-content/45 font-medium"
          }
        >
          {picked.length} {picked.length === 1 ? "member" : "members"} selected
        </span>
      </div>

      {/* Selected Member Chips */}
      <SelectedMembers members={picked} onRemove={onRemove} />

      {/* Search Input */}
      <div
        className={`flex h-10 sm:h-11 w-full items-center gap-2.5 rounded-xl border border-base-300 bg-base-100 px-3 transition-all duration-150 ${
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
          placeholder="Search contacts by name or username"
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
            className="grid size-6 place-items-center rounded-full text-base-content/40 hover:bg-base-200 hover:text-base-content transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Scrollable Member List */}
      <div className="h-56 sm:h-64 max-h-[38dvh] overflow-y-auto overscroll-contain rounded-2xl border border-base-300/60 bg-base-200/30 p-1.5 space-y-1">
        {!contactsLoaded ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-base-content/50">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs">Loading contacts…</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-10 px-4 text-center text-sm text-base-content/60">
            <Users className="size-7 text-base-content/30" />
            <p className="text-xs max-w-xs font-medium">
              You haven't added any contacts yet. Add contacts first to invite them to a group.
            </p>
            {onOpenAddContacts && (
              <button
                type="button"
                onClick={onOpenAddContacts}
                className="btn btn-primary btn-xs gap-1.5 rounded-lg mt-1"
              >
                <UserPlus className="size-3.5" />
                Add contacts
              </button>
            )}
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-base-content/50">
            <Search className="size-6 text-base-content/30" />
            <p className="text-xs">No contacts match "{query}"</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-primary font-medium hover:underline mt-1"
            >
              Clear search
            </button>
          </div>
        ) : (
          candidates.map((u) => {
            const id = String(u.id ?? u._id);
            return (
              <ContactRow
                key={id}
                user={u}
                sub={u.username ? `@${u.username}` : u.email}
                picked={isPicked(id)}
                isOnline={onlineSet.has(id)}
                onToggle={onToggle}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactSelectionList;
