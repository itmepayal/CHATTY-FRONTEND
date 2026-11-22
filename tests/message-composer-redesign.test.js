import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Message Composer Professional Redesign & Usability Suite", () => {
  const composerPath = path.resolve(
    __dirname,
    "../src/components/Chat/Common/MessageComposer.jsx",
  );
  const composerCode = fs.readFileSync(composerPath, "utf-8");

  describe("1. Architectural Structure & Unified Composition Card Layout", () => {
    it("separates layout into 3 distinct sections: Top Previews, Main Input, and Bottom Toolbar", () => {
      assert.ok(
        composerCode.includes("SECTION 1: TOP ATTACHMENT, REPLY & EDIT PREVIEW AREA"),
        "Must have Section 1 dedicated to top previews",
      );
      assert.ok(
        composerCode.includes("SECTION 2: MAIN INPUT AREA"),
        "Must have Section 2 dedicated to main textarea input",
      );
      assert.ok(
        composerCode.includes("SECTION 3: BOTTOM TOOLBAR"),
        "Must have Section 3 dedicated to bottom action clusters",
      );
    });

    it("uses a unified rounded composition card container instead of a cramped single-line flex", () => {
      // Must use flex-col and overflow-hidden on the composition card
      assert.ok(
        composerCode.includes("flex flex-col overflow-hidden"),
        "Composition card must be a vertical column stack with overflow hidden",
      );
      assert.ok(
        composerCode.includes("rounded-2xl sm:rounded-3xl border"),
        "Composition card must have modern rounded corners and subtle border",
      );
    });

    it("anchors all popovers to the composer root with high z-index to avoid clipping", () => {
      assert.ok(
        composerCode.includes("UNIFIED POPOVERS"),
        "Must have a unified popover container section",
      );
      assert.ok(
        composerCode.includes("z-50"),
        "Popovers must use high z-index (z-50) so they render above message feeds",
      );
      assert.ok(
        composerCode.includes("bottom-full mb-3"),
        "Popovers must open upwards above the composer with clear spacing",
      );
    });
  });

  describe("2. Main Input & Auto-Grow Textarea Mechanics", () => {
    it("implements auto-grow with 40px min-height and 150px max-height with internal scrolling", () => {
      assert.ok(
        composerCode.includes("Math.min(Math.max(el.scrollHeight, 40), 150)"),
        "Must dynamically compute height between 40px minimum and 150px maximum",
      );
      assert.ok(
        composerCode.includes("max-h-[150px] min-h-[40px] overflow-y-auto scrollbar-thin"),
        "Textarea CSS classes must specify min-height 40px, max-height 150px, and scrollbar-thin",
      );
    });

    it("provides clean left-aligned text and placeholder without vertical offset", () => {
      assert.ok(
        composerCode.includes("w-full resize-none bg-transparent outline-none py-1.5"),
        "Textarea must take full width of input section with clean py-1.5 padding",
      );
      assert.ok(
        composerCode.includes("placeholder:text-base-content/40"),
        "Placeholder must have consistent theme opacity and styling",
      );
    });

    it("supports Enter-to-send while preserving Shift+Enter for multiline newline insertion", () => {
      assert.ok(
        composerCode.includes('e.key === "Enter" && !e.shiftKey'),
        "Enter without Shift must trigger send when enterToSend is enabled",
      );
      assert.ok(
        composerCode.includes("e.preventDefault()"),
        "Must prevent default on Enter to avoid accidental blank newline when sending",
      );
    });
  });

  describe("3. Bottom Toolbar & Symmetrical Button Clustering", () => {
    it("partitions the toolbar into Left Action Cluster and Right Action Cluster", () => {
      assert.ok(
        composerCode.includes("Left Action Cluster: Attachments, Emojis, Photos, Docs, Video"),
        "Must define clear Left Action Cluster",
      );
      assert.ok(
        composerCode.includes("Right Action Cluster: GIF, Sticker, AI, Gift, Clock, Send/Mic"),
        "Must define clear Right Action Cluster",
      );
    });

    it("includes all requested left cluster actions: (+), Smile, Photos, Docs, Video", () => {
      assert.ok(composerCode.includes('aria-label="More Attachments"'));
      assert.ok(composerCode.includes('aria-label="Insert Emoji"'));
      assert.ok(composerCode.includes('aria-label="Attach Photo"'));
      assert.ok(composerCode.includes('aria-label="Attach Document"'));
      assert.ok(composerCode.includes('aria-label="Attach Video"'));
    });

    it("includes all requested right cluster actions: GIF, Sticker, AI Assist, Gift, Schedule, Send/Mic", () => {
      assert.ok(composerCode.includes('aria-label="Send Animated GIF"'));
      assert.ok(composerCode.includes('aria-label="Send Sticker"'));
      assert.ok(composerCode.includes("<AiAssist"));
      assert.ok(composerCode.includes('aria-label="Send Digital Gift"'));
      assert.ok(composerCode.includes('aria-label="Schedule Message"'));
    });

    it("dynamically swaps between Send button and Mic button based on hasContent", () => {
      assert.ok(
        composerCode.includes("const hasContent = Boolean(text.trim() || file);"),
        "Must evaluate hasContent as true when text is non-empty or file is attached",
      );
      assert.ok(
        composerCode.includes("{hasContent ? ("),
        "Must conditionally render Send button when hasContent is true",
      );
      assert.ok(
        composerCode.includes('aria-label="Record voice message"'),
        "Must render Mic button when hasContent is false",
      );
    });
  });

  describe("4. Top Preview Section: Attachments, Reply, and Edit Modes", () => {
    it("renders Attachment Preview card with file name, formatted size, and remove button", () => {
      assert.ok(composerCode.includes("SECTION 1: TOP ATTACHMENT, REPLY & EDIT PREVIEW AREA"));
      assert.ok(composerCode.includes("formatFileSize(file.size)"));
      assert.ok(composerCode.includes('aria-label="Remove attachment"'));
    });

    it("supports View Once (1x) toggle on media attachments", () => {
      assert.ok(composerCode.includes("activeViewOnce"));
      assert.ok(composerCode.includes("handleSetViewOnce"));
      assert.ok(composerCode.includes("View Once Enabled"));
    });

    it("renders Reply preview banner with sender name and cancel button", () => {
      assert.ok(composerCode.includes("activeReply && !activeEditing"));
      assert.ok(composerCode.includes("Replying to"));
      assert.ok(composerCode.includes('aria-label="Cancel reply"'));
    });

    it("renders Edit message banner with editing text and cancel button", () => {
      assert.ok(composerCode.includes("activeEditing &&"));
      assert.ok(composerCode.includes("Editing Message"));
      assert.ok(composerCode.includes("handleCancelEdit"));
    });
  });

  describe("5. Cross-Container Prop Compatibility (1:1 Chat & Group Chat)", () => {
    it("normalizes reply props across ChatContainer and GroupChatContainer", () => {
      assert.ok(composerCode.includes("const activeReply = replyTarget || replyingTo;"));
      assert.ok(composerCode.includes("const handleCancelReply ="));
    });

    it("normalizes file attachment props across ChatContainer and GroupChatContainer", () => {
      assert.ok(composerCode.includes("const handleSetFile = setFile || handleFile;"));
      assert.ok(composerCode.includes("const handleClearFile = clearFile || clearAttachment;"));
    });

    it("normalizes voice recording state across direct and group recorders", () => {
      assert.ok(composerCode.includes("const activeVoiceState ="));
      assert.ok(composerCode.includes("recorderBusy"));
      assert.ok(composerCode.includes("stopRecordingAndSend"));
    });

    it("normalizes modal triggers across both container paradigms", () => {
      assert.ok(composerCode.includes("onOpenSchedule"));
      assert.ok(composerCode.includes("setShowSchedule"));
      assert.ok(composerCode.includes("onOpenPoll"));
      assert.ok(composerCode.includes("setShowPollModal"));
      assert.ok(composerCode.includes("onOpenGift"));
      assert.ok(composerCode.includes("setShowGiftModal"));
    });
  });

  describe("6. Interaction Details & Usability Hardening", () => {
    it("inserts emoji at exact cursor position rather than appending only to the end", () => {
      assert.ok(
        composerCode.includes("const start = el?.selectionStart ?? text.length;"),
        "Must read textarea selectionStart",
      );
      assert.ok(
        composerCode.includes("const end = el?.selectionEnd ?? text.length;"),
        "Must read textarea selectionEnd",
      );
      assert.ok(
        composerCode.includes("text.slice(0, start) + emojiData.emoji + text.slice(end)"),
        "Must splice emoji at active selection range",
      );
    });

    it("supports Escape key to dismiss active popovers and refocus textarea", () => {
      assert.ok(composerCode.includes('e.key === "Escape"'));
      assert.ok(composerCode.includes("closeAllPopovers()"));
      assert.ok(composerCode.includes("textareaRef.current?.focus()"));
    });

    it("supports Drag and Drop of files directly into the composition card", () => {
      assert.ok(composerCode.includes("onDragEnter={handleDragEnter}"));
      assert.ok(composerCode.includes("onDrop={handleDrop}"));
      assert.ok(composerCode.includes("Drop file to attach to message"));
    });
  });
});
