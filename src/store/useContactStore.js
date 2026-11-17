import { create } from "zustand";
import { customToast as toast } from "../components/toast/customToastService.js";
import { axiosInstance } from "../lib/axios.js";

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
        return { ...user, isContact: user.isContact ?? known.has(user.id) };
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
          r.id === id ? { ...r, isContact: true } : r,
        ),
      }));
      toast.success(`${user.fullName} added`);
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
          r.id === id ? { ...r, isContact: false } : r,
        ),
      }));
      toast.success("Contact removed");
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Couldn't remove contact"));
      return false;
    }
  },

  reset: () =>
    set({
      contacts: [],
      contactIds: [],
      loaded: false,
      results: [],
      isSearching: false,
    }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("chatty:profile-updated", () => {
    if (useContactStore.getState().loaded) {
      useContactStore.getState().fetchContacts();
    }
  });
}
