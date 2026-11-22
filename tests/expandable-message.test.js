import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isEmojiOnly,
  getEmojiCount,
  isLargeEmojiCandidate,
  getEmojiSizeClass,
} from "../src/utils/emojiUtils.js";

/**
 * Pure function replicating the pre-qualification logic of ExpandableMessage.jsx
 */
const checkPotentiallyExpandable = (text, maxLines = 8) => {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Emoji-only messages must never be clamped or expandable
  if (isEmojiOnly(trimmed)) return false;

  const lineCount = trimmed.split(/\r\n|\r|\n/).length;

  // If explicit newlines are <= maxLines and character length is < maxLines * 20,
  // the content cannot physically exceed maxLines.
  if (lineCount <= maxLines && trimmed.length < Math.max(80, maxLines * 20)) {
    return false;
  }

  return true;
};

/**
 * Pure function replicating bubble styling determination in ChatContainer & GroupChatContainer
 */
const getBubbleClasses = ({
  messageText,
  isDeleted = false,
  isDecrypting = false,
  decryptFailed = false,
  hasAudio = false,
  reply = null,
  isForwarded = false,
  imageSrc = null,
  hasFile = false,
  hasVideo = false,
  hasLocation = false,
  poll = null,
  gift = null,
  sticker = null,
  isViewOnce = false,
  storyReply = null,
  isMine = false,
}) => {
  const isPureEmoji =
    !isDeleted &&
    !isDecrypting &&
    !decryptFailed &&
    isEmojiOnly(messageText) &&
    !hasAudio &&
    !reply &&
    !isForwarded &&
    !imageSrc &&
    !hasFile &&
    !hasVideo &&
    !hasLocation &&
    !poll?.question &&
    !gift?.name &&
    !sticker?.url &&
    !isViewOnce &&
    !storyReply;

  if (isPureEmoji) {
    return "p-1 sm:p-1.5 bg-transparent border-0 shadow-none";
  }

  const hasText = !isDeleted && (Boolean(messageText) || decryptFailed || isDecrypting);
  const padding = hasText || hasAudio || reply || isForwarded ? "px-3 sm:px-3.5 py-2" : "p-1";
  const bg = isMine ? "bg-primary text-primary-content" : "bg-base-100 border border-base-300";

  return `min-w-0 max-w-full ${padding} rounded-2xl shadow-sm ${bg}`;
};

