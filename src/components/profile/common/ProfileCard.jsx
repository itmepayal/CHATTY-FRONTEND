import { motion } from "framer-motion";
import { PROFILE_VARIANTS } from "./ProfileTokens";

export default function ProfileCard({
  icon: Icon = null,
  title = null,
  subtitle = null,
  headerAction = null,
  children,
  className = "",
  bodyClassName = "",
  divide = false,
  tone = "primary",
  stackHeaderOnMobile = false,
}) {
  return (
    <motion.div
      variants={PROFILE_VARIANTS.item}
      className={`rounded-2xl sm:rounded-3xl border border-base-300/80 bg-base-100 shadow-sm transition-all hover:border-base-content/20 ${className}`}
    >
      {(title || subtitle || headerAction || Icon) && (
        <div className="border-b border-base-200/80 px-3.5 py-3 sm:px-6 sm:py-4">
          {stackHeaderOnMobile ? (
            <>
              {/* Desktop Header Layout (sm and up) */}
              <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && (
                    <span
                      className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${
                        tone === "error"
                          ? "from-error/20 to-error/5 ring-error/25 text-error"
                          : "from-primary/20 to-primary/5 ring-primary/20 text-primary"
                      }`}
                    >
                      <Icon className="size-4 sm:size-[18px]" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h3 className="font-semibold text-sm sm:text-base text-base-content tracking-tight">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="mt-0.5 text-xs text-base-content/60 leading-relaxed">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {headerAction && (
                  <div className="shrink-0 ml-3">{headerAction}</div>
                )}
              </div>

              {/* Mobile Header Layout (< sm) */}
              <div className="flex flex-col gap-2.5 sm:hidden">
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && (
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${
                        tone === "error"
                          ? "from-error/20 to-error/5 ring-error/25 text-error"
                          : "from-primary/20 to-primary/5 ring-primary/20 text-primary"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                  )}
                  {title && (
                    <h3 className="font-semibold text-sm text-base-content tracking-tight">
                      {title}
                    </h3>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-base-content/60 leading-relaxed">
                    {subtitle}
                  </p>
                )}
                {headerAction && (
                  <div className="w-full pt-0.5">{headerAction}</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <span
                    className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${
                      tone === "error"
                        ? "from-error/20 to-error/5 ring-error/25 text-error"
                        : "from-primary/20 to-primary/5 ring-primary/20 text-primary"
                    }`}
                  >
                    <Icon className="size-4 sm:size-[18px]" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {title && (
                    <h3 className="font-semibold text-sm sm:text-base text-base-content tracking-tight">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-base-content/60 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {headerAction && (
                <div className="shrink-0 ml-3">{headerAction}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={`px-3.5 py-3.5 sm:px-6 sm:py-5 ${
          divide ? "divide-y divide-base-200/70" : ""
        } ${bodyClassName}`}
      >
        {children}
      </div>
    </motion.div>
  );
}
