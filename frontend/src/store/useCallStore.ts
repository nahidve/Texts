import { create } from "zustand";
import { webrtcManager } from "../lib/webrtc";
import { toneGenerator } from "../lib/audio";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

type CallState = "idle" | "calling" | "ringing" | "incoming" | "connected";

let callTimeout: any = null;

interface CallStore {
  callState: CallState;
  callType: "audio" | "video" | null;
  remoteUser: any | null; // For 1-on-1 calls
  activeGroup: any | null; // For group calls
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>; // targetId -> MediaStream
  isMicMuted: boolean;
  isVideoMuted: boolean;

  // Actions
  initiateCall: (user: any, type: "audio" | "video", isGroup?: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  cancelCall: () => void;
  toggleMic: () => void;
  toggleVideo: () => void;
  setupSignaling: () => void;
  cleanup: () => void;
  playRingtone: (type: "incoming" | "outgoing") => void;
  stopRingtone: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  callState: "idle",
  callType: null,
  remoteUser: null,
  activeGroup: null,
  localStream: null,
  remoteStreams: {},
  isMicMuted: false,
  isVideoMuted: false,

  playRingtone: (type) => {
    if (type === "incoming") {
      toneGenerator.playRingtone();
    } else if (type === "outgoing") {
      toneGenerator.playRingback();
    }
  },

  stopRingtone: () => {
    toneGenerator.stop();
  },

  setupSignaling: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("CALL_INCOMING");
    socket.off("CALL_ACCEPTED");
    socket.off("CALL_REJECTED");
    socket.off("CALL_CANCELLED");
    socket.off("CALL_ENDED");
    socket.off("USER_BUSY");
    socket.off("USER_OFFLINE");
    socket.off("WEBRTC_SIGNAL");
    socket.off("GROUP_CALL_INCOMING");
    socket.off("GROUP_USER_JOINED");
    socket.off("GROUP_USER_LEFT");
    socket.off("GROUP_WEBRTC_SIGNAL");

    socket.on("CALL_INCOMING", ({ callerId, callerInfo, callType }: any) => {
      const { callState } = get();
      if (callState !== "idle") {
        socket.emit("USER_BUSY", { receiverId: callerId });
        return;
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Incoming Call", { body: `${callerInfo.fullName} is calling you.` });
      }
      set({ callState: "incoming", remoteUser: { _id: callerId, ...callerInfo }, callType });
      get().playRingtone("incoming");

      if (callTimeout) clearTimeout(callTimeout);
      callTimeout = setTimeout(() => {
        if (get().callState === "incoming") {
          get().rejectCall();
        }
      }, 30000);
    });

    socket.on("CALL_ACCEPTED", async ({ receiverId }: any) => {
      const { callState, remoteUser } = get();
      if (callState !== "calling" || remoteUser?._id !== receiverId) return;
      get().stopRingtone();
      set({ callState: "connected" });
      const offer = await webrtcManager.createOffer(receiverId);
      socket.emit("WEBRTC_SIGNAL", { targetId: receiverId, signalData: { type: "offer", offer } });
    });

    socket.on("CALL_REJECTED", () => {
      if (get().callState === "idle") return;
      toast.error("Call declined");
      get().cleanup();
    });

    socket.on("CALL_CANCELLED", () => {
      if (get().callState === "idle") return;
      get().cleanup();
    });

    socket.on("CALL_ENDED", () => {
      if (get().callState === "idle") return;
      get().cleanup();
    });

    socket.on("USER_BUSY", () => {
      if (get().callState === "idle") return;
      toast.error("User is busy on another call");
      get().cleanup();
    });

    socket.on("USER_OFFLINE", () => {
      if (get().callState === "idle") return;
      toast.error("User is offline");
      get().cleanup();
    });

    socket.on("WEBRTC_SIGNAL", async ({ senderId, signalData }: any) => {
      if (get().callState === "idle") return;

      if (signalData.type === "offer") {
        await webrtcManager.handleOffer(senderId, signalData.offer);
        const answer = await webrtcManager.createAnswer(senderId, signalData.offer);
        socket.emit("WEBRTC_SIGNAL", { targetId: senderId, signalData: { type: "answer", answer } });
      } else if (signalData.type === "answer") {
        await webrtcManager.handleAnswer(senderId, signalData.answer);
      } else if (signalData.type === "ice-candidate") {
        await webrtcManager.handleIceCandidate(senderId, signalData.candidate);
      }
    });

    // GROUP SIGNALING
    socket.on("GROUP_CALL_INCOMING", ({ groupId, callerId, callerInfo, callType }: any) => {
      const { callState } = get();
      if (callState !== "idle") return; // silently ignore if busy

      set({
        callState: "incoming",
        activeGroup: { _id: groupId, name: "Group Call" },
        callType,
        remoteUser: { _id: callerId, ...callerInfo } // show who started it
      });
      get().playRingtone("incoming");
    });

    socket.on("GROUP_USER_JOINED", async ({ userId }: any) => {
      // If we are already connected, create an offer to the new user
      const { callState, activeGroup } = get();
      if (callState === "connected" && activeGroup) {
        const offer = await webrtcManager.createOffer(userId);
        socket.emit("GROUP_WEBRTC_SIGNAL", { targetId: userId, groupId: activeGroup._id, signalData: { type: "offer", offer } });
      }
    });

    socket.on("GROUP_USER_LEFT", ({ userId }: any) => {
      webrtcManager.removePeer(userId);
    });

    socket.on("GROUP_WEBRTC_SIGNAL", async ({ senderId, groupId, signalData }: any) => {
      if (signalData.type === "offer") {
        await webrtcManager.handleOffer(senderId, signalData.offer);
        const answer = await webrtcManager.createAnswer(senderId, signalData.offer);
        socket.emit("GROUP_WEBRTC_SIGNAL", { targetId: senderId, groupId, signalData: { type: "answer", answer } });
      } else if (signalData.type === "answer") {
        await webrtcManager.handleAnswer(senderId, signalData.answer);
      } else if (signalData.type === "ice-candidate") {
        await webrtcManager.handleIceCandidate(senderId, signalData.candidate);
      }
    });


    // WebRTC Manager Callbacks
    webrtcManager.onIceCandidate = (targetId, candidate) => {
      const { activeGroup } = get();
      if (activeGroup) {
        socket.emit("GROUP_WEBRTC_SIGNAL", { targetId, groupId: activeGroup._id, signalData: { type: "ice-candidate", candidate } });
      } else {
        socket.emit("WEBRTC_SIGNAL", { targetId, signalData: { type: "ice-candidate", candidate } });
      }
    };

    webrtcManager.onRemoteTrack = (targetId, stream) => {
      set((state) => ({
        remoteStreams: { ...state.remoteStreams, [targetId]: stream }
      }));
    };

    webrtcManager.onStreamRemoved = (targetId) => {
      set((state) => {
        const updated = { ...state.remoteStreams };
        delete updated[targetId];
        return { remoteStreams: updated };
      });
    };
  },

