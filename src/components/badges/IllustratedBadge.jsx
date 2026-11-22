import React from "react";
import { getBadgeArtwork } from "./badgeArtworkRegistry.jsx";

/**
 * IllustratedBadge Component
 * 
 * Renders a gaming-grade vector achievement badge with unique geometry,
 * custom silhouette frame, background texture, and milestone emblem motif.
 * Supports:
 * - Unlocked: Vibrant colors, metallic highlight glints, ambient drop-glow aura.
 * - In Progress: Crisp full artwork with balanced tone.
 * - Locked: Frosted gunmetal disc, muted silhouette, and security lock overlay.
 * - Featured: Golden floating star pill badge.
 */
export default function IllustratedBadge({
  slug = "first_message",
  badge = null,
  rarity = null,
  size = "md",
  showRibbon = true,
  isLocked = false,
  isInProgress = false,
  isFeatured = false,
  className = "",
  onClick = null,
}) {
  const actualSlug = badge?.slug || slug || "first_message";
  const artwork = getBadgeArtwork(actualSlug);

  // Determine rarity from badge, prop, or artwork default
  const actualRarity = (badge?.rarity || rarity || "common").toLowerCase();

  // Color palette from artwork
  const colors = artwork.colors;

  // Pixel sizing mapping
  const sizeMap = {
    xs: { px: 28, showRibbon: false, lockScale: 0.8 },
    sm: { px: 44, showRibbon: showRibbon, lockScale: 0.9 },
    md: { px: 64, showRibbon: showRibbon, lockScale: 1.0 },
    lg: { px: 96, showRibbon: showRibbon, lockScale: 1.2 },
    xl: { px: 128, showRibbon: showRibbon, lockScale: 1.4 },
  };

  const currentSize =
    typeof size === "number"
      ? { px: size, showRibbon: showRibbon, lockScale: size > 64 ? 1.2 : 0.9 }
      : sizeMap[size] || sizeMap.md;

  // Unique deterministic SVG gradient and filter IDs to prevent DOM ID collisions
  const safeSlug = actualSlug.replace(/[^a-zA-Z0-9_-]/g, "");
  const idPrefix = `chty-bdg-${safeSlug}-${actualRarity}`;

  // Interactive keyboard handler
  const handleKeyDown = (e) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${badge?.name || artwork.name} (${actualRarity.toUpperCase()}) ${
        isLocked ? "- Locked" : isInProgress ? "- In Progress" : "- Unlocked"
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-300 ease-out focus:outline-none ${
        onClick
          ? "cursor-pointer hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
          : ""
      } ${
        isLocked
          ? "opacity-65 grayscale-[35%]"
          : isInProgress
          ? "opacity-90"
          : "opacity-100"
      } ${className}`}
      style={{
        width: currentSize.px,
        height: currentSize.px,
        filter: isLocked
          ? "none"
          : `drop-shadow(0 6px 14px ${colors.glow})`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Outer Frame Metallic Gradient */}
          <linearGradient
            id={`${idPrefix}-outer`}
            x1="10"
            y1="6"
            x2="90"
            y2="94"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor={isLocked ? "#64748b" : colors.outer[0]}
            />
            <stop
              offset="50%"
              stopColor={isLocked ? "#475569" : colors.outer[1]}
            />
            <stop
              offset="100%"
              stopColor={isLocked ? "#334155" : colors.outer[2] || colors.outer[0]}
            />
          </linearGradient>

          {/* Inner Cavity Depth Radial Gradient */}
          <radialGradient
            id={`${idPrefix}-inner`}
            cx="50"
            cy="46"
            r="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor={isLocked ? "#1e293b" : colors.inner[0]}
            />
            <stop
              offset="70%"
              stopColor={isLocked ? "#0f172a" : colors.inner[1]}
            />
            <stop
              offset="100%"
              stopColor={isLocked ? "#020617" : colors.inner[2] || colors.inner[1]}
            />
          </radialGradient>

          {/* Satin Ribbon Gradient */}
          <linearGradient
            id={`${idPrefix}-ribbon`}
            x1="30"
            y1="55"
            x2="70"
            y2="95"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor={isLocked ? "#475569" : colors.ribbon[0]}
            />
            <stop
              offset="100%"
              stopColor={isLocked ? "#334155" : colors.ribbon[1] || colors.ribbon[0]}
            />
          </linearGradient>

          {/* Top Glint Rim Filter */}
          <filter
            id={`${idPrefix}-glint`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Unique Silhouette Frame Geometry */}
        {artwork.renderFrame({
          idPrefix,
          colors: isLocked
            ? {
                ...colors,
                accent: "#94a3b8",
                dark: "#0f172a",
              }
            : colors,
          isLocked,
        })}

        {/* 2. Unique Background Texture / Surface Pattern */}
        {artwork.renderTexture &&
          artwork.renderTexture({
            idPrefix,
            colors: isLocked
              ? {
                  ...colors,
                  accent: "#64748b",
                  dark: "#0f172a",
                }
              : colors,
            isLocked,
          })}

        {/* 3. Unique Vector Emblem Motif */}
        <g opacity={isLocked ? 0.35 : isInProgress ? 0.9 : 1}>
          {artwork.renderEmblem({
            idPrefix,
            colors: isLocked
              ? {
                  ...colors,
                  accent: "#94a3b8",
                  dark: "#0f172a",
                }
              : colors,
            isLocked,
          })}
        </g>

        {/* 4. Top Rim Specular Glint (On Unlocked / In-Progress) */}
        {!isLocked && (
          <path
            d="M30 20 Q50 12, 70 20"
            stroke={colors.accent}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeOpacity="0.8"
            filter={`url(#${idPrefix}-glint)`}
          />
        )}

        {/* 5. Frosted Padlock Overlay on Locked State */}
        {isLocked && (
          <g transform={`translate(${50 - 14 * currentSize.lockScale}, ${46 - 15 * currentSize.lockScale}) scale(${currentSize.lockScale})`}>
            {/* Padlock Drop Shadow Backdrop */}
            <circle cx="14" cy="15" r="16" fill="#020617" fillOpacity="0.75" />
            {/* Padlock Shackle */}
            <path
              d="M8 12 V8 C8 4.7 10.7 2 14 2 C17.3 2 20 4.7 20 8 V12"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Padlock Body */}
            <rect
              x="5"
              y="12"
              width="18"
              height="14"
              rx="3.5"
              fill="#1e293b"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            {/* Keyhole */}
            <circle cx="14" cy="18" r="2" fill="#e2e8f0" />
            <polygon points="13,18 15,18 16,22 12,22" fill="#e2e8f0" />
          </g>
        )}
      </svg>

      {/* Featured Star Floating Pill */}
      {isFeatured && (
        <span
          title="Featured on Profile"
          className="absolute -top-1 -right-1 size-5 sm:size-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-amber-950 flex items-center justify-center shadow-lg ring-2 ring-base-100 text-[10px] sm:text-xs font-black z-10 animate-fadeIn"
        >
          ★
        </span>
      )}
    </div>
  );
}
