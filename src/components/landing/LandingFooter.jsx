import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Mail,
  Globe,
  ArrowUpRight,
  ArrowUp,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  GRADIENT,
  GRADIENT_TEXT,
  SPRING,
  NAV_LINKS,
  SUPPORT_EMAIL,
  AUTHOR_URL,
} from "./landingData";
import { LogoBox } from "./LandingPrimitives";

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const LINK_BASE =
  "relative inline-flex items-center gap-1 rounded-sm py-1 text-sm text-base-content/60 transition-colors hover:text-primary focus-visible:text-primary";

const Underline = () => (
  <span
    aria-hidden="true"
    className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary/70 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
  />
);

const FooterHeading = ({ children }) => (
  <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-base-content/45 sm:mb-5">
    <span aria-hidden="true" className="h-px w-4 bg-primary/60" />
    {children}
  </p>
);

const FooterLinkBtn = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group ${LINK_BASE} ${FOCUS}`}
  >
    {children}
    <Underline />
  </button>
);

const FooterLinkRoute = ({ to, children }) => (
  <Link to={to} className={`group ${LINK_BASE} ${FOCUS}`}>
    {children}
    <Underline />
  </Link>
);

const SocialBtn = ({ href, label, children, external = false }) => (
  <motion.a
    href={href}
    aria-label={label}
    title={label}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.92 }}
    transition={SPRING}
    className={`flex size-10 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/60 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/15 sm:size-9 ${FOCUS}`}
  >
    {children}
  </motion.a>
);

export const LandingFooter = ({ scrollTo }) => {
  const reduce = useReducedMotion();

  const backToTop = () =>
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <footer
      className="relative z-10 overflow-hidden border-t border-base-300 bg-base-200/40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-10 size-64 rounded-full bg-secondary/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="relative mb-12 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-base-100 to-secondary/15 p-6 shadow-xl shadow-primary/5 sm:mb-16 sm:p-8 lg:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                Free to join
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Ready to start <span className={GRADIENT_TEXT}>chatting?</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-base-content/60">
                Create your account in a minute and bring your friends, teams
                and Chatty AI into one place.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/register"
                className={`${GRADIENT} group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 ${FOCUS}`}
              >
                <MessageCircle className="size-4" />
                Sign up free
              </Link>
              <Link
                to="/login"
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-base-300 bg-base-100 px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary active:translate-y-0 ${FOCUS}`}
              >
                Log in
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-10 sm:gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link
              to="/"
              className={`group inline-flex items-center gap-3 rounded-lg ${FOCUS}`}
              aria-label="Chatty home"
            >
              <LogoBox />
              <span
                className={`text-xl font-extrabold tracking-tight ${GRADIENT_TEXT}`}
              >
                Chatty
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-base-content/55 sm:mt-5">
              Real-time messaging with group chats, a built-in AI assistant,
              beautiful themes and secure sign-in.
              <span className="mt-1 block font-medium text-base-content/70">
                Baat karo, bina ruke.
              </span>
            </p>

            <div className="mt-5 flex items-center gap-2.5 sm:mt-6">
              <SocialBtn href={`mailto:${SUPPORT_EMAIL}`} label="Email support">
                <Mail className="size-4" />
              </SocialBtn>
              <SocialBtn
                href={AUTHOR_URL}
                label="Visit the developer's website"
                external
              >
                <Globe className="size-4" />
              </SocialBtn>
            </div>

            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs text-base-content/60 shadow-sm">
              <span className="relative flex size-2">
                {!reduce && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                )}
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              All systems running
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:col-span-7 lg:pl-8">
            <nav aria-label="Product">
              <FooterHeading>Product</FooterHeading>
              <ul className="space-y-1.5 sm:space-y-2">
                {NAV_LINKS.filter((l) => l.id !== "faq").map(
                  ({ label, id }) => (
                    <li key={id}>
                      <FooterLinkBtn onClick={() => scrollTo(id)}>
                        {label}
                      </FooterLinkBtn>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <nav aria-label="Account">
              <FooterHeading>Account</FooterHeading>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <FooterLinkRoute to="/login">Log in</FooterLinkRoute>
                </li>
                <li>
                  <FooterLinkRoute to="/register">Sign up</FooterLinkRoute>
                </li>
                <li>
                  <FooterLinkRoute to="/forgot-password">
                    Forgot password
                  </FooterLinkRoute>
                </li>
              </ul>
            </nav>

            <nav aria-label="Support" className="col-span-2 sm:col-span-1">
              <FooterHeading>Support</FooterHeading>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <FooterLinkBtn onClick={() => scrollTo("faq")}>
                    FAQ
                  </FooterLinkBtn>
                </li>
                <li>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className={`group ${LINK_BASE} ${FOCUS}`}
                  >
                    Contact us
                    <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    <Underline />
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-base-300 pt-6 text-center text-xs text-base-content/50 sm:mt-14 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Chatty. All rights reserved.</p>

          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
            Designed &amp; developed with
            <motion.span
              aria-label="love"
              animate={reduce ? undefined : { scale: [1, 1.25, 1] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex text-error"
            >
              <Heart className="size-3.5 fill-current" />
            </motion.span>
            by{" "}
            <a
              href={AUTHOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-sm font-semibold text-base-content/70 underline-offset-4 transition-colors hover:text-primary hover:underline ${FOCUS}`}
            >
              Payal Yadav
            </a>
          </p>

          <button
            type="button"
            onClick={backToTop}
            className={`group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3.5 py-2 font-medium text-base-content/65 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary active:translate-y-0 ${FOCUS}`}
          >
            Back to top
            <ArrowUp className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden px-4 text-center leading-none sm:px-6"
        style={{
          maskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 20%, transparent 95%)",
        }}
      >
        <span
          className={`block text-[22vw] font-black tracking-tighter opacity-[0.12] sm:text-[16vw] lg:text-[13rem] ${GRADIENT_TEXT}`}
        >
          Chatty
        </span>
      </div>
    </footer>
  );
};
