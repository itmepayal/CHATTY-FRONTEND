import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Coins, Award, Check } from "lucide-react";
import { useBadgeStore } from "../../store/useBadgeStore.js";
import { RARITY_STYLES } from "./BadgePill.jsx";
import IllustratedBadge from "./IllustratedBadge.jsx";

export default function AchievementUnlockModal() {
  const { unlockedCelebration, dismissCelebration, setFeaturedBadge } =
    useBadgeStore();

  if (!unlockedCelebration) return null;

  const { badge, rewardCoins } = unlockedCelebration;
  const rarity = (badge?.rarity || "common").toLowerCase();
  const theme = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const handleShowcase = async () => {
    if (badge?._id || badge?.id) {
      await setFeaturedBadge(badge._id || badge.id);
    }
    dismissCelebration();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-base-100 border border-base-300 shadow-2xl text-center p-6"
        >
          {/* Ambient Sparkle Aura */}
          <div
            className={`pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-40 bg-gradient-to-br ${theme.gradient}`}
          />

          {/* Top Banner Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Achievement Unlocked!
          </div>

          {/* Illustrated Badge Artwork with Pulse Reveal */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: [0, 1.15, 1], rotate: [-15, 5, 0] }}
            transition={{ duration: 0.6, times: [0, 0.7, 1] }}
            className="my-3 flex items-center justify-center"
          >
            <IllustratedBadge
              badge={badge}
              size="lg"
              showRibbon={true}
              isLocked={false}
            />
          </motion.div>

          {/* Badge Name & Rarity */}
          <h3 className="text-xl font-black text-base-content mt-3">
            {badge?.name}
          </h3>

          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeBorder} ${theme.text}`}
            >
              {rarity}
            </span>
          </div>

          <p className="text-xs text-base-content/70 mt-2 px-2">
            {badge?.description}
          </p>

          {/* Reward Coin Callout */}
          {rewardCoins > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center gap-2 font-bold text-sm"
            >
              <Coins className="w-5 h-5 text-amber-500 animate-bounce" />
              <span>+{rewardCoins} Coins Earned!</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={handleShowcase}
              className="btn btn-primary rounded-2xl font-bold shadow-lg w-full flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              Showcase on Profile
            </button>

            <button
              onClick={dismissCelebration}
              className="btn btn-ghost rounded-2xl text-xs text-base-content/60 hover:text-base-content w-full"
            >
              Awesome, Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
