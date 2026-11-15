import { useEffect, useState, useRef } from "react";

/**
 * CustomToastProgress
 * Smooth linear progress bar for auto-dismiss countdown with pause-on-hover support.
 */
export const CustomToastProgress = ({
  duration,
  isPaused = false,
  type = "info",
  className = "",
}) => {
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const animFrameRef = useRef(null);

  const PROGRESS_COLORS = {
    success: "bg-success/80",
    error: "bg-error/80",
    warning: "bg-warning/80",
    info: "bg-info/80",
    loading: "bg-primary/80",
  };

  const colorClass = PROGRESS_COLORS[type] || PROGRESS_COLORS.info;

  useEffect(() => {
    if (duration === Infinity || !duration) return;

    if (isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    const update = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const percent = (currentRemaining / duration) * 100;

      setProgress(percent);

      if (currentRemaining > 0) {
        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const now = Date.now();
      remainingTimeRef.current = Math.max(
        0,
        remainingTimeRef.current - (now - startTimeRef.current)
      );
    };
  }, [duration, isPaused]);

  if (duration === Infinity || !duration) return null;

  return (
    <div
      className={`absolute bottom-0 inset-x-0 h-1 overflow-hidden rounded-b-xl bg-base-300/40 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div
        className={`h-full transition-all duration-75 ease-linear ${colorClass}`}
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  );
};

export default CustomToastProgress;
