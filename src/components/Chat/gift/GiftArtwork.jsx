import React, { useState } from "react";
import { getCategoryTheme, getRarityTheme } from "./giftUIHelpers.js";

const GiftArtwork = ({
  gift,
  className = "w-full h-full",
  imgClassName = "w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]",
  fallbackSize = "text-5xl",
  glow = true,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (!gift) return null;

  const categoryTheme = getCategoryTheme(gift.category);
  const rarityTheme = getRarityTheme(gift.rarity);
  const icon = gift.icon || categoryTheme.icon || "🎁";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {glow && (
        <div
          className="pointer-events-none absolute inset-2 rounded-2xl opacity-40 blur-xl transition-opacity group-hover:opacity-75"
          style={{ background: categoryTheme.glow || rarityTheme.glow }}
        />
      )}

      {/* Primary SVG Image */}
      {gift.image && !imgFailed ? (
        <img
          src={gift.image}
          alt={gift.name || "Gift"}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className={`relative z-10 ${imgClassName}`}
        />
      ) : (
        /* Rich Vector Fallback with Category Theme */
        <div
          className="relative z-10 w-full h-full rounded-2xl flex flex-col items-center justify-center p-2 border border-white/10"
          style={{
            background: `radial-gradient(circle at center, ${categoryTheme.accent}25 0%, rgba(15,23,42,0.8) 85%)`,
          }}
        >
          <span className={`${fallbackSize} filter drop-shadow-md`}>
            {icon}
          </span>
          <span className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-wider text-center line-clamp-1">
            {gift.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default GiftArtwork;
