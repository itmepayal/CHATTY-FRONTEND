import { ArrowLeft, ChevronRight, UsersRound } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import {
  formatCount,
  rowVariants,
  SPRING,
} from "./sidebarUtils.js";

export const UnreadBadge = ({ count }) =>
  count > 0 ? (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-content"
      aria-label={`${count} unread messages`}
    >
      {formatCount(count)}
    </span>
  ) : null;

export const Avatar = ({
  src,
  name,
  group = false,
  online = false,
  selected = false,
}) => (
  <div className="relative shrink-0">
    {group && !src ? (
      <div
        className={`grid size-11 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary ring-2 transition-colors ${
          selected ? "ring-primary/30" : "ring-transparent"
        }`}
      >
        {name?.[0]?.toUpperCase() || <UsersRound className="size-5" />}
      </div>
    ) : (
      <img
        src={src}
        alt={name}
        className={`size-11 rounded-full object-cover ring-2 transition-colors ${
          selected ? "ring-primary/30" : "ring-transparent"
        }`}
      />
    )}
    {online && (
      <span
        className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100"
        aria-label="Online"
      />
    )}
  </div>
);

export const IconAvatar = ({ icon: Icon }) => (
  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-base-200 text-base-content/60">
    <Icon className="size-5" />
  </span>
);

export const Row = ({
  index = 0,
  selected = false,
  onClick,
  avatar,
  title,
  subtitle,
  time,
  unread = 0,
  tone = "default",
  trailing,
  actions,
}) => {
  const hasUnread = unread > 0;
  const danger = tone === "danger";

  return (
    <motion.div
      layout="position"
      variants={rowVariants}
      custom={index}
      initial="hidden"
      animate="show"
      exit="exit"
      className="group relative px-2"
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={`relative flex h-[68px] w-full items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:outline focus-visible:outline-primary/50 ${
          selected ? "" : "hover:bg-base-200 active:bg-base-200"
        }`}
      >
        {selected && (
          <motion.span
            layoutId="sidebar-selected"
            transition={SPRING}
            className="absolute inset-0 rounded-lg bg-primary/10"
          >
            <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" />
          </motion.span>
        )}

        <div className="relative z-10">{avatar}</div>

        <div className="relative z-10 min-w-0 flex-1">
          <div
            className={`truncate text-[15px] ${
              danger ? "text-error" : ""
            } ${hasUnread ? "font-semibold" : "font-medium"}`}
          >
            {title}
          </div>
          <div
            className={`truncate text-[13px] ${
              hasUnread
                ? "font-medium text-base-content"
                : "text-base-content/55"
            }`}
          >
            {subtitle}
          </div>
        </div>

        <div
          className={`relative z-10 flex shrink-0 flex-col items-end self-stretch ${
            time ? "justify-between py-3" : "justify-center"
          }`}
        >
          {time && (
            <span
              className={`whitespace-nowrap text-[11px] ${
                danger
                  ? "font-medium text-error"
                  : hasUnread
                    ? "font-medium text-primary"
                    : "text-base-content/45"
              }`}
            >
              {time}
            </span>
          )}
          <div className="flex min-h-5 items-center gap-1">{trailing}</div>
        </div>
      </button>

      {actions && (
        <div className="absolute bottom-2 right-3 z-20 flex items-center gap-0.5">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

export const RowAction = ({ onClick, label, className = "", pressed, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    className={`grid size-7 place-items-center rounded-md text-base-content/40 transition-all hover:bg-base-300/60 hover:text-base-content focus-visible:opacity-100 ${className}`}
  >
    {children}
  </button>
);

export const Segmented = ({ items, value, onChange, layoutId, label }) => (
  <LayoutGroup id={layoutId}>
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 rounded-lg bg-base-200 p-1"
    >
      {items.map(
        ({ key, label: text, icon: Icon, count, badge, tone, dot }) => {
          const active = value === key;
          const showCount = count !== undefined && count !== null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={`relative flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                active
                  ? "text-base-content"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="pill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-md bg-base-100 shadow-sm ring-1 ring-base-300/60"
                />
              )}
              {Icon && (
                <Icon
                  className={`relative z-10 size-4 shrink-0 ${
                    active ? "text-primary" : ""
                  }`}
                />
              )}
              {dot === "online" && (
                <span className="relative z-10 size-2 shrink-0 rounded-full bg-success" />
              )}
              {dot === "offline" && (
                <span className="relative z-10 size-2 shrink-0 rounded-full border border-base-content/40" />
              )}
              <span className="relative z-10 truncate">{text}</span>
              {showCount && (
                <span
                  className={`relative z-10 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
                    badge
                      ? tone === "danger"
                        ? "bg-error text-error-content"
                        : "bg-primary text-primary-content"
                      : "text-base-content/45"
                  }`}
                >
                  {formatCount(count)}
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  </LayoutGroup>
);

export const HeaderButton = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="grid size-9 place-items-center rounded-lg text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline focus-visible:outline-primary/50"
  >
    <Icon className="size-[18px]" />
  </button>
);

export const BackBar = ({ label, onClick }) => (
  <div className="px-2 pb-1">
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-base-200"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  </div>
);

export const ArchivedRow = ({ count, unread, onClick, noun = "chat" }) => (
  <Row
    onClick={onClick}
    avatar={<IconAvatar icon={ArrowLeft} />}
    title="Archived"
    subtitle={`${count} ${count === 1 ? noun : `${noun}s`}`}
    trailing={
      <>
        <UnreadBadge count={unread} />
        <ChevronRight className="size-4 text-base-content/40" />
      </>
    }
  />
);

export const SectionLabel = ({ children }) => (
  <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
    {children}
  </div>
);

export const EmptyState = ({ icon: Icon, children }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-base-content/55">
    <div className="grid size-14 place-items-center rounded-full bg-base-200">
      <Icon className="size-6 text-base-content/40" />
    </div>
    {children}
  </div>
);

export const ListSkeleton = () => (
  <div className="space-y-1 px-2">
    {Array.from({ length: 7 }).map((_, i) => (
      <div
        key={i}
        className="flex h-[68px] items-center gap-3 rounded-lg px-3 animate-pulse"
      >
        <div className="size-11 rounded-full bg-base-300" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/5 rounded bg-base-300" />
          <div className="h-2.5 w-3/5 rounded bg-base-200" />
        </div>
        <div className="h-2.5 w-8 rounded bg-base-200" />
      </div>
    ))}
  </div>
);

export const FooterAction = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    aria-current={active ? "page" : undefined}
    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-primary/50 ${
      danger
        ? "text-base-content/60 hover:bg-error/10 hover:text-error"
        : active
          ? "bg-primary/10 text-primary"
          : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    <Icon className="size-[18px]" />
  </button>
);
