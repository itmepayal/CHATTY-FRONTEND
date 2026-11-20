import React, { useEffect, useRef } from "react";
import { AtSign, Shield, User } from "lucide-react";

const getAvatar = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

export const MentionDropdown = ({
  members = [],
  query = "",
  activeIndex = 0,
  onSelect,
  onClose,
  currentUserId = "",
  onlineSet = new Set(),
}) => {
  const listRef = useRef(null);

  // Filter members: exclude self, match fullName or username
  const cleanQuery = (query || "").trim().toLowerCase();
  const filtered = members.filter((m) => {
    const id = String(m.id || m._id || m.userId);
    if (currentUserId && id === String(currentUserId)) return false;
    if (!cleanQuery) return true;
    const nameMatch = (m.fullName || "").toLowerCase().includes(cleanQuery);
    const userMatch = (m.username || "").toLowerCase().includes(cleanQuery);
    return nameMatch || userMatch;
  });

  // Keep active index inside bounds
  const safeIndex =
    filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0;

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[safeIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [safeIndex]);

  return (
    <div
      className="absolute bottom-full left-0 mb-2 z-50 w-72 sm:w-84 max-h-64 rounded-2xl border border-base-300 bg-base-100 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-base-300 bg-base-200/60 select-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-base-content/80">
          <AtSign className="size-3.5 text-primary" />
          <span>Mention member</span>
        </div>
        <span className="text-[10px] text-base-content/50">
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
        </span>
      </div>

      {/* Member List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain p-1.5 space-y-0.5 max-h-52 [scrollbar-gutter:stable]"
      >
        {filtered.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-base-content/50">
            No matching members found
          </div>
        ) : (
          filtered.map((member, i) => {
            const id = String(member.id || member._id || member.userId);
            const isOnline = onlineSet?.has?.(id);
            const isSelected = i === safeIndex;
            const avatarSrc = getAvatar(member.avatar);

            return (
              <button
                key={id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents blur on textarea
                  onSelect(member);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-base-200 text-base-content"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={avatarSrc}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/avatar.png";
                    }}
                    className="size-7 rounded-full object-cover ring-1 ring-base-300"
                  />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success ring-1 ring-base-100" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold">
                      {member.fullName}
                    </span>
                    {member.role === "admin" && (
                      <span className="badge badge-xs badge-neutral text-[9px] px-1 py-0 h-3.5">
                        Admin
                      </span>
                    )}
                  </div>
                  {member.username && (
                    <span className="block truncate text-[11px] text-base-content/50">
                      @{member.username}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MentionDropdown;
