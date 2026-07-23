export class WebRTCManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  public remoteStreams = new Map<string, MediaStream>();

  // Callbacks
  public onIceCandidate?: (targetId: string, candidate: RTCIceCandidate) => void;
  public onRemoteTrack?: (targetId: string, stream: MediaStream) => void;
  public onStreamRemoved?: (targetId: string) => void;

  constructor(private config?: RTCConfiguration) {
    if (!this.config) {
      this.config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };
    }
  }

  private initPeerConnection(targetId: string): RTCPeerConnection {
    if (this.peerConnections.has(targetId)) {
      return this.peerConnections.get(targetId)!;
    }

    const pc = new RTCPeerConnection(this.config);
    this.peerConnections.set(targetId, pc);
    this.remoteStreams.set(targetId, new MediaStream());

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(targetId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const stream = this.remoteStreams.get(targetId)!;
      event.streams[0].getTracks().forEach((track) => {
        stream.addTrack(track);
      });
      if (this.onRemoteTrack) {
        this.onRemoteTrack(targetId, stream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        this.removePeer(targetId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    return pc;
  }

  public async getLocalStream(isVideo: boolean): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      throw error;
    }
  }

  public async createOffer(targetId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.initPeerConnection(targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(targetId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.initPeerConnection(targetId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
  }

  public async createAnswer(targetId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.initPeerConnection(targetId);
    if (pc.signalingState !== "have-remote-offer") {
       await pc.setRemoteDescription(new RTCSessionDescription(offer));
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(targetId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  public async handleIceCandidate(targetId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }
  
  public switchCamera() {
      // Future ready: cycle through available video devices and replace track
  }

  public removePeer(targetId: string) {
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetId);
    }
    this.remoteStreams.delete(targetId);
    if (this.onStreamRemoved) {
      this.onStreamRemoved(targetId);
    }
  }

  public endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }
}

export const webrtcManager = new WebRTCManager();
