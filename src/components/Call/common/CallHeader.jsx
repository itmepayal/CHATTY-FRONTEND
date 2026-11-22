import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import {
  CallStatusIndicator,
  CallSecurityBadge,
  CallNetworkBadge,
  CallHoldBadge,
} from "./CallStatusBadge";

/**
 * Standardized Top Header for 1:1 and Group Calls
 * Clean, compact, minimal top information section with verified metrics.
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
  networkQuality = null,
  stats = null,
  isHeld = false,
  heldBy = null,
  isHoldOwner = true,
  holdNotice = "",
  resolutionBadge = null,
  isScreenSharing = false,
  peerScreenSharing = false,
  captionsEnabled = false,
  viewMode = null,
  onToggleViewMode = null,
  rightAddon = null,
  className = "",
}) {
  return (
    <header
      className={`relative z-20 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 pb-3 sm:pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/85 via-black/45 to-transparent text-white ${className}`}
    >
      {/* Left: Minimize button & identity */}
      <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-white/[0.12] bg-[#121620]/80 text-white/90 backdrop-blur-xl transition-all hover:bg-white/20 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-white shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] shadow-sm cursor-pointer"
            aria-label="Minimize call"
            title="Minimize call"
          >
            <ChevronDown className="size-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 xs:gap-2">
            <h1 className="truncate text-sm xs:text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-sm max-w-[42vw] xs:max-w-[55vw] sm:max-w-xs md:max-w-md">
              {title}
            </h1>
            <CallSecurityBadge className="hidden sm:inline-flex" />
            {isHeld && (
              <CallHoldBadge
                isHeld={isHeld}
                heldBy={heldBy}
                isHoldOwner={isHoldOwner}
                label={holdNotice}
              />
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 text-xs">
            {subtitle ? (
              <span className="text-white/70 font-medium truncate max-w-[12rem]">
                {subtitle}
              </span>
            ) : (
              <CallStatusIndicator
                connected={connected}
                connecting={connecting}
                seconds={seconds}
              />
            )}
            {connected && networkQuality && (
              <CallNetworkBadge quality={networkQuality} stats={stats} />
            )}
            {connected && isVideo && resolutionBadge && (
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/35 shadow-sm">
                {resolutionBadge}
              </span>
            )}
            {(isScreenSharing || peerScreenSharing) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/35 shadow-sm">
                <span>Screen</span>
              </span>
            )}
            {captionsEnabled && (
              <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/35 shadow-sm">
                CC
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Participant count, View mode, Fullscreen toggle, etc. */}
      <div className="flex shrink-0 items-center gap-2">
        {onToggleViewMode && (
          <button
            type="button"
            onClick={onToggleViewMode}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[#121620]/80 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl hover:bg-white/20 hover:text-white active:scale-95 transition-all shadow-sm cursor-pointer"
            title={`Switch to ${viewMode === "speaker" ? "Gallery" : "Speaker"} view`}
          >
            <span>
              {viewMode === "speaker" ? "Speaker View" : "Gallery View"}
            </span>
          </button>
        )}
        {participantCount != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[#121620]/80 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl shadow-sm">
            <Users className="size-3.5 text-primary" />
            <span>{participantCount}</span>
          </span>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="hidden sm:flex size-9 sm:size-10 items-center justify-center rounded-full border border-white/[0.12] bg-[#121620]/80 text-white/90 backdrop-blur-xl transition-all hover:bg-white/20 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-white shadow-sm cursor-pointer"
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
