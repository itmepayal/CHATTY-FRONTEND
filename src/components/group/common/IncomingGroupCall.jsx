import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useGroupCallStore } from "../../../store/useGroupCallStore";
import { useCall } from "../../../context/CallContext";

import { CALL_SPRING } from "../../Call/common/callTokens";
import CallAvatar from "../../Call/common/CallAvatar";
import { CallTypeBadge } from "../../Call/common/CallStatusBadge";
import soundService from "../../../services/soundService";

const RING_SECONDS = 45;

export default function IncomingGroupCall() {
  const incoming = useGroupCallStore((s) => s.incoming);
  const status = useGroupCallStore((s) => s.status);
  const joinCall = useGroupCallStore((s) => s.joinCall);
  const dismiss = useGroupCallStore((s) => s.dismissIncoming);

  const { status: oneToOneStatus } = useCall();

  const visible =
    Boolean(incoming) && status === "idle" && oneToOneStatus === "idle";
  const callId = incoming?.callId;

  // Ringtone playback
  useEffect(() => {
    if (!visible) return;
    soundService.playReceiving();
    return () => {
      soundService.stopReceiving();
    };
  }, [visible, callId]);

  // Timeout dismiss
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, RING_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [visible, callId, dismiss]);

  const isVideo = incoming?.type === "video";
  const starterName = incoming?.starter?.fullName || "Someone";
  const groupName = incoming?.groupName || "Group";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={callId}
          role="alertdialog"
          aria-label={`Incoming group call from ${groupName}`}
          initial={{ opacity: 0, y: -30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.94 }}
          transition={CALL_SPRING}
          className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] mx-auto w-auto max-w-md overflow-hidden rounded-3xl border border-white/20 bg-neutral/95 p-4 sm:p-5 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-black/40 sm:left-auto sm:right-5 sm:mx-0 sm:w-[26rem]"
        >
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary/20 blur-2xl" />

          <div className="relative flex items-center gap-3.5">
            <CallAvatar
              src={incoming?.starter?.avatar}
              name={starterName}
              size="md"
              pulse
              pulseColor="bg-primary/30"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CallTypeBadge
                  isVideo={isVideo}
                  text={isVideo ? "Video" : "Voice"}
                  className="px-2 py-0.5 text-[10px]"
                />
              </div>

              <h3 className="mt-1 truncate font-bold text-base text-white">
                {groupName}
              </h3>
              <p className="truncate text-xs font-medium text-white/70">
                {starterName} started a call
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 active:scale-95"
            >
              <PhoneOff className="size-3.5 text-error" />
              <span>Decline</span>
            </button>

            <button
              type="button"
              autoFocus
              onClick={() => joinCall(incoming.groupId, incoming.groupName)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-success px-4 py-2.5 text-xs font-semibold text-success-content shadow-lg shadow-success/20 transition-all hover:brightness-110 active:scale-95"
            >
              {isVideo ? (
                <Video className="size-3.5" />
              ) : (
                <Phone className="size-3.5" />
              )}
              <span>Join Call</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
