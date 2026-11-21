import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

const norm = (u) => ({ ...u, id: String(u.id ?? u._id) });
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const pickList = (res, ...keys) => {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

export const useContactStore = create((set, get) => ({
  contacts: [],
  contactIds: [],
  loaded: false,
  results: [],
  isSearching: false,

  // Contact requests
  requests: { incoming: [], outgoing: [] },
  isRequestsLoading: false,
  // Independent request loading map: { [requestId]: 'accepting' | 'declining' | 'cancelling' }
  requestActionLoading: {},

  // Request History
  requestHistory: [],
  isHistoryLoading: false,
  historyTotal: 0,
  historyPage: 1,

  // Blocked Users
  blockedUsers: [],
  isBlockedLoading: false,

  // Persistent Notifications
  notifications: [],
  unreadNotificationCount: 0,
  isNotificationsLoading: false,

  fetchContacts: async () => {
    try {
      const res = await axiosInstance.get("/contacts");
      const contacts = pickList(res, "users", "contacts").map(norm);
      set({ contacts, contactIds: contacts.map((c) => c.id) });
    } catch (e) {
      toast.error(errMsg(e, "Couldn't load contacts"));
    } finally {
      set({ loaded: true });
    }
  },

  searchUsers: async (q) => {
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get("/contacts/search", {
        params: { q },
      });
      const known = new Set(get().contactIds);
      const results = pickList(res, "users").map((u) => {
        const user = norm(u);
        return {
          ...user,
          isContact: user.isContact ?? known.has(user.id),
          relationship: user.relationship || (user.isContact ? "connected" : "none"),
          mutualCount: user.mutualCount || 0,
        };
      });
      set({ results });
    } catch (e) {
      toast.error(errMsg(e, "Search failed"));
    } finally {
      set({ isSearching: false });
    }
  },

  clearResults: () => set({ results: [] }),

  addContact: async (user) => {
    const id = String(user.id ?? user._id);
    try {
      await axiosInstance.post(`/contacts/${id}`);
      set((st) => ({
        contacts: st.contactIds.includes(id)
          ? st.contacts
          : [norm(user), ...st.contacts],
        contactIds: st.contactIds.includes(id)
          ? st.contactIds
          : [id, ...st.contactIds],
        results: st.results.map((r) =>
          r.id === id ? { ...r, isContact: true, relationship: "connected" } : r,
        ),
      }));
      toast.success(`${user.fullName || "Contact"} added`);
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't add contact"));
      return false;
    }
  },

  removeContact: async (userId) => {
    const id = String(userId);
    try {
      await axiosInstance.delete(`/contacts/${id}`);
      set((st) => ({
        contacts: st.contacts.filter((c) => c.id !== id),
        contactIds: st.contactIds.filter((x) => x !== id),
        results: st.results.map((r) =>
          r.id === id ? { ...r, isContact: false, relationship: "none" } : r,
        ),
      }));
      toast.success("Contact removed");
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't remove contact"));
      return false;
    }
  },

  // Contact requests methods
  fetchRequests: async () => {
    set({ isRequestsLoading: true });
    try {
      const res = await axiosInstance.get("/contacts/requests");
      const data = res?.data?.data || { incoming: [], outgoing: [] };
      const normalize = (r) => {
        if (!r || typeof r !== "object") return r;
        const id = String(r.id || r._id || r.requestId || "");
        return { ...r, id, _id: id, requestId: id };
      };
      set({
        requests: {
          incoming: (data.incoming || []).map(normalize),
          outgoing: (data.outgoing || []).map(normalize),
        },
      });
    } catch (e) {
      if (e?.response?.status !== 400 && e?.response?.status !== 404) {
        console.error("[useContactStore] fetchRequests error:", e?.message);
      }
      set({ requests: { incoming: [], outgoing: [] } });
    } finally {
      set({ isRequestsLoading: false });
    }
  },

  sendContactRequest: async (userId, note = "") => {
    const id = String(userId);
    try {
      const res = await axiosInstance.post(`/contacts/requests/${id}`, { note });
      toast.success("Contact request sent");
      set((st) => ({
        results: st.results.map((r) =>
          r.id === id ? { ...r, relationship: "request_sent" } : r,
        ),
      }));
      get().fetchRequests();
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't send contact request"));
      return false;
    }
  },

  acceptContactRequest: async (requestId) => {
    const id = String(requestId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[useContactStore] acceptContactRequest called with invalid requestId:", requestId);
      toast.error("Invalid contact request ID");
      return false;
    }
    // Prevent duplicate clicks if already processing this request
    if (get().requestActionLoading[id]) {
      return false;
    }
    set((st) => ({
      requestActionLoading: { ...st.requestActionLoading, [id]: "accepting" },
    }));
    try {
      await axiosInstance.post(`/contacts/requests/${id}/accept`);
      toast.success("Friend request accepted");
      set((st) => ({
        requests: {
          ...st.requests,
          incoming: st.requests.incoming.filter(
            (r) => (r.id || r._id || r.requestId) !== id,
          ),
        },
      }));
      await get().fetchContacts();
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't accept request"));
      return false;
    } finally {
      set((st) => {
        const next = { ...st.requestActionLoading };
        delete next[id];
        return { requestActionLoading: next };
      });
    }
  },

  rejectContactRequest: async (requestId) => {
    const id = String(requestId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[useContactStore] rejectContactRequest called with invalid requestId:", requestId);
      toast.error("Invalid contact request ID");
      return false;
    }
    // Prevent duplicate clicks if already processing this request
    if (get().requestActionLoading[id]) {
      return false;
    }
    set((st) => ({
      requestActionLoading: { ...st.requestActionLoading, [id]: "declining" },
    }));
    try {
      await axiosInstance.post(`/contacts/requests/${id}/reject`);
      toast.success("Friend request declined");
      set((st) => ({
        requests: {
          ...st.requests,
          incoming: st.requests.incoming.filter(
            (r) => (r.id || r._id || r.requestId) !== id,
          ),
        },
      }));
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't decline request"));
      return false;
    } finally {
      set((st) => {
        const next = { ...st.requestActionLoading };
        delete next[id];
        return { requestActionLoading: next };
      });
    }
  },

  declineContactRequest: async (requestId) => {
    return get().rejectContactRequest(requestId);
  },

  cancelContactRequest: async (requestId) => {
    const id = String(requestId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[useContactStore] cancelContactRequest called with invalid requestId:", requestId);
      toast.error("Invalid contact request ID");
      return false;
    }
    // Prevent duplicate clicks if already processing this request
    if (get().requestActionLoading[id]) {
      return false;
    }
    set((st) => ({
      requestActionLoading: { ...st.requestActionLoading, [id]: "cancelling" },
    }));
    try {
      await axiosInstance.post(`/contacts/requests/${id}/cancel`);
      toast.success("Contact request cancelled");
      set((st) => ({
        requests: {
          ...st.requests,
          outgoing: st.requests.outgoing.filter(
            (r) => (r.id || r._id || r.requestId) !== id,
          ),
        },
      }));
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't cancel request"));
      return false;
    } finally {
      set((st) => {
        const next = { ...st.requestActionLoading };
        delete next[id];
        return { requestActionLoading: next };
      });
    }
  },

  fetchRequestHistory: async (status = "", page = 1) => {
    set({ isHistoryLoading: true });
    try {
      const res = await axiosInstance.get("/contacts/requests/history", {
        params: { status: status || undefined, page },
      });
      const data = res?.data?.data || { items: [], total: 0 };
      set({
        requestHistory: data.items || [],
        historyTotal: data.total || 0,
        historyPage: page,
      });
    } catch (e) {
      console.warn("[useContactStore] fetchRequestHistory error:", e?.message);
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  // Block & Unblock methods
  fetchBlockedUsers: async () => {
    set({ isBlockedLoading: true });
    try {
      const res = await axiosInstance.get("/users/blocked");
      const list = pickList(res).map(norm);
      set({ blockedUsers: list });
    } catch (e) {
      console.warn("[useContactStore] fetchBlockedUsers error:", e?.message);
    } finally {
      set({ isBlockedLoading: false });
    }
  },

  blockUser: async (userId) => {
    const id = String(userId);
    try {
      await axiosInstance.post(`/users/${id}/block`);
      toast.success("User blocked");
      set((st) => ({
        contacts: st.contacts.filter((c) => c.id !== id),
        contactIds: st.contactIds.filter((x) => x !== id),
        results: st.results.map((r) =>
          r.id === id ? { ...r, isBlocked: true, relationship: "blocked" } : r,
        ),
      }));
      get().fetchBlockedUsers();
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't block user"));
      return false;
    }
  },

  unblockUser: async (userId) => {
    const id = String(userId);
    try {
      await axiosInstance.delete(`/users/${id}/block`);
      toast.success("User unblocked");
      set((st) => ({
        blockedUsers: st.blockedUsers.filter((u) => u.id !== id),
        results: st.results.map((r) =>
          r.id === id ? { ...r, isBlocked: false, relationship: "none" } : r,
        ),
      }));
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't unblock user"));
      return false;
    }
  },

  // Report User method
  reportUser: async (userId, { reason, details, messageId } = {}) => {
    const id = String(userId);
    try {
      await axiosInstance.post(`/users/${id}/report`, {
        reason,
        details,
        messageId,
      });
      toast.success("Report submitted. Thank you.");
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't submit report"));
      return false;
    }
  },

  // QR Code methods
  fetchUserQRCode: async (userId) => {
    try {
      const url = userId ? `/users/${userId}/qr` : `/users/me/qr`;
      const res = await axiosInstance.get(url);
      return res?.data?.data || null;
    } catch (e) {
      toast.error(errMsg(e, "Failed to load QR code"));
      return null;
    }
  },

  resolveQRPayload: async (payload) => {
    try {
      const res = await axiosInstance.post("/users/resolve-qr", { payload });
      return res?.data?.data || null;
    } catch (e) {
      toast.error(errMsg(e, "Invalid or expired QR code"));
      return null;
    }
  },

  fetchMutualContacts: async (otherUserId) => {
    try {
      const res = await axiosInstance.get(`/contacts/mutual/${otherUserId}`);
      return res?.data?.data?.mutualContacts || [];
    } catch (e) {
      return [];
    }
  },

  // Persistent Notification methods
  fetchNotifications: async (query = {}) => {
    set({ isNotificationsLoading: true });
    try {
      const res = await axiosInstance.get("/notifications", { params: query });
      const data = res?.data?.data || { items: [], unreadCount: 0 };
      set({
        notifications: data.items || [],
        unreadNotificationCount: data.unreadCount ?? 0,
      });
    } catch (e) {
      console.warn("[useContactStore] fetchNotifications error:", e?.message);
    } finally {
      set({ isNotificationsLoading: false });
    }
  },

  fetchUnreadNotificationCount: async () => {
    try {
      const res = await axiosInstance.get("/notifications/unread-count");
      const count = res?.data?.data?.count ?? 0;
      set({ unreadNotificationCount: count });
    } catch (e) {
      console.warn("[useContactStore] fetchUnreadNotificationCount error:", e?.message);
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
      set((st) => ({
        notifications: st.notifications.map((n) =>
          n.id === notificationId || n._id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadNotificationCount: Math.max(0, st.unreadNotificationCount - 1),
      }));
    } catch (e) {
      console.warn("[useContactStore] markNotificationRead error:", e?.message);
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await axiosInstance.patch("/notifications/read-all");
      set((st) => ({
        notifications: st.notifications.map((n) => ({ ...n, isRead: true })),
        unreadNotificationCount: 0,
      }));
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error(errMsg(e, "Failed to mark all as read"));
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      await axiosInstance.delete(`/notifications/${notificationId}`);
      set((st) => ({
        notifications: st.notifications.filter(
          (n) => n.id !== notificationId && n._id !== notificationId,
        ),
      }));
    } catch (e) {
      toast.error(errMsg(e, "Couldn't delete notification"));
    }
  },

  subscribeToSocketEvents: (socket) => {
    if (!socket) return;

    const onReqReceived = (payload) => {
      if (!payload) return;
      const reqId = String(payload.id || payload._id || payload.requestId || "");
      const normalized = {
        ...payload,
        id: reqId,
        _id: reqId,
        requestId: reqId,
      };
      set((st) => ({
        requests: {
          ...st.requests,
          incoming: [
            normalized,
            ...st.requests.incoming.filter(
              (r) => (r.id || r._id || r.requestId) !== reqId,
            ),
          ],
        },
      }));
      toast.info(`New contact request from ${payload.sender?.fullName || "a user"}`);
      get().fetchUnreadNotificationCount();
    };

    const onReqAccepted = (payload) => {
      const targetId = String(payload?.requestId || payload?.id || payload?._id || "");
      set((st) => ({
        requests: {
          ...st.requests,
          outgoing: st.requests.outgoing.filter(
            (r) => (r.id || r._id || r.requestId) !== targetId,
          ),
          incoming: st.requests.incoming.filter(
            (r) => (r.id || r._id || r.requestId) !== targetId,
          ),
        },
      }));
      get().fetchContacts();
      get().fetchUnreadNotificationCount();
      const myId = String(
        useAuthStore.getState()?.authUser?._id ||
        useAuthStore.getState()?.authUser?.id ||
        ""
      );
      if (payload?.acceptedBy && myId && String(payload.acceptedBy) !== myId) {
        toast.success("Your contact request was accepted!");
      }
    };

    const onReqRejected = (payload) => {
      const targetId = String(payload?.requestId || payload?.id || payload?._id || "");
      set((st) => ({
        requests: {
          ...st.requests,
          outgoing: st.requests.outgoing.filter(
            (r) => (r.id || r._id || r.requestId) !== targetId,
          ),
          incoming: st.requests.incoming.filter(
            (r) => (r.id || r._id || r.requestId) !== targetId,
          ),
        },
      }));
      get().fetchUnreadNotificationCount();
    };

    const onReqCancelled = (payload) => {
      const targetId = String(payload?.requestId || payload?.id || payload?._id || "");
      set((st) => ({
        requests: {
          ...st.requests,
          incoming: st.requests.incoming.filter(
            (r) => (r.id || r._id || r.requestId) !== targetId,
          ),
        },
      }));
      get().fetchUnreadNotificationCount();
    };

    const onContactAdded = () => {
      get().fetchContacts();
    };

    const onContactRemoved = (payload) => {
      const contactId = payload?.contactId;
      if (contactId) {
        set((st) => ({
          contacts: st.contacts.filter((c) => c.id !== contactId),
          contactIds: st.contactIds.filter((x) => x !== contactId),
        }));
      }
    };

    const onContactBlocked = (payload) => {
      const userId = payload?.userId;
      if (userId) {
        set((st) => ({
          contacts: st.contacts.filter((c) => c.id !== userId),
          contactIds: st.contactIds.filter((x) => x !== userId),
        }));
        get().fetchBlockedUsers();
      }
    };

    const onContactUnblocked = (payload) => {
      const userId = payload?.userId;
      if (userId) {
        set((st) => ({
          blockedUsers: st.blockedUsers.filter((u) => u.id !== userId),
        }));
      }
    };

    const onNotificationNew = (payload) => {
      set((st) => ({
        notifications: [payload, ...st.notifications],
        unreadNotificationCount: st.unreadNotificationCount + 1,
      }));
    };

    const onNotificationRead = (payload) => {
      const id = payload?.id;
      if (id) {
        set((st) => ({
          notifications: st.notifications.map((n) =>
            n.id === id || n._id === id ? { ...n, isRead: true } : n,
          ),
        }));
      }
    };

    const onNotificationCountUpdated = (payload) => {
      if (typeof payload?.count === "number") {
        set({ unreadNotificationCount: payload.count });
      }
    };

    socket.on("contact:request:received", onReqReceived);
    socket.on("contact:request:accepted", onReqAccepted);
    socket.on("contact:request:rejected", onReqRejected);
    socket.on("contact:request:cancelled", onReqCancelled);
    socket.on("contact:added", onContactAdded);
    socket.on("contact:removed", onContactRemoved);
    socket.on("contact:blocked", onContactBlocked);
    socket.on("contact:unblocked", onContactUnblocked);
    socket.on("notification:new", onNotificationNew);
    socket.on("notification:read", onNotificationRead);
    socket.on("notification:count:updated", onNotificationCountUpdated);

    return () => {
      socket.off("contact:request:received", onReqReceived);
      socket.off("contact:request:accepted", onReqAccepted);
      socket.off("contact:request:rejected", onReqRejected);
      socket.off("contact:request:cancelled", onReqCancelled);
      socket.off("contact:added", onContactAdded);
      socket.off("contact:removed", onContactRemoved);
      socket.off("contact:blocked", onContactBlocked);
      socket.off("contact:unblocked", onContactUnblocked);
      socket.off("notification:new", onNotificationNew);
      socket.off("notification:read", onNotificationRead);
      socket.off("notification:count:updated", onNotificationCountUpdated);
    };
  },

  reset: () =>
    set({
      contacts: [],
      contactIds: [],
      loaded: false,
      results: [],
      isSearching: false,
      requests: { incoming: [], outgoing: [] },
      isRequestsLoading: false,
      requestHistory: [],
      isHistoryLoading: false,
      historyTotal: 0,
      blockedUsers: [],
      isBlockedLoading: false,
      notifications: [],
      unreadNotificationCount: 0,
      isNotificationsLoading: false,
    }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("chatty:profile-updated", () => {
    if (useContactStore.getState().loaded) {
      useContactStore.getState().fetchContacts();
    }
  });
}
