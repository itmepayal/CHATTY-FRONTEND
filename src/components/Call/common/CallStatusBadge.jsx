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
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[#121620]/80 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-xl shadow-sm ${className}`}
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-white/90 backdrop-blur-md border border-white/[0.12] shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="tabular-nums font-mono tracking-wider font-semibold">
            {formatCallTimer(seconds)}
          </span>
        </div>
      ) : connecting ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-white/80 backdrop-blur-md border border-white/[0.12] shadow-sm">
          <Loader2 className="size-3 animate-spin text-primary" />
          <span>{label || "Connecting…"}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-white/70 backdrop-blur-md border border-white/[0.12] shadow-sm">
          <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{label || "Ringing…"}</span>
        </div>
      )}
    </div>
  );
}

export function CallPeerMutedBadge({ name, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300 backdrop-blur-md shadow-sm ${className}`}
    >
      <MicOff className="size-3.5 text-rose-400 shrink-0" />
      <span className="truncate">{name ? `${name} is muted` : "Muted"}</span>
    </span>
  );
}

export function CallSecurityBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md shadow-xs ${className}`}
      title="Peer-to-peer WebRTC DTLS-SRTP encrypted stream"
    >
      <ShieldCheck className="size-3 text-emerald-400" />
      <span>Encrypted</span>
    </span>
  );
}

export function CallNetworkBadge({ quality = "good", stats = null, className = "" }) {
  const configs = {
    excellent: {
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      dot: "bg-emerald-400",
      label: "Excellent",
    },
    good: {
      color: "text-primary bg-primary/15 border-primary/30",
      dot: "bg-primary",
      label: "Good",
    },
    weak: {
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Weak",
    },
    poor: {
      color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      dot: "bg-rose-400",
      label: "Poor",
    },
    reconnecting: {
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30 animate-pulse",
      dot: "bg-amber-400",
      label: "Reconnecting…",
    },
  };

  const conf = configs[quality] || configs.good;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-md shadow-xs transition-colors ${conf.color} ${className}`}
      title={
        stats
          ? `RTT: ${stats.rtt}ms | Loss: ${stats.packetLoss}% | Jitter: ${stats.jitter}ms`
          : `Network quality: ${conf.label}`
      }
    >
      <span className={`size-1.5 rounded-full ${conf.dot}`} />
      <span className="hidden sm:inline font-mono text-[11px] font-semibold">{conf.label}</span>
      {stats?.rtt ? (
        <span className="text-[10px] opacity-80 hidden md:inline font-mono font-normal">({stats.rtt}ms)</span>
      ) : null}
    </span>
  );
}

export function CallHoldBadge({ isHeld, heldBy, isHoldOwner, label = "", className = "" }) {
  if (!isHeld) return null;
  const isOwner = isHoldOwner !== undefined ? isHoldOwner : (heldBy === "me");
  const displayLabel =
    label ||
    (isOwner ? "Call on hold" : "Call placed on hold by the other participant");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md animate-pulse shadow-md ${className}`}
    >
      <span className="size-2 rounded-full bg-amber-400" />
      <span>{displayLabel}</span>
    </span>
  );
}
