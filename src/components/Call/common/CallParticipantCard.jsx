import { useEffect, useRef, useState, memo } from "react";
import {
  Loader2,
  MicOff,
  VideoOff,
  WifiOff,
  UserX,
  VolumeX,
  Pin,
  PinOff,
  ScreenShare,
} from "lucide-react";
import CallAvatar from "./CallAvatar";

/**
 * Standardized Participant Video/Avatar Tile for 1:1 and Group Calls
 * With active speaker halo, host moderation controls, and pin toggling.
 */
const CallParticipantCard = memo(function CallParticipantCard({
  userId = null,
  name = "User",
  avatar = "",
  stream = null,
  self = false,
  hasVideo = false,
  videoOn = false,
  micOn = true,
  connecting = false,
  failed = false,
  isSpeaking = false,
  isHost = false,
  isPinned = false,
  isScreenSharing = false,
  aspectRatio = "aspect-video",
  className = "",
  onPin = null,
  onKick = null,
  onMute = null,
}) {
  const videoRef = useRef(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play?.().catch(() => {
        const handleGesture = () => {
          el.play?.().catch(() => {});
          window.removeEventListener("click", handleGesture);
          window.removeEventListener("keydown", handleGesture);
          window.removeEventListener("touchstart", handleGesture);
        };
        window.addEventListener("click", handleGesture, { once: true });
        window.addEventListener("keydown", handleGesture, { once: true });
        window.addEventListener("touchstart", handleGesture, { once: true });
      });
    }
  }, [stream]);

  const showVideo = Boolean(stream) && hasVideo && videoOn;

  return (
    <div
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      className={`group relative min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-neutral/90 shadow-xl transition-all duration-300 ${aspectRatio} ${
        isSpeaking
          ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20"
          : isPinned
            ? "ring-2 ring-primary shadow-lg shadow-primary/25"
            : "ring-1 ring-white/10"
      } ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={self}
        className={`absolute inset-0 size-full ${
          isScreenSharing ? "object-contain bg-black" : "object-cover"
        } transition-opacity duration-300 ${
          self && !isScreenSharing ? "-scale-x-100" : ""
        } ${showVideo ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* Fallback Avatar when camera is off */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-neutral/80 via-neutral to-black/60">
          <CallAvatar
            src={avatar}
            name={name}
            size="lg"
            pulse={isSpeaking}
            pulseColor="bg-emerald-500/30"
          />
          {hasVideo && !videoOn && (
            <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-white/50">
              <VideoOff className="size-3.5" />
              <span>Camera off</span>
            </span>
          )}
        </div>
      )}

      {/* Connection State Overlay */}
      {(connecting || failed) && (
        <div className="absolute inset-x-0 top-3 flex justify-center z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            {failed ? (
              <>
                <WifiOff className="size-3.5 text-error" />
                <span>Connection lost</span>
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Connecting…</span>
              </>
            )}
          </span>
        </div>
      )}

      {/* Host Controls & Pin Overlay (Visible on Hover / Mobile tap) */}
      <div
        className={`absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 transition-opacity duration-200 ${
          showControls || isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {onPin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin?.(userId);
            }}
            title={isPinned ? "Unpin tile" : "Pin tile"}
            className={`flex size-7 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              isPinned
                ? "bg-primary border-primary text-white"
                : "bg-black/60 border-white/15 text-white/80 hover:bg-black/80 hover:text-white"
            }`}
          >
            {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
        )}

        {isHost && !self && onMute && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMute?.(userId);
            }}
            title="Request participant to mute"
            className="flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur-md hover:bg-warning hover:text-black transition-colors"
          >
            <VolumeX className="size-3.5" />
          </button>
        )}

        {isHost && !self && onKick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onKick?.(userId);
            }}
            title="Remove from call (Host control)"
            className="flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 backdrop-blur-md hover:bg-error hover:text-white transition-colors"
          >
            <UserX className="size-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Identifier Pill */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10 pointer-events-none">
        <div className="inline-flex max-w-[85%] items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-medium text-white/95 backdrop-blur-md shadow-sm">
          {!micOn && <MicOff className="size-3 shrink-0 text-error" />}
          {isScreenSharing && <ScreenShare className="size-3 shrink-0 text-primary" />}
          <span className="truncate">{self ? (isScreenSharing ? "You (Sharing)" : "You") : name}</span>
        </div>

        {isSpeaking && micOn && (
          <span className="flex size-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30 animate-pulse" />
        )}
      </div>
    </div>
  );
});

export default CallParticipantCard;
