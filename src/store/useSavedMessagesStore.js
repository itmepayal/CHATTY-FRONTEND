import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useSavedMessagesStore = create((set, get) => ({
  savedMessages: [],
  meta: {
    categories: [
      { name: "Important", count: 0 },
      { name: "Work", count: 0 },
      { name: "Personal", count: 0 },
      { name: "Ideas", count: 0 },
      { name: "Links", count: 0 },
      { name: "Documents", count: 0 },
      { name: "Reminders", count: 0 },
      { name: "Custom", count: 0 },
    ],
    folders: [],
    tags: [],
  },
  loading: false,
  total: 0,
  page: 1,
  selectedCategory: "All",
  selectedFolder: "All",
  selectedTag: null,
  searchQuery: "",
  filterChatType: "all",

  setFilter: (key, value) => {
    set({ [key]: value });
    get().fetchSavedMessages();
  },

  fetchMeta: async () => {
    try {
      const res = await axiosInstance.get("/saved-messages/meta");
      if (res.data?.success && res.data.data) {
        set({ meta: res.data.data });
      }
    } catch (err) {
      console.error("[SavedMessages] Failed to fetch meta:", err);
    }
  },

  fetchSavedMessages: async (customParams = {}) => {
    set({ loading: true });
    try {
      const { selectedCategory, selectedFolder, selectedTag, searchQuery, filterChatType } = get();

      const params = {
        page: 1,
        limit: 100,
        ...customParams,
      };

      if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
      if (selectedFolder && selectedFolder !== "All") params.folder = selectedFolder;
      if (selectedTag) params.tag = selectedTag;
      if (searchQuery?.trim()) params.q = searchQuery.trim();
      if (filterChatType && filterChatType !== "all") params.chatType = filterChatType;

      const res = await axiosInstance.get("/saved-messages", { params });
      if (res.data?.success && res.data.data) {
        set({
          savedMessages: res.data.data.items || [],
          total: res.data.data.total || 0,
          page: res.data.data.page || 1,
        });
      }
    } catch (err) {
      console.error("[SavedMessages] Fetch failed:", err);
      toast.error("Failed to load saved messages.");
    } finally {
      set({ loading: false });
    }
  },

  saveMessage: async ({ messageId, messageModel = "Message", category, folder, tags, note }) => {
    try {
      const res = await axiosInstance.post("/saved-messages", {
        messageId,
        messageModel,
        category: category || "Important",
        folder: folder || "General",
        tags: Array.isArray(tags) ? tags : [],
        note: note || "",
      });

      if (res.data?.success) {
        toast.success("Message saved successfully!");
        get().fetchMeta();
        get().fetchSavedMessages();
        return res.data.data;
      }
    } catch (err) {
      console.error("[SavedMessages] Save failed:", err);
      toast.error(err?.response?.data?.message || "Failed to save message.");
      throw err;
    }
  },

  createNote: async ({ note, category = "Personal", folder = "Notes", tags = [] }) => {
    try {
      const res = await axiosInstance.post("/saved-messages/notes", {
        note,
        category,
        folder,
        tags,
      });

      if (res.data?.success) {
        toast.success("Note saved successfully!");
        get().fetchMeta();
        get().fetchSavedMessages();
        return res.data.data;
      }
    } catch (err) {
      console.error("[SavedMessages] Create note failed:", err);
      toast.error(err?.response?.data?.message || "Failed to create note.");
      throw err;
    }
  },

  updateSavedMessage: async (savedMessageId, updates) => {
    try {
      const res = await axiosInstance.patch(`/saved-messages/${savedMessageId}`, updates);
      if (res.data?.success) {
        set((state) => ({
          savedMessages: state.savedMessages.map((item) =>
            item._id === savedMessageId ? { ...item, ...res.data.data } : item
          ),
        }));
        toast.success("Saved item updated.");
        get().fetchMeta();
      }
    } catch (err) {
      console.error("[SavedMessages] Update failed:", err);
      toast.error("Failed to update saved item.");
    }
  },

  unsaveMessage: async (savedMessageId) => {
    try {
      const res = await axiosInstance.delete(`/saved-messages/${savedMessageId}`);
      if (res.data?.success) {
        set((state) => ({
          savedMessages: state.savedMessages.filter((item) => item._id !== savedMessageId),
          total: Math.max(0, state.total - 1),
        }));
        toast.success("Saved item removed.");
        get().fetchMeta();
      }
    } catch (err) {
      console.error("[SavedMessages] Unsave failed:", err);
      toast.error("Failed to remove saved message.");
    }
  },
}));
