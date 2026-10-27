import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { useChatStore } from "../../store/useChatStore";

const SPRING = { type: "spring", stiffness: 380, damping: 30 };

const fmt = (total) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/* ------------------------------------------------------------------ */
/*  Ringtone (public/ringtone.mp3)                                     */
/* ------------------------------------------------------------------ */
const Ringtone = ({ play }) => {
  const ref = useRef(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (play) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [play]);

  return <audio ref={ref} src="/didi.mp3" loop preload="auto" />;
};

/* ------------------------------------------------------------------ */
/*  Avatar with initials fallback                                      */
/* ------------------------------------------------------------------ */
const Avatar = ({ src, name, className = "size-28 text-4xl" }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={`rounded-full border-2 border-white/20 bg-base-200 object-cover shadow-xl ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-primary to-secondary font-semibold text-primary-content shadow-xl ${className}`}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Pulsing rings behind the avatar                                    */
/* ------------------------------------------------------------------ */
const PulseRings = ({ active = true, children }) => (
  <div className="relative flex items-center justify-center">
    {active &&
      [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary/25"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.8,
          }}
        />
      ))}
    <div className="relative">{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Animated "..." for calling state                                   */
/* ------------------------------------------------------------------ */
const Dots = () => (
  <span className="ml-0.5 inline-flex gap-0.5" aria-hidden="true">
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
/*  Round control button                                               */
/* ------------------------------------------------------------------ */
const ControlButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "glass", // glass | active | danger | success
  size = "md",
  pulse = false,
}) => {
  const variants = {
    glass: "bg-white/15 text-white hover:bg-white/25",
    active: "bg-white text-neutral hover:bg-white/90",
    danger: "bg-error text-error-content hover:brightness-110",
    success: "bg-success text-success-content hover:brightness-110",
  };
  const sizes = {
    md: "size-14 sm:size-16",
    lg: "size-16 sm:size-[72px]",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {pulse && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-success/50"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.button
          type="button"
          onClick={onClick}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.92 }}
          transition={SPRING}
          aria-label={label}
          title={label}
          className={`relative flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${variants[variant]} ${sizes[size]}`}
        >
          <Icon className="size-6" />
        </motion.button>
      </div>
      <span className="text-[11px] font-medium text-white/80">{label}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Incoming call card                                                 */
/* ------------------------------------------------------------------ */
const IncomingCall = ({ peer, avatar, isVideo, onAccept, onReject }) => (
  <motion.div
    role="alertdialog"
    aria-modal="true"
    aria-label={`Incoming call from ${peer?.name}`}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={SPRING}
      className="relative w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral to-neutral/95 p-7 text-center text-neutral-content shadow-2xl"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

      <div className="relative">
        <div className="mx-auto mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
          {isVideo ? (
            <Video className="size-3.5" />
          ) : (
            <Phone className="size-3.5" />
          )}
          Incoming {isVideo ? "video" : "audio"} call
        </div>

        <div className="my-8 flex justify-center">
          <PulseRings>
            <Avatar
              src={avatar}
              name={peer?.name}
              className="size-28 text-4xl"
            />
          </PulseRings>
        </div>

        <h2 className="truncate text-xl font-semibold tracking-tight text-white">
          {peer?.name}
        </h2>
        <p className="mt-1 flex items-center justify-center text-sm text-white/60">
          is calling you
          <Dots />
        </p>

        <div className="mt-9 flex items-start justify-center gap-10">
          <ControlButton
            icon={PhoneOff}
            label="Decline"
            variant="danger"
            size="lg"
            onClick={onReject}
          />
          <ControlButton
            icon={isVideo ? Video : Phone}
            label="Accept"
            variant="success"
            size="lg"
            pulse
            onClick={onAccept}
          />
        </div>
      </div>
    </motion.div>
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  Outgoing "Calling…" screen                                         */
/* ------------------------------------------------------------------ */
const OutgoingCall = ({ peer, avatar, isVideo, onCancel }) => (
  <motion.div
    role="dialog"
    aria-modal="true"
    aria-label={`Calling ${peer?.name}`}
    className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-neutral via-neutral to-black px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))] text-white"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    <div className="pointer-events-none absolute left-1/2 top-1/4 size-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

    <div className="relative text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
        {isVideo ? (
          <Video className="size-3.5" />
        ) : (
          <Phone className="size-3.5" />
        )}
        {isVideo ? "Video call" : "Audio call"}
      </p>
    </div>

    <div className="relative flex flex-col items-center">
      <PulseRings>
        <Avatar src={avatar} name={peer?.name} className="size-32 text-5xl" />
      </PulseRings>
      <h2 className="mt-8 max-w-[80vw] truncate text-2xl font-semibold tracking-tight">
        {peer?.name}
      </h2>
      <p className="mt-1.5 flex items-center text-sm text-white/60">
        Calling
        <Dots />
      </p>
    </div>

    <div className="relative">
      <ControlButton
        icon={PhoneOff}
        label="Cancel"
        variant="danger"
        size="lg"
        onClick={onCancel}
      />
    </div>
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  Active call (connecting + connected)                               */
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
}) => {
  const stageRef = useRef(null);
  const remoteRef = useRef(null);
  const localRef = useRef(null);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play?.().catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream;
  }, [localStream, isVideo]);

  const connected = status === "connected";
  const showRemoteVideo = isVideo && peerMedia.video && Boolean(remoteStream);

  return (
    <motion.div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${peer?.name}`}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#0b0d12] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* backdrop for audio / camera-off state */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neutral via-[#0b0d12] to-black" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />

      {/* remote media: always mounted so audio never drops */}
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

      {/* avatar when there is no remote video */}
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <PulseRings active={connected && peerMedia.audio}>
            <Avatar
              src={avatar}
              name={peer?.name}
              className="size-32 text-5xl sm:size-36"
            />
          </PulseRings>
          <h2 className="mt-8 max-w-[80vw] truncate text-2xl font-semibold tracking-tight">
            {peer?.name}
          </h2>
          {isVideo && connected && !peerMedia.video && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/60">
              <VideoOff className="size-4" /> Camera is off
            </p>
          )}
        </div>
      )}

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">
            {peer?.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            {connected ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
                  <span className="relative size-2 rounded-full bg-success" />
                </span>
                <span className="tabular-nums">{fmt(seconds)}</span>
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Connecting…
              </>
            )}
          </p>
        </div>

        <AnimatePresence>
          {connected && !peerMedia.audio && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-md"
            >
              <MicOff className="size-3.5" />
              {peer?.name?.split(" ")[0]} is muted
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {isVideo && (
        <motion.div
          drag
          dragConstraints={stageRef}
          dragElastic={0.12}
          dragMomentum={false}
          whileDrag={{ scale: 1.04 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className="absolute right-3 top-20 z-20 h-40 w-28 cursor-grab overflow-hidden rounded-2xl border border-white/25 bg-neutral shadow-2xl active:cursor-grabbing sm:right-6 sm:top-24 sm:h-52 sm:w-36"
        >
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="size-full -scale-x-100 object-cover"
          />
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-neutral text-xs text-white/70">
              <VideoOff className="size-5" />
              Camera off
            </div>
          )}
        </motion.div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-16">
        <div className="flex items-start gap-5 rounded-[2rem] border border-white/10 bg-white/10 px-6 py-4 shadow-2xl backdrop-blur-xl sm:gap-7 sm:px-8">
          <ControlButton
            icon={muted ? MicOff : Mic}
            label={muted ? "Unmute" : "Mute"}
            variant={muted ? "active" : "glass"}
            onClick={onToggleMute}
          />
          {isVideo && (
            <ControlButton
              icon={cameraOff ? VideoOff : Video}
              label={cameraOff ? "Start video" : "Stop video"}
              variant={cameraOff ? "active" : "glass"}
              onClick={onToggleCamera}
            />
          )}
          <ControlButton
            icon={PhoneOff}
            label="End"
            variant="danger"
            onClick={onEnd}
          />
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Error toast (busy / offline / declined / permission denied ...)    */
/* ------------------------------------------------------------------ */
const CallToast = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        role="status"
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={SPRING}
        className="fixed left-1/2 top-4 z-[110] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content shadow-xl"
      >
        <PhoneOff className="size-4 shrink-0 text-error" />
        <span className="truncate">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ------------------------------------------------------------------ */
/*  CallUI (mount once in App)                                         */
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
  } = useCall();

  const users = useChatStore((s) => s.users);
  const avatar =
    peer?.avatar ||
    users?.find?.((u) => String(u.id) === String(peer?.id))?.avatar ||
    "";

  const isVideo = type === "video";

  return (
    <MotionConfig reducedMotion="user">
      <Ringtone play={status === "ringing"} />
      <CallToast message={error} />

      <AnimatePresence mode="wait">
        {status === "ringing" && (
          <IncomingCall
            key="incoming"
            peer={peer}
            avatar={avatar}
            isVideo={isVideo}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}

        {status === "calling" && (
          <OutgoingCall
            key="outgoing"
            peer={peer}
            avatar={avatar}
            isVideo={isVideo}
            onCancel={endCall}
          />
        )}

        {(status === "connecting" || status === "connected") && (
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
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
