import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import { CallStatusIndicator, CallSecurityBadge } from "./CallStatusBadge";

/**
 * Standardized Top Header for 1:1 and Group Calls
 */
export default function CallHeader({
  title,
  subtitle,
  isVideo = false,
  connected = false,
  connecting = false,
  seconds = 0,
  participantCount = null,
  onMinimize = null,
  isFullscreen = false,
  onToggleFullscreen = null,
  rightAddon = null,
  className = "",
}) {
  return (
    <header
      className={`relative z-20 flex items-center justify-between gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 bg-gradient-to-b from-black/70 via-black/35 to-transparent text-white ${className}`}
    >
      {/* Left: Minimize button & identity */}
      <div className="flex items-center gap-3 min-w-0">
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Minimize call"
            title="Minimize call"
          >
            <ChevronDown className="size-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-sm">
              {title}
            </h1>
            <CallSecurityBadge className="hidden sm:inline-flex" />
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {subtitle ? (
              <span className="text-white/70 font-medium truncate">{subtitle}</span>
            ) : (
              <CallStatusIndicator
                connected={connected}
                connecting={connecting}
                seconds={seconds}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right: Participant count, Fullscreen toggle, etc. */}
      <div className="flex shrink-0 items-center gap-2">
        {participantCount != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
            <Users className="size-3.5 text-primary" />
            <span>{participantCount}</span>
          </span>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="hidden sm:flex size-9 sm:size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
            aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            title={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        )}

        {rightAddon}
      </div>
    </header>
  );
}
