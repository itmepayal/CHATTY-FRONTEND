import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Maximize2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  ScreenShare,
  Pause,
} from "lucide-react";
import CallAvatar from "./CallAvatar";
import { formatCallTimer } from "./callTokens";

export default function MinimizedCallView({
  title = "User",
  avatar = "",
  isVideo = false,
  stream = null,
  localStream = null,
  cameraOff = false,
  seconds = 0,
  muted = false,
  onToggleMute,
  onToggleCamera,
  onExpand,
  onEnd,
  isGroup = false,
  participantCount = null,
  networkQuality = "good",
  isHeld = false,
  heldBy = null,
  isScreenSharing = false,
  peerScreenSharing = false,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [windowDimensions, setWindowDimensions] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  // Track viewport resize & orientation changes for dynamic drag constraints
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Attach primary/remote video stream
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
      if (stream) el.play?.().catch(() => {});
    }
  }, [stream]);

  // Attach remote audio stream for voice & video call audio playback while minimized
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (audioEl && audioEl.srcObject !== (stream || null)) {
      audioEl.srcObject = stream || null;
      if (stream) {
        audioEl.play?.().catch(() => {
          const handleGesture = () => {
            audioEl.play?.().catch(() => {});
            window.removeEventListener("click", handleGesture);
            window.removeEventListener("keydown", handleGesture);
          };
          window.addEventListener("click", handleGesture);
          window.addEventListener("keydown", handleGesture);
        });
      }
    }
  }, [stream]);

  // Attach local video stream
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && el.srcObject !== (localStream || null)) {
      el.srcObject = localStream || null;
      if (localStream) el.play?.().catch(() => {});
    }
  }, [localStream]);

  const hasLiveVideoTrack = Boolean(
    stream &&
      stream.getVideoTracks?.().length > 0 &&
      stream
        .getVideoTracks()
        .some((t) => t.readyState === "live" && t.enabled),
  );
  const hasVideo = isVideo && (peerScreenSharing || (hasLiveVideoTrack && !cameraOff));
  const qualityColor =
    networkQuality === "poor"
      ? "bg-red-500"
      : networkQuality === "weak"
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <motion.div
      drag
      dragConstraints={{
        left: 12,
        right: Math.max(12, windowDimensions.w - 290),
        top: 12,
        bottom: Math.max(12, windowDimensions.h - 190),
      }}
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={{ scale: 1.03 }}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[120] w-[min(18rem,calc(100vw-1.5rem))] sm:w-72 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-neutral/95 text-white shadow-2xl backdrop-blur-xl ring-1 ring-black/40"
    >
      {/* Media or Avatar Preview */}
      <div
        onClick={onExpand}
        className="relative h-32 xs:h-36 sm:h-40 w-full cursor-pointer overflow-hidden bg-black/80 flex items-center justify-center group"
      >
        {hasVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className={`size-full ${
              isScreenSharing || peerScreenSharing
                ? "object-contain bg-black"
                : "object-cover"
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <CallAvatar src={avatar} name={title} size="md" pulse={!isHeld} />
            <span className="mt-2 text-xs font-semibold truncate max-w-[14rem]">
              {title}
            </span>
          </div>
        )}

        {/* Floating Local Video Thumbnail (top-right) */}
        {isVideo && localStream && (
          <div className="absolute top-2 right-2 z-20 h-12 w-16 xs:h-14 xs:w-20 sm:h-16 sm:w-22 overflow-hidden rounded-lg border border-white/25 bg-black/80 shadow-md">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`size-full object-cover -scale-x-100 ${
                cameraOff ? "invisible" : ""
              }`}
            />
            {cameraOff && (
              <div className="flex flex-col items-center justify-center size-full bg-neutral text-white/50">
                <VideoOff className="size-3 text-amber-400" />
              </div>
            )}
          </div>
        )}

        {/* Hover overlay with Expand hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            <Maximize2 className="size-3.5" />
            <span>Expand Call</span>
          </span>
        </div>

        {/* Live Timer & Quality Pill */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          {isHeld ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/80 px-2 py-0.5 text-[11px] font-semibold text-black backdrop-blur-md">
              <Pause className="size-2.5" />
              {heldBy === "me" ? "Held by you" : "On Hold"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-mono text-white/90 backdrop-blur-md border border-white/10">
              <span
                className={`size-1.5 rounded-full ${qualityColor} animate-pulse`}
              />
              {formatCallTimer(seconds)}
            </span>
          )}
        </div>

        {/* Screen Share Indicator */}
        {(isScreenSharing || peerScreenSharing) && (
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              <ScreenShare className="size-2.5" />
              Screen Sharing
            </span>
          </div>
        )}

        {/* Participant Count for group */}
        {isGroup && participantCount != null && !isScreenSharing && (
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
            <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-md">
              {participantCount} participants
            </span>
          </div>
        )}
      </div>

      {/* Control Actions Bar */}
      <div className="flex items-center justify-between px-2.5 xs:px-3 py-2 sm:py-2.5 bg-neutral">
        <div className="min-w-0 flex-1 pr-1.5">
          <p className="truncate text-xs font-semibold text-white/90">
            {title}
          </p>
          <p className="text-[10px] text-white/50 truncate">
            {isGroup ? "Group call" : isVideo ? "Video call" : "Voice call"}
          </p>
        </div>

        <div className="flex items-center gap-1 xs:gap-1.5 shrink-0">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex size-9 sm:size-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-full transition-all active:scale-95 ${
              muted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>

          {/* Camera Toggle */}
          {isVideo && onToggleCamera && (
            <button
              type="button"
              onClick={onToggleCamera}
              className={`flex size-9 sm:size-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-full transition-all active:scale-95 ${
                cameraOff
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
              aria-label={cameraOff ? "Turn on camera" : "Turn off camera"}
              title={cameraOff ? "Turn on camera" : "Turn off camera"}
            >
              {cameraOff ? (
                <VideoOff className="size-4" />
              ) : (
                <Video className="size-4" />
              )}
            </button>
          )}

          {/* Expand Call */}
          <button
            type="button"
            onClick={onExpand}
            className="flex size-9 sm:size-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-all active:scale-95"
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 className="size-4" />
          </button>

          {/* End Call */}
          <button
            type="button"
            onClick={onEnd}
            className="flex size-9 sm:size-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="size-4" />
          </button>
        </div>
      </div>

      {/* Hidden Audio Element ensuring Voice and Video call audio is audible when minimized */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={false}
        className="hidden"
      />
    </motion.div>
  );
}
