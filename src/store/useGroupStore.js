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

const timeOf = (d) => (d ? new Date(d).getTime() : 0);
const sortGroups = (list) =>
  [...list].sort((a, b) => timeOf(b.lastMessageAt) - timeOf(a.lastMessageAt));

const upsert = (list, item) =>
  list.some((x) => sameId(x.id, item.id))
    ? list.map((x) => (sameId(x.id, item.id) ? { ...x, ...item } : x))
    : [item, ...list];

const union = (a = [], b = []) => [...new Set([...a, ...b].map(String))];

const normalizeMsg = (m) => ({
  ...m,
  id: idOf(m.id ?? m._id),
  groupId: idOf(m.groupId),
  senderId: idOf(m.senderId ?? m.sender),
  readBy: (m.readBy || []).map(idOf),
});

const visible = () => document.visibilityState === "visible";

const revokeBlob = (url) => {
  if (typeof url === "string" && url.startsWith("blob:"))
    URL.revokeObjectURL(url);
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

let handlers = null;
const seenInFlight = new Set();

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  typing: {},
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  fetchGroups: async ({ silent = false } = {}) => {
    if (!silent) set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: sortGroups(unwrap(res) || []) });
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

  applyGroupUpdate: (group) =>
    set((s) => ({
      groups: sortGroups(upsert(s.groups, group)),
      selectedGroup:
        s.selectedGroup && sameId(s.selectedGroup.id, group.id)
          ? { ...s.selectedGroup, ...group }
          : s.selectedGroup,
    })),

  dropGroup: (groupId) =>
    set((s) => {
      const open = s.selectedGroup && sameId(s.selectedGroup.id, groupId);
      return {
        groups: s.groups.filter((g) => !sameId(g.id, groupId)),
        selectedGroup: open ? null : s.selectedGroup,
        groupMessages: open ? [] : s.groupMessages,
      };
    }),

  /* ---------- messages ---------- */
  selectGroup: async (group) => {
    set({
      selectedGroup: group,
      groupMessages: [],
      isGroupMessagesLoading: true,
    });
    await get().fetchMessages(group.id);
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
        const keep = get().groupMessages.filter(
          (m) =>
            (m.pending || m.failed) &&
            !server.some((x) => x.clientId && x.clientId === m.clientId),
        );
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
    if (!selectedGroup || !me || (!trimmed && !file)) return;

    const clientId = newClientId();
    const localUrl =
      voiceFile || videoFile || imageFile ? URL.createObjectURL(file) : null;

    const optimistic = {
      id: `temp-${clientId}`,
      clientId,
      groupId: String(selectedGroup.id),
      senderId: String(me.id),
      sender: { id: String(me.id), fullName: me.fullName, avatar: me.avatar },
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
      readBy: [String(me.id)],
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
      revokeBlob(m?.image?.url);
      revokeBlob(m?.audio?.url);
      revokeBlob(m?.video?.url);
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
    revokeBlob(old.image?.url);
    revokeBlob(old.audio?.url);
    revokeBlob(old.video?.url);

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
    if (seenInFlight.has(key)) return;
    seenInFlight.add(key);
    try {
      await axiosInstance.post(`/groups/${groupId}/seen`);
    } catch {
      get().fetchGroups({ silent: true });
    } finally {
      seenInFlight.delete(key);
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

      "group:newMessage": (raw) => {
        const msg = normalizeMsg(raw);
        get().receiveMessage(msg);

        // sender stopped typing once their message arrives
        set((s) => {
          const cur = { ...(s.typing[msg.groupId] || {}) };
          delete cur[msg.senderId];
          return { typing: { ...s.typing, [msg.groupId]: cur } };
        });

        const myId = String(useAuthStore.getState().authUser?.id);
        const open = sameId(get().selectedGroup?.id, msg.groupId);
        if (open && visible() && !sameId(msg.senderId, myId)) {
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

      // Reconnect: server re-joins rooms; re-sync anything missed while offline
      connect: () => {
        get().fetchGroups({ silent: true });
        const open = get().selectedGroup;
        if (open) {
          get()
            .fetchMessages(open.id)
            .then(() => visible() && get().markSeen(open.id));
        }
      },
    };

    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    handlers = h;
  },

  unsubscribeFromGroups: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && handlers) {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
    }
    handlers = null;
  },
}));
