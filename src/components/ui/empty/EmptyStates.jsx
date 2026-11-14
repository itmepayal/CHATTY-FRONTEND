import { Inbox, AlertCircle, SearchX, WifiOff, RefreshCw } from "lucide-react";
import Button from "../button/Button";

export const EmptyState = ({
  icon = Inbox,
  title = "No data found",
  description = "There are no items to display at this moment.",
  action,
  actionLabel,
  onAction,
  secondaryAction,
  className = "",
  children,
}) => {
  const StateIcon = icon;
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 sm:p-10 text-center max-w-md mx-auto ${className}`}
    >
      <div className="flex size-14 sm:size-16 items-center justify-center rounded-3xl bg-base-200/80 text-base-content/50 mb-4 ring-1 ring-base-300 shadow-xs">
        <StateIcon className="size-7 sm:size-8" aria-hidden="true" />
      </div>
      <h4 className="text-base sm:text-lg font-semibold tracking-tight text-base-content mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs sm:text-sm text-base-content/60 leading-relaxed max-w-sm mb-5">
          {description}
        </p>
      )}
      {children}
      {(action || actionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {action ? (
            action
          ) : (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export const ErrorState = ({
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this content.",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}) => {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={message}
      action={
        onRetry ? (
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
};

export const NotFoundState = ({
  title = "Page or item not found",
  message = "The content you are looking for has been moved, deleted, or does not exist.",
  onBack,
  backLabel = "Go Back",
  className = "",
}) => {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={message}
      action={
        onBack ? (
          <Button variant="primary" size="sm" onClick={onBack}>
            {backLabel}
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
};

export const OfflineState = ({
  title = "You're offline",
  message = "Please check your internet connection. We will automatically reconnect once available.",
  onReconnect,
  className = "",
}) => {
  return (
    <EmptyState
      icon={WifiOff}
      title={title}
      description={message}
      action={
        onReconnect ? (
          <Button variant="outline" size="sm" onClick={onReconnect}>
            Check Connection
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
};

export default {
  EmptyState,
  ErrorState,
  NotFoundState,
  OfflineState,
};
