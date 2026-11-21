import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
import { axiosInstance } from "../lib/axios.js";
import {
  encryptGroupText,
  decryptGroupText,
  loadGroupKeys,
  wrapGroupKey,
  cacheGroupKeyRaw,
  exportGroupKeyRaw,
  getGroupLatestVersion,
  forgetGroup,
  whenE2EEReady,
} from "../lib/e2ee.js";
import {
  e2eeReady,
  e2eeErrMsg,
  decryptGroupMessage,
  decryptGroupList,
  decryptGroupPreview,
} from "../lib/e2eeMessages.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useNotificationSettings } from "./useNotificationSettingsStore.js";
import { usePrivacyStore } from "./usePrivacyStore.js";
import { useChatLockStore } from "./useChatLockStore.js";
import notificationService from "../services/notificationService.js";
import soundService from "../services/soundService.js";

const idOf = (v) => String(v?._id ?? v?.id ?? v ?? "");
const sameId = (a, b) => {
  const sa = idOf(a);
  const sb = idOf(b);
  return Boolean(sa && sb && sa === sb);
};
const unwrap = (res) => res.data?.data;
const errMsg = (e) => e?.response?.data?.message || "Something went wrong.";
const newClientId = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// authUser can have id OR _id
const myId = () => idOf(useAuthStore.getState().authUser);

const timeOf = (d) => (d ? new Date(d).getTime() : 0);

// groups without lastMessageAt fall back to createdAt
const sortGroups = (list) =>
  [...list].sort(
    (a, b) =>
      timeOf(b.lastMessageAt || b.createdAt) -
      timeOf(a.lastMessageAt || a.createdAt),
  );

const upsert = (list, item) => {
  const { archived: _ignored, ...rest } = item;
  return list.some((x) => sameId(x.id, item.id))
    ? list.map((x) => (sameId(x.id, item.id) ? { ...x, ...rest } : x))
    : [{ ...rest, archived: false }, ...list];
};

const union = (a = [], b = []) => [...new Set([...a, ...b].map(String))];

// members may be [{ userId }], [{ user: {...} }], [{ id }] or plain ids
const memberIdsOf = (g) =>
  [
    ...new Set(
      (g?.members || []).map((m) => idOf(m?.userId ?? m?.user ?? m?.id ?? m)),
    ),
  ].filter(Boolean);

const normalizeMsg = (m) => ({
  ...m,
  id: idOf(m.id ?? m._id),
  groupId: idOf(m.groupId),
  senderId: idOf(m.senderId ?? m.sender),
  readBy: (m.readBy || []).map(idOf),
  isPinned: Boolean(m.isPinned),
  pinnedBy: m.pinnedBy ? idOf(m.pinnedBy) : null,
  pinnedAt: m.pinnedAt || null,
  isStarred: Boolean(m.isStarred),
  starredBy: Array.isArray(m.starredBy) ? m.starredBy.map(idOf) : [],
  isDeleted: Boolean(m.isDeleted),
  deletedAt: m.deletedAt || null,
  isEdited: Boolean(m.isEdited),
  editedAt: m.editedAt || null,
  isForwarded: Boolean(m.isForwarded),
  replyTo: m.replyTo || null,
  location: m.location
    ? {
        ...m.location,
        shareId: m.location.shareId ? idOf(m.location.shareId) : null,
      }
    : null,
});

// LocationShare document / socket payload -> flat share object
const normalizeShare = (s) => ({
  shareId: idOf(s.shareId ?? s._id ?? s.id),
  groupId: idOf(s.groupId),
  sharerId: idOf(s.sharerId),
  lat: s.lat ?? s.lastLocation?.lat,
  lng: s.lng ?? s.lastLocation?.lng,
  accuracy: s.accuracy ?? s.lastLocation?.accuracy,
  updatedAt: s.updatedAt ?? s.lastLocation?.updatedAt,
  expiresAt: s.expiresAt,
});

const visible = () =>
  typeof document !== "undefined"
    ? document.visibilityState === "visible"
    : true;

const revokeBlob = (url) => {
  if (typeof url === "string" && url.startsWith("blob:"))
    URL.revokeObjectURL(url);
};

const revokeMsgBlobs = (m) => {
  if (!m) return;
  revokeBlob(m.image?.url);
  revokeBlob(m.audio?.url);
  revokeBlob(m.video?.url);
};

const extFor = (mime = "") =>
  mime.includes("ogg")
    ? "ogg"
    : mime.includes("mp4")
      ? "m4a"
      : mime.includes("mpeg")
        ? "mp3"
        : "webm";

const videoExtFor = (mime = "") =>
  mime.includes("mp4") ? "mp4" : mime.includes("quicktime") ? "mov" : "webm";

// Wrap one raw group key for many users. Users without a public key are SKIPPED
// (not fatal) -> they get the key later via syncPendingGroupKeys().
const wrapForUsers = async (raw, userIds, version) => {
  const entries = [];
  const skipped = [];
  await Promise.all(
    [...new Set(userIds.map(String))].map(async (userId) => {
      try {
        entries.push({ userId, version, ...(await wrapGroupKey(raw, userId)) });
      } catch {
        skipped.push(userId);
      }
    }),
  );
  return { entries, skipped };
};

/* ---------------- LIVE LOCATION CONSTANTS ---------------- */
const LIVE_PUSH_MS = 5000;

