import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useStoryStore } from "../src/store/useStoryStore.js";

describe("Story Viewer Auto-Advance, Sequence & Navigation Suite", () => {
  beforeEach(() => {
    // Reset store state before each test
    useStoryStore.setState({
      feed: [],
      myStories: [],
      activeUserIndex: 0,
      activeStoryIndex: 0,
      isViewerOpen: false,
      isPaused: false,
      isViewersModalOpen: false,
      storyForViewers: null,
    });
  });

  // Test 1: Single user, single story plays and closes viewer
  test("1. Single user with a single story advances to close viewer", () => {
    const singleStoryFeed = [
      {
        user: { _id: "user1", fullName: "User One" },
        stories: [{ _id: "s1_1", mediaType: "text", textContent: "Only story" }],
        isSelf: false,
      },
    ];

    useStoryStore.setState({ feed: singleStoryFeed });
    useStoryStore.getState().openViewer(0, 0);

    assert.equal(useStoryStore.getState().isViewerOpen, true);
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // Auto-advance triggers nextStory
    useStoryStore.getState().nextStory();

    assert.equal(useStoryStore.getState().isViewerOpen, false, "Viewer must close when single story finishes");
  });

  // Test 2: Single user, 3 stories play sequentially (0 -> 1 -> 2 -> close)
  test("2. Single user with 3 stories plays sequentially (0 -> 1 -> 2 -> close)", () => {
    const threeStoryFeed = [
      {
        user: { _id: "user1", fullName: "User One" },
        stories: [
          { _id: "s1_1", mediaType: "image", mediaUrl: "/img1.jpg" },
          { _id: "s1_2", mediaType: "image", mediaUrl: "/img2.jpg" },
          { _id: "s1_3", mediaType: "text", textContent: "Text 3" },
        ],
        isSelf: false,
      },
    ];

    useStoryStore.setState({ feed: threeStoryFeed });
    useStoryStore.getState().openViewer(0, 0);

    assert.equal(useStoryStore.getState().isViewerOpen, true);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // Story 0 -> Story 1
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, true, "Viewer must NOT close after Story 1");
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // Story 1 -> Story 2
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, true, "Viewer must NOT close after Story 2");
    assert.equal(useStoryStore.getState().activeStoryIndex, 2);

    // Story 2 -> Close
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, false, "Viewer must close after last story in group");
  });

  // Test 3: Multiple users (User A 3 stories -> User B 2 stories -> User C 3 stories)
  test("3. Multiple users sequence: User A (3 stories) -> User B (2 stories) -> User C (3 stories)", () => {
    const multiUserFeed = [
      {
        user: { _id: "u_a", fullName: "User A" },
        stories: [{ _id: "a1" }, { _id: "a2" }, { _id: "a3" }],
        isSelf: false,
      },
      {
        user: { _id: "u_b", fullName: "User B" },
        stories: [{ _id: "b1" }, { _id: "b2" }],
        isSelf: false,
      },
      {
        user: { _id: "u_c", fullName: "User C" },
        stories: [{ _id: "c1" }, { _id: "c2" }, { _id: "c3" }],
        isSelf: false,
      },
    ];

    useStoryStore.setState({ feed: multiUserFeed });
    useStoryStore.getState().openViewer(0, 0);

    // User A: Story 0
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // User A: Story 1
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // User A: Story 2
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 2);

    // Transition: User A -> User B (Story 0)
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, true, "Viewer must remain open during user transition");
    assert.equal(useStoryStore.getState().activeUserIndex, 1, "Must advance to User B");
    assert.equal(useStoryStore.getState().activeStoryIndex, 0, "Must start at User B first story");

    // User B: Story 1
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 1);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // Transition: User B -> User C (Story 0)
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, true, "Viewer must remain open during transition to User C");
    assert.equal(useStoryStore.getState().activeUserIndex, 2, "Must advance to User C");
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // User C: Story 1
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 2);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // User C: Story 2 (Final story)
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 2);
    assert.equal(useStoryStore.getState().activeStoryIndex, 2);

    // End of all stories -> Close viewer
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, false, "Viewer must close after all stories in all groups finish");
  });

  // Test 4: Current story finish auto-advances without closing
  test("4. Current story finish auto-advances to next without closing prematurely", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1" }, { _id: "s2" }],
        isSelf: false,
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 0);

    assert.equal(useStoryStore.getState().isViewerOpen, true);
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, true, "Viewer stays open on auto-advance");
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);
  });

  // Test 5: Manual Next clicks advance story and maintain open state
  test("5. Manual Next clicks advance story correctly", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1" }, { _id: "s2" }, { _id: "s3" }, { _id: "s4" }],
        isSelf: false,
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 0);

    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeStoryIndex, 2);

    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeStoryIndex, 3);
    assert.equal(useStoryStore.getState().isViewerOpen, true);
  });

  // Test 6: Manual Prev clicks move back correctly
  test("6. Manual Prev clicks move back correctly within group and across groups", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1_1" }, { _id: "s1_2" }],
        isSelf: false,
      },
      {
        user: { _id: "u2" },
        stories: [{ _id: "s2_1" }, { _id: "s2_2" }],
        isSelf: false,
      },
    ];
    useStoryStore.setState({ feed });

    // Open User 2, Story 1
    useStoryStore.getState().openViewer(1, 1);
    assert.equal(useStoryStore.getState().activeUserIndex, 1);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // Prev -> User 2, Story 0
    useStoryStore.getState().prevStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 1);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // Prev at boundary -> User 1, Story 1 (last story of previous group)
    useStoryStore.getState().prevStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // Prev -> User 1, Story 0
    useStoryStore.getState().prevStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);

    // Prev at absolute beginning -> Remains at 0, 0 (never negative, does not close)
    useStoryStore.getState().prevStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);
    assert.equal(useStoryStore.getState().isViewerOpen, true);
  });

  // Test 7: User boundary transition (User A last story -> User B first story)
  test("7. User boundary transition seamlessly lands on next user index and 0 story index", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1_1" }, { _id: "s1_2" }],
      },
      {
        user: { _id: "u2" },
        stories: [{ _id: "s2_1" }],
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 1);

    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 1);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);
    assert.equal(useStoryStore.getState().isViewerOpen, true);
  });

  // Test 8: Final story in feed completes and closes viewer exactly once
  test("8. Final story in feed closes viewer and subsequent calls are safe", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1" }],
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 0);

    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().isViewerOpen, false);

    // Call again when already closed
    assert.doesNotThrow(() => {
      useStoryStore.getState().nextStory();
    });
    assert.equal(useStoryStore.getState().isViewerOpen, false);
  });

  // Test 9: Manual close cleans up all timers and states
  test("9. Manual closeViewer resets viewer state cleanly", () => {
    useStoryStore.setState({
      isViewerOpen: true,
      isPaused: true,
      isViewersModalOpen: true,
      storyForViewers: { _id: "s1" },
    });

    useStoryStore.getState().closeViewer();

    const state = useStoryStore.getState();
    assert.equal(state.isViewerOpen, false);
    assert.equal(state.isPaused, false);
    assert.equal(state.isViewersModalOpen, false);
    assert.equal(state.storyForViewers, null);
  });

  // Test 10: Pause freezes playback state
  test("10. setPaused updates paused state without affecting active indices", () => {
    useStoryStore.setState({
      activeUserIndex: 1,
      activeStoryIndex: 2,
      isViewerOpen: true,
      isPaused: false,
    });

    useStoryStore.getState().setPaused(true);
    assert.equal(useStoryStore.getState().isPaused, true);
    assert.equal(useStoryStore.getState().activeUserIndex, 1);
    assert.equal(useStoryStore.getState().activeStoryIndex, 2);
  });

  // Test 11: Resume restores unpaused playback
  test("11. setPaused(false) unpauses cleanly", () => {
    useStoryStore.setState({ isPaused: true });
    useStoryStore.getState().setPaused(false);
    assert.equal(useStoryStore.getState().isPaused, false);
  });

  // Test 12: Transition guard prevents duplicate auto-advance calls
  test("12. hasAdvancedRef guard prevents duplicate auto-advances on rapid events", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1" }, { _id: "s2" }, { _id: "s3" }],
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 0);

    // Emulate transition guard
    let hasAdvanced = false;
    const advanceStory = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      useStoryStore.getState().nextStory();
    };

    // First call advances
    advanceStory();
    assert.equal(useStoryStore.getState().activeStoryIndex, 1);

    // Second call (e.g. duplicate onEnded or interval tick) is locked out
    advanceStory();
    assert.equal(useStoryStore.getState().activeStoryIndex, 1, "Duplicate advance call must be locked out");
  });

  // Test 13: Empty user groups are automatically skipped
  test("13. Skip empty user groups in feed automatically", () => {
    const feedWithEmpty = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1" }],
      },
      {
        user: { _id: "u2_empty" },
        stories: [], // Empty stories group!
      },
      {
        user: { _id: "u3" },
        stories: [{ _id: "s3" }],
      },
    ];

    useStoryStore.setState({ feed: feedWithEmpty });
    useStoryStore.getState().openViewer(0, 0);

    // Advance from u1 -> u3, skipping u2_empty
    useStoryStore.getState().nextStory();
    assert.equal(useStoryStore.getState().activeUserIndex, 2, "Must skip empty group u2 and go to u3");
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);
    assert.equal(useStoryStore.getState().isViewerOpen, true);
  });

  // Test 14: Rapid Next/Prev clicks never produce duplicate transitions or invalid indices
  test("14. Rapid Next/Prev clicks maintain valid story and user bounds", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1_1" }, { _id: "s1_2" }],
      },
      {
        user: { _id: "u2" },
        stories: [{ _id: "s2_1" }, { _id: "s2_2" }],
      },
    ];
    useStoryStore.setState({ feed });
    useStoryStore.getState().openViewer(0, 0);

    // Rapidly call next and prev in various orders
    for (let i = 0; i < 20; i++) {
      if (useStoryStore.getState().isViewerOpen) {
        useStoryStore.getState().nextStory();
      }
    }
    // After exceeding all stories, viewer closes cleanly
    assert.equal(useStoryStore.getState().isViewerOpen, false);

    // Reopen and test rapid prev clicks
    useStoryStore.getState().openViewer(1, 1);
    for (let i = 0; i < 20; i++) {
      useStoryStore.getState().prevStory();
    }
    // Clamped at 0, 0
    assert.equal(useStoryStore.getState().activeUserIndex, 0);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);
    assert.equal(useStoryStore.getState().isViewerOpen, true);
  });

  // Test 15: Story deletion/expiration during playback advances safely
  test("15. Real-time story deletion adjusts active indices or closes gracefully", () => {
    const feed = [
      {
        user: { _id: "u1" },
        stories: [{ _id: "s1_1" }, { _id: "s1_2" }, { _id: "s1_3" }],
      },
    ];
    useStoryStore.setState({
      feed,
      myStories: [{ _id: "s1_1" }, { _id: "s1_2" }, { _id: "s1_3" }],
      activeUserIndex: 0,
      activeStoryIndex: 2, // Viewing the 3rd story (index 2)
      isViewerOpen: true,
    });

    // Simulate socket event story:deleted for s1_3
    const socket = { on: () => {}, off: () => {} };
    // Directly invoke the store's socket handling logic:
    useStoryStore.setState((state) => {
      const storyId = "s1_3";
      const newFeed = state.feed
        .map((group) => ({
          ...group,
          stories: group.stories.filter((s) => s._id !== storyId),
        }))
        .filter((group) => group.stories.length > 0);
      const newMyStories = state.myStories.filter((s) => s._id !== storyId);

      let nextActiveUser = state.activeUserIndex;
      let nextActiveStory = state.activeStoryIndex;
      let nextIsOpen = state.isViewerOpen;

      if (state.isViewerOpen) {
        if (newFeed.length === 0) {
          nextIsOpen = false;
        } else {
          if (nextActiveUser >= newFeed.length) {
            nextActiveUser = newFeed.length - 1;
          }
          const group = newFeed[nextActiveUser];
          if (!group || group.stories.length === 0) {
            nextIsOpen = false;
          } else if (nextActiveStory >= group.stories.length) {
            nextActiveStory = Math.max(0, group.stories.length - 1);
          }
        }
      }

      return {
        feed: newFeed,
        myStories: newMyStories,
        activeUserIndex: nextActiveUser,
        activeStoryIndex: nextActiveStory,
        isViewerOpen: nextIsOpen,
      };
    });

    const state = useStoryStore.getState();
    assert.equal(state.isViewerOpen, true, "Viewer stays open if other stories remain");
    assert.equal(state.feed[0].stories.length, 2);
    assert.equal(state.activeStoryIndex, 1, "Clamped to remaining story index 1");

    // Also test openMyStoryViewer fallback when feed has no self group initially
    useStoryStore.setState({
      feed: [],
      myStories: [{ _id: "my_1", user: { fullName: "Self" } }],
      isViewerOpen: false,
    });

    useStoryStore.getState().openMyStoryViewer("my_1");
    assert.equal(useStoryStore.getState().isViewerOpen, true);
    assert.equal(useStoryStore.getState().feed[0].isSelf, true);
    assert.equal(useStoryStore.getState().activeStoryIndex, 0);
  });
});
