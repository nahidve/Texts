import { useState } from "react";
import { X, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

interface ForwardModalProps {
  message: any;
  onClose: () => void;
}

export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const { users, groups, forwardMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<{ id: string, isGroup: boolean }[]>([]);
  const [isSending, setIsSending] = useState(false);

  const filteredUsers = users.filter(u => u.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()) && g.members.some((m: any) => m.user._id === authUser._id));

  const toggleRecipient = (id: string, isGroup: boolean) => {
    const exists = selectedRecipients.find(r => r.id === id && r.isGroup === isGroup);
    if (exists) {
      setSelectedRecipients(selectedRecipients.filter(r => !(r.id === id && r.isGroup === isGroup)));
    } else {
      setSelectedRecipients([...selectedRecipients, { id, isGroup }]);
    }
  };

  const handleForward = async () => {
    if (selectedRecipients.length === 0) return;
    setIsSending(true);
    await forwardMessage(
      { text: message.text, image: message.image, poll: message.poll },
      selectedRecipients
    );
    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-base-300">
        <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200/50">
          <h3 className="font-bold text-lg">Forward Message</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-base-300 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users or groups..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10 bg-base-200/50"
            />
          </div>

          <div className="overflow-y-auto max-h-[40vh] space-y-2 pr-1 custom-scrollbar">
            {filteredGroups.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 px-1">Groups</h4>
                {filteredGroups.map(group => (
                  <label key={group._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary checkbox-sm rounded"
                      checked={!!selectedRecipients.find(r => r.id === group._id && r.isGroup)}
                      onChange={() => toggleRecipient(group._id, true)}
                    />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <span className="font-bold text-primary">{group.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="font-medium truncate flex-1">{group.name}</div>
                  </label>
                ))}
              </div>
            )}
            
            {filteredUsers.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 px-1">Contacts</h4>
                {filteredUsers.map(user => (
                  <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary checkbox-sm rounded"
                      checked={!!selectedRecipients.find(r => r.id === user._id && !r.isGroup)}
                      onChange={() => toggleRecipient(user._id, false)}
                    />
                    <div className="w-10 h-10 rounded-xl overflow-hidden border shadow-sm shrink-0">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="w-full h-full object-cover" />
                    </div>
                    <div className="font-medium truncate flex-1">{user.fullName}</div>
                  </label>
                ))}
              </div>
            )}
            
            {filteredGroups.length === 0 && filteredUsers.length === 0 && (
              <div className="text-center py-8 text-base-content/50 italic">No matches found</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-base-300 bg-base-200/50 flex justify-between items-center">
          <div className="text-sm font-medium text-base-content/70">
            {selectedRecipients.length > 0 ? `${selectedRecipients.length} selected` : "Select recipients"}
          </div>
          <button 
            onClick={handleForward} 
            disabled={selectedRecipients.length === 0 || isSending}
            className="btn btn-primary btn-sm px-6 rounded-xl shadow-lg shadow-primary/20"
          >
            {isSending ? <span className="loading loading-spinner loading-sm"></span> : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
