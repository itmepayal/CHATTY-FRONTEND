import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/Chat/ChatContainer";
import GroupChatContainer from "../components/group/GroupChatContainer";
import NoChatSelected from "../components/Chat/NoChatSelected";
import UserInfoPanel from "../components/Chat/UserInfoPanel";
import GroupInfoPanel from "../components/group/GroupInfoPanel";
import GroupInfoModal from "../components/modal/GroupInfoModel";
import E2EEStatusBanner from "../components/e2ee/E2EEStatusBanner";
import { ChatLayout } from "../components/chat-ui";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  const directActiveThread = useChatStore((s) => s.activeThread);
  const groupActiveThread = useGroupStore((s) => s.activeThread);
  const hasActiveThread = Boolean(
    selectedGroup ? groupActiveThread : directActiveThread,
  );

  const [showInfo, setShowInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // When a thread opens, automatically close the info panel so the thread panel displays cleanly
  useEffect(() => {
    if (hasActiveThread) {
      setShowInfo(false);
      setShowGroupInfo(false);
    }
  }, [hasActiveThread]);

  let content;
  if (selectedGroup) {
    content = (
      <GroupChatContainer
        isInfoOpen={showGroupInfo}
        onToggleInfo={() => setShowGroupInfo((v) => !v)}
        onManage={() => setShowGroupModal(true)}
      />
    );
  } else if (selectedUser) {
    content = (
      <ChatContainer
        isInfoOpen={showInfo}
        onToggleInfo={() => setShowInfo((v) => !v)}
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
              onToggle={() => setShowInfo((v) => !v)}
            />
          )}

          {selectedGroup && (
            <GroupInfoPanel
              open={showGroupInfo}
              onToggle={() => setShowGroupInfo((v) => !v)}
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