let handlers = null;
let subscribedGroupSocket = null;
let groupProfileUpdatedHandler = null;
const seenInFlight = new Set();
const seenDirty = new Set();
const groupTypingTimers = new Map(); // `${groupId}:${userId}` -> timeout
const watchers = new Map(); // shareId -> { watchId, last }
const prepareInFlight = new Map(); // groupId -> Promise<void>

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  pinnedMessages: [],
  isPinnedMessagesLoading: false,
  typing: {},
  // { [groupId]: { [shareId]: share } }
  liveShares: {},
  scheduled: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  replyingTo: null,
  editingMessage: null,
  activeThread: null,
  jumpToMessageId: null,

  setJumpToMessageId: (id) => set({ jumpToMessageId: id }),
  setReplyingTo: (message) => set({ replyingTo: message || null, editingMessage: null }),
  setEditingMessage: (message) => set({ editingMessage: message || null, replyingTo: null }),

  /* =====================================================
   *                    E2EE GROUP KEYS
   * ===================================================== */

  // Create + upload a NEW key version for the given users.
  // POST /groups/:id/keys  { version, keys: entries, entries }
  provisionGroupKey: async (groupId, userIds, version = 1) => {
    try {
      if (!(await e2eeReady())) return false;
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const { entries, skipped } = await wrapForUsers(raw, userIds, version);
      // I must be able to read it myself
      if (!entries.some((e) => sameId(e.userId, myId()))) return false;

      await axiosInstance.post(`/groups/${groupId}/keys`, {
        version,
        keys: entries,
        entries,
      });
      await cacheGroupKeyRaw(groupId, version, raw);

      if (skipped.length) {
        console.warn("[e2ee] members without a public key yet:", skipped);
      }
      return true;
    } catch (e) {
      if (e?.response?.status === 409) {
        await loadGroupKeys(groupId, { force: true }).catch(() => 0);
        return true;
      }
      console.error("provisionGroupKey failed:", e?.response?.data || e);
      return false;
    }
  },

  // New key version (e.g. after a member is removed) -> removed user can't read new messages
  rotateGroupKey: async (groupId) => {
    const group = get().groups.find((g) => sameId(g.id, groupId));
    if (!group) return false;
    const latest = await loadGroupKeys(groupId, { force: true }).catch(() => 0);
    return get().provisionGroupKey(groupId, memberIdsOf(group), latest + 1);
  },

  // Give the CURRENT key version to specific users (new members / pending members)
  shareKeyWith: async (groupId, userIds) => {
    try {
      if (!userIds.length || !(await e2eeReady())) return false;
      const latest =
        getGroupLatestVersion(groupId) || (await loadGroupKeys(groupId));
      if (!latest) return false;
      const raw = await exportGroupKeyRaw(groupId, latest);
      if (!raw) return false;
      const { entries } = await wrapForUsers(raw, userIds, latest);
      if (!entries.length) return false;
      await axiosInstance.post(`/groups/${groupId}/keys`, {
        version: latest,
        keys: entries,
        entries,
      });
      return true;
    } catch (e) {
      console.error("shareKeyWith failed:", e?.response?.data || e);
      return false;
    }
  },

  // GET /groups/:id/keys/pending -> members that still have no key -> wrap for them
  syncPendingGroupKeys: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/keys/pending`);
      const d = unwrap(res);
      const list = Array.isArray(d)
        ? d
        : d?.pending || d?.members || d?.userIds || [];
      const ids = list.map((x) => idOf(x?.userId ?? x)).filter(Boolean);
      if (ids.length) await get().shareKeyWith(groupId, ids);
    } catch {
      /* not allowed / no pending -> silent */
    }
  },

  // load keys; if the group has none yet, try to create version 1; else resolve pending members
  prepareGroupKeys: async (groupId) => {
    const gid = String(groupId);
    if (prepareInFlight.has(gid)) return prepareInFlight.get(gid);
    const p = (async () => {
      try {
        if (!(await e2eeReady())) return;
        const latest = await loadGroupKeys(gid, { force: true });
        if (!latest) {
          const group = get().groups.find((g) => sameId(g.id, gid));
          if (group) {
            await get().provisionGroupKey(gid, memberIdsOf(group), 1);
          }
        } else {
          get().syncPendingGroupKeys(gid);
        }
      } catch {
        /* silent */
      }
    })().finally(() => {
      prepareInFlight.delete(gid);
    });
    prepareInFlight.set(gid, p);
    return p;
  },

  // re-try messages that couldn't be decrypted (call after keys arrive)
  refreshGroupKeys: async (groupId) => {
    await loadGroupKeys(groupId, { force: true }).catch(() => {});
    if (!sameId(get().selectedGroup?.id, groupId)) return;
    const next = await Promise.all(
      get().groupMessages.map((m) =>
        m.decryptFailed ? decryptGroupMessage(m) : m,
      ),
    );
    set({ groupMessages: next });
  },

  /* =====================================================
   *                        GROUPS
   * ===================================================== */
  fetchGroups: async ({ silent = false } = {}) => {
    if (!silent) set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      const withPreview = await Promise.all(
        (unwrap(res) || []).map(async (g) => ({
          ...g,
          lastMessage: await decryptGroupPreview(g.lastMessage, g.id),
        })),
      );
      const groups = sortGroups(withPreview);
      set((s) => {
        let open = s.selectedGroup
          ? groups.find((g) => sameId(g.id, s.selectedGroup.id))
          : null;
        if (!open && typeof sessionStorage !== "undefined") {
          try {
            const activeGroupId = sessionStorage.getItem(
              "chatty:active-group-id",
            );
            if (activeGroupId) {
              const isLocked = useChatLockStore
                .getState()
                .isChatLocked(activeGroupId);
              if (!isLocked) {
                const found = groups.find((g) => sameId(g.id, activeGroupId));
                if (found) {
                  open = found;
                }
              }
            }
          } catch {}
        }
        return {
          groups,
          selectedGroup: open
            ? { ...s.selectedGroup, ...open }
            : s.selectedGroup,
        };
      });
    } catch (e) {
      if (!silent) toast.error(errMsg(e));
    } finally {
      if (!silent) set({ isGroupsLoading: false });
    }
  },

  createGroup: async ({ name, memberIds, avatarFile }) => {
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("memberIds", JSON.stringify(memberIds));
      if (avatarFile) fd.append("avatar", avatarFile);
      const res = await axiosInstance.post("/groups", fd);
      const group = unwrap(res);
      get().applyGroupUpdate(group);

      // E2EE: generate key v1 and wrap it for every member (+ me)
      const ids = [
        ...new Set([...memberIds, ...memberIdsOf(group), myId()].map(String)),
      ].filter(Boolean);
      const keyed = await get().provisionGroupKey(group.id, ids, 1);

      toast.success("Group created");
      if (!keyed) {
        toast.error(
          "Group created, but encryption keys couldn't be set up. Open the group to retry.",
        );
      }
      return group;
    } catch (e) {
      toast.error(errMsg(e));
      return null;
    }
  },

  updateGroup: async (groupId, { name, avatarFile, whoCanPin, mentionAllPermission }) => {
    try {
      const fd = new FormData();
      if (name !== undefined) fd.append("name", name);
      if (avatarFile) fd.append("avatar", avatarFile);
      if (whoCanPin !== undefined) fd.append("whoCanPin", whoCanPin);
      if (mentionAllPermission !== undefined)
        fd.append("mentionAllPermission", mentionAllPermission);
      const res = await axiosInstance.patch(`/groups/${groupId}`, fd);
      get().applyGroupUpdate(unwrap(res));
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  addMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, {
        memberIds,
      });
      get().applyGroupUpdate(unwrap(res));
      // give the new members the current key
      await get().shareKeyWith(groupId, memberIds);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  removeMember: async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete(
        `/groups/${groupId}/members/${userId}`,
      );
      get().applyGroupUpdate(unwrap(res));
      // rotate so the removed member can't read FUTURE messages
      const rotated = await get().rotateGroupKey(groupId);
      if (!rotated)
        toast.error("Member removed, but the key couldn't be rotated.");
    } catch (e) {
      toast.error(errMsg(e));
    }
  },

  changeRole: async (groupId, userId, role) => {
    try {
      const res = await axiosInstance.patch(
        `/groups/${groupId}/members/${userId}/role`,
        { role },
      );
      get().applyGroupUpdate(unwrap(res));
    } catch (e) {
      toast.error(errMsg(e));
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      get().dropGroup(groupId);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      get().dropGroup(groupId);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  /* ---------- archive ---------- */
  setGroupArchived: (groupId, archived) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        sameId(g.id, groupId) ? { ...g, archived } : g,
      ),
      selectedGroup:
        s.selectedGroup && sameId(s.selectedGroup.id, groupId)
          ? { ...s.selectedGroup, archived }
          : s.selectedGroup,
    })),

  archiveGroup: async (groupId) => {
    const prev = get().groups.find((g) => sameId(g.id, groupId))?.archived;
    get().setGroupArchived(groupId, true);
    try {
      await axiosInstance.put(`/groups/${groupId}/archive`);
      toast.success("Group archived");
      return true;
    } catch (e) {
      get().setGroupArchived(groupId, Boolean(prev));
      toast.error(errMsg(e));
      return false;
    }
  },

  unarchiveGroup: async (groupId) => {
    const prev = get().groups.find((g) => sameId(g.id, groupId))?.archived;
    get().setGroupArchived(groupId, false);
    try {
      await axiosInstance.delete(`/groups/${groupId}/archive`);
      toast.success("Group unarchived");
      return true;
    } catch (e) {
      get().setGroupArchived(groupId, Boolean(prev));
      toast.error(errMsg(e));
      return false;
    }
  },

  applyGroupUpdate: (group) =>
    set((s) => ({
      groups: sortGroups(upsert(s.groups, group)),
      selectedGroup:
        s.selectedGroup && sameId(s.selectedGroup.id, group.id)
          ? (() => {
              const { archived: _ignored, ...rest } = group;
              return { ...s.selectedGroup, ...rest };
            })()
          : s.selectedGroup,
    })),

  dropGroup: (groupId) => {
    Object.keys(get().liveShares[groupId] || {}).forEach((shareId) =>
      get().stopWatch(shareId),
    );
    forgetGroup(groupId); // wipe cached group keys
    set((s) => {
      const open = s.selectedGroup && sameId(s.selectedGroup.id, groupId);
      const { [groupId]: _gone, ...restShares } = s.liveShares;
      return {
        groups: s.groups.filter((g) => !sameId(g.id, groupId)),
        selectedGroup: open ? null : s.selectedGroup,
        groupMessages: open ? [] : s.groupMessages,
        liveShares: restShares,
      };
    });
  },

  /* ---------- messages ---------- */
  selectGroup: async (group) => {
    if (!group) return;
    const gid = idOf(group?.id ?? group?._id ?? group);
    if (!gid) return;

    if (useChatLockStore.getState().isChatLocked(gid)) {
      useChatLockStore.getState().openUnlockModal(gid);
      return;
    }

    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("chatty:active-group-id", String(gid));
        sessionStorage.removeItem("chatty:active-dm-id");
      }
    } catch {}

    set({
      selectedGroup: group,
      groupMessages: [],
      pinnedMessages: [],
      scheduled: [],
      activeThread: null,
      isGroupMessagesLoading: true,
    });
    await Promise.all([
      get().fetchMessages(gid),
      get().fetchPinnedMessages(gid),
      get().fetchActiveShares(gid),
      get().getScheduled(gid),
    ]);
    if (!sameId(get().selectedGroup?.id, gid)) return;
    set({ isGroupMessagesLoading: false });
    if (visible()) get().markSeen(gid);

    // background: make sure keys exist / pending members get theirs
    get().prepareGroupKeys(gid);
  },

  setSelectedGroup: (group) => get().selectGroup(group),

  closeGroup: () => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("chatty:active-group-id");
      }
    } catch {}
    get().emitTyping(false);
    set({
      selectedGroup: null,
      groupMessages: [],
      pinnedMessages: [],
      scheduled: [],
      activeThread: null,
    });
  },

  fetchPinnedMessages: async (groupId) => {
    if (!groupId) return;
    set({ isPinnedMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages/pinned`);
      const raw = unwrap(res) || [];
      const decrypted = await decryptGroupList(raw.map(normalizeMsg), groupId);
      if (!sameId(get().selectedGroup?.id, groupId)) return;
      set({ pinnedMessages: decrypted });
    } catch (err) {
      console.error("[useGroupStore] fetchPinnedMessages error:", err);
    } finally {
      set({ isPinnedMessagesLoading: false });
    }
  },

  fetchMessages: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      const server = await decryptGroupList(
        (unwrap(res) || []).map(normalizeMsg),
        groupId,
      );

      // user opened another group while we were loading
      if (!sameId(get().selectedGroup?.id, groupId)) return;

      const current = get().groupMessages;
      const isKnownByServer = (m) =>
        m.clientId && server.some((x) => x.clientId === m.clientId);

      const keep = current.filter(
        (m) => (m.pending || m.failed) && !isKnownByServer(m),
      );

      current
        .filter((m) => (m.pending || m.failed) && isKnownByServer(m))
        .forEach(revokeMsgBlobs);

      set({ groupMessages: [...server, ...keep] });
    } catch (e) {
      if (
        e.response?.status === 423 ||
        e.response?.data?.code === "CHAT_LOCKED" ||
        e.code === "CHAT_LOCKED"
      ) {
        useChatLockStore.getState().openUnlockModal(groupId);
        return;
      }
      toast.error(errMsg(e));
    }
  },

  // Accepts: text, mentions, imageFile, attachment, voice, video, replyTo, isForwarded, isViewOnce, gift
  sendMessage: async ({ text, mentions = [], imageFile, attachment, voice, video, replyTo: explicitReplyTo, isForwarded, isViewOnce, gift }) => {
    const { selectedGroup } = get();
    const me = useAuthStore.getState().authUser;
    const meId = myId();
    const trimmed = text?.trim() || "";

    const voiceMime = voice?.mimeType?.split(";")[0] || "audio/webm";
    const voiceFile = voice
      ? new File([voice.blob], `voice-${Date.now()}.${extFor(voiceMime)}`, {
          type: voiceMime,
        })
      : null;

    const videoMime = video?.mimeType?.split(";")[0] || "video/webm";
    const videoFile = video?.blob
      ? new File(
          [video.blob],
          `video-${Date.now()}.${videoExtFor(videoMime)}`,
          { type: videoMime },
        )
      : attachment?.type?.startsWith("video/")
        ? attachment
        : null;

    const file = voiceFile || videoFile || imageFile || attachment || null;
    if (!selectedGroup || !me || !meId || (!trimmed && !file && !gift)) return;

    const replyMsg = explicitReplyTo ?? get().replyingTo;
    const replyToId = replyMsg ? idOf(replyMsg.id || replyMsg._id) : null;

    const clientId = newClientId();
    const localUrl =
      voiceFile || videoFile || imageFile ? URL.createObjectURL(file) : null;

    const optimistic = {
      id: `temp-${clientId}`,
      clientId,
      groupId: String(selectedGroup.id),
      senderId: meId,
      sender: { id: meId, fullName: me.fullName, avatar: me.avatar },
      text: trimmed,
      decrypted: true, // local plaintext
      image: imageFile ? { url: localUrl } : null,
      file:
        attachment && !videoFile
          ? {
              name: attachment.name,
              size: attachment.size,
              mimeType: attachment.type,
              url: null,
            }
          : null,
      audio: voiceFile
        ? { url: localUrl, duration: voice.duration, mimeType: voiceMime }
        : null,
      video: videoFile
        ? {
            url: localUrl,
            duration: video?.duration || 0,
            mimeType: videoFile.type,
          }
        : null,
      location: null,
      replyTo: replyMsg
        ? {
            id: replyToId,
            senderId: idOf(replyMsg.senderId),
            text: replyMsg.text || "",
            type: replyMsg.image?.url
              ? "image"
              : replyMsg.audio?.url
                ? "audio"
                : replyMsg.video?.url
                  ? "video"
                  : replyMsg.file?.name
                    ? "file"
                    : replyMsg.location?.lat
                      ? "location"
                      : "text",
            isDeleted: false,
          }
        : null,
      isForwarded: Boolean(isForwarded),
      isViewOnce: Boolean(isViewOnce),
      _isViewOnce: Boolean(isViewOnce),
      gift: gift || null,
      messageType: gift ? "gift" : "text",
      _gift: gift || null,
      mentions: mentions || [],
      _mentions: mentions || [],
      readBy: [meId],
      createdAt: new Date().toISOString(),
      pending: true,
      _file: file,
      _isVoice: Boolean(voiceFile),
      _isVideo: Boolean(videoFile),
      _duration: voice?.duration || video?.duration || 0,
      _replyToId: replyToId,
      _isForwarded: Boolean(isForwarded),
    };

    set((s) => ({ groupMessages: [...s.groupMessages, optimistic], replyingTo: null }));
    return get().transmit(clientId);
  },

  // text is encrypted with the group's latest key; never falls back to plaintext
  transmit: async (clientId) => {
    const msg = get().groupMessages.find((m) => m.clientId === clientId);
    if (!msg) return;
    set((s) => ({
      groupMessages: s.groupMessages.map((m) =>
        m.clientId === clientId ? { ...m, pending: true, failed: false } : m,
      ),
    }));
    try {
      const fd = new FormData();
      if (msg.isViewOnce || msg._isViewOnce) fd.append("isViewOnce", "true");

      if (msg.text) {
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
        let enc;
        try {
          enc = await encryptGroupText(msg.groupId, msg.text);
        } catch (e) {
          // group has no key yet / keys not loaded -> try once to fix, then retry
          if (
            e?.message === "group-not-encrypted" ||
            e?.message === "no-group-key"
          ) {
            await get().prepareGroupKeys(msg.groupId);
            enc = await encryptGroupText(msg.groupId, msg.text);
          } else {
            throw e;
          }
        }
        fd.append("text", enc.text);
        fd.append("iv", enc.iv);
        fd.append("keyVersion", String(enc.keyVersion));
        fd.append("encrypted", "true");
      }

      // The router accepts ONE field name ("image") for every attachment type.
      if (msg._file) fd.append("image", msg._file);
      if (msg._isVoice) {
        fd.append("isVoice", "true");
        fd.append("duration", String(msg._duration));
      }
      if (msg._isVideo) {
        fd.append("isVideo", "true");
        fd.append("duration", String(msg._duration));
      }
      if (msg._replyToId) fd.append("replyTo", msg._replyToId);
      if (msg._isForwarded) fd.append("isForwarded", "true");
      if (msg._gift || msg.gift) {
        fd.append("gift", JSON.stringify(msg._gift || msg.gift));
      }
      if (Array.isArray(msg._mentions) && msg._mentions.length > 0) {
        fd.append("mentions", JSON.stringify(msg._mentions));
      }
      fd.append("clientId", clientId);

      const res = await axiosInstance.post(
        `/groups/${msg.groupId}/messages`,
        fd,
        { timeout: 120000 },
      );

      const saved = unwrap(res);
      if (!saved) throw new Error("Empty server response");

      // Play subtle confirmation ding for successfully sent message
      soundService.playOutgoingMessageSound(saved?.id || saved?._id || clientId);

      // saved.text is ciphertext -> keep the plaintext we already have
      get().receiveMessage({
        ...saved,
        text: msg.text || "",
        decrypted: true,
        decryptFailed: false,
      });
    } catch (e) {
      console.error("send group message failed:", e?.response?.data || e);
      set((s) => ({
        groupMessages: s.groupMessages.map((m) =>
          m.clientId === clientId ? { ...m, pending: false, failed: true } : m,
        ),
      }));
      toast.error(e2eeErrMsg(e) || errMsg(e));
    }
  },

  editGroupMessage: async (groupId, messageId, text, mentions) => {
    try {
      const target = get().groupMessages.find((m) => sameId(m.id, messageId));
      if (!target) return false;

      let payload = { text, encrypted: false };
      if (Array.isArray(mentions)) {
        payload.mentions = JSON.stringify(mentions);
      }
      const isTargetEncrypted = Boolean(target.encrypted || target.e2ee);

      if (isTargetEncrypted) {
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
        let enc;
        try {
          enc = await encryptGroupText(groupId, text);
        } catch (e) {
          if (
            e?.message === "group-not-encrypted" ||
            e?.message === "no-group-key"
          ) {
            await get().prepareGroupKeys(groupId);
            enc = await encryptGroupText(groupId, text);
          } else {
            throw e;
          }
        }
        payload = {
          text: enc.text,
          iv: enc.iv,
          keyVersion: enc.keyVersion,
          encrypted: true,
          ...(Array.isArray(mentions) ? { mentions: JSON.stringify(mentions) } : {}),
        };
      }

      const res = await axiosInstance.patch(
        `/groups/${groupId}/messages/${messageId}`,
        payload,
      );
      const p = unwrap(res);

      set((s) => ({
        groupMessages: s.groupMessages.map((m) =>
          sameId(m.id, messageId)
            ? {
                ...m,
                text,
                ...(mentions ? { mentions } : {}),
                decrypted: true,
                decryptFailed: false,
                isEdited: true,
                editedAt: p?.editedAt || new Date().toISOString(),
              }
            : m,
        ),
        editingMessage: null,
      }));
      toast.success("Message edited");
      return true;
    } catch (e) {
      toast.error(e2eeErrMsg(e) || errMsg(e, "Failed to edit message"));
      return false;
    }
  },

  deleteForMe: async (groupId, messageId) => {
    const previous = get().groupMessages;
    const previousPinned = get().pinnedMessages;
    set((s) => ({
      groupMessages: s.groupMessages.filter((m) => !sameId(m.id, messageId)),
      pinnedMessages: (s.pinnedMessages || []).filter(
        (m) => !sameId(m.id, messageId),
      ),
    }));

    try {
      await axiosInstance.delete(`/groups/${groupId}/messages/${messageId}/me`);
      toast.success("Message deleted for you");
    } catch (error) {
      set({ groupMessages: previous, pinnedMessages: previousPinned });
      toast.error(errMsg(error, "Failed to delete"));
    }
  },

  deleteForEveryone: async (groupId, messageId) => {
    const previous = get().groupMessages;
    const previousPinned = get().pinnedMessages;
    set((s) => ({
      groupMessages: s.groupMessages.map((m) =>
        sameId(m.id, messageId)
          ? {
              ...m,
              text: "",
              image: null,
              file: null,
              audio: null,
              video: null,
              location: null,
              isDeleted: true,
              deletedAt: new Date().toISOString(),
            }
          : m,
      ),
      pinnedMessages: (s.pinnedMessages || []).filter(
        (m) => !sameId(m.id, messageId),
      ),
    }));

    try {
      await axiosInstance.delete(`/groups/${groupId}/messages/${messageId}`);
      toast.success("Message deleted for everyone");
    } catch (error) {
      set({ groupMessages: previous, pinnedMessages: previousPinned });
      toast.error(errMsg(error, "Failed to delete"));
    }
  },

  togglePin: async (groupId, messageId) => {
    const previous = get().groupMessages;
    const previousPinned = get().pinnedMessages;

    // Optimistic update
    const targetMsg = previous.find((m) => sameId(m.id, messageId));
    const isCurrentlyPinned = targetMsg ? Boolean(targetMsg.isPinned) : false;
    const nextPinnedState = !isCurrentlyPinned;

    set((s) => {
      const updatedMessages = s.groupMessages.map((m) =>
        sameId(m.id, messageId)
          ? {
              ...m,
              isPinned: nextPinnedState,
              pinnedBy: nextPinnedState ? myId() : null,
              pinnedAt: nextPinnedState ? new Date().toISOString() : null,
            }
          : m,
      );

      let updatedPinned = s.pinnedMessages || [];
      if (nextPinnedState) {
        const itemToAdd = updatedMessages.find((m) => sameId(m.id, messageId)) || targetMsg;
        if (itemToAdd) {
          updatedPinned = [
            { ...itemToAdd, isPinned: true, pinnedBy: myId(), pinnedAt: new Date().toISOString() },
            ...updatedPinned.filter((m) => !sameId(m.id, messageId)),
          ].slice(0, 5);
        }
      } else {
        updatedPinned = updatedPinned.filter((m) => !sameId(m.id, messageId));
      }

      return {
        groupMessages: updatedMessages,
        pinnedMessages: updatedPinned,
      };
    });

    try {
      const res = await axiosInstance.patch(
        `/groups/${groupId}/messages/${messageId}/pin`,
      );
      const p = unwrap(res);
      set((s) => {
        const updatedMessages = s.groupMessages.map((m) =>
          sameId(m.id, messageId)
            ? {
                ...m,
                isPinned: p.isPinned,
                pinnedBy: p.pinnedBy,
                pinnedByUser: p.pinnedByUser,
                pinnedAt: p.pinnedAt,
              }
            : m,
        );
        let updatedPinned = s.pinnedMessages || [];
        if (p.isPinned) {
          const item = updatedMessages.find((m) => sameId(m.id, messageId)) ||
            (p.message ? normalizeMsg(p.message) : null);
          if (item) {
            updatedPinned = [
              { ...item, isPinned: true, pinnedBy: p.pinnedBy, pinnedByUser: p.pinnedByUser, pinnedAt: p.pinnedAt },
              ...updatedPinned.filter((m) => !sameId(m.id, messageId)),
            ].slice(0, 5);
          }
        } else {
          updatedPinned = updatedPinned.filter((m) => !sameId(m.id, messageId));
        }
        return {
          groupMessages: updatedMessages,
          pinnedMessages: updatedPinned,
        };
      });
      toast.success(p.isPinned ? "Message pinned" : "Message unpinned");
      return true;
    } catch (error) {
      set({ groupMessages: previous, pinnedMessages: previousPinned });
      toast.error(errMsg(error, "Failed to update pin"));
      return false;
    }
  },

  toggleStar: async (groupId, messageId) => {
    try {
      const res = await axiosInstance.patch(
        `/groups/${groupId}/messages/${messageId}/star`,
      );
      const p = unwrap(res);
      set((s) => ({
        groupMessages: s.groupMessages.map((m) =>
          sameId(m.id, messageId)
            ? {
                ...m,
                isStarred: p.isStarred,
              }
            : m,
        ),
      }));
      toast.success(p.isStarred ? "Message starred" : "Message unstarred");
    } catch (error) {
      toast.error(errMsg(error, "Failed to update star"));
    }
  },

  /* =====================================================
   *             ADVANCED 6 MESSAGING FEATURES
   * ===================================================== */
  reactToGroupMessage: async (groupId, messageId, emoji) => {
    try {
      const res = await axiosInstance.post(
        `/groups/${groupId}/messages/${messageId}/reactions`,
        { emoji },
      );
      if (res.data?.success && res.data.data) {
        const { reactions, reactionSummary, total } = res.data.data;
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, reactions, reactionSummary, total } : m
          ),
        }));
      }
    } catch (err) {
      console.error("[useGroupStore] reactToGroupMessage failed:", err);
      toast.error(errMsg(err, "Failed to react"));
    }
  },

  openThread: async (parentMessage, groupId) => {
    const gid = groupId || get().selectedGroup?.id;
    const parentId = parentMessage.id || parentMessage._id;

    // Check if we already have a decrypted copy in groupMessages store
    const localMsg = get().groupMessages.find((m) =>
      sameId(m.id || m._id, parentId)
    );
    let initialParent = localMsg?.decrypted ? localMsg : parentMessage;
    if (!initialParent.decrypted && (initialParent.encrypted || initialParent.e2ee)) {
      try {
        initialParent = await decryptGroupMessage(initialParent, gid);
      } catch (e) {
        console.error("[useGroupStore] openThread decrypt error:", e);
      }
    }

    set({
      activeThread: {
        parentMessage: initialParent,
        replies: [],
        totalReplies: initialParent.threadReplyCount || 0,
        loading: true,
        isGroup: true,
        groupId: gid,
      },
    });

    try {
      const res = await axiosInstance.get(
        `/groups/${gid}/messages/${parentId}/thread`
      );
      if (res.data?.success && res.data.data) {
        const rawReplies = res.data.data.replies || [];
        const serverParent = res.data.data.parentMessage;
        let finalParent = initialParent;
        if (serverParent) {
          try {
            finalParent = await decryptGroupMessage(serverParent, gid);
          } catch (err) {
            console.error("[useGroupStore] openThread server parent decrypt error:", err);
          }
        }
        const decryptedReplies = await decryptGroupList(rawReplies, gid);
        set((s) => {
          if (
            !s.activeThread ||
            !sameId(
              s.activeThread.parentMessage?.id || s.activeThread.parentMessage?._id,
              parentId
            )
          ) {
            return s;
          }
          return {
            activeThread: {
              ...s.activeThread,
              parentMessage: finalParent,
              replies: decryptedReplies,
              totalReplies: res.data.data.totalReplies ?? decryptedReplies.length,
              loading: false,
            },
          };
        });
      }
    } catch (err) {
      console.error("[useGroupStore] openThread failed:", err);
      set((s) => ({
        activeThread:
          s.activeThread &&
          sameId(
            s.activeThread.parentMessage?.id || s.activeThread.parentMessage?._id,
            parentId
          )
            ? { ...s.activeThread, loading: false }
            : s.activeThread,
      }));
    }
  },

  closeThread: () => set({ activeThread: null }),

  sendThreadReply: async (text) => {
    const { activeThread, selectedGroup } = get();
    if (!activeThread?.parentMessage || !activeThread?.groupId) return;
    const parentId = activeThread.parentMessage.id || activeThread.parentMessage._id;
    const gid = activeThread.groupId;

    const clientId = newClientId();
    let payload = { text, clientId };
    let enc = null;

    const isGroupEncrypted = Boolean(
      selectedGroup?.e2ee || activeThread.parentMessage.e2ee || activeThread.parentMessage.encrypted
    );

    if (isGroupEncrypted && (await e2eeReady())) {
      try {
        enc = await encryptGroupText(gid, text);
      } catch (e) {
        if (e?.message === "group-not-encrypted" || e?.message === "no-group-key") {
          await get().prepareGroupKeys(gid).catch(() => {});
          enc = await encryptGroupText(gid, text).catch(() => null);
        }
      }
      if (enc) {
        payload = {
          text: enc.text,
          iv: enc.iv,
          keyVersion: enc.keyVersion,
          encrypted: true,
          e2ee: true,
          clientId,
        };
      } else {
        toast.error("Failed to encrypt group reply.");
        return;
      }
    }

    try {
      const res = await axiosInstance.post(
        `/groups/${gid}/messages/${parentId}/thread`,
        payload
      );
      if (res.data?.success && res.data.data) {
        let reply = res.data.data.reply || res.data.data;
        if (enc) {
          reply = { ...reply, text, decrypted: true, cryptoState: "decrypted" };
        } else {
          reply = await decryptGroupMessage(reply, gid);
        }

        const newCount =
          res.data.data.parentMessage?.threadReplyCount ??
          (activeThread.parentMessage.threadReplyCount || 0) + 1;
        set((s) => {
          if (
            !s.activeThread ||
            !sameId(
              s.activeThread.parentMessage?.id || s.activeThread.parentMessage?._id,
              parentId
            )
          ) {
            return s;
          }
          const exists = (s.activeThread.replies || []).some(
            (r) =>
              sameId(r.id || r._id, reply.id || reply._id) ||
              (reply.clientId && r.clientId && reply.clientId === r.clientId)
          );
          if (exists) return s;
          return {
            activeThread: {
              ...s.activeThread,
              replies: [...(s.activeThread.replies || []), reply],
              totalReplies: (s.activeThread.totalReplies || 0) + 1,
            },
            groupMessages: s.groupMessages.map((m) =>
              sameId(m.id || m._id, parentId)
                ? { ...m, threadReplyCount: newCount }
                : m
            ),
          };
        });
      }
    } catch (err) {
      console.error("[useGroupStore] sendThreadReply failed:", err);
      toast.error("Failed to send thread reply.");
      throw err;
    }
  },

  votePoll: async (messageId, optionIds, groupId) => {
    const gid = groupId || get().selectedGroup?.id;
    try {
      const res = await axiosInstance.post(
        `/groups/${gid}/messages/${messageId}/poll/vote`,
        { optionIds }
      );
      if (res.data?.success && res.data.data) {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, poll: res.data.data.poll } : m
          ),
        }));
      }
    } catch (err) {
      console.error("[useGroupStore] votePoll failed:", err);
      toast.error(errMsg(err, "Failed to submit vote"));
      throw err;
    }
  },

  closePoll: async (messageId, groupId) => {
    const gid = groupId || get().selectedGroup?.id;
    try {
      const res = await axiosInstance.post(
        `/groups/${gid}/messages/${messageId}/poll/close`
      );
      if (res.data?.success && res.data.data) {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, poll: res.data.data.poll } : m
          ),
        }));
        toast.success("Poll closed.");
      }
    } catch (err) {
      console.error("[useGroupStore] closePoll failed:", err);
      toast.error(errMsg(err, "Failed to close poll"));
    }
  },

  markViewOnceOpened: async (messageId, groupId) => {
    const gid = groupId || get().selectedGroup?.id;
    try {
      await axiosInstance.post(
        `/groups/${gid}/messages/${messageId}/view-once/open`
      );
      set((s) => ({
        groupMessages: s.groupMessages.map((m) =>
          sameId(m.id, messageId)
            ? { ...m, viewOnceExpired: true, image: null, video: null, file: null }
            : m
        ),
      }));
    } catch (err) {
      console.error("[useGroupStore] markViewOnceOpened failed:", err);
    }
  },

  setGroupDisappearing: async (groupId, seconds) => {
    try {
      const res = await axiosInstance.patch(`/groups/${groupId}/disappearing`, {
        seconds,
      });
      if (res.data?.success) {
        set((s) => ({
          selectedGroup:
            s.selectedGroup && sameId(s.selectedGroup.id, groupId)
              ? { ...s.selectedGroup, disappearAfter: seconds }
              : s.selectedGroup,
          groups: s.groups.map((g) =>
            sameId(g.id, groupId) ? { ...g, disappearAfter: seconds } : g
          ),
        }));
        toast.success("Disappearing messages updated.");
      }
    } catch (err) {
      console.error("[useGroupStore] setGroupDisappearing failed:", err);
      toast.error(errMsg(err, "Failed to set disappearing messages"));
    }
  },

  forwardGroupMessage: async (message, targetUserIds = [], targetGroupIds = []) => {
    try {
      if (!message || message.isDeleted) return false;
      const text = message.text || "";
      let anySent = false;

      // 1. Send to groups
      for (const gid of targetGroupIds) {
        let encPayload = {};
        if (text) {
          try {
            const enc = await encryptGroupText(gid, text);
            encPayload = {
              text: enc.text,
              iv: enc.iv,
              keyVersion: String(enc.keyVersion),
              encrypted: "true",
            };
          } catch {
            await get().prepareGroupKeys(gid).catch(() => 0);
            const enc = await encryptGroupText(gid, text).catch(() => null);
            if (enc) {
              encPayload = {
                text: enc.text,
                iv: enc.iv,
                keyVersion: String(enc.keyVersion),
                encrypted: "true",
              };
            }
          }
        }
        const fd = new FormData();
        if (encPayload.text) {
          fd.append("text", encPayload.text);
          fd.append("iv", encPayload.iv);
          fd.append("keyVersion", encPayload.keyVersion);
          fd.append("encrypted", "true");
        } else if (text) {
          fd.append("text", text);
        }
        fd.append("isForwarded", "true");
        fd.append("clientId", newClientId());

        await axiosInstance.post(`/groups/${gid}/messages`, fd);
        anySent = true;
      }

      // 2. Send to 1:1 user targets
      for (const uid of targetUserIds) {
        let payload = { isForwarded: true, clientId: newClientId() };
        if (text) {
          try {
            const enc = await encryptFor(uid, text);
            payload.text = enc.text;
            payload.iv = enc.iv;
            payload.keyEnvelopes = enc.keyEnvelopes;
            payload.encrypted = true;
          } catch {
            payload.text = text;
            payload.encrypted = false;
          }
        }
        await axiosInstance.post(`/messages/send/${uid}`, payload);
        anySent = true;
      }

      if (anySent) {
        toast.success("Message forwarded");
        return true;
      }
      return false;
    } catch (e) {
      toast.error(errMsg(e, "Failed to forward message"));
      return false;
    }
  },

  retryMessage: (clientId) => get().transmit(clientId),

  discardMessage: (clientId) =>
    set((s) => {
      const m = s.groupMessages.find((x) => x.clientId === clientId);
      revokeMsgBlobs(m);
      return {
        groupMessages: s.groupMessages.filter((x) => x.clientId !== clientId),
      };
    }),

  // Sync insert. Expects ALREADY-DECRYPTED data (use ingestMessage for raw server data)
  receiveMessage: (raw) => {
    const msg = normalizeMsg(raw);
    const s = get();
    if (!sameId(s.selectedGroup?.id, msg.groupId)) return;

    const idx = s.groupMessages.findIndex(
      (m) =>
        sameId(m.id, msg.id) || (msg.clientId && m.clientId === msg.clientId),
    );

    if (idx === -1) {
      set({ groupMessages: [...s.groupMessages, msg] });
      return;
    }

    const old = s.groupMessages[idx];
    revokeMsgBlobs(old);

    const next = [...s.groupMessages];
    next[idx] = { ...msg, readBy: union(old.readBy, msg.readBy) };
    set({ groupMessages: next });
  },

  // Normalize -> immediate insert with decrypting state -> async decrypt in background
  ingestMessage: async (raw) => {
    const normalized = normalizeMsg(raw);
    const isEncrypted = Boolean(normalized.encrypted && normalized.iv);
    const initial = {
      ...normalized,
      cryptoState: isEncrypted ? "decrypting" : "plaintext",
      text: isEncrypted ? "" : (normalized.text ?? ""),
      _cipher: isEncrypted ? (normalized._cipher ?? normalized.text) : null,
      decrypted: !isEncrypted,
      decryptFailed: false,
    };
    get().receiveMessage(initial);

    if (isEncrypted) {
      decryptGroupMessage(initial)
        .then((decrypted) => {
          get().receiveMessage({
            ...decrypted,
            cryptoState: "decrypted",
            decrypted: true,
            decryptFailed: false,
            _cipher: null,
            decryptError: null,
          });
        })
        .catch((err) => {
          console.error("[group] Decryption failed:", err);
          get().receiveMessage({
            ...initial,
            text: "",
            decrypted: false,
            decryptFailed: true,
            cryptoState: "decryption_failed",
            decryptError: err?.message || "Group decryption failed",
          });
        });
    }
    return initial;
  },

  markSeen: async (groupId) => {
    set((s) => ({
      groups: s.groups.map((g) =>
        sameId(g.id, groupId) ? { ...g, unreadCount: 0 } : g,
      ),
    }));

    const key = String(groupId);
    if (seenInFlight.has(key)) {
      seenDirty.add(key);
      return;
    }
    seenInFlight.add(key);
    try {
      await axiosInstance.post(`/groups/${groupId}/seen`);
    } catch {
      get().fetchGroups({ silent: true });
    } finally {
      seenInFlight.delete(key);
      if (seenDirty.delete(key)) get().markSeen(groupId);
    }
  },

  emitTyping: (isTyping) => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;
    if (!selectedGroup || !socket) return;
    if (
      isTyping &&
      usePrivacyStore.getState().privacy?.typingIndicator === false
    ) {
      return;
    }
    socket.emit("group:typing", {
      groupId: String(selectedGroup.id),
      isTyping,
    });
  },

  /* =====================================================
   *            SCHEDULED GROUP MESSAGES
   * ===================================================== */
  scheduleGroupMessage: async (groupId, text, scheduledFor) => {
    try {
      if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
      let enc;
      try {
        enc = await encryptGroupText(groupId, text);
      } catch (e) {
        if (
          e?.message === "group-not-encrypted" ||
          e?.message === "no-group-key"
        ) {
          await get().prepareGroupKeys(groupId);
          enc = await encryptGroupText(groupId, text);
        } else {
          throw e;
        }
      }
      const clientRequestId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      await axiosInstance.post(`/groups/${groupId}/schedule`, {
        text: enc.text,
        iv: enc.iv,
        groupKeyVersion: enc.keyVersion,
        encrypted: true,
        e2ee: true,
        scheduledFor,
        clientRequestId,
      });

      toast.success("Group message scheduled");
      get().getScheduled(groupId);
      return true;
    } catch (error) {
      toast.error(
        e2eeErrMsg(error) || errMsg(error, "Failed to schedule group message"),
      );
      return false;
    }
  },

  getScheduled: async (groupId) => {
    try {
      const res = await axiosInstance.get("/scheduled", {
        params: groupId ? { groupId, type: "group" } : { type: "group" },
      });
      const raw = unwrap(res) || res.data?.data || [];
      const items = await Promise.all(
        raw.map(async (it) => {
          try {
            if (it.e2ee && it.iv && it.groupKeyVersion != null) {
              const text = await decryptGroupText(
                groupId || it.groupId,
                it.groupKeyVersion,
                it.text,
                it.iv,
              );
              return { ...it, id: it._id || it.id, text, decrypted: true };
            }
            return { ...it, id: it._id || it.id };
          } catch (_err) {
            return {
              ...it,
              id: it._id || it.id,
              text: "(Encrypted message)",
              decrypted: false,
            };
          }
        }),
      );
      set({ scheduled: items });
    } catch (error) {
      toast.error(errMsg(error, "Failed to load scheduled group messages"));
    }
  },

  editScheduledMessage: async (scheduleId, groupId, text, scheduledFor) => {
    try {
      const payload = {};
      if (text) {
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
        let enc;
        try {
          enc = await encryptGroupText(groupId, text);
        } catch (e) {
          if (
            e?.message === "group-not-encrypted" ||
            e?.message === "no-group-key"
          ) {
            await get().prepareGroupKeys(groupId);
            enc = await encryptGroupText(groupId, text);
          } else {
            throw e;
          }
        }
        payload.text = enc.text;
        payload.iv = enc.iv;
        payload.groupKeyVersion = enc.keyVersion;
        payload.encrypted = true;
        payload.e2ee = true;
      }
      if (scheduledFor) {
        payload.scheduledFor = scheduledFor;
      }
      await axiosInstance.patch(`/scheduled/${scheduleId}`, payload);
      toast.success("Scheduled message updated");
      get().getScheduled(groupId);
      return true;
    } catch (error) {
      toast.error(
        e2eeErrMsg(error) || errMsg(error, "Failed to update scheduled message"),
      );
      return false;
    }
  },

  cancelScheduled: async (scheduleId) => {
    const previous = get().scheduled;
    set((s) => ({
      scheduled: s.scheduled.filter(
        (x) => !sameId(x._id || x.id, scheduleId),
      ),
    }));
    try {
      await axiosInstance.delete(`/scheduled/${scheduleId}`);
      toast.success("Scheduled group message cancelled");
    } catch (error) {
      set({ scheduled: previous });
      toast.error(errMsg(error, "Failed to cancel"));
    }
  },

  sendScheduledNow: async (scheduleId, groupId) => {
    try {
      await axiosInstance.post(`/scheduled/${scheduleId}/send-now`);
      toast.success("Group message sent immediately");
      if (groupId) get().getScheduled(groupId);
      return true;
    } catch (error) {
      toast.error(errMsg(error, "Failed to send scheduled group message now"));
      return false;
    }
  },

  /* =====================================================
   *            LIVE LOCATION (not encrypted)
   * ===================================================== */
  getMyShare: (groupId) => {
    const me = myId();
    return Object.values(get().liveShares[groupId] || {}).find((sh) =>
      sameId(sh.sharerId, me),
    );
  },

  // coords = { lat, lng, accuracy }
  sendCurrentLocation: async (groupId, coords) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/location`, {
        mode: "current",
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        clientId: newClientId(),
      });
      const saved = unwrap(res);
      if (saved) await get().ingestMessage(saved);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  // durationMin: 15 | 60 | 480
  startLiveLocation: async (groupId, coords, durationMin) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/location`, {
        mode: "live",
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        durationMin,
        clientId: newClientId(),
      });
      const { message, share } = unwrap(res) || {};
      if (message) await get().ingestMessage(message);
      if (share) {
        const sh = normalizeShare({ ...share, groupId });
        get().setShare(sh);
        get().startWatch(groupId, sh.shareId);
      }
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  stopLiveLocation: async (groupId, shareId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/location/${shareId}/stop`);
      get().endShareLocal(groupId, shareId);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  fetchActiveShares: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/location/active`);
      const { mine = [], inGroup = [] } = unwrap(res) || {};
      const map = {};
      [...mine, ...inGroup].forEach((raw) => {
        const sh = normalizeShare({ ...raw, groupId });
        map[sh.shareId] = sh;
      });
      set((s) => ({ liveShares: { ...s.liveShares, [groupId]: map } }));
      mine.forEach((raw) => get().startWatch(groupId, idOf(raw._id ?? raw.id)));
    } catch {
      /* silent */
    }
  },

  // after refresh/login resume MY active shares in ALL groups
  resumeMyLiveShares: async () => {
    const list = get().groups.filter((g) => !g.archived);
    await Promise.all(list.map((g) => get().fetchActiveShares(g.id)));
  },

  setShare: (share) =>
    set((s) => ({
      liveShares: {
        ...s.liveShares,
        [share.groupId]: {
          ...(s.liveShares[share.groupId] || {}),
          [share.shareId]: {
            ...(s.liveShares[share.groupId]?.[share.shareId] || {}),
            ...share,
          },
        },
      },
    })),

  endShareLocal: (groupId, shareId) => {
    get().stopWatch(shareId);
    set((s) => {
      const { [shareId]: _gone, ...rest } = s.liveShares[groupId] || {};
      return {
        liveShares: { ...s.liveShares, [groupId]: rest },
        groupMessages: s.groupMessages.map((m) =>
          m.location && sameId(m.location.shareId, shareId)
            ? { ...m, location: { ...m.location, isLive: false } }
            : m,
        ),
      };
    });
  },

  startWatch: (groupId, shareId) => {
    if (watchers.has(shareId)) return;
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }

    const entry = { watchId: null, last: 0 };
    entry.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - entry.last < LIVE_PUSH_MS) return;
        entry.last = now;
        get().pushLivePosition(groupId, shareId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        console.error("watchPosition error:", err?.message || err);
        if (err?.code === 1) {
          toast.error("Location permission denied. Live sharing stopped.");
          get().stopLiveLocation(groupId, shareId);
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    watchers.set(shareId, entry);
  },

  stopWatch: (shareId) => {
    const entry = watchers.get(shareId);
    if (entry && navigator.geolocation) {
      navigator.geolocation.clearWatch(entry.watchId);
    }
    watchers.delete(shareId);
  },

  stopAllWatchers: () => {
    [...watchers.keys()].forEach((id) => get().stopWatch(id));
    set({ liveShares: {} });
  },

  pushLivePosition: async (groupId, shareId, coords) => {
    try {
      await axiosInstance.patch(
        `/groups/${groupId}/location/${shareId}`,
        coords,
      );
    } catch (e) {
      const status = e?.response?.status;
      // 404 = share not found / stopped, 410 = expired
      if (status === 404 || status === 410) {
        get().endShareLocal(groupId, shareId);
      }
    }
  },

  /* ---------- logout: reset everything in one call ---------- */
  resetOnLogout: () => {
    get().stopAllWatchers();
    get().unsubscribeFromGroups();
    get().groupMessages.forEach(revokeMsgBlobs);
    seenInFlight.clear();
    seenDirty.clear();
    set({
      groups: [],
      selectedGroup: null,
      groupMessages: [],
      typing: {},
      liveShares: {},
      isGroupsLoading: false,
      isGroupMessagesLoading: false,
    });
  },

  /* ---------- realtime ---------- */
  subscribeToGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    if (subscribedGroupSocket === socket && handlers) return;
    get().unsubscribeFromGroups();

    const h = {
      "group:created": (g) => get().applyGroupUpdate(g),
      "group:updated": (g) => {
        get().applyGroupUpdate(g);
        // members may have changed -> resolve pending keys for the open group
        if (sameId(get().selectedGroup?.id, g?.id)) {
          get().syncPendingGroupKeys(g.id);
        }
      },
      "group:removed": ({ groupId }) => get().dropGroup(groupId),
      "group:deleted": ({ groupId }) => get().dropGroup(groupId),

      // OPTIONAL: emit this from the server after POST /groups/:id/keys
      // so members who were waiting for a key can decrypt immediately.
      "group:keysUpdated": ({ groupId }) => get().refreshGroupKeys(groupId),
      "group:keysNeeded": ({ groupId, userIds }) => {
        if (groupId && Array.isArray(userIds) && userIds.length) {
          get().shareKeyWith(groupId, userIds);
        } else if (groupId) {
          get().syncPendingGroupKeys(groupId);
        }
      },
      "group:keyRotationRequired": ({ groupId }) => {
        if (groupId) {
          get().rotateGroupKey(groupId);
        }
      },

      "group:archiveChanged": ({ groupId, archived }) =>
        get().setGroupArchived(groupId, Boolean(archived)),

      "group:newMessage": async (raw) => {
        const msg = await get().ingestMessage(raw);

        if (msg.location?.isLive && msg.location.shareId) {
          get().setShare(
            normalizeShare({
              shareId: msg.location.shareId,
              groupId: msg.groupId,
              sharerId: msg.senderId,
              lat: msg.location.lat,
              lng: msg.location.lng,
              accuracy: msg.location.accuracy,
              updatedAt: msg.createdAt,
            }),
          );
        }

        // sender stopped typing once their message arrives
        const typingKey = `${msg.groupId}:${msg.senderId}`;
        if (groupTypingTimers.has(typingKey)) {
          clearTimeout(groupTypingTimers.get(typingKey));
          groupTypingTimers.delete(typingKey);
        }
        set((s) => {
          const cur = { ...(s.typing[msg.groupId] || {}) };
          delete cur[msg.senderId];
          return { typing: { ...s.typing, [msg.groupId]: cur } };
        });

        const open = sameId(get().selectedGroup?.id, msg.groupId);
        if (open && visible() && !sameId(msg.senderId, myId())) {
          get().markSeen(msg.groupId);
        }

        const isGroupActiveAndFocused =
          Boolean(open) &&
          visible() &&
          (typeof document !== "undefined" &&
          typeof document.hasFocus === "function"
            ? document.hasFocus()
            : true);

        const currentGroup = get().groups.find((g) =>
          sameId(g.id, msg.groupId),
        );
        const senderMember = currentGroup?.members?.find((m) =>
          sameId(m.userId?._id || m.userId, msg.senderId),
        );
        const senderName =
          msg.sender?.fullName ||
          senderMember?.userId?.fullName ||
          "Group Member";
        const groupTitle = currentGroup?.name
          ? `${senderName} (${currentGroup.name})`
          : senderName;

        notificationService.handleIncomingMessage({
          ...msg,
          groupId: msg.groupId,
          chatId: String(msg.groupId),
          senderName: groupTitle,
          avatar:
            typeof currentGroup?.avatar === "string"
              ? currentGroup.avatar
              : currentGroup?.avatar?.url || "",
          currentUserId: myId(),
          isFocusedSameChat: isGroupActiveAndFocused,
          onNotificationClick: (targetGroupId) => {
            const gid = String(targetGroupId);
            if (useChatLockStore.getState().isChatLocked(gid)) {
              useChatLockStore.getState().openUnlockModal(gid);
              return;
            }
            const targetG = get().groups.find((g) =>
              sameId(g.id, targetGroupId),
            );
            if (targetG) {
              get().selectGroup(targetG);
            }
            if (
              typeof window !== "undefined" &&
              window.location.pathname !== "/chat"
            ) {
              window.history.pushState(null, "", "/chat");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          },
        });
      },

      "group:conversationUpdated": async (u) => {
        const lastMessage = await decryptGroupPreview(u.lastMessage, u.groupId);
        set((s) => {
          const open = sameId(s.selectedGroup?.id, u.groupId) && visible();
          return {
            groups: sortGroups(
              s.groups.map((g) =>
                sameId(g.id, u.groupId)
                  ? {
                      ...g,
                      unreadCount: open ? 0 : u.unreadCount,
                      lastMessage,
                      lastMessageAt: u.lastMessageAt || g.lastMessageAt,
                    }
                  : g,
              ),
            ),
          };
        });
      },

      "group:messagesSeen": ({ groupId, seenBy, messageIds = [] }) =>
        set((s) =>
          !sameId(s.selectedGroup?.id, groupId)
            ? {}
            : {
                groupMessages: s.groupMessages.map((m) =>
                  messageIds.some((id) => sameId(idOf(id), m.id))
                    ? { ...m, readBy: union(m.readBy, [String(seenBy)]) }
                    : m,
                ),
              },
        ),

      "group:messageEdited": async (payload) => {
        const msg = normalizeMsg(payload);
        if (!sameId(get().selectedGroup?.id, msg.groupId)) return;
        const s = get();
        const existing = s.groupMessages.find((m) => sameId(m.id, msg.id));
        if (!existing) return;

        let decryptedText = msg.text;
        let isDecrypted = !msg.encrypted;
        let isFailed = false;

        if (msg.encrypted && msg.iv) {
          try {
            decryptedText = await decryptGroupText(
              msg.groupId,
              msg.text,
              msg.iv,
              msg.keyVersion,
            );
            isDecrypted = true;
          } catch {
            isFailed = true;
            isDecrypted = false;
          }
        }

        set((st) => ({
          groupMessages: st.groupMessages.map((m) =>
            sameId(m.id, msg.id)
              ? {
                  ...m,
                  text: isDecrypted ? decryptedText : m.text,
                  isEdited: true,
                  editedAt: msg.editedAt || new Date().toISOString(),
                  decrypted: isDecrypted,
                  decryptFailed: isFailed,
                  cryptoState: isDecrypted
                    ? "decrypted"
                    : isFailed
                      ? "decryption_failed"
                      : m.cryptoState,
                }
              : m,
          ),
        }));
      },

      groupMessageReaction: ({ messageId, reactions, reactionSummary, total }) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, reactions, reactionSummary, total } : m
          ),
          activeThread: s.activeThread
            ? sameId(s.activeThread.parentMessage?.id, messageId)
              ? { ...s.activeThread, parentMessage: { ...s.activeThread.parentMessage, reactions } }
              : {
                  ...s.activeThread,
                  replies: (s.activeThread.replies || []).map((r) =>
                    sameId(r.id, messageId) ? { ...r, reactions } : r
                  ),
                }
            : null,
        }));
      },

      "message:reaction:updated": ({ messageId, reactions, reactionSummary, total }) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, reactions, reactionSummary, total } : m
          ),
          activeThread: s.activeThread
            ? sameId(s.activeThread.parentMessage?.id, messageId)
              ? { ...s.activeThread, parentMessage: { ...s.activeThread.parentMessage, reactions } }
              : {
                  ...s.activeThread,
                  replies: (s.activeThread.replies || []).map((r) =>
                    sameId(r.id, messageId) ? { ...r, reactions } : r
                  ),
                }
            : null,
        }));
      },

      groupThreadReply: async ({ parentMessageId, reply }) => {
        let decReply = reply;
        try {
          const { activeThread } = get();
          decReply = await decryptGroupMessage(reply, activeThread?.groupId);
        } catch (err) {
          console.error("[useGroupStore] groupThreadReply decrypt error:", err);
        }
        const { activeThread } = get();
        if (
          activeThread &&
          sameId(activeThread.parentMessage?.id || activeThread.parentMessage?._id, parentMessageId)
        ) {
          const replyId = decReply.id || decReply._id;
          const exists = (activeThread.replies || []).some(
            (r) =>
              sameId(r.id || r._id, replyId) ||
              (decReply.clientId && r.clientId && decReply.clientId === r.clientId)
          );
          if (exists) {
            set((s) => ({
              activeThread: {
                ...s.activeThread,
                replies: (s.activeThread.replies || []).map((r) =>
                  sameId(r.id || r._id, replyId) ||
                  (decReply.clientId && r.clientId && decReply.clientId === r.clientId)
                    ? { ...r, ...decReply }
                    : r
                ),
              },
            }));
            return;
          }
          set((s) => ({
            activeThread: {
              ...s.activeThread,
              replies: [...(s.activeThread.replies || []), decReply],
              totalReplies: (s.activeThread.totalReplies || 0) + 1,
            },
          }));
        }
      },

      threadUpdated: ({ parentMessageId, threadReplyCount, threadLastReplyAt }) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id || m._id, parentMessageId)
              ? { ...m, threadReplyCount, threadLastReplyAt }
              : m
          ),
          activeThread:
            s.activeThread &&
            sameId(s.activeThread.parentMessage?.id || s.activeThread.parentMessage?._id, parentMessageId)
              ? {
                  ...s.activeThread,
                  totalReplies:
                    threadReplyCount !== undefined ? threadReplyCount : s.activeThread.totalReplies,
                  parentMessage: s.activeThread.parentMessage
                    ? {
                        ...s.activeThread.parentMessage,
                        threadReplyCount:
                          threadReplyCount !== undefined
                            ? threadReplyCount
                            : s.activeThread.parentMessage.threadReplyCount,
                        threadLastReplyAt:
                          threadLastReplyAt || s.activeThread.parentMessage.threadLastReplyAt,
                      }
                    : s.activeThread.parentMessage,
                }
              : s.activeThread,
        }));
      },

      groupThreadReplyDeleted: ({ groupId, parentMessageId, replyId, threadReplyCount }) => {
        const { activeThread } = get();
        if (
          activeThread &&
          sameId(activeThread.parentMessage?.id || activeThread.parentMessage?._id, parentMessageId)
        ) {
          set((st) => ({
            activeThread: {
              ...st.activeThread,
              replies: (st.activeThread.replies || []).filter(
                (r) => !sameId(r.id || r._id, replyId)
              ),
              totalReplies:
                threadReplyCount !== undefined
                  ? threadReplyCount
                  : Math.max(0, (st.activeThread.totalReplies || 1) - 1),
            },
          }));
        }
        set((st) => ({
          groupMessages: st.groupMessages.map((m) =>
            sameId(m.id || m._id, parentMessageId)
              ? { ...m, threadReplyCount }
              : m
          ),
        }));
      },

      pollUpdated: ({ messageId, poll }) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId) ? { ...m, poll } : m
          ),
        }));
      },

      viewOnceOpened: ({ messageId }) => {
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            sameId(m.id, messageId)
              ? { ...m, viewOnceExpired: true, image: null, video: null, file: null }
              : m
          ),
        }));
      },

      groupDisappearingUpdated: ({ groupId, disappearAfter }) => {
        set((s) => ({
          selectedGroup:
            s.selectedGroup && sameId(s.selectedGroup.id, groupId)
              ? { ...s.selectedGroup, disappearAfter }
              : s.selectedGroup,
          groups: s.groups.map((g) =>
            sameId(g.id, groupId) ? { ...g, disappearAfter } : g
          ),
        }));
      },

      "group:messageDeleted": ({ groupId, messageId }) => {
        if (!sameId(get().selectedGroup?.id, groupId)) return;
        set((st) => {
          const next = {
            groupMessages: st.groupMessages.map((m) =>
              sameId(m.id || m._id, messageId)
                ? {
                    ...m,
                    text: "",
                    image: null,
                    file: null,
                    audio: null,
                    video: null,
                    location: null,
                    isDeleted: true,
                    deletedAt: new Date().toISOString(),
                  }
                : m,
            ),
            pinnedMessages: (st.pinnedMessages || []).filter(
              (m) => !sameId(m.id || m._id, messageId),
            ),
          };
          if (st.activeThread) {
            const isParent = sameId(st.activeThread.parentMessage?.id || st.activeThread.parentMessage?._id, messageId);
            const isReply = (st.activeThread.replies || []).some((r) => sameId(r.id || r._id, messageId));
            if (isParent) {
              next.activeThread = {
                ...st.activeThread,
                parentMessage: {
                  ...st.activeThread.parentMessage,
                  isDeleted: true,
                  text: "",
                  image: null,
                  file: null,
                },
              };
            } else if (isReply) {
              next.activeThread = {
                ...st.activeThread,
                replies: (st.activeThread.replies || []).map((r) =>
                  sameId(r.id || r._id, messageId)
                    ? {
                        ...r,
                        isDeleted: true,
                        text: "",
                        image: null,
                        file: null,
                      }
                    : r
                ),
              };
            }
          }
          return next;
        });
      },

      "group:messageDeletedForMe": ({ groupId, messageId }) => {
        if (!sameId(get().selectedGroup?.id, groupId)) return;
        set((st) => {
          const next = {
            groupMessages: st.groupMessages.filter(
              (m) => !sameId(m.id || m._id, messageId),
            ),
            pinnedMessages: (st.pinnedMessages || []).filter(
              (m) => !sameId(m.id || m._id, messageId),
            ),
          };
          if (st.activeThread) {
            const isReply = (st.activeThread.replies || []).some((r) => sameId(r.id || r._id, messageId));
            if (isReply) {
              next.activeThread = {
                ...st.activeThread,
                replies: (st.activeThread.replies || []).filter((r) => !sameId(r.id || r._id, messageId)),
              };
            }
          }
          return next;
        });
      },

      "group:messagePinned": async ({
        groupId,
        messageId,
        isPinned,
        pinnedBy,
        pinnedByUser,
        pinnedAt,
        message,
      }) => {
        if (!sameId(get().selectedGroup?.id, groupId)) return;
        const isPin = Boolean(isPinned);
        set((st) => ({
          groupMessages: st.groupMessages.map((m) =>
            sameId(m.id, messageId)
              ? {
                  ...m,
                  isPinned: isPin,
                  pinnedBy: isPin ? (pinnedBy || myId()) : null,
                  pinnedByUser: isPin ? pinnedByUser : null,
                  pinnedAt: isPin ? (pinnedAt || new Date().toISOString()) : null,
                }
              : m,
          ),
        }));

        if (isPin) {
          if (message) {
            const [decrypted] = await decryptGroupList(
              [normalizeMsg(message)],
              groupId,
            );
            set((st) => {
              const without = (st.pinnedMessages || []).filter(
                (m) => !sameId(m.id, messageId),
              );
              return {
                pinnedMessages: [decrypted, ...without].slice(0, 5),
              };
            });
          } else {
            const existingMsg = get().groupMessages.find((m) =>
              sameId(m.id, messageId),
            );
            if (existingMsg) {
              set((st) => {
                const without = (st.pinnedMessages || []).filter(
                  (m) => !sameId(m.id, messageId),
                );
                return {
                  pinnedMessages: [
                    {
                      ...existingMsg,
                      isPinned: true,
                      pinnedBy,
                      pinnedByUser,
                      pinnedAt,
                    },
                    ...without,
                  ].slice(0, 5),
                };
              });
            } else {
              get().fetchPinnedMessages(groupId);
            }
          }
        } else {
          set((st) => ({
            pinnedMessages: (st.pinnedMessages || []).filter(
              (m) => !sameId(m.id, messageId),
            ),
          }));
        }
      },

      
      "group:messageStarred": ({ groupId, messageId, isStarred }) => {
        if (!sameId(get().selectedGroup?.id, groupId)) return;
        set((st) => ({
          groupMessages: st.groupMessages.map((m) =>
            sameId(m.id, messageId)
              ? {
                  ...m,
                  isStarred: Boolean(isStarred),
                }
              : m,
          ),
        }));
      },

      
      "group:typing": ({ groupId, userId, fullName, isTyping }) => {
        const key = `${groupId}:${userId}`;
        if (groupTypingTimers.has(key)) {
          clearTimeout(groupTypingTimers.get(key));
          groupTypingTimers.delete(key);
        }

        if (isTyping) {
          groupTypingTimers.set(
            key,
            setTimeout(() => {
              groupTypingTimers.delete(key);
              set((s) => {
                if (!s.typing[groupId]?.[userId]) return {};
                const cur = { ...(s.typing[groupId] || {}) };
                delete cur[userId];
                return { typing: { ...s.typing, [groupId]: cur } };
              });
            }, 4000),
          );
        }

        set((s) => {
          const cur = { ...(s.typing[groupId] || {}) };
          if (isTyping) cur[userId] = fullName;
          else delete cur[userId];
          return { typing: { ...s.typing, [groupId]: cur } };
        });
      },

      /* ---- live location ---- */
      "group:location:update": (p) => {
        const sh = normalizeShare(p);
        get().setShare(sh);
        set((s) => ({
          groupMessages: s.groupMessages.map((m) =>
            m.location && sameId(m.location.shareId, sh.shareId)
              ? {
                  ...m,
                  location: {
                    ...m.location,
                    lat: sh.lat,
                    lng: sh.lng,
                    accuracy: sh.accuracy,
                  },
                }
              : m,
          ),
        }));
      },

      
      "group:location:ended": ({ groupId, shareId }) =>
        get().endShareLocal(String(groupId), String(shareId)),

      "scheduled:sent": ({ scheduleId, groupId }) => {
        set((st) => ({
          scheduled: st.scheduled.filter(
            (x) => !sameId(x._id || x.id, scheduleId),
          ),
        }));
        if (groupId && sameId(get().selectedGroup?.id, groupId)) {
          get().getScheduled(groupId);
        }
      },
      "scheduled:cancelled": ({ id }) => {
        set((st) => ({
          scheduled: st.scheduled.filter((x) => !sameId(x._id || x.id, id)),
        }));
      },

            "scheduled:created": ({ groupId }) => {
        if (groupId && sameId(get().selectedGroup?.id, groupId)) {
          get().getScheduled(groupId);
        }
      },
      "scheduled:updated": ({ groupId }) => {
        if (groupId && sameId(get().selectedGroup?.id, groupId)) {
          get().getScheduled(groupId);
        }
      },
      "scheduled:failed": ({ error, groupId }) => {
        if (error) toast.error(`Scheduled group message failed: ${error}`);
        if (groupId && sameId(get().selectedGroup?.id, groupId)) {
          get().getScheduled(groupId);
        }
      },

      connect: async () => {
        await whenE2EEReady();
        await get().fetchGroups({ silent: true });
        const open = get().selectedGroup;
        if (open) {
          get()
            .fetchMessages(open.id)
            .then(() => visible() && get().markSeen(open.id));
        }
        get().resumeMyLiveShares();
      },
    };

    Object.keys(h).forEach((ev) => socket.off(ev));
    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    handlers = h;
    subscribedGroupSocket = socket;

    if (typeof window !== "undefined" && !groupProfileUpdatedHandler) {
      groupProfileUpdatedHandler = ({ detail } = {}) => {
        const uid = detail?.userId;
        if (!uid) return;
        get().fetchGroups({ silent: true });
        set((s) => {
          const open = s.selectedGroup;
          const member = open?.members?.find((m) => sameId(m.id, uid));
          if (!member) return {};
          return {
            groupMessages: s.groupMessages.map((m) =>
              sameId(m.senderId, uid) && m.sender
                ? { ...m, sender: { ...m.sender, avatar: member.avatar } }
                : m,
            ),
          };
        });
      };
      window.addEventListener(
        "chatty:profile-updated",
        groupProfileUpdatedHandler,
      );
    }

    get()
      .fetchGroups({ silent: true })
      .then(() => get().resumeMyLiveShares());
  },

  unsubscribeFromGroups: () => {
    groupTypingTimers.forEach((t) => clearTimeout(t));
    groupTypingTimers.clear();
    const socket = subscribedGroupSocket || useAuthStore.getState().socket;
    if (socket && handlers) {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
    }
    if (typeof window !== "undefined" && groupProfileUpdatedHandler) {
      window.removeEventListener(
        "chatty:profile-updated",
        groupProfileUpdatedHandler,
      );
      groupProfileUpdatedHandler = null;
    }
    handlers = null;
    subscribedGroupSocket = null;
  },
}));
