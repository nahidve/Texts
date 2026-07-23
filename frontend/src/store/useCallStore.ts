import { create } from "zustand";
import { webrtcManager } from "../lib/webrtc";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

type CallState = "idle" | "calling" | "ringing" | "incoming" | "connected";

interface CallStore {
  callState: CallState;
  callType: "audio" | "video" | null;
  remoteUser: any | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  
  // Actions
  initiateCall: (user: any, type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  cancelCall: () => void;
  toggleMic: () => void;
  toggleVideo: () => void;
  setupSignaling: () => void;
  cleanup: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  callState: "idle",
  callType: null,
  remoteUser: null,
  localStream: null,
  remoteStream: null,
  isMicMuted: false,
  isVideoMuted: false,

  setupSignaling: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Avoid multiple listeners
    socket.off("CALL_INCOMING");
    socket.off("CALL_ACCEPTED");
    socket.off("CALL_REJECTED");
    socket.off("CALL_CANCELLED");
    socket.off("CALL_ENDED");
    socket.off("USER_BUSY");
    socket.off("WEBRTC_SIGNAL");

    socket.on("CALL_INCOMING", ({ callerId, callerInfo, callType }: any) => {
      const { callState } = get();
      if (callState !== "idle") {
        // We are busy, the backend should ideally catch this but just in case
        socket.emit("USER_BUSY", { receiverId: callerId });
        return;
      }
      set({ callState: "incoming", remoteUser: { _id: callerId, ...callerInfo }, callType });
    });

    socket.on("CALL_ACCEPTED", async ({ receiverId }: any) => {
      set({ callState: "connected" });
      const offer = await webrtcManager.createOffer();
      socket.emit("WEBRTC_SIGNAL", { targetId: receiverId, signalData: { type: "offer", offer } });
    });

    socket.on("CALL_REJECTED", () => {
      toast.error("Call declined");
      get().cleanup();
    });

    socket.on("CALL_CANCELLED", () => {
      get().cleanup();
    });

    socket.on("CALL_ENDED", () => {
      get().cleanup();
    });

    socket.on("USER_BUSY", () => {
      toast.error("User is busy on another call");
      get().cleanup();
    });

    socket.on("WEBRTC_SIGNAL", async ({ senderId, signalData }: any) => {
      if (signalData.type === "offer") {
        await webrtcManager.handleOffer(signalData.offer);
        const answer = await webrtcManager.createAnswer(signalData.offer);
        socket.emit("WEBRTC_SIGNAL", { targetId: senderId, signalData: { type: "answer", answer } });
      } else if (signalData.type === "answer") {
        await webrtcManager.handleAnswer(signalData.answer);
      } else if (signalData.type === "ice-candidate") {
        await webrtcManager.handleIceCandidate(signalData.candidate);
      }
    });

    // WebRTC Manager Callbacks
    webrtcManager.onIceCandidate = (candidate) => {
      const { remoteUser } = get();
      if (remoteUser) {
        socket.emit("WEBRTC_SIGNAL", { targetId: remoteUser._id, signalData: { type: "ice-candidate", candidate } });
      }
    };

    webrtcManager.onRemoteTrack = (stream) => {
      set({ remoteStream: stream });
    };
  },

  initiateCall: async (user, type) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (!socket || !authUser) return;

    try {
      const stream = await webrtcManager.getLocalStream(type === "video");
      set({ 
        callState: "calling", 
        callType: type, 
        remoteUser: user, 
        localStream: stream 
      });
      
      socket.emit("CALL_INITIATE", { 
        receiverId: user._id, 
        callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic },
        callType: type 
      });
    } catch (error) {
      toast.error("Could not access camera/microphone");
      get().cleanup();
    }
  },

  acceptCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { remoteUser, callType } = get();
    if (!socket || !remoteUser) return;

    try {
      const stream = await webrtcManager.getLocalStream(callType === "video");
      set({ callState: "connected", localStream: stream });
      socket.emit("CALL_ACCEPT", { callerId: remoteUser._id });
    } catch (error) {
      toast.error("Could not access camera/microphone");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const socket = useAuthStore.getState().socket;
    const { remoteUser } = get();
    if (socket && remoteUser) {
      socket.emit("CALL_REJECT", { callerId: remoteUser._id });
    }
    get().cleanup();
  },

  cancelCall: () => {
    const socket = useAuthStore.getState().socket;
    const { remoteUser } = get();
    if (socket && remoteUser) {
      socket.emit("CALL_CANCEL", { receiverId: remoteUser._id });
    }
    get().cleanup();
  },

  endCall: () => {
    const socket = useAuthStore.getState().socket;
    const { remoteUser } = get();
    if (socket && remoteUser) {
      socket.emit("CALL_END", { targetId: remoteUser._id });
    }
    get().cleanup();
  },

  toggleMic: () => {
    const { isMicMuted } = get();
    webrtcManager.toggleAudio(isMicMuted);
    set({ isMicMuted: !isMicMuted });
  },

  toggleVideo: () => {
    const { isVideoMuted } = get();
    webrtcManager.toggleVideo(isVideoMuted);
    set({ isVideoMuted: !isVideoMuted });
  },

  cleanup: () => {
    webrtcManager.endCall();
    set({
      callState: "idle",
      callType: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      isMicMuted: false,
      isVideoMuted: false,
    });
  }
}));
