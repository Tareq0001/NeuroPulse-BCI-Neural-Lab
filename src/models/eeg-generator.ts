import { ChannelInfo, EEGFrame, ElectrodeName, ScenarioType } from '../types';

export const CHANNELS_10_20: ChannelInfo[] = [
  // Frontal polar
  { name: 'Fp1', index: 0, label: 'Frontopolar Left', lobe: 'frontal', hemisphere: 'left', x: -0.28, y: -0.85, pos3D: [-0.35, 0.35, 0.85], impedance: 3.2, color: '#38bdf8' },
  { name: 'Fp2', index: 1, label: 'Frontopolar Right', lobe: 'frontal', hemisphere: 'right', x: 0.28, y: -0.85, pos3D: [0.35, 0.35, 0.85], impedance: 3.4, color: '#38bdf8' },
  // Frontal
  { name: 'F3', index: 2, label: 'Frontal Left', lobe: 'frontal', hemisphere: 'left', x: -0.42, y: -0.5, pos3D: [-0.55, 0.6, 0.55], impedance: 4.1, color: '#06b6d4' },
  { name: 'F4', index: 3, label: 'Frontal Right', lobe: 'frontal', hemisphere: 'right', x: 0.42, y: -0.5, pos3D: [0.55, 0.6, 0.55], impedance: 3.8, color: '#06b6d4' },
  // Central (Sensorimotor cortex M1/S1)
  { name: 'C3', index: 4, label: 'Central Left (Motor)', lobe: 'central', hemisphere: 'left', x: -0.55, y: 0.0, pos3D: [-0.75, 0.65, 0.0], impedance: 2.8, color: '#8b5cf6' },
  { name: 'C4', index: 5, label: 'Central Right (Motor)', lobe: 'central', hemisphere: 'right', x: 0.55, y: 0.0, pos3D: [0.75, 0.65, 0.0], impedance: 2.9, color: '#8b5cf6' },
  // Parietal
  { name: 'P3', index: 6, label: 'Parietal Left (P300)', lobe: 'parietal', hemisphere: 'left', x: -0.42, y: 0.5, pos3D: [-0.55, 0.6, -0.55], impedance: 4.5, color: '#a855f7' },
  { name: 'P4', index: 7, label: 'Parietal Right (P300)', lobe: 'parietal', hemisphere: 'right', x: 0.42, y: 0.5, pos3D: [0.55, 0.6, -0.55], impedance: 4.2, color: '#a855f7' },
  // Occipital (Visual cortex V1 - Berger Alpha)
  { name: 'O1', index: 8, label: 'Occipital Left (Visual)', lobe: 'occipital', hemisphere: 'left', x: -0.28, y: 0.85, pos3D: [-0.35, 0.35, -0.85], impedance: 3.5, color: '#ec4899' },
  { name: 'O2', index: 9, label: 'Occipital Right (Visual)', lobe: 'occipital', hemisphere: 'right', x: 0.28, y: 0.85, pos3D: [0.35, 0.35, -0.85], impedance: 3.6, color: '#ec4899' },
  // Anterior Temporal / Inferior Frontal
  { name: 'F7', index: 10, label: 'Inferior Frontal Left', lobe: 'frontal', hemisphere: 'left', x: -0.8, y: -0.45, pos3D: [-0.85, 0.2, 0.45], impedance: 5.2, color: '#10b981' },
  { name: 'F8', index: 11, label: 'Inferior Frontal Right', lobe: 'frontal', hemisphere: 'right', x: 0.8, y: -0.45, pos3D: [0.85, 0.2, 0.45], impedance: 5.5, color: '#10b981' },
  // Mid-Temporal
  { name: 'T3', index: 12, label: 'Temporal Left', lobe: 'temporal', hemisphere: 'left', x: -0.88, y: 0.0, pos3D: [-0.95, 0.15, 0.0], impedance: 4.9, color: '#14b8a6' },
  { name: 'T4', index: 13, label: 'Temporal Right', lobe: 'temporal', hemisphere: 'right', x: 0.88, y: 0.0, pos3D: [0.95, 0.15, 0.0], impedance: 5.1, color: '#14b8a6' },
  // Posterior Temporal
  { name: 'T5', index: 14, label: 'Posterior Temporal Left', lobe: 'temporal', hemisphere: 'left', x: -0.8, y: 0.45, pos3D: [-0.85, 0.2, -0.45], impedance: 4.7, color: '#0ea5e9' },
  { name: 'T6', index: 15, label: 'Posterior Temporal Right', lobe: 'temporal', hemisphere: 'right', x: 0.8, y: 0.45, pos3D: [0.85, 0.2, -0.45], impedance: 4.8, color: '#0ea5e9' }
];

export class EEGGenerator {
  public sampleRate = 250; // Hz
  private time = 0; // seconds
  private sampleCount = 0;

