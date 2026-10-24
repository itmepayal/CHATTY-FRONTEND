import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useScroll,
  useSpring,
} from "framer-motion";
import { ArrowUp } from "lucide-react";

import { useAuthStore } from "../store/useAuthStore"; // adjust to your auth store/context

import { NAV_LINKS, GRADIENT } from "../components/landing/landingData";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { ChatbotWidget } from "../components/landing/Chatbotwidget";

const FeaturesSection = lazy(() =>
  import("../components/landing/FeaturesSection").then((m) => ({
    default: m.FeaturesSection,
  })),
);
const AiGroupsSection = lazy(() =>
  import("../components/landing/AiGroupsSection").then((m) => ({
    default: m.AiGroupsSection,
  })),
);
const ThemesSection = lazy(() =>
  import("../components/landing/ThemesSection").then((m) => ({
    default: m.ThemesSection,
  })),
);
const SecuritySection = lazy(() =>
  import("../components/landing/SecuritySection").then((m) => ({
    default: m.SecuritySection,
  })),
);
const PrivacySection = lazy(() =>
  import("../components/landing/PrivacySection").then((m) => ({
    default: m.PrivacySection,
  })),
);
const HowItWorksSection = lazy(() =>
  import("../components/landing/HowItWorksSection").then((m) => ({
    default: m.HowItWorksSection,
  })),
);
const FaqSection = lazy(() =>
  import("../components/landing/FaqSection").then((m) => ({
    default: m.FaqSection,
  })),
);
const CtaSection = lazy(() =>
  import("../components/landing/CtaSection").then((m) => ({
    default: m.CtaSection,
  })),
);
const LandingFooter = lazy(() =>
  import("../components/landing/LandingFooter").then((m) => ({
    default: m.LandingFooter,
  })),
);

const SectionFallback = () => (
  <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
    <div className="mx-auto h-6 max-w-sm animate-pulse rounded-full bg-base-300" />
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-32 animate-pulse rounded-2xl bg-base-200" />
      ))}
    </div>
  </div>
);

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Auth state: if logged in, show "Open Chats" instead of Login/Sign up
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const isLoggedIn = Boolean(authUser);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.3,
  });

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
      setShowTop(window.scrollY > 700);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const els = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(
      Boolean,
    );
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && setActiveSection(e.target.id),
        ),
      { rootMargin: "-40% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    requestAnimationFrame(() =>
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-clip bg-base-100 text-base-content antialiased [-webkit-tap-highlight-color:transparent]">
        <motion.div
          aria-hidden="true"
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary via-secondary to-accent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-[-10%] h-[320px] w-[110%] -translate-x-1/2 rounded-full bg-primary/20 blur-[100px] sm:h-[460px] sm:w-[75%] sm:blur-[130px]"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[-10%] top-[30%] h-[300px] w-[60%] rounded-full bg-secondary/10 blur-[100px] sm:h-[380px] sm:w-[40%] sm:blur-[120px]"
          />
          <div
            className="absolute inset-0 text-base-content/[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse 70% 50% at 50% 0%, black, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 50% at 50% 0%, black, transparent 75%)",
            }}
          />
        </div>

        <LandingNavbar
          scrolled={scrolled}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          scrollTo={scrollTo}
          activeSection={activeSection}
          isLoggedIn={isLoggedIn}
          isCheckingAuth={isCheckingAuth}
        />

        <main className="relative z-10">
          <HeroSection
            scrollTo={scrollTo}
            isLoggedIn={isLoggedIn}
            isCheckingAuth={isCheckingAuth}
          />

          <Suspense fallback={<SectionFallback />}>
            <FeaturesSection />
            <AiGroupsSection />
            <ThemesSection />
            <SecuritySection />
            <PrivacySection />
            <HowItWorksSection />
            <FaqSection />
            <CtaSection
              isLoggedIn={isLoggedIn}
              isCheckingAuth={isCheckingAuth}
            />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <LandingFooter
            scrollTo={scrollTo}
            isLoggedIn={isLoggedIn}
            isCheckingAuth={isCheckingAuth}
          />
        </Suspense>

        {/* Chatbot: bottom-right */}
        <ChatbotWidget />

        {/* Back to top: bottom-left, respects iPhone notch / home bar */}
        <AnimatePresence>
          {showTop && (
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className={`${GRADIENT} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 flex size-11 touch-manipulation items-center justify-center rounded-lg shadow-lg shadow-primary/30 sm:bottom-6 sm:left-6`}
            >
              <ArrowUp className="size-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
