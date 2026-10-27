import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Video, X } from "lucide-react";
import { useGroupCallStore } from "../../../store/useGroupCallStore";
import { useCall } from "../../../context/CallContext";

const avatarSrc = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const RING_SECONDS = 45;

const IncomingGroupCall = () => {
  const incoming = useGroupCallStore((s) => s.incoming);
  const status = useGroupCallStore((s) => s.status);
  const joinCall = useGroupCallStore((s) => s.joinCall);
  const dismiss = useGroupCallStore((s) => s.dismissIncoming);

  const { status: oneToOneStatus } = useCall();

  const visible =
    Boolean(incoming) && status === "idle" && oneToOneStatus === "idle";
  const callId = incoming?.callId;

  useEffect(() => {
    if (!visible) return;
    const audio = new Audio("/didi.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [visible, callId]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, RING_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [visible, callId, dismiss]);

  const isVideo = incoming?.type === "video";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={callId}
          role="alertdialog"
          aria-label="Incoming group call"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16, transition: { duration: 0.12 } }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] mx-auto w-auto max-w-md rounded-2xl border border-base-300 bg-base-100 p-3 shadow-2xl sm:left-auto sm:right-4 sm:mx-0 sm:w-96"
        >
          <div className="flex items-center gap-3">
            <img
              src={avatarSrc(incoming.starter?.avatar)}
              alt=""
              className="size-12 shrink-0 rounded-full border border-base-300 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">
                {incoming.groupName}
              </p>
              <p className="truncate text-sm text-base-content/60">
                {incoming.starter?.fullName || "Someone"} started a{" "}
                {isVideo ? "video" : "voice"} call
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={dismiss}
            >
              <X className="size-4" />
              Ignore
            </button>
            <button
              type="button"
              autoFocus
              className="btn btn-success btn-sm flex-1"
              onClick={() => joinCall(incoming.groupId, incoming.groupName)}
            >
              {isVideo ? (
                <Video className="size-4" />
              ) : (
                <Phone className="size-4" />
              )}
              Join
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingGroupCall;
