import { motion } from "framer-motion";
import { SETTINGS_VARIANTS } from "./settingsTokens";

export default function SettingsRow({
  title,
  desc,
  icon: Icon = null,
  badge = null,
  toggle = null,
  children = null,
  stack = false,
  wide = false,
  disabled = false,
  className = "",
}) {
  if (stack) {
    return (
      <motion.div
        variants={SETTINGS_VARIANTS.item}
        animate={{ opacity: disabled ? 0.5 : 1 }}
        className={`py-3.5 sm:py-4 @sm:py-4 transition-opacity ${className}`}
      >
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full min-w-0">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full">
            {Icon && (
              <span
                className="flex size-9 sm:size-10 @sm:size-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-base-content/70 mt-0.5"
                aria-hidden="true"
              >
                <Icon className="size-4 sm:size-5" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-base-content leading-snug break-words">
                  {title}
                </h3>
                {badge && (
                  <span className="badge badge-primary badge-xs font-semibold shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {desc && (
                <p className="mt-1 text-xs sm:text-sm text-base-content/65 leading-relaxed break-words">
                  {desc}
                </p>
              )}
            </div>

            {toggle && (
              <div className="shrink-0 self-start sm:self-center ml-2">
                {toggle}
              </div>
            )}
          </div>

          {children && (
            <div className="w-full min-w-0 pt-0.5">
              {children}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const hasControls = Boolean(children);
  const hasToggle = Boolean(toggle);

  return (
    <motion.div
      variants={SETTINGS_VARIANTS.item}
      animate={{ opacity: disabled ? 0.5 : 1 }}
      className={`py-3.5 sm:py-4 @sm:py-4 transition-opacity ${className}`}
    >
      <div
        className={`grid gap-x-3 sm:gap-x-4 @sm:gap-x-4 gap-y-2 sm:gap-y-1 @sm:gap-y-1 items-center ${
          Icon
            ? hasControls && hasToggle
              ? "grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] @sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              : "grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto] @sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            : hasControls && hasToggle
              ? "grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] @sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              : "grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto] @sm:grid-cols-[minmax(0,1fr)_auto]"
        }`}
      >
        {Icon && (
          <span
            className="col-start-1 row-start-1 sm:row-start-1 sm:row-span-2 @sm:row-start-1 @sm:row-span-2 self-center sm:self-start @sm:self-start flex size-9 sm:size-10 @sm:size-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-base-content/70 sm:mt-0.5 @sm:mt-0.5"
            aria-hidden="true"
          >
            <Icon className="size-4 sm:size-5" />
          </span>
        )}

        <div
          className={`${
            Icon ? "col-start-2" : "col-start-1"
          } row-start-1 self-center sm:self-end @sm:self-end min-w-0`}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-base-content leading-snug break-words">
              {title}
            </h3>
            {badge && (
              <span className="badge badge-primary badge-xs font-semibold shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>

        {desc && (
          <p
            className={`${
              Icon
                ? "col-span-full sm:col-start-2 sm:col-span-1 @sm:col-start-2 @sm:col-span-1"
                : "col-span-full sm:col-start-1 sm:col-span-1 @sm:col-start-1 @sm:col-span-1"
            } sm:row-start-2 @sm:row-start-2 self-start text-xs sm:text-sm text-base-content/65 leading-relaxed break-words`}
          >
            {desc}
          </p>
        )}

        {hasControls && (
          <div
            className={`${
              hasToggle
                ? "col-span-full sm:col-start-3 sm:col-span-1 sm:row-start-1 sm:row-span-2 @sm:col-start-3 @sm:col-span-1 @sm:row-start-1 @sm:row-span-2 sm:self-center @sm:self-center sm:justify-self-end @sm:justify-self-end pt-1 sm:pt-0 @sm:pt-0"
                : wide
                  ? "col-span-full sm:col-start-3 sm:col-span-1 sm:row-start-1 sm:row-span-2 @sm:col-start-3 @sm:col-span-1 @sm:row-start-1 @sm:row-span-2 sm:self-center @sm:self-center sm:justify-self-end @sm:justify-self-end pt-1 sm:pt-0 @sm:pt-0"
                  : Icon
                    ? "col-span-full sm:col-start-3 sm:col-span-1 sm:row-start-1 sm:row-span-2 @sm:col-start-3 @sm:col-span-1 @sm:row-start-1 @sm:row-span-2 sm:self-center @sm:self-center sm:justify-self-end @sm:justify-self-end pt-1 sm:pt-0 @sm:pt-0"
                    : "col-span-full sm:col-start-2 sm:col-span-1 sm:row-start-1 sm:row-span-2 @sm:col-start-2 @sm:col-span-1 @sm:row-start-1 @sm:row-span-2 sm:self-center @sm:self-center sm:justify-self-end @sm:justify-self-end pt-1 sm:pt-0 @sm:pt-0"
            } flex flex-wrap items-center gap-2 sm:gap-3`}
          >
            {children}
          </div>
        )}

        {hasToggle && (
          <div
            className={`${
              hasControls
                ? Icon
                  ? "col-start-3 sm:col-start-4 @sm:col-start-4"
                  : "col-start-2 sm:col-start-3 @sm:col-start-3"
                : Icon
                  ? "col-start-3 sm:col-start-3 @sm:col-start-3"
                  : "col-start-2 sm:col-start-2 @sm:col-start-2"
            } row-start-1 sm:row-start-1 sm:row-span-2 @sm:row-start-1 @sm:row-span-2 self-center justify-self-end shrink-0`}
          >
            {toggle}
          </div>
        )}
      </div>
    </motion.div>
  );
}
