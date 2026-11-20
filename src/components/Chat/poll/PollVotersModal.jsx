import React from "react";
import { X, Users, CheckCircle } from "lucide-react";

const PollVotersModal = ({ poll, onClose }) => {
  if (!poll) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm">Poll Voters</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {(poll.options || []).map((opt) => (
            <div key={opt._id} className="space-y-2 border-b border-base-200 pb-3 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-base-content">{opt.text}</span>
                <span className="badge badge-sm badge-ghost text-[10px] font-bold">
                  {opt.voteCount} {opt.voteCount === 1 ? "vote" : "votes"} ({opt.percentage}%)
                </span>
              </div>

              {opt.voters && opt.voters.length > 0 ? (
                <div className="space-y-1.5 pl-2">
                  {opt.voters.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-base-300 overflow-hidden ring-1 ring-base-300 shrink-0">
                        {v.avatar ? (
                          <img src={v.avatar} alt={v.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-base-content/70">
                            {v.fullName?.[0] || "U"}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-base-content/90 font-medium truncate">
                        {v.fullName || "User"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-base-content/40 pl-2 italic">No votes yet.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PollVotersModal;
