import {
  Criterion,
  Option,
  OptionScore,
  BreakEvenInsight,
  RedTeamInsight,
  AnalysisResult,
  SensitivityRow,
  MultiMetricSensitivity,
  MonteCarloResult,
} from "./types";
import { runMonteCarloSimulation } from "./monte-carlo";

/**
 * Normalizes an array of criteria weights to ensure they sum to exactly 100.
 */
export function normalizeWeights(criteria: Criterion[]): Criterion[] {
  if (criteria.length === 0) return [];
  const currentTotal = criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  if (currentTotal === 0) {
    const equalShare = Math.floor(100 / criteria.length);
    let remainder = 100 - equalShare * criteria.length;
    return criteria.map((c) => ({
      ...c,
      weight: equalShare + (remainder-- > 0 ? 1 : 0),
    }));
  }

  let accumulated = 0;
  return criteria.map((c, idx) => {
    if (idx === criteria.length - 1) {
      return { ...c, weight: Math.max(0, 100 - accumulated) };
    }
    const scaled = Math.round((Math.max(0, c.weight) / currentTotal) * 100);
    accumulated += scaled;
    return { ...c, weight: scaled };
  });
}

/**
 * Proportionally adjusts all other weights when a single weight is moved,
 * strictly conserving the invariant that sum(weights) == 100%.
 */
export function autoBalanceWeights(
  criteria: Criterion[],
  changedId: string,
  rawNewWeight: number
): Criterion[] {
  if (criteria.length <= 1) {
    return criteria.map((c) => ({ ...c, weight: 100 }));
  }

  const clampedNewWeight = Math.max(0, Math.min(100, Math.round(rawNewWeight)));
  const remainingBudget = 100 - clampedNewWeight;

  const otherCriteria = criteria.filter((c) => c.id !== changedId);
  const currentOtherSum = otherCriteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0);

  let allocatedSum = 0;
  const updatedOthers = otherCriteria.map((c) => {
    let share = 0;
    if (currentOtherSum === 0) {
      share = Math.floor(remainingBudget / otherCriteria.length);
    } else {
      share = Math.round((Math.max(0, c.weight) / currentOtherSum) * remainingBudget);
    }
    allocatedSum += share;
    return { ...c, weight: share };
  });

  // Fix rounding drift on the largest weight to strictly preserve 100%
  const diff = remainingBudget - allocatedSum;
  if (diff !== 0 && updatedOthers.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < updatedOthers.length; i++) {
      if (updatedOthers[i].weight > updatedOthers[maxIdx].weight) {
        maxIdx = i;
      }
    }
    updatedOthers[maxIdx].weight = Math.max(0, updatedOthers[maxIdx].weight + diff);
  }

  return criteria.map((c) => {
    if (c.id === changedId) {
      return { ...c, weight: clampedNewWeight };
    }
    const found = updatedOthers.find((o) => o.id === c.id);
    return found ?? c;
  });
}

/**
 * Computes weighted multi-criteria scores and rankings.
 */
export function calculateOptionScores(
  criteria: Criterion[],
  options: Option[],
  confidence: number
): OptionScore[] {
  const totalWeight = criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  const effectiveDivisor = totalWeight > 0 ? totalWeight : 1;

  const scored = options.map((option) => {
    let rawWeightedSum = 0;
    for (const c of criteria) {
      const score = option.scores[c.id] ?? 5;
      rawWeightedSum += score * Math.max(0, c.weight);
    }
    const rawTotal = Number((rawWeightedSum / effectiveDivisor).toFixed(2));
    const confidenceAdjusted = Number(((rawTotal * confidence) / 100).toFixed(2));

    return {
      ...option,
      rawTotal,
      confidenceAdjusted,
      rank: 0,
      marginToLeader: 0,
    };
  });

  scored.sort((a, b) => b.rawTotal - a.rawTotal);

  const leaderScore = scored[0]?.rawTotal ?? 0;
  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    marginToLeader: Number((leaderScore - item.rawTotal).toFixed(2)),
  }));
}

