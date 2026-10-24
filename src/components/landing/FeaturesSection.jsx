import { motion } from "framer-motion";
import { SECTION, GRADIENT, SPRING, FEATURES, gridContainer, gridItem } from "./landingData";
import { SectionHeading } from "./LandingPrimitives";

const FeatureCard = ({ icon: Icon, title, desc, span = "", accent = false }) => (
  <motion.div variants={gridItem} whileHover={{ y: -6 }} transition={SPRING}
    className={`group relative overflow-hidden rounded-2xl border p-5 transition-colors duration-300 sm:p-6 lg:p-7 ${span} ${
      accent
        ? "border-primary/40 bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent hover:border-primary/60"
        : "border-base-300 bg-base-200/50 hover:border-primary/40 hover:bg-base-200"
    }`}>
    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/25" />
    <motion.div whileHover={{ rotate: -8, scale: 1.08 }} transition={SPRING}
      className={`relative mb-4 inline-flex size-11 items-center justify-center rounded-xl sm:mb-5 sm:size-12 ${
        accent ? GRADIENT + " shadow-lg shadow-primary/30" : "border border-primary/20 bg-primary/10"
      }`}>
      <Icon className={`size-5 ${accent ? "" : "text-primary"}`} />
    </motion.div>
    <h3 className="relative mb-2 text-base font-semibold">{title}</h3>
    <p className="relative text-sm leading-relaxed text-base-content/60">{desc}</p>
  </motion.div>
);

export const FeaturesSection = () => (
  <section id="features" className={SECTION}>
    <div className="mx-auto max-w-7xl">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to stay connected"
        sub="From private one-to-one chats to group conversations and AI help — designed around real conversations."
      />
      <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
        className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
      </motion.div>
    </div>
  </section>
);
