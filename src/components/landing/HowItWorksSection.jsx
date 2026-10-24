import { motion } from "framer-motion";
import { SECTION, GRADIENT, SPRING, STEPS, gridContainer, gridItem } from "./landingData";
import { SectionHeading } from "./LandingPrimitives";

export const HowItWorksSection = () => (
  <section id="how-it-works" className={SECTION}>
    <div className="mx-auto max-w-5xl">
      <SectionHeading eyebrow="How it works" title="Start chatting in three simple steps" />
      <motion.ol variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
        className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.li key={s.title} variants={gridItem} whileHover={{ y: -6 }} transition={SPRING}
            className="relative rounded-2xl border border-base-300 bg-base-200/50 p-5 transition-colors hover:border-primary/40 hover:bg-base-200 sm:p-6 lg:p-7">
            <div className="mb-5 flex items-center justify-between sm:mb-6">
              <div className={`${GRADIENT} flex size-11 items-center justify-center rounded-xl shadow-lg shadow-primary/25`}>
                <s.icon className="size-5" />
              </div>
              <span className="text-3xl font-extrabold text-base-content/10 sm:text-4xl">0{i + 1}</span>
            </div>
            <h3 className="mb-2 text-base font-semibold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-base-content/60">{s.desc}</p>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  </section>
);