/**
 * Identifies the break-even score changes on each criterion that would allow
 * the runner-up to overtake the leader.
 */
export function calculateBreakEvens(
  leader: OptionScore | null,
  runnerUp: OptionScore | null,
  criteria: Criterion[]
): BreakEvenInsight[] {
  if (!leader || !runnerUp || leader.id === runnerUp.id) return [];

  const margin = Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2));
  if (margin <= 0) return [];

  const insights: BreakEvenInsight[] = [];

  for (const c of criteria) {
    if (c.weight <= 0) continue;

    const pointsNeeded = Number(((margin * 100) / c.weight).toFixed(2));
    const currentScore = runnerUp.scores[c.id] ?? 5;
    const targetScore = currentScore + pointsNeeded;

    insights.push({
      criterionId: c.id,
      criterionName: c.name,
      weight: c.weight,
      pointsNeeded,
      isFeasible: targetScore <= 10.0,
    });
  }

  return insights.sort((a, b) => a.pointsNeeded - b.pointsNeeded);
}

/**
 * Computes a full dynamic sensitivity matrix across all criteria against the top-3 contenders.
 */
export function computeSensitivityGrid(
  leader: OptionScore | null,
  runnerUp: OptionScore | null,
  thirdPlace: OptionScore | null,
  criteria: Criterion[]
): SensitivityRow[] {
  if (!leader) return [];

  const margin12 = runnerUp ? Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2)) : 0;
  const margin13 = thirdPlace ? Number((leader.rawTotal - thirdPlace.rawTotal).toFixed(2)) : 0;

  return criteria.map((c) => {
    const w = Math.max(0, c.weight);
    const sLead = leader.scores[c.id] ?? 5;
    const sRunner = runnerUp?.scores[c.id] ?? 5;
    const sThird = thirdPlace ? (thirdPlace.scores[c.id] ?? 5) : null;

    // Runner-up (#2) dynamics
    const runnerUpAdvantage = runnerUp ? sRunner > sLead : false;
    let runnerUpDelta = 0;
    let runnerUpFeasible = false;
    if (runnerUp && !runnerUpAdvantage && w > 0) {
      runnerUpDelta = Number(((margin12 * 100) / w).toFixed(1));
      runnerUpFeasible = sRunner + runnerUpDelta <= 10.0;
    }

    // Third-place (#3) dynamics
    let thirdAdvantage = false;
    let thirdDelta: number | null = null;
    let thirdFeasible = false;
    if (thirdPlace && sThird !== null) {
      thirdAdvantage = sThird > sLead;
      if (!thirdAdvantage && w > 0) {
        thirdDelta = Number(((margin13 * 100) / w).toFixed(1));
        thirdFeasible = sThird + thirdDelta <= 10.0;
      }
    }

    // Assign vulnerability status
    let riskStatus: SensitivityRow["riskStatus"] = "RESILIENT";
    if (runnerUpAdvantage) {
      riskStatus = "CRITICAL_DOWN";
    } else if (runnerUpDelta <= 1.5 && runnerUpFeasible) {
      riskStatus = "SPOF_HIGH";
    } else if (runnerUpDelta <= 3.0 && runnerUpFeasible) {
      riskStatus = "MODERATE";
    }

    return {
      criterionId: c.id,
      criterionName: c.name,
      weight: w,
      leaderScore: sLead,
      runnerUpScore: sRunner,
      runnerUpDelta,
      runnerUpFeasible,
      runnerUpAdvantage,
      thirdScore: sThird,
      thirdDelta,
      thirdFeasible,
      thirdAdvantage,
      riskStatus,
    };
  });
}

/**
 * Calculates multi-metric gradient vector distance to decision boundary.
 * Computes the shortest Euclidean path in criterion space required to dethrone the leader.
 */
