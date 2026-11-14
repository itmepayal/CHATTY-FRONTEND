import { useEffect, useRef, memo } from "react";
import { Loader2, MicOff, VideoOff, WifiOff } from "lucide-react";
import CallAvatar from "./CallAvatar";

/**
 * Standardized Participant Video/Avatar Tile for 1:1 and Group Calls
 */
const CallParticipantCard = memo(function CallParticipantCard({
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
  aspectRatio = "aspect-video",
  className = "",
  onPin = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
    }
  }, [stream]);

  const showVideo = Boolean(stream) && hasVideo && videoOn;

  return (
    <div
      onClick={onPin}
      className={`relative min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-neutral/90 shadow-xl transition-all duration-300 ${aspectRatio} ${
        isSpeaking ? "ring-2 ring-success shadow-success/20" : "ring-1 ring-white/10"
      } ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={self}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
          self ? "-scale-x-100" : ""
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
            pulseColor="bg-success/30"
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
        <div className="absolute inset-x-0 top-3 flex justify-center z-10">
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

      {/* Bottom Identifier Pill */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10 pointer-events-none">
        <div className="inline-flex max-w-[85%] items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-medium text-white/95 backdrop-blur-md shadow-sm">
          {!micOn && <MicOff className="size-3 shrink-0 text-error" />}
          <span className="truncate">{self ? "You" : name}</span>
        </div>

        {isSpeaking && micOn && (
          <span className="flex size-2 rounded-full bg-success ring-4 ring-success/30" />
        )}
      </div>
    </div>
  );
});

export default CallParticipantCard;
