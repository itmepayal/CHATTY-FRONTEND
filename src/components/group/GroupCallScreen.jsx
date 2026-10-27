import { useCallback, useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useGroupCallStore } from "../../store/useGroupCallStore";
import useRingtone from "../../hooks/useRingtone";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const fmt = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const Tile = ({
  stream,
  name,
  avatar,
  muted = false,
  mirror = false,
  videoOn,
  audioOn = true,
  status,
}) => {
  const setRef = useCallback(
    (el) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream || null;
      if (stream) el.play?.().catch(() => {});
    },
    [stream],
  );

  const showVideo = Boolean(stream) && videoOn;

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral">
      <video
        ref={setRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 size-full object-cover ${
          mirror ? "-scale-x-100" : ""
        } ${showVideo ? "" : "invisible"}`}
      />

      {!showVideo && (
        <div className="absolute inset-0 grid place-items-center">
          <img
            src={avatarSrc(avatar)}
            alt=""
            className="size-20 rounded-full object-cover border border-white/20"
          />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-sm text-white">
        {!audioOn && <MicOff className="size-4 shrink-0 text-error" />}
        <span className="truncate">{name}</span>
        {status && (
          <span className="ml-auto shrink-0 text-xs opacity-70">{status}</span>
        )}
      </div>
    </div>
  );
};

const GroupCallScreen = () => {
  const status = useGroupCallStore((s) => s.status);
  const groupName = useGroupCallStore((s) => s.groupName);
  const type = useGroupCallStore((s) => s.type);
  const peers = useGroupCallStore((s) => s.peers);
  const localStream = useGroupCallStore((s) => s.localStream);
  const micOn = useGroupCallStore((s) => s.micOn);
  const camOn = useGroupCallStore((s) => s.camOn);
  const connectedAt = useGroupCallStore((s) => s.connectedAt);
  const toggleMic = useGroupCallStore((s) => s.toggleMic);
  const toggleCam = useGroupCallStore((s) => s.toggleCam);
  const leaveCall = useGroupCallStore((s) => s.leaveCall);

  const peerList = Object.values(peers);

  // caller hears a ring-back while waiting for the first person to join
  useRingtone(status === "calling" && peerList.length === 0, {
    pattern: "calling",
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!connectedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [connectedAt]);

  if (status === "idle") return null;

  const subtitle =
    status === "calling" && peerList.length === 0
      ? "Calling… waiting for others to join"
      : status === "connecting"
        ? "Connecting…"
        : connectedAt
          ? fmt(Math.max(0, Math.round((now - connectedAt) / 1000)))
          : "Connecting…";

  const total = peerList.length + 1;
  const cols =
    total <= 1
      ? "grid-cols-1"
      : total <= 4
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-base-300 text-base-content">
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 text-center">
        <p className="font-semibold truncate">{groupName || "Group call"}</p>
        <p className="text-sm text-base-content/60">
          {type === "video" ? "Video call" : "Voice call"} · {subtitle}
        </p>
      </div>

      <div
        className={`grid flex-1 min-h-0 auto-rows-fr content-center gap-2 overflow-y-auto p-3 ${cols}`}
      >
        <Tile
          stream={localStream}
          name="You"
          muted
          mirror
          videoOn={camOn}
          audioOn={micOn}
          avatar={null}
        />
        {peerList.map((p) => (
          <Tile
            key={p.userId}
            stream={p.stream}
            name={p.fullName}
            avatar={p.avatar}
            videoOn={p.video}
            audioOn={p.audio}
            status={
              p.conn === "connected"
                ? ""
                : p.conn === "failed"
                  ? "Failed"
                  : "Connecting…"
            }
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={toggleMic}
          className={`btn btn-circle ${micOn ? "btn-neutral" : "btn-error"}`}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </button>

        {type === "video" && (
          <button
            type="button"
            onClick={toggleCam}
            className={`btn btn-circle ${camOn ? "btn-neutral" : "btn-error"}`}
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
          >
            {camOn ? (
              <Video className="size-5" />
            ) : (
              <VideoOff className="size-5" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={leaveCall}
          className="btn btn-circle btn-error"
          aria-label="Leave call"
        >
          <PhoneOff className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default GroupCallScreen;
