export type Criterion = {
  id: string;
  name: string;
  weight: number; // 0 - 100
  description?: string;
};

export type ScoreRange = {
  min: number;  // pessimistic (a)
  mode: number; // most likely (m)
  max: number;  // optimistic (b)
};

export type Option = {
  id: string;
  name: string;
  scores: Record<string, number>; // criterionId -> score (1 - 10)
  ranges?: Record<string, ScoreRange>; // criterionId -> { min, mode, max }
  notes?: Record<string, string>;
};

export type Decision = {
  id: string;
  title: string;
  context?: string;
  criteria: Criterion[];
  options: Option[];
  confidence: number; // 20 - 95%
  updatedAt: string;
};

export type OptionScore = Option & {
  rawTotal: number;
  confidenceAdjusted: number;
  rank: number;
  marginToLeader: number;
};

export type BreakEvenInsight = {
  criterionId: string;
  criterionName: string;
  weight: number;
  pointsNeeded: number;
  isFeasible: boolean; // within 1 - 10 scale
};

export type RedTeamInsight = {
  id: string;
  type: "FRAGILITY" | "LEVERAGE" | "DOMINANCE" | "UNDERWEIGHTED" | "CONFIDENCE";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  recommendation: string;
};

export type OptionSimulationResult = {
  optionId: string;
  optionName: string;
  winProbability: number; // 0 - 100%
  mean: number;
  stdDev: number;
  p10: number; // 10th percentile (bear case)
  p50: number; // 50th percentile (median)
  p90: number; // 90th percentile (bull case)
  var95: number; // 5th percentile worst-case
  histogram: number[]; // frequency across 20 bins (from 0 to 10)
};

export type MonteCarloResult = {
  iterations: number;
  options: OptionSimulationResult[];
  leaderId: string;
  leaderProbability: number;
  summaryText: string;
};

export type AnalysisResult = {
  rankings: OptionScore[];
  leader: OptionScore | null;
  runnerUp: OptionScore | null;
  margin: number;
  weightTotal: number;
  breakEvens: BreakEvenInsight[];
  insights: RedTeamInsight[];
  monteCarlo?: MonteCarloResult;
};
