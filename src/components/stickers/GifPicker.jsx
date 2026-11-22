import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Search,
  Clock,
  Sparkles,
  TrendingUp,
  Smile,
  X,
  Flame,
  Heart,
  Gamepad2,
  Cat,
  PartyPopper,
} from "lucide-react";
import StickerImage from "./StickerImage.jsx";

const CURATED_GIF_CATEGORIES = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "reactions", label: "Reactions", icon: Flame },
  { id: "funny", label: "Memes", icon: Smile },
  { id: "love", label: "Love", icon: Heart },
  { id: "celebrate", label: "Party", icon: PartyPopper },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "animals", label: "Animals", icon: Cat },
];

const CURATED_GIFS = [
  {
    id: "gif_pepe_clap",
    category: "trending",
    title: "Pepe Excited Applause",
    keywords: ["pepe", "clap", "applause", "excited", "yes", "bravo", "win"],
    url: "/assets/gifts/funny-memes/pepe-feels-good-frog.svg",
    previewUrl: "/assets/gifts/funny-memes/pepe-feels-good-frog.svg",
  },
  {
    id: "gif_mind_blown",
    category: "reactions",
    title: "Mind Blown Galaxy",
    keywords: ["mindblown", "explosion", "shocked", "wow", "galaxy", "omg"],
    url: "/assets/gifts/funny-memes/mind-blown-explosion.svg",
    previewUrl: "/assets/gifts/funny-memes/mind-blown-explosion.svg",
  },
  {
    id: "gif_deal_with_it",
    category: "reactions",
    title: "Deal With It Shades",
    keywords: ["deal with it", "shades", "cool", "boss", "swag", "glasses"],
    url: "/assets/gifts/funny-memes/deal-with-it-sunglasses.svg",
    previewUrl: "/assets/gifts/funny-memes/deal-with-it-sunglasses.svg",
  },
  {
    id: "gif_this_is_fine",
    category: "funny",
    title: "This is Fine Coffee",
    keywords: ["this is fine", "fire", "chaos", "coffee", "calm", "dog"],
    url: "/assets/gifts/funny-memes/this-is-fine-coffee-dog.svg",
    previewUrl: "/assets/gifts/funny-memes/this-is-fine-coffee-dog.svg",
  },
  {
    id: "gif_drama_popcorn",
    category: "funny",
    title: "Eating Popcorn Drama",
    keywords: ["popcorn", "drama", "watching", "tea", "cinema", "funny"],
    url: "/assets/gifts/funny-memes/drama-popcorn-bucket.svg",
    previewUrl: "/assets/gifts/funny-memes/drama-popcorn-bucket.svg",
  },
  {
    id: "gif_certified_bruh",
    category: "funny",
    title: "Certified Bruh Moment",
    keywords: ["bruh", "moment", "disbelief", "certified", "smh", "funny"],
    url: "/assets/gifts/funny-memes/certified-certified-bruh.svg",
    previewUrl: "/assets/gifts/funny-memes/certified-certified-bruh.svg",
  },
  {
    id: "gif_galaxy_brain",
    category: "funny",
    title: "Galaxy Brain 200 IQ",
    keywords: ["brain", "galaxy", "iq", "smart", "genius", "awakening"],
    url: "/assets/gifts/funny-memes/galaxy-brain-awakening.svg",
    previewUrl: "/assets/gifts/funny-memes/galaxy-brain-awakening.svg",
  },
  {
    id: "gif_dumpster_fire",
    category: "reactions",
    title: "Dumpster Fire Golden Trophy",
    keywords: ["fire", "dumpster", "lit", "chaos", "trophy", "disaster"],
    url: "/assets/gifts/funny-memes/dumpster-fire-trophy.svg",
    previewUrl: "/assets/gifts/funny-memes/dumpster-fire-trophy.svg",
  },
  {
    id: "gif_doge_wow",
    category: "funny",
    title: "Doge Much Wow",
    keywords: ["doge", "wow", "crypto", "coin", "shiba", "cool"],
    url: "/assets/gifts/funny-memes/doge-wow-coin.svg",
    previewUrl: "/assets/gifts/funny-memes/doge-wow-coin.svg",
  },
  {
    id: "gif_facepalm",
    category: "reactions",
    title: "Facepalm Resignation",
    keywords: ["facepalm", "smh", "disappointed", "why", "fail", "mistake"],
    url: "/assets/gifts/funny-memes/facepalm-of-resignation.svg",
    previewUrl: "/assets/gifts/funny-memes/facepalm-of-resignation.svg",
  },
  // Love & Romance
  {
    id: "gif_love_red_rose",
    category: "love",
    title: "Romantic Blooming Rose",
    keywords: ["rose", "flower", "love", "romance", "red", "sweet"],
    url: "/assets/gifts/love/red-rose.svg",
    previewUrl: "/assets/gifts/love/red-rose.svg",
  },
  {
    id: "gif_love_diamond_heart",
    category: "love",
    title: "Diamond Sparkle Heart",
    keywords: ["heart", "diamond", "sparkle", "love", "romance", "precious"],
    url: "/assets/gifts/love/diamond-heart.svg",
    previewUrl: "/assets/gifts/love/diamond-heart.svg",
  },
  {
    id: "gif_love_cupid_arrow",
    category: "love",
    title: "Cupid's Golden Arrow",
    keywords: ["cupid", "arrow", "heart", "love", "crush", "romance"],
    url: "/assets/gifts/love/cupids-arrow.svg",
    previewUrl: "/assets/gifts/love/cupids-arrow.svg",
  },
  // Party & Celebration
  {
    id: "gif_party_popper",
    category: "celebrate",
    title: "Party Horn & Confetti",
    keywords: ["party", "confetti", "birthday", "celebrate", "hurray", "horns"],
    url: "/assets/gifts/birthday/party-popper.svg",
    previewUrl: "/assets/gifts/birthday/party-popper.svg",
  },
  {
    id: "gif_party_balloon",
    category: "celebrate",
    title: "Celebration Helium Balloon",
    keywords: ["balloon", "party", "fly", "joy", "milestone", "congrats"],
    url: "/assets/gifts/birthday/celebration-balloon.svg",
    previewUrl: "/assets/gifts/birthday/celebration-balloon.svg",
  },
  {
    id: "gif_party_cake",
    category: "celebrate",
    title: "Festive Birthday Cake",
    keywords: ["cake", "birthday", "sweet", "candles", "celebrate", "party"],
    url: "/assets/gifts/birthday/birthday-cake.svg",
    previewUrl: "/assets/gifts/birthday/birthday-cake.svg",
  },
  // Gaming
  {
    id: "gif_gaming_arcade",
    category: "gaming",
    title: "Gold Joystick Pro",
    keywords: ["arcade", "retro", "game", "gaming", "esports", "insert coin"],
    url: "/assets/stickers/retro-arcade-gaming/gold-joystick.webp",
    previewUrl: "/assets/stickers/retro-arcade-gaming/thumb_gold-joystick.webp",
  },
  {
    id: "gif_gaming_controller",
    category: "gaming",
    title: "Pro Gamer Joystick",
    keywords: ["controller", "gamepad", "gaming", "play", "gg", "win"],
    url: "/assets/gifts/gaming/gold-gaming-joystick.svg",
    previewUrl: "/assets/gifts/gaming/gold-gaming-joystick.svg",
  },
  {
    id: "gif_gaming_vr",
    category: "gaming",
    title: "Cyber Surround Headset",
    keywords: ["vr", "virtual", "headset", "future", "metaverse", "cyber"],
    url: "/assets/gifts/gaming/gaming-headset-surround.svg",
    previewUrl: "/assets/gifts/gaming/gaming-headset-surround.svg",
  },
  // Animals
  {
    id: "gif_cat_kitten",
    category: "animals",
    title: "Playful Kitten",
    keywords: ["cat", "kitten", "cute", "meow", "animals", "pets"],
    url: "/assets/gifts/animals/playful-kitten.svg",
    previewUrl: "/assets/gifts/animals/playful-kitten.svg",
  },
  {
    id: "gif_dog_puppy",
    category: "animals",
    title: "Sweet Happy Puppy",
    keywords: ["dog", "puppy", "bark", "cute", "pets", "happy"],
    url: "/assets/gifts/animals/cute-puppy.svg",
    previewUrl: "/assets/gifts/animals/cute-puppy.svg",
  },
  {
    id: "gif_animal_penguin",
    category: "animals",
    title: "Dancing Baby Penguin",
    keywords: ["penguin", "snow", "waddle", "dance", "cute", "winter"],
    url: "/assets/gifts/animals/baby-penguin.svg",
    previewUrl: "/assets/gifts/animals/baby-penguin.svg",
  },
  {
    id: "gif_animal_bear",
    category: "animals",
    title: "Snuggly Baby Bear",
    keywords: ["bear", "cuddle", "cozy", "cute", "animals", "nap"],
    url: "/assets/gifts/animals/baby-bear.svg",
    previewUrl: "/assets/gifts/animals/baby-bear.svg",
  },
];

