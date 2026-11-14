import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SIZES = {
  xs: "size-8 text-xs",
  sm: "size-10 text-sm",
  md: "size-14 sm:size-16 text-lg sm:text-xl",
  lg: "size-20 sm:size-24 text-2xl sm:text-3xl",
  xl: "size-28 sm:size-32 text-4xl sm:text-5xl",
  "2xl": "size-32 sm:size-40 text-5xl sm:text-6xl",
};

/**
 * CallAvatar with initials fallback, error handling, and animated pulse rings.
 */
export default function CallAvatar({
  src,
  name = "User",
  size = "xl",
  pulse = false,
  pulseColor = "bg-primary/25",
  className = "",
  ringClassName = "",
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = (name || "?").trim().charAt(0).toUpperCase();
  const dimensionClass = SIZES[size] || SIZES.xl;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {pulse &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className={`absolute inset-0 rounded-full ${pulseColor} pointer-events-none`}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: [1, 1.85, 2.1], opacity: [0.55, 0.25, 0] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.7,
            }}
          />
        ))}

      <div className="relative">
        {src && !failed ? (
          <img
            src={src}
            alt={name}
            onError={() => setFailed(true)}
            className={`rounded-full border-2 border-white/20 bg-neutral/80 object-cover shadow-2xl ${dimensionClass} ${ringClassName}`}
          />
        ) : (
          <div
            aria-hidden="true"
            className={`flex items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-primary via-primary/80 to-secondary font-semibold text-primary-content shadow-2xl ${dimensionClass} ${ringClassName}`}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
