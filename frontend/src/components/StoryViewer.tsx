import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Send, Smile, Heart, MoreVertical, Loader2 } from 'lucide-react';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';
import EmojiPicker from 'emoji-picker-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

interface StoryViewerProps {
  userGroups: Array<{ user: any; stories: any[] }>;
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per image story

const StoryViewer: React.FC<StoryViewerProps> = ({ userGroups, initialGroupIndex, onClose }) => {
  const { viewStory, reactToStory } = useStoryStore();
  const { authUser } = useAuthStore();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(() => {
    const group = userGroups[initialGroupIndex];
    if (group.user._id === authUser?._id) return 0;
    const firstUnviewed = group.stories.findIndex((s) => !s.viewers.some((v: any) => v._id === authUser?._id));
    return firstUnviewed === -1 ? 0 : firstUnviewed;
  });
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reactionText, setReactionText] = useState("");
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentGroup = userGroups[groupIndex];
  const currentStory = currentGroup.stories[storyIndex];
  const isMe = currentGroup.user._id === authUser?._id;

  const handleNext = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
      setIsMediaLoading(true);
    } else if (groupIndex < userGroups.length - 1) {
      const nextGroup = userGroups[groupIndex + 1];
      const isMeNext = nextGroup.user._id === authUser?._id;
      let nextIndex = 0;
      if (!isMeNext) {
        const firstUnviewed = nextGroup.stories.findIndex((s) => !s.viewers.some((v: any) => v._id === authUser?._id));
        nextIndex = firstUnviewed === -1 ? 0 : firstUnviewed;
      }
      setDirection('right');
      setGroupIndex(prev => prev + 1);
      setStoryIndex(nextIndex);
      setProgress(0);
      setIsMediaLoading(true);
    } else {
      onClose();
    }
  }, [storyIndex, groupIndex, currentGroup.stories.length, userGroups, authUser, onClose]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
      setIsMediaLoading(true);
    } else if (groupIndex > 0) {
      setDirection('left');
      setGroupIndex(prev => prev - 1);
      setStoryIndex(userGroups[groupIndex - 1].stories.length - 1);
      setProgress(0);
      setIsMediaLoading(true);
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
    if (isPaused || showViewers || showReactions || isMediaLoading || showMoreMenu) return;

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

      // In case video is paused incorrectly, ensure it plays
      video.play().catch(() => {});

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
  }, [currentStory, isPaused, showViewers, showReactions, showMoreMenu, isMediaLoading, handleNext]);

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

  const sendReply = async (text: string) => {
    try {
      await axiosInstance.post(`/messages/send/${currentGroup.user._id}`, { text: `Replying to story: ${text}` });
      toast.success("Reply sent!");
      onClose(); // Optional: close viewer on reply like WhatsApp, or just leave it open
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  // Determine next story for preloading
  let nextStoryToPreload = null;
  if (storyIndex < currentGroup.stories.length - 1) {
    nextStoryToPreload = currentGroup.stories[storyIndex + 1];
  } else if (groupIndex < userGroups.length - 1) {
    nextStoryToPreload = userGroups[groupIndex + 1].stories[0];
  }

  const animationClass = direction === 'right' ? 'animate-in slide-in-from-right-12' : direction === 'left' ? 'animate-in slide-in-from-left-12' : '';

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
      
      {/* Main Container */}
      <div 
        key={`${groupIndex}-${storyIndex}`} 
        className={`relative w-full h-[100dvh] sm:max-w-[400px] sm:h-[80vh] bg-black sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col ${animationClass}`}
      >
        {/* Preload next media */}
        {nextStoryToPreload && (
          <link rel="preload" href={nextStoryToPreload.mediaUrl} as={nextStoryToPreload.mediaType === 'video' ? 'video' : 'image'} />
        )}

        {/* Progress Bars */}
        <div className="absolute top-0 left-0 w-full p-3 pt-4 flex gap-1 z-30 bg-gradient-to-b from-black/60 via-black/30 to-transparent">
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
        <div className="absolute top-7 left-0 w-full px-4 py-2 flex justify-between items-center z-30">
          <div className="flex items-center gap-3">
            <img src={currentGroup.user.profilePic || "/avatar.png"} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm drop-shadow-md">{isMe ? "Your story" : currentGroup.user.fullName}</span>
              <span className="text-white/80 text-xs drop-shadow-md">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative story-ui">
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="text-white p-2 rounded-full hover:bg-white/20 transition">
                <MoreVertical size={20} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-base-100 rounded-xl shadow-2xl overflow-hidden z-[120] animate-in fade-in zoom-in-95">
                  <button onClick={() => setShowMoreMenu(false)} className="w-full text-left px-4 py-3 text-sm hover:bg-base-200">Mute {currentGroup.user.fullName}</button>
                  {isMe && <button onClick={() => setShowMoreMenu(false)} className="w-full text-left px-4 py-3 text-sm hover:bg-base-200 text-red-500">Delete Story</button>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-white p-2 bg-black/20 rounded-full hover:bg-black/40 transition story-ui">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Media Area (Tap to skip, hold to pause, swipe) */}
        <div 
          className="flex-1 relative flex items-center justify-center bg-black"
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            setIsPaused(true);
            if (videoRef.current) videoRef.current.pause();
          }}
          onTouchMove={(e) => {
            if (!touchStart) return;
            const y = e.touches[0].clientY;
            // Immediate close if heavily pulled down
            if (y - touchStart.y > 150) {
              onClose();
              setTouchStart(null);
            }
          }}
          onTouchEnd={(e) => {
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setIsPaused(false);
            if (videoRef.current && !isMediaLoading) videoRef.current.play();

            if (!touchStart) return;
            const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            const deltaX = touchEnd.x - touchStart.x;
            const deltaY = touchEnd.y - touchStart.y;
            
            // Swipe down to close
            if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
              onClose();
              return;
            }

            // Swipe left/right for users
            if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0 && groupIndex < userGroups.length - 1) { // Swipe left -> next user
                setDirection('right');
                setGroupIndex(prev => prev + 1);
                setStoryIndex(0);
                setProgress(0);
                setIsMediaLoading(true);
              } else if (deltaX > 0 && groupIndex > 0) { // Swipe right -> prev user
                setDirection('left');
                setGroupIndex(prev => prev - 1);
                setStoryIndex(userGroups[groupIndex - 1].stories.length - 1);
                setProgress(0);
                setIsMediaLoading(true);
              }
              setTouchStart(null);
              return;
            }

            // Tap to navigate (if not a swipe)
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
              const x = touchEnd.x;
              const width = window.innerWidth;
              if (x < width * 0.3) handlePrev();
              else handleNext();
            }
            setTouchStart(null);
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setIsPaused(true);
            if (videoRef.current) videoRef.current.pause();
          }}
          onMouseUp={(e) => {
            if ((e.target as HTMLElement).closest('.story-ui')) return;
            setIsPaused(false);
            if (videoRef.current && !isMediaLoading) videoRef.current.play();
            
            const x = e.clientX;
            const width = window.innerWidth;
            if (x < width * 0.3) handlePrev();
            else handleNext();
          }}
          onMouseLeave={() => {
            setIsPaused(false);
            if (videoRef.current && !isMediaLoading) videoRef.current.play();
          }}
        >
          {isMediaLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}

          {currentStory.mediaType === 'video' ? (
            <video 
              ref={videoRef}
              src={currentStory.mediaUrl}
              className={`w-full h-full object-contain ${isMediaLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              autoPlay
              playsInline
              muted={false}
              onLoadedData={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
            />
          ) : (
            <img 
              src={currentStory.mediaUrl} 
              alt="Story" 
              className={`w-full h-full object-contain select-none ${isMediaLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              draggable={false}
              onLoad={() => setIsMediaLoading(false)}
              onError={() => setIsMediaLoading(false)}
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
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reactionText) {
                      sendReply(reactionText);
                      setReactionText("");
                    }
                  }}
                />
                {reactionText && (
                  <button 
                    onClick={() => { sendReply(reactionText); setReactionText(""); }}
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
