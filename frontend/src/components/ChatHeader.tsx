import { useState } from "react";
import { X, Settings, Phone, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import GroupSettingsModal from "./GroupSettingsModal";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { initiateCall } = useCallStore();
  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id);

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
                  {isOnline ? "Online" : selectedUser.lastSeen ? `last seen at ${new Date(selectedUser.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "Offline"}
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

        <div className="flex items-center gap-2">
          {/* Settings button for groups */}
          {selectedGroup && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group"
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
                className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group"
                title="Voice Call"
              >
                <Phone className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => initiateCall(selectedUser, "video")}
                className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group"
                title="Video Call"
              >
                <Video className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={() => {
              setSelectedUser(null);
              setSelectedGroup(null);
            }}
            className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group"
            title="Close Chat"
          >
            <X className="size-5 text-base-content/70 group-hover:text-base-content transition-colors" />
          </button>
        </div>
      </div>
      {isSettingsOpen && <GroupSettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default ChatHeader;