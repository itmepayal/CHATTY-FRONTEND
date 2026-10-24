import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SECTION, GRADIENT_TEXT, SPRING, THEMES } from "./landingData";
import { SectionHeading, Reveal } from "./LandingPrimitives";

const ThemeShowcase = () => {
  const [theme, setTheme] = useState(THEMES[1] || THEMES[0]);
  return (
    <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <p className="mb-3 text-center text-sm font-medium text-base-content/60 lg:text-left">Pick a theme to preview</p>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          {THEMES.map(t => (
            <motion.button key={t} data-theme={t} onClick={() => setTheme(t)} aria-pressed={theme === t}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }} transition={SPRING}
              className={`flex items-center gap-2 rounded-full border bg-base-100 px-3 py-1.5 text-xs font-medium capitalize text-base-content transition-colors ${theme === t ? "border-primary ring-2 ring-primary/40" : "border-base-300"}`}>
              <span className="flex -space-x-1">
                <span className="size-3 rounded-full bg-primary" />
                <span className="size-3 rounded-full bg-secondary" />
                <span className="size-3 rounded-full bg-accent" />
              </span>
              {t}
            </motion.button>
          ))}
        </div>
      </div>

      <div data-theme={theme} className="rounded-2xl border border-base-300 bg-base-100 p-4 text-base-content shadow-2xl shadow-primary/10 transition-colors duration-300 sm:p-5 lg:col-span-3">
        <div className="mb-4 flex items-center gap-3 border-b border-base-300 pb-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-content">PS</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Priya Sharma</p>
            <p className="text-xs text-success">Online</p>
          </div>
          <div className="ml-auto shrink-0 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme}
                initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="block rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-primary">
                {theme}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="space-y-2.5 text-[12.5px] sm:text-[13px]">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-base-300 px-3.5 py-2.5 sm:max-w-[75%]">Wow, this theme looks great! 😍</div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-content sm:max-w-[75%]">Right? Switch themes anytime in Settings.</div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-secondary/15 px-3.5 py-2.5 text-secondary sm:max-w-[75%]">Chatty AI: Want a darker one for night? 🌙</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm rounded-full">Primary</button>
          <button className="btn btn-secondary btn-sm rounded-full">Secondary</button>
          <button className="btn btn-accent btn-sm rounded-full">Accent</button>
        </div>
      </div>
    </div>
  );
};

export const ThemesSection = () => (
  <section id="themes" className={SECTION}>
    <div className="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Themes"
        title={<>Chat in <span className={GRADIENT_TEXT}>your own style</span></>}
        sub="Switch between multiple themes instantly. Try them below, the preview changes live."
      />
      <Reveal><ThemeShowcase /></Reveal>
    </div>
  </section>
);
