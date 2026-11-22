import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useSlidingSidebarStore } from "../store/useSlidingSidebarStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/Chat/ChatContainer";
import GroupChatContainer from "../components/group/GroupChatContainer";
import NoChatSelected from "../components/Chat/NoChatSelected";
import UserInfoPanel from "../components/Chat/UserInfoPanel";
import GroupInfoPanel from "../components/group/GroupInfoPanel";
import GroupInfoModal from "../components/modal/GroupInfoModel";
import E2EEStatusBanner from "../components/e2ee/E2EEStatusBanner";
import { ChatLayout } from "../components/chat-ui";

const isDesktopViewport = () =>
  typeof window !== "undefined" ? window.innerWidth >= 1280 : false;

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  const directActiveThread = useChatStore((s) => s.activeThread);
  const groupActiveThread = useGroupStore((s) => s.activeThread);
  const hasActiveThread = Boolean(
    selectedGroup ? groupActiveThread : directActiveThread,
  );

  // Desktop defaults: both sidebars and contact info open by default on desktop
  const [showInfo, setShowInfo] = useState(() => isDesktopViewport());
  const [showGroupInfo, setShowGroupInfo] = useState(() => isDesktopViewport());
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Active chat key to detect conversation switches
  const currentChatKey = selectedGroup
    ? `group_${selectedGroup.id || selectedGroup._id}`
    : selectedUser
      ? `user_${selectedUser.id || selectedUser._id}`
      : null;

  // Track if user explicitly closed the info panel for the current active conversation
  const manualCloseRef = useRef(false);
  const prevChatKeyRef = useRef(currentChatKey);

  // Ensure Main Navigation Sidebar is expanded by default on desktop
  useEffect(() => {
    if (isDesktopViewport()) {
      useSlidingSidebarStore.getState().setCollapsed(false);
    }
  }, []);

  // When switching between conversations or between Normal and Group chat:
  // Reset manual close state and open the appropriate info panel by default on desktop!
  useEffect(() => {
    if (currentChatKey && currentChatKey !== prevChatKeyRef.current) {
      prevChatKeyRef.current = currentChatKey;
      manualCloseRef.current = false;
      const desktop = isDesktopViewport();
      if (selectedGroup) {
        setShowGroupInfo(desktop);
        setShowInfo(false);
      } else if (selectedUser) {
        setShowInfo(desktop);
        setShowGroupInfo(false);
      }
    } else if (!currentChatKey) {
      prevChatKeyRef.current = null;
    }
  }, [currentChatKey, selectedGroup, selectedUser]);

  // Track thread transitions:
  const prevHasActiveThreadRef = useRef(hasActiveThread);

  useEffect(() => {
    // When a thread opens, automatically close the info panel so the thread panel displays cleanly
    if (hasActiveThread && !prevHasActiveThreadRef.current) {
      setShowInfo(false);
      setShowGroupInfo(false);
    }
    // When a thread closes, return to contact info if not manually closed by user on desktop
    else if (!hasActiveThread && prevHasActiveThreadRef.current) {
      if (!manualCloseRef.current && isDesktopViewport()) {
        if (selectedGroup) {
          setShowGroupInfo(true);
        } else if (selectedUser) {
          setShowInfo(true);
        }
      }
    }
    prevHasActiveThreadRef.current = hasActiveThread;
  }, [hasActiveThread, selectedGroup, selectedUser]);

  // Explicit user toggle handlers
  const handleToggleInfo = useCallback(() => {
    // If a thread was active, closing the thread returns to info
    if (hasActiveThread) {
      useChatStore.getState().closeThread();
      manualCloseRef.current = false;
      setShowInfo(true);
      return;
    }

    setShowInfo((prev) => {
      const next = !prev;
      manualCloseRef.current = !next;
      return next;
    });
  }, [hasActiveThread]);

  const handleToggleGroupInfo = useCallback(() => {
    // If a group thread was active, closing the thread returns to group info
    if (hasActiveThread) {
      useGroupStore.getState().closeThread();
      manualCloseRef.current = false;
      setShowGroupInfo(true);
      return;
    }

    setShowGroupInfo((prev) => {
      const next = !prev;
      manualCloseRef.current = !next;
      return next;
    });
  }, [hasActiveThread]);

  let content;
  if (selectedGroup) {
    content = (
      <GroupChatContainer
        isInfoOpen={showGroupInfo}
        onToggleInfo={handleToggleGroupInfo}
        onManage={() => setShowGroupModal(true)}
      />
    );
  } else if (selectedUser) {
    content = (
      <ChatContainer
        isInfoOpen={showInfo}
        onToggleInfo={handleToggleInfo}
      />
    );
  } else {
    content = <NoChatSelected />;
  }

  return (
    <ChatLayout
      banner={<E2EEStatusBanner />}
      sidebar={<Sidebar />}
      content={content}
      infoPanel={
        <>
          {selectedUser && !selectedGroup && (
            <UserInfoPanel
              open={showInfo}
              onToggle={handleToggleInfo}
            />
          )}

          {selectedGroup && (
            <GroupInfoPanel
              open={showGroupInfo}
              onToggle={handleToggleGroupInfo}
              onManage={() => setShowGroupModal(true)}
            />
          )}
        </>
      }
      modal={
        <GroupInfoModal
          open={showGroupModal}
          onClose={() => setShowGroupModal(false)}
        />
      }
    />
  );
};

export default HomePage;
