import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useGroupCallStore } from "../../../store/useGroupCallStore";
import { useAuthStore } from "../../../store/useAuthStore";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const gridCols = (n) =>
  n <= 1
    ? "grid-cols-1"
    : n === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : n <= 4
        ? "grid-cols-2"
        : "grid-cols-2 lg:grid-cols-3";

const CallTimer = ({ since }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);

  if (!since) return null;
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(sec / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const s = String(sec % 60).padStart(2, "0");
  return (
    <span className="tabular-nums">{h ? `${h}:${m}:${s}` : `${m}:${s}`}</span>
  );
};

const Tile = memo(function Tile({
  name,
  avatar,
  stream,
  self,
  hasVideo,
  camOn,
  micOn,
  connecting,
  failed,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== (stream || null)) el.srcObject = stream || null;
  }, [stream]);

  const showVideo = hasVideo && camOn;

  return (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-neutral-content/10 ring-1 ring-white/10">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={self}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
          self ? "-scale-x-100" : ""
        } ${showVideo ? "opacity-100" : "opacity-0"}`}
      />

      {!showVideo && (
        <div className="absolute inset-0 grid place-items-center">
          <img
            src={avatarSrc(avatar)}
            alt=""
            className="size-20 sm:size-28 rounded-full object-cover ring-2 ring-white/20"
          />
        </div>
      )}

      {(connecting || failed) && (
        <div className="absolute inset-x-0 top-2 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
            {failed ? (
              "Connection lost"
            ) : (
              <>
                <Loader2 className="size-3 animate-spin" />
                Connecting…
              </>
            )}
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
          {!micOn && <MicOff className="size-3 shrink-0 text-error" />}
          <span className="truncate">{self ? "You" : name}</span>
        </span>
      </div>
    </div>
  );
});

const CtrlBtn = ({ onClick, off, danger, label, children }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`grid size-12 sm:size-14 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
      danger
        ? "bg-error text-error-content hover:brightness-110"
        : off
          ? "bg-white text-neutral"
          : "bg-white/15 text-white hover:bg-white/25"
    }`}
  >
    {children}
  </motion.button>
);

const GroupCallModal = () => {
  const status = useGroupCallStore((s) => s.status);
  const groupName = useGroupCallStore((s) => s.groupName);
  const type = useGroupCallStore((s) => s.type);
  const peers = useGroupCallStore((s) => s.peers);
  const local = useGroupCallStore((s) => s.localStream);
  const micOn = useGroupCallStore((s) => s.micOn);
  const camOn = useGroupCallStore((s) => s.camOn);
  const connectedAt = useGroupCallStore((s) => s.connectedAt);
  const toggleMic = useGroupCallStore((s) => s.toggleMic);
  const toggleCam = useGroupCallStore((s) => s.toggleCam);
  const leaveCall = useGroupCallStore((s) => s.leaveCall);
  const authUser = useAuthStore((s) => s.authUser);

  const list = Object.values(peers);
  const total = list.length + 1;
  const canUseCamera = Boolean(local?.getVideoTracks().length);

  const subtitle =
    list.length === 0 ? "Ringing…" : connectedAt ? null : "Connecting…";

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.div
          key="group-call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${type === "video" ? "Video" : "Voice"} call in ${groupName}`}
          className="fixed inset-0 z-[70] flex flex-col bg-neutral text-neutral-content"
        >
          {/* header */}
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">
                {groupName || "Group call"}
              </p>
              <p className="text-xs text-neutral-content/70">
                {subtitle || <CallTimer since={connectedAt} />}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs">
              {total} in call
            </span>
          </div>

          {/* grid */}
          <div
            className={`grid min-h-0 flex-1 auto-rows-fr gap-2 p-2 sm:gap-3 sm:p-4 ${gridCols(total)}`}
          >
            <Tile
              self
              name="You"
              avatar={authUser?.avatar}
              stream={local}
              hasVideo={canUseCamera}
              camOn={camOn}
              micOn={micOn}
            />
            {list.map((p) => (
              <Tile
                key={p.userId}
                name={p.fullName}
                avatar={p.avatar}
                stream={p.stream}
                hasVideo={Boolean(p.stream?.getVideoTracks().length)}
                camOn={p.video !== false}
                micOn={p.audio !== false}
                connecting={p.conn !== "connected" && p.conn !== "failed"}
                failed={p.conn === "failed"}
              />
            ))}
          </div>

          {/* controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <CtrlBtn
              onClick={toggleMic}
              off={!micOn}
              label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? (
                <Mic className="size-5" />
              ) : (
                <MicOff className="size-5" />
              )}
            </CtrlBtn>

            {type === "video" && (
              <CtrlBtn
                onClick={toggleCam}
                off={!camOn}
                label={camOn ? "Turn camera off" : "Turn camera on"}
              >
                {camOn ? (
                  <Video className="size-5" />
                ) : (
                  <VideoOff className="size-5" />
                )}
              </CtrlBtn>
            )}

            <CtrlBtn onClick={leaveCall} danger label="Leave call">
              <PhoneOff className="size-5" />
            </CtrlBtn>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupCallModal;
