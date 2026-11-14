import { useEffect } from "react";
import { Loader2, Phone, PhoneMissed, Users, Video } from "lucide-react";
import { useGroupCallHistoryStore } from "../../store/useGroupCallHistoryStore";
import CallAvatar from "../Call/common/CallAvatar.jsx";
import { formatCallTimer } from "../Call/common/callTokens.js";

const formatCallDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${timeStr}`;

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getGroupCallDescription = (c) => {
  const isVideo = c.type === "video";
  const kind = isVideo ? "Video" : "Voice";

  if (c.status === "completed") {
    return `${kind} call · ${formatCallTimer(c.duration || 0)}`;
  }
  if (c.status === "missed") {
    return c.startedByMe
      ? `${kind} call · No answer`
      : `Missed ${kind.toLowerCase()} call`;
  }
  return `${kind} call cancelled`;
};

export default function GroupCallHistoryPanel({ onOpenGroup }) {
  const all = useGroupCallHistoryStore((s) => s.all);
  const isLoadingAll = useGroupCallHistoryStore((s) => s.isLoadingAll);
  const fetchAll = useGroupCallHistoryStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (isLoadingAll && !all.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-base-content/60">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Loading group call history…</span>
      </div>
    );
  }

  if (!all.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center text-base-content/60 gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 border border-base-300">
          <Users className="size-6 text-base-content/40" />
        </div>
        <div>
          <p className="font-semibold text-base-content">No group calls yet</p>
          <p className="text-xs text-base-content/60 mt-0.5">
            Group calls started in your group chats will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-base-200/80">
      {all.map((c) => {
        const isVideo = c.type === "video";
        const missed = c.status === "missed" && !c.startedByMe;
        const Icon = missed ? PhoneMissed : isVideo ? Video : Phone;
        const groupName = c.group?.name || "Group Call";

        return (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors"
          >
            <button
              type="button"
              onClick={() => {
                if (c.group?.id) onOpenGroup?.(c.group.id);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
            >
              <CallAvatar
                src={c.group?.avatar}
                name={groupName}
                size="sm"
                className="shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-semibold text-sm ${
                    missed ? "text-error" : "text-base-content"
                  }`}
                >
                  {groupName}
                </div>

                <div
                  className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${
                    missed ? "text-error font-medium" : "text-base-content/60"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{getGroupCallDescription(c)}</span>
                </div>
              </div>

              <span className="shrink-0 text-[11px] text-base-content/50 tabular-nums">
                {formatCallDate(c.startedAt || c.createdAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
