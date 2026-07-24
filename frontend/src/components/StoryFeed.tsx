import React, { useEffect, useState, useRef } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';
import toast from 'react-hot-toast';

const StoryFeed = () => {
  const { activeStories, fetchActiveStories, subscribeToStories, unsubscribeFromStories, uploadStory, isUploading } = useStoryStore();
  const { authUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchActiveStories();
    subscribeToStories();
    return () => unsubscribeFromStories();
  }, [fetchActiveStories, subscribeToStories, unsubscribeFromStories]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      await uploadStory(reader.result as string, isVideo ? "video" : "image");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Group stories by user
  const groupedStories = activeStories.reduce((acc, story) => {
    const userId = story.userId._id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.userId,
        stories: []
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {} as Record<string, { user: any, stories: any[] }>);

  // Sort: current user first, then others
  const usersWithStories = Object.values(groupedStories).sort((a, b) => {
    if (a.user._id === authUser?._id) return -1;
    if (b.user._id === authUser?._id) return 1;
    return 0;
  });

  return (
    <>
      <div className="flex gap-4 p-2 overflow-x-auto no-scrollbar items-center">
        
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="relative">
            <img 
              src={authUser?.profilePic || "/avatar.png"} 
              alt="You" 
              className={`w-14 h-14 rounded-full object-cover p-[2px] ${isUploading ? 'opacity-50' : 'ring-2 ring-base-300'}`}
            />
            <div className="absolute bottom-0 right-0 bg-primary text-primary-content rounded-full p-0.5 border-2 border-base-100">
              <Plus size={14} strokeWidth={3} />
            </div>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="loading loading-spinner loading-xs text-primary"></span>
              </div>
            )}
          </div>
          <span className="text-xs text-base-content/70 font-medium">Your story</span>
        </div>
        
        <input 
          type="file" 
          accept="image/*,video/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />

        {/* Story Rings */}
        {usersWithStories.map((group, index) => {
          // Check if all stories are viewed by me
          const allViewed = group.stories.every(s => s.viewers.some((v: any) => v._id === authUser?._id));
          const isMe = group.user._id === authUser?._id;

          return (
            <div 
              key={group.user._id} 
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              onClick={() => setSelectedStoryIndex(index)}
            >
              <div className={`p-[2px] rounded-full transition-transform group-hover:scale-105 ${allViewed ? 'bg-base-300' : 'bg-gradient-to-tr from-primary to-secondary'}`}>
                <div className="bg-base-100 rounded-full p-[2px]">
                  <img 
                    src={group.user.profilePic || "/avatar.png"} 
                    alt={group.user.fullName} 
                    className="w-13 h-13 rounded-full object-cover"
                    style={{ width: '52px', height: '52px' }}
                  />
                </div>
              </div>
              <span className="text-xs text-base-content/70 font-medium w-16 truncate text-center">
                {isMe ? "You" : group.user.fullName.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {selectedStoryIndex !== null && (
        <StoryViewer 
          userGroups={usersWithStories}
          initialGroupIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
        />
      )}
    </>
  );
};

export default StoryFeed;
