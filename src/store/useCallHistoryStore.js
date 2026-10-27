import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const BASE = "/calls";

export const useCallHistoryStore = create((set) => ({
  calls: [],
  isLoading: false,

  fetchCalls: async (limit = 50) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`${BASE}/history`, {
        params: { limit },
      });
      set({ calls: res.data?.data ?? [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load call history");
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => set({ calls: [], isLoading: false }),
}));
