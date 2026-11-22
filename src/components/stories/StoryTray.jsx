import { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Sparkles, Layers } from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";

const DEFAULT_AVATAR = "/avatar.png";

export const StoryTray = () => {
  const { authUser, socket } = useAuthStore();
  const {
    feed,
    isLoading,
    fetchFeed,
    openViewer,
    setCreatorOpen,
    setMyStoriesOpen,
    subscribeToSocketEvents,
  } = useStoryStore();

  const scrollRef = useRef(null);
  const [showScrollBtns, setShowScrollBtns] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!socket) return;
    const unsubscribe = subscribeToSocketEvents(socket);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [socket, subscribeToSocketEvents]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const myGroup = feed.find((g) => g.isSelf);
  const contactGroups = feed.filter((g) => !g.isSelf);

  const myAvatar =
    authUser?.avatar?.url ||
    (typeof authUser?.avatar === "string" ? authUser.avatar : "") ||
    authUser?.profilePic ||
    DEFAULT_AVATAR;

  const hasMyStories = Boolean(myGroup && myGroup.stories?.length > 0);

  return (
    <div
      onMouseEnter={() => setShowScrollBtns(true)}
      onMouseLeave={() => setShowScrollBtns(false)}
      className="relative border-b border-base-300/80 bg-base-100 px-3 py-2.5 select-none transition-all group/tray"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-base-content/70">
          <Sparkles className="size-3.5 text-primary drop-shadow-xs" />
          <span className="text-base-content font-bold">Stories</span>
        </div>

        <div className="flex items-center gap-2">
          {hasMyStories && (
            <button
              onClick={() => setMyStoriesOpen(true)}
              className="text-[11px] font-semibold text-base-content/70 hover:text-primary transition-colors cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-base-200"
            >
              <Layers className="size-3" />
              <span>Manage</span>
            </button>
          )}

          <button
            onClick={() => setCreatorOpen(true)}
            className="text-xs font-semibold text-primary hover:bg-primary hover:text-primary-content transition-all cursor-pointer flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-primary/10 border border-primary/25 active:scale-95 shadow-2xs"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Desktop Left/Right Scroll Chevrons */}
      {showScrollBtns && (
        <>
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full bg-base-200/95 shadow-md border border-base-300 flex items-center justify-center text-base-content hover:bg-base-300 hover:border-primary/50 transition-all hidden md:flex cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full bg-base-200/95 shadow-md border border-base-300 flex items-center justify-center text-base-content hover:bg-base-300 hover:border-primary/50 transition-all hidden md:flex cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}

      {/* Loading Skeleton */}
      {isLoading && feed.length === 0 ? (
        <div className="flex items-center gap-3.5 overflow-hidden py-1 px-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
              <div className="size-14 rounded-full bg-base-300/70 border border-base-300" />
              <div className="h-2.5 w-12 rounded-md bg-base-300/70" />
            </div>
          ))}
        </div>
      ) : (
        /* Stories Scrollable Container */
        <div
          ref={scrollRef}
          className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* My Story Card */}
          <div className="flex flex-col items-center gap-1 shrink-0 group">
            <div className="relative">
              <button
                onClick={() => {
                  if (hasMyStories) {
                    const myIndex = feed.findIndex((g) => g.isSelf);
                    openViewer(myIndex, 0);
                  } else {
                    setCreatorOpen(true);
                  }
                }}
                className={`relative size-14 rounded-full p-[2px] transition-all duration-300 group-hover:scale-105 cursor-pointer flex items-center justify-center ${
                  hasMyStories
                    ? "bg-gradient-to-tr from-primary to-secondary shadow-sm ring-2 ring-primary/40 ring-offset-2 ring-offset-base-100"
                    : "border-2 border-dashed border-base-300 hover:border-primary/60 bg-transparent"
                }`}
              >
                <div className="size-full rounded-full p-[2px] bg-base-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={myAvatar}
                    alt={authUser?.fullName || "My Story"}
                    loading="lazy"
                    className="size-full rounded-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
              </button>

              {/* Story count badge */}
              {hasMyStories && myGroup.stories.length > 1 && (
                <span className="absolute -top-0.5 -right-0.5 size-4.5 rounded-full bg-base-200 text-primary border border-base-300 text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {myGroup.stories.length}
                </span>
              )}

              {/* Plus Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatorOpen(true);
                }}
                title="Add Story"
                className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-content flex items-center justify-center ring-2 ring-base-100 hover:scale-115 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Plus className="size-3.5 stroke-[3]" />
              </button>
            </div>

            <span className="text-[11px] font-medium text-base-content group-hover:text-primary transition-colors truncate max-w-[64px] text-center">
              {hasMyStories ? "Your story" : "Add story"}
            </span>
          </div>

          {/* Contacts' Stories */}
          {contactGroups.map((group) => {
            const groupIndex = feed.findIndex((g) => g.user?._id === group.user?._id);
            const avatar =
              group.user?.avatar?.url ||
              (typeof group.user?.avatar === "string" ? group.user.avatar : "") ||
              group.user?.profilePic ||
              DEFAULT_AVATAR;
            const displayName =
              group.user?.fullName?.split(" ")[0] || group.user?.username || "Friend";

            return (
              <div
                key={group.user?._id}
                onClick={() => openViewer(groupIndex, 0)}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div
                    className={`size-14 rounded-full p-[2px] transition-all duration-300 group-hover:scale-105 flex items-center justify-center ${
                      group.hasUnseen
                        ? "bg-gradient-to-tr from-primary to-secondary shadow-sm ring-2 ring-primary/40 ring-offset-2 ring-offset-base-100"
                        : "bg-base-300 opacity-75 group-hover:opacity-100 ring-1 ring-base-300 ring-offset-1 ring-offset-base-100"
                    }`}
                  >
                    <div className="size-full rounded-full p-[2px] bg-base-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={avatar}
                        alt={displayName}
                        loading="lazy"
                        className="size-full rounded-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                  </div>

                  {/* Multiple story count badge */}
                  {group.stories?.length > 1 && (
                    <span className="absolute -top-0.5 -right-0.5 size-4.5 rounded-full bg-base-200 text-base-content border border-base-300 text-[9px] font-bold flex items-center justify-center shadow-xs">
                      {group.stories.length}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] truncate max-w-[64px] text-center transition-colors ${
                    group.hasUnseen
                      ? "font-semibold text-base-content group-hover:text-primary"
                      : "font-normal text-base-content/60 group-hover:text-base-content"
                  }`}
                >
                  {displayName}
                </span>
              </div>
            );
          })}

          {/* Empty State */}
          {contactGroups.length === 0 && !hasMyStories && (
            <div className="flex items-center gap-2 py-2 text-xs text-base-content/50 italic px-2">
              <span>No active stories. Click + to share your day!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryTray;
