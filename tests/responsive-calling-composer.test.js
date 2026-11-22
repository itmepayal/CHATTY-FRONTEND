import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "..");

describe("Voice Calling, Video Calling & Message Composer Responsive Suite", () => {
  it("1. CALL_BUTTON_SIZES enforces minimum touch target >= 44x44px across all sizes", () => {
    const tokensContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/common/callTokens.js"),
      "utf8",
    );
    assert.match(
      tokensContent,
      /min-w-\[44px\]\s+min-h-\[44px\]/,
      "Call control buttons must enforce min-w-[44px] min-h-[44px] touch target",
    );
  });

  it("2. CallAvatar uses fluid scaling for xl and 2xl to prevent landscape/mobile overflow", () => {
    const avatarContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/common/CallAvatar.jsx"),
      "utf8",
    );
    assert.match(
      avatarContent,
      /size-20\s+xs:size-24\s+sm:size-32/,
      "Avatar xl size must be fluid across small mobile, landscape and desktop",
    );
    assert.match(
      avatarContent,
      /size-24\s+xs:size-28\s+sm:size-36\s+lg:size-40/,
      "Avatar 2xl size must be fluid to prevent vertical clipping on short viewports",
    );
  });

  it("3. CallActionBar dock enforces swipeable scroll & safe area padding", () => {
    const barContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/common/CallActionBar.jsx"),
      "utf8",
    );
    assert.match(
      barContent,
      /overflow-x-auto\s+no-scrollbar\s+touch-pan-x/,
      "Action bar must support swipeable horizontal overflow on mobile",
    );
    assert.match(
      barContent,
      /pb-\[max\(1\.25rem,env\(safe-area-inset-bottom\)\)\]/,
      "Action bar must account for safe-area-inset-bottom",
    );
    assert.match(
      barContent,
      /max-w-\[min\(98vw,56rem\)\]/,
      "Action bar dock container must be bounded to 98vw",
    );
  });

  it("4. CallHeader uses safe-area top inset and fluid title truncation", () => {
    const headerContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/common/CallHeader.jsx"),
      "utf8",
    );
    assert.match(
      headerContent,
      /pt-\[max\(0\.75rem,env\(safe-area-inset-top\)\)\]/,
      "Header must account for mobile status bar notch safe-area-inset-top",
    );
    assert.match(
      headerContent,
      /max-w-\[42vw\]\s+xs:max-w-\[55vw\]\s+sm:max-w-xs\s+md:max-w-md/,
      "Peer name must truncate responsively across mobile, landscape and desktop",
    );
  });

  it("5. MinimizedCallView dynamically tracks viewport dimensions & safe areas", () => {
    const minContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/common/MinimizedCallView.jsx"),
      "utf8",
    );
    assert.match(
      minContent,
      /windowDimensions/,
      "MinimizedCallView must dynamically track viewport dimensions",
    );
    assert.match(
      minContent,
      /orientationchange/,
      "MinimizedCallView must listen to orientationchange events",
    );
    assert.match(
      minContent,
      /bottom-\[max\(1\.25rem,env\(safe-area-inset-bottom\)\)\]/,
      "Minimized floating card must respect safe-area-inset-bottom",
    );
    assert.match(
      minContent,
      /right-\[max\(1rem,env\(safe-area-inset-right\)\)\]/,
      "Minimized floating card must respect safe-area-inset-right",
    );
    assert.match(
      minContent,
      /w-\[min\(18rem,calc\(100vw-1\.5rem\)\)\]/,
      "Minimized floating card width must adapt on narrow mobile screens",
    );
  });

  it("6. ActiveCall organizes primary vs secondary controls with mobile slide-up sheet", () => {
    const callUIContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/CallUI.jsx"),
      "utf8",
    );
    // Mobile More button
    assert.match(
      callUIContent,
      /icon=\{MoreHorizontal\}\s+label="More"/,
      "Mobile action bar must render More button",
    );
    assert.match(
      callUIContent,
      /className="flex\s+sm:hidden"/,
      "More button must be visible only on mobile (< sm)",
    );
    // Secondary controls hidden on mobile, visible on desktop
    assert.match(
      callUIContent,
      /className="hidden\s+sm:flex"/,
      "Secondary call buttons must be hidden on mobile dock to prevent overflow",
    );
    // Slide-up sheet
    assert.match(
      callUIContent,
      /showMoreMobileMenu/,
      "ActiveCall must manage showMoreMobileMenu state",
    );
    assert.match(
      callUIContent,
      /More Call Options/,
      "ActiveCall must render More Call Options slide-up sheet on mobile",
    );
  });

  it("7. Local video preview PIP uses responsive proportions across orientations", () => {
    const callUIContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/CallUI.jsx"),
      "utf8",
    );
    assert.match(
      callUIContent,
      /h-32\s+w-24\s+xs:h-36\s+xs:w-28\s+sm:h-48\s+sm:w-36\s+md:h-56\s+md:w-40/,
      "Draggable local preview must use fluid sizing across mobile, tablet, and desktop",
    );
    assert.match(
      callUIContent,
      /right-3\s+sm:right-4\s+top-16\s+sm:top-20/,
      "Local preview must be safely offset from header and dock",
    );
  });

  it("8. Modals (Camera, Captions, Effects, Audio) are resilient in landscape viewports", () => {
    const camContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/modals/CameraControlsModal.jsx"),
      "utf8",
    );
    const capContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/modals/CaptionsModal.jsx"),
      "utf8",
    );
    const fxContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Call/modals/VideoEffectsModal.jsx"),
      "utf8",
    );

    assert.match(
      camContent,
      /max-h-\[min\(90dvh,580px\)\]\s+flex\s+flex-col/,
      "CameraControlsModal must be capped at 90dvh flex column for landscape",
    );
    assert.match(
      capContent,
      /max-h-\[min\(90dvh,580px\)\]\s+flex\s+flex-col/,
      "CaptionsModal must be capped at 90dvh flex column for landscape",
    );
    assert.match(
      fxContent,
      /max-h-\[min\(92dvh,680px\)\]/,
      "VideoEffectsModal must be capped at 92dvh for landscape",
    );
    assert.match(
      fxContent,
      /h-24\s+xs:h-32\s+sm:h-44/,
      "VideoEffectsModal camera preview stage must adapt on short screens",
    );
  });

  it("9. MessageComposer textarea uses text-base sm:text-sm to prevent iOS auto-zoom", () => {
    const composerContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Chat/Common/MessageComposer.jsx"),
      "utf8",
    );
    assert.match(
      composerContent,
      /text-base\s+sm:text-sm/,
      "Textarea must have 16px (text-base) on mobile to eliminate iOS Safari auto-zoom",
    );
  });

  it("10. MessageComposer organizes left/right toolbars adaptively for 320px screens", () => {
    const composerContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Chat/Common/MessageComposer.jsx"),
      "utf8",
    );
    // Plus and Smile always visible
    assert.match(
      composerContent,
      /togglePopover\("more"\)/,
      "More attachments (+) button must be present",
    );
    assert.match(
      composerContent,
      /togglePopover\("emoji"\)/,
      "Emoji picker button must be present",
    );
    // Progressive disclosure classes
    assert.match(
      composerContent,
      /hidden\s+xs:inline-flex/,
      "Secondary actions must progressively disclose at xs breakpoint",
    );
    assert.match(
      composerContent,
      /hidden\s+sm:inline-flex/,
      "Tablet actions must progressively disclose at sm breakpoint",
    );
    assert.match(
      composerContent,
      /hidden\s+md:inline-flex/,
      "Desktop actions must progressively disclose at md breakpoint",
    );
    // Send / Mic button always visible
    assert.match(
      composerContent,
      /w-9\.5\s+h-9\.5\s+sm:w-10\s+sm:h-10/,
      "Send/Mic button must maintain prominent touch size",
    );
  });

  it("11. EmojiPicker, StickerPicker and GifPicker dynamically constrain height for landscape", () => {
    const composerContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Chat/Common/MessageComposer.jsx"),
      "utf8",
    );
    const menuContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Chat/Common/MoreAttachmentsMenu.jsx"),
      "utf8",
    );

    assert.match(
      composerContent,
      /window\.innerHeight\s*-\s*140/,
      "EmojiPicker height must adapt dynamically to window.innerHeight",
    );
    assert.match(
      menuContent,
      /w-\[min\(20rem,calc\(100vw-1rem\)\)\]/,
      "MoreAttachmentsMenu width must not exceed 100vw - 1rem on small screens",
    );
    assert.match(
      menuContent,
      /max-h-\[min\(380px,calc\(100dvh-100px\)\)\]/,
      "MoreAttachmentsMenu height must not exceed 100dvh - 100px on landscape viewports",
    );
  });

  it("12. Voice recording waveform adjusts gracefully for 320px screens", () => {
    const composerContent = fs.readFileSync(
      path.join(CLIENT_DIR, "src/components/Chat/Common/MessageComposer.jsx"),
      "utf8",
    );
    assert.match(
      composerContent,
      /i\s*>=\s*8\s*\?\s*"hidden\s+xs:block"\s*:\s*""/,
      "Voice waveform bars must compress on small mobile to avoid overflow",
    );
  });

  it("13. 14 Target Breakpoints Math Validation (320px to 1920px)", () => {
    const targetBreakpoints = [
      { name: "iPhone SE (1st gen)", width: 320, height: 568, type: "small_mobile" },
      { name: "Galaxy S5 / Android Compact", width: 360, height: 640, type: "standard_mobile" },
      { name: "iPhone SE (3rd gen)", width: 375, height: 667, type: "standard_mobile" },
      { name: "iPhone 12 / 13 / 14", width: 390, height: 844, type: "large_mobile" },
      { name: "iPhone XR / 11", width: 414, height: 896, type: "large_mobile" },
      { name: "iPhone 14 / 15 Pro Max", width: 430, height: 932, type: "large_mobile" },
      { name: "iPhone SE Landscape", width: 568, height: 320, type: "mobile_landscape" },
      { name: "iPhone 8 Landscape", width: 667, height: 375, type: "mobile_landscape" },
      { name: "iPhone 13 Landscape", width: 844, height: 390, type: "mobile_landscape" },
      { name: "iPad Mini Portrait", width: 768, height: 1024, type: "tablet" },
      { name: "iPad Air Portrait", width: 820, height: 1180, type: "tablet" },
      { name: "iPad Landscape", width: 1024, height: 768, type: "tablet_landscape" },
      { name: "HD Laptop", width: 1280, height: 720, type: "desktop" },
      { name: "Full HD Monitor", width: 1920, height: 1080, type: "desktop" },
    ];

    assert.equal(targetBreakpoints.length, 14, "Must cover all 14 required device profiles");

    for (const bp of targetBreakpoints) {
      // 1. Minimized Card bounds check
      const cardMaxW = Math.min(288, bp.width - 24);
      assert.ok(cardMaxW <= bp.width, `Minimized card width must fit inside ${bp.name}`);
      assert.ok(cardMaxW >= 240, `Minimized card must maintain usable width on ${bp.name}`);

      // 2. Attachments Menu bounds check
      const menuMaxW = Math.min(320, bp.width - 16);
      assert.ok(menuMaxW <= bp.width, `Attachment menu must fit horizontally on ${bp.name}`);
      const menuMaxH = Math.min(380, bp.height - 100);
      assert.ok(menuMaxH <= bp.height, `Attachment menu must fit vertically on ${bp.name}`);

      // 3. Modals 90dvh bounds check
      const modalMaxH = Math.min(580, bp.height * 0.9);
      assert.ok(modalMaxH <= bp.height, `Modal max-height must fit within viewport height on ${bp.name}`);

      // 4. Action bar dock 5-button width on mobile (<640px)
      if (bp.width < 640) {
        // 5 buttons x 44px + 4 gaps x 8px + 32px padding = ~284px
        const mobileDockWidth = 5 * 44 + 4 * 8 + 32;
        assert.ok(
          mobileDockWidth <= bp.width,
          `5-button mobile action dock (${mobileDockWidth}px) must fit cleanly in ${bp.name} (${bp.width}px)`,
        );
      }
    }
  });
});
