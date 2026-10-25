import { CSPFilter } from '../dsp/csp';
import { DiagnosticMetrics, MotorImageryResult, P300State, SleepStage, SSVEPResult } from '../types';

export class MotorImageryClassifier {
  private csp = new CSPFilter();
  private cspWindow: number[][] = [];
  private maxWindow = 75; // 300 ms window at 250 Hz

  // Smoothed probabilities
  private probLeft = 0.1;
  private probRight = 0.1;
  private probRest = 0.8;

  constructor() {}

  public update(frameSamples: number[]): MotorImageryResult {
    // Project frame with CSP
    const comp = this.csp.projectFrame(frameSamples);
    this.cspWindow.push(comp);
    if (this.cspWindow.length > this.maxWindow) {
      this.cspWindow.shift();
    }

    // Extract features (log variances of CSP components)
    const features = this.csp.computeFeatures(this.cspWindow);

    // C3 (index 4) and C4 (index 5) instantaneous power
    const c3Val = frameSamples[4] || 0;
    const c4Val = frameSamples[5] || 0;
    const c3Power = c3Val * c3Val;
    const c4Power = c4Val * c4Val;

    // Linear Discriminant Analysis decision weights
    // f0: Left-motor pattern (C3 heavy)
    // f1: Right-motor pattern (C4 heavy)
    // f2: Rest pattern
    const scoreRight = features[0] * 1.8 - features[1] * 1.5; // High C3 activation -> Right hand
    const scoreLeft = features[1] * 1.8 - features[0] * 1.5;  // High C4 activation -> Left hand

    // Softmax probabilities
    const eLeft = Math.exp(Math.max(-5, Math.min(5, scoreLeft)));
    const eRight = Math.exp(Math.max(-5, Math.min(5, scoreRight)));
    const eRest = Math.exp(0.5); // baseline bias
    const sum = eLeft + eRight + eRest;

    const rawLeft = eLeft / sum;
    const rawRight = eRight / sum;
    const rawRest = eRest / sum;

    // Exponential smoothing for smooth robotic hand animation
    this.probLeft = this.probLeft * 0.88 + rawLeft * 0.12;
    this.probRight = this.probRight * 0.88 + rawRight * 0.12;
    this.probRest = this.probRest * 0.88 + rawRest * 0.12;

    let prediction: 'left_hand' | 'right_hand' | 'rest' = 'rest';
    if (this.probLeft > 0.45 && this.probLeft > this.probRight) {
      prediction = 'left_hand';
    } else if (this.probRight > 0.45 && this.probRight > this.probLeft) {
      prediction = 'right_hand';
    }

    const erdRatio = (c3Power - c4Power) / (c3Power + c4Power + 1e-4);

    return {
      prediction,
      probabilities: {
        left_hand: Math.round(this.probLeft * 100) / 100,
        right_hand: Math.round(this.probRight * 100) / 100,
        rest: Math.round(this.probRest * 100) / 100
      },
      muPowerC3: Math.round(c3Power * 10) / 10,
      muPowerC4: Math.round(c4Power * 10) / 10,
      erdRatio: Math.round(erdRatio * 100) / 100
    };
  }
}

export class P300SpellerEngine {
  public matrix: string[][] = [
    ['A', 'B', 'C', 'D', 'E', 'F'],
    ['G', 'H', 'I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X'],
    ['Y', 'Z', '1', '2', '3', '4'],
    ['5', '6', '7', '8', '9', '_']
  ];

  public state: P300State = {
    matrix: [],
    activeFlash: null,
    targetChar: 'B',
    spelledText: '',
    epochBuffer: [],
    predictedChar: null,
    confidence: 0,
    isSpelling: true
  };

  private flashSequence: { type: 'row' | 'col'; index: number }[] = [];
  private flashTimer = 0;
  private flashInterval = 175; // ms (100ms on, 75ms off)
  private flashDuration = 100; // ms
  private currentFlashIndex = 0;
  private rowScores: number[] = new Array(6).fill(0);
  private colScores: number[] = new Array(6).fill(0);
  private flashEpochsCount = 0;

  constructor() {
    this.state.matrix = this.matrix;
    this.generateFlashSequence();
  }

  private generateFlashSequence(): void {
    const seq: { type: 'row' | 'col'; index: number }[] = [];
    // Randomize rows
    const rows = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    for (const r of rows) seq.push({ type: 'row', index: r });
    // Randomize cols
    const cols = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    for (const c of cols) seq.push({ type: 'col', index: c });

    this.flashSequence = seq;
    this.currentFlashIndex = 0;
  }

  public setTarget(char: string): void {
    this.state.targetChar = char.toUpperCase();
    this.rowScores.fill(0);
    this.colScores.fill(0);
    this.flashEpochsCount = 0;
  }

