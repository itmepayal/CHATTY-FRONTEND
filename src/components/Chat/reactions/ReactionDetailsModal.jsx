import React, { useEffect, useState } from "react";
import { X, Users, Loader2 } from "lucide-react";
import { axiosInstance } from "../../../lib/axios.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

const ReactionDetailsModal = ({
  messageId,
  isGroup = false,
  groupId = null,
  initialEmoji = null,
  onClose,
}) => {
  const { authUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ total: 0, summary: [] });
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const url = isGroup
          ? `/groups/${groupId}/messages/${messageId}/reactions`
          : `/messages/${messageId}/reactions`;
        const res = await axiosInstance.get(url);
        if (isMounted && res.data?.success && res.data.data) {
          const d = res.data.data;
          const s = d.reactionSummary || {
            total: d.total || 0,
            summary: d.summary || [],
          };
          setDetails(s);
          if (
            initialEmoji &&
            s.summary?.some((item) => item.emoji === initialEmoji)
          ) {
            setActiveTab(initialEmoji);
          }
        }
      } catch (err) {
        console.error("[ReactionDetails] fetch failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [messageId, isGroup, groupId, initialEmoji]);

  let displayedUsers = [];
  if (activeTab === "all") {
    displayedUsers = (details.summary || []).flatMap((s) =>
      (s.users || []).map((u) => ({ ...u, emoji: s.emoji })),
    );
  } else {
    const current = (details.summary || []).find((s) => s.emoji === activeTab);
    displayedUsers = (current?.users || []).map((u) => ({
      ...u,
      emoji: current.emoji,
    }));
  }

  const currentUid = String(authUser?._id || authUser?.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              Reactions ({details.total || 0})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-base-200 overflow-x-auto bg-base-100/80 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
              activeTab === "all"
                ? "bg-primary text-primary-content shadow-sm"
                : "bg-base-200/60 hover:bg-base-200 text-base-content/70"
            }`}
          >
            All {details.total > 0 && `(${details.total})`}
          </button>
          {(details.summary || []).map(({ emoji, count }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setActiveTab(emoji)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                activeTab === emoji
                  ? "bg-primary text-primary-content shadow-sm"
                  : "bg-base-200/60 hover:bg-base-200 text-base-content/70"
              }`}
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/50 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading reactions...</span>
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-base-content/50">
              No reactions yet.
            </div>
          ) : (
            displayedUsers.map((user, idx) => {
              const isMe = String(user.id) === currentUid;
              return (
                <div
                  key={`${user.id}-${user.emoji}-${idx}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="avatar placeholder">
                      <div className="w-8 h-8 rounded-full bg-base-300 ring-1 ring-base-300 overflow-hidden">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.fullName}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-base-content/70 uppercase">
                            {user.fullName ? user.fullName[0] : "U"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-base-content truncate">
                        {user.fullName || "User"}{" "}
                        {isMe && (
                          <span className="text-primary font-bold">(You)</span>
                        )}
                      </div>
                      {user.username && (
                        <div className="text-[10px] text-base-content/50 truncate">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-base select-none shrink-0 ml-2">
                    {user.emoji}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionDetailsModal;
