import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useStickerStore = create((set, get) => ({
  packs: [],
  categories: [],
  activeCategory: "all",
  activeFilter: "all", // "all" | "trending" | "popular" | "free" | "premium"
  activeMarketplaceTab: "discover", // "discover" | "trending" | "categories" | "my_stickers" | "favorites" | "recent"
  searchQuery: "",
  recentSearches: (() => {
    try {
      return JSON.parse(localStorage.getItem("chatty_recent_sticker_searches") || "[]");
    } catch {
      return [];
    }
  })(),
  searchResults: { stickers: [], packs: [] },
  searchLoading: false,
  discoverFeed: { featured: [], trending: [], popular: [], newest: [] },
  discoverLoading: false,
  page: 1,
  totalPages: 1,
  totalPacks: 0,
  hasMore: false,
  loading: false,
  selectedPack: null,

  // User library & picker state
  installedPacks: [],
  favoriteStickers: [],
  favoriteStickerIds: new Set(),
  recentStickers: [],
  libraryLoading: false,

  // Creator studio state
  myCreatedPacks: [],
  creatorLoading: false,

  // Admin moderation state
  pendingPacks: [],
  marketplaceAnalytics: null,

  // Setters
  setActiveCategory: (cat) => set({ activeCategory: cat, page: 1 }),
  setActiveFilter: (filter) => set({ activeFilter: filter, page: 1 }),
  setActiveMarketplaceTab: (tab) => set({ activeMarketplaceTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
  setSelectedPack: (pack) => set({ selectedPack: pack }),

  // Actions
  fetchDiscover: async () => {
    set({ discoverLoading: true });
    try {
      const res = await axiosInstance.get("/stickers/discover");
      if (res.data?.success) {
        set({ discoverFeed: res.data.data });
      }
    } catch (err) {
      console.error("fetchDiscover error:", err);
    } finally {
      set({ discoverLoading: false });
    }
  },

  searchStickersGlobal: async (query) => {
    if (!query || !query.trim()) {
      set({ searchResults: { stickers: [], packs: [] }, searchLoading: false });
      return;
    }
    set({ searchLoading: true });
    try {
      const res = await axiosInstance.get("/stickers/search", { params: { q: query.trim() } });
      if (res.data?.success) {
        set({ searchResults: res.data.data || { stickers: [], packs: [] } });
      }
    } catch (err) {
      console.error("searchStickersGlobal error:", err);
    } finally {
      set({ searchLoading: false });
    }
  },

  addRecentSearch: (query) => {
    const q = (query || "").trim();
    if (!q) return;
    set((state) => {
      const updated = [q, ...state.recentSearches.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 10);
      try {
        localStorage.setItem("chatty_recent_sticker_searches", JSON.stringify(updated));
      } catch {}
      return { recentSearches: updated };
    });
  },

  clearRecentSearches: () => {
    try {
      localStorage.removeItem("chatty_recent_sticker_searches");
    } catch {}
    set({ recentSearches: [] });
  },

  // Actions
  fetchCategories: async () => {
    try {
      const res = await axiosInstance.get("/stickers/categories");
      if (res.data?.success) {
        set({ categories: res.data.data || [] });
      }
    } catch (err) {
      console.error("fetchCategories error:", err);
    }
  },

  fetchMarketplace: async (params = {}) => {
    set({ loading: true });
    try {
      const { activeCategory, activeFilter, searchQuery, page } = get();
      const query = {
        category:
          params.category !== undefined
            ? params.category !== "all"
              ? params.category
              : undefined
            : activeCategory !== "all"
              ? activeCategory
              : undefined,
        filter:
          params.filter !== undefined
            ? params.filter !== "all"
              ? params.filter
              : undefined
            : activeFilter !== "all"
              ? activeFilter
              : undefined,
        search:
          params.search !== undefined
            ? params.search || undefined
            : searchQuery || undefined,
        page: params.page || page || 1,
        limit: params.limit || 24,
      };

      const res = await axiosInstance.get("/stickers/packs", { params: query });
      if (res.data?.success) {
        const { packs, pagination } = res.data.data;
        const totalPages = pagination?.totalPages || pagination?.pages || 1;
        const currentPage = pagination?.page || query.page || 1;
        const hasMore =
          pagination?.hasMore !== undefined
            ? pagination.hasMore
            : currentPage < totalPages;

        set({
          packs: params.append ? [...get().packs, ...packs] : packs,
          page: currentPage,
          totalPages,
          totalPacks: pagination?.total || packs.length,
          hasMore,
        });
      }
    } catch (err) {
      console.error("fetchMarketplace error:", err);
    } finally {
      set({ loading: false });
    }
  },

  fetchPackDetails: async (packId) => {
    try {
      const res = await axiosInstance.get(`/stickers/packs/${packId}`);
      if (res.data?.success) {
        set({ selectedPack: res.data.data });
        return res.data.data;
      }
    } catch (err) {
      console.error("fetchPackDetails error:", err);
    }
    return null;
  },

  fetchLibrary: async () => {
    set({ libraryLoading: true });
    try {
      const res = await axiosInstance.get("/stickers/library");
      if (res.data?.success) {
        set({ installedPacks: res.data.data || [] });
      }
    } catch (err) {
      console.error("fetchLibrary error:", err);
    } finally {
      set({ libraryLoading: false });
    }
  },

  fetchFavorites: async () => {
    try {
      const res = await axiosInstance.get("/stickers/favorites");
      if (res.data?.success) {
        const favs = res.data.data || [];
        const ids = new Set(
          favs.map(
            (f) =>
              f._id || f.id || f.stickerId || f.sticker?._id || f.sticker?.id,
          ),
        );
        set({ favoriteStickers: favs, favoriteStickerIds: ids });
      }
    } catch (err) {
      console.error("fetchFavorites error:", err);
    }
  },

  fetchRecent: async () => {
    try {
      const res = await axiosInstance.get("/stickers/recent");
      if (res.data?.success) {
        set({ recentStickers: res.data.data || [] });
      }
    } catch (err) {
      console.error("fetchRecent error:", err);
    }
  },

  clearRecent: async () => {
    try {
      const res = await axiosInstance.delete("/stickers/recent");
      if (res.data?.success) {
        set({ recentStickers: [] });
        toast.success("Recent stickers cleared");
      }
    } catch (err) {
      toast.error("Failed to clear recent stickers");
    }
  },

  installPack: async (packId) => {
    try {
      const res = await axiosInstance.post(`/stickers/install/${packId}`);
      if (res.data?.success) {
        toast.success("Sticker pack added to your library!");
        set((state) => ({
          packs: state.packs.map((p) =>
            p._id === packId || p.id === packId
              ? { ...p, isInstalled: true }
              : p,
          ),
        }));
        await get().fetchLibrary();
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add sticker pack");
      return false;
    }
  },

  uninstallPack: async (packId) => {
    try {
      const res = await axiosInstance.post(`/stickers/uninstall/${packId}`);
      if (res.data?.success) {
        toast.success("Sticker pack removed from library");
        set((state) => ({
          installedPacks: state.installedPacks.filter(
            (p) => (p._id || p.id) !== packId,
          ),
          packs: state.packs.map((p) =>
            p._id === packId || p.id === packId
              ? { ...p, isInstalled: false }
              : p,
          ),
        }));
        return true;
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to remove sticker pack",
      );
      return false;
    }
  },

  purchasePack: async (packId) => {
    try {
      const res = await axiosInstance.post(`/stickers/purchase/${packId}`);
      if (res.data?.success) {
        toast.success("Sticker pack purchased and installed!");
        set((state) => ({
          packs: state.packs.map((p) =>
            p._id === packId || p.id === packId
              ? { ...p, isInstalled: true }
              : p,
          ),
        }));
        await get().fetchLibrary();
        return { success: true, remainingCoins: res.data.data?.remainingCoins };
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Purchase failed";
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  toggleFavorite: async (sticker) => {
    const stickerId = sticker?._id || sticker?.id || sticker?.stickerId;
    if (!stickerId) return;

    try {
      const res = await axiosInstance.post(`/stickers/favorites/${stickerId}`);
      if (res.data?.success) {
        const isFavorited = res.data.data.isFavorited;
        set((state) => {
          const nextSet = new Set(state.favoriteStickerIds);
          let nextFavs = [...state.favoriteStickers];
          if (isFavorited) {
            nextSet.add(stickerId);
            nextFavs.unshift({
              ...sticker,
              stickerId,
              addedAt: new Date().toISOString(),
            });
            toast.success("Added to favorites");
          } else {
            nextSet.delete(stickerId);
            nextFavs = nextFavs.filter(
              (f) =>
                (f._id ||
                  f.id ||
                  f.stickerId ||
                  f.sticker?._id ||
                  f.sticker?.id) !== stickerId,
            );
            toast.success("Removed from favorites");
          }
          return { favoriteStickerIds: nextSet, favoriteStickers: nextFavs };
        });
      }
    } catch (err) {
      toast.error("Could not update favorites");
    }
  },

  reorderLibrary: async (orderedPackIds) => {
    try {
      await axiosInstance.put("/stickers/library/order", { orderedPackIds });
    } catch (err) {
      console.error("reorderLibrary error:", err);
    }
  },

  movePackOrder: async (packId, direction) => {
    const { installedPacks, reorderLibrary } = get();
    const index = installedPacks.findIndex(
      (p) => String(p._id || p.id) === String(packId),
    );
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= installedPacks.length) return;

    const newPacks = [...installedPacks];
    const [moved] = newPacks.splice(index, 1);
    newPacks.splice(targetIndex, 0, moved);

    set({ installedPacks: newPacks });
    const orderedIds = newPacks.map((p) => p._id || p.id);
    await reorderLibrary(orderedIds);
  },

  // Creator Studio actions
  fetchMyCreatedPacks: async () => {
    set({ creatorLoading: true });
    try {
      const res = await axiosInstance.get("/stickers/creator/packs");
      if (res.data?.success) {
        set({ myCreatedPacks: res.data.data || [] });
      }
    } catch (err) {
      console.error("fetchMyCreatedPacks error:", err);
    } finally {
      set({ creatorLoading: false });
    }
  },

  createPackDraft: async (packData) => {
    try {
      const res = await axiosInstance.post("/stickers/creator/packs", packData);
      if (res.data?.success) {
        toast.success("Pack draft created!");
        get().fetchMyCreatedPacks();
        return res.data.data;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create pack draft");
      return null;
    }
  },

  uploadStickersToPack: async (packId, files) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
        formData.append("stickers", file);
      }
      const res = await axiosInstance.post(
        `/stickers/creator/packs/${packId}/stickers`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (res.data?.success) {
        toast.success(
          `${res.data.data?.addedCount || files.length} stickers uploaded!`,
        );
        get().fetchMyCreatedPacks();
        return res.data.data;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload stickers");
      return null;
    }
  },

  submitPackForReview: async (packId) => {
    try {
      const res = await axiosInstance.post(
        `/stickers/creator/packs/${packId}/submit`,
      );
      if (res.data?.success) {
        toast.success("Pack submitted for review!");
        get().fetchMyCreatedPacks();
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit pack");
      return false;
    }
  },

  fetchPendingPacks: async () => {
    try {
      const res = await axiosInstance.get("/stickers/admin/pending");
      if (res.data?.success) {
        set({ pendingPacks: res.data.data || [] });
      }
    } catch (err) {
      console.error("fetchPendingPacks error:", err);
    }
  },

  moderatePack: async (packId, status, rejectionReason = "") => {
    try {
      const res = await axiosInstance.post(
        `/stickers/admin/packs/${packId}/status`,
        {
          status,
          rejectionReason,
        },
      );
      if (res.data?.success) {
        toast.success(`Pack status updated to ${status}`);
        set((state) => ({
          pendingPacks: state.pendingPacks.filter(
            (p) => (p._id || p.id) !== packId,
          ),
        }));
        get().fetchMarketplace();
        return true;
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update pack status",
      );
      return false;
    }
  },

  fetchMarketplaceAnalytics: async () => {
    try {
      const res = await axiosInstance.get("/stickers/admin/analytics");
      if (res.data?.success) {
        set({ marketplaceAnalytics: res.data.data });
      }
    } catch (err) {
      console.error("fetchMarketplaceAnalytics error:", err);
    }
  },

  fetchAssetIntegrityReport: async () => {
    try {
      const res = await axiosInstance.get("/stickers/integrity");
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err) {
      console.error("fetchAssetIntegrityReport error:", err);
    }
    return null;
  },
}));
