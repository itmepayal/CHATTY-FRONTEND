import { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { parseDeepLink } from "../../utils/deepLink";

// In-memory set of expanded message IDs to preserve expansion state across scroll/rerenders
const expandedMessageIds = new Set();

const LINK_REGEX = /(chatty:\/\/[^\s]+|https?:\/\/[^\s]+)/gi;

const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

/**
 * ExpandableMessage
 * WhatsApp-style expandable long-text message component with @mention & link rendering.
 * Automatically collapses messages exceeding `maxLines` (default: 8 lines)
 * with a "Read More" button. Clicking expands the full message with "Read Less".
 */
export const ExpandableMessage = ({
  text = "",
  messageId = null,
  isMine = false,
  maxLines = 8,
  className = "",
  mentions = [],
  onMentionClick = null,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(() =>
    messageId ? expandedMessageIds.has(String(messageId)) : false,
  );
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef(null);

  const formattedContent = useMemo(() => {
    if (!text || typeof text !== "string") return text;

    // Collect names/usernames from mentions array for precise tokenization
    const mentionNames = (Array.isArray(mentions) ? mentions : [])
      .flatMap((m) => [m.user?.username, m.user?.fullName, m.name])
      .filter((n) => Boolean(n) && typeof n === "string")
      .map((n) => n.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const uniqueNames = [...new Set(mentionNames)].map(escapeRegex);

    let patternString;
    if (uniqueNames.length > 0) {
      patternString = `(chatty:\\/\\/[^\\s]+|https?:\\/\\/[^\\s]+|@everyone|@all|@(?:${uniqueNames.join("|")})|@[a-zA-Z0-9_.]+)`;
    } else {
      patternString = `(chatty:\\/\\/[^\\s]+|https?:\\/\\/[^\\s]+|@everyone|@all|@[a-zA-Z0-9_.]+)`;
    }

    const tokenRegex = new RegExp(patternString, "gi");
    const parts = text.split(tokenRegex);

    if (parts.length <= 1) return text;

    return parts.map((part, index) => {
      if (!part) return null;

      // 1. Deep Links / Web URLs
      if (/^(?:chatty:\/\/|https?:\/\/)/i.test(part)) {
        const deep = parseDeepLink(part);
        if (deep?.type === "user" && deep.identifier) {
          return (
            <span
              key={index}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigate(`/user/${encodeURIComponent(deep.identifier)}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate(`/user/${encodeURIComponent(deep.identifier)}`);
                }
              }}
              className="underline font-semibold cursor-pointer hover:opacity-80 decoration-inherit"
            >
              {part}
            </span>
          );
        }

        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline hover:opacity-80 break-words [overflow-wrap:anywhere]"
          >
            {part}
          </a>
        );
      }

      // 2. @Mentions (@Username, @FullName, @everyone, @all)
      if (part.startsWith("@")) {
        const rawTarget = part.slice(1).trim();
        const matchedMention = (Array.isArray(mentions) ? mentions : []).find(
          (m) => {
            const u = m.user;
            const targetLower = rawTarget.toLowerCase();
            return (
              (u?.username && u.username.toLowerCase() === targetLower) ||
              (u?.fullName && u.fullName.toLowerCase() === targetLower) ||
              (m.name && m.name.toLowerCase() === targetLower)
            );
          },
        );

        const targetUserIdentifier =
          matchedMention?.user?.username ||
          matchedMention?.userId ||
          rawTarget;

        return (
          <span
            key={index}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onMentionClick && matchedMention?.userId) {
                onMentionClick(matchedMention.userId);
              } else if (targetUserIdentifier) {
                navigate(`/user/${encodeURIComponent(targetUserIdentifier)}`);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                if (onMentionClick && matchedMention?.userId) {
                  onMentionClick(matchedMention.userId);
                } else if (targetUserIdentifier) {
                  navigate(`/user/${encodeURIComponent(targetUserIdentifier)}`);
                }
              }
            }}
            title={
              matchedMention?.user?.fullName
                ? `View profile: ${matchedMention.user.fullName}`
                : `Mentioned: ${part}`
            }
            className={`font-semibold cursor-pointer rounded-md px-1 py-0.5 transition-all inline-block select-none ${
              isMine
                ? "bg-primary-content/25 text-primary-content hover:bg-primary-content/35 underline decoration-primary-content/40"
                : "bg-primary/15 text-primary hover:bg-primary/25 underline decoration-primary/40"
            }`}
          >
            {part}
          </span>
        );
      }

      return part;
    });
  }, [text, mentions, isMine, navigate, onMentionClick]);

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
        className={`whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] transition-all duration-200 ease-in-out ${className}`}
      >
        {formattedContent}
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