const LOCAL_STORAGE_RECENTS_KEY = "chatty_recent_gifs_v1";

export default function GifPicker({
  isOpen,
  onClose,
  onSelectGif,
  className = "",
}) {
  const [activeCategory, setActiveCategory] = useState("trending");
  const [search, setSearch] = useState("");
  const [recentGifs, setRecentGifs] = useState([]);
  const containerRef = useRef(null);

  // Load recents from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_RECENTS_KEY);
      if (raw) {
        setRecentGifs(JSON.parse(raw));
      }
    } catch (_e) {}
  }, [isOpen]);

  // Outside click handler
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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter GIFs
  let displayedGifs = [];
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    displayedGifs = CURATED_GIFS.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  } else if (activeCategory === "recents") {
    displayedGifs = recentGifs;
  } else {
    displayedGifs = CURATED_GIFS.filter(
      (g) => g.category === activeCategory || activeCategory === "trending",
    );
  }

  const handlePick = (gif) => {
    // Save to recents
    try {
      const updated = [gif, ...recentGifs.filter((r) => r.id !== gif.id)].slice(
        0,
        20,
      );
      setRecentGifs(updated);
      localStorage.setItem(LOCAL_STORAGE_RECENTS_KEY, JSON.stringify(updated));
    } catch (_e) {}

    onSelectGif(gif);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl bg-base-100 border border-base-300 shadow-2xl overflow-hidden flex flex-col text-base-content select-none animate-in fade-in zoom-in-95 duration-150 ${className || "absolute bottom-full mb-3 right-2 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px]"}`}
      style={{ height: "460px", maxHeight: "min(460px, calc(100dvh - 120px))" }}
    >
      {/* 1. Header & Search */}
      <div className="p-3 border-b border-base-300 bg-base-200/50 backdrop-blur-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide text-base-content">
              Animated GIFs
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-300/50 transition-colors"
            aria-label="Close GIF picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search animated GIFs (e.g. happy, meme, cat)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-base-200/80 rounded-xl border border-base-300 focus:outline-none focus:border-primary/60 text-base-content placeholder:text-base-content/40 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Categories Bar */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => {
              setActiveCategory("recents");
              setSearch("");
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              activeCategory === "recents" && !search
                ? "bg-primary text-primary-content font-bold shadow-xs"
                : "text-base-content/60 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Recents</span>
          </button>

          {CURATED_GIF_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id && !search;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearch("");
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-content font-bold shadow-xs"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. GIF Grid */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-base-300">
        {displayedGifs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-base-content/50">
            {activeCategory === "recents" ? (
              <>
                <Clock className="w-10 h-10 mb-2 opacity-30 text-base-content/40" />
                <p className="text-xs font-semibold text-base-content">
                  No recent GIFs
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60">
                  Tap any animated GIF in trending or search to send it!
                </p>
              </>
            ) : (
              <>
                <Film className="w-10 h-10 mb-2 opacity-30 text-primary" />
                <p className="text-xs font-semibold text-base-content">
                  No GIFs found
                </p>
                <p className="text-[11px] mt-0.5 text-base-content/60">
                  Try another keyword like "excited", "wow", "love", or "fire".
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayedGifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handlePick(gif)}
                className="group relative aspect-square p-2 rounded-2xl bg-base-200/50 hover:bg-base-200 transition-all flex flex-col items-center justify-center border border-base-300/60 hover:border-primary/50 hover:scale-[1.03] active:scale-95 overflow-hidden"
              >
                <StickerImage
                  src={gif.url}
                  alt={gif.title}
                  loading="lazy"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                />
                <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded-lg bg-base-300/90 backdrop-blur-xs text-[9px] text-base-content font-medium truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {gif.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Footer info pill */}
      <div className="border-t border-base-300 px-3 py-2 flex items-center justify-between text-[11px] text-base-content/60 bg-base-200/50">
        <span className="flex items-center gap-1 font-medium">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span>Animated GIFs & WebP</span>
        </span>
        <span className="font-semibold text-primary text-[10px] uppercase tracking-wider">
          HD Vector Animation
        </span>
      </div>
    </div>
  );
}
