export type Criterion = {
  id: string;
  name: string;
  weight: number; // 0 - 100
  description?: string;
};

export type Option = {
  id: string;
  name: string;
  scores: Record<string, number>; // criterionId -> score (1 - 10)
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

export type AnalysisResult = {
  rankings: OptionScore[];
  leader: OptionScore | null;
  runnerUp: OptionScore | null;
  margin: number;
  weightTotal: number;
  breakEvens: BreakEvenInsight[];
  insights: RedTeamInsight[];
};
