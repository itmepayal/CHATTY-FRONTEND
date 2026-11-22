import { X, Eye, Clock, Loader2 } from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";

const DEFAULT_AVATAR = "/avatar.png";

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

export const StoryViewersModal = () => {
  const {
    isViewersModalOpen,
    setViewersModalOpen,
    viewersList,
    viewersLoading,
  } = useStoryStore();

  if (!isViewersModalOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-sm bg-base-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-base-300 max-h-[80vh] text-base-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200/80 px-5 py-4 bg-base-200/40">
          <div className="flex items-center gap-2">
            <Eye className="size-4.5 text-primary drop-shadow-xs" />
            <h3 className="text-sm font-bold text-base-content">Story Viewers</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
              {viewersList.length}
            </span>
          </div>

          <button
            onClick={() => setViewersModalOpen(false)}
            className="p-1 rounded-full text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Viewers List */}
        <div className="overflow-y-auto p-3 space-y-1 grow min-h-[160px]">
          {viewersLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-base-content/60">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading viewers...</span>
            </div>
          ) : viewersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-1 text-center text-base-content/60">
              <Eye className="size-8 stroke-[1.5] mb-1 opacity-40 text-primary" />
              <p className="text-xs font-semibold text-base-content">No views yet</p>
              <p className="text-[11px] text-base-content/60">When contacts view your story, they will appear here.</p>
            </div>
          ) : (
            viewersList.map((viewer, index) => {
              const avatar =
                viewer.user?.avatar?.url ||
                (typeof viewer.user?.avatar === "string" ? viewer.user.avatar : "") ||
                viewer.user?.profilePic ||
                DEFAULT_AVATAR;
              const name = viewer.user?.fullName || viewer.user?.username || "Unknown";

              return (
                <div
                  key={viewer.user?._id || index}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-base-200/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-full overflow-hidden bg-base-200 ring-1 ring-base-300 shrink-0">
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
                      <span className="text-xs font-semibold text-base-content truncate">
                        {name}
                      </span>
                      <span className="text-[10px] text-base-content/60 flex items-center gap-1">
                        <Clock className="size-2.5 text-primary" />
                        {formatTimeAgo(viewer.viewedAt)}
                      </span>
                    </div>
                  </div>

                  {viewer.reaction && (
                    <div className="text-xl px-2 py-1 rounded-full bg-base-200 border border-base-300">
                      <span>{viewer.reaction}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-200/80 px-4 py-2.5 bg-base-200/40 text-center">
          <span className="text-[11px] text-base-content/60">
            Viewers are only visible to you
          </span>
        </div>
      </div>
    </div>
  );
};

export default StoryViewersModal;
