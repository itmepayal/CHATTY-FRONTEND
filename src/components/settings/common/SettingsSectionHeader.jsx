export default function SettingsSectionHeader({
  title,
  desc,
  icon: Icon = null,
  actions = null,
  badge = null,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-base-300/60 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-base-content break-words">
              {title}
            </h2>
            {badge && (
              <span className="badge badge-primary badge-xs scale-90 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-xs sm:text-sm text-base-content/65 mt-0.5 leading-relaxed break-words">
              {desc}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
