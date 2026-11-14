import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const PageHeader = ({
  title,
  subtitle,
  backTo,
  onBack,
  actions,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  };

  const showBack = Boolean(backTo || onBack);

  return (
    <div
      className={`flex items-center justify-between gap-3 pb-4 mb-4 border-b border-base-200 ${className}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px] sm:min-h-[2rem] sm:min-w-[2rem] -ml-2 text-base-content/70 hover:text-base-content"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-base-content/60 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export const PageContainer = ({
  children,
  maxWidth = "7xl", // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
  className = "",
  padded = true,
}) => {
  const maxClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    "4xl": "max-w-4xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  }[maxWidth] || "max-w-7xl";

  const paddingClass = padded
    ? "px-3 sm:px-6 md:px-8 py-3 sm:py-6"
    : "";

  return (
    <div
      className={`mx-auto w-full ${maxClass} ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
};

export const TabNavigation = ({
  tabs = [],
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div
      role="tablist"
      aria-label="Navigation tabs"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-base-200 pb-2 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap min-h-[44px] sm:min-h-0 transition-all select-none ${
              isActive
                ? "bg-primary text-primary-content shadow-xs"
                : "text-base-content/65 hover:text-base-content hover:bg-base-200"
            }`}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`badge badge-xs px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-primary-content/20 text-primary-content" : "badge-neutral"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const SegmentedControl = ({
  options = [],
  value,
  onChange,
  size = "md",
  fullWidth = false,
  className = "",
}) => {
  const sizeClass = size === "sm" ? "p-1 text-xs" : "p-1.5 text-sm";
  const btnPadClass = size === "sm" ? "px-2.5 py-1" : "px-3.5 py-1.5";

  return (
    <div
      role="radiogroup"
      className={`inline-flex items-center bg-base-200/80 rounded-2xl border border-base-300/60 ${sizeClass} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange?.(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all min-h-[40px] sm:min-h-0 select-none ${btnPadClass} ${
              isSelected
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            {opt.icon && <opt.icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const Breadcrumbs = ({ items = [], className = "" }) => {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumbs" className={`text-xs sm:text-sm text-base-content/60 ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={item.label || idx} className="inline-flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="size-3.5 opacity-40 shrink-0" />}
              {isLast ? (
                <span className="font-semibold text-base-content truncate" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link to={item.href} className="hover:text-primary transition-colors truncate">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default {
  PageHeader,
  PageContainer,
  TabNavigation,
  SegmentedControl,
  Breadcrumbs,
};
