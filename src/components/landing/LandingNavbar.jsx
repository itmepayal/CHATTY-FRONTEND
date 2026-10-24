import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X, MessageSquare } from "lucide-react";
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
  const navBtn =
    "btn btn-sm btn-ghost rounded-full px-3 transition-colors hover:bg-base-200";

  const openChatsContent = (
    <span className="inline-flex items-center gap-2">
      <MessageSquare className="size-4" />
      Open Chats
    </span>
  );

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`fixed top-0 z-40 w-full border-b backdrop-blur-lg transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-base-300 bg-base-100/80 shadow-sm"
          : "border-transparent bg-base-100/30"
      }`}
    >
      <div className="mx-auto h-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-3">
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
            aria-label="Chatty home"
          >
            <LogoBox />
            <div className="min-w-0 leading-tight">
              <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl">
                Chatty
              </h1>
              <p className="hidden truncate text-[11px] text-base-content/60 sm:block">
                Baat karo, bina ruke
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`${navBtn} relative ${
                  activeSection === id ? "text-primary" : ""
                }`}
              >
                {activeSection === id && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-full bg-primary/10"
                    transition={SPRING}
                  />
                )}
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isCheckingAuth ? (
              <div
                aria-hidden="true"
                className="h-8 w-36 animate-pulse rounded-full bg-base-300"
              />
            ) : isLoggedIn ? (
              <BtnPrimary to={CHAT_PATH} className="btn-sm rounded-full">
                {openChatsContent}
              </BtnPrimary>
            ) : (
              <>
                <Link to="/login" className={navBtn}>
                  Log in
                </Link>
                <BtnPrimary to="/register" className="btn-sm rounded-full">
                  Get started
                </BtnPrimary>
              </>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "x" : "m"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-base-300 lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 pb-5 pt-3 sm:px-6">
              {NAV_LINKS.map(({ label, id }, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  onClick={() => scrollTo(id)}
                  className={`block w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-base-200 ${
                    activeSection === id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-base-content/70"
                  }`}
                >
                  {label}
                </motion.button>
              ))}

              <div className="mt-3 flex flex-col gap-2 border-t border-base-300 pt-4 sm:flex-row">
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
                      className="btn btn-outline btn-sm h-11 flex-1 rounded-xl py-3.5"
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
  );
};
