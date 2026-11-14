import { useEffect, useState } from "react";
import {
  Calendar,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Users,
  Video,
} from "lucide-react";
import { useCallHistoryStore } from "../../store/useCallHistoryStore";
import { useChatStore } from "../../store/useChatStore";
import { useCall } from "../../context/CallContext";
import GroupCallHistoryPanel from "../group/GroupCallHistoryPanel.jsx";
import CallAvatar from "./common/CallAvatar.jsx";
import { formatCallTimer } from "./common/callTokens.js";

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

const getCallDescription = (c) => {
  const isVideo = c.type === "video";
  const kind = isVideo ? "Video" : "Voice";
  const incoming = c.direction === "incoming";
  const missed = c.status === "missed" && incoming;

  let text;
  if (c.status === "completed") {
    text = `${kind} call · ${formatCallTimer(c.duration || 0)}`;
  } else if (c.status === "missed") {
    text = missed ? `Missed ${kind.toLowerCase()} call` : `${kind} call · No answer`;
  } else {
    text = `${kind} call · ${c.status}`;
  }

  const Icon = missed
    ? PhoneMissed
    : incoming
      ? PhoneIncoming
      : PhoneOutgoing;

  return { text, Icon, missed, isVideo };
};

const PersonalCalls = ({ onOpenUser, onAfterOpen }) => {
  const calls = useCallHistoryStore((s) => s.calls);
  const isLoading = useCallHistoryStore((s) => s.isLoading);
  const fetchCalls = useCallHistoryStore((s) => s.fetchCalls);
  const { startCall, status } = useCall();

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  if (isLoading && !calls.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-base-content/60">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Loading call history…</span>
      </div>
    );
  }

  if (!calls.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center text-base-content/60 gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200 border border-base-300">
          <Phone className="size-6 text-base-content/40" />
        </div>
        <div>
          <p className="font-semibold text-base-content">No calls yet</p>
          <p className="text-xs text-base-content/60 mt-0.5">
            When you call your contacts, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-base-200/80">
      {calls.map((c) => {
        const { text, Icon, missed, isVideo } = getCallDescription(c);
        const userName = c.user?.fullName || c.user?.name || "User";

        return (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors"
          >
            <button
              type="button"
              onClick={() => {
                if (c.user?.id) onOpenUser?.(c.user.id);
                onAfterOpen?.();
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
            >
              <CallAvatar
                src={c.user?.avatar}
                name={userName}
                size="sm"
                className="shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-semibold text-sm ${
                    missed ? "text-error" : "text-base-content"
                  }`}
                >
                  {userName}
                </div>

                <div
                  className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${
                    missed ? "text-error font-medium" : "text-base-content/60"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{text}</span>
                </div>
              </div>

              <span className="shrink-0 text-[11px] text-base-content/50 tabular-nums">
                {formatCallDate(c.startedAt || c.createdAt)}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm shrink-0 text-primary hover:bg-primary/10"
              disabled={status !== "idle"}
              onClick={() => {
                if (c.user?.id) {
                  startCall(
                    { id: c.user.id, fullName: userName },
                    c.type || "audio",
                  );
                }
                onAfterOpen?.();
              }}
              aria-label={`Call ${userName} again`}
              title="Call again"
            >
              {isVideo ? (
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

export default function CallHistoryPanel({ onOpenGroup, onAfterOpen }) {
  const [tab, setTab] = useState("personal");
  const users = useChatStore((s) => s.users);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);

  const openUser = (id) => {
    const u = users?.find?.((x) => String(x.id) === String(id));
    if (u) setSelectedUser(u);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100">
      {/* Tab Switcher */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-base-200 border border-base-300">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
              tab === "personal"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/65 hover:text-base-content"
            }`}
            onClick={() => setTab("personal")}
          >
            <Phone className="size-3.5" />
            <span>Direct Calls</span>
          </button>

          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
              tab === "groups"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/65 hover:text-base-content"
            }`}
            onClick={() => setTab("groups")}
          >
            <Users className="size-3.5" />
            <span>Group Calls</span>
          </button>
        </div>
      </div>

      {/* List content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "personal" ? (
          <PersonalCalls onOpenUser={openUser} onAfterOpen={onAfterOpen} />
        ) : (
          <GroupCallHistoryPanel onOpenGroup={onOpenGroup} />
        )}
      </div>
    </div>
  );
}
