import { useState, useRef } from "react";
import { Search, X, Settings, Phone, Video, MoreVertical, BellOff, Image, Archive, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import GroupSettingsModal from "./GroupSettingsModal";
import UserProfileModal from "./UserProfileModal";
import { useCallStore } from "../store/useCallStore";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup, localSearchQuery, setLocalSearchQuery, clearChat } = useChatStore();
  const { onlineUsers, authUser, toggleMute, setWallpaper, toggleArchive } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { initiateCall } = useCallStore();
  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const targetId = selectedGroup?._id || selectedUser?._id;
  const isGroup = !!selectedGroup;

  const isMuted = authUser?.mutedChats?.some((c: any) => c.chatId === targetId && c.chatModel === (isGroup ? 'Group' : 'User') && new Date(c.mutedUntil) > new Date());
  const isArchived = isGroup ? authUser?.archivedGroups?.includes(targetId) : authUser?.archivedChats?.includes(targetId);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Wallpaper must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUploadingWallpaper(true);
      await setWallpaper(targetId!, isGroup, reader.result as string);
      setIsUploadingWallpaper(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsDropdownOpen(false);
  };

  return (
    <div className="p-4 border-b border-base-300 bg-base-100/80 backdrop-blur-sm shadow-sm relative z-50">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-4 cursor-pointer hover:bg-base-200/50 p-1.5 -ml-1.5 rounded-2xl transition-colors"
          onClick={() => isGroup ? setIsSettingsOpen(true) : setIsUserProfileOpen(true)}
          title="View profile"
        >
          <div className="avatar relative">
            <div className="size-10 rounded-full border border-discord-surface shadow-sm overflow-hidden bg-[#2b2d31]">
              <img
                src={selectedGroup ? (selectedGroup.avatar || "/avatar.png") : (selectedUser?.profilePic || "/avatar.png")}
                alt={selectedGroup ? selectedGroup.name : selectedUser?.fullName}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Online/Offline indicator for users */}
            {selectedUser && (
              <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#313338] shadow-sm ${isOnline ? "bg-discord-green" : "bg-discord-surface"
                }`} />
            )}
          </div>

          {/* User/Group info */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-base tracking-wide text-white">{selectedGroup ? selectedGroup.name : selectedUser?.fullName}</h3>
            {selectedUser ? (
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-discord-ink/70">
                  {isOnline ? "Online" : selectedUser.lastSeen ? `Last seen at ${new Date(selectedUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-xs font-medium text-discord-ink/70">
                  {selectedGroup?.members.length} members
                </p>
                {selectedGroup?.description && (
                  <p className="text-[11px] text-discord-ink/50 truncate max-w-md mt-0.5">
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
            className={`p-1.5 rounded-md transition-all duration-200 ${isSearchOpen ? 'bg-discord-surface text-white' : 'hover:bg-white/5 text-discord-ink/70 hover:text-white'}`}
            title="Search inside conversation"
          >
            <Search className="size-5" />
          </button>

          {/* Settings button for groups */}
          {selectedGroup && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-md hover:bg-white/5 transition-all duration-200 group"
              title="Settings"
            >
              <Settings className="size-5 text-discord-ink/70 group-hover:text-white transition-colors" />
            </button>
          )}

          {/* Call buttons for users */}
          {selectedUser && (
            <>
              <button
                onClick={() => initiateCall(selectedUser, "audio")}
                disabled={!isOnline}
                className="p-1.5 rounded-md hover:bg-white/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Voice Call"
              >
                <Phone className="size-5 text-discord-ink/70 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={() => initiateCall(selectedUser, "video")}
                disabled={!isOnline}
                className="p-1.5 rounded-md hover:bg-white/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Video Call"
              >
                <Video className="size-5 text-discord-ink/70 group-hover:text-white transition-colors" />
              </button>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-md hover:bg-white/5 transition-all duration-200 group">
                <X className="size-5 text-discord-ink/70 group-hover:text-white transition-colors" />
              </button>
            </>
          )}

          {selectedGroup && (
            <button onClick={() => setSelectedGroup(null)} className="p-1.5 rounded-md hover:bg-white/5 transition-all duration-200 group">
              <X className="size-5 text-discord-ink/70 group-hover:text-white transition-colors" />
            </button>
          )}

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                if (!isDropdownOpen) setShowMuteOptions(false);
              }}
              className="p-1.5 rounded-xl hover:bg-base-200 transition-all duration-200 group"
            >
              <MoreVertical className="size-5 text-discord-ink/70 group-hover:text-white" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleWallpaperUpload}
              accept="image/*"
              className="hidden"
            />
            {isDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 bg-[#111214] shadow-2xl rounded-md border border-discord-surface py-2 z-50 animate-in fade-in zoom-in-95"
                onClick={() => setIsDropdownOpen(false)}
              >
                {isMuted ? (
                  <button
                    onClick={() => toggleMute(targetId!, isGroup, 0)}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                  >
                    <BellOff className="size-4" />
                    Unmute
                  </button>
                ) : showMuteOptions ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="px-4 py-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                      <button onClick={() => setShowMuteOptions(false)} className="hover:text-base-content">
                        ← Back
                      </button>
                    </div>
                    <button
                      onClick={() => { toggleMute(targetId!, isGroup, 8); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 pl-8"
                    >
                      For 8 hours
                    </button>
                    <button
                      onClick={() => { toggleMute(targetId!, isGroup, 24 * 7); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 pl-8"
                    >
                      For 1 week
                    </button>
                    <button
                      onClick={() => { toggleMute(targetId!, isGroup, -1); setIsDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 pl-8 text-red-500"
                    >
                      Forever
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMuteOptions(true); }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BellOff className="size-4" />
                      Mute chat...
                    </div>
                    <span className="text-base-content/50 opacity-50">›</span>
                  </button>
                )}
                <div className="border-t border-base-300 my-1"></div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Image className="size-4" />
                  Set Wallpaper
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (!e.target.files || e.target.files.length === 0) return;
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => {
                        setWallpaper(targetId!, isGroup, reader.result as string);
                        setIsDropdownOpen(false);
                      };
                      e.target.value = ''; // Reset input so same file can be selected again
                    }}
                  />
                </label>
                <button
                  onClick={() => setWallpaper(targetId!, isGroup, "")}
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm flex items-center gap-2 text-base-content/60"
                >
                  <Image className="size-4 opacity-50" />
                  Remove Wallpaper
                </button>
                <div className="border-t border-discord-surface my-1"></div>
                <button
                  onClick={() => toggleArchive(targetId!, isGroup)}
                  className="w-full text-left px-4 py-2 hover:bg-discord-blurple hover:text-white text-discord-ink/80 text-sm flex items-center gap-2 transition-colors"
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
                  className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white text-red-400 text-sm flex items-center gap-2 transition-colors"
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
          <Search className="absolute left-3 top-2.5 size-4 text-discord-ink/50" />
          <input
            type="text"
            placeholder="Search in this conversation..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] rounded-md pl-10 pr-10 py-1.5 text-sm text-discord-ink placeholder-discord-ink/50 focus:outline-none transition-all"
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

      {isSettingsOpen && selectedGroup && <GroupSettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isUserProfileOpen && selectedUser && <UserProfileModal user={selectedUser} isOnline={isOnline ?? false} onClose={() => setIsUserProfileOpen(false)} />}
    </div>
  );
};

export default ChatHeader;