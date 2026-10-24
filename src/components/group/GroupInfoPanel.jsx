import { useMemo } from "react";
import {
  CalendarDays,
  ExternalLink,
  ImageIcon,
  Info,
  Link2,
  MessageSquareText,
  PanelRightOpen,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";

const LOCALE = "en-IN";
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

const toIds = (arr) =>
  (Array.isArray(arr) ? arr : []).map((x) => String(x?._id ?? x?.id ?? x));
const getAvatar = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatDate = (v) => {
  const d = parseDate(v);
  return d
    ? d.toLocaleDateString(LOCALE, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
};
const prettyLink = (url) => {
  try {
    const u = new URL(url);
    const rest = `${u.pathname}${u.search}`.replace(/^\/$/, "");
    return { host: u.hostname.replace(/^www\./, ""), rest };
  } catch {
    return { host: url, rest: "" };
  }
};

const Section = ({ title, aside, children }) => (
  <section className="px-5 py-4">
    <div className="mb-2.5 flex items-center justify-between">
      <h4 className="text-sm font-semibold">{title}</h4>
      {aside !== undefined && aside !== null && (
        <span className="text-xs text-base-content/50">{aside}</span>
      )}
    </div>
    {children}
  </section>
);

const Stat = ({ icon: Icon, value, label }) => (
  <div className="flex-1 rounded-xl bg-base-200/60 px-2 py-2.5 text-center">
    <Icon className="mx-auto size-4 text-base-content/50" />
    <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    <p className="mt-1 text-[11px] text-base-content/50">{label}</p>
  </div>
);

const GroupInfoPanel = ({ open, onToggle, onManage }) => {
  const { selectedGroup: group, groupMessages } = useGroupStore();
  const { authUser, onlineUsers, hiddenUsers } = useAuthStore();

  const myId = String(authUser?.id);
  const onlineSet = useMemo(() => new Set(toIds(onlineUsers)), [onlineUsers]);
  const hiddenSet = useMemo(() => new Set(toIds(hiddenUsers)), [hiddenUsers]);

  if (!group) return null;

  // Collapsed strip
  if (!open) {
    return (
      <div className="hidden xl:flex shrink-0 w-12 border-l border-base-300 bg-base-100 justify-center pt-4">
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Open group info"
          title="Group info"
        >
          <PanelRightOpen className="size-5" />
        </button>
      </div>
    );
  }

  const messages = (Array.isArray(groupMessages) ? groupMessages : []).filter(
    (m) => !m.isDeleted && !m.failed,
  );
  const photos = messages.filter((m) => m.image?.url);
  const recentPhotos = photos.slice(-6).reverse();

  const links = [];
  for (const m of messages) {
    const found = m.text?.match(URL_RE);
    if (found) links.push(...found);
  }
  const uniqueLinks = [...new Set(links.reverse())];
  const recentLinks = uniqueLinks.slice(0, 5);

  const members = group.members || [];
  const onlineCount = members.filter((m) => onlineSet.has(String(m.id))).length;

  // online members first, then "You" is always on top
  const sortedMembers = [...members].sort((a, b) => {
    const aMe = String(a.id) === myId ? 1 : 0;
    const bMe = String(b.id) === myId ? 1 : 0;
    if (aMe !== bMe) return bMe - aMe;
    const aOn = onlineSet.has(String(a.id)) ? 1 : 0;
    const bOn = onlineSet.has(String(b.id)) ? 1 : 0;
    return bOn - aOn;
  });

  const createdAt = formatDate(group.createdAt);
  const adminIds = toIds(group.admins);

  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l border-base-300 bg-base-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="size-5 text-base-content/60" />
          Group info
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Close group info"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-4">
          {group.avatar ? (
            <img
              src={getAvatar(group.avatar)}
              alt={group.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
              className="size-28 rounded-full object-cover ring-4 ring-base-200"
            />
          ) : (
            <div className="size-28 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-semibold ring-4 ring-base-200">
              {group.name?.[0]?.toUpperCase()}
            </div>
          )}

          <h3 className="mt-3 text-lg font-semibold [overflow-wrap:anywhere]">
            {group.name}
          </h3>
          <p className="text-sm text-base-content/60">
            Group · {members.length} members
          </p>

          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              onlineCount > 0
                ? "bg-success/10 text-success"
                : "bg-base-200 text-base-content/60"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                onlineCount > 0 ? "bg-success" : "bg-base-content/40"
              }`}
            />
            {onlineCount} online
          </span>

          {group.description && (
            <p className="mt-3 text-sm text-base-content/70 [overflow-wrap:anywhere]">
              {group.description}
            </p>
          )}
        </div>

        {/* Manage (opens your existing GroupInfoModal: edit / leave / add) */}
        {onManage && (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={onManage}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-base-200/70 py-3 text-xs font-medium text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Settings2 className="size-4" />
              Manage group
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-2 px-5 pb-4">
          <Stat
            icon={MessageSquareText}
            value={messages.length}
            label="Messages"
          />
          <Stat icon={ImageIcon} value={photos.length} label="Photos" />
          <Stat icon={Users} value={members.length} label="Members" />
        </div>

        {createdAt && (
          <>
            <div className="border-t border-base-300" />
            <Section title="Details">
              <div className="flex items-center gap-3 py-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200">
                  <CalendarDays className="size-4 text-base-content/60" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Created</p>
                  <p className="text-sm">{createdAt}</p>
                </div>
              </div>
            </Section>
          </>
        )}

        <div className="border-t border-base-300" />

        {/* Members */}
        <Section title="Members" aside={members.length}>
          <ul className="space-y-1">
            {sortedMembers.map((m) => {
              const id = String(m.id);
              const isMe = id === myId;
              const online = isMe || onlineSet.has(id);
              const isAdmin = adminIds.includes(id);
              return (
                <li key={id} className="flex items-center gap-3 py-1.5">
                  <div className="relative shrink-0">
                    <img
                      src={getAvatar(m.avatar)}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/avatar.png";
                      }}
                      className="size-9 rounded-full object-cover"
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-success ring-2 ring-base-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isMe ? "You" : m.fullName}
                    </p>
                    <p className="truncate text-xs text-base-content/50">
                      {online ? "Online" : hiddenSet.has(id) ? "" : "Offline"}
                    </p>
                  </div>
                  {isAdmin && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Admin
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Shared photos */}
        {recentPhotos.length > 0 && (
          <>
            <div className="border-t border-base-300" />
            <Section title="Shared photos" aside={photos.length}>
              <div className="grid grid-cols-3 gap-1.5">
                {recentPhotos.map((m) => (
                  <a
                    key={m.clientId || m.id || m._id}
                    href={m.image.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block aspect-square overflow-hidden rounded-lg bg-base-200"
                  >
                    <img
                      src={m.image.url}
                      alt="Shared"
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-200 hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Shared links */}
        {recentLinks.length > 0 && (
          <>
            <div className="border-t border-base-300" />
            <Section title="Shared links" aside={uniqueLinks.length}>
              <ul className="space-y-1.5">
                {recentLinks.map((url) => {
                  const { host, rest } = prettyLink(url);
                  return (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-center gap-3 rounded-xl bg-base-200/60 px-3 py-2.5 transition-colors hover:bg-base-200"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-100">
                          <Link2 className="size-4 text-base-content/60" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{host}</p>
                          {rest && (
                            <p className="truncate text-xs text-base-content/50">
                              {rest}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="size-3.5 shrink-0 text-base-content/30 transition-colors group-hover:text-base-content/70" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
};

export default GroupInfoPanel;
