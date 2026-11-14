import { Loader2 } from "lucide-react";
import { ChattyLogo } from "../../common/ChattyLogo";

const SPINNER_SIZES = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
};

export const LoadingSpinner = ({
  size = "md",
  className = "",
  label = "Loading...",
}) => {
  const sizeClass = SPINNER_SIZES[size] || SPINNER_SIZES.md;
  return (
    <div
      role="status"
      className="inline-flex items-center justify-center text-primary"
    >
      <Loader2 className={`animate-spin ${sizeClass} ${className}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export const ButtonLoader = ({ label = "Loading...", className = "" }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
    <span>{label}</span>
  </span>
);

export const PageLoader = ({ message = "Loading Chatty...", className = "" }) => {
  return (
    <div
      role="status"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-100 p-4 ${className}`}
    >
      <div className="flex flex-col items-center gap-4 text-center animate-pulse">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-base-200 shadow-md ring-1 ring-base-300">
          <ChattyLogo className="size-10" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-base-content/75">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};

export const Skeleton = ({
  variant = "rectangular", // 'text' | 'circular' | 'rectangular'
  width,
  height,
  className = "",
}) => {
  const variantClass =
    variant === "circular"
      ? "rounded-full shrink-0"
      : variant === "text"
        ? "h-4 rounded-md w-full"
        : "rounded-xl w-full";

  const style = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`bg-base-300/60 animate-pulse ${variantClass} ${className}`}
    />
  );
};

export const ListSkeleton = ({ count = 5, className = "" }) => {
  return (
    <div className={`space-y-3 p-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width="44px" height="44px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height="14px" />
            <Skeleton variant="text" width="85%" height="11px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 3, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-base-200 bg-base-100 space-y-3">
          <Skeleton height="120px" />
          <Skeleton variant="text" width="70%" height="18px" />
          <Skeleton variant="text" width="90%" height="14px" />
        </div>
      ))}
    </div>
  );
};

export default {
  LoadingSpinner,
  ButtonLoader,
  PageLoader,
  Skeleton,
  ListSkeleton,
  CardSkeleton,
};
