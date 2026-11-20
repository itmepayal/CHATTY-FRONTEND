import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  ExternalLink,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  Lock,
  MessageSquareText,
  PanelRightOpen,
  Pin,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import { usePrivacyStore } from "../../store/usePrivacyStore";
import { useChatLockStore } from "../../store/useChatLockStore";
import { useAppLockStore } from "../../store/useAppLockStore";
import { VerifyPinModal } from "../Chat/userInfo/UserInfoPrivacySection.jsx";
import SecurityLockToggle from "../common/SecurityLockToggle.jsx";
import { customToast as toast } from "../toast/customToastService.js";

import {
  parseDate,
  formatDate,
  prettyLink,
  toIds,
} from "../Chat/userInfo/UserInfoHelpers.js";
import { Section, Stat } from "../Chat/userInfo/UserInfoUI.jsx";

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const getAvatar = (a) => (typeof a === "string" ? a : a?.url) || "/avatar.png";

const GroupInfoPanel = ({
  open,
  onToggle,
  onManage,
  hasActiveThread = false,
}) => {
  const { selectedGroup: group, groupMessages, pinnedMessages = [] } = useGroupStore();
  const { authUser, onlineUsers, hiddenUsers } = useAuthStore();

  const myId = String(authUser?.id);
  const onlineSet = useMemo(() => new Set(toIds(onlineUsers)), [onlineUsers]);
  const hiddenSet = useMemo(() => new Set(toIds(hiddenUsers)), [hiddenUsers]);

  const groupId = group ? String(group._id ?? group.id) : null;
  const enableLockWithPin = useChatLockStore((s) => s.enableLockWithPin);
  const disableLockWithPin = useChatLockStore((s) => s.disableLockWithPin);
  const isAppLockConfigured = useAppLockStore((s) => s.isConfigured);

  const isLocked = usePrivacyStore((s) => {
    if (!groupId) return false;
    const lockedList = (s.privacy?.lockedChats || []).map(String);
    return lockedList.includes(String(groupId));
  });

  const [isSavingLock, setIsSavingLock] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState({
    open: false,
    mode: "enable",
  });

  // Close on Escape on mobile / tablet
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onToggle && window.innerWidth < 1280) {
        onToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle]);

  if (!group) return null;

  if (!open) return null;

  const messages = (Array.isArray(groupMessages) ? groupMessages : []).filter(
    (m) => !m.isDeleted && !m.failed,
  );
  const pinnedCount =
    (pinnedMessages || []).length || messages.filter((m) => m.isPinned).length;
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

  const handleToggleLockClick = (targetChecked) => {
    if (isSavingLock || !groupId) return;

    if (isLocked) {
      // Disabling lock
      setAuthModalConfig({ open: true, mode: "disable" });
    } else {
      // Enabling lock
      if (!isAppLockConfigured) {
        toast.error("Please configure an App Lock PIN in Settings > Privacy first.");
        return;
      }
      setAuthModalConfig({ open: true, mode: "enable" });
    }
  };

  const handleVerifyPin = async (enteredPin) => {
    setIsSavingLock(true);
    let ok = false;
    if (authModalConfig.mode === "enable") {
      ok = await enableLockWithPin(groupId, enteredPin);
    } else {
      ok = await disableLockWithPin(groupId, enteredPin);
    }
    setIsSavingLock(false);
    if (ok) {
      setAuthModalConfig({ open: false, mode: "enable" });
      return true;
    }
    return false;
  };

  return (
    <>
      {/* Backdrop for mobile & tablet */}
      <div
        className="fixed inset-0 z-40 bg-black/20 xl:hidden"
        onClick={onToggle}
        aria-hidden="true"
      />

      <aside
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-2xl transition-all duration-200 xl:relative xl:z-auto lg:w-[300px] xl:w-[320px] xl:max-w-none xl:shadow-none"
      >
        <div className="flex h-13 sm:h-14 shrink-0 items-center justify-between px-4 sm:px-5 border-b border-base-300 bg-base-100/90 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-base text-base-content/90">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200/80 text-base-content/60">
              <Info className="size-4.5" />
            </span>
            <span>Group info</span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
            aria-label="Close group info"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Profile */}
          <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 select-none">
            {group.avatar ? (
              <img
                src={getAvatar(group.avatar)}
                alt={group.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/avatar.png";
                }}
                className="size-24 sm:size-28 rounded-full object-cover ring-4 ring-base-200 shadow-md"
              />
            ) : (
              <div className="size-24 sm:size-28 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl sm:text-4xl font-bold ring-4 ring-base-200 shadow-md uppercase">
                {group.name?.[0]?.toUpperCase()}
              </div>
            )}

            <h3 className="mt-3.5 text-lg font-bold tracking-tight text-base-content/95 [overflow-wrap:anywhere]">
              {group.name}
            </h3>
            <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
              Group · {members.length} members
            </p>

            <span
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                onlineCount > 0
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-base-200 text-base-content/60"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  onlineCount > 0
                    ? "bg-success animate-pulse"
                    : "bg-base-content/40"
                }`}
              />
              {onlineCount} online
            </span>

            {group.description && (
              <p className="mt-3.5 text-xs sm:text-sm text-base-content/75 leading-relaxed [overflow-wrap:anywhere] px-2">
                {group.description}
              </p>
            )}
          </div>

          {/* Manage Button */}
          {onManage && (
            <div className="px-5 pb-4">
              <button
                type="button"
                onClick={onManage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-base-200/80 py-2.5 text-xs font-semibold text-base-content/80 transition-colors hover:bg-base-200 hover:text-base-content active:scale-[0.99]"
              >
                <Settings2 className="size-4" />
                Manage group
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 px-5 pb-4 select-none">
            <Stat
              icon={MessageSquareText}
              value={messages.length}
              label="Messages"
            />
            <Stat icon={ImageIcon} value={photos.length} label="Photos" />
            <Stat icon={Users} value={members.length} label="Members" />
            <Stat icon={Pin} value={pinnedCount} label="Pinned" />
          </div>

          {createdAt && (
            <>
              <div className="border-t border-base-200/70" />
              <Section title="Details">
                <div className="flex items-center gap-3 py-1">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-200">
                    <CalendarDays className="size-4 text-base-content/60" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50">Created</p>
                    <p className="text-sm font-semibold">{createdAt}</p>
                  </div>
                </div>
              </Section>
            </>
          )}

          <div className="border-t border-base-200/70" />

          {/* Privacy & Security */}
          <Section title="Privacy & Security">
            <SecurityLockToggle
              label="Group Chat Lock"
              description="Require PIN to open this group"
              status={
                isSavingLock
                  ? "verifying"
                  : isLocked
                    ? "active"
                    : "inactive"
              }
              onToggle={handleToggleLockClick}
              disabled={isSavingLock}
            />
          </Section>

          <VerifyPinModal
            open={authModalConfig.open}
            loading={isSavingLock}
            title={
              authModalConfig.mode === "enable"
                ? "Lock Group Chat"
                : "Unlock Group Chat"
            }
            description={
              authModalConfig.mode === "enable"
                ? "Enter your 4-digit PIN to lock this group"
                : "Enter your 4-digit PIN to remove group lock"
            }
            onClose={() =>
              setAuthModalConfig({ open: false, mode: "enable" })
            }
            onVerify={handleVerifyPin}
          />

          <div className="border-t border-base-200/70" />

          {/* Members */}
          <Section title="Members" aside={members.length}>
            <ul className="space-y-1">
              {sortedMembers.map((m) => {
                const id = String(m.id);
                const isMe = id === myId;
                const online = isMe || onlineSet.has(id);
                const isAdmin = adminIds.includes(id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-base-200/50 transition-colors"
                  >
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
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
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
              <div className="border-t border-base-200/70" />
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
              <div className="border-t border-base-200/70" />
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
                            <p className="truncate text-sm font-medium">
                              {host}
                            </p>
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
    </>
  );
};

export default GroupInfoPanel;
