import { Criterion, Option, OptionScore, BreakEvenInsight, RedTeamInsight, AnalysisResult } from "./types";

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

    // Delta required on this criterion: delta * (weight / 100) = margin
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

  // Sort by smallest swing required (most vulnerable pivot point)
  return insights.sort((a, b) => a.pointsNeeded - b.pointsNeeded);
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

    // High variance (> 3.0) and low weight (<= 15%)
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

/**
 * Runs complete analysis suite on a decision model.
 */
export function analyzeDecision(
  criteria: Criterion[],
  options: Option[],
  confidence: number
): AnalysisResult {
  const weightTotal = criteria.reduce((sum, c) => sum + c.weight, 0);
  const rankings = calculateOptionScores(criteria, options, confidence);
  const leader = rankings[0] ?? null;
  const runnerUp = rankings[1] ?? null;
  const margin = leader && runnerUp ? Number((leader.rawTotal - runnerUp.rawTotal).toFixed(2)) : 0;
  const breakEvens = calculateBreakEvens(leader, runnerUp, criteria);
  const insights = generateRedTeamInsights(rankings, criteria, confidence, breakEvens);

  return {
    rankings,
    leader,
    runnerUp,
    margin,
    weightTotal,
    breakEvens,
    insights,
  };
}