  initiateCall: async (entity, type, isGroup = false) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (!socket || !authUser) return;

    try {
      const stream = await webrtcManager.getLocalStream(type === "video");

      if (isGroup) {
        set({ callState: "connected", callType: type, activeGroup: entity, localStream: stream });
        socket.emit("GROUP_CALL_INITIATE", {
          groupId: entity._id,
          callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic },
          callType: type
        });
      } else {
        set({ callState: "calling", callType: type, remoteUser: entity, localStream: stream });
        socket.emit("CALL_INITIATE", {
          receiverId: entity._id,
          callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic },
          callType: type
        });
        get().playRingtone("outgoing");

        if (callTimeout) clearTimeout(callTimeout);
        callTimeout = setTimeout(() => {
          if (get().callState === "calling" || get().callState === "ringing") {
            get().cancelCall();
          }
        }, 30000);
      }
    } catch (error) {
      toast.error("Could not access camera/microphone");
      get().cleanup();
    }
  },

  acceptCall: async () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { remoteUser, activeGroup, callType } = get();
    if (!socket) return;

    try {
      const stream = await webrtcManager.getLocalStream(callType === "video");
      set({ callState: "connected", localStream: stream });

      if (activeGroup) {
        socket.emit("JOIN_GROUP_CALL", { groupId: activeGroup._id });
      } else if (remoteUser) {
        socket.emit("CALL_ACCEPT", { callerId: remoteUser._id });
      }
    } catch (error) {
      toast.error("Could not access camera/microphone");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { remoteUser, callType } = get();
    if (socket && remoteUser) {
      socket.emit("CALL_REJECT", { callerId: remoteUser._id, callType });
    }
    get().cleanup();
  },

  cancelCall: () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { remoteUser, callType } = get();
    if (socket && remoteUser) {
      socket.emit("CALL_CANCEL", { receiverId: remoteUser._id, callType });
    }
    get().cleanup();
  },

  endCall: () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { remoteUser, activeGroup, callType } = get();

    const dummyDuration = Math.floor(Math.random() * 100);

    if (socket) {
      if (activeGroup) {
        socket.emit("LEAVE_GROUP_CALL", { groupId: activeGroup._id, duration: dummyDuration, callType });
      } else if (remoteUser) {
        socket.emit("CALL_END", { targetId: remoteUser._id, duration: dummyDuration, callType });
      }
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
    if (callTimeout) {
      clearTimeout(callTimeout);
      callTimeout = null;
    }
    get().stopRingtone();
    webrtcManager.endCall();
    set({
      callState: "idle",
      callType: null,
      remoteUser: null,
      activeGroup: null,
      localStream: null,
      remoteStreams: {},
      isMicMuted: false,
      isVideoMuted: false,
    });
  }
}));