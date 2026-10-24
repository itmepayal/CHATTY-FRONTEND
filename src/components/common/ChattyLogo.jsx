import { useId } from "react";

export const ChattyLogo = ({ className = "size-7", animated = true }) => {
  const id = useId();
  const front = `${id}-front`;
  const back = `${id}-back`;

  return (
    <svg
      viewBox="0 0 40 38"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={front}
          x1="5"
          y1="9"
          x2="31"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="currentColor" className="text-primary" />
          <stop
            offset="1"
            stopColor="currentColor"
            className="text-secondary"
          />
        </linearGradient>
        <linearGradient
          id={back}
          x1="14"
          y1="4"
          x2="36"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0"
            stopColor="currentColor"
            className="text-secondary"
          />
          <stop offset="1" stopColor="currentColor" className="text-accent" />
        </linearGradient>
      </defs>
      <rect
        x="14"
        y="4"
        width="22"
        height="15"
        rx="6"
        fill={`url(#${back})`}
        opacity="0.55"
      />

      <path
        d="M12 9H24A7 7 0 0 1 31 16V22A7 7 0 0 1 24 29H17.5L11.5 34.5V29H12A7 7 0 0 1 5 22V16A7 7 0 0 1 12 9Z"
        fill={`url(#${front})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.75"
      />

      <path
        d="M12 10.5H24A5.5 5.5 0 0 1 29.5 16"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="round"
      />

      <g fill="white" className={animated ? "chatty-dots" : ""}>
        <circle cx="12" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
        <circle cx="24" cy="19" r="2" />
      </g>
    </svg>
  );
};
