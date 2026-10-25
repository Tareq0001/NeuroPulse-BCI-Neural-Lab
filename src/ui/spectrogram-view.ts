import { FastFourierTransform } from '../dsp/fft';
import { FrequencyBandPower } from '../types';

export class SpectrogramView {
  private spectrumCanvas: HTMLCanvasElement;
  private waterfallCanvas: HTMLCanvasElement;
  private spectrumCtx: CanvasRenderingContext2D;
  private waterfallCtx: CanvasRenderingContext2D;

  private fft = new FastFourierTransform(256);
  private waterfallHistory: Float32Array[] = [];
  private maxWaterfallRows = 120; // 120 time slices

  constructor(spectrumCanvas: HTMLCanvasElement, waterfallCanvas: HTMLCanvasElement) {
    this.spectrumCanvas = spectrumCanvas;
    this.waterfallCanvas = waterfallCanvas;

    this.spectrumCtx = spectrumCanvas.getContext('2d', { alpha: false })!;
    this.waterfallCtx = waterfallCanvas.getContext('2d', { alpha: false })!;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sRect = this.spectrumCanvas.getBoundingClientRect();
    this.spectrumCanvas.width = (sRect.width || 400) * dpr;
    this.spectrumCanvas.height = (sRect.height || 180) * dpr;
    this.spectrumCtx.scale(dpr, dpr);

    const wRect = this.waterfallCanvas.getBoundingClientRect();
    this.waterfallCanvas.width = (wRect.width || 400) * dpr;
    this.waterfallCanvas.height = (wRect.height || 180) * dpr;
    this.waterfallCtx.scale(dpr, dpr);
  }

  /**
   * Translates normalized power (0-1) to cyber neon plasma heatmap color
   */
  private getHeatmapColor(intensity: number): string {
    const v = Math.max(0, Math.min(1, intensity));
    // Turbo-like cyber palette: Dark Navy -> Cyan -> Emerald -> Yellow -> Neon Magenta / Red
    let r = 0, g = 0, b = 0;
    if (v < 0.25) {
      const t = v / 0.25;
      r = 3; g = Math.round(7 + t * 90); b = Math.round(20 + t * 180);
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      r = Math.round(t * 16); g = Math.round(97 + t * 88); b = Math.round(200 - t * 70);
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      r = Math.round(16 + t * 229); g = Math.round(185 - t * 27); b = Math.round(130 - t * 119);
    } else {
      const t = (v - 0.75) / 0.25;
      r = Math.round(245 + t * 10); g = Math.round(158 - t * 110); b = Math.round(11 + t * 80);
    }
    return `rgb(${r},${g},${b})`;
  }

  public update(timeSeries: number[], selectedChannelName: string): FrequencyBandPower {
    const magnitudes = this.fft.computeMagnitude(timeSeries);
    const bandPowers = this.fft.extractBandPowers(magnitudes, 250);

    // Keep waterfall slice (first 50 Hz = ~52 bins)
    const numBins50Hz = Math.min(52, magnitudes.length);
    const slice = new Float32Array(numBins50Hz);
    for (let i = 0; i < numBins50Hz; i++) {
      slice[i] = magnitudes[i];
    }

    this.waterfallHistory.unshift(slice);
    if (this.waterfallHistory.length > this.maxWaterfallRows) {
      this.waterfallHistory.pop();
    }

    this.renderSpectrum(magnitudes, selectedChannelName);
    this.renderWaterfall();

    return bandPowers;
  }

  private renderSpectrum(magnitudes: Float32Array, channelName: string): void {
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 180;
    const ctx = this.spectrumCtx;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;

    // Frequency markers (0, 10, 20, 30, 40, 50 Hz)
    const maxFreq = 50; // Hz
    for (let f = 10; f <= maxFreq; f += 10) {
      const x = (f / maxFreq) * (w - 40) + 30;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 22);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(`${f}Hz`, x - 10, h - 8);
    }

    // Band colored background zones: Delta (0.5-4), Theta (4-8), Alpha (8-13), Beta (13-30), Gamma (30-50)
    const getXForHz = (hz: number) => (hz / maxFreq) * (w - 40) + 30;

    // Alpha band highlight (8 - 13 Hz)
    ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
    ctx.fillRect(getXForHz(8), 0, getXForHz(13) - getXForHz(8), h - 22);

    // Beta band highlight (13 - 30 Hz)
    ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
    ctx.fillRect(getXForHz(13), 0, getXForHz(30) - getXForHz(13), h - 22);

    // Draw spectrum curve
    const binWidthHz = 250 / this.fft.getSize();
    const binsToDraw = Math.min(Math.floor(maxFreq / binWidthHz), magnitudes.length);

    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#06b6d4';

    let maxMag = 1.0;
    for (let i = 1; i < binsToDraw; i++) {
      if (magnitudes[i] > maxMag) maxMag = magnitudes[i];
    }
    const yScale = (h - 40) / Math.max(30.0, maxMag);

    for (let i = 1; i < binsToDraw; i++) {
      const freq = i * binWidthHz;
      const x = getXForHz(freq);
      const y = h - 25 - magnitudes[i] * yScale;

      if (i === 1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    ctx.lineTo(getXForHz(binsToDraw * binWidthHz), h - 25);
    ctx.lineTo(getXForHz(binWidthHz), h - 25);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Header label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Power Spectral Density [${channelName}] (0 - 50 Hz)`, 10, 16);
  }

  private renderWaterfall(): void {
    const rect = this.waterfallCanvas.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 180;
    const ctx = this.waterfallCtx;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    if (this.waterfallHistory.length === 0) return;

    const rows = this.waterfallHistory.length;
    const cols = this.waterfallHistory[0].length;
    const cellW = w / cols;
    const cellH = h / this.maxWaterfallRows;

    for (let r = 0; r < rows; r++) {
      const slice = this.waterfallHistory[r];
      const y = r * cellH;

      for (let c = 0; c < cols; c++) {
        const val = slice[c];
        const normalized = Math.min(1.0, val / 35.0);
        ctx.fillStyle = this.getHeatmapColor(normalized);
        ctx.fillRect(c * cellW, y, cellW + 0.5, cellH + 0.5);
      }
    }

    // Overlay frequency labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText('0 Hz', 6, h - 6);
    ctx.fillText('25 Hz', w / 2 - 12, h - 6);
    ctx.fillText('50 Hz', w - 34, h - 6);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Spectrogram Waterfall (Time vs Frequency)', 10, 16);
  }
}
