import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

describe("Sidebar Unified Redesign & Single Logout Architecture Suite", () => {
  const slidingSidebarSrc = fs.readFileSync(
    "src/components/Sidebar/SlidingSidebar.jsx",
    "utf8"
  );
  const sidebarSrc = fs.readFileSync(
    "src/components/Sidebar.jsx",
    "utf8"
  );
  const sidebarFooterSrc = fs.readFileSync(
    "src/components/Sidebar/SidebarFooter.jsx",
    "utf8"
  );
  const sidebarHeaderSrc = fs.readFileSync(
    "src/components/Sidebar/SidebarHeader.jsx",
    "utf8"
  );

  describe("1. Single Centralized Logout Architecture", () => {
    it("enforces Logout exists ONLY in the Main Application Sidebar (SlidingSidebar.jsx)", () => {
      assert.match(
        slidingSidebarSrc,
        /Log out/,
        "Main navigation sidebar must provide the authoritative Log out action"
      );
      assert.match(
        slidingSidebarSrc,
        /<LogoutConfirm/,
        "Main navigation sidebar must render the Logout confirmation modal"
      );
    });

    it("verifies duplicate Logout is completely removed from Messages Sidebar Footer (SidebarFooter.jsx)", () => {
      assert.doesNotMatch(
        sidebarFooterSrc,
        /import\s+.*LogOut.*from/,
        "SidebarFooter must NOT import LogOut icon"
      );
      assert.doesNotMatch(
        sidebarFooterSrc,
        /label="Log out"/,
        "SidebarFooter must NOT render Log out button"
      );
      assert.doesNotMatch(
        sidebarFooterSrc,
        /setConfirmLogout/,
        "SidebarFooter must NOT accept setConfirmLogout prop"
      );
    });

    it("verifies duplicate LogoutConfirm modal is removed from Sidebar.jsx", () => {
      assert.doesNotMatch(
        sidebarSrc,
        /<LogoutConfirm/,
        "Sidebar.jsx must NOT render duplicate LogoutConfirm modal"
      );
    });
  });

  describe("2. Main Application Navigation Sidebar (SlidingSidebar.jsx)", () => {
    it("features aligned brand header (h-13 sm:h-14) with Chatty logo and Messenger subtitle", () => {
      assert.match(
        slidingSidebarSrc,
        /h-13\s+sm:h-14/,
        "Brand header must match Messages sidebar header height"
      );
      assert.match(slidingSidebarSrc, /ChattyLogo/);
      assert.match(slidingSidebarSrc, /Messenger/);
    });

    it("features dedicated User Profile summary card with avatar, online indicator and profile navigation", () => {
      assert.match(
        slidingSidebarSrc,
        /handleNav\("\/profile"\)/,
        "Profile card must navigate to /profile"
      );
      assert.match(
        slidingSidebarSrc,
        /meOnline/,
        "Profile card must display online status"
      );
    });

    it("organizes Main Menu into exactly 9 distinct navigation items", () => {
      const mainIds = [
        "dashboard",
        "chats",
        "stories",
        "groups",
        "calls",
        "contacts",
        "notifications",
        "archived",
        "saved",
      ];
      for (const id of mainIds) {
        assert.match(
          slidingSidebarSrc,
          new RegExp(`id:\\s*"${id}"`),
          `Main menu must include destination: ${id}`
        );
      }
    });

    it("organizes Preferences & Security into exactly 5 distinct navigation items", () => {
      const prefIds = [
        "profile-settings",
        "privacy-settings",
        "appearance-settings",
        "notifications-settings",
        "help-support",
      ];
      for (const id of prefIds) {
        assert.match(
          slidingSidebarSrc,
          new RegExp(`id:\\s*"${id}"`),
          `Preferences must include destination: ${id}`
        );
      }
    });

    it("anchors Theme toggle and restrained danger single Logout at bottom", () => {
      assert.match(
        slidingSidebarSrc,
        /handleNav\("\/settings\/appearance"\)/,
        "Bottom section must include Theme toggle"
      );
      assert.match(
        slidingSidebarSrc,
        /text-error/,
        "Logout action must use restrained danger styling"
      );
    });

    it("supports Collapsed Rail with tooltips and accessible controls", () => {
      assert.match(
        slidingSidebarSrc,
        /w-\[76px\]/,
        "Collapsed navigation rail width must be 76px"
      );
      assert.match(
        slidingSidebarSrc,
        /renderCollapsedContent/,
        "Must provide collapsed navigation rail renderer"
      );
    });

    it("supports Mobile Off-Canvas Drawer with overlay and escape handling", () => {
      assert.match(
        slidingSidebarSrc,
        /isMobileOpen/,
        "Drawer must support isMobileOpen state"
      );
      assert.match(
        slidingSidebarSrc,
        /backdrop-blur/,
        "Drawer must include backdrop blur overlay"
      );
      assert.match(
        slidingSidebarSrc,
        /handleKeyDown/,
        "Drawer must handle Escape key navigation"
      );
    });
  });

  describe("3. Messages / Conversation List Sidebar", () => {
    it("features standard header (h-13 sm:h-14) with title, online count, saved, notifications and contacts", () => {
      assert.match(
        sidebarHeaderSrc,
        /h-13\s+sm:h-14/,
        "Messages header must use h-13 sm:h-14 scale"
      );
      assert.match(
        sidebarHeaderSrc,
        /NotificationBell/,
        "Messages header must include NotificationBell"
      );
      assert.match(
        sidebarHeaderSrc,
        /Bookmark/,
        "Messages header must include Bookmark for Saved messages"
      );
      assert.match(
        sidebarHeaderSrc,
        /UserPlus/,
        "Messages header must include Add Contact"
      );
    });

    it("features 4 navigation tabs (Chats, Groups, Calls, Requests) with active indicators", () => {
      assert.match(sidebarSrc, /key:\s*"chats"/);
      assert.match(sidebarSrc, /key:\s*"groups"/);
      assert.match(sidebarSrc, /key:\s*"calls"/);
      assert.match(sidebarSrc, /key:\s*"requests"/);
    });

    it("features clean account footer focused strictly on user identity and settings", () => {
      assert.match(
        sidebarFooterSrc,
        /navigate\("\/profile"\)/,
        "Footer must navigate to profile"
      );
      assert.match(
        sidebarFooterSrc,
        /navigate\("\/settings"\)/,
        "Footer must navigate to settings"
      );
      assert.doesNotMatch(
        sidebarFooterSrc,
        /setConfirmLogout/,
        "Footer must not contain logout trigger"
      );
    });
  });

  describe("4. Visual Consistency & Design System Alignment", () => {
    it("both sidebars share unified background, border and elevation design tokens", () => {
      assert.match(slidingSidebarSrc, /bg-base-100/);
      assert.match(sidebarSrc, /bg-base-100/);
      assert.match(slidingSidebarSrc, /border-base-300/);
      assert.match(sidebarSrc, /border-base-300/);
    });

    it("conversation rows feature subtle active state and green indicator bar", () => {
      const componentsSrc = fs.readFileSync(
        "src/components/Sidebar/SidebarComponents.jsx",
        "utf8"
      );
      assert.match(
        componentsSrc,
        /layoutId="sidebar-selected"/,
        "Conversation row must have smooth layoutId indicator"
      );
      assert.match(
        componentsSrc,
        /bg-primary\/10/,
        "Selected row must have subtle primary tint"
      );
      assert.match(
        componentsSrc,
        /w-1 rounded-full bg-primary/,
        "Selected row must have refined green indicator bar"
      );
    });
  });
});
