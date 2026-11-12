import { useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X, MessageSquare, ArrowRight } from "lucide-react";
import { EASE, SPRING, NAV_LINKS } from "./landingData";
import { LogoBox, BtnPrimary } from "./LandingPrimitives";

const CHAT_PATH = "/chat";

export const LandingNavbar = ({
  scrolled,
  menuOpen,
  setMenuOpen,
  scrollTo,
  activeSection,
  isLoggedIn = false,
  isCheckingAuth = false,
}) => {
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
  });

  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, setMenuOpen]);

  const handleNav = (id) => {
    scrollTo(id);
    setMenuOpen(false);
  };

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100";

  const openChatsContent = (
    <span className="inline-flex items-center gap-2">
      <MessageSquare className="size-4" />
      Open Chats
    </span>
  );

  return (
    <>
      <motion.header
        initial={reduceMotion ? false : { y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
          scrolled || menuOpen
            ? "border-base-300/70 bg-base-100/85 shadow-[0_1px_20px_-8px_rgba(0,0,0,0.25)]"
            : "border-transparent bg-base-100/40"
        }`}
      >
        <motion.div
          aria-hidden="true"
          style={{ scaleX: progress }}
          className={`absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-primary via-secondary to-accent transition-opacity duration-300 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`mx-auto max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          <div className="flex h-full items-center justify-between gap-4">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              aria-label="Chatty home"
              className={`group flex min-w-0 items-center gap-3 rounded-xl transition-opacity hover:opacity-90 ${focusRing}`}
            >
              <LogoBox />
              <div className="min-w-0 leading-none">
                <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl">
                  Chatty
                </span>
                <span className="mt-1 hidden truncate text-[11px] font-medium tracking-wide text-base-content/55 sm:block">
                  Baat karo, bina ruke
                </span>
              </div>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden items-center gap-0.5 rounded-full border border-base-300/70 bg-base-200/50 p-1 shadow-inner lg:flex"
            >
              {NAV_LINKS.map(({ label, id }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleNav(id)}
                    aria-current={active ? "true" : undefined}
                    className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
                      active
                        ? "text-primary-content"
                        : "text-base-content/70 hover:text-base-content"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        transition={reduceMotion ? { duration: 0 } : SPRING}
                        className="absolute inset-0 -z-10 rounded-full bg-primary shadow-md shadow-primary/30"
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              {isCheckingAuth ? (
                <div
                  aria-hidden="true"
                  className="h-9 w-40 animate-pulse rounded-full bg-base-300"
                />
              ) : isLoggedIn ? (
                <BtnPrimary to={CHAT_PATH} className="btn-sm rounded-full">
                  {openChatsContent}
                </BtnPrimary>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`btn btn-ghost btn-sm rounded-full px-4 font-medium ${focusRing}`}
                  >
                    Log in
                  </Link>
                  <BtnPrimary to="/register" className="btn-sm rounded-full">
                    Get started
                  </BtnPrimary>
                </>
              )}
            </div>

            <button
              type="button"
              className={`btn btn-ghost btn-sm btn-circle border border-base-300/70 lg:hidden ${focusRing}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "x" : "m"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex"
                >
                  {menuOpen ? (
                    <X className="size-5" />
                  ) : (
                    <Menu className="size-5" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-base-300/70 lg:hidden"
            >
              <div className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6">
                <nav aria-label="Mobile" className="flex flex-col gap-1">
                  {NAV_LINKS.map(({ label, id }, i) => {
                    const active = activeSection === id;
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + i * 0.04 }}
                        onClick={() => handleNav(id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] transition-colors ${focusRing} ${
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-base-content/75 hover:bg-base-200"
                        }`}
                      >
                        {label}
                        <ArrowRight
                          className={`size-4 transition-opacity ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="mt-4 flex flex-col gap-2 border-t border-base-300/70 pt-4 sm:flex-row">
                  {isCheckingAuth ? (
                    <div
                      aria-hidden="true"
                      className="h-11 w-full animate-pulse rounded-xl bg-base-300"
                    />
                  ) : isLoggedIn ? (
                    <BtnPrimary
                      to={CHAT_PATH}
                      wrapperClassName="flex-1"
                      className="h-11 min-h-0 w-full text-sm"
                    >
                      {openChatsContent}
                    </BtnPrimary>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className={`btn btn-outline h-11 min-h-0 flex-1 rounded-xl text-sm ${focusRing}`}
                      >
                        Log in
                      </Link>
                      <BtnPrimary
                        to="/register"
                        wrapperClassName="flex-1"
                        className="h-11 min-h-0 w-full text-sm"
                      >
                        Get started
                      </BtnPrimary>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-base-content/20 backdrop-blur-[2px] lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
};
