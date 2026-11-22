import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Heart,
  Search,
  Store,
  Sparkles,
  Smile,
  X,
  Package,
  Compass,
  Check,
  Plus,
  Eye,
  Send,
  Layers,
} from "lucide-react";
import { useStickerStore } from "../../store/useStickerStore.js";
import StickerImage from "./StickerImage.jsx";

/**
 * StickerPicker
 * Theme-aware Sticker Picker popup anchored to the Message Composer.
 * Automatically conforms to the active application theme using DaisyUI / Tailwind tokens.
 */
export default function StickerPicker({
  isOpen,
  onClose,
  onSelectSticker,
  onOpenMarketplace,
  className = "",
}) {
  const {
    installedPacks,
    favoriteStickers,
    favoriteStickerIds,
    recentStickers,
    packs: marketplacePacks,
    libraryLoading,
    fetchLibrary,
    fetchFavorites,
    fetchRecent,
    fetchMarketplace,
    installPack,
    toggleFavorite,
  } = useStickerStore();

  // Primary navigation tabs: "recent" | "favorites" | "my_stickers" | "discover"
  const [activeNavTab, setActiveNavTab] = useState("my_stickers");
  // Sub-tab for currently selected pack ID in My Stickers
  const [selectedPackId, setSelectedPackId] = useState("");
  const [search, setSearch] = useState("");
  const [previewSticker, setPreviewSticker] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
      fetchFavorites();
      fetchRecent();
      fetchMarketplace({ limit: 12 });
    }
  }, [isOpen, fetchLibrary, fetchFavorites, fetchRecent, fetchMarketplace]);

  // Set default selected pack when installed packs load
  useEffect(() => {
    if (installedPacks.length > 0 && !selectedPackId) {
      setSelectedPackId(String(installedPacks[0]._id || installedPacks[0].id));
    }
  }, [installedPacks, selectedPackId]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewSticker) {
          setPreviewSticker(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, previewSticker, onClose]);

  if (!isOpen) return null;

  // Find currently active pack
  const currentPack =
    installedPacks.find(
      (p) => String(p._id || p.id) === String(selectedPackId),
    ) || installedPacks[0];

  // Determine which stickers to display based on navigation tab
  let stickers = [];
  if (activeNavTab === "recent") {
    stickers = recentStickers.map((r) => r.sticker || r);
  } else if (activeNavTab === "favorites") {
    stickers = favoriteStickers.map((f) => f.sticker || f);
  } else if (activeNavTab === "my_stickers") {
    stickers = currentPack?.stickers || [];
  }

  // Filter stickers by search if active
  if (search.trim() && activeNavTab !== "discover") {
    const q = search.trim().toLowerCase();
    stickers = stickers.filter((s) => {
      const matchName = s?.name?.toLowerCase().includes(q);
      const matchAlt = s?.altText?.toLowerCase().includes(q);
      const matchKeyword = s?.keywords?.some((k) =>
        k.toLowerCase().includes(q),
      );
      return matchName || matchAlt || matchKeyword;
    });
  }

  const handlePickSticker = (stk) => {
    if (!stk) return;
    const sId = String(stk._id || stk.id || stk.stickerId || "");
    const payload = {
      stickerId: sId,
      _id: sId,
      id: sId,
      packId: stk.packId || currentPack?._id || currentPack?.id,
      packName: stk.packName || currentPack?.name || "Sticker",
      url: stk.url,
      thumbnailUrl: stk.thumbnailUrl || stk.url,
      name: stk.name || "Sticker",
      altText: stk.altText || stk.name || "Sticker",
      format: stk.format || (stk.url?.endsWith(".gif") ? "gif" : "webp"),
      isAnimated: Boolean(stk.isAnimated || stk.url?.endsWith(".gif")),
    };
    onSelectSticker(payload);
    onClose();
  };

  const installedPackIds = new Set(
    installedPacks.map((p) => String(p._id || p.id)),
  );

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl bg-base-100 border border-base-300 shadow-2xl overflow-hidden flex flex-col text-base-content select-none animate-in fade-in zoom-in-95 duration-150 ${className || "absolute bottom-full mb-3 right-2 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px]"}`}
      style={{ height: "460px", maxHeight: "min(460px, calc(100dvh - 120px))" }}
    >
      {/* 1. Header: Title, Search, Marketplace Link & Close */}
      <div className="p-3 border-b border-base-300/80 bg-base-100/95 backdrop-blur-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide text-base-content">
              Stickers
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenMarketplace) onOpenMarketplace();
              }}
              className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Sticker Marketplace"
            >
              <Store className="w-3 h-3" />
              <span>Marketplace</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
              aria-label="Close picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all stickers and packs..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-base-200/60 rounded-xl border border-base-300 text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary focus:bg-base-100 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Top Navigation Tabs: Recent | Favorites | My Stickers | Discover */}
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-base-200/60 border border-base-300 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveNavTab("recent")}
            className={`py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeNavTab === "recent"
                ? "bg-primary text-primary-content font-bold shadow-xs border border-primary"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Recent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab("favorites")}
            className={`py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeNavTab === "favorites"
                ? "bg-rose-500 text-white font-bold shadow-xs border border-rose-500"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Favorites</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab("my_stickers")}
            className={`py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeNavTab === "my_stickers"
                ? "bg-primary text-primary-content font-bold shadow-xs border border-primary"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>My Packs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab("discover")}
            className={`py-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeNavTab === "discover"
                ? "bg-primary text-primary-content font-bold shadow-xs border border-primary"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Discover</span>
          </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin bg-base-100">
        {/* Loading state */}
        {libraryLoading && installedPacks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-base-content/60 gap-2">
            <span className="loading loading-spinner loading-sm text-primary" />
            <span>Loading sticker packs...</span>
          </div>
        ) : activeNavTab === "discover" ? (
          /* DISCOVER TAB: Browse & 1-click install packs right in picker */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-base-content flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-primary" />
                Trending Sticker Packs
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenMarketplace) onOpenMarketplace();
                }}
                className="text-primary text-[11px] font-semibold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {marketplacePacks.map((pack) => {
                const pId = String(pack._id || pack.id);
                const isInstalled = installedPackIds.has(pId);
                const previews = pack.previewStickers || pack.stickers || [];

                return (
                  <div
                    key={pId}
                    className="p-2.5 rounded-2xl bg-base-200/40 border border-base-300 hover:border-primary/40 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-base-100 p-1 shrink-0 overflow-hidden border border-base-300">
                          <StickerImage
                            src={pack.coverImage || pack.coverUrl}
                            alt={pack.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-base-content truncate">
                            {pack.name}
                          </h4>
                          <span className="text-[10px] text-base-content/60">
                            {pack.stickersCount || previews.length} stickers
                          </span>
                        </div>
                      </div>

                      {isInstalled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => installPack(pId)}
                          className="px-2.5 py-1 rounded-lg bg-primary hover:brightness-110 text-primary-content text-[10px] font-extrabold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Free
                        </button>
                      )}
                    </div>

                    {/* Mini sticker thumbnails row */}
                    {previews.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-base-100 border border-base-300/60">
                        {previews.slice(0, 4).map((stk, i) => (
                          <div
                            key={stk._id || stk.id || i}
                            onClick={() => handlePickSticker(stk)}
                            className="aspect-square rounded-lg p-0.5 bg-base-200/50 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                            title={`Send ${stk.name}`}
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
                );
              })}
            </div>
          </div>
        ) : stickers.length === 0 ? (
          /* Empty state for Recent / Favorites / Current pack */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-base-content/60">
            {activeNavTab === "recent" ? (
              <>
                <Clock className="w-10 h-10 mb-2 opacity-30 text-base-content/40" />
                <p className="text-xs font-semibold text-base-content">
                  No recent stickers
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60 max-w-[200px]">
                  Send stickers in any conversation to access them quickly here!
                </p>
              </>
            ) : activeNavTab === "favorites" ? (
              <>
                <Heart className="w-10 h-10 mb-2 opacity-30 text-rose-500" />
                <p className="text-xs font-semibold text-base-content">
                  No favorite stickers
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60 max-w-[200px]">
                  Click the heart icon on any sticker to pin it to your favorites!
                </p>
              </>
            ) : installedPacks.length === 0 ? (
              <>
                <Package className="w-10 h-10 mb-2 opacity-30 text-primary" />
                <p className="text-xs font-semibold text-base-content">
                  Your sticker library is empty
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60 max-w-[200px]">
                  Explore the marketplace to add expressive sticker packs!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenMarketplace) onOpenMarketplace();
                  }}
                  className="btn btn-xs rounded-xl mt-3 btn-primary text-primary-content font-bold border-none"
                >
                  Explore Marketplace
                </button>
              </>
            ) : (
              <>
                <Smile className="w-10 h-10 mb-2 opacity-30 text-base-content/40" />
                <p className="text-xs font-semibold text-base-content">
                  No matching stickers
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60">
                  Try another search query or switch packs below.
                </p>
              </>
            )}
          </div>
        ) : (
          /* STICKER GRID */
          <div className="grid grid-cols-4 gap-2">
            {stickers.map((stk, idx) => {
              const sId = String(stk._id || stk.id || stk.stickerId || idx);
              const isFav = favoriteStickerIds.has(sId);

              return (
                <div
                  key={sId}
                  className="group relative aspect-square p-1.5 rounded-2xl bg-base-200/40 hover:bg-base-200/90 transition-all flex items-center justify-center cursor-pointer border border-base-300/60 hover:border-primary/40 hover:scale-105 hover:shadow-xs"
                  onClick={() => handlePickSticker(stk)}
                >
                  <StickerImage
                    src={stk.url || stk.thumbnailUrl}
                    alt={stk.name || "Sticker"}
                    loading="lazy"
                    isAnimated={Boolean(
                      stk.isAnimated ||
                        stk.format === "gif" ||
                        stk.url?.endsWith(".gif"),
                    )}
                    className="w-full h-full object-contain filter drop-shadow-xs transition-transform"
                  />

                  {/* Quick Action Overlay (Favorite + Preview) */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewSticker(stk);
                      }}
                      title="Preview sticker"
                      className="p-1 rounded-full bg-base-100/90 border border-base-300 text-base-content/60 hover:text-primary shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(stk);
                      }}
                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      className={`p-1 rounded-full bg-base-100/90 border border-base-300 shadow-xs transition-colors cursor-pointer ${
                        isFav
                          ? "text-rose-500"
                          : "text-base-content/40 hover:text-rose-500"
                      }`}
                    >
                      <Heart
                        className={`w-3 h-3 ${isFav ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Quick-Switcher Bar (Installed Pack Tabs) */}
      <div className="border-t border-base-300/80 p-2 flex items-center gap-1.5 bg-base-200/40 overflow-x-auto scrollbar-none">
        {/* Recents Button */}
        <button
          type="button"
          onClick={() => setActiveNavTab("recent")}
          title="Recent Stickers"
          className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeNavTab === "recent"
              ? "bg-primary text-primary-content shadow-xs font-bold"
              : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
          }`}
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* Favorites Button */}
        <button
          type="button"
          onClick={() => setActiveNavTab("favorites")}
          title="Favorite Stickers"
          className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeNavTab === "favorites"
              ? "bg-rose-500 text-white shadow-xs font-bold"
              : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
          }`}
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-base-300 mx-1 shrink-0" />

        {/* Installed Pack Icons */}
        {installedPacks.map((pack) => {
          const packId = String(pack._id || pack.id);
          const isSelected =
            activeNavTab === "my_stickers" && String(selectedPackId) === packId;
          const cover = pack.coverUrl || pack.coverImage;

          return (
            <button
              key={packId}
              type="button"
              onClick={() => {
                setActiveNavTab("my_stickers");
                setSelectedPackId(packId);
              }}
              title={pack.name}
              className={`w-8 h-8 rounded-xl p-0.5 transition-all shrink-0 border flex items-center justify-center overflow-hidden cursor-pointer ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 bg-base-100 shadow-xs scale-105"
                  : "border-transparent hover:bg-base-200"
              }`}
            >
              {cover ? (
                <StickerImage
                  src={cover}
                  alt={pack.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <Package className="w-4 h-4 text-base-content/40" />
              )}
            </button>
          );
        })}

        {/* Marketplace Shortcut */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenMarketplace) onOpenMarketplace();
          }}
          title="Browse Sticker Marketplace"
          className="ml-auto p-1.5 px-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 shrink-0 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
        >
          <Store className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Store</span>
        </button>
      </div>

      {/* 5. In-Picker Sticker Preview Modal */}
      {previewSticker && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-base-100 border border-base-300 p-5 shadow-2xl flex flex-col items-center text-center relative text-base-content">
            <button
              type="button"
              onClick={() => setPreviewSticker(null)}
              className="absolute top-3 right-3 p-1 rounded-xl text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-40 h-40 p-2 mb-3 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center shadow-inner">
              <StickerImage
                src={previewSticker.url}
                alt={previewSticker.name}
                isAnimated={Boolean(
                  previewSticker.isAnimated ||
                    previewSticker.format === "gif" ||
                    previewSticker.url?.endsWith(".gif"),
                )}
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>

            <h4 className="text-sm font-bold text-base-content">
              {previewSticker.name}
            </h4>

            <div className="flex items-center gap-1.5 my-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 uppercase">
                {previewSticker.format ||
                  (previewSticker.url?.endsWith(".gif") ? "GIF" : "WebP")}
              </span>
              {previewSticker.isAnimated && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/25 uppercase">
                  Animated
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full mt-3">
              <button
                type="button"
                onClick={() => {
                  toggleFavorite(previewSticker);
                }}
                className={`p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  favoriteStickerIds.has(
                    String(
                      previewSticker._id ||
                        previewSticker.id ||
                        previewSticker.stickerId,
                    ),
                  )
                    ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                    : "bg-base-200 text-base-content/70 border-base-300 hover:text-rose-500"
                }`}
                title="Toggle favorite"
              >
                <Heart
                  className={`w-4 h-4 ${
                    favoriteStickerIds.has(
                      String(
                        previewSticker._id ||
                          previewSticker.id ||
                          previewSticker.stickerId,
                      ),
                    )
                      ? "fill-current"
                      : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  handlePickSticker(previewSticker);
                  setPreviewSticker(null);
                }}
                className="btn btn-sm flex-1 rounded-xl btn-primary text-primary-content font-bold border-none flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
