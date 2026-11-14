const VARIANTS = {
  elevated: "bg-base-100 shadow-md border border-base-300/80",
  outlined: "bg-base-100 border border-base-300",
  flat: "bg-base-200/60 border border-transparent",
  glass: "bg-base-100/70 backdrop-blur-md border border-base-300/60 shadow-lg",
};

const PADDINGS = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
};

export const Card = ({
  children,
  variant = "outlined",
  padding = "md",
  className = "",
  as = "div",
  ...props
}) => {
  const variantClass = VARIANTS[variant] || VARIANTS.outlined;
  const paddingClass = PADDINGS[padding] || PADDINGS.md;
  const Tag = as;

  return (
    <Tag
      className={`rounded-2xl transition-all duration-200 ${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

export const CardHeader = ({
  title,
  subtitle,
  icon,
  action,
  className = "",
}) => {
  const HeaderIcon = icon;
  return (
    <div className={`flex items-start justify-between gap-3 pb-3 border-b border-base-200 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {HeaderIcon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeaderIcon className="size-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-base-content/60 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent = ({ children, className = "" }) => (
  <div className={`pt-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = "" }) => (
  <div className={`pt-4 mt-4 border-t border-base-200 flex items-center justify-end gap-2.5 ${className}`}>
    {children}
  </div>
);

export default Card;
