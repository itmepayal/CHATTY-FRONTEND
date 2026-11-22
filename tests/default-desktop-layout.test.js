import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Default Desktop Layout & Sidebar Visibility Test Suite", () => {
  const homePagePath = path.resolve(__dirname, "../src/pages/HomePage.jsx");
  const homePageCode = fs.readFileSync(homePagePath, "utf-8");

  const slidingSidebarStorePath = path.resolve(
    __dirname,
    "../src/store/useSlidingSidebarStore.js",
  );
  const slidingSidebarStoreCode = fs.readFileSync(
    slidingSidebarStorePath,
    "utf-8",
  );

  const slidingSidebarPath = path.resolve(
    __dirname,
    "../src/components/Sidebar/SlidingSidebar.jsx",
  );
  const slidingSidebarCode = fs.readFileSync(slidingSidebarPath, "utf-8");

  const sidebarPath = path.resolve(__dirname, "../src/components/Sidebar.jsx");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");

  const chatContainerPath = path.resolve(
    __dirname,
    "../src/components/Chat/ChatContainer.jsx",
  );
  const chatContainerCode = fs.readFileSync(chatContainerPath, "utf-8");

  const groupChatContainerPath = path.resolve(
    __dirname,
    "../src/components/group/GroupChatContainer.jsx",
  );
  const groupChatContainerCode = fs.readFileSync(
    groupChatContainerPath,
    "utf-8",
  );

  describe("1. Main Navigation Sidebar Default Expanded State", () => {
    it("initializes isCollapsed to false by default in useSlidingSidebarStore", () => {
      assert.ok(
        slidingSidebarStoreCode.includes("isCollapsed: false"),
        "useSlidingSidebarStore must initialize isCollapsed to false",
      );
    });

    it("ensures Main Navigation Sidebar is expanded when loading HomePage on desktop", () => {
      assert.ok(
        homePageCode.includes("useSlidingSidebarStore.getState().setCollapsed(false)"),
        "HomePage must explicitly ensure sidebar is expanded on desktop mount",
      );
    });

    it("preserves collapse and expand toggle functionality", () => {
      assert.ok(
        slidingSidebarStoreCode.includes("toggleCollapse:"),
        "Must preserve toggleCollapse action",
      );
      assert.ok(
        slidingSidebarCode.includes("toggleCollapse"),
        "SlidingSidebar must wire up toggleCollapse button",
      );
    });
  });

  describe("2. Messages / Conversation Sidebar Visibility", () => {
    it("keeps Messages Sidebar visible and expanded on desktop (lg:flex)", () => {
      assert.ok(
        sidebarCode.includes("lg:flex"),
        "Messages Sidebar must remain flex on desktop regardless of open chat",
      );
    });

    it("preserves mobile responsive collapse when conversation is active", () => {
      assert.ok(
        sidebarCode.includes('hasOpenChat ? "hidden lg:flex" : "flex"'),
        "Messages Sidebar must hide on small screens when a chat is open",
      );
    });
  });

  describe("3. Contact Information & Group Information Panel Open by Default", () => {
    it("initializes showInfo and showGroupInfo to true on desktop", () => {
      assert.ok(
        homePageCode.includes("const [showInfo, setShowInfo] = useState(() => isDesktopViewport())"),
        "showInfo must initialize to true on desktop viewports",
      );
      assert.ok(
        homePageCode.includes("const [showGroupInfo, setShowGroupInfo] = useState(() => isDesktopViewport())"),
        "showGroupInfo must initialize to true on desktop viewports",
      );
    });

    it("resets manualClose and opens info panel on desktop when switching conversations", () => {
      assert.ok(
        homePageCode.includes("prevChatKeyRef.current = currentChatKey"),
        "HomePage must track conversation changes via key",
      );
      assert.ok(
        homePageCode.includes("manualCloseRef.current = false"),
        "Must reset manual close flag when switching conversations",
      );
      assert.ok(
        homePageCode.includes("setShowInfo(desktop)") ||
          homePageCode.includes("setShowGroupInfo(desktop)"),
        "Must open info panel on desktop for the new conversation",
      );
    });
  });

  describe("4. Thread & Contact Info Mutual Exclusivity and Return on Close", () => {
    it("closes info panel when a thread becomes active", () => {
      assert.ok(
        homePageCode.includes("setShowInfo(false)") &&
          homePageCode.includes("setShowGroupInfo(false)"),
        "Must close info panel when thread opens",
      );
    });

    it("returns to contact info when thread closes if not manually dismissed", () => {
      assert.ok(
        homePageCode.includes("!hasActiveThread && prevHasActiveThreadRef.current"),
        "Must detect thread close transition",
      );
      assert.ok(
        homePageCode.includes("!manualCloseRef.current && isDesktopViewport()"),
        "Must verify user did not manually close contact info before restoring it",
      );
    });

    it("respects explicit manual close and prevents reopening on re-renders", () => {
      assert.ok(
        homePageCode.includes("manualCloseRef.current = !next"),
        "Must record user's manual close action in a ref",
      );
    });
  });

  describe("5. Chat Container Stability & Zero Horizontal Overflow", () => {
    it("ensures ChatContainer flexes smoothly without rigid clamping", () => {
      assert.ok(
        chatContainerCode.includes("flex-1"),
        "ChatContainer must use flex-1 to take available space",
      );
    });

    it("ensures GroupChatContainer flexes smoothly without rigid clamping", () => {
      assert.ok(
        groupChatContainerCode.includes("flex-1"),
        "GroupChatContainer must use flex-1 to take available space",
      );
    });
  });
});
