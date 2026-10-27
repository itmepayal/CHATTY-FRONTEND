import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js"; // <- apne axios instance ka path

// apne app.use("/api/...", groupCallRoutes) ke hisaab se badlo
// (agar axiosInstance ka baseURL "/api" hai to yahan "/group-calls" hi rakho)
const BASE = "/group-calls";

export const useGroupCallHistoryStore = create((set, get) => ({
  byGroup: {}, // groupId -> calls[]
  all: [], // meri saari groups ki calls
  isLoadingAll: false,

  /* ---- ek group ki history ---- */
  fetchGroup: async (groupId, limit = 50) => {
    const gid = String(groupId);
    try {
      const res = await axiosInstance.get(`${BASE}/group/${gid}`, {
        params: { limit },
      });
      const calls = res.data?.data ?? [];
      set((s) => ({ byGroup: { ...s.byGroup, [gid]: calls } }));
    } catch (err) {
      console.error("[gcall-history] group fetch failed:", err);
    }
  },

  /* ---- meri saari groups ki history ---- */
  fetchAll: async (limit = 50) => {
    set({ isLoadingAll: true });
    try {
      const res = await axiosInstance.get(`${BASE}/history`, {
        params: { limit },
      });
      set({ all: res.data?.data ?? [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load call history");
    } finally {
      set({ isLoadingAll: false });
    }
  },

  /* ---- call end hone par: jo already loaded hai sirf wahi refresh ---- */
  refresh: (groupId) => {
    const gid = String(groupId);
    if (get().byGroup[gid]) get().fetchGroup(gid);
    if (get().all.length) get().fetchAll();
  },

  /* ---- logout par call karo ---- */
  clear: () => set({ byGroup: {}, all: [], isLoadingAll: false }),
}));
