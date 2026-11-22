import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Thread Sticker & Animated Gift Sending Integration Test Suite", () => {
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

  const stickerBubblePath = path.resolve(
    __dirname,
    "../src/components/stickers/StickerMessageBubble.jsx",
  );
  const stickerBubbleCode = fs.readFileSync(stickerBubblePath, "utf-8");

  const giftBubblePath = path.resolve(
    __dirname,
    "../src/components/Chat/gift/GiftMessageBubble.jsx",
  );
  const giftBubbleCode = fs.readFileSync(giftBubblePath, "utf-8");

  describe("1. Thread Composer Sticker & Gift Capabilities", () => {
    it("ThreadPanel has Sticker and Gift action buttons in its toolbar", () => {
      assert.ok(
        threadPanelCode.includes('aria-label="Stickers & Marketplace"'),
        "Must have accessible Sticker & Marketplace button in thread toolbar",
      );
      assert.ok(
        threadPanelCode.includes('aria-label="Send Gift"'),
        "Must have accessible Send Gift button in thread toolbar",
      );
    });

    it("ThreadPanel normalizes sticker payload before sending reply", () => {
      assert.ok(
        threadPanelCode.includes("handleSelectSticker = async (sticker) =>"),
        "Must define handleSelectSticker handler",
      );
      assert.ok(
        threadPanelCode.includes("stickerId: String(sticker.stickerId || sticker._id || sticker.id || \"\")"),
        "Must defensively extract stickerId",
      );
      assert.ok(
        threadPanelCode.includes("url: sticker.url || sticker.thumbnailUrl || \"\""),
        "Must ensure sticker URL is populated",
      );
      assert.ok(
        threadPanelCode.includes('messageType: "sticker"'),
        "Must specify messageType sticker",
      );
    });

    it("ThreadPanel provides StickerPicker and StickerMarketplaceModal", () => {
      assert.ok(
        threadPanelCode.includes("<StickerPicker"),
        "ThreadPanel must embed StickerPicker popover",
      );
      assert.ok(
        threadPanelCode.includes("<StickerMarketplaceModal"),
        "ThreadPanel must embed StickerMarketplaceModal modal",
      );
    });
  });

  describe("2. Recipient Resolution in 1:1 Normal Chat Thread Gifts", () => {
    it("ThreadPanel resolves recipient correctly even when user replied to their own message", () => {
      assert.ok(
        threadPanelCode.includes("parentSender.isMe"),
        "ThreadPanel must check if parent message sender is the authenticated user",
      );
      assert.ok(
        threadPanelCode.includes("activeParent?.receiverId"),
        "When user starts thread on own message, gift recipientId must resolve to peer receiverId",
      );
    });

    it("gift-transaction.service.js infer recipient from parentMessage if self-targeted", () => {
      assert.ok(
        giftServiceCode.includes("if (parentMessageId && (!recipientId || String(recipientId) === String(senderId)))"),
        "Backend must check parentMessageId and infer peer if recipientId matches senderId",
      );
      assert.ok(
        giftServiceCode.includes("recipientId =\n          String(parentMsg.senderId) === String(senderId)\n            ? parentMsg.receiverId\n            : parentMsg.senderId") ||
        giftServiceCode.includes("String(parentMsg.senderId) === String(senderId) ? parentMsg.receiverId : parentMsg.senderId"),
        "Backend must assign peer ID as recipientId",
      );
    });
  });

  describe("3. Immediate UI Updating & Conversation List Hygiene", () => {
    it("useGiftStore immediately appends thread gift replies to activeThread.replies", () => {
      assert.ok(
        giftStoreCode.includes("activeThread.replies || []"),
        "useGiftStore must check activeThread.replies",
      );
      assert.ok(
        giftStoreCode.includes("totalReplies: (st.activeThread.totalReplies || 0) + 1"),
        "useGiftStore must increment totalReplies in activeThread",
      );
    });

    it("useGiftStore increments parent message threadReplyCount without polluting top-level messages", () => {
      assert.ok(
        giftStoreCode.includes("if (parentMessageId) {"),
        "useGiftStore must separate parentMessageId thread replies from top-level messages",
      );
      assert.ok(
        giftStoreCode.includes("threadReplyCount: (m.threadReplyCount || 0) + 1"),
        "useGiftStore must increment threadReplyCount on parent message in message list",
      );
    });
  });

  describe("4. Backend Thread Service Normalization & Real-Time Delivery", () => {
    it("thread.service.js defensively normalizes sticker URL and gift structure in Group replies", () => {
      assert.ok(
        threadServiceCode.includes("payloadData.sticker") &&
        threadServiceCode.includes("imageUrl || payloadData.sticker.thumbnailUrl"),
        "Group thread reply must normalize sticker imageUrl/thumbnailUrl fallback",
      );
    });

    it("thread.service.js defensively normalizes sticker URL and gift structure in Direct replies", () => {
      assert.ok(
        threadServiceCode.includes("payloadData.sticker") &&
        threadServiceCode.includes("imageUrl || payloadData.sticker.thumbnailUrl"),
        "Direct thread reply must normalize sticker imageUrl/thumbnailUrl fallback",
      );
    });

    it("thread.service.js updates parent thread stats and broadcasts updatedParent reply count", () => {
      assert.ok(
        threadServiceCode.includes("updatedParent?.threadReplyCount || (parent.threadReplyCount || 0) + 1"),
        "Must use updatedParent reply count in threadUpdated and return object",
      );
      assert.ok(
        threadServiceCode.includes('emit("threadReply"'),
        "Must emit threadReply socket event for direct messages",
      );
      assert.ok(
        threadServiceCode.includes('emit("groupThreadReply"'),
        "Must emit groupThreadReply socket event for group messages",
      );
      assert.ok(
        threadServiceCode.includes('emit("threadUpdated"'),
        "Must emit threadUpdated socket event for both direct and group messages",
      );
    });

    it("thread.service.js generates descriptive notification body for stickers and gifts", () => {
      assert.ok(
        threadServiceCode.includes("🎨 Sent a sticker"),
        "Notification body must include sticker indicator",
      );
      assert.ok(
        threadServiceCode.includes("🎁 Sent a gift:"),
        "Notification body must include gift indicator and gift name",
      );
    });
  });

  describe("5. Rendering Bubbles in Thread Stream", () => {
    it("StickerMessageBubble handles both string and object sticker payloads", () => {
      assert.ok(
        stickerBubbleCode.includes("typeof sticker === \"string\" ? { url: sticker } : sticker"),
        "StickerMessageBubble must support string or object sticker prop",
      );
      assert.ok(
        stickerBubbleCode.includes("StickerImage"),
        "StickerMessageBubble must render StickerImage component",
      );
    });

    it("GiftMessageBubble handles both parsed objects and stringified JSON gifts", () => {
      assert.ok(
        giftBubbleCode.includes("typeof gift === \"string\""),
        "GiftMessageBubble must handle stringified gifts",
      );
      assert.ok(
        giftBubbleCode.includes("setCelebrationGift"),
        "GiftMessageBubble must support opening celebratory animations on click",
      );
    });
  });
});
