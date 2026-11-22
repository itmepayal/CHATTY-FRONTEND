import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Sparkles,
  TrendingUp,
  Coins,
  Check,
  Download,
  Plus,
  X,
  Search,
  Filter,
  Package,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Flame,
  Smile,
  Heart,
  Cat,
  Gamepad2,
  PartyPopper,
  SmilePlus,
  Briefcase,
  Tent,
  Hand,
  MessageCircle,
  Palette,
  Send,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Share2,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCheck,
} from "lucide-react";
import { useStickerStore } from "../../store/useStickerStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import StickerCreatorModal from "./StickerCreatorModal.jsx";
import StickerImage from "./StickerImage.jsx";

// Map category icons to lucide components
const CATEGORY_ICON_MAP = {
  Flame,
  Smile,
  Heart,
  Cat,
  Gamepad2,
  PartyPopper,
  SmilePlus,
  Briefcase,
  Sparkles,
  Tent,
  Hand,
  MessageCircle,
  Palette,
  Package,
};

export default function StickerMarketplaceModal({
  isOpen,
  onClose,
  onSelectSticker,
}) {
  const { authUser } = useAuthStore();
  const isAdmin = authUser?.role === "admin";

  const {
    packs,
    categories,
    activeCategory,
    activeFilter,
    activeMarketplaceTab,
    searchQuery,
    recentSearches,
    searchResults,
    searchLoading,
    discoverFeed,
    discoverLoading,
    loading,
    installedPacks,
    favoriteStickers,
    favoriteStickerIds,
    recentStickers,
    pendingPacks,
    fetchMarketplace,
    fetchCategories,
    fetchDiscover,
    fetchLibrary,
    fetchFavorites,
    fetchRecent,
    clearRecent,
    movePackOrder,
    fetchPackDetails,
    fetchPendingPacks,
    moderatePack,
    installPack,
    uninstallPack,
    purchasePack,
    toggleFavorite,
    setActiveCategory,
    setActiveFilter,
    setActiveMarketplaceTab,
    setSearchQuery,
    searchStickersGlobal,
    addRecentSearch,
    clearRecentSearches,
    fetchAssetIntegrityReport,
  } = useStickerStore();

  const [selectedPackPreview, setSelectedPackPreview] = useState(null);
  const [selectedStickerPreview, setSelectedStickerPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showAdminModeration, setShowAdminModeration] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRejectPackId, setSelectedRejectPackId] = useState(null);
  const [myPacksSearch, setMyPacksSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDebounceRef = useRef(null);

  // Initial data loading
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchDiscover();
      fetchMarketplace();
      fetchLibrary();
      fetchFavorites();
      fetchRecent();
      if (isAdmin) {
        fetchPendingPacks();
      }
    }
  }, [
    isOpen,
    isAdmin,
    fetchCategories,
    fetchDiscover,
    fetchMarketplace,
    fetchLibrary,
    fetchFavorites,
    fetchRecent,
    fetchPendingPacks,
  ]);

  // Debounced search effect
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) return;

    searchDebounceRef.current = setTimeout(() => {
      searchStickersGlobal(val);
    }, 280);
  };

  const handleExecuteSearch = (term) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setIsSearchFocused(false);
    searchStickersGlobal(term);
    fetchMarketplace({ search: term, page: 1 });
  };

  // Keyboard navigation & Escape handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedStickerPreview) {
          setSelectedStickerPreview(null);
        } else if (selectedPackPreview) {
          setSelectedPackPreview(null);
        } else if (showDiagnosticsModal) {
          setShowDiagnosticsModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedStickerPreview, selectedPackPreview, showDiagnosticsModal, onClose]);

  if (!isOpen) return null;

  const installedPackIds = new Set(
    installedPacks.map((p) => String(p._id || p.id)),
  );

  const handleOpenPackPreview = async (pack) => {
    setSelectedPackPreview(pack);
    setPreviewLoading(true);
    const packId = pack._id || pack.id;
    const fullDetails = await fetchPackDetails(packId);
    if (fullDetails) {
      setSelectedPackPreview(fullDetails);
    }
    setPreviewLoading(false);
  };

  const handleApprovePack = async (packId) => {
    await moderatePack(packId, "published");
  };

  const handleRejectPack = async (packId) => {
    if (!rejectionReason.trim()) {
      alert("Please enter a reason for rejecting this pack");
      return;
    }
    await moderatePack(packId, "rejected", rejectionReason.trim());
    setSelectedRejectPackId(null);
    setRejectionReason("");
  };

  const handleCopyPackLink = (pack) => {
    const url = `${window.location.origin}/stickers/pack/${pack.slug || pack._id || pack.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered installed packs for My Stickers tab
  const filteredInstalledPacks = installedPacks.filter((p) => {
    if (!myPacksSearch.trim()) return true;
    const q = myPacksSearch.trim().toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-5xl h-[90vh] overflow-hidden rounded-3xl bg-base-100 border border-base-300 shadow-2xl flex flex-col text-base-content select-none"
        >
          {/* ========================================================================= */}
          {/* 1. HEADER SECTION                                                         */}
          {/* ========================================================================= */}
          <div className="p-3.5 sm:p-4 border-b border-base-300 flex items-center justify-between gap-3 bg-base-200/50 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-base-content truncate">
                    Sticker Marketplace
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 hidden md:inline-block">
                    Official & Community
                  </span>
                </div>
                <p className="text-xs text-base-content/60 truncate">
                  Discover expressive stickers, install packs to your chat, or build your own
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isAdmin && (
                <>
                  <button
                    onClick={async () => {
                      setShowDiagnosticsModal(true);
                      setDiagnosticLoading(true);
                      const rep = await fetchAssetIntegrityReport();
                      setDiagnosticReport(rep);
                      setDiagnosticLoading(false);
                    }}
                    className="btn btn-sm btn-outline border-emerald-500/40 text-emerald-500 hover:btn-success rounded-xl font-bold flex items-center gap-1.5"
                    title="Asset Integrity Diagnostics"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Diagnostics</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminModeration(!showAdminModeration);
                      if (!showAdminModeration) fetchPendingPacks();
                    }}
                    className={`btn btn-sm rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                      showAdminModeration
                        ? "btn-warning shadow-md"
                        : "btn-outline border-warning/40 text-warning hover:btn-warning"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      Moderation {pendingPacks?.length > 0 ? `(${pendingPacks.length})` : ""}
                    </span>
                  </button>
                </>
              )}

              <button
                onClick={() => setShowCreatorModal(true)}
                className="btn btn-primary btn-sm rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Creator Studio</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-base-300/60 text-base-content/60 hover:text-base-content transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. NAVIGATION PILL TABS                                                    */}
          {/* ========================================================================= */}
          <div className="px-3 sm:px-4 py-2 border-b border-base-300/80 bg-base-100 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: "discover", label: "Discover", icon: Sparkles },
                { id: "trending", label: "Trending", icon: TrendingUp },
                { id: "categories", label: "Categories", icon: Layers },
                {
                  id: "my_stickers",
                  label: "My Stickers",
                  icon: Package,
                  badge: installedPacks.length || null,
                },
                {
                  id: "favorites",
                  label: "Favorites",
                  icon: Heart,
                  badge: favoriteStickers.length || null,
                },
                { id: "recent", label: "Recent", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeMarketplaceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveMarketplaceTab(tab.id);
                      if (tab.id === "discover") fetchDiscover();
                      if (tab.id === "trending") {
                        setActiveFilter("trending");
                        fetchMarketplace({ filter: "trending", page: 1 });
                      }
                      if (tab.id === "favorites") fetchFavorites();
                      if (tab.id === "recent") fetchRecent();
                      if (tab.id === "my_stickers") fetchLibrary();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-base-content/65 hover:text-base-content hover:bg-base-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isSelected
                            ? "bg-primary-content/25 text-primary-content"
                            : "bg-base-300 text-base-content/75"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick stats pill */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-base-content/50 pr-1">
              <span>{packs.length} Marketplace Packs</span>
              <span>•</span>
              <span className="text-primary font-semibold">82 HD Stickers</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. SEARCH & FILTER SUITE (For Discover, Trending & General Search)        */}
          {/* ========================================================================= */}
          {["discover", "trending"].includes(activeMarketplaceTab) && (
            <div className="p-3 sm:p-3.5 border-b border-base-300/80 bg-base-200/30 flex flex-col gap-2 shrink-0">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      handleExecuteSearch(searchQuery);
                    }
                  }}
                  placeholder="Search stickers, meme packs, creators, tags (e.g. Pepe, Kitty, GG, Anime, Birthday)..."
                  className="w-full pl-9 pr-9 py-2 text-xs bg-base-100 rounded-2xl border border-base-300 focus:outline-none focus:border-primary text-base-content shadow-xs transition-all placeholder:text-base-content/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      searchStickersGlobal("");
                      fetchMarketplace({ search: "", page: 1 });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Instant Search Suggestions / Results Dropdown */}
                {isSearchFocused && searchQuery.trim() && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute top-full left-0 right-0 mt-1.5 p-3 rounded-2xl bg-base-100 border border-base-300 shadow-xl z-30 max-h-80 overflow-y-auto space-y-3 animate-in fade-in zoom-in-95"
                  >
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-4 text-xs text-base-content/60 gap-2">
                        <span className="loading loading-spinner loading-xs text-primary" />
                        <span>Searching sticker ecosystem...</span>
                      </div>
                    ) : (
                      <>
                        {/* Matching Packs */}
                        {searchResults.packs?.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-base-content/50 block mb-1.5">
                              Matching Sticker Packs ({searchResults.packs.length})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {searchResults.packs.map((p) => (
                                <div
                                  key={p.id || p._id}
                                  onClick={() => {
                                    handleOpenPackPreview(p);
                                    setIsSearchFocused(false);
                                  }}
                                  className="p-2 rounded-xl bg-base-200/50 hover:bg-base-200 flex items-center gap-2.5 cursor-pointer border border-base-300/40 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-base-100 p-0.5 overflow-hidden shrink-0 border border-base-300/60">
                                    <StickerImage
                                      src={p.coverUrl}
                                      alt={p.name}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-base-content truncate">
                                      {p.name}
                                    </p>
                                    <p className="text-[10px] text-base-content/50 truncate">
                                      {p.stickersCount || 0} stickers • {p.category}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matching Individual Stickers */}
                        {searchResults.stickers?.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-base-content/50 block mb-1.5">
                              Matching Stickers ({searchResults.stickers.length})
                            </span>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {searchResults.stickers.slice(0, 12).map((stk) => (
                                <div
                                  key={stk.id || stk._id}
                                  onClick={() => {
                                    setSelectedStickerPreview(stk);
                                    setIsSearchFocused(false);
                                  }}
                                  className="aspect-square rounded-xl bg-base-200/60 hover:bg-base-200 p-1.5 flex flex-col items-center justify-center border border-base-300/60 hover:border-primary/50 cursor-pointer transition-all hover:scale-105"
                                  title={stk.name}
                                >
                                  <StickerImage
                                    src={stk.thumbnailUrl || stk.url}
                                    alt={stk.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.packs?.length === 0 &&
                          searchResults.stickers?.length === 0 && (
                            <p className="text-center py-3 text-xs text-base-content/50">
                              No matching packs or stickers found for "{searchQuery}".
                            </p>
                          )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Recent searches row */}
              {recentSearches.length > 0 && !searchQuery && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-[11px]">
                  <span className="text-base-content/40 font-semibold shrink-0">Recent:</span>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleExecuteSearch(term)}
                      className="px-2.5 py-0.5 rounded-lg bg-base-100 hover:bg-base-200 border border-base-300 text-base-content/70 hover:text-base-content shrink-0 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                  <button
                    onClick={clearRecentSearches}
                    className="text-[10px] text-base-content/40 hover:text-error ml-1 shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. MAIN CONTENT AREA (Based on Active Tab)                                 */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin">
            {/* --------------------------------------------------------------------- */}
            {/* TAB 1: DISCOVER SECTION                                               */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "discover" && (
              <div className="space-y-6">
                {discoverLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-sm text-base-content/50">
                    <span className="loading loading-spinner loading-md text-primary" />
                    <span>Curating your sticker discover feed...</span>
                  </div>
                ) : (
                  <>
                    {/* Featured Hero Banner */}
                    {discoverFeed.featured?.length > 0 && (
                      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/15 via-base-200/80 to-base-100 border border-primary/30 p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-5">
                        <div className="max-w-xl">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-primary-content shadow-xs">
                            Featured Spotlight
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-base-content mt-2 leading-tight">
                            {discoverFeed.featured[0].name}
                          </h3>
                          <p className="text-xs text-base-content/75 mt-1.5 leading-relaxed">
                            {discoverFeed.featured[0].description}
                          </p>

                          {/* Quick stickers peek */}
                          <div className="flex items-center gap-2 mt-4">
                            {(discoverFeed.featured[0].previewStickers || []).slice(0, 5).map((stk, i) => (
                              <div
                                key={stk.id || stk._id || i}
                                className="w-10 h-10 rounded-xl bg-base-100 p-1 flex items-center justify-center border border-base-300 shadow-xs"
                              >
                                <StickerImage
                                  src={stk.thumbnailUrl || stk.url}
                                  alt={stk.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={() => handleOpenPackPreview(discoverFeed.featured[0])}
                              className="btn btn-primary btn-sm rounded-xl font-bold shadow-sm"
                            >
                              Explore Pack
                            </button>
                            {installedPackIds.has(String(discoverFeed.featured[0]._id || discoverFeed.featured[0].id)) ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Added to Library
                              </span>
                            ) : (
                              <button
                                onClick={() => installPack(discoverFeed.featured[0]._id || discoverFeed.featured[0].id)}
                                className="btn btn-outline btn-sm rounded-xl font-bold"
                              >
                                <Download className="w-4 h-4" /> Add Pack Free
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-base-100/80 p-3 border border-base-300 shadow-sm flex items-center justify-center shrink-0">
                          <StickerImage
                            src={discoverFeed.featured[0].coverUrl}
                            alt={discoverFeed.featured[0].name}
                            className="w-full h-full object-contain filter drop-shadow-md"
                          />
                        </div>
                      </div>
                    )}

                    {/* Trending Collections Row */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-bold text-base-content">
                            Trending This Week
                          </h4>
                        </div>
                        <button
                          onClick={() => {
                            setActiveMarketplaceTab("trending");
                            setActiveFilter("trending");
                            fetchMarketplace({ filter: "trending", page: 1 });
                          }}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>View All</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {(discoverFeed.trending || []).slice(0, 3).map((pack, idx) => (
                          <PackCard
                            key={pack._id || pack.id}
                            pack={pack}
                            rank={idx + 1}
                            isInstalled={installedPackIds.has(String(pack._id || pack.id))}
                            onOpen={() => handleOpenPackPreview(pack)}
                            onInstall={() => installPack(pack._id || pack.id)}
                            onUninstall={() => uninstallPack(pack._id || pack.id)}
                            onPurchase={() => purchasePack(pack._id || pack.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Popular Packs Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm font-bold text-base-content">
                            All-Time Community Favorites
                          </h4>
                        </div>
                        <span className="text-xs text-base-content/50">
                          Most downloaded by Chatty users
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {(discoverFeed.popular || []).slice(0, 3).map((pack) => (
                          <PackCard
                            key={pack._id || pack.id}
                            pack={pack}
                            isInstalled={installedPackIds.has(String(pack._id || pack.id))}
                            onOpen={() => handleOpenPackPreview(pack)}
                            onInstall={() => installPack(pack._id || pack.id)}
                            onUninstall={() => uninstallPack(pack._id || pack.id)}
                            onPurchase={() => purchasePack(pack._id || pack.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Categories Quick Explorer */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-bold text-base-content">
                            Browse by Category
                          </h4>
                        </div>
                        <button
                          onClick={() => setActiveMarketplaceTab("categories")}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>Explore All ({categories.length})</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {categories.slice(0, 8).map((cat) => {
                          const IconComp = CATEGORY_ICON_MAP[cat.icon] || Package;
                          return (
                            <button
                              key={cat.slug || cat._id}
                              onClick={() => {
                                setActiveCategory(cat.slug);
                                setActiveMarketplaceTab("trending");
                                fetchMarketplace({ category: cat.slug, page: 1 });
                              }}
                              className="p-3 rounded-2xl bg-base-200/50 hover:bg-base-200 border border-base-300 text-left transition-all hover:scale-[1.02] flex items-center gap-3 group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-content text-primary flex items-center justify-center shrink-0 transition-colors">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-base-content truncate">
                                  {cat.name}
                                </p>
                                <p className="text-[10px] text-base-content/50">
                                  {cat.packsCount || cat.packCount || 1} packs
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TAB 2: TRENDING & ALL MARKETPLACE PACKS                               */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "trending" && (
              <div className="space-y-4">
                {/* Filter Pills Header */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-base-300/60">
                  <div className="flex items-center gap-1">
                    {["all", "trending", "popular", "free", "premium"].map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setActiveFilter(f);
                          fetchMarketplace({ filter: f, page: 1 });
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                          activeFilter === f
                            ? "bg-primary text-primary-content shadow-xs"
                            : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {activeCategory !== "all" && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                      <span>Category: {activeCategory}</span>
                      <button
                        onClick={() => {
                          setActiveCategory("all");
                          fetchMarketplace({ category: "all", page: 1 });
                        }}
                        className="hover:text-error"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-sm text-base-content/50">
                    <span className="loading loading-spinner loading-md text-primary" />
                    <span>Loading sticker packs...</span>
                  </div>
                ) : packs.length === 0 ? (
                  <div className="py-16 text-center text-base-content/50">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-base-content">No packs found</p>
                    <p className="text-xs mt-1">Try resetting your filter or search criteria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packs.map((pack) => (
                      <PackCard
                        key={pack._id || pack.id}
                        pack={pack}
                        isInstalled={installedPackIds.has(String(pack._id || pack.id))}
                        onOpen={() => handleOpenPackPreview(pack)}
                        onInstall={() => installPack(pack._id || pack.id)}
                        onUninstall={() => uninstallPack(pack._id || pack.id)}
                        onPurchase={() => purchasePack(pack._id || pack.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TAB 3: CATEGORIES DIRECTORY                                           */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "categories" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-base-content">
                      Sticker Pack Categories
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Explore official and verified collections arranged by topic and expression
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => {
                    const IconComp = CATEGORY_ICON_MAP[cat.icon] || Package;
                    const previews = cat.previews || [];

                    return (
                      <div
                        key={cat.slug || cat._id}
                        onClick={() => {
                          setActiveCategory(cat.slug);
                          setActiveMarketplaceTab("trending");
                          fetchMarketplace({ category: cat.slug, page: 1 });
                        }}
                        className="p-4 rounded-3xl bg-base-200/50 hover:bg-base-200/90 border border-base-300 shadow-xs hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content flex items-center justify-center transition-colors">
                              <IconComp className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-base-100 border border-base-300 text-base-content/70">
                              {cat.packsCount || cat.packCount || 1} packs
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-base-content group-hover:text-primary transition-colors">
                            {cat.name}
                          </h4>
                          <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                            {cat.description || "Expressive stickers curated for this category."}
                          </p>

                          {/* Previews grid */}
                          {previews.length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5 my-3 p-1.5 rounded-xl bg-base-100 border border-base-300/40">
                              {previews.slice(0, 4).map((url, i) => (
                                <div
                                  key={i}
                                  className="aspect-square rounded-lg bg-base-200/50 p-1 flex items-center justify-center"
                                >
                                  <StickerImage
                                    src={url}
                                    alt={cat.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-base-300/60 flex items-center justify-between text-xs font-semibold text-primary">
                          <span>Browse Collection</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TAB 4: MY STICKERS (PERSONAL INSTALLED LIBRARY)                       */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "my_stickers" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-base-200/50 border border-base-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      My Installed Sticker Packs ({installedPacks.length})
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Reorder sticker packs to adjust their priority in your chat composer.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input
                      type="text"
                      value={myPacksSearch}
                      onChange={(e) => setMyPacksSearch(e.target.value)}
                      placeholder="Search my installed packs..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-base-100 rounded-xl border border-base-300 text-base-content focus:outline-none focus:border-primary"
                    />
                    {myPacksSearch && (
                      <button
                        onClick={() => setMyPacksSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredInstalledPacks.length === 0 ? (
                  <div className="py-16 text-center text-base-content/50">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-primary" />
                    <p className="text-sm font-bold text-base-content">No packs found in your library</p>
                    <p className="text-xs mt-1">
                      Explore the Discover or Trending tab to add high-quality sticker packs.
                    </p>
                    <button
                      onClick={() => setActiveMarketplaceTab("discover")}
                      className="btn btn-primary btn-sm rounded-xl mt-4 font-bold"
                    >
                      Browse Discover
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredInstalledPacks.map((pack, idx) => {
                      const packId = String(pack._id || pack.id);
                      const isFirst = idx === 0;
                      const isLast = idx === filteredInstalledPacks.length - 1;

                      return (
                        <div
                          key={packId}
                          className="p-3.5 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                        >
                          <div
                            onClick={() => handleOpenPackPreview(pack)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <div className="w-12 h-12 rounded-xl bg-base-200/60 p-1 flex items-center justify-center shrink-0 border border-base-300/60">
                              <StickerImage
                                src={pack.coverUrl}
                                alt={pack.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-base-content truncate hover:text-primary transition-colors">
                                {pack.name}
                              </h4>
                              <p className="text-xs text-base-content/55 truncate">
                                {pack.stickersCount || pack.stickers?.length || 0} stickers • by {pack.creatorName || "Chatty Studio"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Reorder Buttons */}
                            <div className="flex items-center bg-base-200 rounded-xl p-0.5 border border-base-300">
                              <button
                                disabled={isFirst}
                                onClick={() => movePackOrder(packId, "up")}
                                className="p-1 rounded-lg hover:bg-base-300 text-base-content/60 disabled:opacity-30 disabled:pointer-events-none"
                                title="Move pack up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={isLast}
                                onClick={() => movePackOrder(packId, "down")}
                                className="p-1 rounded-lg hover:bg-base-300 text-base-content/60 disabled:opacity-30 disabled:pointer-events-none"
                                title="Move pack down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleOpenPackPreview(pack)}
                              className="btn btn-ghost btn-sm text-xs font-semibold rounded-xl"
                            >
                              View
                            </button>

                            <button
                              onClick={() => uninstallPack(packId)}
                              className="btn btn-ghost btn-sm text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 rounded-xl"
                              title="Uninstall pack"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TAB 5: FAVORITES SECTION                                              */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "favorites" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-base-300/80">
                  <div>
                    <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      Favorite Stickers ({favoriteStickers.length})
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Your pinned stickers accessible instantly from any conversation
                    </p>
                  </div>
                </div>

                {favoriteStickers.length === 0 ? (
                  <div className="py-20 text-center text-base-content/50">
                    <Heart className="w-12 h-12 mx-auto mb-2 opacity-30 text-rose-400" />
                    <p className="text-sm font-bold text-base-content">No favorites yet</p>
                    <p className="text-xs mt-1 max-w-xs mx-auto">
                      Tap the heart icon on any sticker in the marketplace or chat picker to pin it here!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                    {favoriteStickers.map((stk) => {
                      const stkId = stk._id || stk.id || stk.stickerId;
                      return (
                        <div
                          key={stkId}
                          onClick={() => setSelectedStickerPreview(stk)}
                          className="group relative aspect-square p-2 rounded-2xl bg-base-200/50 hover:bg-base-200 flex flex-col items-center justify-center border border-base-300 hover:border-primary/50 transition-all hover:scale-105 cursor-pointer shadow-xs"
                        >
                          <StickerImage
                            src={stk.url || stk.thumbnailUrl}
                            alt={stk.name}
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(stk);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-base-100/90 text-rose-500 shadow-xs hover:scale-110 transition-transform"
                            title="Remove from favorites"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500" />
                          </button>

                          <span className="mt-1 text-[10px] text-base-content/60 truncate max-w-full text-center px-1">
                            {stk.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* TAB 6: RECENT STICKERS SECTION                                        */}
            {/* --------------------------------------------------------------------- */}
            {activeMarketplaceTab === "recent" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-base-300/80">
                  <div>
                    <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Recently Used Stickers ({recentStickers.length})
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Stickers you recently sent in one-to-one or group chats
                    </p>
                  </div>

                  {recentStickers.length > 0 && (
                    <button
                      onClick={clearRecent}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10 font-bold"
                    >
                      Clear Recents
                    </button>
                  )}
                </div>

                {recentStickers.length === 0 ? (
                  <div className="py-20 text-center text-base-content/50">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30 text-primary" />
                    <p className="text-sm font-bold text-base-content">No recently sent stickers</p>
                    <p className="text-xs mt-1">
                      Pick and send any sticker in a conversation to see it here for quick access!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                    {recentStickers.map((stk, i) => {
                      const stkId = stk._id || stk.id || stk.stickerId || i;
                      return (
                        <div
                          key={stkId}
                          onClick={() => setSelectedStickerPreview(stk)}
                          className="group relative aspect-square p-2 rounded-2xl bg-base-200/50 hover:bg-base-200 flex flex-col items-center justify-center border border-base-300 hover:border-primary/50 transition-all hover:scale-105 cursor-pointer shadow-xs"
                        >
                          <StickerImage
                            src={stk.url || stk.thumbnailUrl}
                            alt={stk.name}
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />
                          <span className="mt-1 text-[10px] text-base-content/60 truncate max-w-full text-center px-1">
                            {stk.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 5. FULL PACK DETAILS DRAWER / MODAL                                       */}
          {/* ========================================================================= */}
          {selectedPackPreview && (
            <div className="absolute inset-0 z-30 bg-base-100 flex flex-col animate-fade-in">
              {/* Pack Detail Header */}
              <div className="p-4 sm:p-5 border-b border-base-300 flex items-center justify-between gap-3 bg-base-200/40">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedPackPreview(null)}
                    className="p-2 rounded-xl hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors shrink-0"
                    aria-label="Back"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-base-content flex items-center gap-2 truncate">
                      {selectedPackPreview.name}
                      {selectedPackPreview.isAnimated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                          ANIMATED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-base-content/60 truncate">
                      by {selectedPackPreview.creatorName || "Chatty Studio"} • {selectedPackPreview.category} •{" "}
                      {selectedPackPreview.stickersCount || selectedPackPreview.stickers?.length || 0} stickers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyPackLink(selectedPackPreview)}
                    className="btn btn-ghost btn-sm rounded-xl text-xs font-semibold gap-1.5"
                    title="Copy share link"
                  >
                    {copiedLink ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
                  </button>

                  {installedPackIds.has(String(selectedPackPreview._id || selectedPackPreview.id)) ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Check className="w-4 h-4" /> Added to Library
                      </span>
                      <button
                        onClick={() => {
                          uninstallPack(selectedPackPreview._id || selectedPackPreview.id);
                        }}
                        className="btn btn-ghost btn-sm text-xs text-base-content/50 hover:text-error"
                      >
                        Remove
                      </button>
                    </div>
                  ) : selectedPackPreview.isPremium ? (
                    <button
                      onClick={() => purchasePack(selectedPackPreview._id || selectedPackPreview.id)}
                      className="btn btn-sm btn-primary font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Coins className="w-4 h-4 text-amber-300" />
                      Purchase for {selectedPackPreview.coinPrice} Coins
                    </button>
                  ) : (
                    <button
                      onClick={() => installPack(selectedPackPreview._id || selectedPackPreview.id)}
                      className="btn btn-sm btn-primary font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Add to Library
                    </button>
                  )}
                </div>
              </div>

              {/* Pack Overview Banner */}
              <div className="px-5 py-3.5 bg-base-200/20 border-b border-base-300/60 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-base-100 p-1.5 border border-base-300 shadow-xs shrink-0 flex items-center justify-center">
                  <StickerImage
                    src={selectedPackPreview.coverUrl}
                    alt={selectedPackPreview.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-base-content/75 line-clamp-2">
                    {selectedPackPreview.description || "Official high-resolution sticker collection."}
                  </p>
                  {selectedPackPreview.tags?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none">
                      {selectedPackPreview.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-base-200 text-base-content/60 border border-base-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pack Stickers Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
                {previewLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-base-content/50">
                    <span className="loading loading-spinner loading-md text-primary" />
                    <span>Loading sticker artwork...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                    {(selectedPackPreview.stickers || []).map((stk, i) => (
                      <div
                        key={stk._id || stk.id || i}
                        onClick={() => setSelectedStickerPreview(stk)}
                        className="group relative aspect-square p-2.5 rounded-2xl bg-base-200/50 hover:bg-base-200 flex flex-col items-center justify-center border border-base-300 hover:border-primary/50 transition-all hover:scale-105 cursor-pointer shadow-xs"
                        title="Click to view full preview"
                      >
                        <StickerImage
                          src={stk.url || stk.thumbnailUrl}
                          alt={stk.name}
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                        <span className="mt-1 text-[10px] text-base-content/60 truncate max-w-full text-center px-1 font-medium">
                          {stk.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. ADVANCED STICKER VIEWER MODAL                                          */}
          {/* ========================================================================= */}
          {selectedStickerPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="w-full max-w-md rounded-3xl bg-base-100 p-6 border border-base-300 shadow-2xl flex flex-col items-center text-center relative select-none"
              >
                <button
                  onClick={() => setSelectedStickerPreview(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Big Preview Canvas */}
                <div className="w-52 h-52 sm:w-60 sm:h-60 p-5 mb-4 rounded-3xl bg-base-200/50 flex items-center justify-center border border-base-300 relative shadow-inner">
                  <StickerImage
                    src={selectedStickerPreview.url}
                    alt={selectedStickerPreview.name}
                    className="w-full h-full object-contain filter drop-shadow-lg"
                  />

                  {/* Favorite button toggle */}
                  <button
                    onClick={() => toggleFavorite(selectedStickerPreview)}
                    className="absolute bottom-3 right-3 p-2 rounded-2xl bg-base-100/90 hover:bg-base-100 text-base-content/70 hover:text-rose-500 shadow-md border border-base-300 transition-transform active:scale-95"
                    title={
                      favoriteStickerIds.has(String(selectedStickerPreview._id || selectedStickerPreview.id || selectedStickerPreview.stickerId))
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favoriteStickerIds.has(String(selectedStickerPreview._id || selectedStickerPreview.id || selectedStickerPreview.stickerId))
                          ? "text-rose-500 fill-rose-500"
                          : ""
                      }`}
                    />
                  </button>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-base-content">
                  {selectedStickerPreview.name}
                </h4>
                {selectedStickerPreview.packName && (
                  <p className="text-xs text-base-content/60 mt-0.5">
                    from {selectedStickerPreview.packName}
                  </p>
                )}

                {/* Technical Badges */}
                <div className="flex items-center gap-1.5 my-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase">
                    {selectedStickerPreview.format ||
                      (selectedStickerPreview.url?.endsWith(".gif") ? "GIF" : "WebP")}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 border border-base-300">
                    512 × 512
                  </span>
                  {selectedStickerPreview.isAnimated && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase">
                      Animated
                    </span>
                  )}
                </div>

                {selectedStickerPreview.keywords?.length > 0 && (
                  <p className="text-[11px] text-base-content/50 max-w-xs truncate">
                    Tags: {selectedStickerPreview.keywords.join(", ")}
                  </p>
                )}

                {/* Actions Suite */}
                <div className="flex items-center gap-2.5 w-full mt-5">
                  <button
                    onClick={() => setSelectedStickerPreview(null)}
                    className="btn btn-ghost btn-sm rounded-xl flex-1 font-semibold text-xs text-base-content/70"
                  >
                    Close
                  </button>
                  {onSelectSticker ? (
                    <button
                      onClick={() => {
                        onSelectSticker(selectedStickerPreview);
                        setSelectedStickerPreview(null);
                        onClose();
                      }}
                      className="btn btn-primary btn-sm rounded-xl flex-1 font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send in Chat</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedStickerPreview(null)}
                      className="btn btn-primary btn-sm rounded-xl flex-1 font-bold text-xs"
                    >
                      Done
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. ADMIN MODERATION VIEW                                                  */}
          {/* ========================================================================= */}
          {showAdminModeration && (
            <div className="absolute inset-0 z-40 bg-base-100 flex flex-col animate-fade-in p-5">
              <div className="flex items-center justify-between pb-3 border-b border-base-300 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-warning" />
                  <h3 className="font-bold text-base text-base-content">
                    Pending Creator Submissions ({pendingPacks.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowAdminModeration(false)}
                  className="btn btn-ghost btn-sm rounded-xl"
                >
                  Back to Marketplace
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {pendingPacks.length === 0 ? (
                  <div className="p-12 text-center text-sm text-base-content/50 border border-dashed border-base-300 rounded-3xl">
                    No submissions currently awaiting moderation.
                  </div>
                ) : (
                  pendingPacks.map((pack) => {
                    const packId = pack._id || pack.id;
                    return (
                      <div
                        key={packId}
                        className="p-4 rounded-3xl bg-base-200/50 border border-base-300 flex flex-col md:flex-row items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-base-100 p-1 border border-base-300 shrink-0">
                            <StickerImage
                              src={pack.coverUrl}
                              alt={pack.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-base-content">{pack.name}</h4>
                            <p className="text-xs text-base-content/60">
                              Creator: {pack.creatorName || "Creator"} • Category: {pack.category}
                            </p>
                            <p className="text-xs text-base-content/75 mt-1 line-clamp-1">
                              {pack.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedRejectPackId(packId)}
                            className="btn btn-ghost btn-sm text-xs text-error"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleApprovePack(packId)}
                            className="btn btn-success btn-sm text-xs font-bold text-white shadow-xs"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Approve & Publish
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. DIAGNOSTICS MODAL                                                      */}
          {/* ========================================================================= */}
          {showDiagnosticsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl bg-base-100 p-6 border border-base-300 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 border-b border-base-300 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-base text-base-content">
                      Sticker Asset Integrity Diagnostics
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDiagnosticsModal(false)}
                    className="p-1.5 rounded-xl hover:bg-base-200 text-base-content/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  {diagnosticLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <span className="loading loading-spinner text-primary" />
                      <span className="text-xs text-base-content/60">Scanning filesystem and database assets...</span>
                    </div>
                  ) : diagnosticReport ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-2xl bg-base-200/50 border border-base-300 text-center">
                          <span className="text-xs text-base-content/60">Total Packs</span>
                          <p className="text-xl font-extrabold text-base-content mt-1">
                            {diagnosticReport.totalPacks}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-base-200/50 border border-base-300 text-center">
                          <span className="text-xs text-base-content/60">Total Stickers</span>
                          <p className="text-xl font-extrabold text-base-content mt-1">
                            {diagnosticReport.totalStickers}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Valid Assets</span>
                          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                            {diagnosticReport.validStickerAssets}
                          </p>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                          <span className="text-xs text-amber-500 font-medium">Animated</span>
                          <p className="text-xl font-extrabold text-amber-500 mt-1">
                            {diagnosticReport.animatedStickers}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-base-300 overflow-hidden">
                        <table className="table table-xs w-full">
                          <thead className="bg-base-200/60 text-xs">
                            <tr>
                              <th>Pack Name</th>
                              <th>Stickers</th>
                              <th>Cover Asset</th>
                              <th>Integrity Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(diagnosticReport.packs || []).map((p) => (
                              <tr key={p.id}>
                                <td className="font-bold">{p.name}</td>
                                <td>{p.stickersCount} stickers</td>
                                <td>
                                  {p.coverValid ? (
                                    <span className="text-emerald-500 font-bold">Verified</span>
                                  ) : (
                                    <span className="text-error font-bold">Missing</span>
                                  )}
                                </td>
                                <td>
                                  {p.isComplete ? (
                                    <span className="badge badge-success badge-xs font-bold text-white">
                                      100% Valid
                                    </span>
                                  ) : (
                                    <span className="badge badge-error badge-xs font-bold text-white">
                                      Incomplete
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              </motion.div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. CREATOR STUDIO MODAL INTEGRATION                                       */}
          {/* ========================================================================= */}
          {showCreatorModal && (
            <StickerCreatorModal
              isOpen={showCreatorModal}
              onClose={() => setShowCreatorModal(false)}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Reusable Sticker Pack Card Component
 */
function PackCard({
  pack,
  rank,
  isInstalled,
  onOpen,
  onInstall,
  onUninstall,
  onPurchase,
}) {
  const previewList = pack.previewStickers || pack.stickers || [];

  return (
    <div className="p-4 rounded-3xl bg-base-100 border border-base-300/80 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between group">
      {/* Pack Header & Cover */}
      <div onClick={onOpen} className="cursor-pointer">
        <div className="aspect-[16/10] rounded-2xl bg-base-200/50 overflow-hidden flex items-center justify-center p-3 relative mb-3 group-hover:scale-[1.01] transition-transform">
          <StickerImage
            src={pack.coverImage || pack.coverUrl}
            alt={pack.name}
            className="w-full h-full object-contain filter drop-shadow-md"
          />

          {rank && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-content shadow-xs">
              #{rank}
            </span>
          )}

          {pack.isAnimated && (
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 backdrop-blur-sm">
              ANIMATED
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-base-content leading-tight group-hover:text-primary transition-colors truncate">
              {pack.name}
            </h3>
            <p className="text-xs text-base-content/60 mt-0.5 truncate">
              by {pack.creatorName || pack.creator?.fullName || "Chatty Studio"}
            </p>
          </div>

          {pack.isPremium ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              <Coins className="w-3.5 h-3.5" />
              {pack.coinPrice}
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
              Free
            </span>
          )}
        </div>

        <p className="text-xs text-base-content/70 mt-1.5 line-clamp-2">
          {pack.description}
        </p>

        {/* Mini Preview Row */}
        {previewList.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 my-3 p-1.5 rounded-xl bg-base-200/40 border border-base-300/40">
            {previewList.slice(0, 4).map((stk, i) => (
              <div
                key={stk._id || stk.id || i}
                className="aspect-square rounded-lg bg-base-100 p-1 flex items-center justify-center border border-base-300/40 shadow-xs"
              >
                <StickerImage
                  src={stk.thumbnailUrl || stk.url}
                  alt={stk.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-2 pt-3 border-t border-base-300/80 flex items-center justify-between gap-2">
        <span className="text-[11px] text-base-content/50 font-medium">
          {pack.stickersCount || pack.totalStickers || previewList.length || 0} stickers
        </span>

        {isInstalled ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" /> Added
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUninstall();
              }}
              className="btn btn-ghost btn-xs text-base-content/40 hover:text-error rounded-lg"
            >
              Remove
            </button>
          </div>
        ) : pack.isPremium ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPurchase();
            }}
            className="btn btn-sm btn-primary rounded-xl font-bold flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            Get for {pack.coinPrice}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            className="btn btn-sm btn-primary rounded-xl font-bold flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Add Pack
          </button>
        )}
      </div>
    </div>
  );
}
