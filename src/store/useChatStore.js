import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { encryptFor, decryptFrom, whenE2EEReady } from "../lib/e2ee.js";
import {
  e2eeReady,
  e2eeErrMsg,
  dmPeerOf,
  decryptDmMessage,
  decryptDmList,
  decryptDmPreview,
} from "../lib/e2eeMessages.js";
import { useAuthStore } from "../store/useAuthStore.js";

const ATTACHMENT_FIELD = "image"; // router accepts ONE field name for every file type

const sameId = (a, b) => String(a) === String(b);
const newClientId = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const STATUS_RANK = { sent: 1, delivered: 2, seen: 3 };

const upgradeStatus = (m, next) =>
  (STATUS_RANK[next] || 0) > (STATUS_RANK[m.status] || 0)
    ? { ...m, status: next }
    : m;

const isTabVisible = () =>
  typeof document === "undefined" || document.visibilityState === "visible";

const timeOf = (d) => (d ? new Date(d).getTime() : 0);

const sortUsers = (users) =>
  [...users].sort((a, b) => timeOf(b.lastMessageAt) - timeOf(a.lastMessageAt));

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

const videoExt = (mime = "") => (mime.includes("mp4") ? "mp4" : "webm");

const mergeServerWithLocal = (server, local) => {
  const keep = local.filter(
    (m) =>
      (m.status === "sending" || m.status === "failed") &&
      !server.some((s) => sameId(s.id, m.id)),
  );
  return [...server, ...keep];
};

const applyReaction = (reactions = [], userId, emoji) => {
  const i = reactions.findIndex((r) => sameId(r.userId, userId));
  if (i === -1) return [...reactions, { userId, emoji }];
  if (reactions[i].emoji === emoji) {
    return reactions.filter((_, idx) => idx !== i);
  }
  return reactions.map((r, idx) => (idx === i ? { ...r, emoji } : r));
};

const markDeleted = (m) => ({
  ...m,
  text: "",
  image: null,
  file: null,
  audio: null,
  video: null,
  location: null,
  linkPreview: null,
  localPreview: null,
  reactions: [],
  isPinned: false,
  pinnedBy: null,
  pinnedAt: null,
  isDeleted: true,
});

// Small PLAINTEXT snapshot of a message used for the local "reply to" quote
const replySnapshot = (m) =>
  m
    ? {
        id: m.id,
        senderId: m.senderId,
        text: m.text || "",
        image: m.image?.url ? { url: m.image.url } : null,
        file: m.file?.name ? { name: m.file.name } : null,
        audio: m.audio?.url ? { url: m.audio.url } : null,
        video: m.video?.url ? { url: m.video.url } : null,
        location: Number.isFinite(m.location?.lat)
          ? { lat: m.location.lat, lng: m.location.lng }
          : null,
        isDeleted: Boolean(m.isDeleted),
      }
    : null;

const typingTimers = new Map();

const clearTypingTimer = (fromId) => {
  const t = typingTimers.get(fromId);
  if (t) {
    clearTimeout(t);
    typingTimers.delete(fromId);
  }
};

const errMsg = (error, fallback) => error?.response?.data?.message || fallback;
const myId = () => useAuthStore.getState().authUser?.id;

/* ---------------- live location helpers ---------------- */
const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(Object.assign(new Error("unsupported"), { code: 0 }));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

const geoErrMsg = (e) => {
  if (e?.response) return null;
  if (e?.code === 0) return "Location isn't supported in this browser";
  if (e?.code === 1) return "Location permission denied";
  if (e?.code === 2) return "Location unavailable";
  if (e?.code === 3) return "Location request timed out";
  return null;
};

const shareToLive = (sh) => ({
  shareId: String(sh._id),
  sharerId: String(sh.sharerId),
  receiverId: String(sh.receiverId),
  expiresAt: sh.expiresAt,
  lat: sh.lastLocation?.lat,
  lng: sh.lastLocation?.lng,
  accuracy: sh.lastLocation?.accuracy,
  updatedAt: sh.lastLocation?.updatedAt,
});

