import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  MessageSquare,
  Loader2,
  Ban,
  CornerDownRight,
} from "lucide-react";
import { formatMessageTime } from "../../../utils/timeUtils.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useChatStore } from "../../../store/useChatStore.js";
import { useGroupStore } from "../../../store/useGroupStore.js";
import ReactionChips from "../reactions/ReactionChips.jsx";

const resolveAvatar = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (avatar && typeof avatar === "object" && typeof avatar.url === "string") {
    return avatar.url;
  }
  return null;
};

const resolveSender = (msg, authUser, selectedUser, selectedGroup, isGroup) => {
  if (!msg) return { name: isGroup ? "Group Member" : "User", avatar: null, isMe: false };
  const currentUid = String(authUser?._id || authUser?.id || "");
  const senderObj =
    msg.sender || (typeof msg.senderId === "object" ? msg.senderId : null);
  const senderId = String(
    senderObj?._id || senderObj?.id || msg.senderId || ""
  );
  const isMe = Boolean(senderId && currentUid && senderId === currentUid);

  if (isMe) {
    return {
      name: authUser?.fullName || authUser?.username || "You",
      avatar: resolveAvatar(authUser?.avatar || authUser?.profilePic),
      isMe: true,
    };
  }

  // Check embedded sender object
  if (senderObj && (senderObj.fullName || senderObj.username)) {
    return {
      name: senderObj.fullName || senderObj.username || "User",
      avatar: resolveAvatar(senderObj.avatar || senderObj.profilePic),
      isMe: false,
    };
  }

  // 1:1 chat peer lookup
  if (!isGroup && selectedUser && String(selectedUser.id || selectedUser._id) === senderId) {
    return {
      name: selectedUser.fullName || selectedUser.username || "User",
      avatar: resolveAvatar(selectedUser.avatar || selectedUser.profilePic),
      isMe: false,
    };
  }

  // Group chat member lookup
  if (isGroup && selectedGroup?.members) {
    const member = selectedGroup.members.find((m) => {
      const u = m.user || m.userId || m;
      return String(u?._id || u?.id || u) === senderId;
    });
    if (member) {
      const u = member.user || member.userId || member;
      if (typeof u === "object") {
        return {
          name: u.fullName || u.username || member.fullName || "Group Member",
          avatar: resolveAvatar(u.avatar || u.profilePic || member.avatar),
          isMe: false,
        };
      }
    }
  }

  return {
    name: isGroup ? "Group Member" : "User",
    avatar: null,
    isMe: false,
  };
};

