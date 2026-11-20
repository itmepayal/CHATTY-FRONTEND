import React, { useState, useMemo } from "react";
import {
  BarChart2,
  Check,
  Lock,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import { customToast as toast } from "../../toast/customToastService.js";
import PollVotersModal from "./PollVotersModal.jsx";

const PollCard = ({
  message,
  currentUserId,
  onVote,
  onClosePoll,
  isGroup = false,
  groupId = null,
}) => {
  const [showVoters, setShowVoters] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const poll = message?.poll;
  if (!poll || !poll.question) return null;

  const isClosed =
    Boolean(poll.isClosed || poll.isEnded) ||
    Boolean(poll.expiresAt && new Date(poll.expiresAt) <= new Date());

  const creatorId =
    poll.createdBy ||
    message.senderId?._id ||
    message.senderId?.id ||
    message.senderId;

  const isCreator =
    String(creatorId) === String(currentUserId) ||
    String(message.sender?._id || message.sender?.id) === String(currentUserId);

  const allowMultiple = Boolean(
    poll.allowMultipleAnswers || poll.type === "multiple",
  );

  // Helper to determine if current user has voted on an option
  const checkHasVoted = (opt) => {
    if (opt.hasVoted !== undefined) return Boolean(opt.hasVoted);
    if (Array.isArray(opt.votes) && currentUserId) {
      return opt.votes.some((v) => {
        const vId = typeof v === "object" && v !== null ? (v._id || v.id) : v;
        return String(vId) === String(currentUserId);
      });
    }
    return false;
  };

  // Calculate unique voters count and total selections
  const { totalUniqueVoters, totalSelections } = useMemo(() => {
    const voterSet = new Set();
    let selections = 0;
    (poll.options || []).forEach((opt) => {
      const votesArr = Array.isArray(opt.votes) ? opt.votes : [];
      const count = votesArr.length || opt.voteCount || 0;
      selections += count;
      votesArr.forEach((v) => {
        const vId = typeof v === "object" && v !== null ? (v._id || v.id) : v;
        if (vId) voterSet.add(String(vId));
      });
    });
    return {
      totalUniqueVoters: poll.totalVoters !== undefined ? poll.totalVoters : voterSet.size,
      totalSelections: poll.totalVotes !== undefined ? poll.totalVotes : selections,
    };
  }, [poll]);

  // Handle option click (single-choice or multiple-choice)
  const handleOptionClick = async (optionId) => {
    if (isClosed || isVoting) return;

    const currentVotedIds = (poll.options || [])
      .filter((o) => checkHasVoted(o))
      .map((o) => String(o._id || o.id || o.text));

    const clickedIdStr = String(optionId);
    let targetOptions = [];

    if (allowMultiple) {
      if (currentVotedIds.includes(clickedIdStr)) {
        targetOptions = currentVotedIds.filter((id) => id !== clickedIdStr);
      } else {
        targetOptions = [...currentVotedIds, clickedIdStr];
      }
    } else {
      if (currentVotedIds.includes(clickedIdStr)) {
        if (poll.canChangeVote) {
          targetOptions = [];
        } else {
          return;
        }
      } else {
        targetOptions = [clickedIdStr];
      }
    }

    setIsVoting(true);
    try {
      if (typeof onVote === "function") {
        if (onVote.length === 1) {
          await onVote(targetOptions);
        } else {
          await onVote(
            message.id || message._id,
            targetOptions,
            isGroup,
            groupId,
          );
        }
      }
    } catch (err) {
      console.error("[PollCard] Vote failed:", err);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle End Poll
  const handleEndPoll = async () => {
    if (isClosed || isClosing) return;
    setIsClosing(true);
    try {
      if (typeof onClosePoll === "function") {
        if (onClosePoll.length === 0) {
          await onClosePoll();
        } else {
          await onClosePoll(message.id || message._id, isGroup, groupId);
        }
      }
      setConfirmEnd(false);
    } catch (err) {
      console.error("[PollCard] End poll failed:", err);
    } finally {
      setIsClosing(false);
    }
  };

  const endedTime = poll.endedAt || poll.closedAt;
  const formattedEndedDate = endedTime
    ? new Date(endedTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="w-full max-w-sm rounded-2xl bg-base-100/95 text-base-content border border-base-300 shadow-lg p-4 space-y-3.5 my-1.5 select-none transition-all">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <BarChart2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              {allowMultiple ? "Multiple Choice" : "Single Choice"}
            </span>
            {isClosed ? (
              <span className="badge badge-warning badge-xs text-[10px] font-bold py-0.5 px-1.5">
                Ended {formattedEndedDate ? `• ${formattedEndedDate}` : ""}
              </span>
            ) : (
              <span className="badge badge-success badge-xs text-[10px] font-bold py-0.5 px-1.5">
                Live
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-base-content leading-snug mt-1 break-words">
            {poll.question}
          </h4>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {(poll.options || []).map((opt) => {
          const optId = String(opt._id || opt.id || opt.text);
          const isSelected = checkHasVoted(opt);
          const votesArr = Array.isArray(opt.votes) ? opt.votes : [];
          const optVotes = votesArr.length || opt.voteCount || 0;

          // Safe percentage calculation
          const denominator = allowMultiple
            ? totalUniqueVoters || totalSelections
            : totalUniqueVoters || totalSelections;
          const percentage =
            denominator > 0 ? Math.round((optVotes / denominator) * 100) : 0;

          return (
            <div
              key={optId}
              onClick={() => handleOptionClick(optId)}
              className={`relative overflow-hidden rounded-xl border p-2.5 transition-all duration-200 ${
                isClosed
                  ? "cursor-default opacity-90"
                  : isVoting
                    ? "cursor-wait opacity-80"
                    : "cursor-pointer active:scale-[0.99]"
              } ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                  : "border-base-300 hover:border-base-content/25 bg-base-200/50 hover:bg-base-200/80"
              }`}
            >
              {/* Progress bar fill */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none ${
                  isSelected ? "bg-primary/25" : "bg-base-300/40"
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Radio / Checkbox Selector */}
                  <div
                    className={`flex items-center justify-center shrink-0 transition-all ${
                      allowMultiple
                        ? "w-4 h-4 rounded-md"
                        : "w-4 h-4 rounded-full"
                    } border ${
                      isSelected
                        ? "bg-primary border-primary text-primary-content"
                        : "border-base-content/40 bg-base-100"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>

                  <span
                    className={`font-medium truncate ${
                      isSelected ? "text-primary font-bold" : "text-base-content"
                    }`}
                  >
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-base-content/80">
                  <span>{percentage}%</span>
                  <span className="text-base-content/40 font-normal">
                    ({optVotes})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation before Ending Poll */}
      {confirmEnd && !isClosed && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-2.5 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-error">
            <AlertTriangle className="size-4 shrink-0" />
            <span>End this poll for everyone?</span>
          </div>
          <p className="text-[11px] text-base-content/70">
            No one will be able to cast or change votes after ending.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setConfirmEnd(false)}
              disabled={isClosing}
              className="btn btn-ghost btn-xs rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEndPoll}
              disabled={isClosing}
              className="btn btn-error btn-xs rounded-lg gap-1"
            >
              {isClosing && <Loader2 className="size-3 animate-spin" />}
              End Poll
            </button>
          </div>
        </div>
      )}

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between pt-1.5 text-[11px] text-base-content/60 border-t border-base-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {totalUniqueVoters}{" "}
            {totalUniqueVoters === 1 ? "voter" : "voters"}
            {allowMultiple && totalSelections !== totalUniqueVoters
              ? ` (${totalSelections} votes)`
              : ""}
          </span>
          {poll.isAnonymous && (
            <span className="badge badge-xs badge-ghost text-[10px] gap-1 py-0.5 font-medium">
              <Lock className="w-2.5 h-2.5" /> Anonymous
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {!poll.isAnonymous && totalSelections > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVoters(true);
              }}
              className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px]"
            >
              <Eye className="w-3 h-3" /> Voters
            </button>
          )}

          {!isClosed && isCreator && !confirmEnd && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmEnd(true);
              }}
              className="text-error/80 hover:text-error hover:underline font-medium text-[11px]"
            >
              End Poll
            </button>
          )}
        </div>
      </div>

      {showVoters && (
        <PollVotersModal poll={poll} onClose={() => setShowVoters(false)} />
      )}
    </div>
  );
};

export default PollCard;
