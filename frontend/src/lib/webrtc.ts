export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  public remoteStream: MediaStream = new MediaStream();

  // Callbacks
  public onIceCandidate?: (candidate: RTCIceCandidate) => void;
  public onRemoteTrack?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  private config?: RTCConfiguration;

  constructor(config?: RTCConfiguration) {
    this.config = config;
    // Default STUN server
    if (!this.config) {
      this.config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };
    }
  }

  private initPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      if (this.onRemoteTrack) {
        this.onRemoteTrack(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
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

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) this.initPeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    return offer;
  }

  public async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) this.initPeerConnection();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    return answer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) this.initPeerConnection();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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

  public endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = new MediaStream();
  }
}

// Export a singleton instance
export const webrtcManager = new WebRTCManager();
