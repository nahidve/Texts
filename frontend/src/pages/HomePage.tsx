import { useChatStore } from "../store/useChatStore";

import TopNavigation from "../components/TopNavigation";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();
  const isChatSelected = !!selectedUser || !!selectedGroup;

  return (
    <div className="h-screen bg-base-100 overflow-hidden pt-16 flex flex-col">
      <TopNavigation />
      <div className="flex flex-1 w-full relative overflow-hidden">
        <div className={`${isChatSelected ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full shrink-0`}>
          <Sidebar />
        </div>
        
        <div className={`${!isChatSelected ? 'hidden md:flex' : 'flex'} flex-1 h-full min-w-0`}>
          {!isChatSelected ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
    </div>
  );
};
export default HomePage;