export function calculateMultiMetricGradient(
  leader: OptionScore | null,
  runnerUp: OptionScore | null,
  criteria: Criterion[]
): MultiMetricSensitivity | null {
  if (!leader || !runnerUp) return null;
  const margin = Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2));
  if (margin <= 0) return null;

  let sumSquaredDiffs = 0;
  let favorableDiffSum = 0;
  let favorableCount = 0;

  for (const c of criteria) {
    const sLead = leader.scores[c.id] ?? 5;
    const sRunner = runnerUp.scores[c.id] ?? 5;
    const diff = sLead - sRunner;

    sumSquaredDiffs += diff * diff;
    if (diff > 0) {
      favorableDiffSum += diff;
      favorableCount++;
    }
  }

  const normD = Math.sqrt(sumSquaredDiffs);
  if (normD === 0 || favorableCount === 0) return null;

  // Shortest Euclidean distance to decision boundary: d* = Margin / ||D||_2
  const euclideanDistance = Number((margin / normD).toFixed(3));
  // Average shift needed across all favorable criteria to collectively erase margin
  const averageShiftNeeded = Number((margin / favorableCount).toFixed(2));

  let resilienceLevel: MultiMetricSensitivity["resilienceLevel"] = "HIGH_RESILIENCE";
  if (euclideanDistance < 0.25) {
    resilienceLevel = "HIGH_FRAGILITY";
  } else if (euclideanDistance < 0.55) {
    resilienceLevel = "MODERATE_RESILIENCE";
  }

  const interpretation =
    resilienceLevel === "HIGH_FRAGILITY"
      ? `High systemic fragility: a collective drift of only -${averageShiftNeeded} pts across ${favorableCount} metrics overturns the leader.`
      : resilienceLevel === "MODERATE_RESILIENCE"
      ? `Moderate resilience: leader survives isolated errors, but a collective -${averageShiftNeeded} pt shift across ${favorableCount} metrics ties the decision.`
      : `High systemic resilience: leader maintains strong multi-variable distance (${euclideanDistance}) against collective domain drift.`;

  return {
    euclideanDistance,
    averageShiftNeeded,
    favorableMetricsCount: favorableCount,
    resilienceLevel,
    interpretation,
  };
}

/**
 * Checks for strict Pareto dominance between options.
 */
export function detectParetoDominance(
  options: Option[],
  criteria: Criterion[]
): { dominatedName: string; dominantName: string }[] {
  const dominances: { dominatedName: string; dominantName: string }[] = [];

  for (let i = 0; i < options.length; i++) {
    for (let j = 0; j < options.length; j++) {
      if (i === j) continue;
      const optA = options[i];
      const optB = options[j];

      let aIsAtLeastAsGood = true;
      let aIsStrictlyBetterOnAtLeastOne = false;

      for (const c of criteria) {
        const scoreA = optA.scores[c.id] ?? 5;
        const scoreB = optB.scores[c.id] ?? 5;

        if (scoreA < scoreB) {
          aIsAtLeastAsGood = false;
          break;
        }
        if (scoreA > scoreB) {
          aIsStrictlyBetterOnAtLeastOne = true;
        }
      }

      if (aIsAtLeastAsGood && aIsStrictlyBetterOnAtLeastOne) {
        dominances.push({
          dominantName: optA.name,
          dominatedName: optB.name,
        });
      }
    }
  }

  return dominances;
}

/**
 * Generates an analytical Red-Team critique based on math rather than canned text.
 */
