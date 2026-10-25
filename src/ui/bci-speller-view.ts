import { P300State } from '../types';

export class BCISpellerView {
  private container: HTMLElement;
  private erpCanvas: HTMLCanvasElement;
  private erpCtx: CanvasRenderingContext2D;
  private cells: HTMLElement[][] = [];

  constructor(container: HTMLElement, erpCanvas: HTMLCanvasElement) {
    this.container = container;
    this.erpCanvas = erpCanvas;
    this.erpCtx = erpCanvas.getContext('2d', { alpha: false })!;
    this.buildMatrixUI();
    this.resizeERP();
    window.addEventListener('resize', () => this.resizeERP());
  }

  private buildMatrixUI(): void {
    this.container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'p300-grid';

    const matrix = [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P', 'Q', 'R'],
      ['S', 'T', 'U', 'V', 'W', 'X'],
      ['Y', 'Z', '1', '2', '3', '4'],
      ['5', '6', '7', '8', '9', '_']
    ];

    this.cells = [];
    for (let r = 0; r < 6; r++) {
      this.cells[r] = [];
      for (let c = 0; c < 6; c++) {
        const cell = document.createElement('div');
        cell.className = 'p300-cell';
        cell.textContent = matrix[r][c];
        cell.dataset.row = r.toString();
        cell.dataset.col = c.toString();
        grid.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }

    this.container.appendChild(grid);
  }

  private resizeERP(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.erpCanvas.getBoundingClientRect();
    this.erpCanvas.width = (rect.width || 300) * dpr;
    this.erpCanvas.height = (rect.height || 140) * dpr;
    this.erpCtx.scale(dpr, dpr);
  }

  public update(state: P300State): void {
    const active = state.activeFlash;

    // Reset cell states and apply flash styles
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cell = this.cells[r][c];
        const char = cell.textContent;

        const isRowActive = active && active.type === 'row' && active.index === r;
        const isColActive = active && active.type === 'col' && active.index === c;
        const isTarget = char === state.targetChar;

        let cls = 'p300-cell';
        if (isRowActive || isColActive) {
          cls += ' flash';
        }
        if (isTarget) {
          cls += ' target-char';
        }
        cell.className = cls;
      }
    }

    this.renderERPWaveform(state.targetChar);
  }

  private renderERPWaveform(targetChar: string): void {
    const rect = this.erpCanvas.getBoundingClientRect();
    const w = rect.width || 300;
    const h = rect.height || 140;
    const ctx = this.erpCtx;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;

    // Zero baseline
    const y0 = h / 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0);
    ctx.stroke();

    // 300ms vertical indicator line
    const x300 = (300 / 600) * w;
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x300, 0);
    ctx.lineTo(x300, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ec4899';
    ctx.font = '9px monospace';
    ctx.fillText('P300 (300ms)', x300 + 4, 14);

    // Draw Non-target average curve (flat noise in gray)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let t = 0; t <= 600; t += 10) {
      const x = (t / 600) * w;
      const noise = Math.sin(t * 0.05) * 4.0;
      const y = y0 - noise;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Target ERP curve: N100 (-), P200 (+), P300 (++ peak at 300ms), N400 (-)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let t = 0; t <= 600; t += 5) {
      const x = (t / 600) * w;
      const dtSec = t / 1000.0;
      const p300 = 35.0 * Math.exp(-Math.pow((dtSec - 0.30) / 0.07, 2));
      const n100 = -12.0 * Math.exp(-Math.pow((dtSec - 0.11) / 0.04, 2));
      const p200 = 10.0 * Math.exp(-Math.pow((dtSec - 0.19) / 0.05, 2));
      const y = y0 - (p300 + n100 + p200);

      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Title badge
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Target '${targetChar}' ERP Response (Pz Electrode)`, 8, h - 8);
  }
}
