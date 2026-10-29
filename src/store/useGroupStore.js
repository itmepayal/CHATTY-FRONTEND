import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const sameId = (a, b) => String(a) === String(b);
const idOf = (v) => String(v?._id ?? v?.id ?? v ?? "");
const unwrap = (res) => res.data?.data;
const errMsg = (e) => e?.response?.data?.message || "Something went wrong.";
const newClientId = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// FIX 5: authUser me id ya _id, dono me se jo bhi ho
const myId = () => idOf(useAuthStore.getState().authUser);

const timeOf = (d) => (d ? new Date(d).getTime() : 0);

// FIX 1: naye group (jisme lastMessageAt nahi) ko createdAt se sort karo
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

/* ---------------- LIVE LOCATION CONSTANTS ---------------- */
const LIVE_PUSH_MS = 5000; // server ko kitni der me ek baar position bhejni hai

let handlers = null;
const seenInFlight = new Set();
const seenDirty = new Set(); // FIX: in-flight ke dauran naya message aaya to dobara markSeen
// shareId -> { watchId, last }
const watchers = new Map();

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  typing: {},
  // { [groupId]: { [shareId]: share } }  (apne + dusron ke active live shares)
  liveShares: {},
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  fetchGroups: async ({ silent = false } = {}) => {
    if (!silent) set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      const groups = sortGroups(unwrap(res) || []);
      set((s) => {
        // keep the open group's data fresh (incl. archived flag)
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
      toast.success("Group created");
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
    get().setGroupArchived(groupId, true); // optimistic
    try {
      await axiosInstance.put(`/groups/${groupId}/archive`);
      toast.success("Group archived");
      return true;
    } catch (e) {
      get().setGroupArchived(groupId, Boolean(prev)); // rollback
      toast.error(errMsg(e));
      return false;
    }
  },

  unarchiveGroup: async (groupId) => {
    const prev = get().groups.find((g) => sameId(g.id, groupId))?.archived;
    get().setGroupArchived(groupId, false); // optimistic
    try {
      await axiosInstance.delete(`/groups/${groupId}/archive`);
      toast.success("Group unarchived");
      return true;
    } catch (e) {
      get().setGroupArchived(groupId, Boolean(prev)); // rollback
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
    // is group ke saare live shares/watchers saaf karo
    Object.keys(get().liveShares[groupId] || {}).forEach((shareId) =>
      get().stopWatch(shareId),
    );
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
    // FIX: agar beech me user ne dusra group khol liya, to uska loader mat band karo
    if (!sameId(get().selectedGroup?.id, group.id)) return;
    set({ isGroupMessagesLoading: false });
    if (visible()) get().markSeen(group.id);
  },

  closeGroup: () => {
    get().emitTyping(false);
    set({ selectedGroup: null, groupMessages: [] });
  },

  fetchMessages: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      if (sameId(get().selectedGroup?.id, groupId)) {
        // keep local pending/failed messages the server doesn't know yet
        const server = (unwrap(res) || []).map(normalizeMsg);
        const current = get().groupMessages;
        const isKnownByServer = (m) =>
          m.clientId && server.some((x) => x.clientId === m.clientId);

        const keep = current.filter(
          (m) => (m.pending || m.failed) && !isKnownByServer(m),
        );

        // FIX: jo local messages server ke message se replace ho rahe hain,
        // unke blob URLs revoke karo (memory leak)
        current
          .filter((m) => (m.pending || m.failed) && isKnownByServer(m))
          .forEach(revokeMsgBlobs);

        set({ groupMessages: [...server, ...keep] });
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  },

  // Accepts: text, imageFile (image), attachment (any other file; a video file
  // picked with the paperclip is auto-detected and sent as a video message),
  // voice ({ blob, duration, mimeType }) from useVoiceRecorder,
  // video ({ blob, duration, mimeType }) from VideoRecorderModal
  sendMessage: async ({ text, imageFile, attachment, voice, video }) => {
    const { selectedGroup } = get();
    const me = useAuthStore.getState().authUser;
    const meId = myId();
    const trimmed = text?.trim() || "";

    // Strip codec params ("audio/webm;codecs=opus" -> "audio/webm") so the
    // server's mimetype checks match.
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
      if (msg.text) fd.append("text", msg.text);
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
      get().receiveMessage(saved);
    } catch (e) {
      console.error("send group message failed:", e?.response?.data || e);
      set((s) => ({
        groupMessages: s.groupMessages.map((m) =>
          m.clientId === clientId ? { ...m, pending: false, failed: true } : m,
        ),
      }));
      toast.error(errMsg(e));
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

  // Used by both HTTP response and socket event -> never duplicates
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

  markSeen: async (groupId) => {
    set((s) => ({
      groups: s.groups.map((g) =>
        sameId(g.id, groupId) ? { ...g, unreadCount: 0 } : g,
      ),
    }));

    const key = String(groupId);
    if (seenInFlight.has(key)) {
      // FIX: request chal rahi hai, par naya message aaya -> baad me dobara bhejo
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
   *                  LIVE LOCATION
   * ===================================================== */

  // Selector: is group me mera active live share (ya undefined)
  getMyShare: (groupId) => {
    const me = myId();
    return Object.values(get().liveShares[groupId] || {}).find((sh) =>
      sameId(sh.sharerId, me),
    );
  },

  // Ek baar ka current location pin bhejo
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
      if (saved) get().receiveMessage(saved);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  },

  // Live location shuru karo. durationMin: 15 | 60 | 480
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
      if (message) get().receiveMessage(message);
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

  // Live location band karo
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

  // Server se is group ke active shares lao; mere shares ka watcher dobara chalao
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
      // page refresh ke baad bhi apna live sharing chalta rahe
      mine.forEach((raw) => get().startWatch(groupId, idOf(raw._id ?? raw.id)));
    } catch {
      /* silent */
    }
  },

  // FIX 3: refresh/login ke baad SAARE groups ke mere active shares resume karo
  // (sirf open group nahi). App start / socket connect pe call hota hai.
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

  // share khatam: watcher band, store se hatao, message ko "ended" mark karo
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

  // Browser GPS watch -> har LIVE_PUSH_MS me server ko position bhejo
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

  // FIX 4: logout pe call karo -> saare GPS watchers band + local state saaf
  // (server pe share chalta rahega; sirf is device ka GPS push band hota hai)
  stopAllWatchers: () => {
    [...watchers.keys()].forEach((id) => get().stopWatch(id));
    set({ liveShares: {} });
  },

  // Logout ke time ek hi call me sab reset
  resetOnLogout: () => {
    get().stopAllWatchers();
    get().unsubscribeFromGroups();
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

  pushLivePosition: async (groupId, shareId, coords) => {
    try {
      await axiosInstance.patch(
        `/groups/${groupId}/location/${shareId}`,
        coords,
      );
    } catch (e) {
      const status = e?.response?.status;
      // 404 = share nahi mila / band, 410 = expire ho gaya
      if (status === 404 || status === 410) {
        get().endShareLocal(groupId, shareId);
      }
    }
  },

  /* ---------- realtime ---------- */
  subscribeToGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    get().unsubscribeFromGroups();

    const h = {
      "group:created": (g) => get().applyGroupUpdate(g),
      "group:updated": (g) => get().applyGroupUpdate(g),
      "group:removed": ({ groupId }) => get().dropGroup(groupId),
      "group:deleted": ({ groupId }) => get().dropGroup(groupId),

      // archive/unarchive done on another tab/device of the same user
      "group:archiveChanged": ({ groupId, archived }) =>
        get().setGroupArchived(groupId, Boolean(archived)),

      "group:newMessage": (raw) => {
        const msg = normalizeMsg(raw);
        get().receiveMessage(msg);

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

      "group:conversationUpdated": (u) =>
        set((s) => {
          const open = sameId(s.selectedGroup?.id, u.groupId) && visible();
          return {
            groups: sortGroups(
              s.groups.map((g) =>
                sameId(g.id, u.groupId)
                  ? {
                      ...g,
                      unreadCount: open ? 0 : u.unreadCount,
                      lastMessage: u.lastMessage,
                      lastMessageAt: u.lastMessageAt || g.lastMessageAt,
                    }
                  : g,
              ),
            ),
          };
        }),

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
