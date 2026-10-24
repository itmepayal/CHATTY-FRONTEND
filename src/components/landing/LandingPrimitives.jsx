import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCheck, Check, Sparkles, Users } from "lucide-react";
import { ChattyLogo } from "../common/ChattyLogo";
import { GRADIENT, GRADIENT_TEXT, H2, EASE, SPRING } from "./landingData";

export const Reveal = ({ children, delay = 0, y = 28, x = 0, className = "", as = "div" }) => {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
};

export const LogoBox = ({ size = "md" }) => {
  const box = size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-xl sm:size-10";
  const logo = size === "sm" ? "size-5" : "size-6 sm:size-7";
  return (
    <div className={`${box} flex shrink-0 items-center justify-center bg-base-200 shadow-sm ring-1 ring-base-300 transition-transform group-hover:-rotate-3 group-hover:scale-105`}>
      <ChattyLogo className={logo} />
    </div>
  );
};

export const BtnPrimary = ({ to, children, size = "md", className = "", wrapperClassName = "" }) => (
  <motion.div className={`inline-block ${wrapperClassName}`} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={SPRING}>
    <Link
      to={to}
      className={`btn btn-primary group gap-2 rounded-xl border-0 bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/30 transition-shadow duration-200 hover:shadow-xl hover:shadow-primary/40
      ${size === "lg" ? "btn-lg text-sm sm:text-base" : "btn-md"} ${className}`}
    >
      {children}
    </Link>
  </motion.div>
);

export const Eyebrow = ({ children }) => (
  <span className="mb-3 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary sm:mb-4 sm:text-[11px]">
    {children}
  </span>
);

export const SectionHeading = ({ eyebrow, title, sub, align = "center", mb = "mb-10 sm:mb-12 lg:mb-14" }) => (
  <Reveal className={`${mb} max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className={H2}>{title}</h2>
    {sub && <p className="mt-3 text-sm leading-relaxed text-base-content/60 sm:mt-4 sm:text-base">{sub}</p>}
  </Reveal>
);

export const Avatar = ({ initials, online = false, size = "md", ai = false, group = false }) => {
  const sz = size === "sm" ? "size-8 text-[10px]" : "size-9 text-xs sm:size-10";
  return (
    <div className="relative shrink-0">
      <div className={`${sz} ${GRADIENT} flex items-center justify-center rounded-full font-semibold ${group ? "rounded-xl" : ""}`}>
        {ai ? <Sparkles className="size-4" /> : group ? <Users className="size-4" /> : initials}
      </div>
      {online && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-base-200" />}
    </div>
  );
};

export const Ticks = ({ status }) =>
  status === "seen" ? <CheckCheck className="size-3" /> :
    status === "delivered" ? <CheckCheck className="size-3 opacity-50" /> : null;

export const TypingDots = () => (
  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-base-300 px-4 py-3" aria-hidden="true">
    {[0, 1, 2].map(i => (
      <motion.span key={i} className="size-1.5 rounded-full bg-base-content/50"
        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
      />
    ))}
  </div>
);

export const CheckBullet = () => (
  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15">
    <Check className="size-3 text-primary" />
  </span>
);

export { GRADIENT, GRADIENT_TEXT };
