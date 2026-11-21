import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const past = new Date(dateStr);
  const diffSecs = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSecs < 60) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return "Yesterday";
};

export const MyStoriesModal = () => {
  const {
    isMyStoriesOpen,
    setMyStoriesOpen,
    myStories,
    myStoriesLoading,
    fetchMyStories,
    deleteStory,
    openMyStoryViewer,
    setCreatorOpen,
    fetchStoryViewers,
  } = useStoryStore();

  const [storyToDelete, setStoryToDelete] = useState(null);

  useEffect(() => {
    if (isMyStoriesOpen) {
      fetchMyStories();
    }
  }, [isMyStoriesOpen, fetchMyStories]);

  if (!isMyStoriesOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-lg bg-[#101827] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 max-h-[85vh] text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#0B1120]/60">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-[#22C7F2] drop-shadow-[0_0_8px_rgba(34,199,242,0.5)]" />
            <h3 className="text-base font-bold text-[#F8FAFC]">My Stories</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#22C7F2]/15 text-[#22C7F2] border border-[#22C7F2]/30 text-xs font-bold">
              {myStories.length} active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMyStoriesOpen(false);
                setCreatorOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add Story</span>
            </button>
            <button
              onClick={() => setMyStoriesOpen(false)}
              className="p-1.5 rounded-full text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Stories List */}
        <div className="overflow-y-auto p-4 space-y-3 grow min-h-[220px]">
          {myStoriesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#94A3B8]">
              <Loader2 className="size-6 animate-spin text-[#22C7F2]" />
              <span className="text-xs">Loading your stories...</span>
            </div>
          ) : myStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-[#94A3B8]">
              <div className="size-16 rounded-full bg-[#151F30] border border-white/10 flex items-center justify-center text-[#22C7F2]">
                <Sparkles className="size-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">No active stories</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Share photos, videos, or status updates that disappear in 24 hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setMyStoriesOpen(false);
                  setCreatorOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22C7F2] to-[#397BFF] text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md mt-2 cursor-pointer"
              >
                Create Story
              </button>
            </div>
          ) : (
            myStories.map((story) => {
              const reactions = story.reactionCounts || {};
              const reactionEntries = Object.entries(reactions);

              return (
                <div
                  key={story._id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/10 bg-[#151F30]/60 hover:bg-[#151F30] transition-all shadow-md group"
                >
                  {/* Thumbnail Preview */}
                  <div
                    onClick={() => {
                      setMyStoriesOpen(false);
                      openMyStoryViewer(story._id);
                    }}
                    className="relative size-16 rounded-xl overflow-hidden shrink-0 cursor-pointer bg-black/50 border border-white/10 flex items-center justify-center group-hover:scale-102 transition-transform"
                  >
                    {story.mediaType === "image" && story.mediaUrl ? (
                      <img
                        src={story.mediaUrl}
                        alt="Story"
                        className="size-full object-cover"
                      />
                    ) : story.mediaType === "video" && story.mediaUrl ? (
                      <video
                        src={story.mediaUrl}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div
                        className="size-full flex items-center justify-center p-1.5 text-center text-[10px] font-bold text-white drop-shadow-xs"
                        style={{
                          background:
                            story.background?.value ||
                            "linear-gradient(135deg, #ec4899, #8b5cf6)",
                        }}
                      >
                        <span className="line-clamp-3 leading-tight">
                          {story.textContent}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="size-4 text-white drop-shadow-xs" />
                    </div>
                  </div>

                  {/* Story Info */}
                  <div
                    onClick={() => {
                      setMyStoriesOpen(false);
                      openMyStoryViewer(story._id);
                    }}
                    className="flex flex-col min-w-0 grow cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F8FAFC] capitalize">
                        {story.mediaType} story
                      </span>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                        Expires in {story.remainingFormatted || "24h"}
                      </span>
                    </div>

                    <span className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-1">
                      <Clock className="size-3 text-[#22C7F2]" />
                      Posted {formatTimeAgo(story.createdAt)}
                    </span>

                    {/* Reactions Pill List */}
                    {reactionEntries.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                        {reactionEntries.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#101827] border border-white/10 text-[10px] font-semibold text-[#F8FAFC] shadow-xs"
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Viewers & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => fetchStoryViewers(story)}
                      title="Viewers List"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101827] border border-white/10 hover:border-[#22C7F2]/50 text-xs font-semibold text-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <Eye className="size-3.5 text-[#22C7F2]" />
                      <span>{story.viewCount || 0}</span>
                    </button>

                    <button
                      onClick={() => setStoryToDelete(story)}
                      title="Delete Story"
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3.5 bg-[#0B1120]/60 flex items-center justify-between text-xs text-[#94A3B8]">
          <span>Active stories are removed automatically after 24h</span>
          <button
            onClick={() => setMyStoriesOpen(false)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-[#101827] border border-white/10 p-5 shadow-2xl space-y-4 text-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#F8FAFC]">Delete this story?</h3>
            <p className="text-xs text-[#94A3B8]">
              This action cannot be undone. It will be removed immediately for all viewers.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStoryToDelete(null)}
                className="px-3 py-1.5 text-xs rounded-xl font-medium text-[#94A3B8] hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = storyToDelete._id;
                  setStoryToDelete(null);
                  await deleteStory(id);
                }}
                className="px-3.5 py-1.5 text-xs rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStoriesModal;
