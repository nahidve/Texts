import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

type Story = {
  _id: string;
  userId: any; // User object populated
  mediaUrl: string;
  mediaType: "image" | "video";
  expiresAt: string;
  viewers: any[];
  reactions: any[];
  createdAt: string;
};

type StoryStore = {
  activeStories: Story[];
  archivedStories: Story[];
  isUploading: boolean;
  isLoading: boolean;
  
  fetchActiveStories: () => Promise<void>;
  fetchArchivedStories: () => Promise<void>;
  uploadStory: (media: string, mediaType: "image" | "video") => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;
  subscribeToStories: () => void;
  unsubscribeFromStories: () => void;
};

export const useStoryStore = create<StoryStore>((set) => ({
  activeStories: [],
  archivedStories: [],
  isUploading: false,
  isLoading: false,

  fetchActiveStories: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/stories/active");
      set({ activeStories: res.data });
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchArchivedStories: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/stories/archived");
      set({ archivedStories: res.data });
    } catch (error) {
      console.error("Error fetching archived stories:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  uploadStory: async (media, mediaType) => {
    set({ isUploading: true });
    try {
      await axiosInstance.post("/stories/upload", { media, mediaType });
      // The socket event will handle adding it to activeStories, 
      // but we can add it optimistically too.
      toast.success("Story uploaded!");
    } catch (error) {
      console.error("Error uploading story:", error);
      toast.error("Failed to upload story");
    } finally {
      set({ isUploading: false });
    }
  },

  viewStory: async (storyId) => {
    try {
      await axiosInstance.post(`/stories/${storyId}/view`);
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  },

  reactToStory: async (storyId, emoji) => {
    try {
      await axiosInstance.post(`/stories/${storyId}/react`, { emoji });
      toast.success("Reaction sent!");
    } catch (error) {
      console.error("Error reacting to story:", error);
      toast.error("Failed to react to story");
    }
  },

  subscribeToStories: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newStory", (story: Story) => {
      set((state) => ({
        activeStories: [story, ...state.activeStories],
      }));
    });

    socket.on("storyViewed", ({ storyId, viewerId }: { storyId: string, viewerId: string }) => {
      set((state) => ({
        activeStories: state.activeStories.map(s => 
          s._id === storyId 
            ? { ...s, viewers: [...s.viewers, { _id: viewerId }] }
            : s
        )
      }));
    });

    socket.on("storyReacted", ({ storyId, reaction }: { storyId: string, reaction: any }) => {
      set((state) => ({
        activeStories: state.activeStories.map(s => {
          if (s._id !== storyId) return s;
          const existingIndex = s.reactions.findIndex((r: any) => r.userId._id === reaction.userId._id);
          const newReactions = [...s.reactions];
          if (existingIndex > -1) {
            newReactions[existingIndex] = reaction;
          } else {
            newReactions.push(reaction);
          }
          return { ...s, reactions: newReactions };
        })
      }));
    });
  },

  unsubscribeFromStories: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("newStory");
    socket.off("storyViewed");
    socket.off("storyReacted");
  }
}));
