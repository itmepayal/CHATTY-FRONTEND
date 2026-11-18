import { Lock } from "lucide-react";

/**
 * E2EENotice
 * Shared system encryption notice banner for both private (1:1) and group chats.
 *
 * Requirements:
 * 1. Single shared component and CSS classes for both private and group chats.
 * 2. Zero conditional styling based on chat type (isGroup / isPrivate / chatType).
 * 3. Exact layout metrics:
 *    - Container: display:flex; justify-content:center; width:100%; padding:12px 16px; box-sizing:border-box;
 *    - Notice box: max-width:520px; width:fit-content; margin:0 auto; padding:10px 16px; border-radius:12px; text-align:center; font-size:14px; line-height:1.4;
 * 4. Colors, icon, and text content are preserved.
 */
export const E2EENotice = ({
  onOpen,
  isGroup = false,
  text,
  className = "",
}) => {
  const defaultText = isGroup
    ? "Text messages in this group are end-to-end encrypted. Only people in this group can read them, not even the server. Tap to learn more."
    : "Text messages in this chat are end-to-end encrypted. Only you and the other person can read them, not even the server. Tap to learn more.";

  const messageText = text || defaultText;

  return (
    <div
      className="chat-e2ee-notice-container box-border flex w-full justify-center px-4 py-3"
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        padding: "12px 16px",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={`chat-e2ee-notice-box w-fit max-w-[520px] mx-auto rounded-[12px] px-4 py-2.5 text-center text-[14px] leading-[1.4] border border-warning/30 bg-warning/15 text-base-content/80 shadow-xs transition-colors hover:bg-warning/25 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer ${className}`}
        style={{
          maxWidth: "520px",
          width: "fit-content",
          margin: "0 auto",
          padding: "10px 16px",
          borderRadius: "12px",
          textAlign: "center",
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <Lock className="mr-1 inline size-3.5 -translate-y-px" aria-hidden="true" />
        {messageText}
      </button>
    </div>
  );
};

export default E2EENotice;