  // Active scenario
  public scenario: ScenarioType = 'motor_imagery';

  // Interactive controls
  public eyesClosed = false;
  public userMotorIntent: 'left_hand' | 'right_hand' | 'rest' = 'rest';
  public injectBlink = false;
  public injectEMG = false;
  public injectLineNoise = false;
  public injectSeizure = false;

  // P300 stimulation queue
  private p300Queue: { triggerTime: number; target: boolean }[] = [];

  // Random noise state
  private pinkNoiseState: number[] = new Array(16).fill(0);

  constructor() {}

  public setScenario(scenario: ScenarioType): void {
    this.scenario = scenario;
    if (scenario === 'berger_alpha') {
      this.eyesClosed = true;
      this.injectSeizure = false;
      this.userMotorIntent = 'rest';
    } else if (scenario === 'epilepsy_seizure') {
      this.injectSeizure = true;
      this.eyesClosed = false;
      this.userMotorIntent = 'rest';
    } else if (scenario === 'motor_imagery') {
      this.injectSeizure = false;
      this.eyesClosed = false;
      this.userMotorIntent = 'right_hand';
    } else if (scenario === 'p300_speller') {
      this.injectSeizure = false;
      this.eyesClosed = false;
      this.userMotorIntent = 'rest';
    }
  }

  public triggerP300Flash(isTarget: boolean): void {
    this.p300Queue.push({ triggerTime: this.time, target: isTarget });
    // Keep max 20 events in queue
    if (this.p300Queue.length > 20) {
      this.p300Queue.shift();
    }
  }

