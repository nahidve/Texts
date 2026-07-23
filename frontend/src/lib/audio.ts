class ToneGenerator {
  private audioCtx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private intervalId: number | NodeJS.Timeout | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Ringback tone (what the caller hears): e.g., 440Hz + 480Hz
  public playRingback() {
    this.stop();
    this.init();
    if (!this.audioCtx) return;

    this.isPlaying = true;
    
    const playPulse = () => {
        if (!this.isPlaying) return;
        
        this.gainNode = this.audioCtx!.createGain();
        this.gainNode.connect(this.audioCtx!.destination);
        this.gainNode.gain.setValueAtTime(0.1, this.audioCtx!.currentTime);

        const osc1 = this.audioCtx!.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, this.audioCtx!.currentTime);
        osc1.connect(this.gainNode);

        const osc2 = this.audioCtx!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, this.audioCtx!.currentTime);
        osc2.connect(this.gainNode);

        osc1.start();
        osc2.start();

        this.oscillators.push(osc1, osc2);

        // Stop after 2 seconds
        osc1.stop(this.audioCtx!.currentTime + 2);
        osc2.stop(this.audioCtx!.currentTime + 2);
        
        setTimeout(() => {
            if (this.oscillators.includes(osc1)) {
                this.oscillators = this.oscillators.filter(o => o !== osc1 && o !== osc2);
            }
        }, 2100);
    };

    // Initial pulse
    playPulse();
    
    // Repeat every 6 seconds (2s on, 4s off)
    this.intervalId = setInterval(playPulse, 6000);
  }

  // Incoming ringtone (what the receiver hears)
  public playRingtone() {
    this.stop();
    this.init();
    if (!this.audioCtx) return;

    this.isPlaying = true;
    
    const playChirp = () => {
        if (!this.isPlaying) return;

        this.gainNode = this.audioCtx!.createGain();
        this.gainNode.connect(this.audioCtx!.destination);
        
        // Envelope
        this.gainNode.gain.setValueAtTime(0, this.audioCtx!.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioCtx!.currentTime + 0.05);
        this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx!.currentTime + 0.3);

        const osc = this.audioCtx!.createOscillator();
        osc.type = 'sine';
        
        // Frequency sweep
        osc.frequency.setValueAtTime(800, this.audioCtx!.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx!.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx!.currentTime + 0.3);
        
        osc.connect(this.gainNode);
        osc.start();
        osc.stop(this.audioCtx!.currentTime + 0.3);
        
        this.oscillators.push(osc);
        
        setTimeout(() => {
            if (this.oscillators.includes(osc)) {
                this.oscillators = this.oscillators.filter(o => o !== osc);
            }
        }, 350);
    };

    const playSequence = () => {
        if (!this.isPlaying) return;
        playChirp();
        setTimeout(() => { if (this.isPlaying) playChirp(); }, 400);
    };

    playSequence();
    
    // Repeat every 3 seconds
    this.intervalId = setInterval(playSequence, 3000);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId as any);
      this.intervalId = null;
    }
    this.oscillators.forEach(osc => {
        try {
            osc.stop();
            osc.disconnect();
        } catch(e) {}
    });
    this.oscillators = [];
    if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
    }
  }
}

export const toneGenerator = new ToneGenerator();