export function generateRedTeamInsights(
  rankings: OptionScore[],
  criteria: Criterion[],
  confidence: number,
  breakEvens: BreakEvenInsight[]
): RedTeamInsight[] {
  const insights: RedTeamInsight[] = [];
  if (rankings.length === 0) return insights;

  const leader = rankings[0];
  const runnerUp = rankings[1] ?? null;
  const margin = runnerUp ? Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2)) : 10;

  // 1. Lead Fragility Check
  if (runnerUp) {
    if (margin < 0.6) {
      insights.push({
        id: "fragility-high",
        type: "FRAGILITY",
        severity: "high",
        title: "Fragile Lead (Margin < 0.6 pts)",
        detail: `"${leader.name}" leads "${runnerUp.name}" by only ${margin.toFixed(1)} points on a 10-point scale. A minor 1-point difference in subjective judgment would flip the top choice.`,
        recommendation: "Treat this as a functional tie. Do not commit irreversibly; design a 2-week lightweight test or gather 1 key missing data point.",
      });
    } else if (margin < 1.4) {
      insights.push({
        id: "fragility-med",
        type: "FRAGILITY",
        severity: "medium",
        title: "Moderate Lead (Margin < 1.4 pts)",
        detail: `"${leader.name}" has an observable advantage (+${margin.toFixed(1)} pts), but it remains vulnerable to simultaneous small shifts across two criteria.`,
        recommendation: "Review the top 2 weighted criteria to verify if their scores are verified by data or based on optimistic estimates.",
      });
    } else {
      insights.push({
        id: "fragility-low",
        type: "FRAGILITY",
        severity: "low",
        title: "Decisive Lead (+2.0+ pts)",
        detail: `"${leader.name}" maintains a decisive lead (+${margin.toFixed(1)} pts) over "${runnerUp.name}". It is mathematically robust against single-variable errors.`,
        recommendation: "The model clearly favors this path under your stated values. Focus execution planning on mitigating its lowest-scoring criterion.",
      });
    }
  }

  // 2. Single Point of Failure (Lowest Break-Even Delta)
  const easiestFlip = breakEvens.find((b) => b.isFeasible);
  if (easiestFlip && runnerUp) {
    insights.push({
      id: "leverage-spof",
      type: "LEVERAGE",
      severity: easiestFlip.pointsNeeded <= 2.0 ? "high" : "medium",
      title: `Pivot Point: "${easiestFlip.criterionName}" (${easiestFlip.weight}%)`,
      detail: `If "${runnerUp.name}" improves its "${easiestFlip.criterionName}" score by only +${easiestFlip.pointsNeeded.toFixed(1)} points (from ${runnerUp.scores[easiestFlip.criterionId] ?? 5} to ${((runnerUp.scores[easiestFlip.criterionId] ?? 5) + easiestFlip.pointsNeeded).toFixed(1)}), it ties "${leader.name}".`,
      recommendation: `This criterion holds the highest decision leverage. Verify this specific score before making a final commitment.`,
    });
  }

  // 3. Underweighted High-Variance Criteria (Blindspot)
  let maxVariance = -1;
  let highestVarianceCriterion: Criterion | null = null;
  for (const c of criteria) {
    const scores = rankings.map((r) => r.scores[c.id] ?? 5);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    if (variance > maxVariance && c.weight <= 20) {
      maxVariance = variance;
      highestVarianceCriterion = c;
    }
  }

  if (highestVarianceCriterion && maxVariance > 2.0) {
    insights.push({
      id: "blindspot-variance",
      type: "UNDERWEIGHTED",
      severity: "medium",
      title: `Potential Blindspot: "${highestVarianceCriterion.name}" (${highestVarianceCriterion.weight}%)`,
      detail: `Your options differ sharply on "${highestVarianceCriterion.name}", but it only accounts for ${highestVarianceCriterion.weight}% of your decision.`,
      recommendation: "Ask: Is this low weight an intentional choice, or are you downplaying a significant hidden downside?",
    });
  }

  // 4. Confidence & Uncertainty Window
  if (confidence < 60) {
    insights.push({
      id: "confidence-uncertainty",
      type: "CONFIDENCE",
      severity: "high",
      title: `High Speculation Level (Confidence: ${confidence}%)`,
      detail: `With ${100 - confidence}% epistemic uncertainty, the real-world performance spread exceeds the model's computed margins.`,
      recommendation: "Convert speculative scores into observable indicators. What single benchmark or user interview would raise confidence to 80%?",
    });
  }

  // 5. Pareto Dominance Check
  const dominances = detectParetoDominance(rankings, criteria);
  for (const d of dominances.slice(0, 2)) {
    insights.push({
      id: `dominance-${d.dominatedName}`,
      type: "DOMINANCE",
      severity: "low",
      title: `Pareto Inefficiency: "${d.dominatedName}"`,
      detail: `"${d.dominantName}" equals or outperforms "${d.dominatedName}" across every single criterion evaluated.`,
      recommendation: `You can safely remove "${d.dominatedName}" from your active consideration set to simplify your decision.`,
    });
  }

  return insights;
}

