import { create } from "zustand";
import { webrtcManager } from "../lib/webrtc";
import { toneGenerator } from "../lib/audio";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

type CallState = "idle" | "calling" | "ringing" | "incoming" | "incoming-invite" | "connected";

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
  callId: string | null;
  inviteData: any | null;
  invitedUsers: string[];

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
  inviteParticipant: (userId: string) => void;
  acceptParticipantInvite: () => void;
  rejectParticipantInvite: () => void;
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
  callId: null,
  inviteData: null,
  invitedUsers: [],

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
    socket.off("ADD_PARTICIPANT_INCOMING");
    socket.off("ADD_PARTICIPANT_FAILED");
    socket.off("ADD_PARTICIPANT_REJECTED");
    socket.off("CALL_PARTICIPANT_JOINED");
    socket.off("CALL_PARTICIPANT_LEFT");

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

    socket.on("CALL_ACCEPTED", async ({ receiverId, callId }: any) => {
      const { callState, remoteUser } = get();
      if (callState !== "calling" || remoteUser?._id !== receiverId) return;
      get().stopRingtone();
      set({ callState: "connected", callId: callId || get().callId });
      const offer = await webrtcManager.createOffer(receiverId);
      socket.emit("WEBRTC_SIGNAL", { targetId: receiverId, signalData: { type: "offer", offer }, callId: get().callId });
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

    socket.on("WEBRTC_SIGNAL", async ({ senderId, signalData, callId }: any) => {
      console.log(`[Store] Received WEBRTC_SIGNAL (${signalData.type}) from ${senderId}`);
      if (get().callState === "idle") return;

      if (callId && !get().callId) {
        set({ callId });
      }

      if (signalData.type === "offer") {
        console.log(`[Store] Processing offer from ${senderId}`);
        await webrtcManager.handleOffer(senderId, signalData.offer);
        const answer = await webrtcManager.createAnswer(senderId, signalData.offer);
        console.log(`[Store] Sending answer to ${senderId}`);
        socket.emit("WEBRTC_SIGNAL", { targetId: senderId, signalData: { type: "answer", answer }, callId: get().callId });
      } else if (signalData.type === "answer") {
        console.log(`[Store] Processing answer from ${senderId}`);
        await webrtcManager.handleAnswer(senderId, signalData.answer);
      } else if (signalData.type === "ice-candidate") {
        console.log(`[Store] Processing ICE candidate from ${senderId}`);
        await webrtcManager.handleIceCandidate(senderId, signalData.candidate);
      }
    });

    // --- Multi-party Add Participant ---
    socket.on("ADD_PARTICIPANT_INCOMING", ({ inviterId, callerInfo, callId }: any) => {
      console.log(`[Store] ADD_PARTICIPANT_INCOMING from ${inviterId} for call ${callId}`);
      const { callState } = get();
      if (callState !== "idle") {
        // Automatically reject if busy
        socket.emit("ADD_PARTICIPANT_REJECT", { callId, inviterId });
        return;
      }
      set({ callState: "incoming-invite", inviteData: { inviterId, callerInfo, callId } });
      get().playRingtone("incoming");

      if (callTimeout) clearTimeout(callTimeout);
      callTimeout = setTimeout(() => {
        if (get().callState === "incoming-invite") {
          get().rejectParticipantInvite();
        }
      }, 30000);
    });

    socket.on("CALL_PARTICIPANT_JOINED", async ({ userId, callId }: any) => {
      console.log(`[Store] CALL_PARTICIPANT_JOINED: ${userId} joined call ${callId}`);
      if (get().callState === "connected" && get().callId === callId) {
        // We are in this call, someone joined! Send them an offer.
        console.log(`[Store] Initiating offer to new participant ${userId}`);
        const offer = await webrtcManager.createOffer(userId);
        console.log(`[Store] Sending offer to new participant ${userId}`);
        socket.emit("WEBRTC_SIGNAL", { targetId: userId, signalData: { type: "offer", offer }, callId });
        set({ invitedUsers: get().invitedUsers.filter(id => id !== userId) });
        toast.success("A participant joined the call");
      }
    });

    socket.on("CALL_PARTICIPANT_LEFT", ({ userId, callId }: any) => {
      if (get().callState === "connected" && get().callId === callId) {
        webrtcManager.removePeer(userId);
        toast.error("A participant left the call");
      }
    });

    socket.on("ADD_PARTICIPANT_REJECTED", ({ userId }: any) => {
      if (userId) {
        set({ invitedUsers: get().invitedUsers.filter(id => id !== userId) });
      }
      toast.error("Participant declined the invite");
    });

    socket.on("ADD_PARTICIPANT_FAILED", ({ targetId, reason }: any) => {
      if (targetId) {
        set({ invitedUsers: get().invitedUsers.filter(id => id !== targetId) });
      }
      toast.error(`Could not add participant (${reason})`);
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
      const { activeGroup, callId } = get();
      if (activeGroup) {
        socket.emit("GROUP_WEBRTC_SIGNAL", { targetId, groupId: activeGroup._id, signalData: { type: "ice-candidate", candidate } });
      } else {
        socket.emit("WEBRTC_SIGNAL", { targetId, signalData: { type: "ice-candidate", candidate }, callId });
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
        set({ callState: "calling", callType: type, remoteUser: entity, localStream: stream, callId: authUser._id });
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
        set({ callId: remoteUser._id }); // Remote user initiated it, so their ID is the callId
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
    const { remoteUser, activeGroup, callType, callId } = get();

    const dummyDuration = Math.floor(Math.random() * 100);

    if (socket) {
      if (activeGroup) {
        socket.emit("LEAVE_GROUP_CALL", { groupId: activeGroup._id, duration: dummyDuration, callType });
      } else if (remoteUser || callId) {
        socket.emit("CALL_END", { targetId: remoteUser?._id, duration: dummyDuration, callType, callId });
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
      callId: null,
      inviteData: null,
      invitedUsers: [],
    });
  },

  inviteParticipant: (userId: string) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    const { callId } = get();
    if (socket && callId && authUser) {
      socket.emit("ADD_PARTICIPANT_REQUEST", {
        targetId: userId,
        callId,
        callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic }
      });
      set({ invitedUsers: [...get().invitedUsers, userId] });
      toast.success("Invitation sent");
    }
  },

  acceptParticipantInvite: async () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { inviteData } = get();
    if (!socket || !inviteData) return;

    try {
      // Assuming it joins as audio/video based on the first track, or default to video
      console.log(`[Store] Accepting participant invite, getting local stream...`);
      const stream = await webrtcManager.getLocalStream(true);
      set({ callState: "connected", localStream: stream, callId: inviteData.callId, callType: "video" });
      console.log(`[Store] Emitting ADD_PARTICIPANT_ACCEPT for call ${inviteData.callId}`);
      socket.emit("ADD_PARTICIPANT_ACCEPT", { callId: inviteData.callId });
    } catch (error) {
      toast.error("Could not access camera/microphone");
      get().rejectParticipantInvite();
    }
  },

  rejectParticipantInvite: () => {
    get().stopRingtone();
    const socket = useAuthStore.getState().socket;
    const { inviteData } = get();
    if (socket && inviteData) {
      socket.emit("ADD_PARTICIPANT_REJECT", { callId: inviteData.callId, inviterId: inviteData.inviterId });
    }
    get().cleanup();
  }
}));