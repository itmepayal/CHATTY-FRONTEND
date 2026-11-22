import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Unified Thread Reply UI & Marketplace Features Test Suite", () => {
  const threadPanelPath = path.resolve(
    __dirname,
    "../src/components/Chat/thread/ThreadPanel.jsx",
  );
  const threadPanelCode = fs.readFileSync(threadPanelPath, "utf-8");

  const chatStorePath = path.resolve(__dirname, "../src/store/useChatStore.js");
  const chatStoreCode = fs.readFileSync(chatStorePath, "utf-8");

  const groupStorePath = path.resolve(__dirname, "../src/store/useGroupStore.js");
  const groupStoreCode = fs.readFileSync(groupStorePath, "utf-8");

  const giftStorePath = path.resolve(__dirname, "../src/store/useGiftStore.js");
  const giftStoreCode = fs.readFileSync(giftStorePath, "utf-8");

  const threadServicePath = path.resolve(
    __dirname,
    "../../server/src/modules/messaging/services/threads/thread.service.js",
  );
  const threadServiceCode = fs.readFileSync(threadServicePath, "utf-8");

  const giftServicePath = path.resolve(
    __dirname,
    "../../server/src/modules/gifts/services/gift-transaction.service.js",
  );
  const giftServiceCode = fs.readFileSync(giftServicePath, "utf-8");

  const giftControllerPath = path.resolve(
    __dirname,
    "../../server/src/modules/gifts/controllers/gift.controller.js",
  );
  const giftControllerCode = fs.readFileSync(giftControllerPath, "utf-8");

  describe("1. Unified Thread UI Design System (Normal Chat & Group Chat)", () => {
    it("standardizes Thread header with h-13 sm:h-14 and theme-aware design tokens", () => {
      assert.ok(
        threadPanelCode.includes("h-13 sm:h-14"),
        "Thread header must use standardized h-13 sm:h-14 height matching chat app bars",
      );
      assert.ok(
        threadPanelCode.includes("border-b border-base-300 bg-base-100"),
        "Header must use standard Chatty border and base colors",
      );
    });

    it("displays unified Thread title, reply count badge, and contextual subtitle", () => {
      assert.ok(
        threadPanelCode.includes("Thread"),
        "Header must display title Thread",
      );
      assert.ok(
        threadPanelCode.includes("badge badge-sm badge-ghost"),
        "Header must display reply count badge",
      );
      assert.ok(
        threadPanelCode.includes("parentSenderName") &&
          threadPanelCode.includes("displayGroupName"),
        "Header must display contextual subtitle for both direct chat and group chat",
      );
    });

    it("includes accessible close button with Escape key support", () => {
      assert.ok(
        threadPanelCode.includes('aria-label="Close Thread"'),
        "Close button must have accessible aria-label",
      );
      assert.ok(
        threadPanelCode.includes("e.key === \"Escape\""),
        "Must support closing with Escape key",
      );
    });
  });

  describe("2. Parent Message Preview with Rich Media, Stickers & Gifts", () => {
    it("renders StickerMessageBubble when parent message contains a sticker", () => {
      assert.ok(
        threadPanelCode.includes("activeParent?.sticker?.url"),
        "Must check for sticker url on parent message",
      );
      assert.ok(
        threadPanelCode.includes("<StickerMessageBubble"),
        "Must render StickerMessageBubble component for stickers",
      );
    });

    it("renders GiftMessageBubble when parent message contains a virtual gift", () => {
      assert.ok(
        threadPanelCode.includes("activeParent?.gift?.name"),
        "Must check for gift name on parent message",
      );
      assert.ok(
        threadPanelCode.includes("<GiftMessageBubble"),
        "Must render GiftMessageBubble component for gifts",
      );
    });

    it("renders pure emoji messages with clean enlarged text without card wrappers", () => {
      assert.ok(
        threadPanelCode.includes("isEmojiOnly(parentDisplayText)"),
        "Must check isEmojiOnly on parent display text",
      );
      assert.ok(
        threadPanelCode.includes("text-3xl leading-tight py-1 select-none"),
        "Pure emoji must render cleanly with enlarged font without card wrapping",
      );
    });
  });

  describe("3. Reply Stream with Rich Media, Stickers, Gifts & Reactions", () => {
    it("renders StickerMessageBubble in reply stream", () => {
      assert.ok(
        threadPanelCode.includes("reply.sticker?.url ? ("),
        "Must check if reply contains a sticker",
      );
    });

    it("renders GiftMessageBubble in reply stream", () => {
      assert.ok(
        threadPanelCode.includes("reply.gift?.name ? ("),
        "Must check if reply contains a virtual gift",
      );
    });

    it("renders ReactionChips on replies for quick reactions", () => {
      assert.ok(
        threadPanelCode.includes("<ReactionChips"),
        "Must render ReactionChips on thread replies",
      );
    });
  });

  describe("4. Restored Thread Composer Toolbar & Marketplace Modals", () => {
    it("features dedicated toolbar with Emoji, Attachment, GIF, Sticker, and Gift buttons", () => {
      assert.ok(
        threadPanelCode.includes('aria-label="Emoji"'),
        "Composer must feature an Emoji button",
      );
      assert.ok(
        threadPanelCode.includes('aria-label="Attach file"'),
        "Composer must feature an Attachment button",
      );
      assert.ok(
        threadPanelCode.includes('aria-label="Send GIF"'),
        "Composer must feature an animated GIF button",
      );
      assert.ok(
        threadPanelCode.includes('aria-label="Stickers & Marketplace"'),
        "Composer must feature a Sticker Marketplace & Picker button",
      );
      assert.ok(
        threadPanelCode.includes('aria-label="Send Gift"'),
        "Composer must feature a Virtual Gift Marketplace button",
      );
    });

    it("integrates StickerPicker and StickerMarketplaceModal in ThreadPanel", () => {
      assert.ok(
        threadPanelCode.includes("<StickerPicker"),
        "ThreadPanel must render StickerPicker",
      );
      assert.ok(
        threadPanelCode.includes("<StickerMarketplaceModal"),
        "ThreadPanel must render StickerMarketplaceModal",
      );
    });

    it("integrates GifPicker in ThreadPanel", () => {
      assert.ok(
        threadPanelCode.includes("<GifPicker"),
        "ThreadPanel must render GifPicker",
      );
    });

    it("integrates GiftPickerModal in ThreadPanel with parentMessageId", () => {
      assert.ok(
        threadPanelCode.includes("<GiftPickerModal"),
        "ThreadPanel must render GiftPickerModal",
      );
      assert.ok(
        threadPanelCode.includes("parentMessageId={activeParent?.id || activeParent?._id}"),
        "GiftPickerModal must receive parentMessageId prop",
      );
    });

    it("provides attachment preview chip with remove button", () => {
      assert.ok(
        threadPanelCode.includes("selectedAttachment"),
        "Must track selected attachment in state",
      );
      assert.ok(
        threadPanelCode.includes("setSelectedAttachment(null)"),
        "Must allow removing selected attachment before sending",
      );
    });
  });

  describe("5. Rich Payload Persistence across Frontend Stores & Backend Services", () => {
    it("useChatStore.sendThreadReply accepts rich payload (sticker, gift, image, file)", () => {
      assert.ok(
        chatStoreCode.includes("sendThreadReply: async (replyData) =>"),
        "useChatStore.sendThreadReply must accept payload object",
      );
      assert.ok(
        chatStoreCode.includes("sticker = isObj ? replyData.sticker : undefined"),
        "useChatStore.sendThreadReply must extract sticker",
      );
      assert.ok(
        chatStoreCode.includes("gift = isObj ? replyData.gift : undefined"),
        "useChatStore.sendThreadReply must extract gift",
      );
    });

    it("useGroupStore.sendThreadReply accepts rich payload (sticker, gift, image, file)", () => {
      assert.ok(
        groupStoreCode.includes("sendThreadReply: async (replyData) =>"),
        "useGroupStore.sendThreadReply must accept payload object",
      );
      assert.ok(
        groupStoreCode.includes("sticker = isObj ? replyData.sticker : undefined"),
        "useGroupStore.sendThreadReply must extract sticker",
      );
      assert.ok(
        groupStoreCode.includes("gift = isObj ? replyData.gift : undefined"),
        "useGroupStore.sendThreadReply must extract gift",
      );
    });

    it("useGiftStore.sendGift accepts parentMessageId", () => {
      assert.ok(
        giftStoreCode.includes("parentMessageId = null"),
        "useGiftStore.sendGift must accept parentMessageId parameter",
      );
      assert.ok(
        giftStoreCode.includes("parentMessageId: parentMessageId || undefined"),
        "useGiftStore.sendGift must pass parentMessageId to backend",
      );
    });

    it("gift.controller.js extracts parentMessageId and passes to service", () => {
      assert.ok(
        giftControllerCode.includes("parentMessageId,"),
        "gift.controller.js must extract parentMessageId from req.body",
      );
    });

    it("gift-transaction.service.js dispatches thread reply when parentMessageId is provided", () => {
      assert.ok(
        giftServiceCode.includes("parentMessageId = null"),
        "gift-transaction.service.js must accept parentMessageId",
      );
      assert.ok(
        giftServiceCode.includes("threadService.sendThreadReply"),
        "gift-transaction.service.js must dispatch threadService.sendThreadReply when parentMessageId is present",
      );
    });

    it("thread.service.js persists sticker, gift, and messageType for Group and Direct replies", () => {
      assert.ok(
        threadServiceCode.includes("sticker: payloadData.sticker"),
        "thread.service.js must persist sticker",
      );
      assert.ok(
        threadServiceCode.includes("gift: payloadData.gift"),
        "thread.service.js must persist gift",
      );
      assert.ok(
        threadServiceCode.includes("payloadData.messageType"),
        "thread.service.js must persist messageType",
      );
    });
  });
});
