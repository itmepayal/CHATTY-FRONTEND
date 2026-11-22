import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useGiftStore = create((set, get) => ({
  catalog: [],
  categories: [],
  featured: null,
  wallet: {
    balance: 500,
    totalSpent: 0,
    totalReceived: 0,
    canClaimDailyBonus: true,
    nextClaimAvailableAt: null,
  },
  transactions: [],
  sentHistory: [],
  receivedHistory: [],
  favorites: [],
  favoriteIds: new Set(),
  activeCategory: "All",
  searchQuery: "",
  filterType: "all",
  rarityFilter: "all",
  minPrice: "",
  maxPrice: "",
  sortOption: "default",
  selectedGift: null,
  loading: false,
  loadingMore: false,
  walletLoading: false,
  sending: false,
  activeTab: "store", // "store" | "wallet" | "sent" | "received" | "favorites"
  celebrationGift: null,
  page: 1,
  totalPages: 1,
  totalGifts: 600,
  hasMore: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveCategory: (cat) => set({ activeCategory: cat, selectedGift: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterType: (f) => set({ filterType: f }),
  setRarityFilter: (r) => set({ rarityFilter: r }),
  setMinPrice: (p) => set({ minPrice: p }),
  setMaxPrice: (p) => set({ maxPrice: p }),
  setSortOption: (s) => set({ sortOption: s }),
  setSelectedGift: (gift) => set({ selectedGift: gift }),
  setCelebrationGift: (gift) => set({ celebrationGift: gift }),
  dismissCelebration: () => set({ celebrationGift: null }),

  fetchCategories: async () => {
    try {
      const res = await axiosInstance.get("/gifts/categories");
      if (res.data?.data) {
        set({ categories: res.data.data });
      }
    } catch (_err) {}
  },

  fetchCatalog: async (params = {}) => {
    set({ loading: true });
    try {
      const query = {
        page: 1,
        limit: 600,
        ...params,
      };
      const res = await axiosInstance.get("/gifts", { params: query });
      if (res.data?.data?.items) {
        const items = res.data.data.items;
        const pagination = res.data.data.pagination || {};
        set({
          catalog: items,
          page: pagination.page || 1,
          totalPages: pagination.totalPages || 1,
          totalGifts: pagination.total || items.length,
          hasMore: Boolean(pagination.hasMore),
          selectedGift: get().selectedGift || items[0] || null,
        });
      }
    } catch (err) {
      console.error("fetchCatalog error:", err);
    } finally {
      set({ loading: false });
    }
  },

  loadMoreCatalog: async (params = {}) => {
    const { page, totalPages, hasMore, loadingMore, catalog } = get();
    if (!hasMore || loadingMore || page >= totalPages) return;

    set({ loadingMore: true });
    try {
      const nextPage = page + 1;
      const query = {
        page: nextPage,
        limit: 100,
        ...params,
      };
      const res = await axiosInstance.get("/gifts", { params: query });
      if (res.data?.data?.items) {
        const newItems = res.data.data.items;
        const pagination = res.data.data.pagination || {};
        set({
          catalog: [...catalog, ...newItems],
          page: pagination.page || nextPage,
          totalPages: pagination.totalPages || totalPages,
          totalGifts: pagination.total || catalog.length + newItems.length,
          hasMore: Boolean(pagination.hasMore),
        });
      }
    } catch (err) {
      console.error("loadMoreCatalog error:", err);
    } finally {
      set({ loadingMore: false });
    }
  },

  fetchFavorites: async () => {
    try {
      const res = await axiosInstance.get("/gifts/favorites");
      if (res.data?.data) {
        const favs = res.data.data;
        const ids = new Set(favs.map((g) => String(g.id || g._id || g.slug)));
        set({ favorites: favs, favoriteIds: ids });
      }
    } catch (_err) {}
  },

  toggleFavorite: async (gift) => {
    if (!gift) return;
    const targetId = String(gift.id || gift._id || gift.slug);
    const targetSlug = gift.slug || targetId;
    const currentFavIds = new Set(get().favoriteIds);
    const isCurrentlyFavorited = currentFavIds.has(targetId) || currentFavIds.has(targetSlug);

    // Optimistic state update
    if (isCurrentlyFavorited) {
      currentFavIds.delete(targetId);
      currentFavIds.delete(targetSlug);
      set({
        favoriteIds: new Set(currentFavIds),
        favorites: get().favorites.filter(
          (f) => String(f.id || f._id) !== targetId && f.slug !== targetSlug,
        ),
        catalog: get().catalog.map((item) =>
          String(item.id || item._id) === targetId || item.slug === targetSlug
            ? { ...item, isFavorited: false }
            : item,
        ),
      });
    } else {
      currentFavIds.add(targetId);
      currentFavIds.add(targetSlug);
      set({
        favoriteIds: new Set(currentFavIds),
        favorites: [{ ...gift, isFavorited: true }, ...get().favorites],
        catalog: get().catalog.map((item) =>
          String(item.id || item._id) === targetId || item.slug === targetSlug
            ? { ...item, isFavorited: true }
            : item,
        ),
      });
    }

    try {
      const res = await axiosInstance.post(`/gifts/favorites/toggle/${targetSlug}`);
      if (res.data?.data?.isFavorited) {
        toast.success(`Saved "${gift.name}" to favorites!`);
      } else {
        toast.success(`Removed "${gift.name}" from favorites.`);
      }
    } catch (err) {
      // Revert on error
      get().fetchFavorites();
      toast.error("Could not update favorites.");
    }
  },

  fetchFeatured: async () => {
    try {
      const res = await axiosInstance.get("/gifts/featured");
      if (res.data?.data) {
        set({ featured: res.data.data });
      }
    } catch (_err) {}
  },

  fetchWallet: async () => {
    set({ walletLoading: true });
    try {
      const res = await axiosInstance.get("/gifts/wallet/me");
      if (res.data?.data) {
        set({ wallet: res.data.data });
      }
    } catch (_err) {
    } finally {
      set({ walletLoading: false });
    }
  },

  claimDailyBonus: async () => {
    try {
      const res = await axiosInstance.post("/gifts/wallet/claim-daily-bonus");
      if (res.data?.data) {
        set((state) => ({
          wallet: {
            ...state.wallet,
            balance: res.data.data.balance,
            canClaimDailyBonus: false,
            nextClaimAvailableAt: res.data.data.nextClaimAvailableAt,
          },
        }));
        toast.success(res.data.data.message || "Claimed +100 free coins!");
        get().fetchTransactions();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to claim bonus right now.";
      toast.error(msg);
    }
  },

  fetchTransactions: async () => {
    try {
      const res = await axiosInstance.get("/gifts/wallet/transactions");
      if (res.data?.data?.items) {
        set({ transactions: res.data.data.items });
      }
    } catch (_err) {}
  },

  fetchSentHistory: async () => {
    try {
      const res = await axiosInstance.get("/gifts/history/sent");
      if (res.data?.data?.items) {
        set({ sentHistory: res.data.data.items });
      }
    } catch (_err) {}
  },

  fetchReceivedHistory: async () => {
    try {
      const res = await axiosInstance.get("/gifts/history/received");
      if (res.data?.data?.items) {
        set({ receivedHistory: res.data.data.items });
      }
    } catch (_err) {}
  },

  sendGift: async ({
    recipientId = null,
    groupId = null,
    giftId,
    giftSlug = "",
    personalMessage = "",
    chatType = "direct",
  }) => {
    set({ sending: true });
    try {
      const idempotencyKey = `gift_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await axiosInstance.post("/gifts/send", {
        recipientId,
        groupId,
        giftId,
        giftSlug,
        personalMessage: personalMessage?.trim() || "",
        idempotencyKey,
        chatType,
      });

      if (res.data?.data) {
        const { wallet, gift, message } = res.data.data;
        if (wallet) {
          set((state) => ({
            wallet: {
              ...state.wallet,
              balance: wallet.balance,
              totalSpent: wallet.totalSpent,
            },
          }));
        }

        // Trigger celebratory animation
        set({ celebrationGift: gift });

        // Update local sent history & transactions
        get().fetchSentHistory();
        get().fetchTransactions();

        toast.success(`Sent ${gift?.name || "gift"} successfully!`);
        return { success: true, message, gift, wallet };
      }
      return { success: false };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send gift.";
      toast.error(msg);
      throw err;
    } finally {
      set({ sending: false });
    }
  },

  // Admin Actions
  updateGiftPrice: async (idOrSlug, coinPrice) => {
    try {
      const res = await axiosInstance.patch(`/gifts/admin/${idOrSlug}`, {
        coinPrice: Number(coinPrice),
      });
      if (res.data?.data) {
        const updated = res.data.data;
        set({
          catalog: get().catalog.map((g) =>
            g.slug === updated.slug || String(g.id || g._id) === String(updated.id || updated._id)
              ? { ...g, coinPrice: updated.coinPrice }
              : g,
          ),
          selectedGift:
            get().selectedGift?.slug === updated.slug
              ? { ...get().selectedGift, coinPrice: updated.coinPrice }
              : get().selectedGift,
        });
        toast.success(`Updated ${updated.name} price to ${updated.coinPrice} coins.`);
        return updated;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update gift price.");
      throw err;
    }
  },

  creditWalletCoins: async (userId, amount, reason = "Admin adjustment") => {
    try {
      const res = await axiosInstance.post("/gifts/admin/wallet/credit", {
        userId,
        amount: Number(amount),
        reason,
      });
      if (res.data?.data) {
        toast.success(`Credited ${amount} coins successfully.`);
        get().fetchWallet();
        return res.data.data;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to credit coins.");
      throw err;
    }
  },
}));
