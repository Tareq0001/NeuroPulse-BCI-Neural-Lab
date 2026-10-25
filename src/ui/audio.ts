export class NeuroAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private mode: 'binaural' | 'isochronic' = 'binaural';
  private targetFreq = 10; // Hz (Alpha)
  private carrierFreq = 200; // Hz
  private masterGain: GainNode | null = null;

  // Binaural nodes
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private panLeft: StereoPannerNode | null = null;
  private panRight: StereoPannerNode | null = null;

  // Isochronic nodes
  private isoOsc: OscillatorNode | null = null;
  private isoGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  constructor() {}

  private initContext(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMode(mode: 'binaural' | 'isochronic'): void {
    this.mode = mode;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  public setTargetFrequency(freq: number): void {
    this.targetFreq = freq;
    if (this.isPlaying && this.ctx) {
      if (this.mode === 'binaural' && this.oscRight) {
        this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.targetFreq, this.ctx.currentTime);
      } else if (this.mode === 'isochronic' && this.lfo) {
        this.lfo.frequency.setValueAtTime(this.targetFreq, this.ctx.currentTime);
      }
    }
  }

  public setCarrierFrequency(carrier: number): void {
    this.carrierFreq = carrier;
    if (this.isPlaying && this.ctx) {
      if (this.mode === 'binaural' && this.oscLeft && this.oscRight) {
        this.oscLeft.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);
        this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.targetFreq, this.ctx.currentTime);
      } else if (this.mode === 'isochronic' && this.isoOsc) {
        this.isoOsc.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);
      }
    }
  }

  public setVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setTargetAtTime(clamped * 0.15, this.ctx.currentTime, 0.05);
    }
  }

  public start(): void {
    this.initContext();
    if (!this.ctx) return;

    this.stop(); // Clean any previous nodes

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    if (this.mode === 'binaural') {
      // Left ear carrier
      this.oscLeft = this.ctx.createOscillator();
      this.oscLeft.type = 'sine';
      this.oscLeft.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);

      this.panLeft = this.ctx.createStereoPanner();
      this.panLeft.pan.setValueAtTime(-1.0, this.ctx.currentTime);

      this.oscLeft.connect(this.panLeft);
      this.panLeft.connect(this.masterGain);

      // Right ear carrier + target
      this.oscRight = this.ctx.createOscillator();
      this.oscRight.type = 'sine';
      this.oscRight.frequency.setValueAtTime(this.carrierFreq + this.targetFreq, this.ctx.currentTime);

      this.panRight = this.ctx.createStereoPanner();
      this.panRight.pan.setValueAtTime(1.0, this.ctx.currentTime);

      this.oscRight.connect(this.panRight);
      this.panRight.connect(this.masterGain);

      this.oscLeft.start();
      this.oscRight.start();
    } else {
      // Isochronic tone pulses
      this.isoOsc = this.ctx.createOscillator();
      this.isoOsc.type = 'sine';
      this.isoOsc.frequency.setValueAtTime(this.carrierFreq, this.ctx.currentTime);

      this.isoGain = this.ctx.createGain();
      this.isoGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

      // LFO modulation
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'square';
      this.lfo.frequency.setValueAtTime(this.targetFreq, this.ctx.currentTime);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.isoGain.gain);

      this.isoOsc.connect(this.isoGain);
      this.isoGain.connect(this.masterGain);

      this.isoOsc.start();
      this.lfo.start();
    }

    this.isPlaying = true;
  }

  public stop(): void {
    if (this.oscLeft) {
      try { this.oscLeft.stop(); } catch {}
      this.oscLeft.disconnect();
      this.oscLeft = null;
    }
    if (this.oscRight) {
      try { this.oscRight.stop(); } catch {}
      this.oscRight.disconnect();
      this.oscRight = null;
    }
    if (this.isoOsc) {
      try { this.isoOsc.stop(); } catch {}
      this.isoOsc.disconnect();
      this.isoOsc = null;
    }
    if (this.lfo) {
      try { this.lfo.stop(); } catch {}
      this.lfo.disconnect();
      this.lfo = null;
    }
    this.isPlaying = false;
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
