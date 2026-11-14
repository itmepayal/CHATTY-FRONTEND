import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Users, Video } from "lucide-react";
import { useGroupCallStore } from "../../store/useGroupCallStore";
import { useCall } from "../../context/CallContext";

const POLL_MS = 10_000;

export default function GroupCallBanner({ group }) {
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
          transition={{ duration: 0.22 }}
          className="overflow-hidden border-b border-success/30 bg-success/15 backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-success/20 text-success ring-1 ring-success/30">
                <span className="absolute inset-0 rounded-full bg-success/30 animate-ping opacity-75" />
                <Icon className="relative size-4" />
              </span>

              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-base-content flex items-center gap-1.5">
                  <span>{isVideo ? "Video" : "Voice"} call in progress</span>
                </p>
                <p className="truncate text-xs text-base-content/70 flex items-center gap-1">
                  <Users className="size-3 text-success shrink-0" />
                  <span>
                    {active.joined
                      ? "You're in this call on another device"
                      : `${active.count} ${active.count === 1 ? "participant" : "participants"}`}
                  </span>
                </p>
              </div>
            </div>

            {!active.joined && (
              <button
                type="button"
                className="btn btn-success btn-sm shrink-0 rounded-full font-semibold shadow-sm hover:brightness-105 active:scale-95"
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
}
