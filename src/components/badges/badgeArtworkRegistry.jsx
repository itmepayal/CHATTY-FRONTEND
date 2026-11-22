import React from "react";

/**
 * CHATTY BADGE ARTWORK REGISTRY
 * 
 * Centralized registry defining unique visual identities for all 18 default badges + fallback.
 * Every badge features:
 * - Unique silhouette & frame geometry (Coin, Hex Shield, 8-Point Starburst, Butterfly Cartouche,
 *   Drafting Tile, Grecian Temple Pediment, Open Grimoire, Sunburst Flame, Heart-Shield,
 *   Die-Cut Sticker with Peeled Corner, Mariner's Astrolabe, Heavy Knight Aegis,
 *   Imperial 5-Spire Coronet, 12-Lobed Sunburst Squircle, Aerodynamic Speed Chevron,
 *   Pentagonal Captain Badge, Cinematic Aperture Star, Artist Paint Palette).
 * - Custom vector emblem motif representing the achievement milestone.
 * - Distinct background texture (ripples, equalizers, electric vortices, constellations,
 *   blueprint grids, pillar fluting, celestial stars, magma embers, gemstone facets,
 *   holographic prism, compass degrees, security lattice, velvet ermine, speed vectors,
 *   aperture shutter blades, paint splatters).
 * - Custom color gradients and atmospheric glows.
 */

