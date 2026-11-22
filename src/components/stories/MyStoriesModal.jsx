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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-lg bg-base-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-base-300 max-h-[85vh] text-base-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200/80 px-5 py-4 bg-base-200/40">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-primary drop-shadow-xs" />
            <h3 className="text-base font-bold text-base-content">My Stories</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
              {myStories.length} active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMyStoriesOpen(false);
                setCreatorOpen(true);
              }}
              className="btn btn-primary btn-sm gap-1.5 font-bold shadow-md cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add Story</span>
            </button>
            <button
              onClick={() => setMyStoriesOpen(false)}
              className="p-1.5 rounded-full text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Stories List */}
        <div className="overflow-y-auto p-4 space-y-3 grow min-h-[220px]">
          {myStoriesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-base-content/60">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading your stories...</span>
            </div>
          ) : myStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-base-content/60">
              <div className="size-16 rounded-full bg-base-200 border border-base-300 flex items-center justify-center text-primary">
                <Sparkles className="size-8 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-sm font-bold text-base-content">No active stories</p>
                <p className="text-xs text-base-content/60 mt-1">
                  Share photos, videos, or status updates that disappear in 24 hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setMyStoriesOpen(false);
                  setCreatorOpen(true);
                }}
                className="btn btn-primary btn-sm font-bold shadow-md mt-2 cursor-pointer"
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
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-base-300/80 bg-base-200/60 hover:bg-base-200 transition-all shadow-2xs group"
                >
                  {/* Thumbnail Preview */}
                  <div
                    onClick={() => {
                      setMyStoriesOpen(false);
                      openMyStoryViewer(story._id);
                    }}
                    className="relative size-16 rounded-xl overflow-hidden shrink-0 cursor-pointer bg-base-300 border border-base-300 flex items-center justify-center group-hover:scale-102 transition-transform"
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
                      <span className="text-xs font-bold text-base-content capitalize">
                        {story.mediaType} story
                      </span>
                      <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-md">
                        Expires in {story.remainingFormatted || "24h"}
                      </span>
                    </div>

                    <span className="text-[11px] text-base-content/60 flex items-center gap-1 mt-1">
                      <Clock className="size-3 text-primary" />
                      Posted {formatTimeAgo(story.createdAt)}
                    </span>

                    {/* Reactions Pill List */}
                    {reactionEntries.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                        {reactionEntries.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-base-100 border border-base-300 text-[10px] font-semibold text-base-content shadow-2xs"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-base-100 border border-base-300 hover:border-primary/50 text-xs font-semibold text-base-content transition-colors cursor-pointer"
                    >
                      <Eye className="size-3.5 text-primary" />
                      <span>{story.viewCount || 0}</span>
                    </button>

                    <button
                      onClick={() => setStoryToDelete(story)}
                      title="Delete Story"
                      className="p-2 rounded-xl text-error hover:bg-error/15 transition-colors cursor-pointer"
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
        <div className="border-t border-base-200/80 px-5 py-3.5 bg-base-200/40 flex items-center justify-between text-xs text-base-content/60">
          <span>Active stories are removed automatically after 24h</span>
          <button
            onClick={() => setMyStoriesOpen(false)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-base-content/70 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-base-100 border border-base-300 p-5 shadow-2xl space-y-4 text-base-content">
            <h3 className="text-sm font-bold text-base-content">Delete this story?</h3>
            <p className="text-xs text-base-content/70">
              This action cannot be undone. It will be removed immediately for all viewers.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStoryToDelete(null)}
                className="btn btn-ghost btn-sm text-base-content/70 hover:text-base-content"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = storyToDelete._id;
                  setStoryToDelete(null);
                  await deleteStory(id);
                }}
                className="btn btn-error btn-sm font-bold"
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
