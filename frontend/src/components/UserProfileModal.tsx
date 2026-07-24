import { X, Phone, Video } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

interface UserProfileModalProps {
  user: any;
  isOnline: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ user, isOnline, onClose }: UserProfileModalProps) => {
  const { initiateCall } = useCallStore();

  return (
    <>
      {/* Transparent backdrop to close the floating panel when clicking outside */}
      <div className="fixed inset-0 z-[90] bg-transparent" onClick={onClose}></div>
      
      <div 
        className="fixed top-20 right-6 z-[100] bg-base-100 rounded-3xl shadow-2xl shadow-black/20 border border-base-300 w-full max-w-[320px] overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-64 w-full bg-base-300">
          <img 
            src={user.profilePic || "/avatar.png"} 
            alt={user.fullName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={onClose} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <h2 className="text-2xl font-bold mb-1 drop-shadow-md">{user.fullName}</h2>
            <div className="flex items-center gap-2 text-sm drop-shadow-md opacity-90">
              <div className={`size-2 rounded-full ${isOnline ? "bg-success" : "bg-base-300/50"}`} />
              {isOnline ? "Online" : user.lastSeen ? `last seen at ${new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline"}
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => { onClose(); initiateCall(user, "audio"); }}
              disabled={!isOnline}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl transition-colors font-semibold disabled:opacity-50"
            >
              <Phone size={18} />
              Audio
            </button>
            <button 
              onClick={() => { onClose(); initiateCall(user, "video"); }}
              disabled={!isOnline}
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-2xl transition-colors font-semibold disabled:opacity-50"
            >
              <Video size={18} />
              Video
            </button>
          </div>

          {user.fullName && (
            <div className="mt-2 text-sm text-base-content/70">
              <div className="font-semibold text-xs uppercase tracking-wider mb-1 opacity-70">Name</div>
              <div className="text-base-content font-medium">{user.fullName}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfileModal;
