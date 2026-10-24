import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/Chat/ChatContainer";
import GroupChatContainer from "../components/group/GroupChatContainer";
import NoChatSelected from "../components/Chat/NoChatSelected";
import UserInfoPanel from "../components/Chat/UserInfoPanel";
import GroupInfoPanel from "../components/group/GroupInfoPanel";
import GroupInfoModal from "../components/modal/GroupInfoModel";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  const [showInfo, setShowInfo] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  let content;
  if (selectedGroup)
    content = (
      <GroupChatContainer onToggleInfo={() => setShowGroupInfo((v) => !v)} />
    );
  else if (selectedUser) content = <ChatContainer />;
  else content = <NoChatSelected />;

  return (
    <div className="h-screen bg-base-200 flex items-center justify-center p-2 sm:p-4">
      <div className="container mx-auto h-full max-h-[900px]">
        <div className="bg-base-100 rounded-2xl shadow-xl border border-base-300 w-full h-full">
          <div className="flex h-full rounded-2xl overflow-hidden">
            <Sidebar />
            {content}

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
          </div>
        </div>
      </div>

      <GroupInfoModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />
    </div>
  );
};

export default HomePage;
