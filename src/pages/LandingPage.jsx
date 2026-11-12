import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LazyMotion,
  MotionConfig,
  AnimatePresence,
  m,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { ArrowUp } from "lucide-react";

import { useAuthStore } from "../store/useAuthStore";

import { NAV_LINKS, GRADIENT } from "../components/landing/landingData";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";

const loadMotionFeatures = () =>
  import("../lib/motionFeatures").then((mod) => mod.default);

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((mod) => ({ default: mod[name] })));

const importFeatures = () => import("../components/landing/FeaturesSection");
const importAiGroups = () => import("../components/landing/AiGroupsSection");
const importThemes = () => import("../components/landing/ThemesSection");
const importSecurity = () => import("../components/landing/SecuritySection");
const importPrivacy = () => import("../components/landing/PrivacySection");
const importHowItWorks = () =>
  import("../components/landing/HowItWorksSection");
const importFaq = () => import("../components/landing/FaqSection");
const importCta = () => import("../components/landing/CtaSection");
const importFooter = () => import("../components/landing/LandingFooter");
const importChatbot = () => import("../components/landing/Chatbotwidget");

const FeaturesSection = lazyNamed(importFeatures, "FeaturesSection");
const AiGroupsSection = lazyNamed(importAiGroups, "AiGroupsSection");
const ThemesSection = lazyNamed(importThemes, "ThemesSection");
const SecuritySection = lazyNamed(importSecurity, "SecuritySection");
const PrivacySection = lazyNamed(importPrivacy, "PrivacySection");
const HowItWorksSection = lazyNamed(importHowItWorks, "HowItWorksSection");
const FaqSection = lazyNamed(importFaq, "FaqSection");
const CtaSection = lazyNamed(importCta, "CtaSection");
const LandingFooter = lazyNamed(importFooter, "LandingFooter");
const ChatbotWidget = lazyNamed(importChatbot, "ChatbotWidget");

const PRELOAD = [
  importFeatures,
  importAiGroups,
  importThemes,
  importSecurity,
  importPrivacy,
  importHowItWorks,
  importFaq,
  importCta,
  importFooter,
];

const onIdle = (cb, timeout = 2000) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 800);
  return () => clearTimeout(id);
};

const scrollToSection = (id) => {
  requestAnimationFrame(() => {
    const el =
      document.getElementById(id) ??
      document.querySelector(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

const SectionFallback = ({ minHeight }) => (
  <div
    className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28"
    style={{ minHeight }}
  >
    <div className="mx-auto h-6 max-w-sm animate-pulse rounded-full bg-base-300" />
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-32 animate-pulse rounded-2xl bg-base-200" />
      ))}
    </div>
  </div>
);

const LazyOnView = ({ id, minHeight = 600, children }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-section={id} style={show ? undefined : { minHeight }}>
      {show && (
        <Suspense fallback={<SectionFallback minHeight={minHeight} />}>
          {children}
        </Suspense>
      )}
    </div>
  );
};

const Backdrop = memo(() => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[720px] overflow-hidden"
  >
    <div
      className="absolute left-1/2 top-[-120px] h-[420px] w-[120%] -translate-x-1/2 text-primary sm:h-[520px] sm:w-[80%]"
      style={{
        background:
          "radial-gradient(closest-side, color-mix(in srgb, currentColor 22%, transparent), transparent)",
      }}
    />
    <div
      className="absolute right-[-15%] top-[180px] h-[360px] w-[60%] text-secondary sm:w-[40%]"
      style={{
        background:
          "radial-gradient(closest-side, color-mix(in srgb, currentColor 12%, transparent), transparent)",
      }}
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
));
Backdrop.displayName = "Backdrop";

const ScrollProgress = memo(() => {
  const { scrollYProgress } = useScroll();
  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX: scrollYProgress }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-primary via-secondary to-accent will-change-transform"
    />
  );
});
ScrollProgress.displayName = "ScrollProgress";

const BackToTop = memo(() => {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setShow(y > 700));

  return (
    <AnimatePresence>
      {show && (
        <m.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className={`${GRADIENT} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 flex size-11 touch-manipulation items-center justify-center rounded-lg shadow-lg shadow-primary/30 sm:bottom-6 sm:left-6`}
        >
          <ArrowUp className="size-5" />
        </m.button>
      )}
    </AnimatePresence>
  );
});
BackToTop.displayName = "BackToTop";

const DeferredChatbot = memo(() => {
  const [ready, setReady] = useState(false);
  useEffect(() => onIdle(() => setReady(true), 4000), []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <ChatbotWidget />
    </Suspense>
  );
});
DeferredChatbot.displayName = "DeferredChatbot";

const NavbarContainer = memo(({ isLoggedIn, isCheckingAuth }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 16));

  useEffect(() => {
    setScrolled(window.scrollY > 16);
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
    const ids = new Set(NAV_LINKS.map((l) => l.id));
    const els = [...document.querySelectorAll("[data-section]")].filter((el) =>
      ids.has(el.dataset.section),
    );
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && setActiveSection(e.target.dataset.section),
        ),
      { rootMargin: "-40% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    scrollToSection(id);
  }, []);

  return (
    <LandingNavbar
      scrolled={scrolled}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      scrollTo={scrollTo}
      activeSection={activeSection}
      isLoggedIn={isLoggedIn}
      isCheckingAuth={isCheckingAuth}
    />
  );
});
NavbarContainer.displayName = "NavbarContainer";

export default function LandingPage() {
  const authUser = useAuthStore((s) => s.authUser);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const isLoggedIn = Boolean(authUser);

  useEffect(() => {
    if (navigator.connection?.saveData) return;
    return onIdle(() => PRELOAD.forEach((load) => load()), 3000);
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures}>
      <MotionConfig reducedMotion="user">
        <div className="relative min-h-screen overflow-x-clip bg-base-100 text-base-content antialiased [-webkit-tap-highlight-color:transparent]">
          <ScrollProgress />
          <Backdrop />

          <NavbarContainer
            isLoggedIn={isLoggedIn}
            isCheckingAuth={isCheckingAuth}
          />

          <main className="relative z-10">
            <HeroSection
              scrollTo={scrollToSection}
              isLoggedIn={isLoggedIn}
              isCheckingAuth={isCheckingAuth}
            />

            <LazyOnView id="features" minHeight={720}>
              <FeaturesSection />
            </LazyOnView>
            <LazyOnView id="ai-groups" minHeight={680}>
              <AiGroupsSection />
            </LazyOnView>
            <LazyOnView id="themes" minHeight={640}>
              <ThemesSection />
            </LazyOnView>
            <LazyOnView id="security" minHeight={640}>
              <SecuritySection />
            </LazyOnView>
            <LazyOnView id="privacy" minHeight={640}>
              <PrivacySection />
            </LazyOnView>
            <LazyOnView id="how-it-works" minHeight={640}>
              <HowItWorksSection />
            </LazyOnView>
            <LazyOnView id="faq" minHeight={640}>
              <FaqSection />
            </LazyOnView>
            <LazyOnView id="cta" minHeight={420}>
              <CtaSection
                isLoggedIn={isLoggedIn}
                isCheckingAuth={isCheckingAuth}
              />
            </LazyOnView>
          </main>

          <LazyOnView id="footer" minHeight={420}>
            <LandingFooter
              scrollTo={scrollToSection}
              isLoggedIn={isLoggedIn}
              isCheckingAuth={isCheckingAuth}
            />
          </LazyOnView>

          <DeferredChatbot />
          <BackToTop />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
