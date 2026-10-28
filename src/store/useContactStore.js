import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const norm = (u) => ({ ...u, id: String(u.id ?? u._id) });
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

export const useContactStore = create((set, get) => ({
  contacts: [],
  contactIds: [],
  loaded: false,
  results: [],
  isSearching: false,

  fetchContacts: async () => {
    try {
      const res = await axiosInstance.get("/contacts");
      const contacts = (res.data.contacts || []).map(norm);
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
      set({ results: (res.data.users || []).map(norm) });
    } catch (e) {
      toast.error(errMsg(e, "Search failed"));
    } finally {
      set({ isSearching: false });
    }
  },

  clearResults: () => set({ results: [] }),

  addContact: async (user) => {
    try {
      await axiosInstance.post(`/contacts/${user.id}`);
      set((st) => ({
        contacts: [norm(user), ...st.contacts],
        contactIds: [String(user.id), ...st.contactIds],
        results: st.results.map((r) =>
          r.id === String(user.id) ? { ...r, isContact: true } : r,
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
