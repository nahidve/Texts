import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

type ChatStore = {
  messages: any[];
  users: any[];
  groups: any[];
  selectedUser: any;
  selectedGroup: any;
  setSelectedUser: (user: any) => void;
  setSelectedGroup: (group: any) => void;
  isUsersLoading: boolean;
  isGroupsLoading: boolean;
  isMessagesLoading: boolean;
  typingUsers: string[];
  recordingAudioUsers: string[];

  globalSearchResults: { users: any[], groups: any[], messages: any[] };
  isSearchingGlobal: boolean;
  localSearchQuery: string;
  highlightedMessageId: string | null;

  getUsers: () => Promise<void>;
  getGroups: () => Promise<void>;
  getMessages: (id: string, isGroup?: boolean) => Promise<void>;
  clearChat: (id: string, isGroup?: boolean) => Promise<void>;
  sendMessage: (messageData: any) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  votePoll: (messageId: string, optionIndex: number) => Promise<void>;
  editingMessage: any | null;
  replyingToMessage: any | null;
  setEditingMessage: (msg: any) => void;
  setReplyingToMessage: (msg: any) => void;
  pinMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  deleteMessageForMe: (messageId: string) => Promise<void>;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;
  forwardMessage: (messageData: any, recipients: { id: string, isGroup: boolean }[]) => Promise<void>;
  toggleStarMessage: (messageId: string) => Promise<void>;
  getStarredMessages: () => Promise<void>;
  starredMessages: any[];
  searchGlobal: (query: string) => Promise<void>;
  setLocalSearchQuery: (query: string) => void;
  setHighlightedMessageId: (id: string | null) => void;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  editingMessage: null,
  replyingToMessage: null,
  typingUsers: [],
  recordingAudioUsers: [],
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,

  globalSearchResults: { users: [], groups: [], messages: [] },
  isSearchingGlobal: false,
  localSearchQuery: "",
  highlightedMessageId: null,
  starredMessages: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error((error as any).response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error((error as any).response?.data?.message || "Error fetching groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getMessages: async (id: string, isGroup = false) => {
    set({ isMessagesLoading: true });
    try {
      const endpoint = isGroup ? `/messages/group/${id}` : `/messages/${id}`;
      const res = await axiosInstance.get(endpoint);
      set({ messages: res.data });
    } catch (error) {
      toast.error((error as any).response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  clearChat: async (id: string, isGroup = false) => {
    try {
      await axiosInstance.delete(`/messages/clear/${id}`, { data: { isGroup } });
      set({ messages: [] });
      toast.success("Chat cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  },
  
  sendMessage: async (messageData: any) => {
    const { selectedUser, selectedGroup, messages, replyingToMessage } = get();
    try {
      let endpoint = "";
      if (selectedGroup) {
          endpoint = `/messages/send-group/${selectedGroup._id}`;
      } else if (selectedUser) {
          endpoint = `/messages/send/${selectedUser._id}`;
      } else {
          return;
      }
      
      const payload = replyingToMessage ? { ...messageData, replyTo: replyingToMessage._id } : messageData;
      const res = await axiosInstance.post(endpoint, payload);
      set({ messages: [...messages, res.data], replyingToMessage: null });
    } catch (error) {
      toast.error((error as any).response?.data?.message || "Error sending message");
    }
  },

  searchGlobal: async (query: string) => {
    if (!query.trim()) {
      set({ globalSearchResults: { users: [], groups: [], messages: [] } });
      return;
    }
    set({ isSearchingGlobal: true });
    try {
      const res = await axiosInstance.get(`/search?q=${encodeURIComponent(query)}`);
      set({ globalSearchResults: res.data });
    } catch (error: any) {
      console.error("Global search error:", error);
    } finally {
      set({ isSearchingGlobal: false });
    }
  },

  setLocalSearchQuery: (query: string) => set({ localSearchQuery: query }),
  
  setHighlightedMessageId: (id: string | null) => set({ highlightedMessageId: id }),

  subscribeToMessages: () => {
    const { selectedUser, selectedGroup } = get();
    if (!selectedUser && !selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove old listeners to prevent duplicates
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("pollUpdated");
    socket.off("messageUpdated");

    if (selectedUser) {
      socket.on("newMessage", (newMessage: any) => {
        const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
        if (!isMessageSentFromSelectedUser) return;

        set({
          messages: [...get().messages, newMessage],
        });
      });
    }

    if (selectedGroup) {
      socket.on("newGroupMessage", (newMessage: any) => {
        if (newMessage.groupId !== selectedGroup._id) return;
        set({
          messages: [...get().messages, newMessage],
        });
      });
    }

    socket.on("pollUpdated", (updatedMessage: any) => {
      set({
        messages: get().messages.map(m => m._id === updatedMessage._id ? updatedMessage : m)
      });
    });

    socket.on("messageUpdated", (updatedMessage: any) => {
      set({
        messages: get().messages.map(m => m._id === updatedMessage._id ? updatedMessage : m)
      });
    });

    socket.on("userTyping", ({ userId, groupId }: any) => {
      const { selectedUser, selectedGroup } = get();
      if ((selectedGroup && groupId === selectedGroup._id) || (selectedUser && userId === selectedUser._id && !groupId)) {
        set({ typingUsers: [...new Set([...get().typingUsers, userId])] });
      }
    });

    socket.on("userStoppedTyping", ({ userId }: any) => {
      set({ typingUsers: get().typingUsers.filter(id => id !== userId) });
    });

    socket.on("userRecordingAudio", ({ userId, groupId }: any) => {
      const { selectedUser, selectedGroup } = get();
      if ((selectedGroup && groupId === selectedGroup._id) || (selectedUser && userId === selectedUser._id && !groupId)) {
        set({ recordingAudioUsers: [...new Set([...get().recordingAudioUsers, userId])] });
      }
    });

    socket.on("userStoppedRecordingAudio", ({ userId }: any) => {
      set({ recordingAudioUsers: get().recordingAudioUsers.filter(id => id !== userId) });
    });

    socket.on("messageDeleted", (messageId: any) => {
      set({ messages: get().messages.filter(m => m._id !== messageId) });
    });

    socket.on("chatCleared", ({ targetId, isGroup }: any) => {
      const { selectedUser, selectedGroup } = get();
      const isCurrentChat = isGroup
        ? selectedGroup?._id === targetId
        : (selectedUser?._id === targetId || selectedUser?._id?.toString() === targetId?.toString());
      if (isCurrentChat) {
        set({ messages: [] });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket?.off("newMessage");
    socket?.off("newGroupMessage");
    socket?.off("pollUpdated");
    socket?.off("messageUpdated");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
    socket.off("userRecordingAudio");
    socket.off("userStoppedRecordingAudio");
    socket.off("messageDeleted");
    socket.off("chatCleared");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, selectedGroup: null, typingUsers: [], recordingAudioUsers: [], replyingToMessage: null }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup, selectedUser: null, typingUsers: [], recordingAudioUsers: [], replyingToMessage: null }),

  votePoll: async (messageId: string, optionIndex: number) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/vote`, { optionIndex });
      set({
        messages: get().messages.map(m => m._id === messageId ? res.data : m)
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to vote on poll");
    }
  },

  setEditingMessage: (msg) => set({ editingMessage: msg }),
  setReplyingToMessage: (msg) => set({ replyingToMessage: msg }),

  pinMessage: async (messageId: string) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/pin`);
      set({
        messages: get().messages.map(m => m._id === messageId ? res.data : m)
      });
      toast.success(res.data.isPinned ? "Message pinned" : "Message unpinned");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pin message");
    }
  },

  editMessage: async (messageId: string, text: string) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/edit`, { text });
      set({
        messages: get().messages.map(m => m._id === messageId ? res.data : m),
        editingMessage: null
      });
      toast.success("Message edited successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  reactToMessage: async (messageId: string, emoji: string) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/react`, { emoji });
      set({
        messages: get().messages.map(m => m._id === messageId ? res.data : m)
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to react to message");
    }
  },

  deleteMessageForMe: async (messageId: string) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}/me`);
      set({ messages: get().messages.filter(m => m._id !== messageId) });
      toast.success("Message deleted for you");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  deleteMessageForEveryone: async (messageId: string) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}/everyone`);
      // No need to set messages here, the socket event handles it
      toast.success("Message deleted for everyone");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete message for everyone");
    }
  },

  forwardMessage: async (messageData: any, recipients: { id: string, isGroup: boolean }[]) => {
    try {
      for (const r of recipients) {
        const endpoint = r.isGroup ? `/messages/send-group/${r.id}` : `/messages/send/${r.id}`;
        await axiosInstance.post(endpoint, { ...messageData, isForwarded: true });
      }
      toast.success("Messages forwarded successfully");
    } catch (error) {
      toast.error((error as any).response?.data?.message || "Error forwarding message");
    }
  },

  toggleStarMessage: async (messageId: string) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/star`);
      // Update the message in the current chat
      const { messages } = get();
      const updatedMessages = messages.map(msg =>
        msg._id === messageId ? res.data : msg
      );
      set({ messages: updatedMessages });
      // Always refresh the starred list so the sidebar reflects changes
      const starredRes = await axiosInstance.get("/messages/starred");
      set({ starredMessages: starredRes.data });
      const isNowStarred = res.data.starredBy?.length > 0;
      toast.success(isNowStarred ? "⭐ Message starred" : "Message unstarred");
    } catch (error) {
      toast.error((error as any).response?.data?.message || "Error starring message");
    }
  },

  getStarredMessages: async () => {
    try {
      const res = await axiosInstance.get("/messages/starred");
      set({ starredMessages: res.data });
    } catch (error) {
      toast.error("Failed to fetch starred messages");
    }
  }
}));