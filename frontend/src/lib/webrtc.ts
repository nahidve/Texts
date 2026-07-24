export class WebRTCManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  public remoteStreams = new Map<string, MediaStream>();
  private iceCandidateQueues = new Map<string, RTCIceCandidateInit[]>();

  // Callbacks
  public onIceCandidate?: (targetId: string, candidate: RTCIceCandidate) => void;
  public onRemoteTrack?: (targetId: string, stream: MediaStream) => void;
  public onStreamRemoved?: (targetId: string) => void;

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

  private initPeerConnection(targetId: string): RTCPeerConnection {
    if (this.peerConnections.has(targetId)) {
      return this.peerConnections.get(targetId)!;
    }

    console.log(`[WebRTC] Initializing PeerConnection for target: ${targetId}`);
    const pc = new RTCPeerConnection(this.config);
    this.peerConnections.set(targetId, pc);
    this.remoteStreams.set(targetId, new MediaStream());
    this.iceCandidateQueues.set(targetId, []);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        console.log(`[WebRTC] Generated ICE candidate for ${targetId}`);
        this.onIceCandidate(targetId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetId} (${event.track.kind})`);
      const stream = this.remoteStreams.get(targetId)!;
      event.streams[0].getTracks().forEach((track) => {
        stream.addTrack(track);
      });
      if (this.onRemoteTrack) {
        this.onRemoteTrack(targetId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetId}: ${pc.connectionState}`);
    };

    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] Signaling state for ${targetId}: ${pc.signalingState}`);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state for ${targetId}: ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state for ${targetId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        this.removePeer(targetId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log(`[WebRTC] Adding local track (${track.kind}) to PC for ${targetId}`);
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

  private flushIceCandidates(targetId: string, pc: RTCPeerConnection) {
    const queue = this.iceCandidateQueues.get(targetId) || [];
    if (queue.length > 0) {
      console.log(`[WebRTC] Flushing ${queue.length} queued ICE candidates for ${targetId}`);
      queue.forEach(async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error(`[WebRTC] Failed to add queued ICE candidate for ${targetId}:`, e);
        }
      });
      this.iceCandidateQueues.set(targetId, []);
    }
  }

  public async createOffer(targetId: string): Promise<RTCSessionDescriptionInit> {
    console.log(`[WebRTC] Creating offer for ${targetId}`);
    const pc = this.initPeerConnection(targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(targetId: string, offer: RTCSessionDescriptionInit) {
    console.log(`[WebRTC] Handling offer from ${targetId}`);
    const pc = this.initPeerConnection(targetId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.flushIceCandidates(targetId, pc);
  }

  public async createAnswer(targetId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    console.log(`[WebRTC] Creating answer for ${targetId}`);
    const pc = this.initPeerConnection(targetId);
    if (pc.signalingState !== "have-remote-offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      this.flushIceCandidates(targetId, pc);
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(targetId: string, answer: RTCSessionDescriptionInit) {
    console.log(`[WebRTC] Handling answer from ${targetId}`);
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.flushIceCandidates(targetId, pc);
    }
  }

  public async handleIceCandidate(targetId: string, candidate: RTCIceCandidateInit) {
    console.log(`[WebRTC] Received ICE candidate from ${targetId}`);
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(`[WebRTC] Failed to add ICE candidate for ${targetId}:`, e));
      } else {
        console.log(`[WebRTC] Queuing ICE candidate for ${targetId} (remoteDescription not set)`);
        const queue = this.iceCandidateQueues.get(targetId) || [];
        queue.push(candidate);
        this.iceCandidateQueues.set(targetId, queue);
      }
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
    this.iceCandidateQueues.delete(targetId);
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
    this.iceCandidateQueues.clear();
  }
}

export const webrtcManager = new WebRTCManager();
