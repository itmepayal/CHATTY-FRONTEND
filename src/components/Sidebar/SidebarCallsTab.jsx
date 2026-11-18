import { AnimatePresence } from "framer-motion";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Search, Video } from "lucide-react";
import {
  Avatar,
  EmptyState,
  ListSkeleton,
  Row,
} from "./SidebarComponents.jsx";
import {
  avatarSrc,
  formatDuration,
  formatListTime,
} from "./sidebarUtils.js";

export const SidebarCallsTab = ({
  callsInitialLoading,
  filteredCalls,
  openFromCall,
  q,
  callFilter,
  setCallFilter,
}) => {
  const renderCall = (call, i = 0) => {
    const DirIcon = call.missed
      ? PhoneMissed
      : call.outgoing
        ? PhoneOutgoing
        : PhoneIncoming;
    const TypeIcon = call.video ? Video : Phone;
    const dur = formatDuration(call.duration);

    return (
      <Row
        key={call.key}
        index={i}
        onClick={() => openFromCall(call)}
        tone={call.missed ? "danger" : "default"}
        avatar={
          <Avatar
            group={call.isGroup}
            src={call.isGroup && !call.avatar ? null : avatarSrc(call.avatar)}
            name={call.name}
          />
        }
        title={call.name}
        subtitle={
          <span className="flex items-center gap-1">
            <DirIcon
              className={`size-3.5 shrink-0 ${
                call.missed ? "text-error" : "text-success"
              }`}
            />
            <span className="truncate">
              {call.missed ? "Missed" : call.outgoing ? "Outgoing" : "Incoming"}
              {dur ? ` · ${dur}` : ""}
            </span>
          </span>
        }
        time={formatListTime(call.time)}
        trailing={
          <TypeIcon className="size-4 text-base-content/45" aria-hidden />
        }
      />
    );
  };

  if (callsInitialLoading) {
    return <ListSkeleton />;
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {filteredCalls.map((c, i) => renderCall(c, i))}
      </AnimatePresence>

      {filteredCalls.length === 0 && (
        (() => {
          if (q) {
            return (
              <EmptyState
                icon={Search}
                title="No calls found"
                description={`No call history matching "${q}".`}
              />
            );
          }
          if (callFilter === "missed") {
            return (
              <EmptyState
                icon={PhoneMissed}
                title="No missed calls"
                description="You have no missed calls."
                action={
                  <button
                    type="button"
                    onClick={() => setCallFilter("all")}
                    className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                  >
                    Show all calls
                  </button>
                }
              />
            );
          }
          return (
            <EmptyState
              icon={Phone}
              title="No recent calls"
              description="Audio and video calls with your contacts will appear here."
            />
          );
        })()
      )}
    </>
  );
};

export default SidebarCallsTab;
