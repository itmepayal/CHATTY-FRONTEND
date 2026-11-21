import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { customToast as toast } from "../components/toast/customToastService.js";

export const useStoryStore = create((set, get) => ({
  feed: [],
  myStories: [],
  myStoriesLoading: false,
  isMyStoriesOpen: false,
  activeUserIndex: 0,
  activeStoryIndex: 0,
  isViewerOpen: false,
  isCreatorOpen: false,
  isViewersModalOpen: false,
  storyForViewers: null,
  viewersList: [],
  viewersLoading: false,
  viewersPage: 1,
  hasMoreViewers: false,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  isPaused: false,

  setCreatorOpen: (open) => set({ isCreatorOpen: open }),
  setMyStoriesOpen: (open) => {
    set({ isMyStoriesOpen: open });
    if (open) get().fetchMyStories();
  },
  setViewersModalOpen: (open) => set({ isViewersModalOpen: open }),
  setPaused: (paused) => set({ isPaused: paused }),

  // Fetch the active stories feed
  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/stories/feed");
      if (res.data?.data) {
        set({ feed: res.data.data });
      }
    } catch (err) {
      console.error("[storyStore] fetchFeed error:", err?.response?.data || err);
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch the current user's active stories with remaining lifetime
  fetchMyStories: async () => {
    set({ myStoriesLoading: true });
    try {
      const res = await axiosInstance.get("/stories/my");
      if (res.data?.data) {
        set({ myStories: res.data.data });
      }
    } catch (err) {
      console.error("[storyStore] fetchMyStories error:", err?.response?.data || err);
    } finally {
      set({ myStoriesLoading: false });
    }
  },

  // Open the full-screen story viewer
  openViewer: (userIndex = 0, storyIndex = 0) => {
    const { feed } = get();
    if (!feed || !feed[userIndex]) return;

    // If opening a contact's story, start at the first unviewed story if not specified
    let targetStoryIndex = storyIndex;
    const targetGroup = feed[userIndex];
    if (storyIndex === 0 && targetGroup.stories?.length > 1) {
      const firstUnviewed = targetGroup.stories.findIndex((s) => !s.hasViewed);
      if (firstUnviewed > 0) {
        targetStoryIndex = firstUnviewed;
      }
    }

    set({
      activeUserIndex: userIndex,
      activeStoryIndex: targetStoryIndex,
      isViewerOpen: true,
      isPaused: false,
    });

    // Automatically record view for the currently displayed story
    const currentStory = targetGroup.stories?.[targetStoryIndex];
    if (currentStory && !currentStory.hasViewed && !targetGroup.isSelf) {
      get().recordView(currentStory._id);
    }
  },

  // Open viewer directly for a specific story of the logged-in user
  openMyStoryViewer: (storyId) => {
    const { feed } = get();
    const myIndex = feed.findIndex((g) => g.isSelf);
    if (myIndex >= 0) {
      const storyIdx = feed[myIndex].stories.findIndex((s) => s._id === storyId);
      get().openViewer(myIndex, Math.max(0, storyIdx));
    }
  },

  closeViewer: () => {
    set({
      isViewerOpen: false,
      isPaused: false,
      isViewersModalOpen: false,
      storyForViewers: null,
    });
  },

  // Advance to next story / next user
  nextStory: () => {
    const { feed, activeUserIndex, activeStoryIndex } = get();
    const currentUserGroup = feed[activeUserIndex];
    if (!currentUserGroup) return;

    if (activeStoryIndex < currentUserGroup.stories.length - 1) {
      const nextStoryIdx = activeStoryIndex + 1;
      set({ activeStoryIndex: nextStoryIdx, isPaused: false });
      const nextStory = currentUserGroup.stories[nextStoryIdx];
      if (nextStory && !nextStory.hasViewed && !currentUserGroup.isSelf) {
        get().recordView(nextStory._id);
      }
    } else if (activeUserIndex < feed.length - 1) {
      // Move to next user's first story
      const nextUserIdx = activeUserIndex + 1;
      set({
        activeUserIndex: nextUserIdx,
        activeStoryIndex: 0,
        isPaused: false,
      });
      const nextGroup = feed[nextUserIdx];
      const firstStory = nextGroup.stories?.[0];
      if (firstStory && !firstStory.hasViewed && !nextGroup.isSelf) {
        get().recordView(firstStory._id);
      }
    } else {
      // Reached the end of all stories in feed
      get().closeViewer();
    }
  },

  // Go to previous story / previous user
  prevStory: () => {
    const { feed, activeUserIndex, activeStoryIndex } = get();
    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1, isPaused: false });
    } else if (activeUserIndex > 0) {
      const prevUserIdx = activeUserIndex - 1;
      const prevGroup = feed[prevUserIdx];
      const lastStoryIdx = (prevGroup.stories?.length || 1) - 1;
      set({
        activeUserIndex: prevUserIdx,
        activeStoryIndex: lastStoryIdx,
        isPaused: false,
      });
    }
  },

  // Record a view
  recordView: async (storyId) => {
    if (!storyId) return;
    try {
      await axiosInstance.post(`/stories/${storyId}/view`);
      // Update local state to marked as viewed
      set((state) => {
        const newFeed = state.feed.map((group) => {
          let hasUnseen = false;
          const updatedStories = group.stories.map((s) => {
            if (s._id === storyId) {
              return { ...s, hasViewed: true, viewCount: (s.viewCount || 0) + 1 };
            }
            if (!s.hasViewed && !group.isSelf) hasUnseen = true;
            return s;
          });
          return { ...group, stories: updatedStories, hasUnseen };
        });
        return { feed: newFeed };
      });
    } catch (_err) {
      // Fail silently for view tracking
    }
  },

  // React to a story
  reactToStory: async (storyId, emoji) => {
    if (!storyId || !emoji) return;
    try {
      await axiosInstance.post(`/stories/${storyId}/react`, { emoji });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send reaction.");
    }
  },

  // Reply to a story
  replyToStory: async (storyId, text) => {
    if (!storyId || !text?.trim()) return;
    try {
      await axiosInstance.post(`/stories/${storyId}/reply`, { text: text.trim() });
      toast.success("Reply sent to direct chat!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send reply.");
    }
  },

  // Create a new story
  createStory: async (formData) => {
    set({ isUploading: true, uploadProgress: 10 });
    try {
      const res = await axiosInstance.post("/stories", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 90) / progressEvent.total);
            set({ uploadProgress: Math.min(95, Math.max(10, percent)) });
          }
        },
      });
      if (res.data?.data) {
        set({ uploadProgress: 100 });
        toast.success("Story posted successfully!");
        set({ isCreatorOpen: false, uploadProgress: 0 });
        await Promise.all([get().fetchFeed(), get().fetchMyStories()]);
        return res.data.data;
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to publish story.";
      toast.error(msg);
      throw err;
    } finally {
      set({ isUploading: false, uploadProgress: 0 });
    }
  },

  // Delete a story
  deleteStory: async (storyId) => {
    if (!storyId) return;
    try {
      await axiosInstance.delete(`/stories/${storyId}`);
      toast.success("Story deleted.");
      // Refresh both feed and my stories
      await Promise.all([get().fetchFeed(), get().fetchMyStories()]);
      // Check if current viewer is open
      const { isViewerOpen, feed, activeUserIndex } = get();
      if (isViewerOpen) {
        const group = feed[activeUserIndex];
        if (!group || !group.stories || group.stories.length === 0) {
          get().closeViewer();
        } else {
          set({ activeStoryIndex: 0 });
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete story.");
    }
  },

  // Fetch viewers for a story (owner only)
  fetchStoryViewers: async (story, page = 1) => {
    if (!story || !story._id) return;
    set({
      storyForViewers: story,
      isViewersModalOpen: true,
      viewersLoading: true,
      viewersPage: page,
      ...(page === 1 ? { viewersList: [] } : {}),
    });
    try {
      const res = await axiosInstance.get(`/stories/${story._id}/viewers?page=${page}&limit=50`);
      if (res.data?.data) {
        const newViewers = res.data.data.viewers || [];
        set((state) => ({
          viewersList: page === 1 ? newViewers : [...state.viewersList, ...newViewers],
          hasMoreViewers: Boolean(res.data.data.hasMore),
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load viewers.");
    } finally {
      set({ viewersLoading: false });
    }
  },

  loadMoreViewers: async () => {
    const { storyForViewers, viewersPage, viewersLoading, hasMoreViewers } = get();
    if (!storyForViewers || viewersLoading || !hasMoreViewers) return;
    await get().fetchStoryViewers(storyForViewers, viewersPage + 1);
  },

  // Real-time socket event subscription
  subscribeToSocketEvents: (socket) => {
    if (!socket) return;

    const handleNewStory = (_story) => {
      get().fetchFeed();
      get().fetchMyStories();
    };

    const handleStoryDeleted = ({ storyId }) => {
      set((state) => {
        const newFeed = state.feed
          .map((group) => ({
            ...group,
            stories: group.stories.filter((s) => s._id !== storyId),
          }))
          .filter((group) => group.stories.length > 0);
        const newMyStories = state.myStories.filter((s) => s._id !== storyId);
        return { feed: newFeed, myStories: newMyStories };
      });
    };

    const handleStoryViewed = ({ storyId, viewer, viewedAt, viewCount }) => {
      set((state) => {
        // Update myStories counts in real-time
        const updatedMyStories = state.myStories.map((s) =>
          s._id === storyId ? { ...s, viewCount: viewCount || s.viewCount + 1 } : s
        );

        // If viewers modal is currently open for this story, append viewer
        if (state.storyForViewers?._id === storyId && viewer) {
          const alreadyInList = state.viewersList.some(
            (v) => v.user?._id === viewer._id
          );
          if (!alreadyInList) {
            return {
              myStories: updatedMyStories,
              viewersList: [{ user: viewer, viewedAt, reaction: null }, ...state.viewersList],
            };
          }
        }
        return { myStories: updatedMyStories };
      });
    };

    const handleStoryReaction = ({ storyId, viewer, emoji, reactedAt }) => {
      set((state) => {
        // Update reaction breakdown in myStories
        const updatedMyStories = state.myStories.map((s) => {
          if (s._id === storyId) {
            const counts = { ...(s.reactionCounts || {}) };
            counts[emoji] = (counts[emoji] || 0) + 1;
            return { ...s, reactionCounts: counts };
          }
          return s;
        });

        // Update viewers modal list if open
        if (state.storyForViewers?._id === storyId && viewer) {
          const updated = state.viewersList.map((v) => {
            if (v.user?._id === viewer._id) {
              return { ...v, reaction: emoji, reactedAt };
            }
            return v;
          });
          return { myStories: updatedMyStories, viewersList: updated };
        }
        return { myStories: updatedMyStories };
      });
    };

    socket.on("story:new", handleNewStory);
    socket.on("story:deleted", handleStoryDeleted);
    socket.on("story:viewed", handleStoryViewed);
    socket.on("story:reaction", handleStoryReaction);

    return () => {
      socket.off("story:new", handleNewStory);
      socket.off("story:deleted", handleStoryDeleted);
      socket.off("story:viewed", handleStoryViewed);
      socket.off("story:reaction", handleStoryReaction);
    };
  },
}));
