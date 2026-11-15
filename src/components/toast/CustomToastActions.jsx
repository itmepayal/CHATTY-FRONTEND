/**
 * CustomToastActions
 * Action buttons container for interactive toast notifications.
 */
export const CustomToastActions = ({ action, onDismiss, className = "" }) => {
  if (!action) return null;

  if (typeof action === "function") {
    return (
      <div className={`mt-2.5 flex items-center gap-2 pt-1 ${className}`}>
        {action({ dismiss: onDismiss })}
      </div>
    );
  }

  const actionsList = Array.isArray(action) ? action : [action];

  return (
    <div className={`mt-2.5 flex flex-wrap items-center gap-2 pt-1 ${className}`}>
      {actionsList.map((item, index) => {
        if (!item || !item.label) return null;

        const isPrimary = item.primary !== false;

        return (
          <button
            key={item.key || index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick?.(e);
              if (item.autoDismiss !== false) {
                onDismiss?.();
              }
            }}
            className={`btn btn-xs rounded-lg font-bold shadow-2xs transition-all active:scale-95 ${
              isPrimary
                ? "btn-primary text-primary-content"
                : "btn-ghost text-base-content/80 hover:bg-base-200"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default CustomToastActions;
