import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Sparkles, CheckCircle2, Lock, Coins, ShieldCheck } from "lucide-react";
import { RARITY_STYLES } from "./BadgePill.jsx";
import BadgeIcon from "./BadgeIcon.jsx";
import IllustratedBadge from "./IllustratedBadge.jsx";
import { useBadgeStore } from "../../store/useBadgeStore.js";

export default function BadgeDetailModal({ badge, isOwned = false, isFeatured = false, onClose }) {
  const { setFeaturedBadge } = useBadgeStore();

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!badge) return null;

  const rarity = (badge.rarity || "common").toLowerCase();
  const theme = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const handleToggleFeatured = async () => {
    if (isFeatured) {
      await setFeaturedBadge(null);
    } else {
      await setFeaturedBadge(badge._id || badge.id);
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-base-100 border border-base-300 shadow-2xl"
        >
          {/* Top Banner with Rarity Gradient */}
          <div
            className={`h-36 w-full bg-gradient-to-br ${theme.gradient} relative flex items-center justify-center pt-2`}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-base-100/60 hover:bg-base-100 text-base-content/70 hover:text-base-content transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Illustrated Medal */}
            <div className="relative -bottom-4">
              <IllustratedBadge
                badge={badge}
                size="lg"
                showRibbon={true}
                isLocked={!isOwned}
                isFeatured={isFeatured}
              />
            </div>
          </div>

          {/* Modal Body */}
          <div className="pt-8 p-6 text-center">
            <h3 className="text-xl font-bold text-base-content">{badge.name}</h3>

            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeBorder} ${theme.text}`}
              >
                {rarity}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-base-200 border border-base-300 text-base-content/70 capitalize">
                {badge.category}
              </span>
            </div>

            {isOwned && badge.unlockedAt && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5">
                Unlocked on {new Date(badge.unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}

            <p className="text-sm text-base-content/80 mt-2.5 leading-relaxed">
              {badge.description}
            </p>

            {/* Live Progress Bar if in progress */}
            {!isOwned && (badge.currentProgress !== undefined || badge.percentage !== undefined) && (
              <div className="mt-3.5 p-3 rounded-2xl bg-base-200/50 border border-base-300 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-base-content/80 mb-1">
                  <span>
                    Progress: {badge.currentProgress || 0} / {badge.targetProgress || badge.criteria?.threshold || 1}
                  </span>
                  <span className="text-primary">{badge.percentage || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-base-300 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, badge.percentage || 0)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Unlock Criteria Box */}
            <div className="mt-4 p-3.5 rounded-2xl bg-base-200/60 border border-base-300 text-left">
              <span className="text-[11px] font-semibold text-base-content/50 uppercase tracking-wider block mb-1">
                Unlock Requirement
              </span>
              <p className="text-xs text-base-content/90 font-medium">
                {badge.criteria?.description || `Reach target in ${badge.criteria?.type || "activity"}`}
              </p>
              {(badge.criteria?.threshold ?? badge.criteria?.target) && (
                <span className="text-[11px] text-primary font-semibold mt-1 inline-block">
                  Target: {(badge.criteria.threshold ?? badge.criteria.target).toLocaleString()}
                </span>
              )}
            </div>

            {/* Reward Information */}
            {(badge.rewards?.coins > 0 || badge.rewards?.bonusCoins > 0 || badge.rewards?.coinBonus > 0) && (
              <div className="mt-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>
                  Rewards +{badge.rewards?.coins || badge.rewards?.bonusCoins || badge.rewards?.coinBonus} Bonus Coins upon unlock!
                </span>
              </div>
            )}

            {/* Ownership and Showcase Controls */}
            <div className="mt-6 pt-4 border-t border-base-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-base-content/70">
                {isOwned ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Unlocked
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-base-content/40" />
                    <span className="text-base-content/60">Locked</span>
                  </>
                )}
              </div>

              {isOwned ? (
                <button
                  onClick={handleToggleFeatured}
                  className={`btn btn-sm rounded-xl font-medium ${
                    isFeatured
                      ? "btn-outline border-base-300 text-base-content/70 hover:btn-error"
                      : "btn-primary shadow-sm"
                  }`}
                >
                  {isFeatured ? "Remove from Profile" : "Showcase on Profile"}
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-sm btn-disabled rounded-xl text-xs opacity-60"
                >
                  Keep Chatting to Unlock
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
