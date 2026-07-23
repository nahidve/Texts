import { useState } from "react";
import { Search, X, Settings, Phone, Video, MoreVertical, BellOff, Image, Archive, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import GroupSettingsModal from "./GroupSettingsModal";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup, localSearchQuery, setLocalSearchQuery, clearChat } = useChatStore();
  const { onlineUsers, authUser, toggleMute, setWallpaper, toggleArchive } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { initiateCall } = useCallStore();
  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const targetId = selectedGroup?._id || selectedUser?._id;
  const isGroup = !!selectedGroup;
  
  const isMuted = authUser?.mutedChats?.some((c: any) => c.chatId === targetId && c.chatModel === (isGroup ? 'Group' : 'User') && new Date(c.mutedUntil) > new Date());
  const isArchived = isGroup ? authUser?.archivedGroups?.includes(targetId) : authUser?.archivedChats?.includes(targetId);

  return (
    <div className="p-4 border-b border-base-300 bg-base-100/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="avatar relative">
            <div className="size-12 rounded-2xl border-2 border-base-300 shadow-md overflow-hidden bg-base-200">
              <img
                src={selectedGroup ? (selectedGroup.avatar || "/avatar.png") : (selectedUser?.profilePic || "/avatar.png")}
                alt={selectedGroup ? selectedGroup.name : selectedUser?.fullName}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Online/Offline indicator for users */}
            {selectedUser && (
              <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-base-100 shadow-sm ${isOnline ? "bg-success animate-pulse" : "bg-base-300"
                }`} />
            )}
          </div>

          {/* User/Group info */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-lg tracking-wide">{selectedGroup ? selectedGroup.name : selectedUser?.fullName}</h3>
            {selectedUser ? (
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${isOnline ? "bg-success" : "bg-base-300"}`} />
                <p className="text-sm font-medium text-base-content/70">
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-sm font-medium text-base-content/70">
                  {selectedGroup?.members.length} members
                </p>
                {selectedGroup?.description && (
                  <p className="text-xs text-base-content/50 truncate max-w-md mt-0.5">
                    {selectedGroup.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Local Search Button */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-xl transition-all duration-200 ${isSearchOpen ? 'bg-primary/20 text-primary' : 'hover:bg-base-200 text-base-content/70 hover:text-base-content'}`}
            title="Search inside conversation"
          >
            <Search className="size-5" />
          </button>

          {/* Settings button for groups */}
          {selectedGroup && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group"
              title="Settings"
            >
              <Settings className="size-5 text-base-content/70 group-hover:text-base-content transition-colors" />
            </button>
          )}

          {/* Call buttons for users */}
          {selectedUser && (
            <>
              <button
                onClick={() => initiateCall(selectedUser, "audio")}
                disabled={!isOnline}
                className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Voice Call"
              >
                <Phone className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => initiateCall(selectedUser, "video")}
                disabled={!isOnline}
                className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Video className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
              </button>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group">
                <X className="size-5 text-base-content/70 group-hover:text-base-content transition-colors" />
              </button>
            </>
          )}

          {selectedGroup && (
            <button onClick={() => setSelectedGroup(null)} className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group">
              <X className="size-5 text-base-content/70 group-hover:text-base-content transition-colors" />
            </button>
          )}

          {/* More Options Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group"
            >
              <MoreVertical className="size-5 text-base-content/70 group-hover:text-base-content" />
            </button>
            {isDropdownOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-48 bg-base-100 shadow-2xl rounded-xl border border-base-300 py-2 z-50 animate-in fade-in zoom-in-95"
                onClick={() => setIsDropdownOpen(false)}
              >
                <button 
                  onClick={() => toggleMute(targetId!, isGroup, isMuted ? 0 : 8)}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                >
                  <BellOff className="size-4" />
                  {isMuted ? 'Unmute' : 'Mute for 8 hours'}
                </button>
                <button 
                  onClick={() => toggleMute(targetId!, isGroup, isMuted ? 0 : 24 * 7)}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                >
                  <BellOff className="size-4" />
                  {isMuted ? 'Unmute' : 'Mute for 1 week'}
                </button>
                <button 
                  onClick={() => toggleMute(targetId!, isGroup, isMuted ? 0 : -1)}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                >
                  <BellOff className="size-4 text-red-500" />
                  {isMuted ? 'Unmute' : 'Mute forever'}
                </button>
                <div className="border-t border-base-300 my-1"></div>
                <button 
                  onClick={() => {
                    const url = prompt("Enter wallpaper URL (or leave blank to remove):");
                    if (url !== null) setWallpaper(targetId!, isGroup, url);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                >
                  <Image className="size-4" />
                  Set Wallpaper
                </button>
                <div className="border-t border-base-300 my-1"></div>
                <button 
                  onClick={() => toggleArchive(targetId!, isGroup)}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                >
                  <Archive className="size-4" />
                  {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear this chat? This action cannot be undone.")) {
                      clearChat(targetId!, isGroup);
                    }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 text-red-500"
                >
                  <Trash2 className="size-4" />
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Local Search Bar */}
      {isSearchOpen && (
        <div className="mt-3 relative animate-in slide-in-from-top-2 fade-in duration-200">
          <Search className="absolute left-3 top-2.5 size-4 text-base-content/50" />
          <input
            type="text"
            placeholder="Search in this conversation..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full bg-base-200/50 border border-base-300 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            autoFocus
          />
          {localSearchQuery && (
            <button
              onClick={() => setLocalSearchQuery("")}
              className="absolute right-3 top-2.5 text-base-content/50 hover:text-base-content"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {isSettingsOpen && <GroupSettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default ChatHeader;