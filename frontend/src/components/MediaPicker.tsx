import React, { useState, useEffect } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import EmojiPicker from 'emoji-picker-react';
import { STICKER_PACKS } from '../lib/stickers';
import { Clock, Search, X } from 'lucide-react';

// Initialize with environment variable or fallback to public SDK Key
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'sXpGFDGZs0Dv1mm8314F2vlJp8p4K101';
const gf = new GiphyFetch(GIPHY_API_KEY);

interface MediaPickerProps {
  onSelect: (url: string, type: 'gif' | 'sticker' | 'emoji') => void;
  onClose: () => void;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'gif' | 'sticker' | 'emoji'>('gif');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [activeStickerPack, setActiveStickerPack] = useState(STICKER_PACKS[0].id);

  useEffect(() => {
    const saved = localStorage.getItem('recent_stickers');
    if (saved) {
      setRecentStickers(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStickerClick = (url: string) => {
    const newRecent = [url, ...recentStickers.filter(s => s !== url)].slice(0, 10);
    setRecentStickers(newRecent);
    localStorage.setItem('recent_stickers', JSON.stringify(newRecent));
    onSelect(url, 'sticker');
  };

  const fetchGifs = (offset: number) => {
    if (debouncedQuery) {
      return gf.search(debouncedQuery, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  return (
    <div className="absolute bottom-full right-0 sm:left-4 mb-2 z-50 w-full sm:w-[320px] max-w-sm bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[400px]">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-base-300 p-2">
        <div className="flex gap-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'gif' ? 'bg-primary/20 text-primary' : 'hover:bg-base-200 text-base-content/70'}`}
            onClick={() => setActiveTab('gif')}
          >
            GIFs
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'sticker' ? 'bg-primary/20 text-primary' : 'hover:bg-base-200 text-base-content/70'}`}
            onClick={() => setActiveTab('sticker')}
          >
            Stickers
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'emoji' ? 'bg-primary/20 text-primary' : 'hover:bg-base-200 text-base-content/70'}`}
            onClick={() => setActiveTab('emoji')}
          >
            Emojis
          </button>
        </div>
        <button type="button" onClick={onClose} className="p-1 hover:bg-base-200 rounded-full text-base-content/50 hover:text-base-content">
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'gif' && (
          <div className="flex flex-col h-full bg-base-100">
            <div className="p-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search Tenor..."
                  className="w-full bg-base-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <Grid
                key={debouncedQuery}
                width={300}
                columns={2}
                gutter={6}
                fetchGifs={fetchGifs}
                onGifClick={(gif, e) => {
                  e.preventDefault();
                  onSelect(gif.images.original.url, 'gif');
                }}
                noLink
              />
            </div>
          </div>
        )}

        {activeTab === 'sticker' && (
          <div className="flex flex-col h-full">
            {/* Sticker Packs Tabs */}
            <div className="flex gap-2 overflow-x-auto p-2 border-b border-base-200 no-scrollbar">
              <button
                type="button"
                className={`flex items-center gap-1 shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeStickerPack === 'recent' ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300 text-base-content/70'}`}
                onClick={() => setActiveStickerPack('recent')}
              >
                <Clock size={12} />
                Recent
              </button>
              {STICKER_PACKS.map(pack => (
                <button
                  key={pack.id}
                  type="button"
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeStickerPack === pack.id ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300 text-base-content/70'}`}
                  onClick={() => setActiveStickerPack(pack.id)}
                >
                  {pack.name}
                </button>
              ))}
            </div>
            
            {/* Sticker Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeStickerPack === 'recent' ? (
                <div className="grid grid-cols-4 gap-3">
                  {recentStickers.length > 0 ? recentStickers.map((url, i) => (
                    <button key={i} onClick={() => handleStickerClick(url)} className="aspect-square rounded-lg hover:bg-base-200 transition-colors p-1 flex items-center justify-center">
                      <img src={url} alt="Sticker" className="w-full h-full object-contain" />
                    </button>
                  )) : (
                    <div className="col-span-4 text-center text-sm text-base-content/50 mt-10">
                      No recent stickers
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {STICKER_PACKS.find(p => p.id === activeStickerPack)?.stickers.map((url, i) => (
                    <button key={i} onClick={() => handleStickerClick(url)} className="aspect-square rounded-lg hover:bg-base-200 transition-colors p-1 flex items-center justify-center">
                      <img src={url} alt="Sticker" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'emoji' && (
          <div className="h-full w-full custom-emoji-picker">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onSelect(emojiData.emoji, 'emoji');
              }}
              theme={"dark" as any}
              width="100%"
              height="100%"
              skinTonesDisabled
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPicker;
