import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCall } from "../../context/CallContext";
import { useChatStore } from "../../store/useChatStore";

import { CALL_SPRING } from "./common/callTokens";
import CallAvatar from "./common/CallAvatar";
import CallControlButton from "./common/CallControlButton";
import CallHeader from "./common/CallHeader";
import CallActionBar from "./common/CallActionBar";
import { CallTypeBadge, CallPeerMutedBadge } from "./common/CallStatusBadge";
import MinimizedCallView from "./common/MinimizedCallView";
import CallToast from "./common/CallToast";

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
/*  Incoming 1:1 Call Card                                            */
/* ------------------------------------------------------------------ */
const IncomingCall = ({ peer, avatar, isVideo, silenced, onAccept, onReject }) => {
  const displayName = peer?.fullName || peer?.name || "Someone";

  return (
    <motion.div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Incoming call from ${displayName}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl"
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
        className="relative w-[min(94vw,23rem)] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-neutral/95 via-neutral to-neutral/90 p-7 text-center text-white shadow-2xl ring-1 ring-white/10"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative">
          <CallTypeBadge
            isVideo={isVideo}
            text={`Incoming ${isVideo ? "video" : "audio"} call`}
            className="mx-auto mb-4"
          />

          {silenced && (
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-warning/20 border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">
              <span>Silenced (Unknown Caller)</span>
            </div>
          )}

          <div className="my-6 flex justify-center">
            <CallAvatar
              src={avatar}
              name={displayName}
              size="xl"
              pulse
              pulseColor="bg-primary/30"
            />
          </div>

          <h2 className="truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
            {displayName}
          </h2>
          <p className="mt-1 flex items-center justify-center text-sm font-medium text-white/70">
            is calling you
            <CallingDots />
          </p>

          <div className="mt-8 flex items-start justify-center gap-10">
            <CallControlButton
              icon={PhoneOff}
              label="Decline"
              variant="danger"
              size="lg"
              onClick={onReject}
            />
            <CallControlButton
              icon={isVideo ? Video : Phone}
              label="Accept"
              variant="success"
              size="lg"
              pulse
              pulseColor="bg-success/60"
              onClick={onAccept}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-[#0b0d12] via-neutral to-black px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white"
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
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
            title="Minimize"
          >
            <PhoneOff className="size-4 rotate-90" />
          </button>
        )}
      </div>

      {/* Center Avatar & Identity */}
      <div className="relative flex flex-col items-center my-auto">
        <CallAvatar
          src={avatar}
          name={displayName}
          size="2xl"
          pulse
          pulseColor="bg-primary/25"
        />

        <h2 className="mt-8 max-w-[85vw] truncate text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          {displayName}
        </h2>
        <p className="mt-2 flex items-center text-sm font-medium text-white/70">
          Ringing
          <CallingDots />
        </p>
      </div>

      {/* Bottom End Button */}
      <div className="relative">
        <CallControlButton
          icon={PhoneOff}
          label="Cancel"
          variant="danger"
          size="xl"
          onClick={onCancel}
        />
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Active Call (Connecting + Connected)                              */
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
  onToggleMute,
  onToggleCamera,
  onEnd,
  onMinimize,
}) => {
  const stageRef = useRef(null);
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const displayName = peer?.fullName || peer?.name || "User";

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play?.().catch(() => {});
  }, [remoteStream]);

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
  const showRemoteVideo = isVideo && peerMedia.video && Boolean(remoteStream);

  return (
    <motion.div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${displayName}`}
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-[#0a0c10] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#11141c] via-[#0a0c10] to-black" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />

      {/* Remote Media (always mounted so audio track is never interrupted) */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={
          showRemoteVideo
            ? "absolute inset-0 size-full bg-black object-cover"
            : "pointer-events-none absolute size-px opacity-0"
        }
      />

      {/* Audio-only or Camera-off Avatar View */}
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10">
          <CallAvatar
            src={avatar}
            name={displayName}
            size="2xl"
            pulse={connected && peerMedia.audio}
            pulseColor="bg-success/30"
          />

          <h2 className="mt-8 max-w-[85vw] truncate text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            {displayName}
          </h2>

          {isVideo && connected && !peerMedia.video && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md border border-white/10">
              <VideoOff className="size-3.5 text-warning" />
              <span>Camera is off</span>
            </p>
          )}
        </div>
      )}

      {/* Standardized Header */}
      <CallHeader
        title={displayName}
        isVideo={isVideo}
        connected={connected}
        connecting={status === "connecting"}
        seconds={seconds}
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
          className="absolute right-4 top-20 z-30 h-44 w-32 sm:h-56 sm:w-40 cursor-grab overflow-hidden rounded-2xl sm:rounded-3xl border border-white/25 bg-neutral/95 shadow-2xl ring-1 ring-black/40 active:cursor-grabbing"
        >
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className={`size-full -scale-x-100 object-cover ${
              cameraOff ? "invisible" : ""
            }`}
          />
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral p-2 text-center text-xs font-medium text-white/70">
              <VideoOff className="size-5 text-warning" />
              <span>Camera off</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Standardized Action Bar Dock */}
      <CallActionBar>
        <CallControlButton
          icon={muted ? MicOff : Mic}
          label={muted ? "Unmute" : "Mute"}
          variant={muted ? "active" : "glass"}
          onClick={onToggleMute}
        />

        {isVideo && (
          <CallControlButton
            icon={cameraOff ? VideoOff : Video}
            label={cameraOff ? "Start video" : "Stop video"}
            variant={cameraOff ? "active" : "glass"}
            onClick={onToggleCamera}
          />
        )}

        <CallControlButton
          icon={PhoneOff}
          label="End"
          variant="danger"
          size="lg"
          onClick={onEnd}
        />
      </CallActionBar>
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
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    silenced,
  } = useCall();

  const [minimized, setMinimized] = useState(false);

  // Auto-expand if a new call starts
  useEffect(() => {
    if (status === "ringing" || status === "calling") {
      setMinimized(false);
    }
  }, [status]);

  const users = useChatStore((s) => s.users);
  const avatar =
    peer?.avatar ||
    users?.find?.((u) => String(u.id) === String(peer?.id))?.avatar ||
    "";

  const isVideo = type === "video";
  const displayName = peer?.fullName || peer?.name || "User";

  return (
    <MotionConfig reducedMotion="user">
      <CallToast message={error} />

      {/* Minimized Floating View (Picture-in-Picture) */}
      <AnimatePresence>
        {minimized && (status === "connecting" || status === "connected") && (
          <MinimizedCallView
            key="minimized-1to1"
            title={displayName}
            avatar={avatar}
            isVideo={isVideo}
            stream={remoteStream || localStream}
            seconds={seconds}
            muted={muted}
            onToggleMute={toggleMute}
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

        {!minimized && (status === "connecting" || status === "connected") && (
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
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onEnd={endCall}
            onMinimize={() => setMinimized(true)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