export type AnalyzeOptions = {
  skipMonteCarlo?: boolean;
  seed?: number;
  monteCarloIterations?: number;
};

/**
 * Attaches or merges a Monte Carlo simulation result into an existing analysis,
 * evaluating probabilistic rank inversion insights.
 */
export function attachMonteCarloResult(
  analysis: AnalysisResult,
  monteCarlo: MonteCarloResult
): AnalysisResult {
  const updatedInsights = [...analysis.insights.filter((i) => i.id !== "probabilistic-inversion")];

  if (analysis.leader && monteCarlo.options.length > 1) {
    const simLeader = monteCarlo.options[0];
    if (simLeader.optionId !== analysis.leader.id && simLeader.winProbability > 50) {
      updatedInsights.unshift({
        id: "probabilistic-inversion",
        type: "FRAGILITY",
        severity: "high",
        title: `Probabilistic Inversion: "${simLeader.optionName}" Wins ${simLeader.winProbability}% of Simulations`,
        detail: `While "${analysis.leader.name}" has a marginally higher point estimate, "${simLeader.optionName}" wins the majority of simulated futures because it carries significantly lower downside variance.`,
        recommendation: `Consider selecting "${simLeader.optionName}" as the risk-adjusted superior choice under real-world uncertainty.`,
      });
    }
  }

  return {
    ...analysis,
    insights: updatedInsights,
    monteCarlo,
  };
}

/**
 * Runs complete analysis suite on a decision model.
 */
export function analyzeDecision(
  criteria: Criterion[],
  options: Option[],
  confidence: number,
  optionsConfig?: AnalyzeOptions
): AnalysisResult {
  const weightTotal = criteria.reduce((sum, c) => sum + c.weight, 0);
  const rankings = calculateOptionScores(criteria, options, confidence);
  const leader = rankings[0] ?? null;
  const runnerUp = rankings[1] ?? null;
  const thirdPlace = rankings[2] ?? null;
  const margin = leader && runnerUp ? Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2)) : 0;
  const breakEvens = calculateBreakEvens(leader, runnerUp, criteria);
  const insights = generateRedTeamInsights(rankings, criteria, confidence, breakEvens);
  const sensitivityGrid = computeSensitivityGrid(leader, runnerUp, thirdPlace, criteria);
  const multiMetric = calculateMultiMetricGradient(leader, runnerUp, criteria);

  // Multi-Metric Systemic Vulnerability Alert
  if (multiMetric && multiMetric.resilienceLevel === "HIGH_FRAGILITY") {
    insights.unshift({
      id: "multi-metric-fragility",
      type: "FRAGILITY",
      severity: "high",
      title: `Systemic Fragility: Collective -${multiMetric.averageShiftNeeded} pt Drift Dethrones Leader`,
      detail: `Rather than a large swing on one metric, small simultaneous estimation errors averaging only -${multiMetric.averageShiftNeeded} pts across ${multiMetric.favorableMetricsCount} criteria will overturn "${leader?.name}".`,
      recommendation: `Check whether your top criteria share common failure modes (e.g. cost and complexity both increasing together).`,
    });
  }

  const baseResult: AnalysisResult = {
    rankings,
    leader,
    runnerUp,
    thirdPlace,
    margin,
    weightTotal,
    breakEvens,
    insights,
    sensitivityGrid,
    multiMetric,
  };

  if (optionsConfig?.skipMonteCarlo) {
    return baseResult;
  }

  const iterations = optionsConfig?.monteCarloIterations ?? 5000;
  const monteCarlo = runMonteCarloSimulation(criteria, options, confidence, iterations, optionsConfig?.seed);

  return attachMonteCarloResult(baseResult, monteCarlo);
}
