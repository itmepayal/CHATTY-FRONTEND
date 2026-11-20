import React, { useState } from "react";
import { Smile, Plus } from "lucide-react";
import ReactionDetailsModal from "./ReactionDetailsModal";

const ReactionChips = ({
  message,
  currentUserId,
  onToggleReaction,
  isGroup = false,
  groupId = null,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [initialEmoji, setInitialEmoji] = useState(null);

  const reactions = message.reactions || [];
  if (!reactions.length) return null;

  // Aggregate counts by emoji
  const map = new Map();
  reactions.forEach((r) => {
    const e = r.emoji;
    if (!map.has(e)) {
      map.set(e, {
        emoji: e,
        count: 0,
        hasMyReaction: false,
      });
    }
    const item = map.get(e);
    item.count++;
    const uid = String(r.userId?._id || r.userId);
    if (String(currentUserId) === uid) {
      item.hasMyReaction = true;
    }
  });

  const summary = Array.from(map.values()).sort((a, b) => b.count - a.count);

  const handleChipClick = (emoji, e) => {
    e.stopPropagation();
    onToggleReaction(message.id || message._id, emoji);
  };

  const handleOpenDetails = (emoji, e) => {
    e.stopPropagation();
    setInitialEmoji(emoji);
    setShowDetails(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 select-none">
        {summary.map(({ emoji, count, hasMyReaction }) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => handleChipClick(emoji, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleOpenDetails(emoji, e);
            }}
            title={hasMyReaction ? `You reacted with ${emoji} (click to remove)` : `Click to react with ${emoji}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-150 border ${
              hasMyReaction
                ? "bg-primary/20 border-primary text-primary font-semibold shadow-sm"
                : "bg-base-200/80 hover:bg-base-200 border-base-300 text-base-content/80 hover:border-base-content/30"
            }`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="text-[11px] font-medium leading-none">{count}</span>
          </button>
        ))}

        {summary.length > 0 && (
          <button
            type="button"
            onClick={(e) => handleOpenDetails(null, e)}
            title="View all reactions"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-base-200/60 hover:bg-base-200 text-base-content/60 hover:text-base-content text-[11px] border border-base-300/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {showDetails && (
        <ReactionDetailsModal
          messageId={message.id || message._id}
          isGroup={isGroup}
          groupId={groupId}
          initialEmoji={initialEmoji}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
};

export default ReactionChips;