export const BADGE_ARTWORK_REGISTRY = {
  // 1. FIRST WORDS (Common, messaging)
  first_message: {
    slug: "first_message",
    name: "First Words",
    shape: "coin_ribbon",
    colors: {
      outer: ["#cbd5e1", "#64748b", "#94a3b8"],
      inner: ["#334155", "#1e293b", "#0f172a"],
      accent: "#f1f5f9",
      dark: "#0f172a",
      glow: "rgba(148, 163, 184, 0.4)",
      ribbon: ["#64748b", "#475569"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Ribbon Tails */}
        <path
          d="M36 60 L24 92 L34 85 L44 92 L42 60 Z"
          fill={`url(#${idPrefix}-ribbon)`}
          stroke={colors.outer[1]}
          strokeWidth="1.2"
        />
        <path
          d="M64 60 L58 92 L68 85 L78 92 L66 60 Z"
          fill={`url(#${idPrefix}-ribbon)`}
          stroke={colors.outer[1]}
          strokeWidth="1.2"
        />
        {/* Concentric Milled Silver Coin */}
        <circle cx="50" cy="46" r="38" fill={`url(#${idPrefix}-outer)`} stroke={colors.accent} strokeWidth="1.5" />
        {/* Coin Milled Rim Notches */}
        <circle cx="50" cy="46" r="35" fill="none" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3 3.5" opacity="0.7" />
        <circle cx="50" cy="46" r="31" fill={`url(#${idPrefix}-inner)`} stroke={colors.outer[0]} strokeWidth="1.2" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.25">
        <circle cx="50" cy="46" r="12" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="50" cy="46" r="20" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="50" cy="46" r="27" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4 5" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(28, 24)">
        {/* Speech Bubble */}
        <path
          d="M6 14 C6 7.5, 13 4, 22 4 C31 4, 38 7.5, 38 14 C38 20.5, 31 24, 22 24 C18 24, 14.5 23, 11.5 21.5 L5 24 L6.8 19 C6.3 17.5, 6 15.8, 6 14 Z"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Writing Feather Quill Pen */}
        <path
          d="M16 34 L34 12 C36 10, 39 10.5, 39 13 C39 18, 34 29, 25 35 L16 37 L17.5 33 Z"
          fill={colors.accent}
          fillOpacity="0.95"
        />
        <line x1="19" y1="33" x2="33" y2="15" stroke={colors.dark} strokeWidth="1.2" strokeLinecap="round" />
        {/* Introductory Soundwave Dots */}
        <circle cx="15" cy="14" r="1.8" fill={colors.accent} />
        <circle cx="21" cy="14" r="1.8" fill={colors.accent} />
        <circle cx="27" cy="14" r="1.8" fill={colors.accent} />
      </g>
    ),
  },

  // 2. CHAT ENTHUSIAST (Uncommon, messaging)
  chat_enthusiast: {
    slug: "chat_enthusiast",
    name: "Chat Enthusiast",
    shape: "hex_shield",
    colors: {
      outer: ["#34d399", "#059669", "#10b981"],
      inner: ["#064e3b", "#022c22", "#064e3b"],
      accent: "#a7f3d0",
      dark: "#022c22",
      glow: "rgba(16, 185, 129, 0.5)",
      ribbon: ["#10b981", "#047857"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Hexagonal Armor Shield */}
        <polygon
          points="50,6 88,26 88,70 50,90 12,70 12,26"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Corner Rivet Studs */}
        <circle cx="50" cy="11" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        <circle cx="83" cy="28" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        <circle cx="83" cy="68" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        <circle cx="50" cy="85" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        <circle cx="17" cy="68" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        <circle cx="17" cy="28" r="2.2" fill={colors.dark} stroke={colors.accent} strokeWidth="1" />
        {/* Inner Hex Cavity */}
        <polygon
          points="50,14 81,31 81,66 50,82 19,66 19,31"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Audio Equalizer Bars */}
        <line x1="32" y1="58" x2="32" y2="44" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="62" x2="38" y2="40" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="44" y1="65" x2="44" y2="36" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="68" x2="50" y2="34" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="56" y1="65" x2="56" y2="37" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="62" y1="61" x2="62" y2="41" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="57" x2="68" y2="45" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Primary Dialogue Cloud */}
        <path
          d="M8 14 C8 8, 14 5, 23 5 C32 5, 38 8, 38 14 C38 20, 32 23, 23 23 C19 23, 16 22.2, 13.5 20.8 L7 23 L9 18 C8.4 16.8, 8 15.4, 8 14 Z"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Secondary Vibrating Cloud */}
        <path
          d="M27 21 C29.5 21, 33 21.6, 35 23 L39 25 L37.5 21.5 C38.5 20.5, 39 19, 39 17.5 C39 13.5, 34 11, 27 11"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeDasharray="2.5 1.5"
          strokeLinecap="round"
        />
        {/* Energy Pulse Rings */}
        <circle cx="17" cy="14" r="2.2" fill={colors.accent} />
        <circle cx="23" cy="14" r="2.2" fill={colors.accent} />
        <circle cx="29" cy="14" r="2.2" fill={colors.accent} />
      </g>
    ),
  },

  // 3. CHAT MASTER (Epic, messaging)
  chat_master: {
    slug: "chat_master",
    name: "Chat Master",
    shape: "starburst_shield",
    colors: {
      outer: ["#c084fc", "#7e22ce", "#a855f7"],
      inner: ["#581c87", "#3b0764", "#2e1065"],
      accent: "#f3e8ff",
      dark: "#2e1065",
      glow: "rgba(168, 85, 247, 0.65)",
      ribbon: ["#9333ea", "#6b21a8"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* 8-Point Faceted Diamond Starburst */}
        <polygon
          points="50,4 62,24 86,24 74,44 92,62 70,68 64,92 50,76 36,92 30,68 8,62 26,44 14,24 38,24"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Inner Octagonal Shield */}
        <polygon
          points="50,15 72,28 80,50 72,72 50,77 28,72 20,50 28,28"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.4"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.35">
        {/* Electric Spark Field */}
        <line x1="50" y1="18" x2="50" y2="74" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="22" y1="50" x2="78" y2="50" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <circle cx="35" cy="35" r="1.5" fill="#22d3ee" />
        <circle cx="65" cy="35" r="1.5" fill="#22d3ee" />
        <circle cx="65" cy="65" r="1.5" fill="#22d3ee" />
        <circle cx="35" cy="65" r="1.5" fill="#22d3ee" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(27, 24)">
        {/* Dynamic Lightning Bolt Slicing through Matrix */}
        <polygon
          points="27,2 15,22 24,22 18,42 33,19 24,19"
          fill={colors.accent}
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Flanking Electric Sparks */}
        <polygon points="9,14 11,18 15,18 12,20 13,24 10,21 7,24 8,20 5,18 9,18" fill="#22d3ee" />
        <polygon points="36,14 38,18 42,18 39,20 40,24 37,21 34,24 35,20 32,18 36,18" fill="#22d3ee" />
      </g>
    ),
  },

  // 4. SOCIAL BUTTERFLY (Rare, social)
  social_butterfly: {
    slug: "social_butterfly",
    name: "Social Butterfly",
    shape: "butterfly_cartouche",
    colors: {
      outer: ["#38bdf8", "#0284c7", "#0ea5e9"],
      inner: ["#0c4a6e", "#082f49", "#0369a1"],
      accent: "#bae6fd",
      dark: "#082f49",
      glow: "rgba(14, 165, 233, 0.55)",
      ribbon: ["#0284c7", "#0369a1"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Scalloped Winged Cartouche */}
        <path
          d="M50 10 C65 6, 85 14, 90 32 C94 45, 84 60, 88 74 C90 84, 76 92, 50 88 C24 92, 10 84, 12 74 C16 60, 6 45, 10 32 C15 14, 35 6, 50 10 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* Inner Wing Cutout */}
        <path
          d="M50 17 C62 14, 78 20, 82 35 C85 46, 76 58, 80 69 C81 77, 70 82, 50 79 C30 82, 19 77, 20 69 C24 58, 15 46, 18 35 C22 20, 38 14, 50 17 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Network Constellation Threads */}
        <line x1="28" y1="36" x2="50" y2="28" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="72" y1="36" x2="50" y2="28" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="28" y1="36" x2="32" y2="65" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="72" y1="36" x2="68" y2="65" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="32" y1="65" x2="50" y2="72" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="68" y1="65" x2="50" y2="72" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 2" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(25, 25)">
        {/* Butterfly Body & Antennae */}
        <line x1="25" y1="8" x2="25" y2="38" stroke={colors.accent} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M25 10 Q20 3, 14 5 M25 10 Q30 3, 36 5" stroke={colors.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Left Wings */}
        <path
          d="M24 14 Q10 8, 5 20 Q2 29, 14 31 Q6 38, 11 42 Q19 44, 24 33"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Right Wings */}
        <path
          d="M26 14 Q40 8, 45 20 Q48 29, 36 31 Q44 38, 39 42 Q31 44, 26 33"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Illuminated Social Nodes */}
        <circle cx="25" cy="9" r="2.8" fill={colors.accent} />
        <circle cx="8" cy="20" r="2.2" fill={colors.accent} />
        <circle cx="42" cy="20" r="2.2" fill={colors.accent} />
        <circle cx="12" cy="40" r="2" fill={colors.accent} />
        <circle cx="38" cy="40" r="2" fill={colors.accent} />
      </g>
    ),
  },

  // 5. GROUP ARCHITECT (Uncommon, group)
  group_creator: {
    slug: "group_creator",
    name: "Group Architect",
    shape: "drafting_tile",
    colors: {
      outer: ["#2dd4bf", "#0d9488", "#14b8a6"],
      inner: ["#134e4a", "#042f2e", "#115e59"],
      accent: "#ccfbf1",
      dark: "#042f2e",
      glow: "rgba(20, 184, 166, 0.5)",
      ribbon: ["#0d9488", "#115e59"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Chamfered Architect's Drafting Tile */}
        <polygon
          points="24,8 76,8 92,24 92,76 76,92 24,92 8,76 8,24"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* Blueprint Precision Perimeter with Ruler Marks */}
        <polygon
          points="27,15 73,15 85,27 85,73 73,85 27,85 15,73 15,27"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.25">
        {/* Isometric Drafting Grid */}
        <line x1="15" y1="35" x2="85" y2="35" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="15" y1="50" x2="85" y2="50" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="15" y1="65" x2="85" y2="65" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="35" y1="15" x2="35" y2="85" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="50" y1="15" x2="50" y2="85" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
        <line x1="65" y1="15" x2="65" y2="85" stroke={colors.accent} strokeWidth="0.8" strokeDasharray="3 3" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Architect's Compass Drawing Connected Avatars */}
        <path d="M24 6 L12 38 M24 6 L36 38" stroke={colors.accent} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="6" r="3.5" fill={colors.accent} />
        <path d="M16 26 Q24 22, 32 26" stroke={colors.accent} strokeWidth="1.8" fill="none" />
        {/* Connected Team Avatars (Triad) */}
        <circle cx="24" cy="18" r="3.2" fill={colors.accent} />
        <circle cx="12" cy="38" r="3.5" fill={colors.accent} />
        <circle cx="36" cy="38" r="3.5" fill={colors.accent} />
        <circle cx="24" cy="38" r="3" fill="#0d9488" stroke={colors.accent} strokeWidth="1.5" />
      </g>
    ),
  },

  // 6. COMMUNITY PILLAR (Epic, community)
  community_builder: {
    slug: "community_builder",
    name: "Community Pillar",
    shape: "acropolis_pediment",
    colors: {
      outer: ["#c084fc", "#7c3aed", "#9333ea"],
      inner: ["#581c87", "#3b0764", "#4c1d95"],
      accent: "#fae8ff",
      dark: "#3b0764",
      glow: "rgba(147, 51, 234, 0.65)",
      ribbon: ["#7c3aed", "#581c87"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Classical Grecian Arch & Pediment */}
        <path
          d="M50 6 L88 28 L88 88 L12 88 L12 28 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Keystone Arch Opening */}
        <path
          d="M50 14 L81 33 L81 82 L19 82 L19 33 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
        {/* Dental Moulding along Cornice */}
        <line x1="16" y1="31" x2="84" y2="31" stroke={colors.accent} strokeWidth="1.8" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Fluted Marble Lines */}
        <line x1="30" y1="42" x2="30" y2="78" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 3" />
        <line x1="50" y1="42" x2="50" y2="78" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 3" />
        <line x1="70" y1="42" x2="70" y2="78" stroke={colors.accent} strokeWidth="1" strokeDasharray="2 3" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Triad of Classical Columns Supporting Keystoned Arch */}
        {/* Base */}
        <rect x="4" y="38" width="40" height="4" rx="1.5" fill={colors.accent} />
        {/* Capital Architrave */}
        <rect x="6" y="12" width="36" height="3.5" rx="1" fill={colors.accent} />
        {/* Fluted Columns */}
        <line x1="12" y1="15" x2="12" y2="38" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
        <line x1="24" y1="15" x2="24" y2="38" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
        <line x1="36" y1="15" x2="36" y2="38" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
        {/* Crown Keystone Jewel */}
        <polygon points="24,2 30,9 18,9" fill={colors.accent} />
        <circle cx="24" cy="6" r="1.5" fill="#581c87" />
      </g>
    ),
  },

  // 7. STORYTELLER (Rare, creator)
  story_creator: {
    slug: "story_creator",
    alias: "storyteller",
    name: "Storyteller",
    shape: "open_grimoire",
    colors: {
      outer: ["#60a5fa", "#1d4ed8", "#2563eb"],
      inner: ["#1e1b4b", "#0f172a", "#1e3a8a"],
      accent: "#fef08a",
      dark: "#0f172a",
      glow: "rgba(37, 99, 235, 0.55)",
      ribbon: ["#1d4ed8", "#1e1b4b"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Open Illuminated Tome Frame */}
        <path
          d="M50 14 C65 8, 85 10, 92 18 L92 82 C85 76, 65 74, 50 80 C35 74, 15 76, 8 82 L8 18 C15 10, 35 8, 50 14 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* Inner Parchment Surface */}
        <path
          d="M50 20 C63 15, 80 16, 86 23 L86 76 C80 71, 63 69, 50 74 C37 69, 20 71, 14 76 L14 23 C20 16, 37 15, 50 20 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Celestial Constellation Points on Pages */}
        <circle cx="26" cy="34" r="1.5" fill={colors.accent} />
        <circle cx="36" cy="46" r="1.5" fill={colors.accent} />
        <circle cx="24" cy="58" r="1.5" fill={colors.accent} />
        <line x1="26" y1="34" x2="36" y2="46" stroke={colors.accent} strokeWidth="0.8" />
        <circle cx="74" cy="34" r="1.5" fill={colors.accent} />
        <circle cx="64" cy="46" r="1.5" fill={colors.accent} />
        <circle cx="76" cy="58" r="1.5" fill={colors.accent} />
        <line x1="74" y1="34" x2="64" y2="46" stroke={colors.accent} strokeWidth="0.8" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 25)">
        {/* 8-Point Starlight Story Quill Rising from Spine */}
        <path
          d="M24 4 L27 16 L39 19 L27 22 L24 34 L21 22 L9 19 L21 16 Z"
          fill={colors.accent}
          stroke="#1d4ed8"
          strokeWidth="1.2"
        />
        <circle cx="24" cy="19" r="3.5" fill="#1e1b4b" stroke={colors.accent} strokeWidth="1" />
        {/* Open Book Pages Ribbons */}
        <path d="M12 36 Q24 31, 36 36" stroke={colors.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M12 40 Q24 35, 36 40" stroke={colors.accent} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    ),
  },

  // 8. STREAK MASTER (Legendary, activity)
  streak_master: {
    slug: "streak_master",
    name: "Streak Master",
    shape: "flame_sunburst",
    colors: {
      outer: ["#fbbf24", "#d97706", "#f59e0b"],
      inner: ["#78350f", "#451a03", "#7c2d12"],
      accent: "#fef3c7",
      dark: "#451a03",
      glow: "rgba(245, 158, 11, 0.7)",
      ribbon: ["#f59e0b", "#b45309"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Stepped Solar Flame Wings */}
        <path
          d="M50 4 Q72 16, 76 34 Q82 30, 88 44 Q94 60, 82 76 Q70 92, 50 94 Q30 92, 18 76 Q6 60, 12 44 Q18 30, 24 34 Q28 16, 50 4 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="2"
        />
        {/* Inner Volcanic Fire Crucible */}
        <path
          d="M50 14 Q66 24, 70 38 Q74 34, 79 46 Q84 59, 74 72 Q64 84, 50 86 Q36 84, 26 72 Q16 59, 21 46 Q26 34, 30 38 Q34 24, 50 14 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.4"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.4">
        {/* Convection Heat Waves and Embers */}
        <circle cx="36" cy="62" r="1.8" fill="#ef4444" />
        <circle cx="64" cy="58" r="1.8" fill="#facc15" />
        <circle cx="48" cy="74" r="2.2" fill="#ef4444" />
        <circle cx="56" cy="30" r="1.4" fill="#fef08a" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 24)">
        {/* Triple Roaring Olympic Flame with Incandescent Core */}
        <path
          d="M24 3 Q33 13, 33 22 Q33 34, 24 39 Q15 34, 15 22 Q15 15, 24 3 Z"
          fill={colors.accent}
        />
        <path
          d="M24 14 Q29 20, 29 25 Q29 33, 24 36 Q19 33, 19 25 Q19 20, 24 14 Z"
          fill="#d97706"
        />
        <path
          d="M24 23 Q26.5 26, 26.5 29 Q26.5 33, 24 35 Q21.5 33, 21.5 29 Q21.5 26, 24 23 Z"
          fill="#ef4444"
        />
      </g>
    ),
  },

  // 9. GENEROUS HEART (Rare, engagement)
  generous_heart: {
    slug: "generous_heart",
    name: "Generous Heart",
    shape: "heart_shield",
    colors: {
      outer: ["#fb7185", "#e11d48", "#f43f5e"],
      inner: ["#881337", "#4c0519", "#701a75"],
      accent: "#ffe4e6",
      dark: "#4c0519",
      glow: "rgba(244, 63, 94, 0.6)",
      ribbon: ["#e11d48", "#be123c"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Heraldic Winged Heart Crest */}
        <path
          d="M50 26 C50 26, 36 6, 20 6 C8 6, 4 18, 4 28 C4 48, 28 68, 50 90 C72 68, 96 48, 96 28 C96 18, 92 6, 80 6 C64 6, 50 26, 50 26 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* Inner Heart Gemstone Facet */}
        <path
          d="M50 32 C50 32, 38 14, 24 14 C14 14, 11 23, 11 31 C11 48, 32 64, 50 82 C68 64, 89 48, 89 31 C89 23, 86 14, 76 14 C62 14, 50 32, 50 32 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Heart Glint Dust */}
        <circle cx="34" cy="30" r="1.5" fill="#fef08a" />
        <circle cx="66" cy="30" r="1.5" fill="#fef08a" />
        <circle cx="50" cy="52" r="2" fill="#fef08a" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 24)">
        {/* Faceted Ruby Heart Floating above Gift Box */}
        <path
          d="M24 8 C24 8, 17 2, 11 2 C6 2, 3 6, 3 11 C3 20, 15 28, 24 35 C33 28, 45 20, 45 11 C45 6, 42 2, 37 2 C31 2, 24 8, 24 8 Z"
          fill={colors.accent}
          stroke="#e11d48"
          strokeWidth="1.5"
        />
        {/* Golden Gift Box Ribbon Wings */}
        <path d="M10 26 Q17 22, 24 26 Q31 22, 38 26" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <line x1="24" y1="24" x2="24" y2="38" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#fbbf24" />
      </g>
    ),
  },

  // 10. STICKER COLLECTOR (Uncommon, engagement)
  sticker_collector: {
    slug: "sticker_collector",
    name: "Sticker Collector",
    shape: "peeled_stamp",
    colors: {
      outer: ["#34d399", "#059669", "#10b981"],
      inner: ["#064e3b", "#022c22", "#064e3b"],
      accent: "#a7f3d0",
      dark: "#022c22",
      glow: "rgba(16, 185, 129, 0.5)",
      ribbon: ["#10b981", "#047857"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Die-Cut Hexagon Stamp with Top-Right Folded Corner */}
        <path
          d="M12 28 L50 8 L72 20 L72 32 L88 48 L88 72 L50 92 L12 72 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* 3D Peeled Corner Flap */}
        <polygon points="72,20 88,48 72,48" fill="#cbd5e1" stroke={colors.accent} strokeWidth="1.2" />
        {/* Inner Vinyl Surface */}
        <path
          d="M18 32 L48 16 L66 26 L66 44 L82 56 L82 68 L50 84 L18 68 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Prismatic Hologram Bands */}
        <line x1="24" y1="36" x2="68" y2="76" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.4" />
        <line x1="30" y1="32" x2="74" y2="72" stroke="#f43f5e" strokeWidth="2" strokeOpacity="0.4" />
        <line x1="36" y1="28" x2="80" y2="68" stroke="#facc15" strokeWidth="2" strokeOpacity="0.4" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Layered Winking Sticker Stamp & Stars */}
        <rect x="6" y="8" width="22" height="22" rx="5" fill={colors.accent} stroke="#059669" strokeWidth="1.5" />
        <circle cx="13" cy="16" r="2" fill="#064e3b" />
        <path d="M19 14 L23 18 M23 14 L19 18" stroke="#064e3b" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 23 Q17 27, 21 23" stroke="#064e3b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Star Sticker overlapping */}
        <polygon points="34,18 36,23 41,23 37,26 39,31 34,28 29,31 31,26 27,23 32,23" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      </g>
    ),
  },

  // 11. PIONEER / EARLY ADOPTER (Rare, special_event)
  early_adopter: {
    slug: "early_adopter",
    name: "Pioneer",
    shape: "astrolabe_rose",
    colors: {
      outer: ["#38bdf8", "#0284c7", "#0ea5e9"],
      inner: ["#0c4a6e", "#082f49", "#0369a1"],
      accent: "#bae6fd",
      dark: "#082f49",
      glow: "rgba(14, 165, 233, 0.55)",
      ribbon: ["#0284c7", "#0369a1"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Heavy Brass Mariner's Astrolabe Dial */}
        <circle cx="50" cy="50" r="42" fill={`url(#${idPrefix}-outer)`} stroke={colors.accent} strokeWidth="1.8" />
        {/* 360-Degree Degree Hash Marks */}
        <circle cx="50" cy="50" r="38" fill="none" stroke={colors.accent} strokeWidth="1.4" strokeDasharray="2 3" opacity="0.8" />
        {/* Inner Nautical Chamber */}
        <circle cx="50" cy="50" r="33" fill={`url(#${idPrefix}-inner)`} stroke={colors.accent} strokeWidth="1.2" />
        {/* Cardinal Direction Indicators */}
        <text x="50" y="18" textAnchor="middle" fill={colors.accent} fontSize="7" fontWeight="bold">N</text>
        <text x="84" y="52" textAnchor="middle" fill={colors.accent} fontSize="7" fontWeight="bold">E</text>
        <text x="50" y="86" textAnchor="middle" fill={colors.accent} fontSize="7" fontWeight="bold">S</text>
        <text x="16" y="52" textAnchor="middle" fill={colors.accent} fontSize="7" fontWeight="bold">W</text>
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Navigation Rhumb Lines */}
        <line x1="24" y1="24" x2="76" y2="76" stroke={colors.accent} strokeWidth="0.8" />
        <line x1="76" y1="24" x2="24" y2="76" stroke={colors.accent} strokeWidth="0.8" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* 8-Point Faceted Compass Rose Star */}
        <polygon points="24,4 28,20 24,24" fill={colors.accent} />
        <polygon points="24,4 20,20 24,24" fill="#0284c7" />
        <polygon points="24,44 28,28 24,24" fill="#0284c7" />
        <polygon points="24,44 20,28 24,24" fill={colors.accent} />
        <polygon points="44,24 28,28 24,24" fill={colors.accent} />
        <polygon points="44,24 28,20 24,24" fill="#0284c7" />
        <polygon points="4,24 20,28 24,24" fill="#0284c7" />
        <polygon points="4,24 20,20 24,24" fill={colors.accent} />
        <circle cx="24" cy="24" r="3.2" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
      </g>
    ),
  },

  // 12. VERIFIED OFFICIAL (Mythic, official)
  verified_official: {
    slug: "verified_official",
    name: "Verified Official",
    shape: "heavy_knight_aegis",
    colors: {
      outer: ["#f43f5e", "#a855f7", "#ec4899"],
      inner: ["#881337", "#4c0519", "#581c87"],
      accent: "#ffe4e6",
      dark: "#4c0519",
      glow: "rgba(244, 63, 94, 0.7)",
      ribbon: ["#e11d48", "#9333ea"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Heavy Riveted Aegis Shield with Crown Crenellations */}
        <path
          d="M50 4 L86 14 C86 46, 74 74, 50 94 C26 74, 14 46, 14 14 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="2"
        />
        {/* Titanium Corner Rivets */}
        <circle cx="50" cy="11" r="2.4" fill="#06b6d4" stroke={colors.accent} strokeWidth="1" />
        <circle cx="80" cy="22" r="2" fill="#06b6d4" stroke={colors.accent} strokeWidth="1" />
        <circle cx="76" cy="56" r="2" fill="#06b6d4" stroke={colors.accent} strokeWidth="1" />
        <circle cx="24" cy="56" r="2" fill="#06b6d4" stroke={colors.accent} strokeWidth="1" />
        <circle cx="20" cy="22" r="2" fill="#06b6d4" stroke={colors.accent} strokeWidth="1" />
        {/* Inner Shield Matrix */}
        <path
          d="M50 14 L78 22 C78 48, 68 70, 50 85 C32 70, 22 48, 22 22 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.4"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.35">
        {/* Cryptographic Security Grid Lattice */}
        <line x1="30" y1="28" x2="70" y2="28" stroke="#06b6d4" strokeWidth="0.8" />
        <line x1="28" y1="44" x2="72" y2="44" stroke="#06b6d4" strokeWidth="0.8" />
        <line x1="32" y1="60" x2="68" y2="60" stroke="#06b6d4" strokeWidth="0.8" />
        <line x1="40" y1="20" x2="40" y2="75" stroke="#06b6d4" strokeWidth="0.8" />
        <line x1="60" y1="20" x2="60" y2="75" stroke="#06b6d4" strokeWidth="0.8" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Faceted Cyber-Security Diamond Checkmark */}
        <path
          d="M12 24 L20 32 L36 14"
          fill="none"
          stroke={colors.accent}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 24 L20 32 L36 14"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ),
  },

  // 13. VIP ELITE (Legendary, admin_awarded)
  vip_member: {
    slug: "vip_member",
    name: "VIP Elite",
    shape: "imperial_coronet",
    colors: {
      outer: ["#fbbf24", "#d97706", "#fef08a"],
      inner: ["#78350f", "#451a03", "#7c2d12"],
      accent: "#fef9c3",
      dark: "#451a03",
      glow: "rgba(245, 158, 11, 0.75)",
      ribbon: ["#f59e0b", "#b45309"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Grand Imperial Sovereign Coronet Frame */}
        <path
          d="M14 68 L16 34 L32 48 L50 20 L68 48 L84 34 L86 68 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Imperial Gold Circlet Base */}
        <rect x="12" y="70" width="76" height="14" rx="4" fill={`url(#${idPrefix}-outer)`} stroke={colors.accent} strokeWidth="1.8" />
        {/* Jeweled Cabochons along Circlet */}
        <circle cx="24" cy="77" r="3" fill="#ef4444" stroke={colors.accent} strokeWidth="1" />
        <circle cx="37" cy="77" r="3" fill="#10b981" stroke={colors.accent} strokeWidth="1" />
        <circle cx="50" cy="77" r="3.5" fill="#3b82f6" stroke={colors.accent} strokeWidth="1" />
        <circle cx="63" cy="77" r="3" fill="#10b981" stroke={colors.accent} strokeWidth="1" />
        <circle cx="76" cy="77" r="3" fill="#ef4444" stroke={colors.accent} strokeWidth="1" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.35">
        {/* Regal Ermine Velvet Texture */}
        <polygon points="50,38 52,44 48,44" fill={colors.accent} />
        <polygon points="34,54 36,60 32,60" fill={colors.accent} />
        <polygon points="66,54 68,60 64,60" fill={colors.accent} />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 20)">
        {/* Spires Crown Pearls */}
        <circle cx="2" cy="14" r="3.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
        <circle cx="24" cy="2" r="4.2" fill="#fef08a" stroke="#b45309" strokeWidth="1.2" />
        <circle cx="46" cy="14" r="3.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
        {/* Crossed Royal Sceptres */}
        <line x1="8" y1="42" x2="40" y2="18" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="40" y1="42" x2="8" y2="18" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="24,20 28,26 24,32 20,26" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
      </g>
    ),
  },

  // 14. FRIENDLY FACE (Common, social)
  friendly_face: {
    slug: "friendly_face",
    name: "Friendly Face",
    shape: "sunburst_squircle",
    colors: {
      outer: ["#cbd5e1", "#64748b", "#94a3b8"],
      inner: ["#334155", "#1e293b", "#0f172a"],
      accent: "#f1f5f9",
      dark: "#0f172a",
      glow: "rgba(148, 163, 184, 0.4)",
      ribbon: ["#64748b", "#475569"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* 12-Lobed Sunburst Squircle Frame */}
        <path
          d="M50 8 C62 8, 72 12, 80 20 C88 28, 92 38, 92 50 C92 62, 88 72, 80 80 C72 88, 62 92, 50 92 C38 92, 28 88, 20 80 C12 72, 8 62, 8 50 C8 38, 12 28, 20 20 C28 12, 38 8, 50 8 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        <circle cx="50" cy="50" r="34" fill={`url(#${idPrefix}-inner)`} stroke={colors.accent} strokeWidth="1.2" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Soft Radial Sunbeam Rings */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 4" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Warm Smiling Face with Halo */}
        <circle cx="24" cy="24" r="16" fill="none" stroke={colors.accent} strokeWidth="2.4" />
        <circle cx="18" cy="20" r="2.2" fill={colors.accent} />
        <circle cx="30" cy="20" r="2.2" fill={colors.accent} />
        <path d="M16 26 Q24 33, 32 26" stroke={colors.accent} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* Welcoming Halo / Wave Gesture */}
        <path d="M12 12 Q24 6, 36 12" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    ),
  },

  // 15. REPLY CHAMPION (Rare, messaging)
  reply_champion: {
    slug: "reply_champion",
    name: "Reply Champion",
    shape: "chevron_speed",
    colors: {
      outer: ["#38bdf8", "#0284c7", "#2563eb"],
      inner: ["#1e3a8a", "#0f172a", "#172554"],
      accent: "#dbeafe",
      dark: "#0f172a",
      glow: "rgba(2, 132, 199, 0.55)",
      ribbon: ["#0284c7", "#1d4ed8"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Dual Aerodynamic Speed Chevron Shield */}
        <polygon
          points="50,6 92,28 78,56 92,86 50,96 8,86 22,56 8,28"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <polygon
          points="50,15 82,33 70,56 82,79 50,87 18,79 30,56 18,33"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.35">
        {/* Speed Propulsion Vectors */}
        <line x1="30" y1="40" x2="50" y2="30" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="56" x2="70" y2="56" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="72" x2="50" y2="82" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Dual Conversational Reply Arrows Forming Ignition Spark */}
        <path
          d="M12 18 L24 8 L24 14 C34 14, 38 18, 38 28 C34 22, 30 20, 24 20 L24 26 Z"
          fill={colors.accent}
        />
        {/* Ignition Spark Star */}
        <polygon points="34,10 36,15 41,15 37,18 39,23 34,20 29,23 31,18 27,15 32,15" fill="#facc15" />
      </g>
    ),
  },

  // 16. GROUP LEADER (Rare, group)
  group_leader: {
    slug: "group_leader",
    name: "Group Leader",
    shape: "captain_crest",
    colors: {
      outer: ["#38bdf8", "#0284c7", "#0369a1"],
      inner: ["#0c4a6e", "#082f49", "#082f49"],
      accent: "#bae6fd",
      dark: "#082f49",
      glow: "rgba(3, 105, 161, 0.55)",
      ribbon: ["#0284c7", "#075985"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Pentagonal Officer Badge */}
        <polygon
          points="50,6 90,26 78,88 22,88 10,26"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <polygon
          points="50,15 82,31 72,80 28,80 18,31"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
        {/* Double Captain Chevrons along Base */}
        <path d="M28 72 L50 82 L72 72" stroke={colors.accent} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M32 64 L50 72 L68 64" stroke={colors.accent} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        {/* Strategic Command Grid */}
        <circle cx="50" cy="46" r="18" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="3 3" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 24)">
        {/* Central 5-Point Commanding Officer Star */}
        <polygon
          points="24,6 29,18 42,18 31,26 35,38 24,30 13,38 17,26 6,18 19,18"
          fill={colors.accent}
          stroke="#0284c7"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="22" r="3" fill="#0c4a6e" />
      </g>
    ),
  },

  // 17. STORY STAR (Epic, creator)
  story_star: {
    slug: "story_star",
    name: "Story Star",
    shape: "cinema_star",
    colors: {
      outer: ["#c084fc", "#d946ef", "#a855f7"],
      inner: ["#4c1d95", "#3b0764", "#581c87"],
      accent: "#fae8ff",
      dark: "#3b0764",
      glow: "rgba(168, 85, 247, 0.65)",
      ribbon: ["#a855f7", "#7e22ce"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* 6-Blade Camera Iris Aperture Star Rim */}
        <polygon
          points="50,4 64,22 86,16 80,38 98,50 80,62 86,84 64,78 50,96 36,78 14,84 20,62 2,50 20,38 14,16 36,22"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="28" fill={`url(#${idPrefix}-inner)`} stroke={colors.accent} strokeWidth="1.4" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.35">
        {/* Aperture Shutter Blades */}
        <line x1="50" y1="22" x2="32" y2="44" stroke={colors.accent} strokeWidth="1.4" />
        <line x1="72" y1="36" x2="52" y2="60" stroke={colors.accent} strokeWidth="1.4" />
        <line x1="68" y1="68" x2="40" y2="66" stroke={colors.accent} strokeWidth="1.4" />
        <line x1="50" y1="78" x2="68" y2="56" stroke={colors.accent} strokeWidth="1.4" />
        <line x1="28" y1="64" x2="48" y2="40" stroke={colors.accent} strokeWidth="1.4" />
        <line x1="32" y1="32" x2="60" y2="34" stroke={colors.accent} strokeWidth="1.4" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Brilliant Faceted Cinema Star & Spotlight Flare */}
        <polygon
          points="24,2 29,15 43,15 32,24 36,37 24,29 12,37 16,24 5,15 19,15"
          fill={colors.accent}
          stroke="#d946ef"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="20" r="3.5" fill="#fef08a" />
      </g>
    ),
  },

  // 18. STICKER LOVER (Uncommon, engagement)
  sticker_lover: {
    slug: "sticker_lover",
    name: "Sticker Lover",
    shape: "artist_palette",
    colors: {
      outer: ["#34d399", "#059669", "#10b981"],
      inner: ["#064e3b", "#022c22", "#064e3b"],
      accent: "#a7f3d0",
      dark: "#022c22",
      glow: "rgba(16, 185, 129, 0.5)",
      ribbon: ["#10b981", "#047857"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        {/* Artist Wooden Palette with Thumb Cutout */}
        <path
          d="M50 8 C74 8, 92 24, 92 48 C92 70, 78 88, 58 88 C48 88, 44 80, 36 80 C28 80, 24 88, 16 88 C8 88, 8 72, 8 50 C8 24, 26 8, 50 8 Z"
          fill={`url(#${idPrefix}-outer)`}
          stroke={colors.accent}
          strokeWidth="1.8"
        />
        {/* Thumb Hole */}
        <ellipse cx="68" cy="68" rx="6" ry="8" fill={colors.dark} stroke={colors.accent} strokeWidth="1.2" />
        {/* Inner Surface */}
        <path
          d="M50 14 C70 14, 85 28, 85 48 C85 64, 76 76, 62 78 C56 64, 72 54, 76 60 C78 64, 76 68, 72 70 C60 76, 44 74, 38 74 C30 74, 26 82, 18 82 C14 82, 14 68, 14 50 C14 28, 28 14, 50 14 Z"
          fill={`url(#${idPrefix}-inner)`}
          stroke={colors.accent}
          strokeWidth="1.2"
        />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.4">
        {/* Paint Swatches on Palette */}
        <circle cx="28" cy="24" r="4" fill="#ef4444" />
        <circle cx="48" cy="22" r="4" fill="#facc15" />
        <circle cx="68" cy="28" r="4" fill="#38bdf8" />
        <circle cx="24" cy="44" r="4" fill="#a855f7" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 26)">
        {/* Artist Brush Swirling Expressive Rainbow Stroke */}
        <path d="M12 36 Q24 24, 36 28" stroke={colors.accent} strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Wink Eye Emoji Splat */}
        <circle cx="24" cy="20" r="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <path d="M22 20 L26 20" stroke="#000" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    ),
  },

  // FALLBACK DEFAULT BADGE (Canonical Laureled Star Award)
  default: {
    slug: "default",
    name: "Achievement Medal",
    shape: "laureled_star",
    colors: {
      outer: ["#cbd5e1", "#64748b", "#94a3b8"],
      inner: ["#334155", "#1e293b", "#0f172a"],
      accent: "#f1f5f9",
      dark: "#0f172a",
      glow: "rgba(148, 163, 184, 0.4)",
      ribbon: ["#64748b", "#475569"],
    },
    renderFrame: ({ idPrefix, colors }) => (
      <g>
        <circle cx="50" cy="46" r="38" fill={`url(#${idPrefix}-outer)`} stroke={colors.accent} strokeWidth="1.5" />
        <circle cx="50" cy="46" r="32" fill={`url(#${idPrefix}-inner)`} stroke={colors.accent} strokeWidth="1.2" />
      </g>
    ),
    renderTexture: ({ colors }) => (
      <g opacity="0.3">
        <circle cx="50" cy="46" r="22" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="3 3" />
      </g>
    ),
    renderEmblem: ({ colors }) => (
      <g transform="translate(26, 22)">
        <polygon
          points="24,6 29,18 42,18 31,26 35,38 24,30 13,38 17,26 6,18 19,18"
          fill={colors.accent}
        />
        <circle cx="24" cy="22" r="4" fill="#0f172a" />
      </g>
    ),
  },
};

/**
 * Helper to retrieve badge artwork configuration by slug or alias.
 */
export function getBadgeArtwork(slugOrBadge) {
  const slug = (
    typeof slugOrBadge === "string"
      ? slugOrBadge
      : slugOrBadge?.slug || slugOrBadge?.badgeSlug || slugOrBadge?.badge?.slug || ""
  ).toLowerCase();

  // Explicit alias check
  if (slug === "storyteller") {
    return BADGE_ARTWORK_REGISTRY.story_creator;
  }

  return BADGE_ARTWORK_REGISTRY[slug] || BADGE_ARTWORK_REGISTRY.default;
}
