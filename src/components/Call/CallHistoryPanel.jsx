// client/src/components/chat/CallHistoryPanel.jsx
import { useEffect, useState } from "react";
import {
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useCall } from "../../context/CallContext";
import { formatDuration } from "./VoiceMessage.jsx";
import GroupCallHistoryPanel from "./GroupCallHistoryPanel.jsx";

const when = (v) =>
  new Date(v).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const describe = (c) => {
  const kind = c.type === "video" ? "Video" : "Audio";
  const missedIncoming = c.status === "missed" && c.direction === "incoming";

  let text;
  if (c.status === "completed")
    text = `${kind} call · ${formatDuration(c.duration || 0)}`;
  else if (c.status === "missed")
    text = missedIncoming
      ? `Missed ${kind.toLowerCase()} call`
      : `${kind} call · no answer`;
  else text = `${kind} call · ${c.status}`;

  const Icon = missedIncoming
    ? PhoneMissed
    : c.direction === "incoming"
      ? PhoneIncoming
      : PhoneOutgoing;

  return { text, Icon, missed: missedIncoming };
};

const PersonalCalls = ({ onOpenUser, onAfterOpen }) => {
  const calls = useCallHistoryStore((s) => s.calls);
  const isLoading = useCallHistoryStore((s) => s.isLoading);
  const fetchCalls = useCallHistoryStore((s) => s.fetchCalls);
  const { startCall, status } = useCall();

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  if (isLoading && !calls.length)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-base-content/40" />
      </div>
    );

  if (!calls.length)
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        No calls yet.
      </p>
    );

  return (
    <ul className="divide-y divide-base-300">
      {calls.map((c) => {
        const { text, Icon, missed } = describe(c);
        return (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                onOpenUser?.(c.user.id);
                onAfterOpen?.();
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <img
                src={c.user.avatar || "/avatar.png"}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover border border-base-300"
              />
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-medium ${missed ? "text-error" : ""}`}
                >
                  {c.user.fullName}
                </div>
                <div
                  className={`flex items-center gap-1 truncate text-xs ${
                    missed ? "text-error" : "text-base-content/60"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {text}
                </div>
              </div>
              <span className="shrink-0 text-xs text-base-content/50">
                {when(c.startedAt)}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm shrink-0 text-primary"
              disabled={status !== "idle"}
              onClick={() => {
                startCall({ id: c.user.id, fullName: c.user.fullName }, c.type);
                onAfterOpen?.();
              }}
              aria-label="Call again"
              title="Call again"
            >
              {c.type === "video" ? (
                <Video className="size-4" />
              ) : (
                <Phone className="size-4" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const CallHistoryPanel = ({ onOpenGroup, onAfterOpen }) => {
  const [tab, setTab] = useState("personal");
  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);

  const openUser = (id) => {
    const u = users?.find?.((x) => String(x.id) === String(id));
    if (u) setSelectedUser(u);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" className="tabs tabs-boxed m-3 shrink-0">
        <button
          role="tab"
          type="button"
          className={`tab flex-1 ${tab === "personal" ? "tab-active" : ""}`}
          onClick={() => setTab("personal")}
        >
          Personal
        </button>
        <button
          role="tab"
          type="button"
          className={`tab flex-1 ${tab === "groups" ? "tab-active" : ""}`}
          onClick={() => setTab("groups")}
        >
          Groups
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "personal" ? (
          <PersonalCalls onOpenUser={openUser} onAfterOpen={onAfterOpen} />
        ) : (
          <GroupCallHistoryPanel onOpenGroup={onOpenGroup} />
        )}
      </div>
    </div>
  );
};

export default CallHistoryPanel;
