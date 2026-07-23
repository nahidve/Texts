import { useEffect, useRef, useState } from "react";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

export const CallUI = () => {
  const {
    callState,
    callType,
    remoteUser,
    activeGroup,
    localStream,
    remoteStreams,
    isMicMuted,
    isVideoMuted,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMic,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (callState === "connected") {
      const timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCallDuration(0);
    }
  }, [callState]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  if (callState === "idle" || (!remoteUser && !activeGroup)) return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const callerName = activeGroup ? activeGroup.name : remoteUser?.fullName;
  const callerAvatar = activeGroup ? activeGroup.avatar || "/avatar.png" : remoteUser?.profilePic || "/avatar.png";

  const requestPIP = () => {
    // Optional: If we want native PIP
    if (localVideoRef.current && document.pictureInPictureEnabled) {
      localVideoRef.current.requestPictureInPicture().catch(e => console.log(e));
    }
  };

  // 1. Incoming Call Screen
  if (callState === "incoming") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in zoom-in duration-200">
        <div className="bg-base-100 rounded-2xl p-8 flex flex-col items-center shadow-2xl max-w-sm w-full border border-base-300">
          <div className="relative mb-6">
            <div className="size-24 rounded-full overflow-hidden border-4 border-base-300 animate-pulse">
              <img src={callerAvatar} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-base-200 p-2 rounded-full border border-base-300 shadow-lg">
              {callType === "video" ? <Video className="size-5 text-primary" /> : <Phone className="size-5 text-primary" />}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">{callerName}</h2>
          <p className="text-base-content/60 mb-8">Incoming {callType} call...</p>

          <div className="flex gap-6 w-full justify-center">
            <button
              onClick={rejectCall}
              className="btn btn-error btn-circle btn-lg shadow-lg hover:scale-105 transition-transform"
            >
              <PhoneOff className="size-7 text-white" />
            </button>
            <button
              onClick={acceptCall}
              className="btn btn-success btn-circle btn-lg shadow-lg hover:scale-105 transition-transform animate-bounce"
            >
              {callType === "video" ? <Video className="size-7 text-white" /> : <Phone className="size-7 text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Outgoing Call Screen (Calling / Ringing)
  if (callState === "calling" || callState === "ringing") {
    return (
      <div className="fixed inset-0 bg-base-300/90 backdrop-blur-md z-[9999] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="size-32 rounded-full overflow-hidden mb-6 relative border-4 border-primary/30 shadow-2xl">
            <img src={callerAvatar} alt="avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full"></div>
          </div>
          <h2 className="text-3xl font-bold mb-2 text-base-content">{callerName}</h2>
          <p className="text-xl text-base-content/70 mb-12 animate-pulse">Calling...</p>

          <button
            onClick={cancelCall}
            className="btn btn-error btn-circle btn-lg shadow-2xl hover:scale-110 transition-transform"
          >
            <PhoneOff className="size-8 text-white" />
          </button>
        </div>
      </div>
    );
  }

  const remoteStreamsList = Object.entries(remoteStreams);
  const isGroup = !!activeGroup;

  // 3. Connected Call Screen
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Media Streams */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex items-center justify-center bg-base-300 p-4">
        {callType === "video" ? (
          <div className={`w-full h-full grid gap-4 ${remoteStreamsList.length > 1 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Remote Streams */}
            {remoteStreamsList.map(([id, stream]) => (
              <div key={id} className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-lg border border-base-100">
                <VideoComponent stream={stream} />
              </div>
            ))}

            {/* Local Video - Floating PIP if 1-on-1, or Grid Item if group */}
            {!isGroup || remoteStreamsList.length === 0 ? (
              <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] bg-base-100 rounded-xl overflow-hidden shadow-2xl border-2 border-base-300 z-10 transition-transform hover:scale-105">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-lg border border-base-100">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs font-semibold">You</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className={`grid gap-8 ${remoteStreamsList.length > 1 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
              {/* Visual Avatar representation for audio calls */}
              <div className="flex flex-col items-center">
                <div className="size-32 rounded-full overflow-hidden border-4 border-primary shadow-2xl mb-4 relative">
                  <img src={callerAvatar} alt="avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full pointer-events-none"></div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
              </div>

              {remoteStreamsList.map(([id, stream]) => (
                <div key={id} className="flex flex-col items-center">
                  <div className="size-32 rounded-full overflow-hidden border-4 border-secondary shadow-2xl mb-4 relative">
                    <img src="/avatar.png" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <VideoComponent stream={stream} audioOnly />
                </div>
              ))}
            </div>

            <p className="text-xl text-white/70 font-mono bg-black/40 px-4 py-1 rounded-full mt-12">{formatDuration(callDuration)}</p>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-24 bg-base-100/90 backdrop-blur-lg flex items-center justify-center gap-6 px-8 border-t border-base-300">
        <button
          onClick={toggleMic}
          className={`btn btn-circle btn-lg shadow-md hover:scale-105 transition-transform ${isMicMuted ? 'btn-error' : 'btn-neutral'}`}
        >
          {isMicMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleVideo}
            className={`btn btn-circle btn-lg shadow-md hover:scale-105 transition-transform ${isVideoMuted ? 'btn-error' : 'btn-neutral'}`}
          >
            {isVideoMuted ? <VideoOff className="size-6" /> : <Video className="size-6" />}
          </button>
        )}

        {callType === "video" && !isGroup && (
          <button onClick={requestPIP} className="btn btn-neutral btn-circle btn-lg shadow-md hover:scale-105 transition-transform hidden sm:flex">
            <Maximize className="size-6" />
          </button>
        )}

        <button
          onClick={endCall}
          className="btn btn-error btn-circle btn-lg w-16 h-16 shadow-lg hover:scale-110 transition-transform"
        >
          <PhoneOff className="size-7 text-white" />
        </button>
      </div>
    </div>
  );
};

const VideoComponent = ({ stream, audioOnly = false }: { stream: MediaStream, audioOnly?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  if (audioOnly) {
    return <video ref={ref} autoPlay playsInline className="hidden" />;
  }
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
};
