import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface VoiceMessageProps {
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}

export default function VoiceMessage({ audioUrl, duration, isMe }: VoiceMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isMe ? "rgba(255, 255, 255, 0.4)" : "rgba(100, 100, 100, 0.3)",
      progressColor: isMe ? "#ffffff" : "var(--fallback-p,oklch(var(--p)/1))",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 30,
      url: audioUrl,
    });

    const ws = wavesurferRef.current;

    ws.on("ready", () => {
      setIsReady(true);
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    
    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    return () => {
      ws.destroy();
    };
  }, [audioUrl, isMe]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // If duration is passed from backend, use it before audio loads, otherwise use loaded duration or 0
  const displayDuration = duration || (wavesurferRef.current ? wavesurferRef.current.getDuration() : 0);

  return (
    <div className={`flex items-center gap-4 p-2 rounded-2xl w-full min-w-[220px] max-w-[320px] backdrop-blur-sm transition-all duration-300 ${
      isMe ? "bg-primary-content/10 shadow-inner" : "bg-base-content/5 shadow-inner"
    }`}>
      <button 
        onClick={togglePlay}
        disabled={!isReady}
        className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
          isMe ? "bg-primary-content text-primary hover:bg-white" : "bg-primary text-primary-content hover:brightness-110"
        } ${!isReady ? "opacity-50 cursor-wait shadow-none scale-95" : "hover:scale-110 active:scale-95"}`}
      >
        {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div ref={containerRef} className="w-full h-[35px] cursor-pointer opacity-90 hover:opacity-100 transition-opacity relative overflow-hidden" />
        <div className={`text-[10px] mt-1.5 font-bold tracking-wider font-mono ${isMe ? "text-primary-content/80" : "text-base-content/50"}`}>
          {isPlaying ? formatTime(currentTime) : formatTime(displayDuration)}
        </div>
      </div>
    </div>
  );
}
