import { useState, useRef, useLayoutEffect, useEffect } from "react";

// In-memory set of expanded message IDs to preserve expansion state across scroll/rerenders
const expandedMessageIds = new Set();

/**
 * ExpandableMessage
 * WhatsApp-style expandable long-text message component.
 * Automatically collapses messages exceeding `maxLines` (default: 8 lines)
 * with a "Read More" button. Clicking expands the full message with "Read Less".
 */
export const ExpandableMessage = ({
  text = "",
  messageId = null,
  isMine = false,
  maxLines = 8,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(() =>
    messageId ? expandedMessageIds.has(String(messageId)) : false
  );
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef(null);

  // Use layout effect where available, fallback to effect
  const useIsomorphicEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicEffect(() => {
    const el = textRef.current;
    if (!el || !text) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        // In collapsed state, -webkit-line-clamp bounds clientHeight
        const overflows = el.scrollHeight > el.clientHeight + 1;
        setCanExpand(overflows);
      } else {
        // In expanded state, check if content height exceeds maxLines height
        const computed = window.getComputedStyle(el);
        const computedLineHeight = parseFloat(computed.lineHeight);
        const lineHeight =
          Number.isFinite(computedLineHeight) && computedLineHeight > 0
            ? computedLineHeight
            : (parseFloat(computed.fontSize) || 14) * 1.5;
        const maxHeight = lineHeight * maxLines;
        setCanExpand(el.scrollHeight > maxHeight + 4);
      }
    };

    checkOverflow();

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkOverflow();
      });
      resizeObserver.observe(el);
    }

    const onWindowResize = () => checkOverflow();
    window.addEventListener("resize", onWindowResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [text, isExpanded, maxLines]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => {
      const next = !prev;
      if (messageId) {
        if (next) {
          expandedMessageIds.add(String(messageId));
        } else {
          expandedMessageIds.delete(String(messageId));
        }
      }
      return next;
    });
  };

  if (!text) return null;

  return (
    <div className="relative group/expandable">
      <p
        ref={textRef}
        style={
          !isExpanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
        className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] break-words transition-all duration-200 ease-in-out ${className}`}
      >
        {text}
      </p>

      {canExpand && (
        <button
          type="button"
          onClick={handleToggle}
          className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold select-none cursor-pointer transition-opacity duration-150 ${
            isMine
              ? "text-primary-content/90 hover:text-primary-content underline underline-offset-2"
              : "text-primary hover:text-primary/80 underline underline-offset-2"
          }`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Read Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

export default ExpandableMessage;
