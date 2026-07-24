import { useChatStore } from "../store/useChatStore";
import { Users, UsersIcon, Archive, Star, PhoneCall } from "lucide-react";
import StoryFeed from "./StoryFeed";

const TopNavigation = () => {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="w-full border-b border-base-300 bg-base-100/50 backdrop-blur-md flex items-center shadow-sm">
      <div className="flex w-full overflow-x-auto hide-scrollbar">
        {/* Navigation Tabs */}
        <div className="flex flex-shrink-0 items-center gap-1.5 p-2 border-r border-base-300/50 my-2 mx-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-300 ${activeTab === 'users' ? 'bg-primary text-primary-content shadow-md font-bold' : 'text-base-content/60 hover:text-base-content hover:bg-base-200 font-medium'}`}
            title="Contacts"
          >
            <Users className="size-4" />
            <span className="text-sm whitespace-nowrap">Contacts</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-300 ${activeTab === 'groups' ? 'bg-secondary text-secondary-content shadow-md font-bold' : 'text-base-content/60 hover:text-base-content hover:bg-base-200 font-medium'}`}
            title="Groups"
          >
            <UsersIcon className="size-4" />
            <span className="text-sm whitespace-nowrap">Groups</span>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-300 ${activeTab === 'archived' ? 'bg-warning text-warning-content shadow-md font-bold' : 'text-base-content/60 hover:text-base-content hover:bg-base-200 font-medium'}`}
            title="Archived"
          >
            <Archive className="size-4" />
            <span className="text-sm whitespace-nowrap">Archived</span>
          </button>
          <button
            onClick={() => setActiveTab("starred")}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-300 ${activeTab === 'starred' ? 'bg-warning text-warning-content shadow-md font-bold' : 'text-base-content/60 hover:text-base-content hover:bg-base-200 font-medium'}`}
            title="Starred"
          >
            <Star className="size-4" />
            <span className="text-sm whitespace-nowrap">Starred</span>
          </button>
          <button
            onClick={() => setActiveTab("calls")}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-all duration-300 ${activeTab === 'calls' ? 'bg-success text-success-content shadow-md font-bold' : 'text-base-content/60 hover:text-base-content hover:bg-base-200 font-medium'}`}
            title="Calls"
          >
            <PhoneCall className="size-4" />
            <span className="text-sm whitespace-nowrap">Calls</span>
          </button>
        </div>

        {/* Story Feed */}
        <div className="flex-1 min-w-0 flex items-center">
          <StoryFeed />
        </div>
      </div>
    </div>
  );
};

export default TopNavigation;
