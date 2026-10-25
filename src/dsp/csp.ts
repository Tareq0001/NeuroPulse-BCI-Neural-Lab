/**
 * Common Spatial Pattern (CSP) Filter for 16-Channel Motor Imagery Decoding
 * Projects multi-channel EEG signals into a subspace that maximizes difference in
 * variance between Left Hand vs Right Hand vs Rest motor trials.
 */
export class CSPFilter {
  // Pre-calibrated spatial filters for the standard 10-20 layout
  // Optimized for C3 (index 4) and C4 (index 5) contralateral motor cortex ERD/ERS
  // Filter 0: Accentuates Left motor cortex (Right hand movement)
  // Filter 1: Accentuates Right motor cortex (Left hand movement)
  // Filter 2: Neutral / Rest baseline filter
  private filters: number[][] = [
    // Left-motor spatial pattern (strongly weights C3 and neighbors F3, P3)
    [0.05, 0.0, 0.25, -0.1, 0.65, -0.4, 0.2, -0.05, 0.0, 0.0, 0.1, -0.05, 0.15, -0.1, 0.05, -0.05],
    // Right-motor spatial pattern (strongly weights C4 and neighbors F4, P4)
    [0.0, 0.05, -0.1, 0.25, -0.4, 0.65, -0.05, 0.2, 0.0, 0.0, -0.05, 0.1, -0.1, 0.15, -0.05, 0.05],
    // Diffuse / Rest motor pattern (balanced central-parietal baseline)
    [0.05, 0.05, 0.1, 0.1, 0.25, 0.25, 0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 0.05, 0.05]
  ];

  constructor() {}

  /**
   * Projects a single 16-channel EEG frame into CSP spatial components
   */
  public projectFrame(samples: number[]): number[] {
    const components: number[] = new Array(this.filters.length).fill(0);
    const n = Math.min(samples.length, 16);

    for (let f = 0; f < this.filters.length; f++) {
      let sum = 0;
      const weights = this.filters[f];
      for (let i = 0; i < n; i++) {
        sum += samples[i] * weights[i];
      }
      components[f] = sum;
    }

    return components;
  }

  /**
   * Computes normalized log-variance feature vectors across a sliding window of CSP components
   */
  public computeFeatures(componentWindows: number[][]): number[] {
    // componentWindows: array of projected frames across time window (e.g. 50-100 samples)
    const numFilters = this.filters.length;
    const variances = new Array(numFilters).fill(0);
    const windowLength = componentWindows.length;

    if (windowLength === 0) return [0, 0, 0];

    // Calculate means
    const means = new Array(numFilters).fill(0);
    for (let t = 0; t < windowLength; t++) {
      for (let f = 0; f < numFilters; f++) {
        means[f] += componentWindows[t][f];
      }
    }
    for (let f = 0; f < numFilters; f++) {
      means[f] /= windowLength;
    }

    // Calculate variances
    for (let t = 0; t < windowLength; t++) {
      for (let f = 0; f < numFilters; f++) {
        const diff = componentWindows[t][f] - means[f];
        variances[f] += diff * diff;
      }
    }

    let totalVar = 0;
    for (let f = 0; f < numFilters; f++) {
      variances[f] /= windowLength;
      totalVar += variances[f];
    }

    if (totalVar <= 1e-6) totalVar = 1e-6;

    // Log normalized variance: f_i = log(var_i / sum(var))
    const features = new Array(numFilters);
    for (let f = 0; f < numFilters; f++) {
      features[f] = Math.log((variances[f] / totalVar) + 1e-6);
    }

    return features;
  }
}
