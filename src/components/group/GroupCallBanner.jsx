import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Video } from "lucide-react";
import { useGroupCallStore } from "../../store/useGroupCallStore";
import { useCall } from "../../context/CallContext";

const POLL_MS = 10_000;

const GroupCallBanner = ({ group }) => {
  const status = useGroupCallStore((s) => s.status);
  const active = useGroupCallStore((s) => s.activeByGroup[String(group.id)]);
  const fetchStatus = useGroupCallStore((s) => s.fetchStatus);
  const joinCall = useGroupCallStore((s) => s.joinCall);
  const { status: oneToOneStatus } = useCall();
  const busy = oneToOneStatus !== "idle";

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") fetchStatus(group.id);
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [group.id, fetchStatus]);

  const show = Boolean(active) && status === "idle";
  const isVideo = active?.type === "video";
  const Icon = isVideo ? Video : Phone;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="call-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-b border-success/30 bg-success/10"
        >
          <div className="flex items-center gap-3 px-3 py-2 sm:px-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/20 text-success">
              <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">
                {isVideo ? "Video" : "Voice"} call in progress
              </p>
              <p className="truncate text-xs text-base-content/60">
                {active.joined
                  ? "You're in this call on another device"
                  : `${active.count} ${active.count === 1 ? "person" : "people"} in the call`}
              </p>
            </div>

            {!active.joined && (
              <button
                type="button"
                className="btn btn-success btn-sm shrink-0"
                disabled={busy}
                title={busy ? "Finish your current call first" : undefined}
                onClick={() => joinCall(group.id, group.name)}
              >
                Join
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupCallBanner;
