import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Headphones,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MoreHorizontal,
  Pause,
  Phone,
  PhoneOff,
  PictureInPicture2,
  Play,
  ScreenShare,
  ScreenShareOff,
  Send,
  Settings2,
  Smile,
  Sparkles,
  Subtitles,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
  Check,
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { useChatStore } from "../../store/useChatStore";

import { CALL_SPRING, formatCallTimer } from "./common/callTokens";
import CallAvatar from "./common/CallAvatar";
import CallControlButton from "./common/CallControlButton";
import CallHeader from "./common/CallHeader";
import CallActionBar from "./common/CallActionBar";
import { CallTypeBadge, CallPeerMutedBadge } from "./common/CallStatusBadge";
import MinimizedCallView from "./common/MinimizedCallView";
import CallToast from "./common/CallToast";
import CallReactionsOverlay from "./common/CallReactionsOverlay";
import CallCaptionsOverlay from "./common/CallCaptionsOverlay";
import CallReactionsBar from "./common/CallReactionsBar";
import VideoEffectsModal from "./modals/VideoEffectsModal";
import CameraControlsModal from "./modals/CameraControlsModal";
import CaptionsModal from "./modals/CaptionsModal";
import PipVideoCall from "./pip/PipVideoCall";

/* ------------------------------------------------------------------ */
/*  Animated Dots for "Calling..." state                              */
/* ------------------------------------------------------------------ */
const CallingDots = () => (
  <span className="ml-1 inline-flex gap-1" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1 rounded-full bg-current"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Decline With Message Quick Replies Menu                           */
/* ------------------------------------------------------------------ */
const QUICK_DECLINE_MESSAGES = [
  "Can't talk right now. What's up?",
  "I'll call you right back.",
  "In a meeting, please text me.",
  "On my way, talk soon!",
];

/* ------------------------------------------------------------------ */
/*  Incoming 1:1 Call Card                                            */
/* ------------------------------------------------------------------ */
const IncomingCall = ({
  peer,
  avatar,
  isVideo,
  silenced,
  onAccept,
  onReject,
}) => {
  const displayName = peer?.fullName || peer?.name || "Someone";
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const handleDeclineWithMessage = (text) => {
    if (!text?.trim()) return;
    onReject("declined-with-message", text.trim());
  };

  return (
    <motion.div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Incoming call from ${displayName}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 xs:p-4 backdrop-blur-2xl overflow-y-auto max-h-[100dvh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={CALL_SPRING}
        className="relative w-[min(94vw,25rem)] max-h-[min(92dvh,620px)] overflow-y-auto rounded-3xl border border-white/[0.14] bg-[#121620]/95 p-5 sm:p-7 text-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/10"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          <CallTypeBadge
            isVideo={isVideo}
            text={`Incoming ${isVideo ? "video" : "audio"} call`}
            className="mx-auto mb-3 sm:mb-4"
          />

          {silenced && (
            <div className="mx-auto mb-3 sm:mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/35 px-3 py-1 text-xs font-semibold text-amber-300 shadow-sm">
              <span>Silenced (Unknown Caller)</span>
            </div>
          )}

          <div className="my-3 sm:my-6 flex justify-center">
            <CallAvatar
              src={avatar}
              name={displayName}
              size="lg"
              pulse
              pulseColor="bg-primary/30"
            />
          </div>

          <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm max-w-[80vw]">
            {displayName}
          </h2>
          <p className="mt-1 flex items-center justify-center text-xs sm:text-sm font-medium text-white/70">
            is calling you
            <CallingDots />
          </p>

          {/* Quick Decline Options Sheet */}
          <AnimatePresence>
            {showMessageMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 sm:mt-5 space-y-2 text-left overflow-hidden border-t border-white/10 pt-3 sm:pt-4"
              >
                <p className="text-xs font-medium text-white/60 mb-2">
                  Decline and reply with:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {QUICK_DECLINE_MESSAGES.map((msg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDeclineWithMessage(msg)}
                      className="w-full rounded-xl bg-white/[0.08] hover:bg-white/[0.15] px-3 py-2 text-xs font-medium text-white/90 text-left transition-colors border border-white/[0.06] cursor-pointer"
                    >
                      "{msg}"
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Custom reply…"
                    className="flex-1 rounded-xl bg-white/[0.08] border border-white/[0.15] px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customMsg.trim()) {
                        handleDeclineWithMessage(customMsg);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!customMsg.trim()}
                    onClick={() => handleDeclineWithMessage(customMsg)}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Action Buttons */}
          <div className="mt-7 flex items-center justify-center gap-6 sm:gap-8">
            <CallControlButton
              icon={PhoneOff}
              label="Decline"
              variant="danger"
              size="lg"
              onClick={() => onReject("rejected")}
            />
            <CallControlButton
              icon={MessageSquare}
              label="Message"
              variant={showMessageMenu ? "active" : "glass"}
              size="md"
              onClick={() => setShowMessageMenu((prev) => !prev)}
            />
            <CallControlButton
              icon={isVideo ? Video : Phone}
              label="Accept"
              variant="success"
              size="lg"
              pulse
              pulseColor="bg-emerald-500/60"
              onClick={onAccept}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Call Waiting Overlay Banner                                       */
/* ------------------------------------------------------------------ */
const CallWaitingBanner = ({ waitingCall, onAccept, onReject }) => {
  if (!waitingCall) return null;
  const displayName = waitingCall.peer?.name || "User";

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[min(94vw,28rem)] rounded-2xl border border-white/[0.14] bg-[#121620]/95 p-3.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 text-white"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CallAvatar
            src={waitingCall.avatar}
            name={displayName}
            size="sm"
            pulse
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300">
              Call Waiting…
            </p>
            <p className="text-sm font-bold truncate">{displayName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
          >
            <PhoneOff className="size-3.5" />
            <span>Decline</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-md cursor-pointer"
          >
            <Phone className="size-3.5" />
            <span>Switch</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Audio Device Selector Modal                                       */
/* ------------------------------------------------------------------ */
const AudioDeviceModal = ({
  isOpen,
  onClose,
  audioInputs,
  audioOutputs,
  selectedAudioInput,
  selectedAudioOutput,
  onSelectInput,
  onSelectOutput,
  supportsSetSinkId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="relative w-full max-w-sm max-h-[min(90dvh,540px)] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/[0.14] bg-[#121620]/95 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Headphones className="size-4.5 text-primary" />
            <span>Audio Devices</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white min-w-[32px] min-h-[32px] cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pt-3 scrollbar-thin">
          {/* Microphone Inputs */}
          <div>
            <p className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1.5">
              <Mic className="size-3.5 text-primary" />
              <span>Microphone (Input)</span>
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
              {audioInputs.map((d) => (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={() => onSelectInput(d.deviceId)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors flex items-center justify-between min-h-[40px] cursor-pointer ${
                    selectedAudioInput === d.deviceId
                      ? "bg-primary text-primary-content font-semibold shadow-sm"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80"
                  }`}
                >
                  <span className="truncate pr-2">{d.label}</span>
                  {selectedAudioInput === d.deviceId && (
                    <Check className="size-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Speaker / Headset Outputs */}
          <div>
            <p className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1.5">
              <Volume2 className="size-3.5 text-primary" />
              <span>Speaker / Headset (Output)</span>
            </p>
            {!supportsSetSinkId ? (
              <p className="text-[11px] text-white/50 italic bg-white/[0.05] p-2.5 rounded-xl border border-white/[0.08]">
                System output control is managed by your OS or browser.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {audioOutputs.map((d) => (
                  <button
                    key={d.deviceId}
                    type="button"
                    onClick={() => onSelectOutput(d.deviceId)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors flex items-center justify-between min-h-[40px] cursor-pointer ${
                      selectedAudioOutput === d.deviceId
                        ? "bg-primary text-primary-content font-semibold shadow-sm"
                        : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80"
                    }`}
                  >
                    <span className="truncate pr-2">{d.label}</span>
                    {selectedAudioOutput === d.deviceId && (
                      <Check className="size-3.5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Outgoing "Calling..." Screen                                      */
/* ------------------------------------------------------------------ */
const OutgoingCall = ({ peer, avatar, isVideo, onCancel, onMinimize }) => {
  const displayName = peer?.fullName || peer?.name || "Someone";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Calling ${displayName}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-[#0d1017] via-[#090b10] to-black px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white overflow-y-auto max-h-[100dvh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/4 size-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      {/* Header with Type & Minimize */}
      <div className="relative w-full max-w-md flex items-center justify-between">
        <CallTypeBadge isVideo={isVideo} />
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="flex size-10 items-center justify-center rounded-full border border-white/[0.12] bg-[#121620]/80 text-white/90 backdrop-blur-xl hover:bg-white/20 hover:text-white transition-colors min-w-[40px] min-h-[40px] shadow-sm cursor-pointer"
            title="Minimize"
          >
            <PhoneOff className="size-4 rotate-90" />
          </button>
        )}
      </div>

      {/* Center Avatar & Identity */}
      <div className="relative flex flex-col items-center my-auto py-3 sm:py-6 text-center">
        <CallAvatar
          src={avatar}
          name={displayName}
          size="xl"
          pulse
          pulseColor="bg-primary/25"
        />

        <h2 className="mt-4 sm:mt-6 max-w-[85vw] sm:max-w-md truncate text-xl xs:text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          {displayName}
        </h2>
        <p className="mt-1.5 sm:mt-2 flex items-center justify-center text-xs sm:text-sm font-medium text-white/70">
          Ringing
          <CallingDots />
        </p>
      </div>

      {/* Bottom End Button */}
      <div className="relative pb-2">
        <CallControlButton
          icon={PhoneOff}
          label="Cancel"
          variant="danger"
          size="lg"
          onClick={onCancel}
        />
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Active Call (Connecting + Connected + Reconnecting)                */
/* ------------------------------------------------------------------ */
const ActiveCall = ({
  status,
  peer,
  avatar,
  isVideo,
  localStream,
  remoteStream,
  muted,
  cameraOff,
  peerMedia,
  seconds,
  networkQuality,
  stats,
  isHeld,
  heldBy,
  isHoldOwner,
  canResume,
  holdNotice,
  isHoldTransitioning,
  audioInputs,
  audioOutputs,
  selectedAudioInput,
  selectedAudioOutput,
  supportsSetSinkId,
  speakerOn,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onHold,
  onResume,
  onSwitchAudioInput,
  onSwitchAudioOutput,
  onEnd,
  onMinimize,
  // Video Calling & Media Props
  resolutionPreset,
  onSelectResolution,
  lowBandwidthMode,
  onToggleLowBandwidth,
  backgroundEffect,
  videoFilter,
  arEffect,
  onApplyEffects,
  processorStatus,
  processorMessage,
  isScreenSharing,
  peerScreenSharing,
  screenShareState,
  hasScreenAudio,
  onToggleScreenShare,
  incomingReactions,
  onSendReaction,
  captionsEnabled,
  captionSourceLang,
  captionTargetLang,
  activeCaption,
  captionHistory,
  onToggleCaptions,
  onSelectLanguages,
  onExportTranscript,
  onClearTranscript,
  videoInputs,
  selectedVideoInput,
  onSwitchVideoInput,
  facingMode,
  onToggleFacingMode,
  mirrorLocal,
  onToggleMirrorLocal,
  supportsZoom,
  zoomLevel,
  onSetZoom,
  supportsTorch,
  torchOn,
  onToggleTorch,
  onRequestPip,
  isPipActive = false,
  onReturnFromPip,
}) => {
  const stageRef = useRef(null);
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showEffectsModal, setShowEffectsModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showCaptionsModal, setShowCaptionsModal] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [showMoreMobileMenu, setShowMoreMobileMenu] = useState(false);

  const displayName = peer?.fullName || peer?.name || "User";

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }
    if (remoteStream) {
      el.play?.().catch(() => {
        const handleUserGesture = () => {
          el.play?.().catch(() => {});
          window.removeEventListener("click", handleUserGesture);
          window.removeEventListener("keydown", handleUserGesture);
        };
        window.addEventListener("click", handleUserGesture);
        window.addEventListener("keydown", handleUserGesture);
      });
    }

    // Structured Development Debug Logging
    if (import.meta.env?.DEV) {
      const vTracks = remoteStream?.getVideoTracks() || [];
      const aTracks = remoteStream?.getAudioTracks() || [];
      console.log("[CallUI:MainRemoteVideo]", {
        peerId: peer?._id || peer?.id || "unknown",
        streamId: remoteStream?.id || "none",
        hasEl: Boolean(el),
        srcObject: el?.srcObject?.id || null,
        videoWidth: el?.videoWidth || 0,
        videoHeight: el?.videoHeight || 0,
        readyState: el?.readyState,
        paused: el?.paused,
        muted: el?.muted,
        isPipActive,
        videoTrackCount: vTracks.length,
        audioTrackCount: aTracks.length,
        videoTracks: vTracks.map((t) => ({
          id: t.id,
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted,
        })),
        audioTracks: aTracks.map((t) => ({
          id: t.id,
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted,
        })),
      });
    }
  }, [remoteStream, peer, isPipActive]);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream;
  }, [localStream, isVideo]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const connected = status === "connected";
  const reconnecting = status === "reconnecting";
  const hasRemoteVideoTrack = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream
        .getVideoTracks()
        .some((t) => t.readyState === "live" && t.enabled),
  );
  const showRemoteVideo =
    isVideo &&
    (peerScreenSharing || (peerMedia.video && hasRemoteVideoTrack));

  return (
    <motion.div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${displayName}`}
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-[#07090e] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background Ambience & Subtle Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0e121a] via-[#07090e] to-black" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]" />

      {/* Remote Media (mounted so audio is never stopped) */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        muted={false}
        className={
          showRemoteVideo && !isPipActive
            ? `absolute inset-0 size-full bg-black ${peerScreenSharing ? "object-contain" : "object-contain sm:object-cover"}`
            : "pointer-events-none absolute size-px opacity-0"
        }
      />

      {/* Picture-in-Picture Active Card in Main Window */}
      {isPipActive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-[#07090e]/95 backdrop-blur-2xl">
          <div className="relative mb-5">
            <CallAvatar
              src={avatar}
              name={displayName}
              size="xl"
              pulse={connected && !isHeld}
            />
            <div className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary border-2 border-[#07090e] text-primary-content shadow-lg">
              <PictureInPicture2 className="size-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3.5 py-1 text-xs font-semibold text-primary mb-2.5 shadow-sm">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Call Active in Picture-in-Picture</span>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">
            You're in a call
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-white/60 max-w-md">
            Your call continues in the floating window. You can keep chatting
            while staying connected.
          </p>

          <div className="mt-5 flex items-center gap-3 text-xs text-white/70">
            <div className="flex items-center gap-1.5 font-mono bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 shadow-xs">
              <span>Duration:</span>
              <span className="font-bold text-white">
                {formatCallTimer(seconds)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 shadow-xs">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor:
                    networkQuality === "poor"
                      ? "#ef4444"
                      : networkQuality === "weak"
                        ? "#f59e0b"
                        : "#10b981",
                }}
              />
              <span className="capitalize">{networkQuality} connection</span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onReturnFromPip}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-content shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-95 cursor-pointer"
            >
              <Maximize2 className="size-4" />
              <span>Return to Full Call</span>
            </button>
            <button
              type="button"
              onClick={onMinimize}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare className="size-4" />
              <span>Keep Chatting</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Sharing Active Banner */}
      {(isScreenSharing || peerScreenSharing) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 rounded-full bg-blue-600/90 hover:bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md border border-white/20 transition-colors">
          <ScreenShare className="size-3.5" />
          <span>
            {isScreenSharing
              ? "You are sharing your screen"
              : `${displayName} is sharing screen`}
          </span>
          {hasScreenAudio && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              <Volume2 className="size-2.5" />
              Audio
            </span>
          )}
          {peerScreenSharing && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ml-1 inline-flex items-center gap-1 rounded-lg bg-black/40 px-2 py-0.5 text-[11px] hover:bg-black/60 transition-colors cursor-pointer"
              title={
                isFullscreen ? "Exit Fullscreen" : "Fullscreen presentation"
              }
            >
              {isFullscreen ? (
                <Minimize2 className="size-3" />
              ) : (
                <Maximize2 className="size-3" />
              )}
              {isFullscreen ? "Exit" : "Expand"}
            </button>
          )}
          {isScreenSharing && (
            <button
              type="button"
              onClick={onToggleScreenShare}
              className="ml-1 rounded-lg bg-black/40 px-2 py-0.5 text-[11px] hover:bg-black/60 transition-colors cursor-pointer font-bold"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Audio-only or Camera-off Avatar View */}
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-20 text-center z-10 overflow-y-auto max-h-[100dvh]">
          <CallAvatar
            src={avatar}
            name={displayName}
            size="xl"
            pulse={connected && peerMedia.audio && !isHeld}
            pulseColor="bg-emerald-500/30"
          />

          <h2 className="mt-4 sm:mt-6 max-w-[85vw] truncate text-xl xs:text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            {displayName}
          </h2>

          {isVideo && connected && !peerMedia.video && !peerScreenSharing && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur-md border border-white/10 shadow-sm">
              <VideoOff className="size-3.5 text-amber-400" />
              <span>Camera is off</span>
            </p>
          )}

          {isHeld && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md border border-amber-500/35 animate-pulse shadow-md">
              <Pause className="size-3.5" />
              <span>
                {holdNotice ||
                  (isHoldOwner
                    ? "Call on hold"
                    : "Call placed on hold by the other participant")}
              </span>
            </p>
          )}

          {!isHeld && holdNotice && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md border border-emerald-500/35 shadow-sm">
              <Play className="size-3.5" />
              <span>{holdNotice}</span>
            </p>
          )}
        </div>
      )}

      {/* Standardized Header */}
      <CallHeader
        title={displayName}
        isVideo={isVideo}
        connected={connected}
        connecting={status === "connecting" || reconnecting}
        seconds={seconds}
        networkQuality={networkQuality}
        stats={stats}
        isHeld={isHeld}
        heldBy={heldBy}
        isHoldOwner={isHoldOwner}
        holdNotice={holdNotice}
        resolutionBadge={
          isVideo && resolutionPreset ? resolutionPreset.toUpperCase() : null
        }
        isScreenSharing={isScreenSharing}
        peerScreenSharing={peerScreenSharing}
        captionsEnabled={captionsEnabled}
        onMinimize={onMinimize}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        rightAddon={
          connected && !peerMedia.audio ? (
            <CallPeerMutedBadge name={displayName.split(" ")[0]} />
          ) : null
        }
      />

      {/* Draggable Local Video Preview (Picture-in-Picture) */}
      {isVideo && (
        <motion.div
          drag
          dragConstraints={stageRef}
          dragElastic={0.12}
          dragMomentum={false}
          whileDrag={{ scale: 1.04 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={CALL_SPRING}
          className="absolute right-3 sm:right-4 top-16 sm:top-20 z-30 h-32 w-24 xs:h-36 xs:w-28 sm:h-48 sm:w-36 md:h-56 md:w-40 cursor-grab overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-[#121620]/95 shadow-[0_16px_40px_rgba(0,0,0,0.7)] ring-1 ring-black/60 active:cursor-grabbing group hover:border-primary/50 transition-colors"
        >
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className={`size-full ${isScreenSharing ? "object-contain bg-black" : "object-cover"} ${
              mirrorLocal && !isScreenSharing ? "-scale-x-100" : ""
            } ${cameraOff && !isScreenSharing ? "invisible" : ""}`}
          />
          {isScreenSharing && (
            <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md border border-white/10">
              <ScreenShare className="size-2.5 text-primary" />
              <span>Your Screen</span>
            </div>
          )}
          {!isScreenSharing && !cameraOff && (
            <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md border border-white/10">
              <span>You</span>
              {muted && <MicOff className="size-2.5 text-rose-400" />}
            </div>
          )}
          {cameraOff && !isScreenSharing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#121620] p-2 text-center text-xs font-medium text-white/70">
              <CallAvatar name="You" size="sm" />
              <span className="text-[11px] font-medium text-white/60">Camera off</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Floating Animated Overlays */}
      <CallReactionsOverlay reactions={incomingReactions} />
      <CallCaptionsOverlay caption={activeCaption} />

      {/* Modals & Bottom Bars */}
      <CallReactionsBar
        isOpen={showReactionsBar}
        onClose={() => setShowReactionsBar(false)}
        onSelectReaction={onSendReaction}
      />

      <VideoEffectsModal
        isOpen={showEffectsModal}
        onClose={() => setShowEffectsModal(false)}
        currentBackground={backgroundEffect}
        currentFilter={videoFilter}
        currentAr={arEffect}
        onApplyEffects={onApplyEffects}
        localStream={localStream}
        processorStatus={processorStatus}
        processorMessage={processorMessage}
      />

      <CameraControlsModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        videoInputs={videoInputs}
        selectedVideoInput={selectedVideoInput}
        onSelectVideoInput={onSwitchVideoInput}
        resolutionPreset={resolutionPreset}
        onSelectResolution={onSelectResolution}
        lowBandwidthMode={lowBandwidthMode}
        onToggleLowBandwidth={onToggleLowBandwidth}
        facingMode={facingMode}
        onToggleFacingMode={onToggleFacingMode}
        mirrorLocal={mirrorLocal}
        onToggleMirror={onToggleMirrorLocal}
        supportsZoom={supportsZoom}
        zoomLevel={zoomLevel}
        onSetZoom={onSetZoom}
        supportsTorch={supportsTorch}
        torchOn={torchOn}
        onToggleTorch={onToggleTorch}
      />

      <CaptionsModal
        isOpen={showCaptionsModal}
        onClose={() => setShowCaptionsModal(false)}
        captionsEnabled={captionsEnabled}
        onToggleCaptions={onToggleCaptions}
        sourceLang={captionSourceLang}
        targetLang={captionTargetLang}
        onSelectLanguages={onSelectLanguages}
        captionHistory={captionHistory}
        onExportTranscript={onExportTranscript}
        onClearTranscript={onClearTranscript}
      />

      {/* Standardized Action Bar Dock */}
      <CallActionBar>
        {/* Mute Button - Always Visible */}
        <CallControlButton
          icon={muted ? MicOff : Mic}
          label={muted ? "Unmute" : "Mute"}
          variant={muted ? "active" : "glass"}
          onClick={onToggleMute}
        />

        {/* Video Toggle - Always Visible in Video */}
        {isVideo && (
          <CallControlButton
            icon={cameraOff ? VideoOff : Video}
            label={cameraOff ? "Start video" : "Stop video"}
            variant={cameraOff ? "active" : "glass"}
            onClick={onToggleCamera}
          />
        )}

        {/* Speaker Toggle - Always Visible */}
        <CallControlButton
          icon={speakerOn ? Volume2 : VolumeX}
          label={speakerOn ? "Speaker on" : "Speaker"}
          variant={speakerOn ? "active" : "glass"}
          onClick={() => onToggleSpeaker(remoteRef.current)}
        />

        {/* Mobile More Options Button - Visible only on < sm */}
        <CallControlButton
          icon={MoreHorizontal}
          label="More"
          variant={showMoreMobileMenu ? "active" : "glass"}
          className="flex sm:hidden"
          onClick={() => setShowMoreMobileMenu((prev) => !prev)}
        />

        {/* Secondary controls: hidden on mobile (< sm), visible on sm+ */}
        {/* Screen Share (when isVideo) */}
        {isVideo && (
          <CallControlButton
            icon={isScreenSharing ? ScreenShareOff : ScreenShare}
            label={
              screenShareState === "REQUESTING_PERMISSION"
                ? "Requesting..."
                : screenShareState === "STARTING"
                  ? "Starting..."
                  : isScreenSharing
                    ? "Stop sharing"
                    : "Share screen"
            }
            variant={isScreenSharing ? "active" : "glass"}
            className="hidden sm:flex"
            onClick={onToggleScreenShare}
            disabled={
              screenShareState === "REQUESTING_PERMISSION" ||
              screenShareState === "STARTING" ||
              screenShareState === "STOPPING"
            }
          />
        )}

        {/* Video Effects (when isVideo) */}
        {isVideo && (
          <CallControlButton
            icon={Sparkles}
            label="Effects"
            variant={
              backgroundEffect !== "none" ||
              videoFilter !== "none" ||
              arEffect !== "none"
                ? "active"
                : "glass"
            }
            className="hidden sm:flex"
            onClick={() => setShowEffectsModal(true)}
          />
        )}

        {/* Live Emoji Reactions */}
        <CallControlButton
          icon={Smile}
          label="React"
          variant={showReactionsBar ? "active" : "glass"}
          className="hidden sm:flex"
          onClick={() => setShowReactionsBar((prev) => !prev)}
        />

        {/* Live AI Captions */}
        <CallControlButton
          icon={Subtitles}
          label="Captions"
          variant={captionsEnabled ? "active" : "glass"}
          className="hidden sm:flex"
          onClick={() => setShowCaptionsModal(true)}
        />

        {/* Camera & Resolution Settings (when isVideo) */}
        {isVideo && (
          <CallControlButton
            icon={Settings2}
            label="Camera"
            variant="glass"
            className="hidden sm:flex"
            onClick={() => setShowCameraModal(true)}
          />
        )}

        {/* Picture-in-Picture (when isVideo) */}
        {isVideo && (
          <CallControlButton
            icon={PictureInPicture2}
            label={isPipActive ? "In PiP" : "PiP"}
            variant={isPipActive ? "active" : "glass"}
            className="hidden sm:flex"
            onClick={isPipActive ? onReturnFromPip : onRequestPip}
          />
        )}

        {/* Audio Device Selector Button */}
        {audioInputs.length > 1 || audioOutputs.length > 1 ? (
          <CallControlButton
            icon={Headphones}
            label="Audio device"
            variant="glass"
            className="hidden sm:flex"
            onClick={() => setShowDeviceModal(true)}
          />
        ) : null}

        {/* Hold / Resume Button */}
        <CallControlButton
          icon={isHeld ? Play : Pause}
          label={
            isHeld
              ? !canResume
                ? "On Hold"
                : isHoldTransitioning
                  ? "Resuming…"
                  : "Resume"
              : isHoldTransitioning
                ? "Holding…"
                : "Hold"
          }
          variant={isHeld ? (canResume ? "active" : "glass") : "glass"}
          disabled={isHoldTransitioning || (isHeld && !canResume)}
          className="hidden sm:flex"
          title={
            isHeld && !canResume
              ? "Only the participant who placed this call on hold can resume it."
              : isHeld
                ? "Resume call"
                : "Hold call"
          }
          onClick={isHeld ? onResume : onHold}
        />

        {/* End Call Button - Always Visible */}
        <CallControlButton
          icon={PhoneOff}
          label="End"
          variant="danger"
          size="lg"
          onClick={onEnd}
        />
      </CallActionBar>

      {/* Mobile More Actions Bottom Sheet (< sm screens) */}
      <AnimatePresence>
        {showMoreMobileMenu && (
          <div className="fixed inset-0 z-[115] flex items-end sm:hidden bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={CALL_SPRING}
              className="w-full rounded-t-3xl border-t border-white/[0.14] bg-[#121620]/95 p-5 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <span className="font-bold text-sm text-white/90">
                  More Call Options
                </span>
                <button
                  type="button"
                  onClick={() => setShowMoreMobileMenu(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white min-w-[32px] min-h-[32px] cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                {/* 1. Screen Share */}
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMobileMenu(false);
                      onToggleScreenShare();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                  >
                    <div
                      className={`flex size-11 items-center justify-center rounded-full ${isScreenSharing ? "bg-primary text-primary-content" : "bg-white/10 text-white"}`}
                    >
                      {isScreenSharing ? (
                        <ScreenShareOff className="size-5" />
                      ) : (
                        <ScreenShare className="size-5" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                      {isScreenSharing ? "Stop Share" : "Share"}
                    </span>
                  </button>
                )}

                {/* 2. Video Effects */}
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMobileMenu(false);
                      setShowEffectsModal(true);
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                  >
                    <div
                      className={`flex size-11 items-center justify-center rounded-full ${
                        backgroundEffect !== "none" ||
                        videoFilter !== "none" ||
                        arEffect !== "none"
                          ? "bg-primary text-primary-content"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <Sparkles className="size-5" />
                    </div>
                    <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                      Effects
                    </span>
                  </button>
                )}

                {/* 3. Emoji Reactions */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMobileMenu(false);
                    setShowReactionsBar(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                >
                  <div className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
                    <Smile className="size-5" />
                  </div>
                  <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                    React
                  </span>
                </button>

                {/* 4. Live Captions */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMobileMenu(false);
                    setShowCaptionsModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                >
                  <div
                    className={`flex size-11 items-center justify-center rounded-full ${captionsEnabled ? "bg-primary text-primary-content" : "bg-white/10 text-white"}`}
                  >
                    <Subtitles className="size-5" />
                  </div>
                  <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                    Captions
                  </span>
                </button>

                {/* 5. Camera Settings */}
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMobileMenu(false);
                      setShowCameraModal(true);
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
                      <Settings2 className="size-5" />
                    </div>
                    <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                      Camera
                    </span>
                  </button>
                )}

                {/* 6. Picture in Picture */}
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMobileMenu(false);
                      if (isPipActive) {
                        onReturnFromPip();
                      } else {
                        onRequestPip();
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                  >
                    <div
                      className={`flex size-11 items-center justify-center rounded-full ${isPipActive ? "bg-primary text-primary-content" : "bg-white/10 text-white"}`}
                    >
                      <PictureInPicture2 className="size-5" />
                    </div>
                    <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                      PiP
                    </span>
                  </button>
                )}

                {/* 7. Audio Device */}
                {(audioInputs.length > 1 || audioOutputs.length > 1) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMobileMenu(false);
                      setShowDeviceModal(true);
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] cursor-pointer"
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
                      <Headphones className="size-5" />
                    </div>
                    <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                      Audio
                    </span>
                  </button>
                )}

                {/* 8. Hold / Resume */}
                <button
                  type="button"
                  disabled={isHoldTransitioning || (isHeld && !canResume)}
                  onClick={() => {
                    setShowMoreMobileMenu(false);
                    if (isHeld) onResume();
                    else onHold();
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.06] active:bg-white/[0.15] transition-colors min-h-[64px] disabled:opacity-40 cursor-pointer"
                >
                  <div
                    className={`flex size-11 items-center justify-center rounded-full ${isHeld ? "bg-amber-500 text-white" : "bg-white/10 text-white"}`}
                  >
                    {isHeld ? (
                      <Play className="size-5" />
                    ) : (
                      <Pause className="size-5" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-white/80 line-clamp-1">
                    {isHeld ? "Resume" : "Hold"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audio Devices Modal */}
      <AudioDeviceModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        audioInputs={audioInputs}
        audioOutputs={audioOutputs}
        selectedAudioInput={selectedAudioInput}
        selectedAudioOutput={selectedAudioOutput}
        onSelectInput={(deviceId) => {
          onSwitchAudioInput(deviceId);
          setShowDeviceModal(false);
        }}
        onSelectOutput={(deviceId) => {
          onSwitchAudioOutput(deviceId, remoteRef.current);
          setShowDeviceModal(false);
        }}
        supportsSetSinkId={supportsSetSinkId}
      />
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  CallUI (mount once in App)                                        */
/* ------------------------------------------------------------------ */
export default function CallUI() {
  const {
    status,
    peer,
    type,
    error,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    peerMedia,
    seconds,
    isHeld,
    heldBy,
    isHoldOwner,
    canResume,
    holdNotice,
    isHoldTransitioning,
    waitingCall,
    networkQuality,
    stats,
    audioInputs,
    audioOutputs,
    selectedAudioInput,
    selectedAudioOutput,
    supportsSetSinkId,
    speakerOn,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    holdCall,
    resumeCall,
    acceptWaitingCall,
    rejectWaitingCall,
    switchAudioInput,
    switchAudioOutput,
    silenced,
    // Video Calling Extensions
    resolutionPreset,
    setResolution,
    lowBandwidthMode,
    toggleLowBandwidthMode,
    backgroundEffect,
    videoFilter,
    arEffect,
    setVideoEffects,
    processorStatus,
    processorMessage,
    isScreenSharing,
    peerScreenSharing,
    screenShareState,
    screenStream,
    hasScreenAudio,
    toggleScreenShare,
    incomingReactions,
    sendReaction,
    captionsEnabled,
    captionSourceLang,
    captionTargetLang,
    activeCaption,
    captionHistory,
    toggleCaptions,
    setCaptionLanguages,
    exportTranscript,
    clearTranscript,
    videoInputs,
    selectedVideoInput,
    facingMode,
    mirrorLocal,
    supportsZoom,
    zoomLevel,
    supportsTorch,
    torchOn,
    switchVideoInput,
    toggleFacingMode,
    toggleMirrorLocal,
    setZoom,
    toggleTorch,
    pipWindowRef: contextPipWindowRef,
    setIsPipActive: contextSetIsPipActive,
  } = useCall();

  const users = useChatStore((s) => s.users);
  const displayName = peer?.fullName || peer?.name || "User";
  const avatar =
    peer?.avatar ||
    users?.find?.((u) => String(u.id) === String(peer?.id))?.avatar ||
    "";
  const isVideo = type === "video";

  const [minimized, setMinimized] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipContainer, setPipContainer] = useState(null);
  const pipWindowRef = useRef(null);

  // Auto-close PiP when call ends or unmounts
  useEffect(() => {
    if (status === "ended" || status === "idle") {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.close();
        } catch {
          /* ignore close errors */
        }
      }
      pipWindowRef.current = null;
      if (contextPipWindowRef) contextPipWindowRef.current = null;
      setPipContainer(null);
      setIsPipActive(false);
      if (contextSetIsPipActive) contextSetIsPipActive(false);
    }
  }, [status, contextPipWindowRef, contextSetIsPipActive]);

  const handleReturnToFullCall = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        window.focus();
        pipWindowRef.current.close();
      } catch {
        /* ignore close errors */
      }
    }
    pipWindowRef.current = null;
    if (contextPipWindowRef) contextPipWindowRef.current = null;
    setPipContainer(null);
    setIsPipActive(false);
    if (contextSetIsPipActive) contextSetIsPipActive(false);
    setMinimized(false);
  }, [contextPipWindowRef, contextSetIsPipActive]);

  const handleRequestPip = useCallback(async () => {
    // 1. Native Document Picture-in-Picture API
    if (
      typeof window !== "undefined" &&
      window.documentPictureInPicture?.requestWindow
    ) {
      try {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.focus();
          return;
        }

        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 420,
          height: 280,
        });
        pipWindowRef.current = pipWindow;
        if (contextPipWindowRef) contextPipWindowRef.current = pipWindow;

        pipWindow.document.title = `${displayName} — Chatty Video Call`;
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.padding = "0";
        pipWindow.document.body.style.overflow = "hidden";
        pipWindow.document.body.style.backgroundColor = "#07090e";
        pipWindow.document.body.style.color = "#ffffff";
        pipWindow.document.body.style.fontFamily =
          document.body.style.fontFamily ||
          "system-ui, -apple-system, sans-serif";

        // Inject base styling and control transitions into PiP document head
        const baseStyle = pipWindow.document.createElement("style");
        baseStyle.textContent = `
          * { box-sizing: border-box; }
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #07090e; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .pip-control-btn { transition: transform 0.15s ease, background-color 0.15s ease; outline: none; }
          .pip-control-btn:hover { transform: scale(1.08); }
          .pip-control-btn:active { transform: scale(0.95); }
        `;
        pipWindow.document.head.appendChild(baseStyle);

        // Copy all stylesheets from main window into PiP window
        [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach(
          (node) => {
            try {
              pipWindow.document.head.appendChild(node.cloneNode(true));
            } catch (e) {
              console.warn("[pip] style copy failed:", e);
            }
          },
        );

        // Create container for React Portal
        const container = pipWindow.document.createElement("div");
        container.id = "pip-video-root";
        container.style.width = "100%";
        container.style.height = "100%";
        pipWindow.document.body.appendChild(container);

        setPipContainer(container);
        setIsPipActive(true);
        if (contextSetIsPipActive) contextSetIsPipActive(true);

        pipWindow.addEventListener("pagehide", () => {
          setPipContainer(null);
          setIsPipActive(false);
          if (contextSetIsPipActive) contextSetIsPipActive(false);
          pipWindowRef.current = null;
          if (contextPipWindowRef) contextPipWindowRef.current = null;
        });

        return;
      } catch (err) {
        console.warn(
          "[call] documentPictureInPicture request failed, using in-app fallback:",
          err,
        );
      }
    }

    // 2. Fallback for browsers without Document Picture-in-Picture:
    // activate in-app floating overlay
    setMinimized(true);
  }, [displayName, contextPipWindowRef, contextSetIsPipActive]);

  // Auto-expand if a new call starts
  useEffect(() => {
    if (status === "ringing" || status === "calling") {
      setMinimized(false);
    }
  }, [status]);

  return (
    <MotionConfig reducedMotion="user">
      <CallToast message={error} />

      {/* Call Waiting Banner */}
      <AnimatePresence>
        {waitingCall && (
          <CallWaitingBanner
            key="call-waiting"
            waitingCall={waitingCall}
            onAccept={acceptWaitingCall}
            onReject={rejectWaitingCall}
          />
        )}
      </AnimatePresence>

      {/* Compact Floating In-App Banner when browsing Chatty during active PiP */}
      <AnimatePresence>
        {minimized &&
          isPipActive &&
          (status === "connecting" ||
            status === "connected" ||
            status === "reconnecting") && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-2 rounded-full bg-[#121620]/90 border border-white/15 shadow-2xl backdrop-blur-md text-white text-xs select-none"
            >
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-white/90">
                  {displayName}
                </span>
                <span className="text-white/40">•</span>
                <span className="font-mono text-white/70">
                  {formatCallTimer(seconds)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 border-l border-white/15 pl-2">
                <button
                  type="button"
                  onClick={() => setMinimized(false)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-medium transition-colors cursor-pointer"
                  title="View call manager"
                >
                  Call Details
                </button>
                <button
                  type="button"
                  onClick={handleReturnToFullCall}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary hover:brightness-110 text-primary-content text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
                  title="Return to full call screen"
                >
                  <Maximize2 className="size-3" />
                  <span>Return</span>
                </button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Minimized Floating View (Picture-in-Picture Fallback) */}
      <AnimatePresence>
        {minimized &&
          !isPipActive &&
          (status === "connecting" ||
            status === "connected" ||
            status === "reconnecting") && (
            <MinimizedCallView
              key="minimized-1to1"
              title={displayName}
              avatar={avatar}
              isVideo={isVideo}
              isScreenSharing={isScreenSharing || peerScreenSharing}
              peerScreenSharing={peerScreenSharing}
              stream={
                peerScreenSharing
                  ? remoteStream
                  : isScreenSharing
                    ? screenStream || localStream
                    : remoteStream || localStream
              }
              localStream={localStream}
              cameraOff={cameraOff}
              seconds={seconds}
              muted={muted}
              networkQuality={networkQuality}
              isHeld={isHeld}
              heldBy={heldBy}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onExpand={() => setMinimized(false)}
              onEnd={endCall}
            />
          )}
      </AnimatePresence>

      {/* Full-screen Call Views */}
      <AnimatePresence mode="wait">
        {!minimized && status === "ringing" && (
          <IncomingCall
            key="incoming"
            peer={peer}
            avatar={avatar}
            isVideo={isVideo}
            silenced={silenced}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}

        {!minimized && status === "calling" && (
          <OutgoingCall
            key="outgoing"
            peer={peer}
            avatar={avatar}
            isVideo={isVideo}
            onCancel={endCall}
            onMinimize={() => setMinimized(true)}
          />
        )}

        {!minimized &&
          (status === "connecting" ||
            status === "connected" ||
            status === "reconnecting") && (
            <ActiveCall
              key="active"
              status={status}
              peer={peer}
              avatar={avatar}
              isVideo={isVideo}
              localStream={localStream}
              remoteStream={remoteStream}
              muted={muted}
              cameraOff={cameraOff}
              peerMedia={peerMedia}
              seconds={seconds}
              networkQuality={networkQuality}
              stats={stats}
              isHeld={isHeld}
              heldBy={heldBy}
              isHoldOwner={isHoldOwner}
              canResume={canResume}
              holdNotice={holdNotice}
              isHoldTransitioning={isHoldTransitioning}
              audioInputs={audioInputs}
              audioOutputs={audioOutputs}
              selectedAudioInput={selectedAudioInput}
              selectedAudioOutput={selectedAudioOutput}
              supportsSetSinkId={supportsSetSinkId}
              speakerOn={speakerOn}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onToggleSpeaker={toggleSpeaker}
              onHold={holdCall}
              onResume={resumeCall}
              onSwitchAudioInput={switchAudioInput}
              onSwitchAudioOutput={switchAudioOutput}
              onEnd={endCall}
              onMinimize={() => setMinimized(true)}
              // Video Calling Extensions
              resolutionPreset={resolutionPreset}
              onSelectResolution={setResolution}
              lowBandwidthMode={lowBandwidthMode}
              onToggleLowBandwidth={toggleLowBandwidthMode}
              backgroundEffect={backgroundEffect}
              videoFilter={videoFilter}
              arEffect={arEffect}
              onApplyEffects={setVideoEffects}
              processorStatus={processorStatus}
              processorMessage={processorMessage}
              isScreenSharing={isScreenSharing}
              peerScreenSharing={peerScreenSharing}
              screenShareState={screenShareState}
              hasScreenAudio={hasScreenAudio}
              onToggleScreenShare={toggleScreenShare}
              incomingReactions={incomingReactions}
              onSendReaction={sendReaction}
              captionsEnabled={captionsEnabled}
              captionSourceLang={captionSourceLang}
              captionTargetLang={captionTargetLang}
              activeCaption={activeCaption}
              captionHistory={captionHistory}
              onToggleCaptions={toggleCaptions}
              onSelectLanguages={setCaptionLanguages}
              onExportTranscript={exportTranscript}
              onClearTranscript={clearTranscript}
              videoInputs={videoInputs}
              selectedVideoInput={selectedVideoInput}
              onSwitchVideoInput={switchVideoInput}
              facingMode={facingMode}
              onToggleFacingMode={toggleFacingMode}
              mirrorLocal={mirrorLocal}
              onToggleMirrorLocal={toggleMirrorLocal}
              supportsZoom={supportsZoom}
              zoomLevel={zoomLevel}
              onSetZoom={setZoom}
              supportsTorch={supportsTorch}
              torchOn={torchOn}
              onToggleTorch={toggleTorch}
              isPipActive={isPipActive}
              onReturnFromPip={handleReturnToFullCall}
              onRequestPip={handleRequestPip}
            />
          )}
      </AnimatePresence>

      {/* Native Document Picture-in-Picture Portal */}
      {isPipActive &&
        pipContainer &&
        createPortal(
          <PipVideoCall
            title={displayName}
            avatar={avatar}
            isVideo={isVideo}
            remoteStream={remoteStream}
            localStream={localStream}
            peerMedia={peerMedia}
            peerScreenSharing={peerScreenSharing}
            isScreenSharing={isScreenSharing}
            screenStream={screenStream}
            cameraOff={cameraOff}
            muted={muted}
            seconds={seconds}
            networkQuality={networkQuality}
            isHeld={isHeld}
            holdNotice={holdNotice}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onReturnToFullCall={handleReturnToFullCall}
            onEndCall={endCall}
            isNativePip={true}
          />,
          pipContainer,
        )}
    </MotionConfig>
  );
}
