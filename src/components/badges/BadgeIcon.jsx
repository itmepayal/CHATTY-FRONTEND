import React from "react";
import {
  MessageSquare,
  MessageCircle,
  Zap,
  Users,
  UserPlus,
  Building2,
  Sparkles,
  Flame,
  Gift,
  Smile,
  Compass,
  ShieldCheck,
  Crown,
  Award,
  Trophy,
  Star,
  Medal,
  Heart,
  Shield,
  CheckCircle2,
  Activity,
  Target,
  Rocket,
  PartyPopper,
  Camera,
  Image,
  Coins,
  Gem,
} from "lucide-react";

export const BADGE_ICONS = {
  MessageSquare,
  MessageCircle,
  Zap,
  Users,
  UserPlus,
  Building2,
  Sparkles,
  Flame,
  Gift,
  Smile,
  Compass,
  ShieldCheck,
  Crown,
  Award,
  Trophy,
  Star,
  Medal,
  Heart,
  Shield,
  CheckCircle2,
  Activity,
  Target,
  Rocket,
  PartyPopper,
  Camera,
  Image,
  Coins,
  Gem,
};

// Normalized lookup map (lowercase, no dashes/underscores)
const NORMALIZED_ICON_MAP = Object.entries(BADGE_ICONS).reduce((acc, [key, Comp]) => {
  acc[key.toLowerCase().replace(/[-_\s]/g, "")] = Comp;
  return acc;
}, {});

/**
 * Checks whether a given string is likely an emoji or single character.
 */
const isEmojiOrChar = (str) => {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  // If it's short or has emoji unicode
  if (trimmed.length <= 4 && !/^[a-zA-Z0-9]+$/.test(trimmed)) return true;
  return /\p{Extended_Pictographic}/u.test(trimmed);
};

/**
 * Robust BadgeIcon Component
 * Resolves Lucide icon names, HTTP image URLs, and emoji strings without rendering plain text names.
 */
export default function BadgeIcon({
  icon,
  size = 24,
  strokeWidth = 1.8,
  className = "",
  "aria-hidden": ariaHidden = true,
}) {
  if (!icon) {
    return <Award size={size} strokeWidth={strokeWidth} className={className} aria-hidden={ariaHidden} />;
  }

  // If already a React component / element
  if (React.isValidElement(icon)) {
    return icon;
  }

  if (typeof icon === "function") {
    const CustomIcon = icon;
    return <CustomIcon size={size} strokeWidth={strokeWidth} className={className} aria-hidden={ariaHidden} />;
  }

  const str = String(icon).trim();

  // If HTTP image URL or data URI
  if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("/")) {
    return (
      <img
        src={str}
        alt="Badge icon"
        className={`object-contain select-none shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={ariaHidden}
      />
    );
  }

  // Lookup in Lucide icon map
  const normalizedKey = str.toLowerCase().replace(/[-_\s]/g, "");
  const IconComponent = NORMALIZED_ICON_MAP[normalizedKey];

  if (IconComponent) {
    return (
      <IconComponent
        size={size}
        strokeWidth={strokeWidth}
        className={`shrink-0 ${className}`}
        aria-hidden={ariaHidden}
      />
    );
  }

  // If emoji or special symbol
  if (isEmojiOrChar(str)) {
    return (
      <span
        style={{ fontSize: typeof size === "number" ? `${Math.round(size * 0.85)}px` : size }}
        className={`inline-flex items-center justify-center leading-none select-none shrink-0 ${className}`}
        role="img"
        aria-label="Badge emoji"
      >
        {str}
      </span>
    );
  }

  // Default fallback if unknown icon name (prevents rendering raw string names)
  return <Award size={size} strokeWidth={strokeWidth} className={`shrink-0 ${className}`} aria-hidden={ariaHidden} />;
}
