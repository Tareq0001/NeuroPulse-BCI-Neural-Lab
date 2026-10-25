import { FrequencyBandPower } from '../types';

/**
 * High-performance Cooley-Tukey Radix-2 FFT
 */
export class FastFourierTransform {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private hanningWindow: Float32Array;

  constructor(size: number = 256) {
    if ((size & (size - 1)) !== 0) {
      throw new Error('FFT size must be a power of 2');
    }
    this.size = size;
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    this.hanningWindow = new Float32Array(size);

    for (let i = 0; i < size / 2; i++) {
      const angle = (-2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Precalculate Hanning window
    for (let i = 0; i < size; i++) {
      this.hanningWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
  }

  public getSize(): number {
    return this.size;
  }

  /**
   * Computes In-place FFT on real input with Hanning window
   * Returns magnitude spectrum (size/2 bins) in microvolts / sqrt(Hz)
   */
  public computeMagnitude(input: Float32Array | number[]): Float32Array {
    const n = this.size;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    const inputLen = input.length;
    for (let i = 0; i < n; i++) {
      if (i < inputLen) {
        real[i] = input[i] * this.hanningWindow[i];
      } else {
        real[i] = 0;
      }
      imag[i] = 0;
    }

    // Bit reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        const tempR = real[i];
        real[i] = real[j];
        real[j] = tempR;

        const tempI = imag[i];
        imag[i] = imag[j];
        imag[j] = tempI;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    // Cooley-Tukey butterfly
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        let k = 0;
        for (let m = 0; m < halfLen; m++) {
          const c = this.cosTable[k];
          const s = this.sinTable[k];
          const tReal = c * real[i + m + halfLen] - s * imag[i + m + halfLen];
          const tImag = s * real[i + m + halfLen] + c * imag[i + m + halfLen];

          const uReal = real[i + m];
          const uImag = imag[i + m];

          real[i + m] = uReal + tReal;
          imag[i + m] = uImag + tImag;
          real[i + m + halfLen] = uReal - tReal;
          imag[i + m + halfLen] = uImag - tImag;

          k += step;
        }
      }
    }

    // Magnitudes
    const numBins = n / 2;
    const magnitudes = new Float32Array(numBins);
    const scale = 2 / n;

    for (let i = 0; i < numBins; i++) {
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * scale;
      magnitudes[i] = mag;
    }

    return magnitudes;
  }

  /**
   * Calculates Frequency Bands Power from magnitude spectrum
   * Fs = 250 Hz, Bins = 128 (for size 256)
   * Frequency resolution = Fs / size = 250 / 256 ~= 0.976 Hz per bin
   */
  public extractBandPowers(magnitudes: Float32Array, fs: number = 250): FrequencyBandPower {
    const binWidth = fs / this.size;

    let deltaSum = 0;
    let thetaSum = 0;
    let alphaSum = 0;
    let betaSum = 0;
    let gammaSum = 0;

    for (let i = 1; i < magnitudes.length; i++) {
      const freq = i * binWidth;
      const power = magnitudes[i] * magnitudes[i]; // uV^2

      if (freq >= 0.5 && freq < 4) {
        deltaSum += power;
      } else if (freq >= 4 && freq < 8) {
        thetaSum += power;
      } else if (freq >= 8 && freq < 13) {
        alphaSum += power;
      } else if (freq >= 13 && freq < 30) {
        betaSum += power;
      } else if (freq >= 30 && freq <= 60) {
        gammaSum += power;
      }
    }

    const total = deltaSum + thetaSum + alphaSum + betaSum + gammaSum || 1;

    return {
      delta: Math.round(deltaSum * 10) / 10,
      theta: Math.round(thetaSum * 10) / 10,
      alpha: Math.round(alphaSum * 10) / 10,
      beta: Math.round(betaSum * 10) / 10,
      gamma: Math.round(gammaSum * 10) / 10,
      total: Math.round(total * 10) / 10,
      relative: {
        delta: deltaSum / total,
        theta: thetaSum / total,
        alpha: alphaSum / total,
        beta: betaSum / total,
        gamma: gammaSum / total
      }
    };
  }
}