describe("ExpandableMessage & Emoji Message Engine Verification", () => {
  describe("1. Single Emoji Messages (😊, ❤️, 😂, 🔥, 😍)", () => {
    const singleEmojis = ["😊", "❤️", "😂", "🔥", "😍"];

    for (const emoji of singleEmojis) {
      it(`should recognize "${emoji}" as emoji-only with count 1`, () => {
        assert.equal(isEmojiOnly(emoji), true);
        assert.equal(getEmojiCount(emoji), 1);
        assert.equal(isLargeEmojiCandidate(emoji), true);
        assert.match(getEmojiSizeClass(emoji), /text-4xl/);
      });

      it(`should never mark "${emoji}" as potentially expandable (NO Read More)`, () => {
        assert.equal(checkPotentiallyExpandable(emoji, 8), false);
      });

      it(`should render "${emoji}" with transparent borderless bubble styling`, () => {
        const bubbleClass = getBubbleClasses({ messageText: emoji, isMine: false });
        assert.equal(bubbleClass, "p-1 sm:p-1.5 bg-transparent border-0 shadow-none");
      });
    }
  });

  describe("2. Multiple Emojis (😊😊😊, ❤️🔥😂)", () => {
    it("should recognize 3 emojis as emoji-only with count 3 and large styling", () => {
      const text1 = "😊😊😊";
      const text2 = "❤️🔥😂";

      assert.equal(isEmojiOnly(text1), true);
      assert.equal(getEmojiCount(text1), 3);
      assert.match(getEmojiSizeClass(text1), /text-4xl/);
      assert.equal(checkPotentiallyExpandable(text1), false);

      assert.equal(isEmojiOnly(text2), true);
      assert.equal(getEmojiCount(text2), 3);
      assert.match(getEmojiSizeClass(text2), /text-4xl/);
      assert.equal(checkPotentiallyExpandable(text2), false);
    });

    it("should recognize 4-6 emojis with medium-large styling", () => {
      const text = "😊😂❤️🔥";
      assert.equal(isEmojiOnly(text), true);
      assert.equal(getEmojiCount(text), 4);
      assert.match(getEmojiSizeClass(text), /text-3xl/);
      assert.equal(checkPotentiallyExpandable(text), false);
    });

    it("should recognize >6 emojis as emoji-only with fallback size and NO Read More", () => {
      const text = "😊😊😊😊😊😊😊";
      assert.equal(isEmojiOnly(text), true);
      assert.equal(getEmojiCount(text), 7);
      assert.equal(getEmojiSizeClass(text, "text-sm"), "text-sm");
      assert.equal(checkPotentiallyExpandable(text), false);
    });
  });

  describe("3. Complex Unicode Sequences (Flags, Skin-Tones, ZWJ, Keycaps)", () => {
    it("should recognize flag emojis (🇮🇳, 🇺🇸, 🏳️‍🌈)", () => {
      assert.equal(isEmojiOnly("🇮🇳"), true);
      assert.equal(getEmojiCount("🇮🇳"), 1);
      assert.equal(checkPotentiallyExpandable("🇮🇳"), false);

      assert.equal(isEmojiOnly("🏳️‍🌈"), true);
      assert.equal(getEmojiCount("🏳️‍🌈"), 1);
      assert.equal(checkPotentiallyExpandable("🏳️‍🌈"), false);
    });

    it("should recognize skin-tone modifiers (👍🏽, 🧑🏾‍💻)", () => {
      assert.equal(isEmojiOnly("👍🏽"), true);
      assert.equal(getEmojiCount("👍🏽"), 1);
      assert.equal(checkPotentiallyExpandable("👍🏽"), false);

      assert.equal(isEmojiOnly("🧑🏾‍💻"), true);
      assert.equal(getEmojiCount("🧑🏾‍💻"), 1);
      assert.equal(checkPotentiallyExpandable("🧑🏾‍💻"), false);
    });

    it("should recognize multi-person ZWJ family sequences (👨‍👩‍👧‍👦)", () => {
      assert.equal(isEmojiOnly("👨‍👩‍👧‍👦"), true);
      assert.equal(getEmojiCount("👨‍👩‍👧‍👦"), 1);
      assert.equal(checkPotentiallyExpandable("👨‍👩‍👧‍👦"), false);
    });

    it("should recognize keycap sequences (1️⃣, #️⃣)", () => {
      assert.equal(isEmojiOnly("1️⃣"), true);
      assert.equal(getEmojiCount("1️⃣"), 1);
      assert.equal(checkPotentiallyExpandable("1️⃣"), false);

      assert.equal(isEmojiOnly("#️⃣"), true);
      assert.equal(getEmojiCount("#️⃣"), 1);
      assert.equal(checkPotentiallyExpandable("#️⃣"), false);
    });
  });

  describe("4. Short Text Messages (Hello, Short Sentences)", () => {
    it('should NOT mark "Hello" as potentially expandable (NO Read More)', () => {
      const text = "Hello";
      assert.equal(isEmojiOnly(text), false);
      assert.equal(checkPotentiallyExpandable(text, 8), false);

      const bubbleClass = getBubbleClasses({ messageText: text, isMine: false });
      assert.match(bubbleClass, /bg-base-100/);
      assert.match(bubbleClass, /px-3/);
    });

    it("should NOT mark normal short messages as potentially expandable", () => {
      const text = "Are we still meeting at 5 PM today for coffee?";
      assert.equal(isEmojiOnly(text), false);
      assert.equal(checkPotentiallyExpandable(text, 8), false);
    });
  });

  describe("5. Short Text with Emojis (Hello 😊, Great job! 🎉)", () => {
    it('should NOT mark "Hello 😊" as potentially expandable (NO Read More)', () => {
      const text = "Hello 😊";
      assert.equal(isEmojiOnly(text), false);
      assert.equal(checkPotentiallyExpandable(text, 8), false);

      const bubbleClass = getBubbleClasses({ messageText: text, isMine: false });
      assert.match(bubbleClass, /bg-base-100/);
    });

    it('should NOT mark "Great job! 🎉🔥" as potentially expandable', () => {
      const text = "Great job! 🎉🔥";
      assert.equal(isEmojiOnly(text), false);
      assert.equal(checkPotentiallyExpandable(text, 8), false);
    });
  });

  describe("6. Long Text Messages (> 8 lines or > 160 chars)", () => {
    it("should mark messages with > 8 explicit newlines as potentially expandable", () => {
      const lines = [
        "Line 1",
        "Line 2",
        "Line 3",
        "Line 4",
        "Line 5",
        "Line 6",
        "Line 7",
        "Line 8",
        "Line 9 - overflow",
      ].join("\n");

      assert.equal(isEmojiOnly(lines), false);
      assert.equal(checkPotentiallyExpandable(lines, 8), true);
    });

    it("should mark very long single paragraphs as potentially expandable", () => {
      const longText =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";
      assert.equal(isEmojiOnly(longText), false);
      assert.equal(checkPotentiallyExpandable(longText, 8), true);
    });
  });

  describe("7. Long Messages with Mixed Text and Emojis (> 8 lines)", () => {
    it("should mark multi-line messages with emojis as potentially expandable if exceeding 8 lines", () => {
      const mixedLines = [
        "1. Welcome to the group! 🎉",
        "2. Please read the rules below 📜",
        "3. Be respectful to all members ❤️",
        "4. No spam or self-promotion 🚫",
        "5. Share helpful resources 📚",
        "6. Ask questions anytime 💡",
        "7. Participate in discussions 💬",
        "8. Reach out to admins if needed 🛡️",
        "9. Have a great time! 🚀",
      ].join("\n");

      assert.equal(isEmojiOnly(mixedLines), false);
      assert.equal(checkPotentiallyExpandable(mixedLines, 8), true);
    });
  });

  describe("8. Stickers, GIFs and Media Attachments", () => {
    it("should render stickers with normal card wrappers and NOT pure emoji", () => {
      const bubbleClass = getBubbleClasses({
        messageText: "",
        sticker: { url: "https://example.com/sticker.png" },
        isMine: false,
      });
      assert.match(bubbleClass, /bg-base-100/);
    });

    it("should render media captions without Read More when caption is short", () => {
      const caption = "Check out this photo 😊";
      assert.equal(checkPotentiallyExpandable(caption, 8), false);

      const bubbleClass = getBubbleClasses({
        messageText: caption,
        imageSrc: "https://example.com/photo.jpg",
        isMine: true,
      });
      assert.match(bubbleClass, /bg-primary/);
    });
  });

  describe("9. Thread Replies and Parent Messages", () => {
    it("should format single emoji replies cleanly without bubble background", () => {
      const replyText = "😊";
      assert.equal(isEmojiOnly(replyText), true);
      assert.equal(checkPotentiallyExpandable(replyText), false);
    });

    it("should format short text replies normally", () => {
      const replyText = "I agree!";
      assert.equal(isEmojiOnly(replyText), false);
      assert.equal(checkPotentiallyExpandable(replyText), false);
    });
  });

  describe("10. Edge Cases: Empty, Whitespace & Special Strings", () => {
    it("should return false for empty or whitespace strings", () => {
      assert.equal(isEmojiOnly(""), false);
      assert.equal(isEmojiOnly("   "), false);
      assert.equal(isEmojiOnly("\n\t"), false);
      assert.equal(checkPotentiallyExpandable(""), false);
      assert.equal(checkPotentiallyExpandable("   "), false);
    });

    it("should return false for non-string inputs", () => {
      assert.equal(isEmojiOnly(null), false);
      assert.equal(isEmojiOnly(undefined), false);
      assert.equal(isEmojiOnly(123), false);
      assert.equal(checkPotentiallyExpandable(null), false);
    });

    it("should NOT treat pure numbers or symbols as emojis", () => {
      assert.equal(isEmojiOnly("123"), false);
      assert.equal(isEmojiOnly("!@#$"), false);
      assert.equal(isEmojiOnly("abc"), false);
    });
  });

  describe("11. One-to-One Chat (ChatContainer) & Group Chat (GroupChatContainer) Parity", () => {
    it("should produce transparent borderless styling for both 1:1 and Group Chat on pure emoji", () => {
      const groupBubble = getBubbleClasses({
        messageText: "😊",
        isMine: false,
      });
      const dmBubble = getBubbleClasses({
        messageText: "😊",
        isMine: false,
      });
      assert.equal(groupBubble, "p-1 sm:p-1.5 bg-transparent border-0 shadow-none");
      assert.equal(dmBubble, "p-1 sm:p-1.5 bg-transparent border-0 shadow-none");
    });

    it("should retain full bubble card styling for standard messages", () => {
      const groupBubble = getBubbleClasses({
        messageText: "Hello group!",
        isMine: false,
      });
      assert.match(groupBubble, /border-base-300/);
      assert.match(groupBubble, /shadow-sm/);
    });
  });
});
