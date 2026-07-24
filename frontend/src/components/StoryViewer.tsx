import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Send, Smile, Heart } from 'lucide-react';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';
import EmojiPicker from 'emoji-picker-react';

interface StoryViewerProps {
  userGroups: Array<{ user: any; stories: any[] }>;
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per image story

const StoryViewer: React.FC<StoryViewerProps> = ({ userGroups, initialGroupIndex, onClose }) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [reactionText, setReactionText] = useState("");

  const { viewStory, reactToStory } = useStoryStore();
  const { authUser } = useAuthStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentGroup = userGroups[groupIndex];
  const currentStory = currentGroup.stories[storyIndex];
  const isMe = currentGroup.user._id === authUser?._id;

  const handleNext = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (groupIndex < userGroups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup.stories.length, userGroups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      setStoryIndex(userGroups[groupIndex - 1].stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, userGroups]);

  // Mark as viewed when story changes
  useEffect(() => {
    if (currentStory && !isMe) {
      const hasViewed = currentStory.viewers.some((v: any) => v._id === authUser?._id);
      if (!hasViewed) {
        viewStory(currentStory._id);
      }
    }
  }, [currentStory, isMe, viewStory, authUser]);

  // Progress logic
  useEffect(() => {
    if (isPaused || showViewers || showReactions) return;

    if (currentStory.mediaType === 'video' && videoRef.current) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        if (video.duration) {
          setProgress((video.currentTime / video.duration) * 100);
        }
      };

      const handleEnded = () => {
        handleNext();
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    } else {
      const interval = 50; // Update every 50ms
      const step = (interval / STORY_DURATION) * 100;

      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 100;
          }
          return prev + step;
        });
      }, interval);

      return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
    }
  }, [currentStory, isPaused, showViewers, showReactions, handleNext]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    if (currentStory.mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  }, [currentStory]);

  const sendReaction = (emoji: string) => {
    reactToStory(currentStory._id, emoji);
    setShowReactions(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
      
      {/* Main Container */}
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[90vh] bg-base-200 sm:rounded-2xl overflow-hidden flex flex-col">
        
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 w-full p-3 flex gap-1 z-20 bg-gradient-to-b from-black/50 to-transparent">
          {currentGroup.stories.map((story, idx) => (
            <div key={story._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ 
                  width: idx === storyIndex ? `${progress}%` : idx < storyIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 w-full p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <img src={currentGroup.user.profilePic || "/avatar.png"} className="w-10 h-10 rounded-full border border-white/20" alt="" />
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">{isMe ? "Your story" : currentGroup.user.fullName}</span>
              <span className="text-white/70 text-xs">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white p-2 bg-black/20 rounded-full hover:bg-black/40">
            <X size={20} />
          </button>
        </div>

        {/* Media Area (Tap to skip, hold to pause) */}
        <div 
          className="flex-1 relative flex items-center justify-center bg-black"
          onPointerDown={(e) => {
            // Ignore if clicking on UI elements
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setIsPaused(true);
            if (videoRef.current) videoRef.current.pause();
          }}
          onPointerUp={(e) => {
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setIsPaused(false);
            if (videoRef.current) videoRef.current.play();
            
            // Handle Tap (left 30% = prev, right 70% = next)
            const x = e.clientX;
            const width = window.innerWidth;
            if (x < width * 0.3) {
              handlePrev();
            } else {
              handleNext();
            }
          }}
          onPointerLeave={() => {
            setIsPaused(false);
            if (videoRef.current) videoRef.current.play();
          }}
        >
          {currentStory.mediaType === 'video' ? (
            <video 
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={false}
            />
          ) : (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story" 
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          )}

          {/* Desktop Nav Buttons */}
          <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="story-ui absolute left-2 p-2 text-white/50 hover:text-white bg-black/20 rounded-full hover:bg-black/50 hidden sm:block">
            <ChevronLeft size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="story-ui absolute right-2 p-2 text-white/50 hover:text-white bg-black/20 rounded-full hover:bg-black/50 hidden sm:block">
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Footer (Reactions/Viewers) */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent story-ui z-20">
          {isMe ? (
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/20 transition"
              >
                <Eye size={18} />
                <span className="font-medium text-sm">{currentStory.viewers.length} Viewers</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => sendReaction("❤️")}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:text-red-500 transition-colors"
                title="Send Love"
              >
                <Heart size={20} className="fill-current" />
              </button>
              <button 
                onClick={() => setShowReactions(!showReactions)}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                title="More Reactions"
              >
                <Smile size={20} />
              </button>
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder={`Reply to ${currentGroup.user.fullName.split(' ')[0]}...`}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 text-sm text-white placeholder-white/70 focus:outline-none focus:border-white"
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reactionText) {
                      sendReaction(reactionText);
                      setReactionText("");
                    }
                  }}
                />
                {reactionText && (
                  <button 
                    onClick={() => { sendReaction(reactionText); setReactionText(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-full text-white"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 z-[110] bg-base-100 rounded-t-3xl sm:rounded-2xl w-full sm:w-80 max-h-[60vh] flex flex-col shadow-2xl story-ui animate-in slide-in-from-bottom-full sm:slide-in-from-right-8">
          <div className="p-4 border-b border-base-300 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><Eye size={18} /> Viewed by {currentStory.viewers.length}</h3>
            <button onClick={() => setShowViewers(false)} className="p-1 hover:bg-base-200 rounded-full"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {currentStory.viewers.length === 0 ? (
              <div className="text-center py-8 text-base-content/50 text-sm">No views yet</div>
            ) : (
              currentStory.viewers.map((viewer: any) => (
                <div key={viewer._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-lg">
                  <img src={viewer.profilePic || "/avatar.png"} className="w-10 h-10 rounded-full" alt="" />
                  <span className="font-medium text-sm">{viewer.fullName}</span>
                  {/* Show reaction if this viewer reacted */}
                  {currentStory.reactions?.find((r: any) => r.userId._id === viewer._id) && (
                    <span className="ml-auto text-xl">
                      {currentStory.reactions.find((r: any) => r.userId._id === viewer._id).emoji}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Reactions */}
      {showReactions && !isMe && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[110] story-ui animate-in fade-in zoom-in-95">
          <EmojiPicker 
            onEmojiClick={(e) => sendReaction(e.emoji)} 
            theme={"dark" as any}
            skinTonesDisabled
          />
        </div>
      )}

    </div>
  );
};

export default StoryViewer;
