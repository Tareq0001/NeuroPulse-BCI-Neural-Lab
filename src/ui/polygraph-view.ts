import { CHANNELS_10_20 } from '../models/eeg-generator';
import { EEGFrame } from '../types';

export class PolygraphView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bufferLength = 1250; // 5 seconds of data at 250 Hz
  private history: { raw: number[]; filtered: number[]; marker?: string }[] = [];
  private scaleUv = 1.0; // uV to pixels
  public showRaw = false; // Compare raw vs filtered

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public addFrame(frame: EEGFrame): void {
    this.history.push({
      raw: frame.raw,
      filtered: frame.filtered,
      marker: frame.eventMarker
    });
    if (this.history.length > this.bufferLength) {
      this.history.shift();
    }
  }

  public setSensitivity(scale: number): void {
    this.scaleUv = scale;
  }

  public render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    const ctx = this.ctx;

    // Dark titanium background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    const numChannels = 16;
    const trackHeight = height / numChannels;

    // Draw background grid lines (time & amplitude divisions)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';

    // Vertical time grid (1 second lines based on buffer)
    const pointsPerSecond = 250;
    const xStep1s = (width / this.bufferLength) * pointsPerSecond;
    for (let x = width; x >= 0; x -= xStep1s) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal channel separators & baselines
    for (let i = 0; i < numChannels; i++) {
      const yMid = i * trackHeight + trackHeight / 2;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.moveTo(0, yMid);
      ctx.lineTo(width, yMid);
      ctx.stroke();

      // Channel label & instantaneous value
      const ch = CHANNELS_10_20[i];
      const lastSample = this.history.length > 0 ? this.history[this.history.length - 1] : null;
      const currentUv = lastSample ? Math.round(lastSample.filtered[i]) : 0;

      // Label badge
      ctx.fillStyle = ch.color;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText(ch.name, 12, yMid - 6);

      // Value & impedance
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`${currentUv > 0 ? '+' : ''}${currentUv} µV`, 52, yMid - 6);

      // Contact quality indicator dot
      ctx.beginPath();
      ctx.arc(105, yMid - 9, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ch.impedance < 5 ? '#10b981' : (ch.impedance < 10 ? '#f59e0b' : '#ef4444');
      ctx.fill();
    }

    if (this.history.length < 2) return;

    // Trace rendering
    const histLen = this.history.length;
    const xStep = width / (this.bufferLength - 1);

    // 1. Draw Raw trace if enabled (faint gray background trace to show filtering power)
    if (this.showRaw) {
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';

      for (let ch = 0; ch < numChannels; ch++) {
        const yMid = ch * trackHeight + trackHeight / 2;
        ctx.beginPath();

        for (let t = 0; t < histLen; t++) {
          const x = width - (histLen - 1 - t) * xStep;
          const uV = this.history[t].raw[ch];
          const y = yMid - uV * (trackHeight / 160.0) * this.scaleUv;

          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // 2. Draw Filtered trace (crisp cyber neon colors)
    ctx.lineWidth = 1.4;
    for (let ch = 0; ch < numChannels; ch++) {
      const channelInfo = CHANNELS_10_20[ch];
      const yMid = ch * trackHeight + trackHeight / 2;

      ctx.strokeStyle = channelInfo.color;
      ctx.beginPath();

      for (let t = 0; t < histLen; t++) {
        const x = width - (histLen - 1 - t) * xStep;
        const uV = this.history[t].filtered[ch];
        const y = yMid - uV * (trackHeight / 160.0) * this.scaleUv;

        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Draw Event Markers (vertical alert lines with badges)
    for (let t = 0; t < histLen; t++) {
      const marker = this.history[t].marker;
      if (marker) {
        const x = width - (histLen - 1 - t) * xStep;

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge at top
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`⚡ ${marker}`, x + 4, 14 + (t % 3) * 12);
      }
    }

    // Microvolt calibration scale bar in bottom right corner
    const scaleBarX = width - 75;
    const scaleBarY = height - 25;
    const barHeight50uV = 50.0 * (trackHeight / 160.0) * this.scaleUv;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX, scaleBarY - barHeight50uV);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText('50 µV', scaleBarX + 6, scaleBarY - barHeight50uV / 2 + 3);
  }
}
