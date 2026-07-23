import { X, Phone, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { initiateCall } = useCallStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="p-4 border-b border-base-300 bg-base-100/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar with online indicator */}
          <div className="avatar relative">
            <div className="size-12 rounded-2xl border-2 border-base-300 shadow-md overflow-hidden bg-base-200">
              <img 
                src={selectedUser.profilePic || "/avatar.png"} 
                alt={selectedUser.fullName}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Online/Offline indicator */}
            <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-base-100 shadow-sm ${
              isOnline ? "bg-success animate-pulse" : "bg-base-300"
            }`} />
          </div>

          {/* User info */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-lg tracking-wide">{selectedUser.fullName}</h3>
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${isOnline ? "bg-success" : "bg-base-300"}`} />
              <p className="text-sm font-medium text-base-content/70">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Call buttons */}
          <button 
            onClick={() => initiateCall(selectedUser, "audio")}
            disabled={!isOnline}
            className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Voice Call"
          >
            <Phone className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={() => initiateCall(selectedUser, "video")}
            disabled={!isOnline}
            className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Video Call"
          >
            <Video className="size-5 text-base-content/70 group-hover:text-primary transition-colors" />
          </button>

          {/* Close button */}
          <button 
            onClick={() => setSelectedUser(null)}
            className="p-2 rounded-xl hover:bg-base-200 transition-all duration-200 group"
          >
            <X className="size-5 text-base-content/70 group-hover:text-base-content transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;