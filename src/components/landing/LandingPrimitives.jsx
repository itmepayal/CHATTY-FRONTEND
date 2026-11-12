import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCheck, Check, Sparkles, Users } from "lucide-react";
import { ChattyLogo } from "../common/ChattyLogo";
import { GRADIENT, GRADIENT_TEXT, H2, EASE, SPRING } from "./landingData";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100";

export const Reveal = ({
  children,
  delay = 0,
  y = 28,
  x = 0,
  className = "",
  as = "div",
  once = true,
}) => {
  const Comp = motion[as] ?? motion.div;
  const reduceMotion = useReducedMotion();

  return (
    <Comp
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
};

export const LogoBox = ({ size = "md" }) => {
  const box =
    size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-xl sm:size-10";
  const logo = size === "sm" ? "size-5" : "size-6 sm:size-7";

  return (
    <div
      className={`${box} relative flex shrink-0 items-center justify-center bg-base-200 shadow-sm ring-1 ring-base-300 transition-all duration-300 group-hover:-rotate-3 group-hover:scale-105 group-hover:shadow-md group-hover:ring-primary/40`}
    >
      <ChattyLogo className={logo} />
    </div>
  );
};

const BTN_SIZES = {
  sm: "btn-sm text-sm",
  md: "btn-md",
  lg: "btn-lg text-sm sm:text-base",
};

const BTN_VARIANTS = {
  primary:
    "border-0 bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
  outline:
    "btn-outline border-base-300 bg-base-100/60 backdrop-blur hover:border-primary/50 hover:bg-base-200 hover:text-base-content",
  ghost: "btn-ghost hover:bg-base-200",
};

export const BtnPrimary = ({
  to,
  children,
  size = "md",
  variant = "primary",
  className = "",
  wrapperClassName = "",
  ...rest
}) => (
  <motion.div
    className={`inline-block ${wrapperClassName}`}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.96 }}
    transition={SPRING}
  >
    <Link
      to={to}
      {...rest}
      className={`btn group relative gap-2 overflow-hidden rounded-xl transition-shadow duration-200 ${FOCUS_RING} ${
        BTN_SIZES[size] ?? BTN_SIZES.md
      } ${BTN_VARIANTS[variant] ?? BTN_VARIANTS.primary} ${className}`}
    >
      {variant === "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[400%] motion-reduce:hidden"
        />
      )}
      <span className="relative inline-flex items-center gap-2">
        {children}
      </span>
    </Link>
  </motion.div>
);

export const Eyebrow = ({ children, icon: Icon }) => (
  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-sm sm:mb-4 sm:text-[11px]">
    {Icon ? (
      <Icon className="size-3" />
    ) : (
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
    )}
    {children}
  </span>
);

export const SectionHeading = ({
  eyebrow,
  title,
  sub,
  align = "center",
  mb = "mb-10 sm:mb-12 lg:mb-14",
  divider = true,
}) => {
  const centered = align === "center";

  return (
    <Reveal
      className={`${mb} max-w-2xl ${centered ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className={`${H2} text-balance`}>{title}</h2>
      {divider && (
        <span
          aria-hidden="true"
          className={`mt-4 block h-1 w-12 rounded-full bg-gradient-to-r from-primary to-secondary sm:mt-5 ${
            centered ? "mx-auto" : ""
          }`}
        />
      )}
      {sub && (
        <p className="mt-4 text-pretty text-sm leading-relaxed text-base-content/65 sm:mt-5 sm:text-base">
          {sub}
        </p>
      )}
    </Reveal>
  );
};

const AVATAR_SIZES = {
  sm: "size-8 text-[10px]",
  md: "size-9 text-xs sm:size-10",
  lg: "size-12 text-sm sm:size-14 sm:text-base",
};

const AVATAR_DOT = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
};

export const Avatar = ({
  initials,
  online = false,
  size = "md",
  ai = false,
  group = false,
  src,
  alt = "",
  ringClass = "ring-base-200",
}) => {
  const sz = AVATAR_SIZES[size] ?? AVATAR_SIZES.md;
  const shape = group ? "rounded-xl" : "rounded-full";

  return (
    <div className="relative shrink-0">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`${sz} ${shape} object-cover ring-1 ring-base-300`}
        />
      ) : (
        <div
          role={ai || group ? "img" : undefined}
          aria-label={ai ? "AI assistant" : group ? "Group" : undefined}
          className={`${sz} ${GRADIENT} flex select-none items-center justify-center font-semibold shadow-sm ${shape}`}
        >
          {ai ? (
            <Sparkles className="size-4" />
          ) : group ? (
            <Users className="size-4" />
          ) : (
            initials
          )}
        </div>
      )}

      {online && (
        <span
          role="img"
          aria-label="Online"
          className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-success ring-2 ${ringClass} ${
            AVATAR_DOT[size] ?? AVATAR_DOT.md
          }`}
        />
      )}
    </div>
  );
};

export const Ticks = ({ status }) => {
  if (status === "seen") {
    return (
      <CheckCheck className="size-3 text-info" role="img" aria-label="Seen" />
    );
  }
  if (status === "delivered") {
    return (
      <CheckCheck
        className="size-3 opacity-50"
        role="img"
        aria-label="Delivered"
      />
    );
  }
  return null;
};

export const TypingDots = () => (
  <div
    role="status"
    className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-base-300 px-4 py-3"
  >
    <span className="sr-only">Typing</span>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        aria-hidden="true"
        className="size-1.5 rounded-full bg-base-content/50"
        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export const CheckBullet = () => (
  <span
    aria-hidden="true"
    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 shadow-sm"
  >
    <Check className="size-3 text-primary" strokeWidth={3} />
  </span>
);

export { GRADIENT, GRADIENT_TEXT };
