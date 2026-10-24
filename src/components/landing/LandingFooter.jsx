import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, Globe, ArrowUpRight, Heart } from "lucide-react";
import { GRADIENT, GRADIENT_TEXT, SPRING, NAV_LINKS, SUPPORT_EMAIL, AUTHOR_URL } from "./landingData";
import { LogoBox } from "./LandingPrimitives";

const FooterHeading = ({ children }) => (
  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-base-content/40 sm:mb-5">{children}</p>
);

const FooterLinkBtn = ({ onClick, children }) => (
  <button onClick={onClick}
    className="group inline-flex items-center gap-1 py-0.5 text-sm text-base-content/60 transition-colors hover:text-primary focus:outline-none focus-visible:text-primary focus-visible:underline">
    {children}
  </button>
);

const FooterLinkRoute = ({ to, children }) => (
  <Link to={to}
    className="inline-block py-0.5 text-sm text-base-content/60 transition-colors hover:text-primary focus:outline-none focus-visible:text-primary focus-visible:underline">
    {children}
  </Link>
);

const SocialBtn = ({ href, label, children, external = false }) => (
  <motion.a href={href} aria-label={label}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    whileHover={{ y: -3 }} whileTap={{ scale: 0.92 }} transition={SPRING}
    className="flex size-10 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/60 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-9">
    {children}
  </motion.a>
);

export const LandingFooter = ({ scrollTo }) => (
  <footer className="relative z-10 overflow-hidden border-t border-base-300 bg-base-200/40"
    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

    <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8">
      <div className="grid gap-10 sm:gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Link to="/" className="group inline-flex items-center gap-3" aria-label="Chatty home">
            <LogoBox />
            <span className={`text-xl font-extrabold tracking-tight ${GRADIENT_TEXT}`}>Chatty</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-base-content/55 sm:mt-5">
            Real-time messaging with group chats, a built-in AI assistant, beautiful themes and secure sign-in.
            <span className="mt-1 block font-medium text-base-content/70">Baat karo, bina ruke.</span>
          </p>
          <div className="mt-5 flex items-center gap-2.5 sm:mt-6">
            <SocialBtn href={`mailto:${SUPPORT_EMAIL}`} label="Email support"><Mail className="size-4" /></SocialBtn>
            <SocialBtn href={AUTHOR_URL} label="Visit the developer's website" external><Globe className="size-4" /></SocialBtn>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:col-span-7 lg:pl-8">
          <nav aria-label="Product">
            <FooterHeading>Product</FooterHeading>
            <ul className="space-y-2.5 sm:space-y-3">
              {NAV_LINKS.filter(l => l.id !== "faq").map(({ label, id }) => (
                <li key={id}><FooterLinkBtn onClick={() => scrollTo(id)}>{label}</FooterLinkBtn></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <FooterHeading>Account</FooterHeading>
            <ul className="space-y-2.5 sm:space-y-3">
              <li><FooterLinkRoute to="/login">Log in</FooterLinkRoute></li>
              <li><FooterLinkRoute to="/register">Sign up</FooterLinkRoute></li>
              <li><FooterLinkRoute to="/forgot-password">Forgot password</FooterLinkRoute></li>
            </ul>
          </nav>

          <nav aria-label="Support" className="col-span-2 sm:col-span-1">
            <FooterHeading>Support</FooterHeading>
            <ul className="space-y-2.5 sm:space-y-3">
              <li><FooterLinkBtn onClick={() => scrollTo("faq")}>FAQ</FooterLinkBtn></li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-1 py-0.5 text-sm text-base-content/60 transition-colors hover:text-primary focus:outline-none focus-visible:underline">
                  Contact us <ArrowUpRight className="size-3" />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-base-300 pt-6 text-center text-xs text-base-content/45 sm:mt-14 sm:flex-row sm:gap-4 sm:text-left">
        <p>© {new Date().getFullYear()} Chatty. All rights reserved.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          Designed &amp; developed with
          <motion.span aria-label="love" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} className="inline-flex text-error">
            <Heart className="size-3.5 fill-current" />
          </motion.span>
          by{" "}
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-base-content/70 underline-offset-4 transition-colors hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Payal Yadav
          </a>
        </p>
      </div>
    </div>

    <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden px-4 text-center leading-none sm:px-6"
      style={{ maskImage: "linear-gradient(to bottom, black 20%, transparent 95%)", WebkitMaskImage: "linear-gradient(to bottom, black 20%, transparent 95%)" }}>
      <span className={`block text-[22vw] font-black tracking-tighter opacity-[0.12] sm:text-[16vw] lg:text-[13rem] ${GRADIENT_TEXT}`}>
        Chatty
      </span>
    </div>
  </footer>
);
