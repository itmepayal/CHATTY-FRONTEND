import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chatty Video Call Experience — Premium UI Redesign Suite", () => {
  const callUiPath = path.resolve(__dirname, "../src/components/Call/CallUI.jsx");
  const callActionBarPath = path.resolve(
    __dirname,
    "../src/components/Call/common/CallActionBar.jsx",
  );
  const callHeaderPath = path.resolve(
    __dirname,
    "../src/components/Call/common/CallHeader.jsx",
  );
  const callTokensPath = path.resolve(
    __dirname,
    "../src/components/Call/common/callTokens.js",
  );
  const callStatusBadgePath = path.resolve(
    __dirname,
    "../src/components/Call/common/CallStatusBadge.jsx",
  );
  const callReactionsBarPath = path.resolve(
    __dirname,
    "../src/components/Call/common/CallReactionsBar.jsx",
  );

  const callUiCode = fs.readFileSync(callUiPath, "utf-8");
  const callActionBarCode = fs.readFileSync(callActionBarPath, "utf-8");
  const callHeaderCode = fs.readFileSync(callHeaderPath, "utf-8");
  const callTokensCode = fs.readFileSync(callTokensPath, "utf-8");
  const callStatusBadgeCode = fs.readFileSync(callStatusBadgePath, "utf-8");
  const callReactionsBarCode = fs.readFileSync(callReactionsBarPath, "utf-8");

  describe("1. Main Video Call Layout & Staging", () => {
    it("renders remote video as primary focus with autoplay, playsInline and audio enabled", () => {
      assert.ok(callUiCode.includes("ref={remoteRef}"), "Must bind remote video element ref");
      assert.ok(callUiCode.includes("autoPlay"), "Remote video must have autoPlay");
      assert.ok(callUiCode.includes("playsInline"), "Remote video must play inline for mobile");
      assert.ok(callUiCode.includes("muted={false}"), "Remote media must remain unmuted");
    });

    it("includes cinematic ambient stage background and vignette overlay", () => {
      assert.ok(
        callUiCode.includes("bg-[#07090e]") || callUiCode.includes("bg-[#0a0c10]"),
        "Must use deep dark stage surface",
      );
      assert.ok(
        callUiCode.includes("shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]") ||
          callUiCode.includes("shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]"),
        "Must include cinematic vignette overlay for contrast and depth",
      );
    });

    it("provides high-fidelity fallback screen when video is off or audio-only", () => {
      assert.ok(
        callUiCode.includes("<CallAvatar"),
        "Must display CallAvatar when camera is disabled",
      );
      assert.ok(
        callUiCode.includes("Camera is off"),
        "Must display clean status pill when remote camera is off",
      );
    });
  });

  describe("2. Top Information Header Redesign", () => {
    it("renders compact header with participant identity and verified encryption badge", () => {
      assert.ok(
        callHeaderCode.includes("pt-[max(0.75rem,env(safe-area-inset-top))]"),
        "Header must respect safe-area top inset",
      );
      assert.ok(
        callHeaderCode.includes("CallSecurityBadge"),
        "Header must include encryption security indicator",
      );
      assert.ok(
        callStatusBadgeCode.includes("Encrypted"),
        "Security badge must state Encrypted",
      );
    });

    it("displays live call timer and accurate connection quality stats", () => {
      assert.ok(
        callHeaderCode.includes("<CallStatusIndicator"),
        "Header must display live duration indicator",
      );
      assert.ok(
        callHeaderCode.includes("<CallNetworkBadge"),
        "Header must display actual network quality badge",
      );
    });

    it("includes controls for fullscreen, view mode switch, and minimize", () => {
      assert.ok(callHeaderCode.includes("onMinimize"), "Must support minimize action");
      assert.ok(callHeaderCode.includes("onToggleFullscreen"), "Must support fullscreen toggle");
      assert.ok(callHeaderCode.includes("onToggleViewMode"), "Must support view mode switch");
    });
  });

  describe("3. Self-Video Preview (Floating Picture-in-Picture)", () => {
    it("positions preview in top-right with drag physics and fluid responsive sizing", () => {
      assert.ok(
        callUiCode.includes("right-3 sm:right-4 top-16 sm:top-20"),
        "Must position preview in top-right with standard offsets",
      );
      assert.ok(callUiCode.includes("drag"), "Must enable draggable preview");
      assert.ok(callUiCode.includes("dragConstraints={stageRef}"), "Must constrain drag bounds");
      assert.ok(
        callUiCode.includes("h-32 w-24 xs:h-36 xs:w-28 sm:h-48 sm:w-36 md:h-56 md:w-40"),
        "Must maintain tested fluid proportions across mobile, tablet, and desktop",
      );
    });

    it("provides glassmorphic borders, shadows, and status badges", () => {
      assert.ok(
        callUiCode.includes("rounded-2xl sm:rounded-3xl border border-white/20 bg-[#121620]/95"),
        "Must use premium dark glass container for local video preview",
      );
      assert.ok(callUiCode.includes("Your Screen"), "Must display screen share badge when active");
      assert.ok(callUiCode.includes("Camera off"), "Must display camera off fallback");
    });
  });

  describe("4. Floating Call Control Dock (CallActionBar & CallControlButton)", () => {
    it("renders floating control dock at bottom center with translucent dark surface and backdrop blur", () => {
      assert.ok(
        callActionBarCode.includes("rounded-2xl sm:rounded-3xl border border-white/[0.12] bg-[#121620]/90"),
        "Action dock must use rounded dark glass surface",
      );
      assert.ok(
        callActionBarCode.includes("backdrop-blur-2xl"),
        "Action dock must apply refined backdrop blur",
      );
      assert.ok(
        callActionBarCode.includes("pb-[max(1.25rem,env(safe-area-inset-bottom))]"),
        "Action dock must respect safe-area bottom inset",
      );
    });

    it("enforces balanced button touch targets (>= 44x44px)", () => {
      assert.ok(
        callTokensCode.includes("size-11 sm:size-12 min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]"),
        "Control button sizes must be at least 44px on mobile and 48px on desktop",
      );
    });

    it("styles End Call with visually distinct and recognizable crimson styling", () => {
      assert.ok(
        callTokensCode.includes("bg-rose-600 text-white hover:bg-rose-500"),
        "End call danger variant must use refined rose-600 styling",
      );
    });
  });

  describe("5. Advanced Control Panels & Mobile Slide-Up Sheet", () => {
    it("organizes controls with mobile More button and slide-up sheet on small screens", () => {
      assert.ok(
        callUiCode.includes('icon={MoreHorizontal}'),
        "Must render MoreHorizontal button for mobile",
      );
      assert.ok(
        callUiCode.includes('className="flex sm:hidden"'),
        "More button must be visible only on mobile screens",
      );
      assert.ok(
        callUiCode.includes('More Call Options'),
        "Must provide slide-up sheet with More Call Options",
      );
    });

    it("renders floating emoji reactions bar above the toolbar", () => {
      assert.ok(
        callReactionsBarCode.includes("bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2"),
        "Reactions bar must float above the bottom dock",
      );
      assert.ok(
        callReactionsBarCode.includes("backdrop-blur-2xl ring-1 ring-white/10"),
        "Reactions bar must use refined glass styling",
      );
    });

    it("presents Audio Device modal with input and output selection", () => {
      assert.ok(callUiCode.includes("Audio Devices"), "Must provide Audio Devices modal");
      assert.ok(callUiCode.includes("Microphone (Input)"), "Must list microphone inputs");
      assert.ok(callUiCode.includes("Speaker / Headset (Output)"), "Must list speaker outputs");
    });
  });
});
