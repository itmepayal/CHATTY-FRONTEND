import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Send,
  MessageSquare,
  Loader2,
  Ban,
  CornerDownRight,
  Smile,
  Paperclip,
  Film,
  Sticker,
  Gift,
  FileText,
  Trash2,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { formatMessageTime } from "../../../utils/timeUtils.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useChatStore } from "../../../store/useChatStore.js";
import { useGroupStore } from "../../../store/useGroupStore.js";
import ReactionChips from "../reactions/ReactionChips.jsx";
import StickerPicker from "../../stickers/StickerPicker.jsx";
import StickerMarketplaceModal from "../../stickers/StickerMarketplaceModal.jsx";
import StickerMessageBubble from "../../stickers/StickerMessageBubble.jsx";
import GifPicker from "../../stickers/GifPicker.jsx";
import GiftPickerModal from "../gift/GiftPickerModal.jsx";
import GiftMessageBubble from "../gift/GiftMessageBubble.jsx";
import {
  displayText,
  getDisplayText,
  decryptDmMessage,
  decryptGroupMessage,
} from "../../../lib/e2eeMessages.js";
import { isEmojiOnly } from "../../../utils/emojiUtils.js";

const resolveAvatar = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (avatar && typeof avatar === "object" && typeof avatar.url === "string") {
    return avatar.url;
  }
  return null;
};

