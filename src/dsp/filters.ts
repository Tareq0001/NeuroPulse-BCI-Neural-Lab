import { FilterSettings } from '../types';

/**
 * Direct Form II Transposed Biquad Filter
 * Transfer function: H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
 */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  private d1 = 0;
  private d2 = 0;

  constructor() {}

  public setCoefficients(b0: number, b1: number, b2: number, a1: number, a2: number): void {
    this.b0 = b0;
    this.b1 = b1;
    this.b2 = b2;
    this.a1 = a1;
    this.a2 = a2;
  }

  public reset(): void {
    this.d1 = 0;
    this.d2 = 0;
  }

  public process(x: number): number {
    const y = this.b0 * x + this.d1;
    this.d1 = this.b1 * x - this.a1 * y + this.d2;
    this.d2 = this.b2 * x - this.a2 * y;
    return isNaN(y) ? 0 : y;
  }
}

/**
 * Generates Biquad filter coefficients for standard audio/EEG DSP
 */
export class FilterDesign {
  /**
   * 2nd-order Butterworth High-Pass Filter
   */
  public static highpass(fc: number, fs: number): { b0: number; b1: number; b2: number; a1: number; a2: number } {
    const w0 = (2 * Math.PI * fc) / fs;
    const cosw0 = Math.cos(w0);
    const alpha = Math.sin(w0) / Math.SQRT2;

    const b0 = (1 + cosw0) / 2;
    const b1 = -(1 + cosw0);
    const b2 = (1 + cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }

  /**
   * 2nd-order Butterworth Low-Pass Filter
   */
  public static lowpass(fc: number, fs: number): { b0: number; b1: number; b2: number; a1: number; a2: number } {
    const w0 = (2 * Math.PI * fc) / fs;
    const cosw0 = Math.cos(w0);
    const alpha = Math.sin(w0) / Math.SQRT2;

    const b0 = (1 - cosw0) / 2;
    const b1 = 1 - cosw0;
    const b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }

  /**
   * 2nd-order Notch Filter (Band-stop)
   */
  public static notch(fc: number, fs: number, Q: number = 30): { b0: number; b1: number; b2: number; a1: number; a2: number } {
    const w0 = (2 * Math.PI * fc) / fs;
    const cosw0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Q);

    const b0 = 1;
    const b1 = -2 * cosw0;
    const b2 = 1;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }

  /**
   * 2nd-order Band-Pass Filter (Constant 0 dB peak gain)
   */
  public static bandpass(f0: number, fs: number, Q: number = 1.0): { b0: number; b1: number; b2: number; a1: number; a2: number } {
    const w0 = (2 * Math.PI * f0) / fs;
    const cosw0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Q);

    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }
}

/**
 * Per-channel filter cascade for 16-channel EEG
 */
export class ChannelFilterBank {
  private hp1 = new Biquad();
  private hp2 = new Biquad(); // 4th order highpass for steep DC suppression
  private lp1 = new Biquad();
  private lp2 = new Biquad(); // 4th order lowpass
  private notch50 = new Biquad();
  private notch60 = new Biquad();
  private bp1 = new Biquad();
  private bp2 = new Biquad();

  constructor(fs: number = 250) {
    this.initCoefficients(fs);
  }

  public initCoefficients(fs: number): void {
    const hp = FilterDesign.highpass(0.5, fs);
    this.hp1.setCoefficients(hp.b0, hp.b1, hp.b2, hp.a1, hp.a2);
    this.hp2.setCoefficients(hp.b0, hp.b1, hp.b2, hp.a1, hp.a2);

    const lp = FilterDesign.lowpass(40.0, fs);
    this.lp1.setCoefficients(lp.b0, lp.b1, lp.b2, lp.a1, lp.a2);
    this.lp2.setCoefficients(lp.b0, lp.b1, lp.b2, lp.a1, lp.a2);

    const n50 = FilterDesign.notch(50.0, fs, 30);
    this.notch50.setCoefficients(n50.b0, n50.b1, n50.b2, n50.a1, n50.a2);

    const n60 = FilterDesign.notch(60.0, fs, 30);
    this.notch60.setCoefficients(n60.b0, n60.b1, n60.b2, n60.a1, n60.a2);

    // Bandpass centered at 14 Hz with Q covering 0.5 - 35 Hz
    const bp = FilterDesign.bandpass(14.0, fs, 0.6);
    this.bp1.setCoefficients(bp.b0, bp.b1, bp.b2, bp.a1, bp.a2);
    this.bp2.setCoefficients(bp.b0, bp.b1, bp.b2, bp.a1, bp.a2);
  }

  public reset(): void {
    this.hp1.reset();
    this.hp2.reset();
    this.lp1.reset();
    this.lp2.reset();
    this.notch50.reset();
    this.notch60.reset();
    this.bp1.reset();
    this.bp2.reset();
  }

  public process(sample: number, settings: FilterSettings): number {
    let out = sample;

    // High-pass (DC drift)
    if (settings.highpass || settings.bandpass) {
      out = this.hp1.process(out);
      out = this.hp2.process(out);
    }

    // Low-pass (High frequency noise)
    if (settings.lowpass || settings.bandpass) {
      out = this.lp1.process(out);
      out = this.lp2.process(out);
    }

    // Notch 50 Hz
    if (settings.notch50Hz) {
      out = this.notch50.process(out);
    }

    // Notch 60 Hz
    if (settings.notch60Hz) {
      out = this.notch60.process(out);
    }

    return out;
  }
}

/**
 * 16-Channel Master DSP Engine
 */
export class DSPPipeline {
  private channels: ChannelFilterBank[] = [];
  public settings: FilterSettings = {
    highpass: true,
    lowpass: true,
    notch50Hz: true,
    notch60Hz: false,
    bandpass: true,
    artifactRemoval: true
  };

  constructor(numChannels: number = 16, fs: number = 250) {
    for (let i = 0; i < numChannels; i++) {
      this.channels.push(new ChannelFilterBank(fs));
    }
  }

  public reset(): void {
    for (const ch of this.channels) {
      ch.reset();
    }
  }

  public processFrame(rawSamples: number[]): number[] {
    const filtered: number[] = new Array(rawSamples.length);
    for (let i = 0; i < rawSamples.length; i++) {
      const bank = this.channels[i];
      let val = rawSamples[i];
      if (bank) {
        val = bank.process(val, this.settings);
      }
      filtered[i] = val;
    }

    // Adaptive artifact reduction (e.g. blink rejection in Fp1/Fp2 if enabled)
    if (this.settings.artifactRemoval && filtered.length >= 2) {
      // Common Average Referencing (CAR) option: subtract spatial mean
      let sum = 0;
      for (let i = 0; i < filtered.length; i++) {
        sum += filtered[i];
      }
      const car = sum / filtered.length;
      for (let i = 0; i < filtered.length; i++) {
        // Soft CAR: subtract 50% of common spatial noise to preserve absolute microvolt scale
        filtered[i] -= car * 0.5;
      }
    }

    return filtered;
  }
}
