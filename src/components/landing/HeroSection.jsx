import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, Users, ShieldCheck } from "lucide-react";
import { EASE, SPRING, heroContainer, heroItem, CTA_POINTS, HIGHLIGHTS } from "./landingData";
import { BtnPrimary } from "./LandingPrimitives";
import { ProductPreview, FloatChip } from "./ProductPreview";

export const HeroSection = ({ scrollTo }) => (
  <>
    <section className="px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-36 lg:pt-40">
      <div className="mx-auto max-w-7xl">
        <motion.div variants={heroContainer} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <motion.div variants={heroItem} className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary sm:mb-7 sm:px-4 sm:text-sm">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="truncate">Chats, groups &amp; AI — all in one place</span>
          </motion.div>

          <motion.h1 variants={heroItem} className="text-[1.9rem] font-extrabold leading-[1.12] tracking-tight min-[400px]:text-4xl sm:text-5xl sm:leading-[1.08] lg:text-6xl xl:text-7xl">
            Conversations that{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              bring people closer
            </span>
          </motion.h1>

          <motion.p variants={heroItem} className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-base-content/60 sm:mt-6 sm:text-base lg:text-lg">
            One-to-one chats, group conversations and a built-in AI — wrapped in beautiful themes
            and protected with two-factor authentication.
          </motion.p>

          <motion.div variants={heroItem} className="mx-auto mt-7 flex max-w-sm flex-col items-stretch gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
            <BtnPrimary to="/register" size="lg" wrapperClassName="w-full sm:w-auto" className="w-full sm:w-auto">
              Get started — it's free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </BtnPrimary>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={SPRING}
              onClick={() => scrollTo("features")}
              className="btn btn-outline btn-lg w-full rounded-xl text-sm sm:w-auto sm:text-base">
              Explore features
            </motion.button>
          </motion.div>

          <motion.ul variants={heroItem} className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-base-content/50 sm:mt-8 sm:gap-x-6">
            {CTA_POINTS.map(t => (
              <li key={t} className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> {t}</li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
          className="relative mt-12 sm:mt-16 lg:mt-20"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[15%] -top-6 h-28 rounded-full bg-primary/30 blur-[80px]" />
          <FloatChip icon={Sparkles} text="Chatty AI replied" sub="Instant answers" className="-left-4 top-16 xl:-left-10" />
          <FloatChip icon={Users} text="Design Team" sub="3 new messages" className="-right-4 top-40 xl:-right-10" delay={1.2} />
          <FloatChip icon={ShieldCheck} text="2FA enabled" sub="Your account is protected" className="-left-4 bottom-16 xl:-left-10" delay={2.2} />
          <ProductPreview />
        </motion.div>
      </div>
    </section>

    <section aria-label="Highlights" className="overflow-hidden border-y border-base-300 bg-base-200/40 py-4 sm:py-5">
      <div className="marquee flex w-max items-center gap-8 whitespace-nowrap sm:gap-12">
        {[...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS].map(({ icon: Icon, label }, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-medium text-base-content/60 sm:gap-2.5 sm:text-sm">
            <Icon className="size-4 text-primary" /> {label}
            <span className="ml-6 size-1 rounded-full bg-base-content/20 sm:ml-10" />
          </span>
        ))}
      </div>
    </section>
  </>
);
