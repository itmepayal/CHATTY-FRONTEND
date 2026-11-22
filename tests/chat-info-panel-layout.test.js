import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Chat & Info Panel 3-Panel Layout Stability Verification", () => {
  it("1. ChatLayout provides a spacious wide-screen container (>= 1720px max-width)", () => {
    const layoutPath = path.join(
      rootDir,
      "src/components/chat-ui/ChatLayout.jsx",
    );
    const content = fs.readFileSync(layoutPath, "utf8");

    assert.ok(
      content.includes("max-w-[1720px]") || content.includes("max-w-[1800px]"),
      "ChatLayout must support widescreen displays (>= 1720px) without artificial 1280px clamping",
    );
    assert.ok(
      !content.includes("max-w-7xl"),
      "ChatLayout must not be clamped to max-w-7xl (1280px) which squishes the 3-panel layout",
    );
  });

  it("2. ChatContainer enforces a healthy minimum width (>= 480px lg, >= 520px xl) preventing shrinkage", () => {
    const chatContainerPath = path.join(
      rootDir,
      "src/components/Chat/ChatContainer.jsx",
    );
    const content = fs.readFileSync(chatContainerPath, "utf8");

    assert.ok(
      content.includes("lg:min-w-[480px]") &&
        content.includes("xl:min-w-[520px]"),
      "ChatContainer must enforce min-w >= 480px on lg and >= 520px on xl",
    );
    assert.ok(
      !content.includes("lg:min-w-[360px]"),
      "ChatContainer must not permit shrinking down to 360px",
    );
  });

  it("3. GroupChatContainer enforces identical minimum width (>= 480px lg, >= 520px xl) preventing shrinkage", () => {
    const groupContainerPath = path.join(
      rootDir,
      "src/components/group/GroupChatContainer.jsx",
    );
    const content = fs.readFileSync(groupContainerPath, "utf8");

    assert.ok(
      content.includes("lg:min-w-[480px]") &&
        content.includes("xl:min-w-[520px]"),
      "GroupChatContainer must enforce min-w >= 480px on lg and >= 520px on xl",
    );
    assert.ok(
      !content.includes("lg:min-w-[360px]"),
      "GroupChatContainer must not permit shrinking down to 360px",
    );
  });

  it("4. UserInfoPanel maintains fixed non-shrinking width on desktop (xl:shrink-0 xl:w-[320px])", () => {
    const userInfoPath = path.join(
      rootDir,
      "src/components/Chat/UserInfoPanel.jsx",
    );
    const content = fs.readFileSync(userInfoPath, "utf8");

    assert.ok(
      content.includes("xl:shrink-0"),
      "UserInfoPanel must specify xl:shrink-0 to prevent flex compression",
    );
    assert.ok(
      content.includes("xl:w-[320px]"),
      "UserInfoPanel must have a stable xl:w-[320px] width on desktop",
    );
    assert.ok(
      content.includes("xl:relative"),
      "UserInfoPanel must be in-flow relative on desktop",
    );
    assert.ok(
      content.includes("fixed inset-y-0 right-0 z-50"),
      "UserInfoPanel must be a fixed drawer on mobile/tablet",
    );
    assert.ok(
      content.includes("overflow-y-auto overscroll-contain"),
      "UserInfoPanel must have independent scrolling",
    );
  });

  it("5. GroupInfoPanel maintains identical non-shrinking width on desktop (xl:shrink-0 xl:w-[320px])", () => {
    const groupInfoPath = path.join(
      rootDir,
      "src/components/group/GroupInfoPanel.jsx",
    );
    const content = fs.readFileSync(groupInfoPath, "utf8");

    assert.ok(
      content.includes("xl:shrink-0"),
      "GroupInfoPanel must specify xl:shrink-0 to prevent flex compression",
    );
    assert.ok(
      content.includes("xl:w-[320px]"),
      "GroupInfoPanel must have a stable xl:w-[320px] width on desktop",
    );
    assert.ok(
      content.includes("xl:relative"),
      "GroupInfoPanel must be in-flow relative on desktop",
    );
    assert.ok(
      content.includes("fixed inset-y-0 right-0 z-50"),
      "GroupInfoPanel must be a fixed drawer on mobile/tablet",
    );
    assert.ok(
      content.includes("overflow-y-auto overscroll-contain"),
      "GroupInfoPanel must have independent scrolling",
    );
  });

  it("6. Mobile and tablet backdrops exist and disappear on desktop (xl:hidden)", () => {
    const userInfoContent = fs.readFileSync(
      path.join(rootDir, "src/components/Chat/UserInfoPanel.jsx"),
      "utf8",
    );
    const groupInfoContent = fs.readFileSync(
      path.join(rootDir, "src/components/group/GroupInfoPanel.jsx"),
      "utf8",
    );

    assert.ok(
      userInfoContent.includes("xl:hidden"),
      "UserInfoPanel backdrop must hide on desktop (xl:hidden)",
    );
    assert.ok(
      groupInfoContent.includes("xl:hidden"),
      "GroupInfoPanel backdrop must hide on desktop (xl:hidden)",
    );
  });

  it("7. ThreadPanel automatically coordinates with InfoPanel to prevent multi-sidebar collision", () => {
    const homeContent = fs.readFileSync(
      path.join(rootDir, "src/pages/HomePage.jsx"),
      "utf8",
    );

    assert.ok(
      homeContent.includes("hasActiveThread"),
      "HomePage must track active threads to coordinate sidebars",
    );
    assert.ok(
      homeContent.includes("setShowInfo(false)") &&
        homeContent.includes("setShowGroupInfo(false)"),
      "HomePage must close info panels when an inline thread is active",
    );
  });

  it("8. Header heights in ChatHeader, GroupChatHeader, and InfoPanels are vertically aligned", () => {
    const userInfoContent = fs.readFileSync(
      path.join(rootDir, "src/components/Chat/UserInfoPanel.jsx"),
      "utf8",
    );
    const groupInfoContent = fs.readFileSync(
      path.join(rootDir, "src/components/group/GroupInfoPanel.jsx"),
      "utf8",
    );
    const chatPrimitivesContent = fs.readFileSync(
      path.join(
        rootDir,
        "src/components/Chat/Common/ChatHeaderPrimitives.jsx",
      ),
      "utf8",
    );

    assert.ok(
      userInfoContent.includes("h-13 sm:h-14"),
      "UserInfoPanel header height must be h-13 sm:h-14",
    );
    assert.ok(
      groupInfoContent.includes("h-13 sm:h-14"),
      "GroupInfoPanel header height must be h-13 sm:h-14",
    );
    assert.ok(
      chatPrimitivesContent.includes("h-13 sm:h-14"),
      "ChatHeaderContainer header height must be h-13 sm:h-14",
    );
  });
});