const resolveSender = (msg, authUser, selectedUser, selectedGroup, isGroup) => {
  if (!msg)
    return {
      name: isGroup ? "Group Member" : "User",
      avatar: null,
      isMe: false,
    };
  const currentUid = String(authUser?._id || authUser?.id || "");
  const senderObj =
    msg.sender || (typeof msg.senderId === "object" ? msg.senderId : null);
  const senderId = String(
    senderObj?._id || senderObj?.id || msg.senderId || "",
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
  if (
    !isGroup &&
    selectedUser &&
    String(selectedUser.id || selectedUser._id) === senderId
  ) {
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
  groupName = "",
  onClose,
  onSendReply,
  onToggleReaction,
}) => {
  const { authUser } = useAuthStore();
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  // Popover / Marketplace States
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showStickerMarketplace, setShowStickerMarketplace] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerContainerRef = useRef(null);

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
      if (e.key === "Escape") {
        if (showEmoji || showStickerPicker || showGifPicker) {
          setShowEmoji(false);
          setShowStickerPicker(false);
          setShowGifPicker(false);
          return;
        }
        if (onClose) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showEmoji, showStickerPicker, showGifPicker]);

  // Outside click to close popovers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        composerContainerRef.current &&
        !composerContainerRef.current.contains(e.target)
      ) {
        setShowEmoji(false);
        setShowStickerPicker(false);
        setShowGifPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const closeAllPopovers = () => {
    setShowEmoji(false);
    setShowStickerPicker(false);
    setShowGifPicker(false);
  };

  const togglePopover = (name) => {
    if (name === "emoji") {
      setShowEmoji((prev) => !prev);
      setShowStickerPicker(false);
      setShowGifPicker(false);
    } else if (name === "stickers") {
      setShowStickerPicker((prev) => !prev);
      setShowEmoji(false);
      setShowGifPicker(false);
    } else if (name === "gifs") {
      setShowGifPicker((prev) => !prev);
      setShowEmoji(false);
      setShowStickerPicker(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage: isImg,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if ((!text && !selectedAttachment) || isSending) return;

    setIsSending(true);
    try {
      if (selectedAttachment) {
        if (selectedAttachment.isImage) {
          await onSendReply({
            text,
            image: { url: selectedAttachment.dataUrl },
            messageType: "image",
          });
        } else {
          await onSendReply({
            text,
            file: {
              url: selectedAttachment.dataUrl,
              name: selectedAttachment.name,
              size: selectedAttachment.size,
            },
            messageType: "file",
          });
        }
        setSelectedAttachment(null);
      } else {
        await onSendReply(text);
      }
      setReplyText("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      closeAllPopovers();
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
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleEmojiClick = (emojiData) => {
    setReplyText((prev) => prev + (emojiData?.emoji || emojiData));
    inputRef.current?.focus();
  };

  const handleSelectSticker = async (sticker) => {
    if (!sticker || isSending) return;
    setIsSending(true);
    closeAllPopovers();
    setShowStickerMarketplace(false);
    try {
      const stickerPayload = {
        stickerId: String(sticker.stickerId || sticker._id || sticker.id || ""),
        packId: String(sticker.packId || ""),
        packName: sticker.packName || "Sticker",
        url: sticker.url || sticker.thumbnailUrl || "",
        thumbnailUrl: sticker.thumbnailUrl || sticker.url || "",
        name: sticker.name || "Sticker",
        altText: sticker.altText || sticker.name || "Sticker",
        format: sticker.format || (sticker.url?.endsWith(".gif") ? "gif" : "webp"),
        isAnimated: Boolean(sticker.isAnimated || sticker.url?.endsWith(".gif")),
      };
      await onSendReply({
        sticker: stickerPayload,
        messageType: "sticker",
      });
    } catch (err) {
      console.error("[ThreadPanel] Send sticker failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectGif = async (gif) => {
    if (!gif || isSending) return;
    setIsSending(true);
    closeAllPopovers();
    try {
      const gifUrl = gif?.url || gif?.previewUrl || gif;
      await onSendReply({
        image: { url: gifUrl },
        messageType: "image",
      });
    } catch (err) {
      console.error("[ThreadPanel] Send gif failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleGiftSent = () => {
    setShowGiftModal(false);
    if (!isGroup) {
      useChatStore.getState().openThread(activeParent?.id || activeParent?._id);
    } else {
      useGroupStore
        .getState()
        .openThread(
          groupId || selectedGroup?.id,
          activeParent?.id || activeParent?._id,
        );
    }
  };

  const currentUid = String(authUser?._id || authUser?.id || "");
  const [localParent, setLocalParent] = useState(parentMessage);

  useEffect(() => {
    setLocalParent(parentMessage);
    if (
      parentMessage &&
      (parentMessage.encrypted || parentMessage.e2ee) &&
      !parentMessage.decrypted
    ) {
      let cancelled = false;
      const decrypt = async () => {
        try {
          if (isGroup) {
            const dec = await decryptGroupMessage(
              parentMessage,
              groupId || selectedGroup?.id,
            );
            if (!cancelled && dec) setLocalParent(dec);
          } else {
            const myId = authUser?._id || authUser?.id;
            const peerId = selectedUser?.id || selectedUser?._id;
            const dec = await decryptDmMessage(parentMessage, myId, peerId);
            if (!cancelled && dec) setLocalParent(dec);
          }
        } catch (err) {
          console.error("[ThreadPanel] Parent decryption failed:", err);
        }
      };
      decrypt();
      return () => {
        cancelled = true;
      };
    }
  }, [
    parentMessage?.id,
    parentMessage?._id,
    parentMessage?.text,
    parentMessage?.decrypted,
    isGroup,
    groupId,
    selectedGroup?.id,
    authUser,
    selectedUser,
  ]);

  const activeParent = localParent || parentMessage;
  const parentSender = resolveSender(
    activeParent,
    authUser,
    selectedUser,
    selectedGroup,
    isGroup,
  );
  const parentSenderName = parentSender.name;
  const parentAvatar = parentSender.avatar;

  const isParentDeleted = Boolean(activeParent?.isDeleted);
  const parentDisplayText = useMemo(
    () => getDisplayText(activeParent),
    [activeParent],
  );

  const displayGroupName = groupName || selectedGroup?.name || "Group";

  return (
    <>
      {/* Mobile/Tablet Backdrop (below lg / 1024px) */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Thread Aside Panel */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[380px] flex-col bg-base-100 border-l border-base-300 shadow-2xl lg:relative lg:z-auto lg:w-[300px] xl:w-[320px] lg:shrink-0 lg:shadow-none min-h-0 h-full overflow-hidden transition-all duration-200"
      >
        {/* Unified Standard Header (h-13 sm:h-14) */}
        <div className="flex h-13 sm:h-14 shrink-0 items-center justify-between px-4 sm:px-5 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-base-content leading-none">
                  Thread
                </h3>
                <span className="badge badge-sm badge-ghost text-[10px] font-semibold h-4 px-1.5">
                  {replies.length}
                </span>
              </div>
              <span className="text-[11px] text-base-content/60 truncate block mt-0.5 max-w-[200px]">
                {isGroup
                  ? `${parentSenderName} in ${displayGroupName}`
                  : `with ${parentSenderName}`}
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
                  {/* Quoted message if any */}
                  {activeParent?.replyTo && (
                    <div className="border-l-2 border-primary/60 bg-base-300/40 px-2 py-1 rounded text-[11px] text-base-content/70 italic truncate mb-1">
                      {displayText(activeParent.replyTo) ||
                        activeParent.replyTo.text ||
                        "Quoted message"}
                    </div>
                  )}

                  {/* Text or Emoji */}
                  {parentDisplayText ? (
                    <p
                      className={
                        isEmojiOnly(parentDisplayText)
                          ? "text-3xl leading-tight py-1 select-none"
                          : "text-xs text-base-content/90 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed select-text"
                      }
                    >
                      {parentDisplayText}
                    </p>
                  ) : null}

                  {/* Sticker in Parent */}
                  {activeParent?.sticker?.url && (
                    <div className="py-1">
                      <StickerMessageBubble
                        sticker={activeParent.sticker}
                        isMine={parentSender.isMe}
                        onOpenPack={() => setShowStickerMarketplace(true)}
                      />
                    </div>
                  )}

                  {/* Virtual Gift in Parent */}
                  {activeParent?.gift?.name && (
                    <div className="py-1">
                      <GiftMessageBubble
                        gift={activeParent.gift}
                        isMine={parentSender.isMe}
                        senderName={parentSenderName}
                        timestamp={activeParent.createdAt}
                      />
                    </div>
                  )}

                  {/* Image in Parent */}
                  {activeParent?.image?.url && (
                    <img
                      src={activeParent.image.url}
                      alt="Attachment"
                      className="rounded-xl max-h-44 w-auto max-w-full object-cover mt-1 border border-base-300/80 cursor-pointer"
                      onClick={() => window.open(activeParent.image.url, "_blank")}
                    />
                  )}

                  {/* File in Parent */}
                  {activeParent?.file?.name && (
                    <div className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 p-2 text-xs">
                      <FileText className="size-4 text-primary shrink-0" />
                      <span className="font-medium truncate flex-1">
                        {activeParent.file.name}
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
                  isGroup,
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
                      ) : reply.sticker?.url ? (
                        <StickerMessageBubble
                          sticker={reply.sticker}
                          isMine={isMe}
                          onOpenPack={() => setShowStickerMarketplace(true)}
                        />
                      ) : reply.gift?.name ? (
                        <GiftMessageBubble
                          gift={reply.gift}
                          isMine={isMe}
                          senderName={isMe ? "You" : name}
                          timestamp={reply.createdAt}
                        />
                      ) : reply.image?.url ? (
                        <div className="rounded-2xl overflow-hidden border border-base-300 max-w-[240px]">
                          <img
                            src={reply.image.url}
                            alt="Attachment"
                            className="w-full h-auto object-cover max-h-48 cursor-pointer"
                            onClick={() => window.open(reply.image.url, "_blank")}
                          />
                        </div>
                      ) : reply.file?.name ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-base-200 border border-base-300 text-xs max-w-[240px]">
                          <FileText className="size-4 text-primary shrink-0" />
                          <span className="truncate font-medium">
                            {reply.file.name}
                          </span>
                        </div>
                      ) : (
                        (() => {
                          const replyContent = displayText(reply);
                          const isPureEmoji = isEmojiOnly(replyContent);
                          return (
                            <div
                              className={
                                isPureEmoji
                                  ? "p-1 bg-transparent border-0 shadow-none text-2xl sm:text-3xl leading-tight select-none"
                                  : `px-3 py-2 rounded-2xl break-words text-xs shadow-xs leading-relaxed select-text ${
                                      isMe
                                        ? "bg-primary text-primary-content rounded-tr-none"
                                        : "bg-base-200 text-base-content rounded-tl-none border border-base-300/60"
                                    }`
                              }
                            >
                              {replyContent}
                              {reply.isEdited && (
                                <span className="text-[9px] opacity-60 ml-1">
                                  (edited)
                                </span>
                              )}
                            </div>
                          );
                        })()
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

        {/* Anchored Popovers & Pickers Container */}
        <div ref={composerContainerRef} className="relative shrink-0 border-t border-base-300 bg-base-100 p-3">
          {/* Sticker Picker Popover */}
          {showStickerPicker && (
            <StickerPicker
              isOpen={showStickerPicker}
              onClose={() => setShowStickerPicker(false)}
              onSelectSticker={handleSelectSticker}
              onOpenMarketplace={() => {
                setShowStickerPicker(false);
                setShowStickerMarketplace(true);
              }}
              className="absolute bottom-full mb-2 right-2 z-50 w-[calc(100vw-2rem)] sm:w-[350px] shadow-2xl"
            />
          )}

          {/* GIF Picker Popover */}
          {showGifPicker && (
            <GifPicker
              isOpen={showGifPicker}
              onClose={() => setShowGifPicker(false)}
              onSelectGif={handleSelectGif}
              className="absolute bottom-full mb-2 right-2 z-50 w-[calc(100vw-2rem)] sm:w-[350px] shadow-2xl"
            />
          )}

          {/* Emoji Picker Popover */}
          {showEmoji && (
            <div className="absolute bottom-full mb-2 left-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-base-300 bg-base-100 animate-in fade-in duration-150">
              <EmojiPicker
                theme="auto"
                width={Math.min(
                  300,
                  typeof window !== "undefined" ? window.innerWidth - 32 : 300,
                )}
                height={350}
                lazyLoadEmojis
                searchPlaceHolder="Search emoji…"
                previewConfig={{ showPreview: false }}
                onEmojiClick={handleEmojiClick}
              />
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/*"
            className="hidden"
          />

          {/* Attachment Preview Chip */}
          {selectedAttachment && (
            <div className="flex items-center gap-2 mb-2 p-1.5 pr-2.5 rounded-xl bg-base-200/80 border border-base-300/80 max-w-full">
              {selectedAttachment.isImage ? (
                <img
                  src={selectedAttachment.dataUrl}
                  alt="Attachment preview"
                  className="size-9 rounded-lg object-cover border border-base-300 shrink-0"
                />
              ) : (
                <div className="size-9 rounded-lg bg-base-300 flex items-center justify-center shrink-0 text-primary">
                  <FileText className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-base-content truncate">
                  {selectedAttachment.name}
                </p>
                <p className="text-[10px] text-base-content/50">
                  {Math.round(selectedAttachment.size / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-error"
                title="Remove attachment"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}

          {/* Thread Reply Composer Form */}
          <form onSubmit={handleSend} className="space-y-1.5">
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
                disabled={(!replyText.trim() && !selectedAttachment) || isSending}
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

            {/* Action Toolbar */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-0.5 text-base-content/60">
                {/* Emoji Picker Button */}
                <button
                  type="button"
                  onClick={() => togglePopover("emoji")}
                  disabled={isSending}
                  title="Emoji"
                  aria-label="Emoji"
                  className={`btn btn-ghost btn-xs btn-square hover:bg-base-200 transition-colors ${
                    showEmoji ? "text-primary bg-primary/10" : ""
                  }`}
                >
                  <Smile className="size-4" />
                </button>

                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                  title="Attach image or file"
                  aria-label="Attach file"
                  className="btn btn-ghost btn-xs btn-square hover:bg-base-200 transition-colors"
                >
                  <Paperclip className="size-4" />
                </button>

                {/* Animated GIF Button */}
                <button
                  type="button"
                  onClick={() => togglePopover("gifs")}
                  disabled={isSending}
                  title="Send GIF"
                  aria-label="Send GIF"
                  className={`btn btn-ghost btn-xs btn-square hover:bg-base-200 transition-colors ${
                    showGifPicker ? "text-primary bg-primary/10" : ""
                  }`}
                >
                  <Film className="size-4" />
                </button>

                {/* Sticker Marketplace & Picker Button */}
                <button
                  type="button"
                  onClick={() => togglePopover("stickers")}
                  disabled={isSending}
                  title="Stickers & Marketplace"
                  aria-label="Stickers & Marketplace"
                  className={`btn btn-ghost btn-xs btn-square hover:bg-base-200 transition-colors ${
                    showStickerPicker ? "text-primary bg-primary/10" : ""
                  }`}
                >
                  <Sticker className="size-4" />
                </button>

                {/* Virtual Gift Marketplace Button */}
                <button
                  type="button"
                  onClick={() => {
                    closeAllPopovers();
                    setShowGiftModal(true);
                  }}
                  disabled={isSending}
                  title="Send Virtual Gift"
                  aria-label="Send Gift"
                  className="btn btn-ghost btn-xs btn-square text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                >
                  <Gift className="size-4" />
                </button>
              </div>

              <span className="text-[10px] text-base-content/40 hidden sm:inline">
                Shift + Enter for new line
              </span>
            </div>
          </form>
        </div>
      </aside>

      {/* Sticker Marketplace Modal */}
      {showStickerMarketplace && (
        <StickerMarketplaceModal
          isOpen={showStickerMarketplace}
          onClose={() => setShowStickerMarketplace(false)}
          onSelectSticker={handleSelectSticker}
        />
      )}

      {/* Gift Marketplace Modal */}
      {showGiftModal && (
        <GiftPickerModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          recipientName={
            isGroup
              ? null
              : parentSender.isMe
              ? selectedUser?.fullName || "Chat Partner"
              : parentSenderName
          }
          recipientAvatar={
            isGroup
              ? null
              : parentSender.isMe
              ? selectedUser?.profilePic || selectedUser?.avatar || null
              : parentAvatar
          }
          recipientId={
            !isGroup
              ? selectedUser?._id ||
                selectedUser?.id ||
                (parentSender.isMe
                  ? activeParent?.receiverId?._id ||
                    activeParent?.receiverId?.id ||
                    activeParent?.receiverId
                  : activeParent?.senderId?._id ||
                    activeParent?.senderId?.id ||
                    activeParent?.senderId)
              : null
          }
          groupId={isGroup ? groupId || selectedGroup?._id || selectedGroup?.id : null}
          isGroup={isGroup}
          parentMessageId={activeParent?.id || activeParent?._id}
          onSendGift={handleGiftSent}
        />
      )}
    </>
  );
};

export default ThreadPanel;