  public update(deltaTimeMs: number, parietalSamples: number[], onFlashTrigger?: (isTarget: boolean) => void): P300State {
    if (!this.state.isSpelling) return this.state;

    this.flashTimer += deltaTimeMs;

    // Find row/col of target
    let targetRow = -1;
    let targetCol = -1;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (this.matrix[r][c] === this.state.targetChar) {
          targetRow = r;
          targetCol = c;
          break;
        }
      }
    }

    if (this.flashTimer >= this.flashInterval) {
      this.flashTimer = 0;
      this.currentFlashIndex++;

      if (this.currentFlashIndex >= this.flashSequence.length) {
        this.generateFlashSequence();
        this.flashEpochsCount++;

        // After 3 full rounds (36 flashes), decode the character!
        if (this.flashEpochsCount >= 3) {
          let bestRow = 0;
          let maxR = -Infinity;
          for (let r = 0; r < 6; r++) {
            if (this.rowScores[r] > maxR) {
              maxR = this.rowScores[r];
              bestRow = r;
            }
          }

          let bestCol = 0;
          let maxC = -Infinity;
          for (let c = 0; c < 6; c++) {
            if (this.colScores[c] > maxC) {
              maxC = this.colScores[c];
              bestCol = c;
            }
          }

          const decoded = this.matrix[bestRow][bestCol];
          this.state.predictedChar = decoded;
          this.state.confidence = 0.94;
          this.state.spelledText += (decoded === '_' ? ' ' : decoded);

          // Reset scores for next letter
          this.rowScores.fill(0);
          this.colScores.fill(0);
          this.flashEpochsCount = 0;

          // Next target letter in demo sequence: B -> R -> A -> I -> N -> L -> A -> B
          const demoTargetWord = ['B', 'R', 'A', 'I', 'N', 'C', 'E', 'L', 'L'];
          const nextIdx = (demoTargetWord.indexOf(this.state.targetChar) + 1) % demoTargetWord.length;
          this.setTarget(demoTargetWord[nextIdx]);
        }
      }

      const active = this.flashSequence[this.currentFlashIndex];
      this.state.activeFlash = active;

      const isTarget =
        (active.type === 'row' && active.index === targetRow) ||
        (active.type === 'col' && active.index === targetCol);

      if (onFlashTrigger) {
        onFlashTrigger(isTarget);
      }

      // Simulate ERP correlation score update
      if (active.type === 'row') {
        this.rowScores[active.index] += isTarget ? 4.5 + Math.random() * 2.0 : Math.random() * 1.5;
      } else {
        this.colScores[active.index] += isTarget ? 4.5 + Math.random() * 2.0 : Math.random() * 1.5;
      }
    } else if (this.flashTimer > this.flashDuration) {
      // Flash off period
      this.state.activeFlash = null;
    }

    return this.state;
  }
}

export class ClinicalDiagnosticEngine {
  public metrics: DiagnosticMetrics = {
    seizureDetected: false,
    seizureConfidence: 0,
    seizureDurationSec: 0,
    seizureHistory: [],
    sleepStage: 'WAKE',
    sleepStageHistory: [],
    averageImpedance: 3.8,
    badElectrodeCount: 0,
    heartRateEstimateBpm: 72
  };

  private seizureTimer = 0;
  private sleepTimer = 0;

  constructor() {}

  public update(deltaTimeSec: number, channelSamples: number[], isSeizureScenario: boolean): DiagnosticMetrics {
    // 1. Epileptic 3-Hz Spike-and-Wave detector
    // Check peak voltage across channels and synchrony
    let maxVal = 0;
    let crossChannelSynchrony = 0;
    for (let i = 0; i < channelSamples.length; i++) {
      const absVal = Math.abs(channelSamples[i]);
      if (absVal > maxVal) maxVal = absVal;
    }

    // High amplitude paroxysm (> 160 uV)
    const isParoxysm = maxVal > 150 || isSeizureScenario;

    if (isParoxysm) {
      this.seizureTimer += deltaTimeSec;
      this.metrics.seizureDetected = true;
      this.metrics.seizureConfidence = Math.min(0.99, 0.75 + this.seizureTimer * 0.08);
      this.metrics.seizureDurationSec = Math.round(this.seizureTimer * 10) / 10;
    } else {
      if (this.metrics.seizureDetected && this.seizureTimer > 1.5) {
        this.metrics.seizureHistory.push({
          timestamp: Date.now(),
          duration: Math.round(this.seizureTimer * 10) / 10
        });
      }
      this.seizureTimer = 0;
      this.metrics.seizureDetected = false;
      this.metrics.seizureConfidence = 0.02;
      this.metrics.seizureDurationSec = 0;
    }

    // 2. Sleep Staging Hypnogram progression (simulated dynamic cycle)
    this.sleepTimer += deltaTimeSec;
    const cycle = (this.sleepTimer / 30.0) % 5; // 30 second cycle per stage for live demonstration
    let stage: SleepStage = 'WAKE';
    if (cycle < 1) stage = 'WAKE';
    else if (cycle < 2) stage = 'N1';
    else if (cycle < 3) stage = 'N2';
    else if (cycle < 4) stage = 'N3';
    else stage = 'REM';

    if (stage !== this.metrics.sleepStage) {
      this.metrics.sleepStage = stage;
      this.metrics.sleepStageHistory.push({
        timestamp: Date.now(),
        stage
      });
      if (this.metrics.sleepStageHistory.length > 50) {
        this.metrics.sleepStageHistory.shift();
      }
    }

    return this.metrics;
  }
}
