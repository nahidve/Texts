import React, { useEffect } from 'react';
import { X, Clock, Play } from 'lucide-react';
import { useStoryStore } from '../store/useStoryStore';

interface StoryArchiveModalProps {
  onClose: () => void;
}

const StoryArchiveModal: React.FC<StoryArchiveModalProps> = ({ onClose }) => {
  const { archivedStories, fetchArchivedStories, isLoading } = useStoryStore();

  useEffect(() => {
    fetchArchivedStories();
  }, [fetchArchivedStories]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-base-300 flex justify-between items-center bg-base-200/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="text-primary" /> Story Archive
            </h2>
            <p className="text-sm text-base-content/60 mt-1">Only you can see your archived stories.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-base-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : archivedStories.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mb-4">
                <Clock size={32} className="text-base-content/30" />
              </div>
              <h3 className="font-semibold text-lg">No archived stories</h3>
              <p className="text-base-content/50 text-sm max-w-sm mt-2">
                Stories will automatically appear here after they expire (24 hours after posting).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {archivedStories.map((story) => (
                <div key={story._id} className="relative aspect-[9/16] bg-base-300 rounded-xl overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  {story.mediaType === 'video' ? (
                    <>
                      <video src={story.mediaUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Play className="text-white drop-shadow-md" size={24} fill="currentColor" />
                      </div>
                    </>
                  ) : (
                    <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/60 to-transparent">
                    <span className="text-white text-xs font-medium drop-shadow-md">
                      {new Date(story.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Viewers/Reactions Info */}
                  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <Eye size={12} /> {story.viewers.length}
                    </div>
                    {story.reactions.length > 0 && (
                      <div className="flex -space-x-1">
                        {story.reactions.slice(0, 3).map((r: any, i) => (
                          <span key={i} className="text-xs bg-black/50 rounded-full border border-white/20 w-4 h-4 flex items-center justify-center">{r.emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Assuming Eye is missing from imports above, let's add it
import { Eye } from 'lucide-react';

export default StoryArchiveModal;
