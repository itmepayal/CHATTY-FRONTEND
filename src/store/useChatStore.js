import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const ATTACHMENT_FIELD = "image";

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
  localPreview: null,
  reactions: [],
  isDeleted: true,
});

const typingTimers = new Map();

const clearTypingTimer = (fromId) => {
  const t = typingTimers.get(fromId);
  if (t) {
    clearTimeout(t);
    typingTimers.delete(fromId);
  }
};

export const useChatStore = create((set, get) => {
  const patchMessage = (clientId, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.clientId === clientId ? { ...m, ...patch } : m,
      ),
    }));

  const getSocket = () => useAuthStore.getState().socket;

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

  const transmit = async (clientId) => {
    const msg = get().messages.find((m) => m.clientId === clientId);
    if (!msg || (msg.status === "sending" && msg._inFlight)) return;
    patchMessage(clientId, {
      status: "sending",
      _inFlight: true,
      error: null,
      uploadProgress: 0,
    });

    const formData = new FormData();
    formData.append("text", msg.text || "");
    formData.append("clientId", clientId);
    if (msg._file) formData.append(ATTACHMENT_FIELD, msg._file);
    if (msg._isVoice) {
      formData.append("isVoice", "true");
      formData.append("duration", String(msg._duration || 0));
    }

    try {
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
                  clientId,
                  status: saved.status || "sent",
                }
              : m,
          ),
      }));
      revokeBlob(msg.localPreview);
      revokeBlob(msg.audio?.url);
    } catch (error) {
      patchMessage(clientId, {
        status: "failed",
        _inFlight: false,
        error: true,
      });
      toast.error(error?.response?.data?.message || "Failed to send message");
    }
  };

  return {
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    typingFrom: {},

    getUsers: async ({ silent = false } = {}) => {
      if (!silent) set({ isUsersLoading: true });
      try {
        const res = await axiosInstance.get("/messages/");
        set({ users: res.data.data });
      } catch (error) {
        if (!silent) {
          toast.error(
            error?.response?.data?.message || "Failed to fetch users",
          );
        }
      } finally {
        if (!silent) set({ isUsersLoading: false });
      }
    },

    getMessage: async (id, { silent = false } = {}) => {
      if (!silent) set({ isMessagesLoading: true });
      try {
        const res = await axiosInstance.get(`/messages/${id}`);
        set((s) => ({
          messages: mergeServerWithLocal(
            res.data.data,
            silent
              ? s.messages
              : s.messages.filter((m) => sameId(m.receiverId, id)),
          ),
        }));

        if (isTabVisible()) get().markSeen(id);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to fetch messages",
        );
      } finally {
        if (!silent) set({ isMessagesLoading: false });
      }
    },

    markSeen: async (userId) => {
      set((s) => ({
        users: s.users.map((u) =>
          sameId(u.id, userId) ? { ...u, unreadCount: 0 } : u,
        ),
      }));

      try {
        await axiosInstance.patch(`/messages/seen/${userId}`);
      } catch (error) {
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

    subscribeToMessage: () => {
      const socket = getSocket();
      if (!socket) return;

      const onNewMessage = (message) => {
        const { selectedUser, messages } = get();
        const myId = useAuthStore.getState().authUser?.id;

        set((s) => {
          if (!s.typingFrom[String(message.senderId)]) return {};
          const next = { ...s.typingFrom };
          delete next[String(message.senderId)];
          return { typingFrom: next };
        });

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

        if (
          selectedUser &&
          myId &&
          sameId(message.senderId, myId) &&
          sameId(message.receiverId, selectedUser.id)
        ) {
          const exists = messages.some(
            (m) =>
              sameId(m.id, message.id) ||
              (message.clientId && m.clientId === message.clientId),
          );
          if (!exists) set({ messages: [...messages, message] });
          return;
        }
      };

      const onConversationUpdated = (u) => get().applyConversationUpdate(u);

      const onReconnect = () => {
        typingTimers.forEach((_, k) => clearTypingTimer(k));
        set({ typingFrom: {} });

        get().getUsers({ silent: true });
        syncActiveChat();
        const { selectedUser, getMessage } = get();
        if (selectedUser) getMessage(selectedUser.id, { silent: true });
      };

      const onVisibilityChange = () => {
        syncActiveChat();
        const { selectedUser } = get();
        if (selectedUser && isTabVisible()) get().markSeen(selectedUser.id);
      };

      const onReaction = ({ messageId, reactions }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            sameId(m.id, messageId) ? { ...m, reactions } : m,
          ),
        }));
      };

      const onMessageDeleted = ({ messageId }) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            sameId(m.id, messageId) ? markDeleted(m) : m,
          ),
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

      get().unSubscribeFromMessage();

      socket.on("newMessage", onNewMessage);
      socket.on("conversationUpdated", onConversationUpdated);
      socket.on("connect", onReconnect);
      socket.on("messageReaction", onReaction);
      socket.on("messageDeleted", onMessageDeleted);
      socket.on("messageDeletedForMe", onMessageDeletedForMe);
      socket.on("messagesDelivered", onMessagesDelivered);
      socket.on("messagesSeen", onMessagesSeen);
      socket.on("typing", onTyping);
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
        _onTyping: onTyping,
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
        socket.off("typing", s._onTyping);
      }
      if (s._onVisibilityChange) {
        document.removeEventListener("visibilitychange", s._onVisibilityChange);
      }
    },

    setSelectedUser: (selectedUser) => {
      set({ selectedUser });
      syncActiveChat();
    },

    sendMessage: ({ text, attachment, imageFile, voice }) => {
      const { selectedUser } = get();
      const authUser = useAuthStore.getState().authUser;
      const clientId = newClientId();

      const voiceMime = voice?.mimeType?.split(";")[0] || "audio/webm";
      const voiceFile = voice
        ? new File([voice.blob], `voice-${Date.now()}.${extFor(voiceMime)}`, {
            type: voiceMime,
          })
        : null;

      const picked = voiceFile || attachment || imageFile || null;
      const isImg = !voiceFile && Boolean(picked?.type?.startsWith("image/"));

      const optimistic = {
        id: `temp-${clientId}`,
        clientId,
        senderId: authUser.id,
        receiverId: selectedUser.id,
        text: text ?? "",
        image: null,
        file:
          picked && !isImg && !voiceFile
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
        reactions: [],
        isDeleted: false,
        localPreview: isImg ? URL.createObjectURL(picked) : null,
        _file: picked,
        _isVoice: Boolean(voiceFile),
        _duration: voice?.duration || 0,
        status: "sending",
        createdAt: null,
      };
      set((s) => ({ messages: [...s.messages, optimistic] }));
      return transmit(clientId);
    },

    retryMessage: (clientId) => transmit(clientId),

    discardMessage: (clientId) =>
      set((s) => {
        const m = s.messages.find((x) => x.clientId === clientId);
        revokeBlob(m?.localPreview);
        revokeBlob(m?.audio?.url);
        return { messages: s.messages.filter((x) => x.clientId !== clientId) };
      }),

    reactToMessage: async (messageId, emoji) => {
      const myId = useAuthStore.getState().authUser?.id;
      const target = get().messages.find((m) => sameId(m.id, messageId));
      if (!target || !myId || target.isDeleted) return;

      const prevReactions = target.reactions || [];

      const setReactions = (reactions) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            sameId(m.id, messageId) ? { ...m, reactions } : m,
          ),
        }));

      setReactions(applyReaction(prevReactions, myId, emoji));

      try {
        const res = await axiosInstance.patch(`/messages/react/${messageId}`, {
          emoji,
        });
        setReactions(res.data.data.reactions);
      } catch (error) {
        setReactions(prevReactions);
        toast.error(error?.response?.data?.message || "Failed to react");
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
        toast.error(error?.response?.data?.message || "Failed to delete");
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
        toast.error(error?.response?.data?.message || "Failed to delete");
      }
    },
  };
});
