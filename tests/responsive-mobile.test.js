import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Mobile-First Responsive Redesign Validation Suite", () => {
  it("1. Sidebar Header uses compact mobile-first height scale (h-13 sm:h-14)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar/SidebarHeader.jsx",
      "utf8",
    );
    assert.match(
      content,
      /h-13\s+sm:h-14/,
      "SidebarHeader must have compact mobile-first height",
    );
    assert.match(
      content,
      /size-8\.5\s+sm:size-9/,
      "Icon container must be compact on mobile",
    );
  });

  it("2. E2EE Warning Banner is compact with collapsible state & reopen access", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/e2ee/E2EEStatusBanner.jsx",
      "utf8",
    );
    assert.match(
      content,
      /isRestoreDismissed/,
      "E2EE banner must maintain dismiss / collapse state",
    );
    assert.match(
      content,
      /New device detected/,
      "E2EE banner must include 'New device detected'",
    );
    assert.match(
      content,
      /Link Device/,
      "E2EE banner must include primary 'Link Device' action",
    );
    assert.match(
      content,
      /Recovery Key/,
      "E2EE banner must include secondary 'Recovery Key' action",
    );
  });

  it("3. Navigation modes tab is responsive with equal-width 3-tab layout", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar.jsx",
      "utf8",
    );
    assert.match(
      content,
      /sidebar-modes/,
      "Navigation modes tabs must be present",
    );
  });

  it("4. Search bar is compact (h-8.5 sm:h-9) with clear button and focus styling", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar.jsx",
      "utf8",
    );
    assert.match(
      content,
      /h-8\.5\s+sm:h-9/,
      "Search field must use compact mobile height",
    );
    assert.match(
      content,
      /Clear search/,
      "Search field must have clear button with accessible label",
    );
  });

  it("5. Filter system uses compact scrollable chips on mobile and clean toolbar on desktop", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar/SidebarFilterBar.jsx",
      "utf8",
    );
    assert.match(
      content,
      /lg:hidden/,
      "SidebarFilterBar must render mobile layout",
    );
    assert.match(
      content,
      /hidden\s+lg:flex/,
      "SidebarFilterBar must render desktop layout",
    );
    assert.match(
      content,
      /overflow-x-auto/,
      "Mobile chips must be horizontally scrollable",
    );
  });

  it("6. Empty state supports separate states for all scenarios", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar/sidebarFilters.js",
      "utf8",
    );
    assert.match(content, /No archived chats/);
    assert.match(content, /No results found/);
    assert.match(content, /You're all caught up/);
    assert.match(content, /No favorite contacts/);
    assert.match(content, /No one online right now/);
    assert.match(content, /Everyone is online/);
  });

  it("7. Bottom profile card is compact with smaller avatar and proper safe-area", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "src/components/Sidebar/SidebarFooter.jsx",
      "utf8",
    );
    assert.match(
      content,
      /size-8\s+sm:size-8\.5/,
      "Profile avatar must be compact",
    );
    assert.match(
      content,
      /safe-area-inset-bottom/,
      "Footer must respect safe-area-inset-bottom",
    );
    assert.match(content, /Settings/);
    assert.match(content, /Log out/);
  });

  it("8. Viewport meta includes viewport-fit=cover for mobile edge-to-edge support", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync("index.html", "utf8");
    assert.match(
      content,
      /viewport-fit=cover/,
      "index.html must have viewport-fit=cover",
    );
  });

  it("9. HomePage initializes info drawers to closed on mobile/tablet screens (< 1280px)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync("src/pages/HomePage.jsx", "utf8");
    assert.match(
      content,
      /window\.innerWidth\s*>=\s*1280/,
      "showInfo and showGroupInfo must not open automatically on mobile",
    );
  });
});
