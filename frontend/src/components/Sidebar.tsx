import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UsersIcon, PlusCircle, Search, Pin, Archive, Star, BellOff, MoreVertical, Trash2, PhoneCall } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import CallHistory from "./CallHistory";

const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading,
    getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading,
    searchGlobal, globalSearchResults, isSearchingGlobal, setHighlightedMessageId,
    getStarredMessages, starredMessages
  } = useChatStore();
  const { onlineUsers, authUser, toggleArchive, togglePin } = useAuthStore();
  const { clearChat } = useChatStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "groups" | "calls" | "archived" | "starred">("users");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<{ id: string; isGroup: boolean; name: string } | null>(null);

  useEffect(() => {
    getUsers();
    getGroups();
    getStarredMessages();
  }, [getUsers, getGroups, getStarredMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchGlobal(searchQuery);
      } else {
        searchGlobal("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchGlobal]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleChatMenuClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const filteredUsers = users.filter((user) => {
    const isArchived = authUser?.archivedChats?.some((id: any) => id.toString() === user._id.toString());
    if (activeTab !== "archived" && isArchived) return false;
    if (activeTab === "archived" && !isArchived) return false;

    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    if (showOnlineOnly) return onlineUsers.includes(user._id) && matchesSearch;
    return matchesSearch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aPinned = authUser?.pinnedChats?.some((id: any) => id.toString() === a._id.toString()) ? 1 : 0;
    const bPinned = authUser?.pinnedChats?.some((id: any) => id.toString() === b._id.toString()) ? 1 : 0;
    return bPinned - aPinned;
  });

  const filteredGroups = groups.filter((group) => {
    const isArchived = authUser?.archivedGroups?.some((id: any) => id.toString() === group._id.toString());
    if (activeTab !== "archived" && isArchived) return false;
    if (activeTab === "archived" && !isArchived) return false;

    return group.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aPinned = authUser?.pinnedGroups?.some((id: any) => id.toString() === a._id.toString()) ? 1 : 0;
    const bPinned = authUser?.pinnedGroups?.some((id: any) => id.toString() === b._id.toString()) ? 1 : 0;
    return bPinned - aPinned;
  });

  const handleMessageClick = (msg: any) => {
    if (msg.groupId) {
      const group = groups.find(g => g._id === msg.groupId._id);
      if (group) setSelectedGroup(group);
    } else {
      // Find the other user
      const otherUser = msg.senderId._id === useAuthStore.getState().authUser?._id ? msg.receiverId : msg.senderId;
      setSelectedUser(otherUser);
    }
    setHighlightedMessageId(msg._id);
  };

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-80 flex flex-col transition-all duration-200 relative bg-gradient-to-br from-[#232526]/80 via-[#2c3e50]/80 to-[#485563]/90 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Neon vertical accent bar */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary via-accent to-secondary animate-neon-bar z-20" />
      {/* Glassy card effect */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="relative z-10 border-b border-base-300 w-full p-4 flex flex-col gap-2">
        <div className="flex overflow-x-auto hide-scrollbar gap-1 bg-base-300/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${activeTab === 'users' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
            title="Contacts"
          >
            <Users className="size-4" />
            <span className={`font-medium text-xs hidden lg:block overflow-hidden transition-all duration-300 ${activeTab === 'users' ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0'}`}>Contacts</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${activeTab === 'groups' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
            title="Groups"
          >
            <UsersIcon className="size-4" />
            <span className={`font-medium text-xs hidden lg:block overflow-hidden transition-all duration-300 ${activeTab === 'groups' ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0'}`}>Groups</span>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${activeTab === 'archived' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
            title="Archived"
          >
            <Archive className="size-4" />
            <span className={`font-medium text-xs hidden lg:block overflow-hidden transition-all duration-300 ${activeTab === 'archived' ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0'}`}>Archived</span>
          </button>
          <button
            onClick={() => setActiveTab("starred")}
            className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${activeTab === 'starred' ? 'bg-primary text-primary-content shadow-md' : 'text-zinc-400 hover:text-white hover:bg-base-300'}`}
            title="Starred"
          >
            <Star className="size-4" />
            <span className={`font-medium text-xs hidden lg:block overflow-hidden transition-all duration-300 ${activeTab === 'starred' ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0'}`}>Starred</span>
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
            <span className="text-xs text-accent font-semibold animate-pulse">({Math.max(0, onlineUsers.length - 1)} online)</span>
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
        {searchQuery.trim().length >= 2 ? (
              <div className="flex flex-col gap-4 hidden lg:flex">
                {isSearchingGlobal ? (
                  <div className="flex justify-center p-4">
                    <span className="loading loading-spinner text-primary"></span>
                  </div>
                ) : (
                  <>
                    {/* Global Users */}
                    {globalSearchResults.users.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 px-2">Users</h4>
                        {globalSearchResults.users.map((user) => (
                          <button
                            key={user._id}
                            onClick={() => setSelectedUser(user)}
                            className="w-full flex items-center gap-4 px-3 py-2 rounded-2xl hover:bg-base-200/60 transition-all duration-200 group relative shadow-sm"
                          >
                            <div className="relative flex-shrink-0">
                              <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-10 object-cover rounded-full border-2 border-base-300" />
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-semibold truncate text-white/90 text-sm">{user.fullName}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Global Groups */}
                    {globalSearchResults.groups.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 px-2">Groups</h4>
                        {globalSearchResults.groups.map((group) => (
                          <button
                            key={group._id}
                            onClick={() => setSelectedGroup(group)}
                            className="w-full flex items-center gap-4 px-3 py-2 rounded-2xl hover:bg-base-200/60 transition-all duration-200 group relative shadow-sm"
                          >
                            <div className="relative flex-shrink-0">
                              <img src={group.avatar || "/avatar.png"} alt={group.name} className="size-10 object-cover rounded-full border-2 border-base-300" />
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-semibold truncate text-white/90 text-sm">{group.name}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Global Messages */}
                    {globalSearchResults.messages.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 px-2">Messages</h4>
                        {globalSearchResults.messages.map((msg) => (
                          <button
                            key={msg._id}
                            onClick={() => handleMessageClick(msg)}
                            className="w-full flex flex-col gap-1 px-3 py-2 rounded-2xl hover:bg-base-200/60 transition-all duration-200 group relative shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <img src={msg.senderId.profilePic || "/avatar.png"} className="size-5 rounded-full" />
                              <span className="text-xs font-semibold text-primary truncate">{msg.senderId.fullName}</span>
                              {msg.groupId && <span className="text-[10px] bg-base-300 px-1.5 py-0.5 rounded text-base-content/70 truncate ml-auto">{msg.groupId.name}</span>}
                            </div>
                            <p className="text-xs text-base-content/70 truncate w-full text-left ml-7">{msg.text}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.users.length === 0 && globalSearchResults.groups.length === 0 && globalSearchResults.messages.length === 0 && (
                      <div className="text-center text-zinc-400 py-6 text-sm">No results found</div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "calls" ? (
          <CallHistory />
            ) : activeTab === "calls" ? (
              <CallHistory />
        ) : activeTab === "users" ? (
              <>
                {sortedUsers.map((user) => {
                  const isPinned = authUser?.pinnedChats?.includes(user._id);
                  const isArchived = authUser?.archivedChats?.some((id: any) => id.toString() === user._id.toString());
                  const isMenuOpen = openMenuId === user._id;
                  return (
                    <div
                      key={user._id}
                      className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                    group relative shadow-sm cursor-pointer
                    ${selectedUser?._id === user._id
                          ? "bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 ring-2 ring-primary/60 scale-[1.03] shadow-lg"
                          : "hover:bg-base-200/60 hover:scale-[1.01]"}
                  `}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className={`size-12 object-cover rounded-full border-2 ${selectedUser?._id === user._id ? "border-primary shadow-primary/40" : "border-base-300"}`}
                        />
                        {onlineUsers.includes(user._id) && (
                          <span className="absolute bottom-1 right-1 size-3 bg-gradient-to-br from-green-400 via-green-500 to-emerald-400 rounded-full ring-2 ring-zinc-900 animate-pulse-glow" />
                        )}
                      </div>
                      <div className="hidden lg:block text-left min-w-0 flex-1">
                        <div className="font-semibold truncate text-white/90 text-base drop-shadow flex items-center gap-2">
                          {user.fullName}
                          {isPinned && <Pin className="size-3 text-base-content/50" />}
                          {authUser?.mutedChats?.some((c: any) => c.chatId === user._id && c.chatModel === 'User' && new Date(c.mutedUntil) > new Date()) && (
                            <BellOff className="size-3 text-white/50" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-300">
                          {onlineUsers.includes(user._id) ? (
                            <span className="text-green-400 font-bold animate-pulse">● Online</span>
                          ) : (
                            <span className="text-zinc-500">Offline</span>
                          )}
                        </div>
                      </div>
                      {/* ⋮ Menu button */}
                      <div className="relative hidden lg:block flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleChatMenuClick(e, user._id)}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                          title="Chat options"
                        >
                          <MoreVertical className="size-4 text-white/60" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-base-100 shadow-2xl rounded-xl border border-base-300 py-1 z-50 animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => { togglePin(user._id, false); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                            >
                              <Pin className="size-4" />
                              {isPinned ? 'Unpin' : 'Pin to top'}
                            </button>
                            <button
                              onClick={() => { toggleArchive(user._id, false); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                            >
                              <Archive className="size-4" />
                              {isArchived ? 'Unarchive' : 'Archive Chat'}
                            </button>
                            <div className="border-t border-base-300 my-1" />
                            <button
                              onClick={() => {
                                setConfirmClear({ id: user._id, isGroup: false, name: user.fullName });
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2 text-red-500"
                            >
                              <Trash2 className="size-4" />
                              Clear Chat
                            </button>
                          </div>
                        )}
                      </div>
                      {selectedUser?._id === user._id && (
                        <span className="absolute -left-2 -top-2 w-4 h-4 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-60 animate-pulse" />
                      )}
                    </div>
                  );
                })}
                {sortedUsers.length === 0 && (
                  <div className="text-center text-zinc-400 py-6 text-lg font-semibold animate-fade-in-up">No users</div>
                )}
              </>
            ) : activeTab === "groups" ? (
              <>
                {sortedGroups.map((group) => {
                  const isPinned = authUser?.pinnedGroups?.includes(group._id);
                  const isArchived = authUser?.archivedGroups?.some((id: any) => id.toString() === group._id.toString());
                  const isMenuOpen = openMenuId === group._id;
                  return (
                    <div
                      key={group._id}
                      className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200
                    group relative shadow-sm cursor-pointer
                    ${selectedGroup?._id === group._id
                          ? "bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 ring-2 ring-primary/60 scale-[1.03] shadow-lg"
                          : "hover:bg-base-200/60 hover:scale-[1.01]"}
                  `}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={group.avatar || "/avatar.png"}
                          alt={group.name}
                          className={`size-12 object-cover rounded-full border-2 ${selectedGroup?._id === group._id ? "border-primary shadow-primary/40" : "border-base-300"}`}
                        />
                      </div>
                      <div className="hidden lg:block text-left min-w-0 flex-1">
                        <div className="font-semibold truncate text-white/90 text-base drop-shadow flex items-center gap-2">
                          {group.name}
                          {isPinned && <Pin className="size-3 text-base-content/50" />}
                          {authUser?.mutedChats?.some((c: any) => c.chatId === group._id && c.chatModel === 'Group' && new Date(c.mutedUntil) > new Date()) && (
                            <BellOff className="size-3 text-white/50" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-300 truncate">
                          {group.members.length} members
                        </div>
                      </div>
                      {/* ⋮ Menu button */}
                      <div className="relative hidden lg:block flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleChatMenuClick(e, group._id)}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                          title="Chat options"
                        >
                          <MoreVertical className="size-4 text-white/60" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-base-100 shadow-2xl rounded-xl border border-base-300 py-1 z-50 animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => { togglePin(group._id, true); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                            >
                              <Pin className="size-4" />
                              {isPinned ? 'Unpin' : 'Pin to top'}
                            </button>
                            <button
                              onClick={() => { toggleArchive(group._id, true); setOpenMenuId(null); }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2"
                            >
                              <Archive className="size-4" />
                              {isArchived ? 'Unarchive' : 'Archive Chat'}
                            </button>
                            <div className="border-t border-base-300 my-1" />
                            <button
                              onClick={() => {
                                setConfirmClear({ id: group._id, isGroup: true, name: group.name });
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm flex items-center gap-2 text-red-500"
                            >
                              <Trash2 className="size-4" />
                              Clear Chat
                            </button>
                          </div>
                        )}
                      </div>
                      {selectedGroup?._id === group._id && (
                        <span className="absolute -left-2 -top-2 w-4 h-4 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-60 animate-pulse" />
                      )}
                    </div>
                  );
                })}
                {sortedGroups.length === 0 && (
                  <div className="text-center text-zinc-400 py-6 text-lg font-semibold animate-fade-in-up">No groups</div>
                )}
              </>
            ) : activeTab === "archived" ? (
              <div className="flex flex-col gap-2">
                <div className="text-center text-zinc-400 py-2 text-sm font-semibold uppercase tracking-wider">Archived Chats</div>
                {sortedUsers.map(user => (
                  <div key={user._id} className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-base-200/60 transition-all duration-200 cursor-pointer group" onClick={() => setSelectedUser(user)}>
                    <img src={user.profilePic || "/avatar.png"} className="size-10 object-cover rounded-full flex-shrink-0" />
                    <span className="font-semibold text-sm flex-1 truncate">{user.fullName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleArchive(user._id, false); }}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg bg-base-200 hover:bg-base-300 transition-all flex items-center gap-1 flex-shrink-0"
                    >
                      <Archive className="size-3" /> Unarchive
                    </button>
                  </div>
                ))}
                {sortedUsers.length === 0 && <div className="text-center text-zinc-500 text-xs">No archived users</div>}

                <div className="text-center text-zinc-400 py-2 text-sm font-semibold uppercase tracking-wider mt-4">Archived Groups</div>
                {sortedGroups.map(group => (
                  <div key={group._id} className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-base-200/60 transition-all duration-200 cursor-pointer group" onClick={() => setSelectedGroup(group)}>
                    <img src={group.avatar || "/avatar.png"} className="size-10 object-cover rounded-full flex-shrink-0" />
                    <span className="font-semibold text-sm flex-1 truncate">{group.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleArchive(group._id, true); }}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg bg-base-200 hover:bg-base-300 transition-all flex items-center gap-1 flex-shrink-0"
                    >
                      <Archive className="size-3" /> Unarchive
                    </button>
                  </div>
                ))}
                {sortedGroups.length === 0 && <div className="text-center text-zinc-500 text-xs">No archived groups</div>}
              </div>
            ) : activeTab === "starred" ? (
              <div className="flex flex-col gap-2">
                <div className="text-center text-zinc-400 py-2 text-sm font-semibold uppercase tracking-wider">Starred Messages</div>
                {starredMessages?.map(msg => (
                  <button key={msg._id} onClick={() => handleMessageClick(msg)} className="w-full text-left p-3 rounded-2xl hover:bg-base-200/60 transition-all duration-200 shadow-sm border border-base-300">
                    <div className="flex items-center gap-2 mb-1">
                      <img src={msg.senderId?.profilePic || "/avatar.png"} className="size-6 rounded-full" />
                      <span className="font-semibold text-sm truncate">{msg.senderId?.fullName}</span>
                      <Star className="size-3 text-yellow-500 fill-yellow-500 ml-auto" />
                    </div>
                    <p className="text-sm text-base-content/80 line-clamp-2">{msg.text || (msg.image ? '📷 Image' : '🎵 Audio')}</p>
                  </button>
                ))}
                {(!starredMessages || starredMessages.length === 0) && (
                  <div className="text-center text-zinc-500 text-sm mt-4">No starred messages</div>
                )}
              </div>
            ) : null}
          </div>

        {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />}

        {/* Inline Clear Chat Confirm */}
        {confirmClear && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-6 w-72 flex flex-col gap-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <Trash2 className="size-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Clear chat with</p>
                  <p className="text-base font-bold truncate">{confirmClear.name}</p>
                </div>
              </div>
              <p className="text-xs text-base-content/60">This will permanently delete all messages. This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmClear(null)}
                  className="flex-1 btn btn-sm btn-ghost border border-base-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearChat(confirmClear.id, confirmClear.isGroup);
                    setConfirmClear(null);
                  }}
                  className="flex-1 btn btn-sm bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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