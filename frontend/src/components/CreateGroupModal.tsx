import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
//import { useAuthStore } from "../store/useAuthStore";
import { X, Camera, Check } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

type CreateGroupModalProps = {
  onClose: () => void;
};

const CreateGroupModal = ({ onClose }: CreateGroupModalProps) => {
  const { users, getGroups } = useChatStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setIsCreating(true);
    try {
      await axiosInstance.post("/groups", {
        name,
        description,
        avatar,
        memberIds: selectedMembers,
      });
      toast.success("Group created successfully");
      getGroups();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-base-300 bg-base-200/50">
          <h3 className="font-bold text-lg">Create New Group</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <img
                src={avatar || "/avatar.png"}
                alt="Group Avatar"
                className="size-24 rounded-full object-cover border-4 border-base-300"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary hover:scale-105
                  p-2 rounded-full cursor-pointer transition-all duration-200"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Group Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering Team"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Description (Optional)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
            />
          </div>

          <div className="divider my-0">Add Members</div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {users.map((user) => (
              <label
                key={user._id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedMembers.includes(user._id) ? "bg-primary/10 border border-primary/30" : "hover:bg-base-200 border border-transparent"
                  }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary rounded-full"
                  checked={selectedMembers.includes(user._id)}
                  onChange={() => toggleMember(user._id)}
                />
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-8 rounded-full object-cover"
                />
                <span className="flex-1 font-medium text-sm">{user.fullName}</span>
              </label>
            ))}
            {users.length === 0 && <p className="text-xs text-center text-base-content/60">No users found.</p>}
          </div>
        </div>

        <div className="p-4 border-t border-base-300 bg-base-200/50 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={isCreating} className="btn btn-primary text-white">
            {isCreating ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Check className="size-5 mr-1" />
            )}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
export default CreateGroupModal;
