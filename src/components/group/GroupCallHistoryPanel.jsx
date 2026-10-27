import { useEffect } from "react";
import { Loader2, Phone, PhoneMissed, Video } from "lucide-react";
import { useGroupCallHistoryStore } from "../../store/useGroupCallHistoryStore";
import { formatDuration } from "./VoiceMessage.jsx";

const when = (v) =>
  new Date(v).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const label = (c) => {
  const kind = c.type === "video" ? "Video" : "Voice";
  if (c.status === "completed")
    return `${kind} call · ${formatDuration(c.duration || 0)}`;
  if (c.status === "missed")
    return c.startedByMe
      ? `${kind} call · no answer`
      : `Missed ${kind.toLowerCase()} call`;
  return `${kind} call cancelled`;
};

/* onOpenGroup(groupId) -> apne app me wo group select karne ka function */
const GroupCallHistoryPanel = ({ onOpenGroup }) => {
  const all = useGroupCallHistoryStore((s) => s.all);
  const isLoadingAll = useGroupCallHistoryStore((s) => s.isLoadingAll);
  const fetchAll = useGroupCallHistoryStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (isLoadingAll && !all.length)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-base-content/40" />
      </div>
    );

  if (!all.length)
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        No group calls yet.
      </p>
    );

  return (
    <ul className="divide-y divide-base-300">
      {all.map((c) => {
        const missed = c.status === "missed" && !c.startedByMe;
        const Icon = missed ? PhoneMissed : c.type === "video" ? Video : Phone;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpenGroup?.(c.group.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-base-200"
            >
              <img
                src={c.group.avatar || "/avatar.png"}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover border border-base-300"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.group.name}</div>
                <div
                  className={`flex items-center gap-1 truncate text-xs ${
                    missed ? "text-error" : "text-base-content/60"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label(c)}
                </div>
              </div>
              <span className="shrink-0 text-xs text-base-content/50">
                {when(c.startedAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default GroupCallHistoryPanel;
