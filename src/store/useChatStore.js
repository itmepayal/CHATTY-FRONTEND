import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
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
import { useContactStore } from "../store/useContactStore.js";
import { useNotificationSettings } from "./useNotificationSettingsStore.js";
import { useChatLockStore } from "./useChatLockStore.js";
import notificationService from "../services/notificationService.js";
import soundService from "../services/soundService.js";

const ATTACHMENT_FIELD = "image";

const extractRawId = (v) => {
  if (v == null) return null;
  if (typeof v === "object") {
    const raw = v._id ?? v.id;
    return raw != null ? String(raw) : null;
  }
  return String(v);
};
const sameId = (a, b) => {
  const aid = extractRawId(a);
  const bid = extractRawId(b);
  return Boolean(aid && bid && aid === bid);
};
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

const seenInFlight = new Set();
const seenDirty = new Set();

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
        audio: m.audio?.url
          ? {
              url: m.audio.url,
              duration: m.audio.duration || 0,
              mimeType: m.audio.mimeType,
            }
          : null,
        video: m.video?.url
          ? {
              url: m.video.url,
              duration: m.video.duration || 0,
              mimeType: m.video.mimeType,
            }
          : null,
        location: Number.isFinite(m.location?.lat)
          ? { lat: m.location.lat, lng: m.location.lng }
          : null,
        isDeleted: Boolean(m.isDeleted),
      }
    : null;

const hydrateReply = (replyTo, pool = []) => {
  if (!replyTo) return null;
  const targetId =
    typeof replyTo === "object" ? replyTo.id || replyTo._id : replyTo;
  if (!targetId) return null;

  const found = Array.isArray(pool)
    ? pool.find((m) => sameId(m.id, targetId))
    : null;

  if (found) {
    if (found.isDeleted) {
      return {
        id: String(targetId),
        senderId: String(found.senderId),
        isDeleted: true,
      };
    }
    const isLocked =
      Boolean(found.decryptFailed) ||
      found.cryptoState === "decrypting" ||
      (Boolean(found.encrypted) && !found.decrypted && !found.text);
    if (isLocked) {
      return {
        id: String(targetId),
        senderId: String(found.senderId),
        text: "",
        decryptFailed: true,
      };
    }
    return replySnapshot(found);
  }

  // Not in pool
  if (typeof replyTo === "object") {
    if (replyTo.isDeleted) {
      return { id: String(targetId), isDeleted: true };
    }
    if (replyTo.decryptFailed) {
      return {
        id: String(targetId),
        senderId: replyTo.senderId ? String(replyTo.senderId) : null,
        text: "",
        decryptFailed: true,
      };
    }
    if (replyTo.e2ee || replyTo.encrypted) {
      return {
        id: String(targetId),
        senderId: replyTo.senderId ? String(replyTo.senderId) : null,
        text: "",
        decryptFailed: true,
      };
    }
    if (replyTo.text !== undefined) {
      return {
        ...replyTo,
        id: String(targetId),
        senderId: replyTo.senderId ? String(replyTo.senderId) : null,
      };
    }
  }

  return { id: String(targetId), missing: true };
};

const typingTimers = new Map();

const clearTypingTimer = (fromId) => {
  const t = typingTimers.get(fromId);
  if (t) {
    clearTimeout(t);
    typingTimers.delete(fromId);
  }
};