const ThreadPanel = ({
  parentMessage,
  replies = [],
  loading = false,
  isGroup = false,
  groupId = null,
  onClose,
  onSendReply,
  onToggleReaction,
}) => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest reply on new replies
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  // Focus composer on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      await onSendReply(text);
      setReplyText("");
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("[ThreadPanel] Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setReplyText(e.target.value);
    // Auto-grow textarea up to 120px
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const currentUid = String(authUser?._id || authUser?.id || "");
  const parentSender = resolveSender(
    parentMessage,
    authUser,
    selectedUser,
    selectedGroup,
    isGroup
  );
  const parentSenderName = parentSender.name;
  const parentAvatar = parentSender.avatar;

  const isParentDeleted = Boolean(parentMessage?.isDeleted);

  return (
    <>
      {/* Mobile/Tablet Backdrop (below lg / 1024px) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Thread Aside Panel */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[380px] flex-col bg-base-100 border-l border-base-300 shadow-2xl lg:relative lg:z-auto lg:w-[300px] xl:w-[320px] lg:shrink-0 lg:shadow-none min-h-0 h-full overflow-hidden transition-all duration-200"
      >
        {/* Header */}
        <div className="flex h-13 sm:h-14 shrink-0 items-center justify-between px-4 sm:px-5 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-base-content leading-none">
                Thread
              </h3>
              <span className="text-[11px] text-base-content/60 truncate block mt-0.5 max-w-[200px]">
                with {parentSenderName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-xs btn-circle hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
            title="Close Thread (Esc)"
            aria-label="Close Thread"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Thread Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-4 py-3.5 space-y-3.5 [scrollbar-gutter:stable]">
          {/* Parent Message Card */}
          {parentMessage && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-base-200/50 border border-base-300/80 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-base-300 overflow-hidden ring-1 ring-base-300/80 shrink-0">
                  {parentAvatar ? (
                    <img
                      src={parentAvatar}
                      alt={parentSenderName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center font-bold text-xs text-base-content/70 uppercase">
                      {parentSenderName ? parentSenderName[0] : "U"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-base-content truncate block">
                    {parentSenderName}
                  </span>
                  <span className="text-[10px] text-base-content/50">
                    {formatMessageTime(parentMessage.createdAt)}
                  </span>
                </div>
              </div>

              {/* Parent Message Content */}
              {isParentDeleted ? (
                <div className="flex items-center gap-1.5 text-xs italic text-base-content/50 py-1">
                  <Ban className="size-3.5 shrink-0" />
                  <span>This message was deleted</span>
                </div>
              ) : (
                <>
                  {parentMessage.text && (
                    <p className="text-xs text-base-content/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text">
                      {parentMessage.text}
                    </p>
                  )}

                  {parentMessage.image?.url && (
                    <img
                      src={parentMessage.image.url}
                      alt="Attachment"
                      className="rounded-xl max-h-44 w-auto max-w-full object-cover mt-1 border border-base-300/80"
                    />
                  )}

                  {parentMessage.file?.name && (
                    <div className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 p-2 text-xs">
                      <span className="font-medium truncate flex-1">
                        {parentMessage.file.name}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Divider with Reply Count */}
          <div className="flex items-center gap-2 text-[11px] text-base-content/50 font-medium select-none">
            <div className="h-px bg-base-300 flex-1" />
            <span>
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px bg-base-300 flex-1" />
          </div>

          {/* Replies Stream */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-base-content/50">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs font-medium">Loading replies…</span>
            </div>
          ) : replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
              <div className="size-10 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center text-base-content/50">
                <CornerDownRight className="size-5" />
              </div>
              <p className="text-xs font-semibold text-base-content">
                No replies yet
              </p>
              <p className="text-[11px] text-base-content/60 max-w-[200px]">
                Send a reply below to start the thread.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => {
                const senderInfo = resolveSender(
                  reply,
                  authUser,
                  selectedUser,
                  selectedGroup,
                  isGroup
                );
                const name = senderInfo.name;
                const avatar = senderInfo.avatar;
                const isMe = senderInfo.isMe;
                const isReplyDeleted = Boolean(reply.isDeleted);

                return (
                  <div
                    key={reply.id || reply._id}
                    className={`flex gap-2 text-xs ${
                      isMe ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className="size-6 rounded-full bg-base-300 overflow-hidden ring-1 ring-base-300 shrink-0 mt-0.5">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center font-bold text-[10px] text-base-content/70 uppercase">
                          {name ? name[0] : "U"}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex flex-col min-w-0 max-w-[85%] ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 px-1 mb-0.5">
                        <span className="text-[10px] font-semibold text-base-content/70 truncate max-w-[120px]">
                          {name}
                        </span>
                        <span className="text-[9px] text-base-content/40">
                          {formatMessageTime(reply.createdAt)}
                        </span>
                      </div>

                      {isReplyDeleted ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-base-300 bg-base-200/60 text-base-content/50 italic text-xs">
                          <Ban className="size-3 shrink-0" />
                          <span>This reply was deleted</span>
                        </div>
                      ) : (
                        <div
                          className={`px-3 py-2 rounded-2xl break-words [overflow-wrap:anywhere] text-xs shadow-xs leading-relaxed select-text ${
                            isMe
                              ? "bg-primary text-primary-content rounded-tr-none"
                              : "bg-base-200 text-base-content rounded-tl-none border border-base-300/60"
                          }`}
                        >
                          {reply.text}
                          {reply.isEdited && (
                            <span className="text-[9px] opacity-60 ml-1">
                              (edited)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Reactions on reply */}
                      {!isReplyDeleted &&
                        reply.reactions &&
                        reply.reactions.length > 0 && (
                          <div className="mt-1">
                            <ReactionChips
                              message={reply}
                              currentUserId={currentUid}
                              onToggleReaction={onToggleReaction}
                              isGroup={isGroup}
                              groupId={groupId}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Thread Reply Composer */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-base-300 bg-base-100 p-3 space-y-1.5"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={replyText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Reply in thread… (Enter to send)"
              className="textarea textarea-bordered flex-1 min-h-[38px] max-h-28 text-xs rounded-xl focus:textarea-primary leading-normal resize-none py-2 px-3 [scrollbar-gutter:stable]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSending}
              className="btn btn-primary btn-sm btn-circle shrink-0 shadow-md shadow-primary/20 mb-0.5"
              aria-label="Send reply"
              title="Send reply (Enter)"
            >
              {isSending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-base-content/40 hidden sm:inline">
              Shift + Enter for new line
            </span>
          </div>
        </form>
      </aside>
    </>
  );
};

export default ThreadPanel;
