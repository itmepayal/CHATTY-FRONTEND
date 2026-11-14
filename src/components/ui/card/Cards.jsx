import Card, { CardHeader, CardContent, CardFooter } from "./Card";
import { ChevronRight } from "lucide-react";

export const SectionCard = ({
  title,
  subtitle,
  icon,
  action,
  children,
  footer,
  className = "",
  variant = "outlined",
  padding = "md",
  ...props
}) => {
  return (
    <Card variant={variant} padding={padding} className={className} {...props}>
      {(title || subtitle || icon || action) && (
        <CardHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          action={action}
        />
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
};

export const SettingsCard = ({
  children,
  title,
  description,
  className = "",
  ...props
}) => {
  return (
    <Card variant="outlined" padding="none" className={`overflow-hidden divide-y divide-base-200 ${className}`} {...props}>
      {(title || description) && (
        <div className="p-4 sm:p-5 bg-base-200/40">
          {title && <h3 className="font-semibold text-base sm:text-lg">{title}</h3>}
          {description && (
            <p className="text-xs sm:text-sm text-base-content/60 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="divide-y divide-base-200">{children}</div>
    </Card>
  );
};

export const SettingsRow = ({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  disabled = false,
  className = "",
}) => {
  const isClickable = Boolean(onClick);
  const Component = isClickable ? "button" : "div";

  return (
    <Component
      type={isClickable ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left transition-colors min-h-[48px] ${
        isClickable ? "hover:bg-base-200/50 cursor-pointer active:bg-base-200" : ""
      } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4 sm:size-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-medium truncate">{title}</p>
          {description && (
            <p className="text-xs text-base-content/60 mt-0.5 leading-snug line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {children}
        {isClickable && !children && (
          <ChevronRight className="size-4 text-base-content/40" aria-hidden="true" />
        )}
      </div>
    </Component>
  );
};

export const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  positive = true,
  className = "",
}) => {
  return (
    <Card variant="outlined" padding="sm" className={`flex items-center gap-4 ${className}`}>
      {Icon && (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-base-content/60 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">{value}</p>
        {change && (
          <p
            className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${
              positive ? "text-success" : "text-error"
            }`}
          >
            {change}
          </p>
        )}
      </div>
    </Card>
  );
};

export const ContentCard = ({
  image,
  title,
  subtitle,
  tags = [],
  children,
  onClick,
  className = "",
}) => {
  return (
    <Card
      variant="outlined"
      padding="none"
      onClick={onClick}
      className={`overflow-hidden group ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md" : ""
      } ${className}`}
    >
      {image && (
        <div className="aspect-video w-full overflow-hidden bg-base-200">
          <img
            src={image}
            alt={title || ""}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 sm:p-5">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="badge badge-sm badge-ghost text-xs font-normal"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {title && <h3 className="font-semibold text-base sm:text-lg truncate">{title}</h3>}
        {subtitle && (
          <p className="text-xs sm:text-sm text-base-content/60 mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </Card>
  );
};

export const ProfileCard = ({
  avatar,
  name,
  username,
  status,
  online = false,
  actions,
  className = "",
}) => {
  return (
    <Card variant="outlined" padding="md" className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative">
        <img
          src={avatar || "/avatar.png"}
          alt={name}
          className="size-20 sm:size-24 rounded-full object-cover ring-4 ring-base-200 shadow-md"
        />
        {online && (
          <span className="absolute bottom-1 right-1 size-4 rounded-full bg-success ring-4 ring-base-100" />
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold truncate max-w-full">{name}</h3>
      {username && <p className="text-xs sm:text-sm text-base-content/60">@{username}</p>}
      {status && (
        <p className="mt-2 text-xs sm:text-sm text-base-content/75 line-clamp-2 max-w-xs">
          {status}
        </p>
      )}
      {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
    </Card>
  );
};

export default {
  SectionCard,
  SettingsCard,
  SettingsRow,
  StatCard,
  ContentCard,
  ProfileCard,
};
