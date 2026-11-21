import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Gift,
  Send,
  Sparkles,
  Coins,
  Search,
  Flame,
  Star,
  Crown,
  History,
  Wallet as WalletIcon,
  Heart,
  CheckCircle2,
  AlertCircle,
  Gem,
  RotateCcw,
  Eye,
  EyeOff,
  Edit3,
} from "lucide-react";
import { useGiftStore } from "../../../store/useGiftStore.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import {
  GIFTS as LOCAL_FALLBACK_GIFTS,
  GIFT_CATEGORIES as LOCAL_CATEGORIES,
} from "./giftData.js";
import GiftArtwork from "./GiftArtwork.jsx";
import { getCategoryTheme, getRarityTheme } from "./giftUIHelpers.js";

const GiftMarketplaceModal = ({
  isOpen,
  onClose,
  onSendGift,
  recipientName = "Friend",
  recipientAvatar = "",
  recipientId = null,
  groupId = null,
  isGroup = false,
}) => {
  const authUser = useAuthStore((state) => state.authUser);
  const isAdmin = authUser?.role === "admin";

  const {
    catalog,
    categories,
    wallet,
    transactions,
    sentHistory,
    receivedHistory,
    favorites,
    favoriteIds,
    activeCategory,
    searchQuery,
    filterType,
    rarityFilter,
    minPrice,
    maxPrice,
    sortOption,
    selectedGift,
    loading,
    loadingMore,
    hasMore,
    totalGifts,
    activeTab,
    sending,
    setActiveTab,
    setActiveCategory,
    setSearchQuery,
    setFilterType,
    setRarityFilter,
    setMinPrice,
    setMaxPrice,
    setSortOption,
    setSelectedGift,
    fetchCatalog,
    loadMoreCatalog,
    fetchCategories,
    fetchWallet,
    claimDailyBonus,
    fetchTransactions,
    fetchSentHistory,
    fetchReceivedHistory,
    fetchFavorites,
    toggleFavorite,
    sendGift,
    updateGiftPrice,
  } = useGiftStore();

  const [note, setNote] = useState("");
  const [isPreviewAnimating, setIsPreviewAnimating] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [adminPriceInput, setAdminPriceInput] = useState("");
  const [isAdminEditingPrice, setIsAdminEditingPrice] = useState(false);
  const searchInputRef = useRef(null);

  // Load initial data on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchCatalog();
      fetchWallet();
      fetchFavorites();
    }
  }, [isOpen, fetchCategories, fetchCatalog, fetchWallet, fetchFavorites]);

  // When switching tabs, load appropriate sub-records
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "wallet") fetchTransactions();
    if (activeTab === "sent") fetchSentHistory();
    if (activeTab === "received") fetchReceivedHistory();
    if (activeTab === "favorites") fetchFavorites();
  }, [
    activeTab,
    isOpen,
    fetchTransactions,
    fetchSentHistory,
    fetchReceivedHistory,
    fetchFavorites,
  ]);

  // Unified items list: backend catalog with instant local fallback
  const sourceItems = useMemo(() => {
    return catalog && catalog.length > 0 ? catalog : LOCAL_FALLBACK_GIFTS;
  }, [catalog]);

  const sourceCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : LOCAL_CATEGORIES;
  }, [categories]);

  // Compute actual dynamic count per category directly from sourceItems
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const g of sourceItems) {
      const cat = g.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [sourceItems]);

  // Auto-select first gift if none selected
  useEffect(() => {
    if (!selectedGift && sourceItems.length > 0) {
      setSelectedGift(sourceItems[0]);
    }
  }, [selectedGift, sourceItems, setSelectedGift]);

  // Update admin input when selected gift changes
  useEffect(() => {
    if (selectedGift) {
      setAdminPriceInput(String(selectedGift.coinPrice || ""));
      setIsAdminEditingPrice(false);
    }
  }, [selectedGift]);

  // Comprehensive Client-side Filtering & Sorting for Instant Response
  const filteredGifts = useMemo(() => {
    let list = [...sourceItems];

    // 1. Category Filter
    if (
      activeCategory &&
      activeCategory !== "All" &&
      activeCategory !== "all"
    ) {
      list = list.filter(
        (g) =>
          g.category?.toLowerCase() === activeCategory.toLowerCase() ||
          g.subcategory?.toLowerCase() === activeCategory.toLowerCase(),
      );
    }

    // 2. Search Filter (instant substring search)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.name?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          (Array.isArray(g.tags) &&
            g.tags.some((t) => t.toLowerCase().includes(q))),
      );
    }

    // 3. Quick Badges / Feature Filters
    if (filterType === "trending") list = list.filter((g) => g.isTrending);
    else if (filterType === "popular") list = list.filter((g) => g.isPopular);
    else if (filterType === "premium") list = list.filter((g) => g.isPremium);
    else if (filterType === "limited")
      list = list.filter((g) => g.isLimitedEdition);
    else if (filterType === "animated") list = list.filter((g) => g.isAnimated);

    // 4. Rarity Filter
    if (rarityFilter && rarityFilter !== "all") {
      list = list.filter(
        (g) =>
          (g.rarity || "common").toLowerCase() === rarityFilter.toLowerCase(),
      );
    }

    // 5. Price Bounds
    if (minPrice !== "" && !isNaN(Number(minPrice))) {
      list = list.filter((g) => (g.coinPrice || 0) >= Number(minPrice));
    }
    if (maxPrice !== "" && !isNaN(Number(maxPrice))) {
      list = list.filter((g) => (g.coinPrice || 0) <= Number(maxPrice));
    }

    // 6. Sorting
    if (sortOption === "price_asc" || sortOption === "cheapest") {
      list.sort((a, b) => a.coinPrice - b.coinPrice);
    } else if (sortOption === "price_desc" || sortOption === "expensive") {
      list.sort((a, b) => b.coinPrice - a.coinPrice);
    } else if (sortOption === "popular") {
      list.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    } else if (sortOption === "trending") {
      list.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
    } else if (sortOption === "newest") {
      list.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
    } else {
      list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    return list;
  }, [
    sourceItems,
    activeCategory,
    searchQuery,
    filterType,
    rarityFilter,
    minPrice,
    maxPrice,
    sortOption,
  ]);

  const clearAllFilters = () => {
    setActiveCategory("All");
    setSearchQuery("");
    setFilterType("all");
    setRarityFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSortOption("default");
  };

  const hasActiveFilters =
    (activeCategory && activeCategory !== "All") ||
    searchQuery.trim() !== "" ||
    filterType !== "all" ||
    rarityFilter !== "all" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    sortOption !== "default";

  if (!isOpen) return null;

  const currentBalance = wallet?.balance || 0;
  const targetGiftPrice = selectedGift?.coinPrice || 0;
  const hasEnoughCoins = currentBalance >= targetGiftPrice;

  const handleSend = async () => {
    if (!selectedGift || sending) return;

    if (!hasEnoughCoins) {
      return;
    }

    try {
      await sendGift({
        recipientId: isGroup ? null : recipientId,
        groupId: isGroup ? groupId : null,
        giftId: selectedGift.id || selectedGift._id || selectedGift.slug,
        personalMessage: note.trim(),
        chatType: isGroup ? "group" : "direct",
      });

      setNote("");
      setShowPreviewModal(false);
      onClose();
    } catch (_err) {
      // Error handled by store toast
    }
  };

  const handleAdminSavePrice = async () => {
    const newPrice = Number(adminPriceInput);
    if (isNaN(newPrice) || newPrice < 0 || !selectedGift) return;
    try {
      await updateGiftPrice(
        selectedGift.slug || selectedGift.id || selectedGift._id,
        newPrice,
      );
      setIsAdminEditingPrice(false);
    } catch (_err) {}
  };

  const selectedCategoryTheme = getCategoryTheme(selectedGift?.category);
  const selectedRarityTheme = getRarityTheme(selectedGift?.rarity);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
        {/* Dark Luxury Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0B1120]/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window Container (85-90% viewport width, luxury dark palette) */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          role="dialog"
          aria-modal="true"
          className="relative w-[92vw] max-w-6xl xl:max-w-7xl h-[92vh] max-h-[890px] rounded-3xl bg-[#0B1120] text-slate-100 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#111827]/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                <Gift className="size-5 sm:size-5.5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-1.5 text-white">
                  Virtual Gift Store
                  <Sparkles className="size-4 text-amber-400" />
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
                  <span>Make someone's day special.</span>
                  <span className="text-slate-600">•</span>
                  <div className="inline-flex items-center gap-1.5 text-slate-300">
                    <span>Sending to:</span>
                    {recipientAvatar ? (
                      <img
                        src={recipientAvatar}
                        alt={recipientName}
                        className="size-4 rounded-full object-cover inline-block border border-white/20"
                      />
                    ) : (
                      <div className="size-4 rounded-full bg-sky-500/20 border border-sky-500/40 text-[9px] flex items-center justify-center font-bold text-sky-400">
                        {recipientName?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="font-bold text-slate-100">
                      {recipientName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Balance Pill & Daily Bonus */}
            <div className="flex items-center gap-2">
              <div
                onClick={() => setActiveTab("wallet")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer text-xs font-black text-amber-400 shadow-sm"
                title="Click to view wallet & transactions"
              >
                <Coins className="size-4 text-amber-500 animate-spin-slow" />
                <span>{currentBalance.toLocaleString()} Coins</span>
              </div>

              {wallet?.canClaimDailyBonus && (
                <button
                  type="button"
                  onClick={claimDailyBonus}
                  className="hidden sm:inline-flex btn btn-xs rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black gap-1 border-0 shadow-md shadow-amber-500/20 hover:scale-105 transition-transform"
                  title="Claim free daily bonus coins"
                >
                  <Sparkles className="size-3" />
                  +100 Daily
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* 5 Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/10 bg-[#111827]/50 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
            {[
              {
                id: "store",
                label: `Store (${sourceItems.length})`,
                icon: Gift,
              },
              {
                id: "favorites",
                label: `Favorites ${favorites.length > 0 ? `(${favorites.length})` : ""}`,
                icon: Heart,
              },
              { id: "wallet", label: "My Wallet", icon: WalletIcon },
              { id: "sent", label: "Sent", icon: Send },
              { id: "received", label: "Received", icon: History },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-[#1E293B] text-sky-400 border border-sky-500/40 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <IconComp
                    className={`size-3.5 ${
                      tab.id === "favorites"
                        ? "fill-rose-500 text-rose-500"
                        : ""
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: STORE MARKETPLACE */}
          {activeTab === "store" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Search & Comprehensive Filter Controls */}
              <div className="px-4 py-2.5 border-b border-white/10 bg-[#111827]/30 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search 600+ gifts by name, category, mood..."
                      className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs bg-[#151F32] border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Feature Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
                    {[
                      { id: "all", label: "All" },
                      { id: "trending", label: "Trending", icon: Flame },
                      { id: "popular", label: "Popular", icon: Star },
                      { id: "premium", label: "Premium", icon: Crown },
                      { id: "limited", label: "Limited Edition", icon: Gem },
                      { id: "animated", label: "Animated", icon: Sparkles },
                    ].map((chip) => {
                      const IconComp = chip.icon;
                      const isSelected = filterType === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setFilterType(chip.id)}
                          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1 text-xs ${
                            isSelected
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-sm"
                              : "bg-[#151F32] hover:bg-[#1C2840] text-slate-400 border border-white/5 hover:text-slate-200"
                          }`}
                        >
                          {IconComp && <IconComp className="size-3" />}
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Second Row: Rarity, Price Range, Sort & Live Count */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Rarity Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        Rarity:
                      </span>
                      <select
                        value={rarityFilter}
                        onChange={(e) => setRarityFilter(e.target.value)}
                        className="py-1 px-2 rounded-lg bg-[#151F32] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="all">All Rarities</option>
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
                        <option value="mythic">Mythic</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        Coins:
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-14 py-1 px-1.5 rounded-lg bg-[#151F32] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-sky-500 text-center"
                      />
                      <span className="text-slate-600">-</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-14 py-1 px-1.5 rounded-lg bg-[#151F32] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-sky-500 text-center"
                      />
                    </div>

                    {/* Sort Dropdown */}
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="py-1 px-2 rounded-lg bg-[#151F32] border border-white/10 text-slate-200 text-xs font-semibold focus:outline-none focus:border-sky-500"
                    >
                      <option value="default">Default Order</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                      <option value="trending">Trending</option>
                      <option value="newest">Newest</option>
                    </select>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Reset all search & filter options"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Total Count Indicator */}
                  <div className="text-[11px] text-slate-400 font-medium">
                    Showing{" "}
                    <span className="font-bold text-slate-100">
                      {filteredGifts.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-slate-100">
                      {totalGifts || sourceItems.length}
                    </span>{" "}
                    gifts
                  </div>
                </div>
              </div>

              {/* 15 Categories Horizontal Slider */}
              <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto border-b border-white/10 no-scrollbar bg-[#0B1120] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCategory("All")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                    activeCategory === "All"
                      ? "bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/25"
                      : "bg-[#151F32] hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-white/5"
                  }`}
                >
                  🌟 All Gifts ({sourceItems.length})
                </button>

                {sourceCategories.map((cat) => {
                  const isSelected = activeCategory === cat.name;
                  const catTheme = getCategoryTheme(cat.name);
                  const count = categoryCounts[cat.name] || cat.count || 0;

                  return (
                    <button
                      key={cat.id || cat.name}
                      type="button"
                      onClick={() => setActiveCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/25"
                          : "bg-[#151F32] hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-white/5"
                      }`}
                    >
                      <span>{cat.icon || catTheme.icon || "🎁"}</span>
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-slate-950/40 text-slate-950 font-black"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Gifts Grid Container (5 cols desktop, 4 cols tablet, 2 cols mobile) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[240px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-52 gap-3">
                    <span className="loading loading-spinner loading-md text-sky-400" />
                    <span className="text-xs text-slate-400 font-medium">
                      Loading gift catalog...
                    </span>
                  </div>
                ) : filteredGifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-center p-6 text-slate-400">
                    <Gift className="size-10 mb-2 opacity-40 text-sky-400" />
                    <p className="text-sm font-semibold text-slate-200">
                      No gifts match your filters
                    </p>
                    <p className="text-xs mt-1">
                      Try resetting filters to view all 600 unique gifts.
                    </p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="btn btn-primary btn-xs rounded-xl mt-3 font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
                    {filteredGifts.map((gift) => {
                      const isSelected =
                        (selectedGift?.id ||
                          selectedGift?._id ||
                          selectedGift?.slug) ===
                        (gift.id || gift._id || gift.slug);
                      const isFavorited =
                        favoriteIds.has(String(gift.id || gift._id)) ||
                        favoriteIds.has(gift.slug) ||
                        gift.isFavorited;
                      const rarityTheme = getRarityTheme(gift.rarity);
                      const categoryTheme = getCategoryTheme(gift.category);

                      return (
                        <motion.button
                          key={gift.id || gift.slug}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedGift(gift)}
                          className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 text-center ${
                            isSelected
                              ? "ring-2 ring-sky-400 border-sky-400 bg-sky-500/10 shadow-[0_0_25px_rgba(56,189,248,0.25)] scale-[1.02]"
                              : "border-white/10 hover:border-sky-500/40 bg-[#151F32]/80 hover:bg-[#1A263D]"
                          }`}
                        >
                          {/* Card Top: Rarity Badge, Animated Badge & Favorite Heart */}
                          <div className="w-full flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${rarityTheme.badgeBorder} ${rarityTheme.badgeText} ${rarityTheme.badgeBg}`}
                              >
                                {gift.rarity || "COMMON"}
                              </span>
                              {gift.isAnimated && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-0.5">
                                  <Sparkles className="size-2.5" />
                                </span>
                              )}
                            </div>

                            {/* Heart Favorite Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(gift);
                              }}
                              className="p-1 rounded-full hover:bg-white/10 transition-colors"
                              title={
                                isFavorited
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                            >
                              <Heart
                                className={`size-3.5 transition-transform group-hover:scale-110 ${
                                  isFavorited
                                    ? "fill-rose-500 text-rose-500"
                                    : "text-slate-500 hover:text-rose-400"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Dedicated Artwork Container */}
                          <div className="h-28 sm:h-32 w-full flex items-center justify-center p-2 rounded-xl bg-gradient-to-b from-white/5 to-transparent relative my-1">
                            <GiftArtwork
                              gift={gift}
                              className="w-full h-full"
                              imgClassName="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] group-hover:scale-110 transition-transform duration-300"
                              fallbackSize="text-5xl"
                            />
                          </div>

                          {/* Gift Name */}
                          <span className="mt-1 text-xs sm:text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors truncate w-full text-center">
                            {gift.name}
                          </span>

                          {/* Coin Price Badge */}
                          <div className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-black text-amber-400 shadow-sm mx-auto">
                            <Coins className="size-3 text-amber-500" />
                            <span>{gift.coinPrice}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Load More Button for Server-side Pagination */}
                {hasMore && !loading && (
                  <div className="flex justify-center pt-5 pb-3">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => loadMoreCatalog()}
                      className="btn btn-outline btn-sm rounded-2xl gap-2 font-bold px-6 border-white/20 text-slate-200 hover:bg-white/10"
                    >
                      {loadingMore ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Loading more gifts...
                        </>
                      ) : (
                        <>
                          <Gift className="size-4 text-sky-400" />
                          Load More Gifts
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Gift Summary & Note Composer Panel (Sticky Bottom) */}
              {selectedGift && (
                <div className="p-3 sm:p-4 border-t border-white/10 bg-[#111827] space-y-2.5 shrink-0">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Left: Thumbnail & Gift Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#151F32] border border-white/10 flex items-center justify-center p-1.5 shadow-md shrink-0 overflow-hidden">
                        <GiftArtwork
                          gift={selectedGift}
                          className="w-full h-full"
                          imgClassName={`w-full h-full object-contain ${
                            isPreviewAnimating ? "animate-bounce" : ""
                          }`}
                          fallbackSize="text-3xl"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-white truncate">
                            {selectedGift.name}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${selectedCategoryTheme.border} ${selectedCategoryTheme.text} bg-white/5`}
                          >
                            {selectedGift.category}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${selectedRarityTheme.badgeBorder} ${selectedRarityTheme.badgeText} ${selectedRarityTheme.badgeBg}`}
                          >
                            {selectedGift.rarity || "COMMON"}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Coins className="size-3 text-amber-500" />
                            {targetGiftPrice} Coins
                          </span>

                          {/* Preview Animation Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              setIsPreviewAnimating(!isPreviewAnimating)
                            }
                            className={`btn btn-xs rounded-lg gap-1 font-semibold text-[10px] ${
                              isPreviewAnimating
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                            }`}
                            title="Toggle animation preview"
                          >
                            {isPreviewAnimating ? (
                              <EyeOff className="size-3" />
                            ) : (
                              <Eye className="size-3" />
                            )}
                            {isPreviewAnimating
                              ? "Stop Preview"
                              : "Preview Animation"}
                          </button>

                          {/* Full Detail Modal Toggle */}
                          <button
                            type="button"
                            onClick={() => setShowPreviewModal(true)}
                            className="btn btn-xs rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold text-[10px] hover:bg-sky-500/20"
                          >
                            Enlarge
                          </button>

                          {/* Admin Price Edit */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setIsAdminEditingPrice(!isAdminEditingPrice)
                              }
                              className="btn btn-ghost btn-xs text-amber-400 gap-1 font-semibold text-[10px]"
                              title="Admin: modify gift coin price live"
                            >
                              <Edit3 className="size-3" />
                              Admin Edit
                            </button>
                          )}
                        </div>

                        {/* Admin inline price editor */}
                        {isAdmin && isAdminEditingPrice && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-bold text-amber-400">
                              New Price:
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={adminPriceInput}
                              onChange={(e) =>
                                setAdminPriceInput(e.target.value)
                              }
                              className="w-20 px-2 py-0.5 rounded bg-[#151F32] border border-white/20 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={handleAdminSavePrice}
                              className="btn btn-xs btn-primary rounded font-bold"
                            >
                              Save
                            </button>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {selectedGift.description ||
                            "A wonderful token of celebration."}
                        </p>
                      </div>
                    </div>

                    {/* Right: Balance After & Send Action */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] text-slate-400 font-medium">
                          Balance after:
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            hasEnoughCoins
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {hasEnoughCoins
                            ? `${(currentBalance - targetGiftPrice).toLocaleString()} Coins`
                            : "Insufficient Coins"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="btn btn-ghost btn-xs sm:btn-sm rounded-xl text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          disabled={sending || !hasEnoughCoins}
                          onClick={handleSend}
                          className={`btn btn-primary btn-xs sm:btn-sm rounded-xl px-5 text-xs font-bold gap-1.5 shadow-lg shadow-sky-500/25 ${
                            !hasEnoughCoins ? "btn-disabled opacity-50" : ""
                          }`}
                        >
                          {sending ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <>
                              <Send className="size-3.5" />
                              Send Gift ({targetGiftPrice} 🪙)
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Center: Optional Personal Greeting Input */}
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={160}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={`Add a warm personal greeting or note to ${recipientName} (optional)...`}
                      className="w-full px-3.5 py-1.5 sm:py-2 rounded-xl text-xs bg-[#151F32] border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                      {note.length}/160
                    </span>
                  </div>

                  {!hasEnoughCoins && (
                    <div className="text-xs text-rose-400 font-medium flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>
                          You need {targetGiftPrice - currentBalance} more coins
                          to send this gift.
                        </span>
                      </div>
                      {wallet?.canClaimDailyBonus && (
                        <button
                          type="button"
                          onClick={claimDailyBonus}
                          className="btn btn-xs rounded-lg bg-amber-500 text-slate-950 font-bold ml-2"
                        >
                          Claim +100 Bonus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Heart className="size-4 fill-rose-500 text-rose-500" />
                  Your Favorited Gifts ({favorites.length})
                </h4>
                <span className="text-xs text-slate-400">
                  Tap any gift to select and send
                </span>
              </div>

              {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-400 border border-white/10 rounded-3xl bg-[#111827]/40 gap-2">
                  <Heart className="size-12 text-rose-500/40" />
                  <p className="text-sm font-bold text-white">
                    No favorites yet
                  </p>
                  <p>
                    Tap the heart icon on any gift in the store to save it here
                    for fast gifting!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("store")}
                    className="btn btn-primary btn-xs rounded-xl mt-3 font-bold"
                  >
                    Browse Gifts Store
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {favorites.map((gift) => {
                    const isSelected =
                      (selectedGift?.id ||
                        selectedGift?._id ||
                        selectedGift?.slug) ===
                      (gift.id || gift._id || gift.slug);
                    return (
                      <div
                        key={gift.id || gift.slug}
                        onClick={() => setSelectedGift(gift)}
                        className={`group relative flex flex-col justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "ring-2 ring-sky-400 border-sky-400 bg-sky-500/10 shadow-lg"
                            : "border-white/10 hover:border-sky-500/40 bg-[#151F32]/80 hover:bg-[#1A263D]"
                        }`}
                      >
                        <div className="w-full flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(gift);
                            }}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors"
                            title="Remove from favorites"
                          >
                            <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                          </button>
                        </div>

                        <div className="h-28 sm:h-32 w-full flex items-center justify-center my-1">
                          <GiftArtwork
                            gift={gift}
                            className="w-full h-full"
                            imgClassName="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform"
                          />
                        </div>

                        <span className="text-xs font-bold text-slate-100 truncate w-full text-center">
                          {gift.name}
                        </span>

                        <div className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-black text-amber-400 mx-auto">
                          <Coins className="size-3 text-amber-500" />
                          <span>{gift.coinPrice}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY WALLET & TRANSACTIONS */}
          {activeTab === "wallet" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Balance Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Coins className="size-4" />
                    Available Coin Balance
                  </div>
                  <div className="text-3xl sm:text-4xl font-black mt-1 text-white">
                    {currentBalance.toLocaleString()}{" "}
                    <span className="text-lg font-bold text-amber-400/80">
                      Coins
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Total Spent: {wallet?.totalSpent || 0} 🪙</span>
                    <span>•</span>
                    <span>Total Received: {wallet?.totalReceived || 0} 🪙</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={claimDailyBonus}
                    disabled={!wallet?.canClaimDailyBonus}
                    className={`btn btn-warning btn-sm rounded-2xl font-bold shadow-md gap-1.5 ${
                      !wallet?.canClaimDailyBonus
                        ? "btn-disabled opacity-60"
                        : ""
                    }`}
                  >
                    <Sparkles className="size-4" />
                    {wallet?.canClaimDailyBonus
                      ? "Claim +100 Free Daily Coins"
                      : "Daily Bonus Claimed"}
                  </button>
                  {!wallet?.canClaimDailyBonus &&
                    wallet?.nextClaimAvailableAt && (
                      <span className="text-[10px] text-slate-500 text-center">
                        Next claim available in 24h
                      </span>
                    )}
                </div>
              </div>

              {/* Transactions History Header */}
              <div className="pt-2">
                <h4 className="text-sm font-bold text-white mb-2.5 flex items-center gap-1.5">
                  <History className="size-4 text-sky-400" />
                  Recent Coin Transactions
                </h4>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-white/10 rounded-2xl bg-[#111827]/40">
                    No transactions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((t) => (
                      <div
                        key={t.id || t._id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-[#151F32]/80 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{t.giftIcon || "🪙"}</span>
                          <div>
                            <div className="font-bold text-white capitalize">
                              {t.giftName || t.type?.replace("_", " ")}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(t.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black text-sm ${
                              t.type === "gift_sent"
                                ? "text-rose-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {t.type === "gift_sent"
                              ? `-${t.amount}`
                              : `+${t.amount}`}{" "}
                            🪙
                          </span>
                          <div className="text-[10px] text-slate-500">
                            Bal: {t.balanceAfter}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SENT GIFTS HISTORY */}
          {activeTab === "sent" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h4 className="text-sm font-bold text-white mb-3.5 flex items-center gap-1.5">
                <Send className="size-4 text-sky-400" />
                Gifts You Have Sent
              </h4>
              {sentHistory.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400 border border-white/10 rounded-2xl bg-[#111827]/40">
                  You haven't sent any gifts yet. Browse the store to send your
                  first gift!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sentHistory.map((item) => (
                    <div
                      key={item.id || item._id}
                      className="p-3.5 rounded-2xl border border-white/10 bg-[#151F32]/80 flex items-center gap-3 text-xs"
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-center p-1 shrink-0">
                        <GiftArtwork
                          gift={item.gift}
                          className="w-full h-full"
                          imgClassName="w-full h-full object-contain"
                          fallbackSize="text-2xl"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">
                          {item.gift?.name || "Gift"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Sent to:{" "}
                          <span className="font-semibold text-slate-200">
                            {item.recipient?.fullName || "Friend"}
                          </span>
                        </div>
                        {item.personalMessage && (
                          <div className="text-[10px] italic text-slate-400 truncate mt-0.5">
                            "{item.personalMessage}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RECEIVED GIFTS HISTORY */}
          {activeTab === "received" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h4 className="text-sm font-bold text-white mb-3.5 flex items-center gap-1.5">
                <Gift className="size-4 text-sky-400" />
                Gifts You Have Received
              </h4>
              {receivedHistory.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400 border border-white/10 rounded-2xl bg-[#111827]/40">
                  No gifts received yet. Your friends can surprise you with
                  gifts from the store!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {receivedHistory.map((item) => (
                    <div
                      key={item.id || item._id}
                      className="p-3.5 rounded-2xl border border-white/10 bg-[#151F32]/80 flex items-center gap-3 text-xs"
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-center p-1 shrink-0">
                        <GiftArtwork
                          gift={item.gift}
                          className="w-full h-full"
                          imgClassName="w-full h-full object-contain"
                          fallbackSize="text-2xl"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">
                          {item.gift?.name || "Gift"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          From:{" "}
                          <span className="font-semibold text-slate-200">
                            {item.sender?.fullName || "A Friend"}
                          </span>
                        </div>
                        {item.personalMessage && (
                          <div className="text-[10px] italic text-slate-400 truncate mt-0.5">
                            "{item.personalMessage}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Dedicated Gift Preview Modal Drawer */}
        {showPreviewModal && selectedGift && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowPreviewModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-[#111827] border border-white/15 p-6 shadow-2xl text-center flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="size-4" />
              </button>

              <div className="w-44 h-44 rounded-3xl bg-[#151F32] border border-white/10 p-4 flex items-center justify-center relative overflow-hidden my-2">
                <GiftArtwork
                  gift={selectedGift}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-contain animate-bounce"
                  fallbackSize="text-7xl"
                />
              </div>

              <h3 className="text-xl font-black text-white mt-2">
                {selectedGift.name}
              </h3>

              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${selectedCategoryTheme.border} ${selectedCategoryTheme.text} bg-white/5`}
                >
                  {selectedGift.category}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${selectedRarityTheme.badgeBorder} ${selectedRarityTheme.badgeText} ${selectedRarityTheme.badgeBg}`}
                >
                  {selectedGift.rarity || "COMMON"}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-2 px-2">
                {selectedGift.description ||
                  "A wonderful token of celebration."}
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-black text-sm">
                <Coins className="size-4" />
                <span>{selectedGift.coinPrice} Coins</span>
              </div>

              <div className="mt-5 w-full flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="btn btn-sm btn-ghost flex-1 rounded-xl text-slate-400"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!hasEnoughCoins || sending}
                  onClick={handleSend}
                  className="btn btn-sm btn-primary flex-1 rounded-xl font-bold gap-1 shadow-md"
                >
                  <Send className="size-3.5" />
                  Send Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default GiftMarketplaceModal;
