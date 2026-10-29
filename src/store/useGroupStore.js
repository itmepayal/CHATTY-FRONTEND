import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import {
  encryptGroupText,
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

const sameId = (a, b) => String(a) === String(b);
const idOf = (v) => String(v?._id ?? v?.id ?? v ?? "");
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

const visible = () => document.visibilityState === "visible";

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
const seenInFlight = new Set();
const seenDirty = new Set();
const watchers = new Map(); // shareId -> { watchId, last }

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  typing: {},
  // { [groupId]: { [shareId]: share } }
  liveShares: {},
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  /* =====================================================
   *                    E2EE GROUP KEYS
   * ===================================================== */

  // Create + upload a NEW key version for the given users.
  // POST /groups/:id/keys  { version, entries: [{ userId, version, wrappedKey, iv }] }
  provisionGroupKey: async (groupId, userIds, version = 1) => {
    try {
      if (!(await e2eeReady())) return false;
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const { entries, skipped } = await wrapForUsers(raw, userIds, version);
      // I must be able to read it myself
      if (!entries.some((e) => sameId(e.userId, myId()))) return false;

      await axiosInstance.post(`/groups/${groupId}/keys`, { version, entries });
      await cacheGroupKeyRaw(groupId, version, raw);

      if (skipped.length) {
        console.warn("[e2ee] members without a public key yet:", skipped);
      }
      return true;
    } catch (e) {
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
      const list = Array.isArray(d) ? d : d?.members || d?.userIds || [];
      const ids = list.map((x) => idOf(x?.userId ?? x)).filter(Boolean);
      if (ids.length) await get().shareKeyWith(groupId, ids);
    } catch {
      /* not allowed / no pending -> silent */
    }
  },

  // load keys; if the group has none yet, try to create version 1; else resolve pending members
  prepareGroupKeys: async (groupId) => {
    try {
      if (!(await e2eeReady())) return;
      const latest = await loadGroupKeys(groupId, { force: true });
      if (!latest) {
        const group = get().groups.find((g) => sameId(g.id, groupId));
        if (group) {
          await get().provisionGroupKey(groupId, memberIdsOf(group), 1);
        }
      } else {
        get().syncPendingGroupKeys(groupId);
      }
    } catch {
      /* silent */
    }
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
        const open = s.selectedGroup
          ? groups.find((g) => sameId(g.id, s.selectedGroup.id))
          : null;
        return {
          groups,
          selectedGroup: open
            ? { ...s.selectedGroup, archived: open.archived }
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

  updateGroup: async (groupId, { name, avatarFile }) => {
    try {
      const fd = new FormData();
      if (name !== undefined) fd.append("name", name);
      if (avatarFile) fd.append("avatar", avatarFile);
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
    set({
      selectedGroup: group,
      groupMessages: [],
      isGroupMessagesLoading: true,
    });
    await Promise.all([
      get().fetchMessages(group.id),
      get().fetchActiveShares(group.id),
    ]);
    if (!sameId(get().selectedGroup?.id, group.id)) return;
    set({ isGroupMessagesLoading: false });
    if (visible()) get().markSeen(group.id);

    // background: make sure keys exist / pending members get theirs
    get().prepareGroupKeys(group.id);
  },

  closeGroup: () => {
    get().emitTyping(false);
    set({ selectedGroup: null, groupMessages: [] });
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
      toast.error(errMsg(e));
    }
  },

  // Accepts: text, imageFile, attachment, voice, video
  sendMessage: async ({ text, imageFile, attachment, voice, video }) => {
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
    if (!selectedGroup || !me || !meId || (!trimmed && !file)) return;

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
      readBy: [meId],
      createdAt: new Date().toISOString(),
      pending: true,
      _file: file,
      _isVoice: Boolean(voiceFile),
      _isVideo: Boolean(videoFile),
      _duration: voice?.duration || video?.duration || 0,
    };

    set((s) => ({ groupMessages: [...s.groupMessages, optimistic] }));
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
      fd.append("clientId", clientId);

      const res = await axiosInstance.post(
        `/groups/${msg.groupId}/messages`,
        fd,
        { timeout: 120000 },
      );

      const saved = unwrap(res);
      if (!saved) throw new Error("Empty server response");
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

  // Async: normalize -> decrypt -> insert. Used for socket events.
  ingestMessage: async (raw) => {
    const msg = await decryptGroupMessage(normalizeMsg(raw));
    get().receiveMessage(msg);
    return msg;
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
    socket.emit("group:typing", {
      groupId: String(selectedGroup.id),
      isTyping,
    });
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
        set((s) => {
          const cur = { ...(s.typing[msg.groupId] || {}) };
          delete cur[msg.senderId];
          return { typing: { ...s.typing, [msg.groupId]: cur } };
        });

        const open = sameId(get().selectedGroup?.id, msg.groupId);
        if (open && visible() && !sameId(msg.senderId, myId())) {
          get().markSeen(msg.groupId);
        }
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

      "group:typing": ({ groupId, userId, fullName, isTyping }) =>
        set((s) => {
          const cur = { ...(s.typing[groupId] || {}) };
          if (isTyping) cur[userId] = fullName;
          else delete cur[userId];
          return { typing: { ...s.typing, [groupId]: cur } };
        }),

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

    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    handlers = h;

    get()
      .fetchGroups({ silent: true })
      .then(() => get().resumeMyLiveShares());
  },

  unsubscribeFromGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && handlers) {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
    }
    handlers = null;
  },
}));
