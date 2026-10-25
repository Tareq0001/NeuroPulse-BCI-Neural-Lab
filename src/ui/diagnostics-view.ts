import { CHANNELS_10_20 } from '../models/eeg-generator';
import { DiagnosticMetrics, SleepStage } from '../types';

export class DiagnosticsView {
  private hypnogramCanvas: HTMLCanvasElement;
  private impedanceCanvas: HTMLCanvasElement;
  private hypnogramCtx: CanvasRenderingContext2D;
  private impedanceCtx: CanvasRenderingContext2D;

  private sleepStagesOrder: SleepStage[] = ['WAKE', 'REM', 'N1', 'N2', 'N3'];

  constructor(hypnogramCanvas: HTMLCanvasElement, impedanceCanvas: HTMLCanvasElement) {
    this.hypnogramCanvas = hypnogramCanvas;
    this.impedanceCanvas = impedanceCanvas;

    this.hypnogramCtx = hypnogramCanvas.getContext('2d', { alpha: false })!;
    this.impedanceCtx = impedanceCanvas.getContext('2d', { alpha: false })!;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const hRect = this.hypnogramCanvas.getBoundingClientRect();
    this.hypnogramCanvas.width = (hRect.width || 400) * dpr;
    this.hypnogramCanvas.height = (hRect.height || 180) * dpr;
    this.hypnogramCtx.scale(dpr, dpr);

    const iRect = this.impedanceCanvas.getBoundingClientRect();
    this.impedanceCanvas.width = (iRect.width || 220) * dpr;
    this.impedanceCanvas.height = (iRect.height || 220) * dpr;
    this.impedanceCtx.scale(dpr, dpr);
  }

  public update(metrics: DiagnosticMetrics): void {
    this.renderHypnogram(metrics);
    this.renderImpedanceMap();
  }

  private renderHypnogram(metrics: DiagnosticMetrics): void {
    const rect = this.hypnogramCanvas.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 180;
    const ctx = this.hypnogramCtx;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const stages = this.sleepStagesOrder;
    const stageYStep = (h - 40) / (stages.length - 1);

    // Grid lines for stages
    for (let i = 0; i < stages.length; i++) {
      const y = 20 + i * stageYStep;
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();

      ctx.fillStyle = stages[i] === metrics.sleepStage ? '#06b6d4' : '#64748b';
      ctx.font = stages[i] === metrics.sleepStage ? 'bold 10px monospace' : '10px monospace';
      ctx.fillText(stages[i], 10, y + 3);
    }

    // Draw hypnogram history steps
    const history = metrics.sleepStageHistory;
    if (history.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.beginPath();

      const xStep = (w - 70) / Math.max(20, history.length - 1);
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const stageIdx = stages.indexOf(item.stage);
        const y = 20 + stageIdx * stageYStep;
        const x = 55 + i * xStep;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Stepped hypnogram line
          const prevStageIdx = stages.indexOf(history[i - 1].stage);
          const prevY = 20 + prevStageIdx * stageYStep;
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Active stage tag
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Current Sleep Stage: ${metrics.sleepStage}`, w - 190, 16);
  }

  private renderImpedanceMap(): void {
    const rect = this.impedanceCanvas.getBoundingClientRect();
    const w = rect.width || 220;
    const h = rect.height || 220;
    const ctx = this.impedanceCtx;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 5;
    const radius = Math.min(w, h) * 0.38;

    // Draw 2D Head Outline with nose and ears
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Nose
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY - radius);
    ctx.lineTo(centerX, centerY - radius - 12);
    ctx.lineTo(centerX + 10, centerY - radius);
    ctx.stroke();

    // Left & Right Ears
    ctx.beginPath();
    ctx.arc(centerX - radius - 2, centerY, 8, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX + radius + 2, centerY, 8, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Electrodes
    for (const ch of CHANNELS_10_20) {
      const ex = centerX + ch.x * radius * 0.9;
      const ey = centerY + ch.y * radius * 0.9;

      const color = ch.impedance < 5 ? '#10b981' : (ch.impedance < 10 ? '#f59e0b' : '#ef4444');

      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ch.name, ex, ey + 3);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.fillText('10-20 Scalp Impedance (<5kΩ Normal)', 10, 14);
  }
}
