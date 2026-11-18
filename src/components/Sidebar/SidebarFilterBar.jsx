import { Star, X } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import { formatCount, SPRING } from "./sidebarUtils.js";

/**
 * FilterChip (Mobile-first compact filter chip)
 */
export const FilterChip = ({
  active = false,
  onClick,
  label,
  icon: Icon,
  dot,
  count,
  badge = false,
  tone,
  title,
}) => {
  const showCount = count !== undefined && count !== null && count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-pressed={active}
      className={`shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold transition-all duration-150 select-none cursor-pointer ${
        active
          ? dot === "online"
            ? "bg-success/20 text-success border border-success/40 shadow-xs"
            : "bg-primary text-primary-content shadow-xs"
          : "bg-base-200/75 text-base-content/70 hover:bg-base-200 hover:text-base-content border border-transparent"
      }`}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {dot === "online" && (
        <span
          className={`size-2 shrink-0 rounded-full bg-success ${
            active ? "ring-2 ring-success/30" : ""
          }`}
          aria-hidden="true"
        />
      )}
      {dot === "offline" && (
        <span
          className="size-2 shrink-0 rounded-full border border-base-content/40"
          aria-hidden="true"
        />
      )}
      <span className="truncate">{label}</span>
      {showCount && (
        <span
          className={`inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold tabular-nums leading-none ${
            active
              ? dot === "online"
                ? "bg-success text-success-content"
                : "bg-primary-content text-primary"
              : badge
                ? tone === "danger"
                  ? "bg-error text-error-content"
                  : "bg-primary text-primary-content"
                : "bg-base-300 text-base-content/70"
          }`}
        >
          {formatCount(count)}
        </span>
      )}
    </button>
  );
};

/**
 * SidebarFilterBar
 * Mobile-First Responsive Filter Toolbar
 * Mobile: Single-row horizontally scrollable chips (zero page overflow, compact vertical space).
 * Desktop: Clean organized filter toolbar with proper spacing and visual clarity.
 */
export const SidebarFilterBar = ({
  tabItems = [],
  tab,
  setTab,
  presenceItems = [],
  presence,
  setPresence,
  hasActiveFilters,
  clearFilters,
}) => {
  const onlineItem = presenceItems.find((p) => p.key === "online");
  const offlineItem = presenceItems.find((p) => p.key === "offline");

  return (
    <div className="w-full">
      {/* ---------------- Mobile: Single compact horizontally scrollable chip track ---------------- */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 select-none -mx-1 px-1">
        {/* Category Views (All / Unread / Favorites) */}
        {tabItems.map((item) => (
          <FilterChip
            key={item.key}
            active={tab === item.key}
            onClick={() => setTab(item.key)}
            label={item.label}
            icon={item.key === "favorites" ? Star : undefined}
            count={item.count}
            badge={item.badge}
            title={`Show ${item.label} conversations`}
          />
        ))}

        {/* Logical Group Divider */}
        <div
          className="h-4 w-px bg-base-300/80 mx-0.5 shrink-0"
          aria-hidden="true"
        />

        {/* Presence Status (Online / Offline) */}
        <FilterChip
          active={presence === "online"}
          onClick={() =>
            setPresence(presence === "online" ? "any" : "online")
          }
          label="Online"
          dot="online"
          count={onlineItem?.count}
          title="Filter by online contacts"
        />
        <FilterChip
          active={presence === "offline"}
          onClick={() =>
            setPresence(presence === "offline" ? "any" : "offline")
          }
          label="Offline"
          dot="offline"
          count={offlineItem?.count}
          title="Filter by offline contacts"
        />

        {/* Clear active filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            title="Reset filters to All"
          >
            <X className="size-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ---------------- Desktop: Clean structured filter toolbar ---------------- */}
      <div className="hidden lg:flex flex-col gap-1.5">
        <LayoutGroup id="desktop-sidebar-tabs">
          <div
            role="tablist"
            aria-label="Filter conversations"
            className="flex gap-1 rounded-lg bg-base-200/80 p-1"
          >
            {tabItems.map((item) => {
              const active = tab === item.key;
              const showCount = item.count !== undefined && item.count !== null && item.count > 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.key)}
                  className={`relative flex h-7.5 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                    active
                      ? "text-base-content font-semibold"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-tab-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-md bg-base-100 shadow-xs ring-1 ring-base-300/60"
                    />
                  )}
                  {item.key === "favorites" && (
                    <Star
                      className={`relative z-10 size-3 shrink-0 ${
                        active ? "fill-warning text-warning" : ""
                      }`}
                    />
                  )}
                  <span className="relative z-10 truncate">{item.label}</span>
                  {showCount && (
                    <span
                      className={`relative z-10 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
                        item.badge
                          ? "bg-primary text-primary-content"
                          : "text-base-content/50"
                      }`}
                    >
                      {formatCount(item.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <LayoutGroup id="desktop-sidebar-presence">
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex gap-1 rounded-lg bg-base-200/60 p-0.5"
          >
            {presenceItems.map((item) => {
              const active = presence === item.key;
              const showCount =
                item.key !== "any" &&
                item.count !== undefined &&
                item.count !== null &&
                item.count > 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPresence(item.key)}
                  className={`relative flex h-6.5 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? "text-base-content font-semibold"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-presence-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-md bg-base-100 shadow-2xs ring-1 ring-base-300/40"
                    />
                  )}
                  {item.dot === "online" && (
                    <span className="relative z-10 size-1.5 shrink-0 rounded-full bg-success" />
                  )}
                  {item.dot === "offline" && (
                    <span className="relative z-10 size-1.5 shrink-0 rounded-full border border-base-content/40" />
                  )}
                  <span className="relative z-10 truncate">{item.label}</span>
                  {showCount && (
                    <span className="relative z-10 text-[10px] text-base-content/50 tabular-nums">
                      ({formatCount(item.count)})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
};

export default SidebarFilterBar;