export const useChatStore = create((set, get) => {
  const patchMessage = (clientId, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.clientId === clientId ? { ...m, ...patch } : m,
      ),
    }));

  const patchById = (messageId, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        sameId(m.id, messageId) ? { ...m, ...patch } : m,
      ),
    }));

  const getSocket = () => useAuthStore.getState().socket;

  const offLocation = () => {
    const socket = getSocket();
    const s = get();
    if (!socket) return;
    if (s._onLocUpdate) socket.off("location:update", s._onLocUpdate);
    if (s._onLocEnded) socket.off("location:ended", s._onLocEnded);
    if (s._onLocConnect) socket.off("connect", s._onLocConnect);
  };

  const syncActiveChat = () => {
    const socket = getSocket();
    if (!socket) return;
    const { selectedUser } = get();
    if (selectedUser && isTabVisible()) {
      socket.emit("chat:open", selectedUser.id);
    } else {
      socket.emit("chat:close");
    }
  };

  /* ------------------------------------------------------------------
   * transmit: text is ENCRYPTED here (fresh IV on every retry).
   * The server only ever receives ciphertext + iv + encrypted=true.
   * We never fall back to plaintext: if E2EE isn't ready, the message fails.
   * ------------------------------------------------------------------ */
  const transmit = async (clientId) => {
    const msg = get().messages.find((m) => m.clientId === clientId);
    if (!msg || (msg.status === "sending" && msg._inFlight)) return;
    patchMessage(clientId, {
      status: "sending",
      _inFlight: true,
      error: null,
      uploadProgress: 0,
    });

    try {
      const formData = new FormData();
      formData.append("clientId", clientId);

      if (msg.text) {
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
        const enc = await encryptFor(msg.receiverId, msg.text);
        formData.append("text", enc.text);
        formData.append("iv", enc.iv);
        formData.append("encrypted", "true");
      } else {
        formData.append("text", "");
      }

      if (msg._file) formData.append(ATTACHMENT_FIELD, msg._file);

      // reply (only a real server id, never a temp one)
      if (msg._replyId && !String(msg._replyId).startsWith("temp-")) {
        formData.append("replyTo", String(msg._replyId));
      }

      if (msg._isVoice) formData.append("isVoice", "true");
      if (msg._isVideo) formData.append("isVideo", "true");
      if (msg._isVoice || msg._isVideo) {
        formData.append("duration", String(msg._duration || 0));
      }

      const res = await axiosInstance.post(
        `/messages/send/${msg.receiverId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
          timeout: 120000,
          onUploadProgress: (e) => {
            if (e.total)
              patchMessage(clientId, {
                uploadProgress: Math.round((e.loaded / e.total) * 100),
              });
          },
        },
      );
      const saved = res.data.data;

      set((s) => ({
        messages: s.messages
          .filter((m) => m.clientId === clientId || !sameId(m.id, saved.id))
          .map((m) =>
            m.clientId === clientId
              ? {
                  ...saved,
                  // saved.text is ciphertext -> keep the plaintext we already have
                  text: msg.text || "",
                  decrypted: true,
                  decryptFailed: false,
                  // prefer local plaintext quote over the server's (encrypted) one
                  replyTo: m.replyTo || saved.replyTo || null,
                  clientId,
                  status: saved.status || "sent",
                }
              : m,
          ),
      }));
      revokeBlob(msg.localPreview);
      revokeBlob(msg.audio?.url);
      revokeBlob(msg.video?.url);
    } catch (error) {
      patchMessage(clientId, {
        status: "failed",
        _inFlight: false,
        error: true,
      });
      toast.error(e2eeErrMsg(error) || errMsg(error, "Failed to send message"));
    }
  };

  return {
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    typingFrom: {},

    replyingTo: null,
    editingMessage: null,
    scheduled: [],
    disappearAfter: 0,

    // { [shareId]: { shareId, sharerId, receiverId, expiresAt, lat, lng, accuracy, updatedAt } }
    liveShares: {},
    liveLoaded: false,

    /* ---------------- SIDEBAR ---------------- */
    getUsers: async ({ silent = false } = {}) => {
      if (!silent) set({ isUsersLoading: true });
      try {
        const res = await axiosInstance.get("/messages/");
        const users = await Promise.all(
          (res.data.data || []).map(async (u) => ({
            ...u,
            lastMessage: await decryptDmPreview(u.lastMessage, u.id),
          })),
        );
        set({ users });
      } catch (error) {
        if (!silent) toast.error(errMsg(error, "Failed to fetch users"));
      } finally {
        if (!silent) set({ isUsersLoading: false });
      }
    },

    /* ---------------- MESSAGES ---------------- */
    getMessage: async (id, { silent = false } = {}) => {
      if (!silent) set({ isMessagesLoading: true });
      try {
        const res = await axiosInstance.get(`/messages/${id}`);
        const server = await decryptDmList(res.data.data || [], myId(), id);

        // user switched chats while we were loading -> drop this result
        if (!sameId(get().selectedUser?.id, id)) return;

        set((s) => ({
          messages: mergeServerWithLocal(
            server,
            silent
              ? s.messages
              : s.messages.filter((m) => sameId(m.receiverId, id)),
          ),
        }));

        if (isTabVisible()) get().markSeen(id);
      } catch (error) {
        toast.error(errMsg(error, "Failed to fetch messages"));
      } finally {
        if (!silent && sameId(get().selectedUser?.id, id)) {
          set({ isMessagesLoading: false });
        }
      }
    },

    // retry messages that failed to decrypt (e.g. after keys were reset / init finished late)
    redecryptFailed: async () => {
      await whenE2EEReady();
      const me = myId();
      const peer = get().selectedUser?.id;
      const next = await Promise.all(
        get().messages.map((m) =>
          m.decryptFailed ? decryptDmMessage(m, me, peer) : m,
        ),
      );
      set({ messages: next });
    },

    markSeen: async (userId) => {
      set((s) => ({
        users: s.users.map((u) =>
          sameId(u.id, userId) ? { ...u, unreadCount: 0 } : u,
        ),
      }));

      try {
        await axiosInstance.patch(`/messages/seen/${userId}`);
      } catch {
        get().getUsers({ silent: true });
      }
    },

    applyConversationUpdate: (u) =>
      set((s) => {
        const users = s.users.map((user) => {
          if (!sameId(user.id, u.userId)) return user;
          if (user.ts && u.ts && u.ts < user.ts) return user;
          return {
            ...user,
            unreadCount: u.unreadCount,
            lastMessage: u.lastMessage,
            lastMessageAt: u.lastMessageAt,
            ts: u.ts,
          };
        });
        return { users: sortUsers(users) };
      }),

    emitTyping: (isTyping, toId) => {
      const socket = getSocket();
      const to = toId ?? get().selectedUser?.id;
      if (!socket || !to) return;
      socket.emit("typing", { to: String(to), isTyping });
    },

    /* ---------------- REALTIME ---------------- */
    subscribeToMessage: () => {
      const socket = getSocket();
      if (!socket) return;

      const onNewMessage = async (raw) => {
        const me = myId();

        // sender stopped typing the moment their message arrives
        set((s) => {
          if (!s.typingFrom[String(raw.senderId)]) return {};
          const next = { ...s.typingFrom };
          delete next[String(raw.senderId)];
          return { typingFrom: next };
        });

        const peerHint = sameId(raw.senderId, me)
          ? raw.receiverId
          : raw.senderId;
        const message = await decryptDmMessage(raw, me, peerHint);

        // read the store AFTER the async decrypt so we never use stale state
        const { selectedUser, messages } = get();

        if (selectedUser && sameId(message.senderId, selectedUser.id)) {
          if (messages.some((m) => sameId(m.id, message.id))) return;

          const visible = isTabVisible();
          set({
            messages: [
              ...messages,
              visible ? { ...message, status: "seen" } : message,
            ],
          });

          if (visible && message.status !== "seen") {
            get().markSeen(selectedUser.id);
          }
          return;
        }

        // my own message (forwarded / scheduled / sent from another device)
        if (
          selectedUser &&
          me &&
          sameId(message.senderId, me) &&
          sameId(message.receiverId, selectedUser.id)
        ) {
          const exists = messages.some(
            (m) =>
              sameId(m.id, message.id) ||
              (message.clientId && m.clientId === message.clientId),
          );
          if (!exists) set({ messages: [...messages, message] });

          if (get().scheduled.length) get().getScheduled(selectedUser.id);
        }
      };

      const onConversationUpdated = async (u) => {
        const lastMessage = await decryptDmPreview(u.lastMessage, u.userId);
        get().applyConversationUpdate({ ...u, lastMessage });
      };

      const onReconnect = () => {
        typingTimers.forEach((_, k) => clearTypingTimer(k));
        set({ typingFrom: {} });

        get().getUsers({ silent: true });
        syncActiveChat();
        const { selectedUser, getMessage } = get();
        if (selectedUser) {
          getMessage(selectedUser.id, { silent: true });
          get().getDisappearing(selectedUser.id);
        }
      };

      const onVisibilityChange = () => {
        syncActiveChat();
        const { selectedUser } = get();
        if (selectedUser && isTabVisible()) get().markSeen(selectedUser.id);
      };

      const onReaction = ({ messageId, reactions }) => {
        patchById(messageId, { reactions });
      };

      const onMessageDeleted = ({ messageId }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            sameId(m.id, messageId) ? markDeleted(m) : m,
          ),
          editingMessage: sameId(s.editingMessage?.id, messageId)
            ? null
            : s.editingMessage,
          replyingTo: sameId(s.replyingTo?.id, messageId) ? null : s.replyingTo,
        }));
      };

      const onMessageDeletedForMe = ({ messageId }) => {
        set((s) => ({
          messages: s.messages.filter((m) => !sameId(m.id, messageId)),
        }));
      };

      const onMessagesDelivered = ({ messageIds }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            messageIds.some((id) => sameId(id, m.id))
              ? upgradeStatus(m, "delivered")
              : m,
          ),
        }));
      };

      const onMessagesSeen = ({ messageIds }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            messageIds.some((id) => sameId(id, m.id))
              ? upgradeStatus(m, "seen")
              : m,
          ),
        }));
      };

      // payload: { messageId, text(cipher), iv, encrypted, isEdited, editedAt }
      const onEdited = async ({
        messageId,
        text,
        iv,
        encrypted,
        isEdited,
        editedAt,
      }) => {
        const target = get().messages.find((m) => sameId(m.id, messageId));
        if (!target) return;
        let plain = text;
        if (encrypted && iv) {
          try {
            await whenE2EEReady();
            plain = await decryptFrom(dmPeerOf(target, myId()), text, iv);
          } catch {
            plain = "";
          }
        }
        patchById(messageId, {
          text: plain,
          isEdited,
          editedAt,
          linkPreview: null,
          decrypted: true,
          decryptFailed: false,
        });
      };

      const onPinned = ({ messageId, isPinned, pinnedBy }) => {
        patchById(messageId, {
          isPinned,
          pinnedBy: isPinned ? pinnedBy : null,
          pinnedAt: isPinned ? new Date().toISOString() : null,
        });
      };

      // NOTE: with E2EE the server cannot read URLs, so it will not generate
      // previews for encrypted text. Handler kept for plaintext/legacy messages.
      const onLinkPreview = ({ messageId, linkPreview }) => {
        patchById(messageId, { linkPreview });
      };

      // server sends the OTHER user's id to each side
      const onDisappearingUpdated = ({ userId, seconds }) => {
        if (sameId(get().selectedUser?.id, userId)) {
          set({ disappearAfter: Number(seconds) || 0 });
        }
      };

      const onTyping = ({ from, isTyping }) => {
        const key = String(from);

        if (isTyping) {
          clearTypingTimer(key);
          typingTimers.set(
            key,
            setTimeout(() => {
              typingTimers.delete(key);
              set((s) => {
                if (!s.typingFrom[key]) return {};
                const next = { ...s.typingFrom };
                delete next[key];
                return { typingFrom: next };
              });
            }, 4000),
          );
          set((s) => {
            if (s.typingFrom[key]) return {};
            return { typingFrom: { ...s.typingFrom, [key]: true } };
          });
        } else {
          clearTypingTimer(key);
          set((s) => {
            if (!s.typingFrom[key]) return {};
            const next = { ...s.typingFrom };
            delete next[key];
            return { typingFrom: next };
          });
        }
      };

      const onChatArchived = ({ userId, archived }) => {
        set((s) => ({
          users: s.users.map((u) =>
            sameId(u.id, userId) ? { ...u, isArchived: Boolean(archived) } : u,
          ),
        }));
      };

      get().unSubscribeFromMessage();

      socket.on("newMessage", onNewMessage);
      socket.on("conversationUpdated", onConversationUpdated);
      socket.on("connect", onReconnect);
      socket.on("messageReaction", onReaction);
      socket.on("messageDeleted", onMessageDeleted);
      socket.on("messageDeletedForMe", onMessageDeletedForMe);
      socket.on("messagesDelivered", onMessagesDelivered);
      socket.on("messagesSeen", onMessagesSeen);
      socket.on("messageEdited", onEdited);
      socket.on("messagePinned", onPinned);
      socket.on("messageLinkPreview", onLinkPreview);
      socket.on("disappearingUpdated", onDisappearingUpdated);
      socket.on("typing", onTyping);
      socket.on("chatArchived", onChatArchived);
      document.addEventListener("visibilitychange", onVisibilityChange);

      set({
        _onNewMessage: onNewMessage,
        _onConversationUpdated: onConversationUpdated,
        _onReconnect: onReconnect,
        _onVisibilityChange: onVisibilityChange,
        _onReaction: onReaction,
        _onMessageDeleted: onMessageDeleted,
        _onMessageDeletedForMe: onMessageDeletedForMe,
        _onMessagesDelivered: onMessagesDelivered,
        _onMessagesSeen: onMessagesSeen,
        _onEdited: onEdited,
        _onPinned: onPinned,
        _onLinkPreview: onLinkPreview,
        _onDisappearing: onDisappearingUpdated,
        _onTyping: onTyping,
        _onChatArchived: onChatArchived,
      });

      syncActiveChat();
    },

    unSubscribeFromMessage: () => {
      const socket = getSocket();
      const s = get();

      typingTimers.forEach((_, k) => clearTypingTimer(k));

      if (socket) {
        socket.off("newMessage", s._onNewMessage);
        socket.off("conversationUpdated", s._onConversationUpdated);
        socket.off("connect", s._onReconnect);
        socket.off("messageReaction", s._onReaction);
        socket.off("messageDeleted", s._onMessageDeleted);
        socket.off("messageDeletedForMe", s._onMessageDeletedForMe);
        socket.off("messagesDelivered", s._onMessagesDelivered);
        socket.off("messagesSeen", s._onMessagesSeen);
        socket.off("messageEdited", s._onEdited);
        socket.off("messagePinned", s._onPinned);
        socket.off("messageLinkPreview", s._onLinkPreview);
        socket.off("disappearingUpdated", s._onDisappearing);
        socket.off("typing", s._onTyping);
        socket.off("chatArchived", s._onChatArchived);
      }
      if (s._onVisibilityChange) {
        document.removeEventListener("visibilitychange", s._onVisibilityChange);
      }
    },

    setSelectedUser: (selectedUser) => {
      set({
        selectedUser,
        replyingTo: null,
        editingMessage: null,
        scheduled: [],
        disappearAfter: 0,
      });
      syncActiveChat();
    },

    /* ---------------- reply / edit composer state ---------------- */
    setReplyingTo: (message) =>
      set({ replyingTo: message || null, editingMessage: null }),

    setEditingMessage: (message) =>
      set({ editingMessage: message || null, replyingTo: null }),

    /* ---------------- SEND ---------------- */
    // accepts text, attachment/imageFile, voice, video and (optional) replyTo message
    sendMessage: ({ text, attachment, imageFile, voice, video, replyTo }) => {
      const { selectedUser } = get();
      const authUser = useAuthStore.getState().authUser;
      if (!selectedUser || !authUser) return;
      const clientId = newClientId();

      const replyMsg = replyTo ?? get().replyingTo;

      const voiceMime = voice?.mimeType?.split(";")[0] || "audio/webm";
      const voiceFile = voice
        ? new File([voice.blob], `voice-${Date.now()}.${extFor(voiceMime)}`, {
            type: voiceMime,
          })
        : null;

      const videoMime = video?.mimeType?.split(";")[0] || "video/webm";
      const videoFile = video
        ? new File([video.blob], `video-${Date.now()}.${videoExt(videoMime)}`, {
            type: videoMime,
          })
        : null;

      const picked = voiceFile || videoFile || attachment || imageFile || null;
      const isImg =
        !voiceFile && !videoFile && Boolean(picked?.type?.startsWith("image/"));
      const isPlainFile = Boolean(picked) && !isImg && !voiceFile && !videoFile;

      const optimistic = {
        id: `temp-${clientId}`,
        clientId,
        senderId: authUser.id,
        receiverId: selectedUser.id,
        text: text ?? "",
        decrypted: true, // local plaintext
        image: null,
        file: isPlainFile
          ? {
              url: null,
              name: picked.name,
              size: picked.size,
              mimeType: picked.type,
            }
          : null,
        audio: voiceFile
          ? {
              url: URL.createObjectURL(voiceFile),
              duration: voice.duration || 0,
              mimeType: voiceMime,
            }
          : null,
        video: videoFile
          ? {
              url: URL.createObjectURL(videoFile),
              duration: video.duration || 0,
              mimeType: videoMime,
            }
          : null,
        replyTo: replySnapshot(replyMsg),
        reactions: [],
        isDeleted: false,
        localPreview: isImg ? URL.createObjectURL(picked) : null,
        _file: picked,
        _replyId: replyMsg?.id || null,
        _isVoice: Boolean(voiceFile),
        _isVideo: Boolean(videoFile),
        _duration: voice?.duration || video?.duration || 0,
        status: "sending",
        createdAt: null,
      };
      set((s) => ({
        messages: [...s.messages, optimistic],
        replyingTo: null,
      }));
      return transmit(clientId);
    },

    retryMessage: (clientId) => transmit(clientId),

    discardMessage: (clientId) =>
      set((s) => {
        const m = s.messages.find((x) => x.clientId === clientId);
        revokeBlob(m?.localPreview);
        revokeBlob(m?.audio?.url);
        revokeBlob(m?.video?.url);
        return { messages: s.messages.filter((x) => x.clientId !== clientId) };
      }),

    /* ---------------- EDIT (re-encrypted) ---------------- */
    editMessage: async (messageId, text) => {
      try {
        const target = get().messages.find((m) => sameId(m.id, messageId));
        if (!target) return false;
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");

        const enc = await encryptFor(dmPeerOf(target, myId()), text);
        const res = await axiosInstance.patch(`/messages/edit/${messageId}`, {
          text: enc.text,
          iv: enc.iv,
          encrypted: true,
        });
        const p = res.data.data;
        // server sends { messageId, isEdited, editedAt, ... } (or just { messageId } if no change)
        if (p?.text !== undefined) {
          patchById(messageId, {
            text, // plaintext we just encrypted, not the server's ciphertext
            isEdited: p.isEdited ?? true,
            editedAt: p.editedAt ?? new Date().toISOString(),
            linkPreview: null,
            decrypted: true,
          });
        }
        return true;
      } catch (error) {
        toast.error(
          e2eeErrMsg(error) || errMsg(error, "Failed to edit message"),
        );
        return false;
      }
    },

    /* ---------------- PIN ---------------- */
    togglePin: async (messageId) => {
      try {
        const res = await axiosInstance.patch(`/messages/pin/${messageId}`);
        const p = res.data.data;
        patchById(messageId, {
          isPinned: p.isPinned,
          pinnedBy: p.isPinned ? p.pinnedBy : null,
          pinnedAt: p.isPinned ? new Date().toISOString() : null,
        });
        toast.success(p.isPinned ? "Message pinned" : "Message unpinned");
      } catch (error) {
        toast.error(errMsg(error, "Failed to update pin"));
      }
    },

    // GET /messages/pinned/:id  (decrypted)
    getPinned: async (userId) => {
      try {
        const res = await axiosInstance.get(`/messages/pinned/${userId}`);
        return await decryptDmList(res.data.data || [], myId(), userId);
      } catch (error) {
        toast.error(errMsg(error, "Failed to load pinned messages"));
        return [];
      }
    },

    /* ---------------- FORWARD (re-encrypted per recipient) ---------------- */
    // The server can't re-encrypt, so for text we send one ciphertext per recipient:
    //   { userIds, ciphertexts: [{ userId, text, iv }] }
    forwardMessages: async (messageId, userIds) => {
      try {
        const src = get().messages.find((m) => sameId(m.id, messageId));
        let targets = userIds;
        const payload = {};

        if (src?.text) {
          if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
          const results = await Promise.allSettled(
            userIds.map(async (uid) => {
              const enc = await encryptFor(uid, src.text);
              return { userId: String(uid), text: enc.text, iv: enc.iv };
            }),
          );
          const ok = results
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value);
          const failed = userIds.length - ok.length;
          if (!ok.length) throw new Error("peer-has-no-key");
          if (failed)
            toast.error(
              `${failed} contact(s) haven't enabled encryption and were skipped.`,
            );
          targets = ok.map((o) => o.userId);
          payload.ciphertexts = ok;
          payload.encrypted = true;
        }

        const res = await axiosInstance.post(`/messages/forward/${messageId}`, {
          userIds: targets,
          ...payload,
        });
        toast.success(res.data.message || "Forwarded");
        get().getUsers({ silent: true });
        return true;
      } catch (error) {
        toast.error(e2eeErrMsg(error) || errMsg(error, "Failed to forward"));
        return false;
      }
    },

    /* ---------------- SEARCH (client-side: server only sees ciphertext) ---------------- */
    searchMessages: async (userId, q) => {
      const needle = String(q || "")
        .trim()
        .toLowerCase();
      if (!needle) return [];
      return get().messages.filter(
        (m) =>
          !m.isDeleted &&
          m.text &&
          m.text.toLowerCase().includes(needle) &&
          (sameId(m.senderId, userId) || sameId(m.receiverId, userId)),
      );
    },

    /* ---------------- SCHEDULE (encrypted at schedule time) ---------------- */
    scheduleMessage: async (receiverId, text, scheduledFor) => {
      try {
        if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
        const enc = await encryptFor(receiverId, text);
        await axiosInstance.post(`/messages/schedule/${receiverId}`, {
          text: enc.text,
          iv: enc.iv,
          encrypted: true,
          scheduledFor,
        });
        toast.success("Message scheduled");
        get().getScheduled(receiverId);
        return true;
      } catch (error) {
        toast.error(
          e2eeErrMsg(error) || errMsg(error, "Failed to schedule message"),
        );
        return false;
      }
    },

    getScheduled: async (userId) => {
      try {
        const res = await axiosInstance.get("/messages/scheduled", {
          params: userId ? { to: userId } : {},
        });
        const me = myId();
        const items = await Promise.all(
          (res.data.data || []).map((it) =>
            decryptDmMessage(
              {
                ...it,
                senderId: me,
                receiverId: it.receiverId ?? userId,
              },
              me,
              userId,
            ),
          ),
        );
        set({ scheduled: items });
      } catch (error) {
        toast.error(errMsg(error, "Failed to load scheduled messages"));
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
        await axiosInstance.delete(`/messages/scheduled/${scheduleId}`);
        toast.success("Scheduled message cancelled");
      } catch (error) {
        set({ scheduled: previous });
        toast.error(errMsg(error, "Failed to cancel"));
      }
    },

    /* ---------------- DISAPPEARING ---------------- */
    getDisappearing: async (userId) => {
      try {
        const res = await axiosInstance.get(`/messages/disappearing/${userId}`);
        if (sameId(get().selectedUser?.id, userId)) {
          set({ disappearAfter: res.data.data?.seconds || 0 });
        }
      } catch {
        /* silent */
      }
    },

    setDisappearing: async (userId, seconds) => {
      const previous = get().disappearAfter;
      set({ disappearAfter: seconds });
      try {
        const res = await axiosInstance.put(
          `/messages/disappearing/${userId}`,
          { seconds },
        );
        toast.success(res.data.message || "Updated");
        return true;
      } catch (error) {
        set({ disappearAfter: previous });
        toast.error(errMsg(error, "Failed to update timer"));
        return false;
      }
    },

    purgeExpired: () =>
      set((s) => {
        const now = Date.now();
        const keep = s.messages.filter(
          (m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now,
        );
        return keep.length === s.messages.length ? {} : { messages: keep };
      }),

    /* ---------------- ARCHIVE ---------------- */
    setArchive: async (userId, archived) => {
      const patchUser = (value) =>
        set((s) => ({
          users: s.users.map((u) =>
            sameId(u.id, userId) ? { ...u, isArchived: value } : u,
          ),
        }));

      const before = Boolean(
        get().users.find((u) => sameId(u.id, userId))?.isArchived,
      );

      patchUser(archived);
      try {
        await axiosInstance.patch(`/messages/archive/${userId}`, { archived });
        toast.success(archived ? "Chat archived" : "Chat unarchived");
        return true;
      } catch (error) {
        patchUser(before);
        toast.error(errMsg(error, "Failed to update archive"));
        return false;
      }
    },

    /* ---------------- LIVE LOCATION (not encrypted: server needs coords) ---------------- */
    shareLocation: async (receiverId, { mode, durationMin }) => {
      try {
        const pos = await getPosition();
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;

        const res = await axiosInstance.post("/messages/location/share", {
          receiverId,
          mode,
          durationMin,
          lat,
          lng,
          accuracy,
        });

        const data = res.data.data;
        const message = mode === "live" ? data.message : data;

        if (mode === "live" && data.share) {
          set((s) => ({
            liveShares: {
              ...s.liveShares,
              [String(data.share._id)]: shareToLive(data.share),
            },
          }));
        }

        set((s) =>
          s.messages.some((m) => sameId(m.id, message.id))
            ? {}
            : { messages: [...s.messages, message] },
        );
        get().getUsers({ silent: true });

        toast.success(
          mode === "live" ? "Live location started" : "Location sent",
        );
        return true;
      } catch (error) {
        toast.error(
          geoErrMsg(error) || errMsg(error, "Failed to share location"),
        );
        return false;
      }
    },

    stopLiveShare: async (shareId) => {
      const previous = get().liveShares;
      get().removeLiveShare(shareId);
      try {
        await axiosInstance.patch(`/messages/location/stop/${shareId}`);
        toast.success("Live location stopped");
      } catch (error) {
        set({ liveShares: previous });
        toast.error(errMsg(error, "Failed to stop sharing"));
      }
    },

    removeLiveShare: (shareId) =>
      set((s) => {
        const key = String(shareId);
        if (!s.liveShares[key]) return {};
        const next = { ...s.liveShares };
        delete next[key];
        return { liveShares: next };
      }),

    getActiveShares: async () => {
      try {
        const res = await axiosInstance.get("/messages/location/active");
        const { mine = [], forMe = [] } = res.data.data || {};
        const map = {};
        [...mine, ...forMe].forEach((sh) => {
          map[String(sh._id)] = shareToLive(sh);
        });
        set({ liveShares: map, liveLoaded: true });
      } catch {
        /* silent */
      }
    },

    // LiveLocationSender (global component) calls this
    subscribeToLocation: () => {
      const socket = getSocket();
      if (!socket) return;
      offLocation();

      const onUpdate = ({
        shareId,
        lat,
        lng,
        accuracy,
        heading,
        updatedAt,
      }) => {
        const key = String(shareId);
        set((s) => ({
          liveShares: {
            ...s.liveShares,
            [key]: {
              ...(s.liveShares[key] || { shareId: key }),
              lat,
              lng,
              accuracy,
              heading,
              updatedAt,
            },
          },
        }));
      };

      const onEnded = ({ shareId }) => get().removeLiveShare(shareId);
      const onConnect = () => get().getActiveShares();

      socket.on("location:update", onUpdate);
      socket.on("location:ended", onEnded);
      socket.on("connect", onConnect);

      set({
        _onLocUpdate: onUpdate,
        _onLocEnded: onEnded,
        _onLocConnect: onConnect,
      });
    },

    unsubscribeFromLocation: () => {
      offLocation();
      set({ liveShares: {}, liveLoaded: false });
    },

    /* ---------------- REPORT ---------------- */
    reportUser: async (userId, { reason, details, messageId }) => {
      try {
        const res = await axiosInstance.post(`/messages/report/${userId}`, {
          reason,
          details,
          messageId,
        });
        toast.success(res.data.message || "Report submitted");
        return true;
      } catch (error) {
        toast.error(errMsg(error, "Failed to submit report"));
        return false;
      }
    },

    /* ---------------- REACT / DELETE ---------------- */
    reactToMessage: async (messageId, emoji) => {
      const me = myId();
      const target = get().messages.find((m) => sameId(m.id, messageId));
      if (!target || !me || target.isDeleted) return;

      const prevReactions = target.reactions || [];
      const setReactions = (reactions) => patchById(messageId, { reactions });

      setReactions(applyReaction(prevReactions, me, emoji));

      try {
        const res = await axiosInstance.patch(`/messages/react/${messageId}`, {
          emoji,
        });
        setReactions(res.data.data.reactions);
      } catch (error) {
        setReactions(prevReactions);
        toast.error(errMsg(error, "Failed to react"));
      }
    },

    deleteForMe: async (messageId) => {
      const target = get().messages.find((m) => sameId(m.id, messageId));
      if (!target) return;

      const previous = get().messages;
      set((s) => ({
        messages: s.messages.filter((m) => !sameId(m.id, messageId)),
      }));

      try {
        await axiosInstance.delete(`/messages/delete-for-me/${messageId}`);
        toast.success("Message deleted for you");
      } catch (error) {
        set({ messages: previous });
        toast.error(errMsg(error, "Failed to delete"));
      }
    },

    deleteForEveryone: async (messageId) => {
      const target = get().messages.find((m) => sameId(m.id, messageId));
      if (!target) return;

      const previous = get().messages;
      set((s) => ({
        messages: s.messages.map((m) =>
          sameId(m.id, messageId) ? markDeleted(m) : m,
        ),
      }));

      try {
        await axiosInstance.delete(
          `/messages/delete-for-everyone/${messageId}`,
        );
        toast.success("Message deleted for everyone");
      } catch (error) {
        set({ messages: previous });
        toast.error(errMsg(error, "Failed to delete"));
      }
    },

    /* ---------------- LOGOUT ---------------- */
    resetOnLogout: () => {
      get().unSubscribeFromMessage();
      offLocation();
      get().messages.forEach((m) => {
        revokeBlob(m.localPreview);
        revokeBlob(m.audio?.url);
        revokeBlob(m.video?.url);
      });
      set({
        messages: [],
        users: [],
        selectedUser: null,
        isUsersLoading: false,
        isMessagesLoading: false,
        typingFrom: {},
        replyingTo: null,
        editingMessage: null,
        scheduled: [],
        disappearAfter: 0,
        liveShares: {},
        liveLoaded: false,
      });
    },
  };
});