const errMsg = (error, fallback) => error?.response?.data?.message || fallback;
const myId = () => {
  const authUser = useAuthStore.getState().authUser;
  return authUser?._id ?? authUser?.id ?? null;
};

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
        let isEncrypted = false;
        let cipherText = msg.text;
        let cipherIv = null;
        let envelopes = [];

        try {
          const isReady = await e2eeReady();
          if (isReady) {
            const enc = await encryptFor(msg.receiverId, msg.text);
            if (enc?.text && enc?.iv) {
              isEncrypted = true;
              cipherText = enc.text;
              cipherIv = enc.iv;
              envelopes = enc.keyEnvelopes || [];
            }
          } else {
            throw new Error("e2ee-not-ready");
          }
        } catch (encErr) {
          if (encErr?.message === "peer-has-no-key") {
            toast.error(
              "This user hasn't set up encryption yet. Ask them to open the app once.",
            );
            throw encErr;
          } else {
            throw encErr;
          }
        }

        if (isEncrypted) {
          formData.append("text", cipherText);
          formData.append("iv", cipherIv);
          formData.append("encrypted", "true");
          if (Array.isArray(envelopes) && envelopes.length > 0) {
            formData.append("keyEnvelopes", JSON.stringify(envelopes));
          }
        } else {
          formData.append("text", msg.text);
          formData.append("encrypted", "false");
        }
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

      // Play subtle confirmation ding for successfully sent message
      soundService.playOutgoingMessageSound(
        saved?.id || saved?._id || clientId,
      );

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
                  cryptoState: "decrypted",
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
        cryptoState: "plaintext",
        _inFlight: false,
        error: true,
      });
      const serverMsg = error?.response?.data?.message;
      toast.error(
        serverMsg ||
          e2eeErrMsg(error) ||
          error?.message ||
          "Failed to send message",
      );
    }
  };

  return {
    messages: [],
    users: [],
    selectedUser: null,
    syncActiveChat: () => syncActiveChat(),
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
        const serverUsers = await Promise.all(
          (res.data.data || []).map(async (u) => ({
            ...u,
            lastMessage: await decryptDmPreview(u.lastMessage, u.id),
          })),
        );
        set((state) => {
          const merged = serverUsers.map((su) => {
            const current = state.users.find((u) => sameId(u.id, su.id));
            if (!current) return su;
            if (current.ts && su.ts && current.ts > su.ts) {
              return {
                ...su,
                unreadCount:
                  typeof current.unreadCount === "number"
                    ? current.unreadCount
                    : su.unreadCount,
                lastMessage: current.lastMessage || su.lastMessage,
                lastMessageAt: current.lastMessageAt || su.lastMessageAt,
                ts: current.ts,
              };
            }
            return su;
          });
          for (const u of state.users) {
            if (!merged.some((m) => sameId(m.id, u.id))) {
              merged.push(u);
            }
          }
          const sorted = sortUsers(merged);
          let updatedSelectedUser = state.selectedUser
            ? (() => {
                const matched = sorted.find((u) =>
                  sameId(u.id, state.selectedUser.id),
                );
                return matched
                  ? {
                      ...state.selectedUser,
                      unreadCount: isTabVisible()
                        ? 0
                        : (matched.unreadCount ?? 0),
                    }
                  : state.selectedUser;
              })()
            : null;

          let shouldAutoLoad = false;
          let autoTarget = null;
          if (!updatedSelectedUser && typeof sessionStorage !== "undefined") {
            try {
              const activeDmId = sessionStorage.getItem("chatty:active-dm-id");
              if (activeDmId) {
                const isLocked = useChatLockStore
                  .getState()
                  .isChatLocked(activeDmId);
                if (!isLocked) {
                  const found = sorted.find((u) => sameId(u.id, activeDmId));
                  if (found) {
                    updatedSelectedUser = { ...found, unreadCount: 0 };
                    shouldAutoLoad = true;
                    autoTarget = updatedSelectedUser;
                  }
                }
              }
            } catch {}
          }

          if (shouldAutoLoad && autoTarget) {
            setTimeout(() => {
              get().setSelectedUser(autoTarget);
            }, 0);
          }

          return { users: sorted, selectedUser: updatedSelectedUser };
        });
      } catch (error) {
        if (!silent) toast.error(errMsg(error, "Failed to fetch users"));
      } finally {
        if (!silent) set({ isUsersLoading: false });
      }
    },

    rehydrateReplies: () => {
      const current = get().messages;
      let changed = false;
      const next = current.map((m) => {
        if (!m.replyTo) return m;
        const targetId = m.replyTo.id || m.replyTo._id;
        const target = current.find((p) => sameId(p.id, targetId));
        if (!target) return m;
        const updated = hydrateReply(m.replyTo, current);
        if (
          updated.text !== m.replyTo.text ||
          updated.decryptFailed !== m.replyTo.decryptFailed ||
          updated.missing !== m.replyTo.missing
        ) {
          changed = true;
          return { ...m, replyTo: updated };
        }
        return m;
      });
      if (changed) {
        set({ messages: next });
      }
    },

    /* ---------------- MESSAGES ---------------- */
    getMessage: async (id, { silent = false } = {}) => {
      if (!id) return;
      const mySeq = (get()._messageFetchSeq || 0) + 1;
      set({
        _messageFetchSeq: mySeq,
        ...(silent ? {} : { isMessagesLoading: true }),
      });
      try {
        const res = await axiosInstance.get(`/messages/${id}`);
        // user switched chats or newer fetch started while loading -> drop this result
        if (
          get()._messageFetchSeq !== mySeq ||
          !sameId(get().selectedUser?.id, id)
        ) {
          return;
        }

        const server = await decryptDmList(res.data.data || [], myId(), id);
        if (
          get()._messageFetchSeq !== mySeq ||
          !sameId(get().selectedUser?.id, id)
        ) {
          return;
        }

        const hydrated = server.map((m) => ({
          ...m,
          replyTo: hydrateReply(m.replyTo, server),
        }));

        const isChatMsg = (m) =>
          sameId(m.receiverId, id) || sameId(m.senderId, id);

        set((s) => ({
          messages: mergeServerWithLocal(
            hydrated,
            silent ? s.messages : s.messages.filter(isChatMsg),
          ),
        }));

        if (isTabVisible()) get().markSeen(id);
      } catch (error) {
        if (
          get()._messageFetchSeq === mySeq &&
          sameId(get().selectedUser?.id, id)
        ) {
          toast.error(errMsg(error, "Failed to fetch messages"));
        }
      } finally {
        if (!silent && get()._messageFetchSeq === mySeq) {
          set({ isMessagesLoading: false });
        }
      }
    },

    // Retry decrypting a single message
    retryDecryptMessage: async (messageId) => {
      const target = get().messages.find((m) => sameId(m.id, messageId));
      if (!target) return;
      patchById(messageId, { cryptoState: "decrypting", decryptFailed: false });
      try {
        await whenE2EEReady();
        const me = myId();
        const peer = dmPeerOf(target, me);
        const decrypted = await decryptDmMessage(target, me, peer);
        patchById(messageId, {
          text: decrypted.text,
          decrypted: true,
          decryptFailed: false,
          cryptoState: "decrypted",
          replyTo: hydrateReply(decrypted.replyTo, get().messages),
          _cipher: null,
          decryptError: null,
        });
        get().rehydrateReplies();
      } catch (err) {
        patchById(messageId, {
          text: "",
          decrypted: false,
          decryptFailed: true,
          cryptoState: "decryption_failed",
          decryptError: err?.message || "Decryption failed",
        });
      }
    },

    // retry messages that failed to decrypt (e.g. after keys were reset / init finished late)
    redecryptFailed: async () => {
      try {
        await whenE2EEReady();
        const me = myId();
        const peer = get().selectedUser?.id;
        const currentMessages = get().messages;
        const next = await Promise.all(
          currentMessages.map((m) =>
            m.decryptFailed || (m.encrypted && !m.decrypted)
              ? decryptDmMessage(m, me, peer)
              : m,
          ),
        );
        const hydrated = next.map((m) => ({
          ...m,
          replyTo: hydrateReply(m.replyTo, next),
        }));
        set({ messages: hydrated });
      } catch (e) {
        console.warn("[chat] redecryptFailed error:", e);
      }
    },

    markSeen: async (userId) => {
      if (!userId) return;
      const key = String(userId);
      if (seenInFlight.has(key)) {
        seenDirty.add(key);
        return;
      }
      seenInFlight.add(key);

      set((s) => ({
        users: s.users.map((u) =>
          sameId(u.id, userId) ? { ...u, unreadCount: 0 } : u,
        ),
        selectedUser:
          s.selectedUser && sameId(s.selectedUser.id, userId)
            ? { ...s.selectedUser, unreadCount: 0 }
            : s.selectedUser,
      }));

      try {
        const res = await axiosInstance.patch(`/messages/seen/${userId}`);
        const confirmedUnread = res?.data?.data?.unreadCount ?? 0;
        set((s) => ({
          users: s.users.map((u) =>
            sameId(u.id, userId) ? { ...u, unreadCount: confirmedUnread } : u,
          ),
          selectedUser:
            s.selectedUser && sameId(s.selectedUser.id, userId)
              ? { ...s.selectedUser, unreadCount: confirmedUnread }
              : s.selectedUser,
        }));
      } catch {
        get().getUsers({ silent: true });
      } finally {
        seenInFlight.delete(key);
        if (seenDirty.delete(key)) {
          get().markSeen(userId);
        }
      }
    },

    applyConversationUpdate: (u) =>
      set((s) => {
        const exists = s.users.some((user) => sameId(user.id, u.userId));
        let updatedUsers;
        const newUnread = typeof u.unreadCount === "number" ? u.unreadCount : 0;
        if (exists) {
          updatedUsers = s.users.map((user) => {
            if (!sameId(user.id, u.userId)) return user;
            if (user.ts && u.ts && u.ts < user.ts) return user;
            return {
              ...user,
              unreadCount:
                typeof u.unreadCount === "number"
                  ? u.unreadCount
                  : user.unreadCount || 0,
              lastMessage: u.lastMessage ?? user.lastMessage,
              lastMessageAt: u.lastMessageAt ?? user.lastMessageAt,
              ts: u.ts ?? Date.now(),
            };
          });
        } else {
          const contact = useContactStore
            .getState()
            .contacts?.find((c) => sameId(c.id, u.userId));
          const newUser = {
            id: String(u.userId),
            fullName: contact?.fullName || "User",
            avatar: contact?.avatar || "",
            unreadCount: newUnread,
            lastMessage: u.lastMessage || null,
            lastMessageAt: u.lastMessageAt || null,
            ts: u.ts ?? Date.now(),
            ...contact,
          };
          updatedUsers = [...s.users, newUser];
        }

        const isViewing =
          s.selectedUser &&
          sameId(s.selectedUser.id, u.userId) &&
          isTabVisible();

        const updatedSelectedUser =
          s.selectedUser && sameId(s.selectedUser.id, u.userId)
            ? {
                ...s.selectedUser,
                unreadCount: isViewing ? 0 : newUnread,
              }
            : s.selectedUser;

        return {
          users: sortUsers(updatedUsers),
          selectedUser: updatedSelectedUser,
        };
      }),

    emitTyping: (isTyping, toId) => {
      const socket = getSocket();
      const to = toId ?? get().selectedUser?.id;
      if (!socket || !to) return;
      if (
        isTyping &&
        usePrivacyStore.getState().privacy?.typingIndicator === false
      ) {
        return;
      }
      socket.emit("typing", { to: String(to), isTyping });
    },

    /* ---------------- REALTIME ---------------- */
    subscribeToMessage: () => {
      const socket = getSocket();
      if (!socket) return;

      const s = get();
      if (s._subscribedSocket === socket && s._isSubscribed) {
        return;
      }

      get().unSubscribeFromMessage();

      const onNewMessage = (raw) => {
        if (!raw) return;
        const me = myId();
        console.log("[socket] onNewMessage received:", {
          id: raw?.id,
          senderId: raw?.senderId,
          receiverId: raw?.receiverId,
          clientId: raw?.clientId,
          encrypted: raw?.encrypted,
        });

        // sender stopped typing the moment their message arrives
        clearTypingTimer(String(raw.senderId));
        set((st) => {
          if (!st.typingFrom[String(raw.senderId)]) return {};
          const next = { ...st.typingFrom };
          delete next[String(raw.senderId)];
          return { typingFrom: next };
        });

        const isEncrypted = Boolean(raw.encrypted && raw.iv);
        const incoming = {
          ...raw,
          status:
            raw.status && raw.status !== "sending" ? raw.status : "delivered",
          cryptoState: isEncrypted ? "decrypting" : "plaintext",
          _cipher: isEncrypted ? (raw._cipher ?? raw.text) : null,
          text: isEncrypted ? "" : (raw.text ?? ""),
          decrypted: !isEncrypted,
          decryptFailed: false,
        };

        const { selectedUser } = get();
        const isFromSelectedUser =
          selectedUser && sameId(incoming.senderId, selectedUser.id);
        const isMyOwnMessage =
          selectedUser &&
          me &&
          sameId(incoming.senderId, me) &&
          sameId(incoming.receiverId, selectedUser.id);

        // 1. If currently viewing chat with the sender (incoming direct message)
        if (isFromSelectedUser) {
          set((st) => {
            const exists = st.messages.some((m) => sameId(m.id, incoming.id));
            if (exists) return {};
            const incomingHydrated = {
              ...incoming,
              replyTo: hydrateReply(incoming.replyTo, st.messages),
            };
            return {
              messages: [...st.messages, incomingHydrated],
            };
          });

          if (isTabVisible()) {
            get().markSeen(selectedUser.id);
          }
        }
        // 2. My own message (forwarded / scheduled / sent from another device / socket echo)
        else if (isMyOwnMessage) {
          set((st) => {
            // Check if there is an optimistic message matching clientId
            const clientIdx = incoming.clientId
              ? st.messages.findIndex((m) => m.clientId === incoming.clientId)
              : -1;
            if (clientIdx !== -1) {
              const next = [...st.messages];
              next[clientIdx] = {
                ...next[clientIdx],
                ...incoming,
                id: incoming.id,
                text: next[clientIdx].text || incoming.text,
                decrypted: true,
                decryptFailed: false,
                cryptoState: "decrypted",
                replyTo:
                  next[clientIdx].replyTo ||
                  hydrateReply(incoming.replyTo, next),
                status: incoming.status || "sent",
              };
              return { messages: next };
            }

            const idExists = st.messages.some((m) => sameId(m.id, incoming.id));
            if (!idExists) {
              const incomingHydrated = {
                ...incoming,
                replyTo: hydrateReply(incoming.replyTo, st.messages),
              };
              return { messages: [...st.messages, incomingHydrated] };
            }
            return {};
          });

          if (get().scheduled.length) get().getScheduled(selectedUser.id);
        }

        // 3. Always update sidebar conversation preview & unread count
        const otherUserId = sameId(incoming.senderId, me)
          ? incoming.receiverId
          : incoming.senderId;
        const isCurrentOpenChat =
          selectedUser && sameId(otherUserId, selectedUser.id);
        const msgTs = incoming.createdAt
          ? new Date(incoming.createdAt).getTime()
          : Date.now();

        set((st) => {
          const existsInUsers = st.users.some((u) => sameId(u.id, otherUserId));
          if (!existsInUsers) {
            const contactUser = useContactStore
              .getState()
              .contacts?.find((c) => sameId(c.id, otherUserId));
            const newUnread =
              isCurrentOpenChat && isTabVisible()
                ? 0
                : sameId(incoming.senderId, me)
                  ? 0
                  : 1;
            const newUser = {
              id: String(otherUserId),
              fullName:
                contactUser?.fullName || incoming.sender?.fullName || "User",
              avatar: contactUser?.avatar || incoming.sender?.avatar || "",
              unreadCount: newUnread,
              lastMessage: incoming,
              lastMessageAt: incoming.createdAt || new Date().toISOString(),
              ts: msgTs,
              ...contactUser,
            };
            return {
              users: sortUsers([...st.users, newUser]),
              selectedUser:
                isCurrentOpenChat && st.selectedUser
                  ? {
                      ...st.selectedUser,
                      unreadCount: isTabVisible()
                        ? 0
                        : (st.selectedUser.unreadCount || 0) + 1,
                    }
                  : st.selectedUser,
            };
          }
          const updatedUsers = st.users.map((u) => {
            if (!sameId(u.id, otherUserId)) return u;
            const newUnread =
              isCurrentOpenChat && isTabVisible()
                ? 0
                : sameId(incoming.senderId, me)
                  ? u.unreadCount || 0
                  : (u.unreadCount || 0) + 1;
            return {
              ...u,
              unreadCount: newUnread,
              lastMessage: incoming,
              lastMessageAt: incoming.createdAt || new Date().toISOString(),
              ts: msgTs,
            };
          });
          return {
            users: sortUsers(updatedUsers),
            selectedUser:
              isCurrentOpenChat && st.selectedUser
                ? {
                    ...st.selectedUser,
                    unreadCount: isTabVisible()
                      ? 0
                      : (st.selectedUser.unreadCount || 0) + 1,
                  }
                : st.selectedUser,
          };
        });

        // 3.5. Single source of truth notification handling
        const isChatActiveAndFocused =
          Boolean(isCurrentOpenChat) &&
          isTabVisible() &&
          (typeof document !== "undefined" &&
          typeof document.hasFocus === "function"
            ? document.hasFocus()
            : true);

        const senderUser =
          get().users.find((u) => sameId(u.id, incoming.senderId)) ||
          useContactStore
            .getState()
            .contacts?.find((c) => sameId(c.id, incoming.senderId));
        const senderName =
          senderUser?.fullName || incoming.sender?.fullName || "User";
        const avatar = senderUser?.avatar || incoming.sender?.avatar || "";

        notificationService.handleIncomingMessage({
          ...incoming,
          chatId: String(otherUserId),
          senderName,
          avatar,
          currentUserId: me,
          isFocusedSameChat: isChatActiveAndFocused,
          onNotificationClick: (targetChatId) => {
            const cid = String(targetChatId);
            if (useChatLockStore.getState().isChatLocked(cid)) {
              useChatLockStore.getState().openUnlockModal(cid);
              return;
            }
            const targetUser = get().users.find((u) =>
              sameId(u.id, targetChatId),
            );
            if (targetUser) {
              get().setSelectedUser(targetUser);
            } else {
              get().setSelectedUser({
                id: targetChatId,
                fullName: senderName,
                avatar,
              });
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

        // 4. Asynchronously decrypt encrypted messages without blocking the UI
        if (isEncrypted) {
          const peerHint = sameId(incoming.senderId, me)
            ? incoming.receiverId
            : incoming.senderId;
          decryptDmMessage(incoming, me, peerHint)
            .then((decrypted) => {
              patchById(incoming.id, {
                text: decrypted.text,
                decrypted: true,
                decryptFailed: false,
                cryptoState: "decrypted",
                replyTo: hydrateReply(decrypted.replyTo, get().messages),
                _cipher: null,
                decryptError: null,
              });
              get().rehydrateReplies();
              set((st) => ({
                users: st.users.map((u) =>
                  sameId(u.id, otherUserId) &&
                  sameId(u.lastMessage?.id, incoming.id)
                    ? {
                        ...u,
                        lastMessage: {
                          ...u.lastMessage,
                          text: decrypted.text,
                          decrypted: true,
                          decryptFailed: false,
                          cryptoState: "decrypted",
                        },
                      }
                    : u,
                ),
              }));
            })
            .catch((err) => {
              console.error(
                "[chat] Decryption failed for incoming message:",
                incoming.id,
                err,
              );
              patchById(incoming.id, {
                text: "",
                decrypted: false,
                decryptFailed: true,
                cryptoState: "decryption_failed",
                decryptError: err?.message || "Decryption failed",
              });
              get().rehydrateReplies();
            });
        }
      };

      const onConversationUpdated = async (u) => {
        const lastMessage = await decryptDmPreview(u.lastMessage, u.userId);
        const { users } = get();
        const exists = users.some((usr) => sameId(usr.id, u.userId));
        if (!exists) {
          get().getUsers({ silent: true });
          return;
        }
        get().applyConversationUpdate({ ...u, lastMessage });
      };

      const onReconnect = () => {
        console.log(
          "[socket] reconnected: restoring active chat & refreshing messages...",
        );
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
        const myReceipts =
          usePrivacyStore.getState().privacy?.readReceipts !== false;
        const curUser = get().selectedUser;
        const peerReceipts =
          curUser?.readReceipts !== false &&
          curUser?.privacy?.readReceipts !== false;
        if (!myReceipts || !peerReceipts) return;

        set((s) => ({
          messages: s.messages.map((m) =>
            Array.isArray(messageIds) &&
            messageIds.some((id) => sameId(id, m.id))
              ? upgradeStatus(m, "seen")
              : m,
          ),
          users: s.users.map((u) => {
            const hasSeenLast =
              Array.isArray(messageIds) &&
              u.lastMessage &&
              messageIds.some((id) => sameId(id, u.lastMessage.id));
            if (hasSeenLast) {
              return {
                ...u,
                lastMessage: upgradeStatus(u.lastMessage, "seen"),
              };
            }
            return u;
          }),
        }));
      };

      // payload: { messageId, text(cipher), iv, encrypted, isEdited, editedAt, keyEnvelopes }
      const onEdited = async ({
        messageId,
        text,
        iv,
        encrypted,
        isEdited,
        editedAt,
        keyEnvelopes,
      }) => {
        const target = get().messages.find((m) => sameId(m.id, messageId));
        if (!target) return;
        const isMine = sameId(target.senderId, myId());
        let plain = text;
        let decryptFailed = false;

        if (encrypted && iv) {
          try {
            await whenE2EEReady();
            plain = await decryptFrom(dmPeerOf(target, myId()), text, iv, {
              ...target,
              keyEnvelopes: keyEnvelopes || target.keyEnvelopes,
            });
          } catch {
            if (isMine) {
              plain = target.text || "";
              decryptFailed = false;
            } else {
              plain = "";
              decryptFailed = true;
            }
          }
        }

        patchById(messageId, {
          text: decryptFailed ? "" : plain,
          isEdited,
          editedAt,
          linkPreview: null,
          decrypted: !decryptFailed,
          decryptFailed,
          cryptoState: encrypted
            ? decryptFailed
              ? "decryption_failed"
              : "decrypted"
            : "plaintext",
          encrypted: Boolean(encrypted),
          iv: iv || null,
          ...(keyEnvelopes ? { keyEnvelopes } : {}),
          _cipher: null,
        });

        get().rehydrateReplies?.();
      };

      const onPinned = ({ messageId, isPinned, pinnedBy }) => {
        patchById(messageId, {
          isPinned,
          pinnedBy: isPinned ? pinnedBy : null,
          pinnedAt: isPinned ? new Date().toISOString() : null,
        });
      };

      const onLinkPreview = ({ messageId, linkPreview }) => {
        patchById(messageId, { linkPreview });
      };

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

      const onScheduledSent = ({ scheduleId, receiverId }) => {
        set((st) => ({
          scheduled: st.scheduled.filter((x) => !sameId(x._id || x.id, scheduleId)),
        }));
        const sel = get().selectedUser;
        if (sel && receiverId && sameId(sel.id, receiverId)) {
          get().getScheduled(sel.id);
        }
      };

      const onScheduledCancelled = ({ id }) => {
        set((st) => ({
          scheduled: st.scheduled.filter((x) => !sameId(x._id || x.id, id)),
        }));
      };

      const onScheduledChanged = () => {
        const sel = get().selectedUser;
        if (sel) get().getScheduled(sel.id);
      };

      const onScheduledFailed = ({ error }) => {
        if (error) toast.error(`Scheduled message failed: ${error}`);
        const sel = get().selectedUser;
        if (sel) get().getScheduled(sel.id);
      };

      socket.off("newMessage");
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
      socket.on("scheduled:sent", onScheduledSent);
      socket.on("scheduled:cancelled", onScheduledCancelled);
      socket.on("scheduled:created", onScheduledChanged);
      socket.on("scheduled:updated", onScheduledChanged);
      socket.on("scheduled:failed", onScheduledFailed);
      document.addEventListener("visibilitychange", onVisibilityChange);

      const onProfileUpdated = ({ detail } = {}) => {
        const uid = detail?.userId;
        if (!uid) return;
        get().getUsers({ silent: true });
        const current = get().selectedUser;
        if (current && sameId(current.id ?? current._id, uid)) {
          get().fetchUserProfile(uid);
        }
      };

      const onPresenceUpdated = ({ detail } = {}) => {
        const uid = detail?.userId;
        if (!uid) return;
        const current = get().selectedUser;
        const updatedLastSeen = detail.isOnline
          ? current?.lastSeen
          : detail.lastSeen !== undefined
            ? detail.lastSeen
            : current?.lastSeen;
        if (current && sameId(current.id ?? current._id, uid)) {
          set((s) => ({
            selectedUser: s.selectedUser
              ? {
                  ...s.selectedUser,
                  lastSeen: updatedLastSeen,
                  ...(detail.isOnline !== undefined
                    ? { isOnline: detail.isOnline }
                    : {}),
                }
              : null,
          }));
        }
        set((state) => ({
          users: state.users.map((u) =>
            sameId(u.id ?? u._id, uid)
              ? {
                  ...u,
                  lastSeen: detail.isOnline
                    ? u.lastSeen
                    : detail.lastSeen !== undefined
                      ? detail.lastSeen
                      : u.lastSeen,
                }
              : u,
          ),
        }));
      };

      window.addEventListener("chatty:profile-updated", onProfileUpdated);
      window.addEventListener("chatty:presence-updated", onPresenceUpdated);

      set({
        _subscribedSocket: socket,
        _isSubscribed: true,
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
        _onProfileUpdated: onProfileUpdated,
        _onPresenceUpdated: onPresenceUpdated,
      });

      syncActiveChat();
    },

    unSubscribeFromMessage: () => {
      const socket = get()._subscribedSocket || getSocket();
      const s = get();

      typingTimers.forEach((_, k) => clearTypingTimer(k));

      if (socket) {
        socket.off("newMessage");
        if (s._onNewMessage) socket.off("newMessage", s._onNewMessage);
        if (s._onConversationUpdated)
          socket.off("conversationUpdated", s._onConversationUpdated);
        if (s._onReconnect) socket.off("connect", s._onReconnect);
        if (s._onReaction) socket.off("messageReaction", s._onReaction);
        if (s._onMessageDeleted)
          socket.off("messageDeleted", s._onMessageDeleted);
        if (s._onMessageDeletedForMe)
          socket.off("messageDeletedForMe", s._onMessageDeletedForMe);
        if (s._onMessagesDelivered)
          socket.off("messagesDelivered", s._onMessagesDelivered);
        if (s._onMessagesSeen) socket.off("messagesSeen", s._onMessagesSeen);
        if (s._onEdited) socket.off("messageEdited", s._onEdited);
        if (s._onPinned) socket.off("messagePinned", s._onPinned);
        if (s._onLinkPreview)
          socket.off("messageLinkPreview", s._onLinkPreview);
        if (s._onDisappearing)
          socket.off("disappearingUpdated", s._onDisappearing);
        if (s._onTyping) socket.off("typing", s._onTyping);
        if (s._onChatArchived) socket.off("chatArchived", s._onChatArchived);
        socket.off("scheduled:sent");
        socket.off("scheduled:cancelled");
        socket.off("scheduled:created");
        socket.off("scheduled:updated");
        socket.off("scheduled:failed");
      }
      if (s._onVisibilityChange) {
        document.removeEventListener("visibilitychange", s._onVisibilityChange);
      }
      if (s._onProfileUpdated) {
        window.removeEventListener(
          "chatty:profile-updated",
          s._onProfileUpdated,
        );
      }
      if (s._onPresenceUpdated) {
        window.removeEventListener(
          "chatty:presence-updated",
          s._onPresenceUpdated,
        );
      }

      set({
        _subscribedSocket: null,
        _isSubscribed: false,
        _onNewMessage: null,
        _onConversationUpdated: null,
        _onReconnect: null,
        _onVisibilityChange: null,
        _onReaction: null,
        _onMessageDeleted: null,
        _onMessageDeletedForMe: null,
        _onMessagesDelivered: null,
        _onMessagesSeen: null,
        _onEdited: null,
        _onPinned: null,
        _onLinkPreview: null,
        _onDisappearing: null,
        _onTyping: null,
        _onChatArchived: null,
        _onProfileUpdated: null,
        _onPresenceUpdated: null,
      });
    },

    fetchUserProfile: async (userId) => {
      if (!userId) return null;
      const uid = String(userId);
      try {
        const res = await axiosInstance.get(`/users/${uid}/profile`);
        const u = res?.data?.data?.user;
        if (u) {
          set((s) => ({
            selectedUser:
              s.selectedUser &&
              sameId(s.selectedUser.id ?? s.selectedUser._id, uid)
                ? { ...s.selectedUser, ...u }
                : s.selectedUser,
            users: s.users.map((usr) =>
              sameId(usr.id ?? usr._id, uid) ? { ...usr, ...u } : usr,
            ),
          }));
          return u;
        }
      } catch {
        // ignore
      }
      return null;
    },

    setSelectedUser: (selectedUser) => {
      const targetId = selectedUser
        ? (selectedUser.id ?? selectedUser._id)
        : null;
      const prev = get().selectedUser;
      const prevId = prev ? (prev.id ?? prev._id) : null;
      const isSwitching = !sameId(prevId, targetId);

      try {
        if (typeof sessionStorage !== "undefined") {
          if (targetId) {
            sessionStorage.setItem("chatty:active-dm-id", String(targetId));
            sessionStorage.removeItem("chatty:active-group-id");
          } else {
            sessionStorage.removeItem("chatty:active-dm-id");
          }
        }
      } catch {}

      if (isSwitching) {
        const nextSeq = (get()._messageFetchSeq || 0) + 1;
        set((s) => ({
          _messageFetchSeq: nextSeq,
          selectedUser: selectedUser
            ? { ...selectedUser, id: targetId, unreadCount: 0 }
            : null,
          users: selectedUser
            ? s.users.map((u) =>
                sameId(u.id ?? u._id, targetId) ? { ...u, unreadCount: 0 } : u,
              )
            : s.users,
          messages: [],
          isMessagesLoading: Boolean(targetId),
          replyingTo: null,
          editingMessage: null,
          scheduled: [],
          disappearAfter: 0,
        }));
      } else {
        set((s) => ({
          selectedUser: selectedUser
            ? { ...selectedUser, id: targetId, unreadCount: 0 }
            : null,
          users: selectedUser
            ? s.users.map((u) =>
                sameId(u.id ?? u._id, targetId) ? { ...u, unreadCount: 0 } : u,
              )
            : s.users,
          replyingTo: null,
          editingMessage: null,
        }));
      }

      syncActiveChat();
      if (targetId && isTabVisible()) {
        get().markSeen(targetId);
      }
      if (targetId) {
        get().fetchUserProfile(targetId);
      }
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
        cryptoState: "plaintext",
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

    /* ---------------- EDIT (re-encrypted or plaintext matching original) ---------------- */
    editMessage: async (messageId, text) => {
      try {
        const target = get().messages.find((m) => sameId(m.id, messageId));
        if (!target) return false;

        const isTargetEncrypted = Boolean(target.encrypted || target.e2ee);
        let payload = {};

        if (isTargetEncrypted) {
          if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
          const enc = await encryptFor(dmPeerOf(target, myId()), text);
          payload = {
            text: enc.text,
            iv: enc.iv,
            encrypted: true,
            keyEnvelopes: enc.keyEnvelopes,
          };
        } else {
          payload = {
            text,
            encrypted: false,
          };
        }

        const res = await axiosInstance.patch(
          `/messages/edit/${messageId}`,
          payload,
        );
        const p = res.data.data;
        if (p?.text !== undefined) {
          patchById(messageId, {
            text, // plaintext we just entered
            isEdited: p.isEdited ?? true,
            editedAt: p.editedAt ?? new Date().toISOString(),
            linkPreview: null,
            decrypted: true,
            decryptFailed: false,
            cryptoState: isTargetEncrypted ? "decrypted" : "plaintext",
            ...(payload.iv ? { iv: payload.iv } : {}),
            ...(payload.keyEnvelopes
              ? { keyEnvelopes: payload.keyEnvelopes }
              : {}),
          });
          get().rehydrateReplies();
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
    //   { userIds, ciphertexts: [{ userId, text, iv, keyEnvelopes }] }
    forwardMessages: async (messageId, userIds) => {
      try {
        const src = get().messages.find((m) => sameId(m.id, messageId));
        if (!src) {
          toast.error("Message not found in this chat");
          return false;
        }

        const isEncrypted = Boolean(src.encrypted || src.e2ee);
        const isDecrypted = Boolean(src.decrypted);
        const decryptFailed = Boolean(src.decryptFailed);
        const isDecrypting = src.cryptoState === "decrypting";

        if (
          isEncrypted &&
          (decryptFailed || isDecrypting || !isDecrypted || !src.text)
        ) {
          toast.error("This message is still encrypted");
          return false;
        }

        let targets = userIds;
        const payload = {};

        if (isEncrypted && src.text) {
          if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
          const results = await Promise.allSettled(
            userIds.map(async (uid) => {
              const enc = await encryptFor(uid, src.text);
              return {
                userId: String(uid),
                text: enc.text,
                iv: enc.iv,
                keyEnvelopes: enc.keyEnvelopes || [],
              };
            }),
          );
          const ok = results
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value);
          const failedCount = userIds.length - ok.length;
          if (!ok.length) throw new Error("peer-has-no-key");
          if (failedCount > 0) {
            toast.error(
              `${failedCount} contact(s) haven't enabled encryption and were skipped.`,
            );
          }
          targets = ok.map((o) => o.userId);
          payload.ciphertexts = ok;
          payload.encrypted = true;
        } else {
          // Plaintext forward
          payload.encrypted = false;
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
        const clientRequestId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        await axiosInstance.post(`/messages/schedule/${receiverId}`, {
          text: enc.text,
          iv: enc.iv,
          encrypted: true,
          scheduledFor,
          keyEnvelopes: enc.keyEnvelopes,
          clientRequestId,
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
        const rawItems = res.data.data || [];
        const items = await Promise.all(
          rawItems.map(async (it) => {
            try {
              return await decryptDmMessage(
                {
                  ...it,
                  id: it._id || it.id,
                  encrypted: Boolean(it.e2ee || it.encrypted),
                  keyEnvelopes: it.keyEnvelopes || [],
                  senderId: me,
                  receiverId: it.receiverId ?? userId,
                },
                me,
                userId,
              );
            } catch (_err) {
              return {
                ...it,
                id: it._id || it.id,
                decryptedText: "(Encrypted message)",
              };
            }
          }),
        );
        set({ scheduled: items });
      } catch (error) {
        toast.error(errMsg(error, "Failed to load scheduled messages"));
      }
    },

    editScheduledMessage: async (scheduleId, receiverId, text, scheduledFor) => {
      try {
        const payload = {};
        if (text) {
          if (!(await e2eeReady())) throw new Error("e2ee-not-ready");
          const enc = await encryptFor(receiverId, text);
          payload.text = enc.text;
          payload.iv = enc.iv;
          payload.encrypted = true;
          payload.keyEnvelopes = enc.keyEnvelopes;
        }
        if (scheduledFor) {
          payload.scheduledFor = scheduledFor;
        }
        await axiosInstance.patch(`/messages/scheduled/${scheduleId}`, payload);
        toast.success("Scheduled message updated");
        get().getScheduled(receiverId);
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
