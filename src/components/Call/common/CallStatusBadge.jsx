import { Loader2, MicOff, Phone, ShieldCheck, Video } from "lucide-react";
import { formatCallTimer } from "./callTokens";

/**
 * Standardized status indicators and duration badges for all calls
 */
export function CallTypeBadge({ isVideo, text, className = "" }) {
  const Icon = isVideo ? Video : Phone;
  const label = text || (isVideo ? "Video call" : "Audio call");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md shadow-sm ${className}`}
    >
      <Icon className="size-3.5 text-primary" />
      <span>{label}</span>
    </span>
  );
}

export function CallStatusIndicator({
  connected = false,
  connecting = false,
  seconds = 0,
  label = "",
  className = "",
}) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${className}`}>
      {connected ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-white/90 backdrop-blur-md border border-white/10">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/80" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <span className="tabular-nums font-mono tracking-wider">
            {formatCallTimer(seconds)}
          </span>
        </div>
      ) : connecting ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-white/80 backdrop-blur-md border border-white/10">
          <Loader2 className="size-3 animate-spin text-primary" />
          <span>{label || "Connecting…"}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-white/70 backdrop-blur-md border border-white/10">
          <span className="size-2 rounded-full bg-warning" />
          <span>{label || "Ringing…"}</span>
        </div>
      )}
    </div>
  );
}

export function CallPeerMutedBadge({ name, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md shadow-sm ${className}`}
    >
      <MicOff className="size-3.5 text-error shrink-0" />
      <span className="truncate">{name ? `${name} is muted` : "Muted"}</span>
    </span>
  );
}

export function CallSecurityBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur-md ${className}`}
      title="End-to-end encrypted connection"
    >
      <ShieldCheck className="size-3 text-success" />
      <span>Encrypted</span>
    </span>
  );
}
