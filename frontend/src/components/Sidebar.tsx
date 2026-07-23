import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UsersIcon, PlusCircle, Search, PhoneCall } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import CallHistory from "./CallHistory";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "groups" | "calls">("users");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    if (showOnlineOnly) return onlineUsers.includes(user._id) && matchesSearch;
    return matchesSearch;
  });

  const filteredGroups = groups.filter((group) => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-80 flex flex-col transition-all duration-200 relative bg-gradient-to-br from-[#232526]/80 via-[#2c3e50]/80 to-[#485563]/90 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Neon vertical accent bar */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary via-accent to-secondary animate-neon-bar z-20" />
      {/* Glassy card effect */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="relative z-10 border-b border-base-300 w-full p-4 flex flex-col gap-2">
        <div className="flex bg-base-300/50 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'users' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
          >
            <Users className="size-5" />
            <span className="font-semibold hidden lg:block">Contacts</span>
          </button>
          <button 
            onClick={() => setActiveTab("groups")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'groups' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
          >
            <UsersIcon className="size-5" />
            <span className="font-semibold hidden lg:block">Groups</span>
          </button>
          <button 
            onClick={() => setActiveTab("calls")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${activeTab === 'calls' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
          >
            <PhoneCall className="size-5" />
            <span className="font-semibold hidden lg:block">Calls</span>
          </button>
        </div>
        
        {activeTab !== "calls" && (
          <div className="relative mt-1 hidden lg:block">
            <Search className="absolute left-2.5 top-2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder={activeTab === "users" ? "Search contacts..." : "Search groups..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm w-full pl-9 bg-base-300/50 border-none focus:outline-none focus:ring-1 focus:ring-primary rounded-lg text-white placeholder-zinc-400"
            />
          </div>
        )}

        {activeTab === 'users' ? (
          <div className="mt-3 flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-2 py-1 rounded-lg bg-base-200/40 hover:bg-base-200/70 transition-all">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-xs accent-primary"
              />
              <span className="text-xs text-white/80 font-medium">Show online only</span>
            </label>
            <span className="text-xs text-accent font-semibold animate-pulse">({onlineUsers.length - 1} online)</span>
          </div>
        ) : activeTab === 'groups' ? (
          <div className="mt-3 flex items-center justify-between">
             <button onClick={() => setIsCreateGroupOpen(true)} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-base-200/40 hover:bg-base-200/70 transition-all text-white/80 text-xs font-medium">
                <PlusCircle className="size-4" />
                <span className="hidden lg:block">Create Group</span>
             </button>
          </div>
        ) : null}
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto w-full py-4 px-2 space-y-2 custom-scrollbar">
        {activeTab === "calls" ? (
           <CallHistory />
        ) : activeTab === "users" ? (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`
                  w-full flex items-center gap-4 px-3 py-2 rounded-2xl transition-all duration-200
                  group relative shadow-sm
                  ${selectedUser?._id === user._id
                    ? "bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 ring-2 ring-primary/60 scale-[1.03] shadow-lg"
                    : "hover:bg-base-200/60 hover:scale-[1.01]"}
                `}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.name}
                    className={`size-12 object-cover rounded-full border-2 ${selectedUser?._id === user._id ? "border-primary shadow-primary/40" : "border-base-300"}`}
                  />
                  {onlineUsers.includes(user._id) && (
                    <span
                      className="absolute bottom-1 right-1 size-3 bg-gradient-to-br from-green-400 via-green-500 to-emerald-400 rounded-full ring-2 ring-zinc-900 animate-pulse-glow"
                    />
                  )}
                </div>
                {/* User info - only visible on larger screens */}
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-semibold truncate text-white/90 text-base drop-shadow">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-zinc-300 flex items-center gap-1">
                    {onlineUsers.includes(user._id) ? (
                      <span className="text-green-400 font-bold animate-pulse">● Online</span>
                    ) : (
                      <span className="text-zinc-500">Offline</span>
                    )}
                  </div>
                </div>
                {/* Animated highlight for selected user */}
                {selectedUser?._id === user._id && (
                  <span className="absolute -left-2 -top-2 w-4 h-4 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-60 animate-pulse" />
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-400 py-6 text-lg font-semibold animate-fade-in-up">No online users</div>
            )}
          </>
        ) : (
          <>
            {filteredGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`
                  w-full flex items-center gap-4 px-3 py-2 rounded-2xl transition-all duration-200
                  group relative shadow-sm
                  ${selectedGroup?._id === group._id
                    ? "bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 ring-2 ring-primary/60 scale-[1.03] shadow-lg"
                    : "hover:bg-base-200/60 hover:scale-[1.01]"}
                `}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={group.avatar || "/avatar.png"}
                    alt={group.name}
                    className={`size-12 object-cover rounded-full border-2 ${selectedGroup?._id === group._id ? "border-primary shadow-primary/40" : "border-base-300"}`}
                  />
                </div>
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-semibold truncate text-white/90 text-base drop-shadow">
                    {group.name}
                  </div>
                  <div className="text-xs text-zinc-300 flex items-center gap-1 truncate">
                    {group.members.length} members
                  </div>
                </div>
                {selectedGroup?._id === group._id && (
                  <span className="absolute -left-2 -top-2 w-4 h-4 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-60 animate-pulse" />
                )}
              </button>
            ))}
            {filteredGroups.length === 0 && (
              <div className="text-center text-zinc-400 py-6 text-lg font-semibold animate-fade-in-up">No groups found</div>
            )}
          </>
        )}
      </div>
      
      {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />}
      {/* Custom keyframes for neon bar, pulse, and fade-in */}
      <style>{`
        @keyframes neon-bar {
          0%, 100% { filter: brightness(1.1) drop-shadow(0 0 8px #6366f1); }
          50% { filter: brightness(1.5) drop-shadow(0 0 24px #f472b6); }
        }
        .animate-neon-bar {
          animation: neon-bar 2.5s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 #34d39944; }
          50% { box-shadow: 0 0 8px 4px #34d39999; }
        }
        .animate-pulse-glow {
          animation: pulse-glow 1.8s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(.4,0,.2,1) both;
        }
        /* Custom scrollbar for user list */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #6366f1 0%, #f472b6 100%);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </aside>
  );
};
export default Sidebar;