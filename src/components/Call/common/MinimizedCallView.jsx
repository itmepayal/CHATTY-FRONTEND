import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Maximize2, Mic, MicOff, PhoneOff } from "lucide-react";
import CallAvatar from "./CallAvatar";
import { formatCallTimer } from "./callTokens";

/**
 * Standardized Floating Minimized / Picture-in-Picture Call Widget
 * Lets users browse the app while continuing their call.
 */
export default function MinimizedCallView({
  title,
  avatar,
  isVideo = false,
  stream = null,
  seconds = 0,
  muted = false,
  onToggleMute,
  onExpand,
  onEnd,
  isGroup = false,
  participantCount = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== (stream || null)) {
      el.srcObject = stream || null;
    }
  }, [stream]);

  const hasVideo = isVideo && Boolean(stream);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 12, right: window.innerWidth - 240, top: 12, bottom: window.innerHeight - 180 }}
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={{ scale: 1.03 }}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[120] w-56 sm:w-64 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-neutral/95 text-white shadow-2xl backdrop-blur-xl ring-1 ring-black/40"
    >
      {/* Media or Avatar Preview */}
      <div
        onClick={onExpand}
        className="relative h-28 sm:h-32 w-full cursor-pointer overflow-hidden bg-black/60 flex items-center justify-center group"
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <CallAvatar src={avatar} name={title} size="sm" />
            <span className="mt-1.5 text-xs font-semibold truncate max-w-[12rem]">
              {title}
            </span>
          </div>
        )}

        {/* Hover overlay with Expand hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
            <Maximize2 className="size-3.5" />
            <span>Expand</span>
          </span>
        </div>

        {/* Live Timer Pill */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-mono text-white/90 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            {formatCallTimer(seconds)}
          </span>
        </div>

        {/* Participant Count for group */}
        {isGroup && participantCount != null && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-md">
              {participantCount} in call
            </span>
          </div>
        )}
      </div>

      {/* Control Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral">
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-xs font-medium text-white/90">{title}</p>
          <p className="text-[10px] text-white/50 truncate">
            {isGroup ? "Group call" : isVideo ? "Video call" : "Audio call"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex size-8 items-center justify-center rounded-full transition-colors ${
              muted
                ? "bg-white text-neutral hover:bg-white/90"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          </button>

          <button
            type="button"
            onClick={onExpand}
            className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Expand call"
            title="Expand call"
          >
            <Maximize2 className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={onEnd}
            className="flex size-8 items-center justify-center rounded-full bg-error text-error-content hover:brightness-110 transition-colors"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="size-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