  /**
   * Generates a single 16-channel EEG frame at 250 Hz (dt = 0.004s)
   */
  public nextFrame(): EEGFrame {
    const dt = 1.0 / this.sampleRate;
    this.time += dt;
    this.sampleCount++;

    const raw: number[] = new Array(16).fill(0);
    const artifacts = {
      blink: false,
      emg: false,
      lineNoise: this.injectLineNoise
    };
    let eventMarker: string | undefined = undefined;

    // Check blink artifact injection (or natural 4-second random blink)
    const isBlinking = this.injectBlink || (Math.sin(this.time * 0.35) > 0.985);
    if (isBlinking) {
      artifacts.blink = true;
    }

    // Check EMG muscle clench
    const isEMG = this.injectEMG || (Math.sin(this.time * 0.18) > 0.98);
    if (isEMG) {
      artifacts.emg = true;
    }

    // 1. Generate physiological rhythms per electrode
    for (let i = 0; i < CHANNELS_10_20.length; i++) {
      const ch = CHANNELS_10_20[i];

      // Base 1/f Pink Noise generator (Voss-McCartney algorithm approximation)
      const white = (Math.random() - 0.5) * 8.0;
      this.pinkNoiseState[i] = this.pinkNoiseState[i] * 0.92 + white * 0.18;
      let voltage = this.pinkNoiseState[i];

      // Physiological Frequency Bands:
      // Delta rhythm (1.5 - 2.5 Hz) - high during sleep
      let deltaAmp = 4.0;
      if (this.scenario === 'sleep_staging') {
        const sleepCycle = (Math.sin(this.time * 0.1) + 1) * 0.5; // slow cycle
        deltaAmp = 5.0 + sleepCycle * 65.0; // N3 deep sleep slow wave
      }
      voltage += Math.sin(2 * Math.PI * 1.8 * this.time + i * 0.4) * deltaAmp;

      // Theta rhythm (5 - 6.5 Hz) - frontal midline
      let thetaAmp = (ch.lobe === 'frontal') ? 8.0 : 3.0;
      voltage += Math.sin(2 * Math.PI * 5.5 * this.time + i * 0.8) * thetaAmp;

      // Alpha / Berger Rhythm (9.5 - 11 Hz)
      let alphaAmp = 5.0;
      if (ch.lobe === 'occipital' || ch.lobe === 'parietal') {
        if (this.eyesClosed || this.scenario === 'berger_alpha') {
          // Synchronized Berger Alpha Rhythm (60 - 80 uV peak)
          alphaAmp = 65.0 + Math.sin(this.time * 1.2) * 15.0;
        } else {
          alphaAmp = 8.0; // Desynchronized eyes-open baseline
        }
      }
      voltage += Math.sin(2 * Math.PI * 10.2 * this.time + i * 0.25) * alphaAmp;

      // Sensorimotor Mu & Beta rhythm (C3, C4) for Motor Imagery BCI
      if (ch.name === 'C3' || ch.name === 'C4') {
        let muAmp = 22.0; // nominal 10 Hz mu rhythm at rest
        let betaAmp = 12.0; // nominal 20 Hz beta rhythm

        if (this.scenario === 'motor_imagery') {
          if (this.userMotorIntent === 'left_hand') {
            // Left hand imagery causes Contralateral ERD in Right motor cortex (C4)
            if (ch.name === 'C4') {
              muAmp = 4.0; // ERD suppression
              betaAmp = 4.0;
            } else if (ch.name === 'C3') {
              muAmp = 30.0; // ERS synchronization
              betaAmp = 18.0;
            }
          } else if (this.userMotorIntent === 'right_hand') {
            // Right hand imagery causes Contralateral ERD in Left motor cortex (C3)
            if (ch.name === 'C3') {
              muAmp = 4.0; // ERD suppression
              betaAmp = 4.0;
            } else if (ch.name === 'C4') {
              muAmp = 30.0; // ERS synchronization
              betaAmp = 18.0;
            }
          }
        }

        voltage += Math.sin(2 * Math.PI * 10.0 * this.time + i * 0.5) * muAmp;
        voltage += Math.sin(2 * Math.PI * 21.0 * this.time + i * 0.9) * betaAmp;
      } else {
        // Normal cortical beta
        voltage += Math.sin(2 * Math.PI * 19.5 * this.time + i * 0.6) * 5.0;
      }

      // Gamma bursts (40 Hz)
      voltage += Math.sin(2 * Math.PI * 40.0 * this.time + i * 1.1) * 2.5;

      // 2. Epileptic 3-Hz Spike-and-Wave Paroxysm (Generalized Absence Seizure)
      if (this.injectSeizure || this.scenario === 'epilepsy_seizure') {
        const seizurePhase = (this.time * 3.0) % 1.0; // 3 Hz cycle (T = 0.333s)
        let spikeWave = 0;
        if (seizurePhase < 0.12) {
          // Sharp narrow spike (up to -240 uV)
          spikeWave = -220.0 * Math.sin((seizurePhase / 0.12) * Math.PI);
        } else {
          // Broad dome slow wave (up to +140 uV)
          const slowPhase = (seizurePhase - 0.12) / 0.88;
          spikeWave = 130.0 * Math.sin(slowPhase * Math.PI);
        }
        voltage += spikeWave;
        eventMarker = '3Hz Spike-Wave Discharge';
      }

      // 3. P300 Oddball Event-Related Potential (ERP)
      // Canonical P300 response: N100 (neg at 100ms), P200 (pos at 200ms), P300 (large positive at 300ms)
      for (const p of this.p300Queue) {
        const dtFlash = this.time - p.triggerTime;
        if (dtFlash >= 0.05 && dtFlash <= 0.6) {
          if (p.target) {
            // Target stimulus evokes prominent P300 primarily on P3, P4, C3, C4
            const weight = (ch.lobe === 'parietal' || ch.lobe === 'central') ? 1.0 : 0.4;
            // Gaussian P300 wave peaked at 300ms (width 80ms)
            const p300 = 24.0 * Math.exp(-Math.pow((dtFlash - 0.30) / 0.07, 2));
            const n100 = -8.0 * Math.exp(-Math.pow((dtFlash - 0.11) / 0.04, 2));
            const p200 = 6.0 * Math.exp(-Math.pow((dtFlash - 0.19) / 0.05, 2));
            voltage += (p300 + n100 + p200) * weight;
            eventMarker = 'P300 Oddball Target ERP';
          }
        }
      }

      // 4. Artifacts:
      // Ocular Blinks: large biphasic deflection (150 uV) focused on Fp1/Fp2 with frontal decay
      if (isBlinking) {
        const blinkDist = Math.max(0, 1.0 - (ch.pos3D[1] * -1.0 + 1.0) * 0.5);
        const blinkAmp = (ch.name === 'Fp1' || ch.name === 'Fp2') ? 160.0 : (ch.lobe === 'frontal' ? 45.0 : 5.0);
        const blinkShape = Math.sin((this.time * 6.0) % Math.PI);
        voltage += blinkShape * blinkAmp;
      }

      // EMG Muscle Tension: high frequency jagged spikes on temporal electrodes
      if (isEMG && (ch.lobe === 'temporal' || ch.name === 'F7' || ch.name === 'F8')) {
        voltage += (Math.random() - 0.5) * 80.0;
      }

      // 50/60 Hz Powerline electromagnetic hum
      if (this.injectLineNoise) {
        voltage += Math.sin(2 * Math.PI * 50.0 * this.time) * 35.0;
      }

      // DC Baseline wander (< 0.5 Hz slow drift)
      voltage += Math.sin(this.time * 0.15 + i) * 15.0;

      raw[i] = Math.round(voltage * 100) / 100;
    }

    return {
      timestamp: Math.round(this.time * 1000),
      sampleIndex: this.sampleCount,
      raw,
      filtered: [...raw], // DSPPipeline will filter this
      artifacts,
      eventMarker
    };
  }
}
