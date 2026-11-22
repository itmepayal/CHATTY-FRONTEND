import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Volume2,
  VolumeX,
  Clock,
  Loader2,
  Layers,
  Play,
  Pause,
} from "lucide-react";
import { useStoryStore } from "../../store/useStoryStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";

const DEFAULT_AVATAR = "/avatar.png";
const QUICK_REACTIONS = ["❤️", "😂", "😍", "🔥", "👏", "😢", "😮", "👍"];

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

export const StoryViewerModal = () => {
  const { authUser } = useAuthStore();
  const {
    feed,
    activeUserIndex,
    activeStoryIndex,
    isViewerOpen,
    closeViewer,
    nextStory,
    prevStory,
    reactToStory,
    replyToStory,
    deleteStory,
    fetchStoryViewers,
    setMyStoriesOpen,
    isPaused,
    setPaused,
  } = useStoryStore();

  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100 for current slide
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);

  const videoRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const currentUserGroup = feed[activeUserIndex];
  const currentStory = currentUserGroup?.stories?.[activeStoryIndex];
  const isMyStory = currentUserGroup?.isSelf;

  const isVideo = currentStory?.mediaType === "video";
  const durationSec = currentStory?.duration || 5;

  // Handle keyboard navigation
  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeViewer();
      } else if (e.key === "ArrowRight") {
        nextStory();
      } else if (e.key === "ArrowLeft") {
        prevStory();
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused(!isPaused);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, isPaused, closeViewer, nextStory, prevStory, setPaused]);

  // Video play/pause synchronization
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, isVideo]);

  // Non-video timer loop (Image & Text stories)
  useEffect(() => {
    if (!isViewerOpen || !currentStory || isVideo) return;

    setProgress(0);
    const intervalTime = 50; // update every 50ms
    const totalSteps = (durationSec * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;

    const interval = setInterval(() => {
      if (useStoryStore.getState().isPaused) return;

      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          nextStory();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isViewerOpen, currentStory?._id, isVideo, durationSec, nextStory]);

  // Video time update listener
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !isVideo) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      const p = (currentTime / duration) * 100;
      setProgress(Math.min(100, Math.max(0, p)));
    }
  };

  const handleVideoEnded = () => {
    setProgress(100);
    nextStory();
  };

  // Content tap navigation
  const handleContentClick = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("form") ||
      e.target.closest("textarea")
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.35) {
      prevStory();
    } else {
      nextStory();
    }
  };

  // Hold down to pause
  const handlePointerDown = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("form") ||
      e.target.closest("textarea")
    ) {
      return;
    }
    holdTimeoutRef.current = setTimeout(() => {
      setPaused(true);
    }, 150);
  };

  const handlePointerUp = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    setPaused(false);
  };

  // Touch Swipe Down to close
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);

    // Swipe down gesture
    if (deltaY > 80 && deltaX < 80) {
      closeViewer();
    }
  };

  // Send emoji reaction
  const handleReaction = async (emoji) => {
    if (!currentStory) return;
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1200);
    await reactToStory(currentStory._id, emoji);
  };

  // Send reply message
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !currentStory || isSendingReply) return;
    setIsSendingReply(true);
    try {
      await replyToStory(currentStory._id, replyText.trim());
      setReplyText("");
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!isViewerOpen || !currentUserGroup || !currentStory) {
    return null;
  }

  const userAvatar =
    currentUserGroup.user?.avatar?.url ||
    (typeof currentUserGroup.user?.avatar === "string" ? currentUserGroup.user.avatar : "") ||
    currentUserGroup.user?.profilePic ||
    DEFAULT_AVATAR;

  const userName =
    currentUserGroup.user?.fullName ||
    currentUserGroup.user?.username ||
    "User";

  const hasPrev = activeUserIndex > 0 || activeStoryIndex > 0;
  const hasNext =
    activeUserIndex < feed.length - 1 ||
    activeStoryIndex < currentUserGroup.stories.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient background bloom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-primary,rgba(56,189,248,0.15)),_transparent_70%)] pointer-events-none opacity-20" />

      {/* Floating Reaction Burst Animation */}
      {floatingReaction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-60 animate-bounce text-8xl drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]">
          <span>{floatingReaction}</span>
        </div>
      )}

      {/* Desktop External Left Chevron */}
      {hasPrev && (
        <button
          onClick={prevStory}
          aria-label="Previous story"
          className="hidden md:flex absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 hover:border-primary/50 transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="size-6 text-white" />
        </button>
      )}

      {/* Desktop External Right Chevron */}
      {hasNext && (
        <button
          onClick={nextStory}
          aria-label="Next story"
          className="hidden md:flex absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 hover:border-primary/50 transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
        >
          <ChevronRight className="size-6 text-white" />
        </button>
      )}

      {/* Main Story Container */}
      <div
        className="relative w-full h-full md:w-[430px] md:h-[92vh] md:max-h-[880px] md:rounded-3xl overflow-hidden bg-neutral text-neutral-content border-0 md:border md:border-neutral-content/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col justify-between"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Top Header & Multi-segment Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 pt-3.5 space-y-2.5">
          {/* Multi-segment Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {currentUserGroup.stories.map((story, idx) => {
              let fillPercent = 0;
              if (idx < activeStoryIndex) fillPercent = 100;
              else if (idx === activeStoryIndex) fillPercent = progress;

              return (
                <div
                  key={story._id || idx}
                  className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Info & Controls Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full ring-2 ring-primary/80 overflow-hidden bg-base-300 shrink-0">
                <img
                  src={userAvatar}
                  alt={userName}
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight drop-shadow-md">
                  {userName}
                </span>
                <span className="text-[11px] text-white/80 flex items-center gap-1 drop-shadow-xs">
                  <Clock className="size-3 text-primary" />
                  {formatTimeAgo(currentStory.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isVideo && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute" : "Mute"}
                  className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-105 transition-all border border-white/10 cursor-pointer"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4 text-primary" />}
                </button>
              )}

              <button
                onClick={() => setPaused(!isPaused)}
                title={isPaused ? "Play" : "Pause"}
                className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-105 transition-all border border-white/10 cursor-pointer"
              >
                {isPaused ? <Play className="size-4 text-primary" /> : <Pause className="size-4" />}
              </button>

              {isMyStory && (
                <>
                  <button
                    onClick={() => {
                      closeViewer();
                      setMyStoriesOpen(true);
                    }}
                    title="Manage Stories"
                    className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-105 transition-all border border-white/10 cursor-pointer"
                  >
                    <Layers className="size-4 text-primary" />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete Story"
                    className="p-1.5 rounded-full bg-black/40 text-error hover:bg-error/20 hover:scale-105 transition-all border border-white/10 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}

              <button
                onClick={closeViewer}
                title="Close (Esc)"
                className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-105 transition-all border border-white/10 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Content Area with Tap Navigation */}
        <div
          onClick={handleContentClick}
          className="relative size-full flex items-center justify-center cursor-pointer overflow-hidden bg-black"
        >
          {/* Text Story View */}
          {currentStory.mediaType === "text" && (
            <div
              className="size-full flex flex-col items-center justify-center p-8 text-center"
              style={{
                background:
                  currentStory.background?.value ||
                  "linear-gradient(135deg, #ec4899, #8b5cf6)",
                color: currentStory.background?.textColor || "#FFFFFF",
                fontFamily:
                  currentStory.background?.font === "serif"
                    ? "Georgia, serif"
                    : currentStory.background?.font === "mono"
                    ? "monospace"
                    : currentStory.background?.font === "cursive"
                    ? "cursive"
                    : "system-ui, sans-serif",
              }}
            >
              <p
                className={`max-w-sm whitespace-pre-wrap select-none drop-shadow-md leading-relaxed ${
                  currentStory.textAlignment === "left"
                    ? "text-left"
                    : currentStory.textAlignment === "right"
                    ? "text-right"
                    : "text-center"
                } ${
                  currentStory.textSize === "sm"
                    ? "text-base font-medium"
                    : currentStory.textSize === "md"
                    ? "text-lg font-semibold"
                    : currentStory.textSize === "xl"
                    ? "text-2xl sm:text-3xl font-extrabold"
                    : "text-xl sm:text-2xl font-bold"
                }`}
              >
                {currentStory.textContent}
              </p>
            </div>
          )}

          {/* Image Story View */}
          {currentStory.mediaType === "image" && (
            <div className="relative size-full flex items-center justify-center">
              {/* Blurred background fill to prevent void spaces */}
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                style={{ backgroundImage: `url(${currentStory.mediaUrl})` }}
              />
              <img
                src={currentStory.mediaUrl}
                alt="Story content"
                className="relative max-h-full max-w-full object-contain z-10 select-none"
              />
            </div>
          )}

          {/* Video Story View */}
          {currentStory.mediaType === "video" && (
            <div className="relative size-full flex items-center justify-center">
              {isVideoBuffering && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                autoPlay
                playsInline
                muted={isMuted}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                onWaiting={() => setIsVideoBuffering(true)}
                onPlaying={() => setIsVideoBuffering(false)}
                onError={() => {
                  setVideoError(true);
                  setIsVideoBuffering(false);
                }}
                className="relative max-h-full max-w-full object-contain z-10"
              />
              {videoError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                  <span className="text-sm font-semibold">Video playback error</span>
                </div>
              )}
            </div>
          )}

          {/* Creative Overlays Render */}
          {Array.isArray(currentStory.overlays) &&
            currentStory.overlays.map((ov, i) => (
              <div
                key={ov.id || i}
                style={{
                  left: `${ov.x}%`,
                  top: `${ov.y}%`,
                  transform: `translate(-50%, -50%) scale(${ov.scale || 1}) rotate(${ov.rotation || 0}deg)`,
                  color: ov.color || "#FFFFFF",
                }}
                className="absolute z-20 pointer-events-none select-none drop-shadow-lg"
              >
                {ov.type === "emoji" ? (
                  <span className="text-3xl">{ov.content}</span>
                ) : (
                  <span className="text-base font-bold bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/10">
                    {ov.content}
                  </span>
                )}
              </div>
            ))}

          {/* Floating Caption Banner */}
          {currentStory.caption && (
            <div className="absolute bottom-24 inset-x-4 z-20 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-center shadow-lg pointer-events-none">
              <p className="text-sm text-white font-medium drop-shadow-md whitespace-pre-wrap leading-relaxed">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Interactive Area */}
        <div className="relative z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pb-4 space-y-2.5">
          {isMyStory ? (
            /* Story Owner: Viewers summary button */
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => fetchStoryViewers(currentStory)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-md hover:border-primary/50"
              >
                <Eye className="size-4 text-primary" />
                <span>
                  {currentStory.viewCount || currentStory.views?.length || 0} Viewers
                </span>
              </button>

              <button
                onClick={() => {
                  closeViewer();
                  setMyStoriesOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-xs font-semibold text-primary transition-all cursor-pointer"
              >
                <Layers className="size-3.5" />
                <span>Manage Stories</span>
              </button>
            </div>
          ) : (
            /* Story Viewer: Quick reactions & DM Reply Input */
            <div className="space-y-2">
              {/* Emoji Quick Reactions Bar */}
              <div className="flex items-center justify-around px-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1.5 text-2xl hover:scale-135 active:scale-95 transition-transform cursor-pointer drop-shadow-md"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Direct Reply Form */}
              <form
                onSubmit={handleSendReply}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/20 focus-within:border-primary transition-colors"
              >
                <input
                  type="text"
                  placeholder={`Reply to ${userName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  className="grow bg-transparent text-xs text-white placeholder-white/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-1.5 rounded-full bg-primary text-primary-content hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-base-100 border border-base-300 p-5 shadow-2xl space-y-4 text-base-content">
            <h3 className="text-base font-bold text-base-content">Delete Story?</h3>
            <p className="text-xs text-base-content/70">
              This story will be permanently removed for everyone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost btn-sm text-base-content/70 hover:text-base-content"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await deleteStory(currentStory._id);
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

export default StoryViewerModal;
