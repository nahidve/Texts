import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { Phone, PhoneMissed, PhoneOutgoing, PhoneIncoming, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import toast from "react-hot-toast";

const CallHistory = () => {
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const { authUser } = useAuthStore();
  const { initiateCall } = useCallStore();

  const fetchCalls = async () => {
    try {
      const res = await axiosInstance.get("/calls/history");
      setCalls(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load call history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const deleteCall = async (callId: string) => {
    try {
      await axiosInstance.delete(`/calls/history/${callId}`);
      setCalls(calls.filter(c => c._id !== callId));
      toast.success("Call removed from history");
    } catch (error) {
      toast.error("Failed to delete call");
    }
  };

  const filteredCalls = filter === "all" ? calls : calls.filter(c => c.status === "missed" && c.receiverId?._id === authUser._id);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full text-zinc-400">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full text-zinc-400 gap-2">
        <Phone className="size-12 opacity-20" />
        <p>No recent calls</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-base-100 overflow-y-auto custom-scrollbar">
      {/* Sticky Header with Filters */}
      <div className="sticky top-0 z-10 bg-base-100/90 backdrop-blur-md p-4 border-b border-base-300 flex items-center justify-between">
        <h2 className="font-bold text-lg">Call History</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter("all")}
            className={`badge badge-lg cursor-pointer ${filter === 'all' ? 'badge-primary' : 'badge-ghost'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("missed")}
            className={`badge badge-lg cursor-pointer ${filter === 'missed' ? 'badge-error' : 'badge-ghost'}`}
          >
            Missed
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {filteredCalls.map((call) => {
          const isOutgoing = call.callerId._id === authUser._id;
          const otherUser = isOutgoing ? call.receiverId : call.callerId;
          // Note: For group calls, receiverId might be null, use groupId info if implemented.
          // Fallback if otherUser is missing
          if (!otherUser) return null;

          const isMissed = call.status === "missed" || call.status === "cancelled" || call.status === "busy";
          const callColor = isMissed && !isOutgoing ? "text-error" : "text-base-content";

          const formatDuration = (seconds: number) => {
            if (seconds === 0) return "Canceled";
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
          };

          return (
            <div key={call._id} className="flex items-center justify-between p-3 hover:bg-base-200/50 rounded-xl transition-colors group">
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => initiateCall(otherUser, call.type)}>
                <img 
                  src={otherUser.profilePic || "/avatar.png"} 
                  alt="avatar" 
                  className="size-12 rounded-full object-cover border border-base-300"
                />
                
                <div className="flex flex-col flex-1">
                  <span className={`font-semibold text-lg ${callColor}`}>
                    {otherUser.fullName}
                  </span>
                  
                  <div className="flex items-center gap-1 text-sm text-zinc-400">
                    {isOutgoing ? (
                      <PhoneOutgoing className="size-3" />
                    ) : isMissed ? (
                      <PhoneMissed className="size-3 text-error" />
                    ) : (
                      <PhoneIncoming className="size-3" />
                    )}
                    <span>{call.type === "video" ? "Video" : "Voice"}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(call.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <span className="text-sm font-medium text-zinc-500 hidden sm:block">
                    {formatDuration(call.duration)}
                 </span>
                 <button onClick={() => deleteCall(call._id)} className="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="size-4 text-error" />
                 </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CallHistory;
