import React, { useEffect, useRef, useMemo } from "react";
import { Users, Bell, AtSign, Shield } from "lucide-react";

const getAvatar = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

export const MentionDropdown = ({
  members = [],
  query = "",
  activeIndex = 0,
  onSelect,
  onClose,
  currentUserId = "",
  onlineSet = new Set(),
  canMentionAll = true,
}) => {
  const listRef = useRef(null);

  const cleanQuery = (query || "").trim().toLowerCase();

  // 1. Check if @all should be suggested
  const showMentionAll = useMemo(() => {
    if (!canMentionAll) return false;
    if (!cleanQuery) return true;
    return "all".startsWith(cleanQuery);
  }, [canMentionAll, cleanQuery]);

  // 2. Filter individual members (excluding self, matching name or username)
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const id = String(m.id || m._id || m.userId);
      if (currentUserId && id === String(currentUserId)) return false;
      if (!cleanQuery) return true;
      const nameMatch = (m.fullName || "").toLowerCase().includes(cleanQuery);
      const userMatch = (m.username || "").toLowerCase().includes(cleanQuery);
      return nameMatch || userMatch;
    });
  }, [members, currentUserId, cleanQuery]);

  // 3. Combined items list
  const items = useMemo(() => {
    const list = [];
    if (showMentionAll) {
      list.push({
        type: "all",
        id: "__all__",
        name: "all",
        fullName: "all",
        title: "@all",
        subtitle: "Notify everyone in this group",
      });
    }
    filteredMembers.forEach((m) => {
      list.push({
        type: "user",
        ...m,
        id: String(m.id || m._id || m.userId),
      });
    });
    return list;
  }, [showMentionAll, filteredMembers]);

  // Keep active index inside bounds
  const safeIndex =
    items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;

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
      className="absolute bottom-full left-0 mb-2 z-50 w-72 sm:w-84 max-h-64 rounded-2xl border border-base-300 bg-base-100 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-base-300 bg-base-200/60">
        <div className="flex items-center gap-1.5 text-xs font-bold text-base-content/80">
          <AtSign className="size-3.5 text-primary" />
          <span>Mention member</span>
        </div>
        <span className="text-[10px] text-base-content/50">
          {items.length} {items.length === 1 ? "option" : "options"}
        </span>
      </div>

      {/* Options List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain p-1.5 space-y-0.5 max-h-52 [scrollbar-gutter:stable]"
      >
        {items.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-base-content/50">
            No matching members found
          </div>
        ) : (
          items.map((item, i) => {
            const isSelected = i === safeIndex;

            // Render special @all option
            if (item.type === "all") {
              return (
                <button
                  key="__all__"
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevents blur on textarea
                    onSelect(item);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium"
                      : "hover:bg-base-200 text-base-content"
                  }`}
                >
                  {/* Icon Avatar */}
                  <div className="relative shrink-0 size-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-400/30">
                    <Users className="size-4" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        @all
                      </span>
                      <span className="badge badge-xs badge-warning text-[9px] px-1 py-0 h-3.5 font-bold">
                        Everyone
                      </span>
                    </div>
                    <span className="block truncate text-[11px] text-base-content/60">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              );
            }

            // Render individual group member
            const isOnline = onlineSet?.has?.(item.id);
            const avatarSrc = getAvatar(item.avatar);

            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents blur on textarea
                  onSelect(item);
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
                      {item.fullName}
                    </span>
                    {item.role === "admin" && (
                      <span className="badge badge-xs badge-neutral text-[9px] px-1 py-0 h-3.5">
                        Admin
                      </span>
                    )}
                  </div>
                  {item.username && (
                    <span className="block truncate text-[11px] text-base-content/50">
                      @{item.username}
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
