import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Sticker, Animated Gift Delivery & AI Composer Integration Test Suite", () => {
  const composerPath = path.resolve(
    __dirname,
    "../src/components/Chat/Common/MessageComposer.jsx",
  );
  const composerCode = fs.readFileSync(composerPath, "utf-8");

  const aiAssistPath = path.resolve(
    __dirname,
    "../src/components/common/AiAssist.jsx",
  );
  const aiAssistCode = fs.readFileSync(aiAssistPath, "utf-8");

  const aiStorePath = path.resolve(__dirname, "../src/store/useAiStore.js");
  const aiStoreCode = fs.readFileSync(aiStorePath, "utf-8");

  const giftStorePath = path.resolve(__dirname, "../src/store/useGiftStore.js");
  const giftStoreCode = fs.readFileSync(giftStorePath, "utf-8");

  const groupServicePath = path.resolve(
    __dirname,
    "../../server/src/modules/groups/services/group.service.js",
  );
  const groupServiceCode = fs.readFileSync(groupServicePath, "utf-8");

  const giftTxServicePath = path.resolve(
    __dirname,
    "../../server/src/modules/gifts/services/gift-transaction.service.js",
  );
  const giftTxServiceCode = fs.readFileSync(giftTxServicePath, "utf-8");

  const chatContainerPath = path.resolve(
    __dirname,
    "../src/components/Chat/ChatContainer.jsx",
  );
  const chatContainerCode = fs.readFileSync(chatContainerPath, "utf-8");

  const groupChatContainerPath = path.resolve(
    __dirname,
    "../src/components/group/GroupChatContainer.jsx",
  );
  const groupChatContainerCode = fs.readFileSync(groupChatContainerPath, "utf-8");

  describe("1. Dedicated Sticker Feature in Message Composer", () => {
    it("renders dedicated Sticker button with proper accessibility and visibility in main composer", () => {
      assert.ok(
        composerCode.includes('aria-label="Send Sticker"') &&
          composerCode.includes('title="Send Sticker"'),
        "MessageComposer must contain a dedicated Sticker button with title and aria-label",
      );
      assert.match(
        composerCode,
        /aria-label="Send Sticker"[\s\S]*?inline-flex cursor-pointer/,
        "Dedicated Sticker button must be inline-flex and visible in the composer toolbar",
      );
      assert.ok(
        composerCode.includes("<Sticker className="),
        "Sticker button must render Sticker icon",
      );
    });

    it("connects Sticker button to StickerPicker popover and supports marketplace modal", () => {
      assert.ok(
        composerCode.includes('togglePopover("stickers")'),
        "Sticker button must toggle stickers popover",
      );
      assert.ok(
        composerCode.includes("<StickerPicker"),
        "MessageComposer must mount StickerPicker component",
      );
      assert.ok(
        composerCode.includes("onOpenMarketplace={onOpenStickerMarketplace}"),
        "StickerPicker must receive onOpenMarketplace handler",
      );
    });

    it("wires onSendSticker across 1:1 Chat and Group Chat containers", () => {
      assert.ok(
        chatContainerCode.includes("onSendSticker="),
        "Direct ChatContainer must pass onSendSticker handler to MessageComposer",
      );
      assert.ok(
        groupChatContainerCode.includes("onSendSticker="),
        "GroupChatContainer must pass onSendSticker handler to MessageComposer",
      );
      assert.ok(
        groupChatContainerCode.includes("onOpenStickerMarketplace="),
        "GroupChatContainer must pass onOpenStickerMarketplace to MessageComposer",
      );
    });
  });

  describe("2. Backend Group & Direct Sticker Payload Support", () => {
    it("validates and parses sticker payload in validateGroupMessageInput without dropping it", () => {
      assert.ok(
        groupServiceCode.includes("let parsedSticker = null;"),
        "group.service.js must parse sticker from request body",
      );
      assert.ok(
        groupServiceCode.includes("!parsedSticker?.url"),
        "validateGroupMessageInput must allow sending sticker messages without requiring text",
      );
      assert.ok(
        groupServiceCode.includes("sticker: parsedSticker"),
        "validateGroupMessageInput must return sticker so group-message.service can persist it",
      );
    });
  });

  describe("3. Animated Gift Sending, Delivery & Real-Time Broadcast", () => {
    it("ensures group gift messages receive properly structured body text and gift payload", () => {
      assert.ok(
        giftTxServiceCode.includes("sendGroupMessageService({") &&
          giftTxServiceCode.includes('text: personalMessage || "",') &&
          giftTxServiceCode.includes("gift: JSON.stringify(giftPayload)"),
        "gift-transaction.service.js must supply text and gift inside body to sendGroupMessageService",
      );
    });

    it("broadcasts message:gift:received and notifications to all other group members for group gifts", () => {
      assert.ok(
        giftTxServiceCode.includes('chatType === "group" && groupDoc'),
        "Must have dedicated broadcast branch for group gifts",
      );
      assert.ok(
        giftTxServiceCode.includes('emit("message:gift:received"'),
        "Must broadcast message:gift:received to group members",
      );
      assert.ok(
        giftTxServiceCode.includes("dispatchNotification"),
        "Must dispatch gift_received push/in-app notification to group members",
      );
    });

    it("reconciles sent gifts immediately into active conversation stores without page refresh", () => {
      assert.ok(
        giftStoreCode.includes("useChatStore.getState()") &&
          giftStoreCode.includes("useGroupStore.getState()"),
        "useGiftStore must import and update chat and group stores authoritatively",
      );
      assert.ok(
        giftStoreCode.includes("messages: [...st.messages, message]") ||
          giftStoreCode.includes("groupMessages: [...(st.groupMessages || []), message]"),
        "useGiftStore must append newly sent gift message to active conversation immediately",
      );
    });
  });

  describe("4. AI Assistant Positioning & Functional Integration", () => {
    it("ensures composer integrates AiAssist with anti-clipping portal and upward anchoring", () => {
      assert.ok(
        composerCode.includes("<AiAssist"),
        "MessageComposer must embed AiAssist",
      );
      assert.ok(
        aiAssistCode.includes("createPortal") && aiAssistCode.includes("renderPopover"),
        "AiAssist must use portal rendering to guarantee popover is never clipped by composer container",
      );
    });

    it("configures AiAssist popup with high z-index and responsive viewport bounds", () => {
      assert.ok(
        aiAssistCode.includes("z-50"),
        "AiAssist popover must have high z-index (z-50) above composer surface",
      );
      assert.ok(
        aiAssistCode.includes("w-[calc(100vw-2rem)]") ||
          aiAssistCode.includes("max-w-"),
        "AiAssist must enforce responsive viewport bounds on mobile and tablet",
      );
      assert.ok(
        aiAssistCode.includes("bottom-full") && aiAssistCode.includes("right-0"),
        "AiAssist must be anchored upwards above the sparkle button",
      );
    });

    it("supports all requested writing tones (Friendly, Professional, Casual, Formal, Persuasive)", () => {
      const requiredTones = [
        "friendly",
        "professional",
        "casual",
        "formal",
        "persuasive",
      ];
      for (const tone of requiredTones) {
        assert.ok(
          aiStoreCode.includes(`"${tone}"`),
          `AI store must support '${tone}' tone`,
        );
        assert.ok(
          aiAssistCode.includes(tone),
          `AiAssist UI must expose '${tone}' tone option`,
        );
      }
    });

    it("provides loading state, draft editing, diff viewing, copy and apply actions", () => {
      assert.ok(
        aiAssistCode.includes("isLoading"),
        "AiAssist must track loading state",
      );
      assert.ok(
        aiAssistCode.includes("isEditingDraft") || aiAssistCode.includes("editableValue"),
        "AiAssist must support editing draft suggestion prior to applying",
      );
      assert.ok(
        aiAssistCode.includes("Apply to Message"),
        "AiAssist must provide Apply to Message button",
      );
      assert.ok(
        aiAssistCode.includes("copyResult"),
        "AiAssist must provide Copy action",
      );
    });
  });
});
