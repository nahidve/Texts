import { useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Save, Copy, UserPlus, LogOut, Trash2, Shield, Users, Search, QrCode } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { createPortal } from "react-dom";

type GroupSettingsModalProps = {
  onClose: () => void;
};

const GroupSettingsModal = ({ onClose }: GroupSettingsModalProps) => {
  const { selectedGroup, getGroups, setSelectedGroup, setSelectedUser, users } = useChatStore();
  const { authUser } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"info" | "members" | "permissions" | "invite">("info");
  
  // Form State
  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [avatar, setAvatar] = useState(selectedGroup?.avatar || "");
  const [permissions, setPermissions] = useState(selectedGroup?.permissions || {});
  const [settings, setSettings] = useState(selectedGroup?.settings || {});
  
  // UI State
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);

  if (!selectedGroup) return null;

  const memberInfo = selectedGroup.members.find((m: any) => m.user._id === authUser?._id);
  const isAdminOrOwner = memberInfo?.role === "owner" || memberInfo?.role === "admin";
  const joinUrl = `${window.location.origin}/join/${selectedGroup.joinLink}`;

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setIsUpdating(true);
    try {
      const payload: any = { name, description, permissions, settings };
      if (avatar !== selectedGroup.avatar) payload.avatar = avatar;

      const res = await axiosInstance.put(`/groups/${selectedGroup._id}`, payload);
      setSelectedGroup(res.data);
      getGroups();
      toast.success("Settings updated");
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;
    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/members`, {
        memberIds: selectedNewMembers,
      });
      setSelectedGroup(res.data);
      getGroups();
      toast.success("Members added");
      setShowAddMembers(false);
      setSelectedNewMembers([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await axiosInstance.delete(`/groups/${selectedGroup._id}/members/${userId}`);
      setSelectedGroup(res.data);
      getGroups();
      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await axiosInstance.delete(`/groups/${selectedGroup._id}/leave`);
      setSelectedGroup(null);
      setSelectedUser(null);
      getGroups();
      toast.success("You left the group");
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  };

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Link copied to clipboard!");
  };

  const toggleNewMember = (userId: string) => {
    setSelectedNewMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return selectedGroup.members;
    return selectedGroup.members.filter((m: any) => 
      m.user.fullName.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [selectedGroup.members, memberSearch]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setAvatar(reader.result as string);
  };

  const nonMembers = users.filter(u => !selectedGroup.members.some((m: any) => m.user._id === u._id));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] min-h-[50vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-base-300 bg-base-200/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            {selectedGroup.name} Settings
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-1/3 border-r border-base-300 bg-base-200/50 p-2 space-y-1 overflow-y-auto">
            <button onClick={() => setActiveTab("info")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'info' ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}>
              <Shield className="size-5" /> Info
            </button>
            <button onClick={() => setActiveTab("members")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'members' ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}>
              <Users className="size-5" /> Members
            </button>
            <button onClick={() => setActiveTab("permissions")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'permissions' ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}>
              <Save className="size-5" /> Permissions
            </button>
            <button onClick={() => setActiveTab("invite")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'invite' ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`}>
              <QrCode className="size-5" /> Invite Link
            </button>
            
            <div className="mt-8 pt-4 border-t border-base-300 px-2">
              <button onClick={handleLeaveGroup} className="w-full flex items-center gap-3 p-3 rounded-xl text-error hover:bg-error/10 transition-all font-medium">
                <LogOut className="size-5" /> Leave Group
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
            {activeTab === "info" && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="font-bold text-xl mb-4">Group Info</h4>
                
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <img 
                      src={avatar || "/avatar.png"} 
                      alt="Group Avatar" 
                      className="size-24 rounded-full object-cover border border-base-300 shadow-md"
                    />
                    {isAdminOrOwner && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <span className="text-white text-xs font-semibold">Change</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label"><span className="label-text font-medium text-base-content/70">Group Name</span></label>
                  <input type="text" className="input input-bordered w-full bg-base-200" value={name} onChange={e => setName(e.target.value)} disabled={!isAdminOrOwner} />
                </div>
                <div className="form-control w-full">
                  <label className="label"><span className="label-text font-medium text-base-content/70">Description</span></label>
                  <textarea className="textarea textarea-bordered h-24 bg-base-200" value={description} onChange={e => setDescription(e.target.value)} disabled={!isAdminOrOwner} />
                </div>
                {isAdminOrOwner && (
                  <button onClick={handleUpdate} disabled={isUpdating} className="btn btn-primary mt-4 w-full">
                    {isUpdating ? <span className="loading loading-spinner"></span> : "Save Info"}
                  </button>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div className="space-y-4 animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-xl">Members ({selectedGroup.members.length})</h4>
                  {(isAdminOrOwner || permissions.memberCanAddMembers) && (
                    <button onClick={() => setShowAddMembers(!showAddMembers)} className="btn btn-sm btn-outline btn-primary">
                      <UserPlus className="size-4 mr-1" /> Add
                    </button>
                  )}
                </div>

                {showAddMembers ? (
                  <div className="bg-base-200 p-4 rounded-xl border border-primary/20 space-y-3 mb-4">
                    <h5 className="font-semibold text-sm">Add New Members</h5>
                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                      {nonMembers.map(u => (
                        <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-base-300 rounded-lg cursor-pointer">
                          <input type="checkbox" className="checkbox checkbox-sm checkbox-primary rounded-full" checked={selectedNewMembers.includes(u._id)} onChange={() => toggleNewMember(u._id)} />
                          <img src={u.profilePic || "/avatar.png"} className="size-6 rounded-full" />
                          <span className="text-sm">{u.fullName}</span>
                        </label>
                      ))}
                      {nonMembers.length === 0 && <p className="text-xs text-base-content/60 text-center py-2">No other users found.</p>}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button className="btn btn-xs btn-ghost" onClick={() => setShowAddMembers(false)}>Cancel</button>
                      <button className="btn btn-xs btn-primary" onClick={handleAddMembers} disabled={selectedNewMembers.length === 0}>Add Selected</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 size-4 text-base-content/70" />
                    <input type="text" placeholder="Search members..." className="input input-bordered input-sm w-full pl-9" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                  </div>
                )}

                <div className="flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar pr-2">
                  {filteredMembers.map((m: any) => (
                    <div key={m.user._id} className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300 group">
                      <img src={m.user.profilePic || "/avatar.png"} alt="avatar" className="size-10 rounded-full object-cover border border-base-300" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.user.fullName} {m.user._id === authUser?._id && <span className="text-xs text-primary ml-1">(You)</span>}</p>
                        <p className="text-xs text-base-content/60 capitalize">{m.role}</p>
                      </div>
                      
                      {isAdminOrOwner && m.user._id !== authUser?._id && m.role !== "owner" && (
                        <button onClick={() => handleRemoveMember(m.user._id)} className="btn btn-ghost btn-sm btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Member">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-center text-base-content/60 text-sm py-4">No members found.</p>}
                </div>
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="space-y-6 animate-fade-in">
                <h4 className="font-bold text-xl mb-4">Permissions & Settings</h4>
                
                <div className="space-y-3">
                  <h5 className="font-semibold text-base-content/70 uppercase text-xs tracking-wider">Member Permissions</h5>
                  <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer">
                    <span className="font-medium">Send Messages</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={permissions.memberCanSendMessages} onChange={e => setPermissions({...permissions, memberCanSendMessages: e.target.checked})} disabled={!isAdminOrOwner} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer">
                    <span className="font-medium">Send Media</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={permissions.memberCanSendMedia} onChange={e => setPermissions({...permissions, memberCanSendMedia: e.target.checked})} disabled={!isAdminOrOwner} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer">
                    <span className="font-medium">Pin Messages</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={permissions.memberCanPinMessages} onChange={e => setPermissions({...permissions, memberCanPinMessages: e.target.checked})} disabled={!isAdminOrOwner} />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer">
                    <span className="font-medium">Add New Members</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={permissions.memberCanAddMembers} onChange={e => setPermissions({...permissions, memberCanAddMembers: e.target.checked})} disabled={!isAdminOrOwner} />
                  </label>
                </div>

                <div className="space-y-3 pt-4 border-t border-base-300">
                  <h5 className="font-semibold text-base-content/70 uppercase text-xs tracking-wider">Advanced Settings</h5>
                  <label className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl cursor-pointer">
                    <span className="font-medium">Anonymous Admins</span>
                    <input type="checkbox" className="toggle toggle-secondary" checked={settings.anonymousAdmins} onChange={e => setSettings({...settings, anonymousAdmins: e.target.checked})} disabled={!isAdminOrOwner} />
                  </label>
                  <div className="p-3 bg-base-200/50 rounded-xl space-y-2">
                    <span className="font-medium">Slow Mode (Seconds)</span>
                    <input type="range" min="0" max="60" className="range range-primary range-sm" value={settings.slowMode} onChange={e => setSettings({...settings, slowMode: parseInt(e.target.value)})} disabled={!isAdminOrOwner} />
                    <div className="text-center text-sm font-bold text-primary">{settings.slowMode === 0 ? "Off" : `${settings.slowMode}s`}</div>
                  </div>
                </div>

                {isAdminOrOwner && (
                  <button onClick={handleUpdate} disabled={isUpdating} className="btn btn-primary mt-4 w-full">
                    {isUpdating ? <span className="loading loading-spinner"></span> : "Save Permissions"}
                  </button>
                )}
              </div>
            )}

            {activeTab === "invite" && (
              <div className="space-y-6 animate-fade-in flex flex-col items-center pt-8">
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <QRCodeSVG value={joinUrl} size={200} level="H" includeMargin={false} />
                </div>
                
                <div className="text-center space-y-2 max-w-sm">
                  <h4 className="font-bold text-xl">QR Invite</h4>
                  <p className="text-sm text-base-content/70">Scan this code to join the group, or share the link below with others.</p>
                </div>

                <div className="w-full flex gap-2 mt-4">
                  <input type="text" className="input input-bordered w-full bg-base-200" readOnly value={joinUrl} />
                  <button className="btn btn-square btn-primary text-white shadow-md" onClick={copyJoinLink}>
                    <Copy className="size-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default GroupSettingsModal;
