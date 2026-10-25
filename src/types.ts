export type ElectrodeName =
  | 'Fp1' | 'Fp2'
  | 'F3'  | 'F4'
  | 'C3'  | 'C4'
  | 'P3'  | 'P4'
  | 'O1'  | 'O2'
  | 'F7'  | 'F8'
  | 'T3'  | 'T4'
  | 'T5'  | 'T6';

export interface ChannelInfo {
  name: ElectrodeName;
  index: number;
  label: string;
  lobe: 'frontal' | 'central' | 'parietal' | 'occipital' | 'temporal';
  hemisphere: 'left' | 'right';
  x: number; // 2D layout x (-1 to 1)
  y: number; // 2D layout y (-1 to 1)
  pos3D: [number, number, number]; // 3D scalp coordinate
  impedance: number; // kOhm
  color: string;
}

export interface EEGFrame {
  timestamp: number; // ms
  sampleIndex: number;
  raw: number[]; // 16 channels raw (uV)
  filtered: number[]; // 16 channels filtered (uV)
  artifacts: {
    blink: boolean;
    emg: boolean;
    lineNoise: boolean;
  };
  eventMarker?: string;
}

export interface FrequencyBandPower {
  delta: number; // 0.5 - 4 Hz
  theta: number; // 4 - 8 Hz
  alpha: number; // 8 - 13 Hz
  beta: number;  // 13 - 30 Hz
  gamma: number; // 30 - 100 Hz
  total: number;
  relative: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

export interface FilterSettings {
  highpass: boolean; // 0.5 Hz DC removal
  lowpass: boolean;  // 40 Hz high frequency cutoff
  notch50Hz: boolean; // 50 Hz powerline notch
  notch60Hz: boolean; // 60 Hz powerline notch
  bandpass: boolean; // 0.5 - 35 Hz standard clinical EEG
  artifactRemoval: boolean; // adaptive ocular/muscle subtraction
}

export type MotorImageryClass = 'left_hand' | 'right_hand' | 'rest';

export interface MotorImageryResult {
  prediction: MotorImageryClass;
  probabilities: {
    left_hand: number;
    right_hand: number;
    rest: number;
  };
  muPowerC3: number;
  muPowerC4: number;
  erdRatio: number; // Event-related desynchronization ratio
}

export interface P300State {
  matrix: string[][];
  activeFlash: { type: 'row' | 'col'; index: number } | null;
  targetChar: string;
  spelledText: string;
  epochBuffer: { flashTime: number; target: boolean; data: number[] }[];
  predictedChar: string | null;
  confidence: number;
  isSpelling: boolean;
}

export interface SSVEPResult {
  frequencies: number[]; // e.g. [10, 12, 15]
  targetDetected: number | null;
  snr: number[];
}

export type SleepStage = 'WAKE' | 'N1' | 'N2' | 'N3' | 'REM';

export interface DiagnosticMetrics {
  seizureDetected: boolean;
  seizureConfidence: number;
  seizureDurationSec: number;
  seizureHistory: { timestamp: number; duration: number }[];
  sleepStage: SleepStage;
  sleepStageHistory: { timestamp: number; stage: SleepStage }[];
  averageImpedance: number;
  badElectrodeCount: number;
  heartRateEstimateBpm: number;
}

export type ScenarioType =
  | 'motor_imagery'
  | 'p300_speller'
  | 'epilepsy_seizure'
  | 'berger_alpha'
  | 'sleep_staging'
  | 'free_stream';

export type Language = 'ar' | 'en';
