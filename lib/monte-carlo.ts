import { Criterion, Option, ScoreRange, OptionSimulationResult, MonteCarloResult } from "./types";

/**
 * Fast 32-bit pseudo-random number generator (Mulberry32).
 * Produces deterministic, high-entropy pseudorandom sequences in [0, 1)
 * for reproducible unit tests and verifiable decision snapshots.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed | 0;
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Marsaglia and Tsang's method for generating Gamma(alpha, 1) random variates.
 * Standard algorithm used in numerical statistical packages.
 */
function sampleGamma(alpha: number, rng: () => number = Math.random): number {
  if (alpha < 1) {
    // Boost alpha by multiplying with Uniform^(1/alpha)
    const u = rng();
    return sampleGamma(alpha + 1, rng) * Math.pow(u || 1e-10, 1 / alpha);
  }

  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    // Generate standard normal variate using Box-Muller transform
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);

    const v = 1 + c * z;
    if (v <= 0) continue;

    const v3 = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * z * z * z * z) {
      return d * v3;
    }

    if (Math.log(u || 1e-10) < 0.5 * z * z + d * (1 - v3 + Math.log(v3))) {
      return d * v3;
    }
  }
}

/**
 * Samples a random variable from a Beta-PERT distribution with:
 * min = a, mode = m, max = b.
 */
export function sampleBetaPert(
  min: number,
  mode: number,
  max: number,
  rng: () => number = Math.random
): number {
  if (min >= max) return mode;
  const range = max - min;

  // PERT shape parameters
  const alpha = 1 + 4 * ((mode - min) / range);
  const beta = 1 + 4 * ((max - mode) / range);

  const y1 = sampleGamma(alpha, rng);
  const y2 = sampleGamma(beta, rng);
  const betaSample = y1 / (y1 + y2 || 1e-10);

  return min + betaSample * range;
}

/**
 * Resolves or estimates the 3-point score range for a criterion given an option and overall confidence.
 */
export function getScoreRange(
  option: Option,
  criterionId: string,
  confidence: number
): ScoreRange {
  if (option.ranges && option.ranges[criterionId]) {
    return option.ranges[criterionId];
  }

  const mode = option.scores[criterionId] ?? 5;
  // Epistemic uncertainty spread derived from confidence (20% to 95%)
  const uncertainty = (100 - confidence) / 100;
  const spread = Math.max(0.4, uncertainty * 2.8);

  const min = Math.max(1, Number((mode - spread).toFixed(1)));
  const max = Math.min(10, Number((mode + spread).toFixed(1)));

  return { min, mode, max };
}

/**
 * Runs a fast Monte Carlo simulation (default 10,000 iterations)
 * over all options and criteria using Beta-PERT distributions.
 */
export function runMonteCarloSimulation(
  criteria: Criterion[],
  options: Option[],
  confidence: number,
  iterations: number = 10000,
  seed?: number
): MonteCarloResult {
  if (options.length === 0 || criteria.length === 0) {
    return {
      iterations: 0,
      options: [],
      leaderId: "",
      leaderProbability: 0,
      summaryText: "No options or criteria to simulate.",
    };
  }

  const rng = seed !== undefined ? createMulberry32(seed) : Math.random;

  const totalWeight = criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0) || 1;
  const normalizedWeights = criteria.map((c) => ({
    id: c.id,
    weightFraction: Math.max(0, c.weight) / totalWeight,
  }));

  // Pre-resolve 3-point ranges for all (option, criterion) pairs for speed
  const rangeLookup = new Map<string, ScoreRange>();
  for (const opt of options) {
    for (const c of criteria) {
      const key = `${opt.id}__${c.id}`;
      rangeLookup.set(key, getScoreRange(opt, c.id, confidence));
    }
  }

  // Pre-allocate arrays for iteration samples
  const optionSamples: Float32Array[] = options.map(() => new Float32Array(iterations));
  const winCounts = new Uint32Array(options.length);

  // Run Monte Carlo simulation trials
  for (let k = 0; k < iterations; k++) {
    let bestScore = -Infinity;
    let winningOptionIndex = 0;

    for (let optIdx = 0; optIdx < options.length; optIdx++) {
      const opt = options[optIdx];
      let iterationScore = 0;

      for (let cIdx = 0; cIdx < normalizedWeights.length; cIdx++) {
        const { id, weightFraction } = normalizedWeights[cIdx];
        const range = rangeLookup.get(`${opt.id}__${id}`)!;
        const sampledVal = sampleBetaPert(range.min, range.mode, range.max, rng);
        iterationScore += sampledVal * weightFraction;
      }

      optionSamples[optIdx][k] = iterationScore;

      if (iterationScore > bestScore) {
        bestScore = iterationScore;
        winningOptionIndex = optIdx;
      }
    }

    winCounts[winningOptionIndex]++;
  }

  // Calculate statistics, percentiles, and histograms for each option
  const simulationResults: OptionSimulationResult[] = options.map((opt, optIdx) => {
    const rawSamples = Array.from(optionSamples[optIdx]);
    rawSamples.sort((a, b) => a - b);

    const sum = rawSamples.reduce((a, b) => a + b, 0);
    const mean = Number((sum / iterations).toFixed(2));

    const variance =
      rawSamples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / iterations;
    const stdDev = Number(Math.sqrt(variance).toFixed(2));

    const p10 = Number(rawSamples[Math.floor(0.1 * iterations)].toFixed(2));
    const p50 = Number(rawSamples[Math.floor(0.5 * iterations)].toFixed(2));
    const p90 = Number(rawSamples[Math.floor(0.9 * iterations)].toFixed(2));
    const var95 = Number(rawSamples[Math.floor(0.05 * iterations)].toFixed(2));

    // 20 histogram bins between 0 and 10
    const binCount = 20;
    const histogram = new Array(binCount).fill(0);
    for (const val of rawSamples) {
      const binIdx = Math.min(binCount - 1, Math.max(0, Math.floor((val / 10) * binCount)));
      histogram[binIdx]++;
    }

    const winProbability = Number(((winCounts[optIdx] / iterations) * 100).toFixed(1));

    return {
      optionId: opt.id,
      optionName: opt.name,
      winProbability,
      mean,
      stdDev,
      p10,
      p50,
      p90,
      var95,
      histogram,
    };
  });

  // Sort by highest win probability
  simulationResults.sort((a, b) => b.winProbability - a.winProbability);

  const leader = simulationResults[0];
  const runnerUp = simulationResults[1] ?? null;

  let summaryText = "";
  if (!runnerUp || leader.winProbability >= 85) {
    summaryText = `High confidence consensus: "${leader.optionName}" wins in ${leader.winProbability}% of simulated futures.`;
  } else if (leader.winProbability >= 55) {
    summaryText = `Competitive lead: "${leader.optionName}" wins in ${leader.winProbability}% of simulations, but "${runnerUp.optionName}" prevails in ${runnerUp.winProbability}%.`;
  } else {
    summaryText = `Fragile statistical tie: "${leader.optionName}" (${leader.winProbability}%) and "${runnerUp.optionName}" (${runnerUp.winProbability}%) have overlapping confidence distributions.`;
  }

  return {
    iterations,
    options: simulationResults,
    leaderId: leader.optionId,
    leaderProbability: leader.winProbability,
    summaryText,
  };
}
