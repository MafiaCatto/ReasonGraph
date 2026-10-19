import test from "node:test";
import assert from "node:assert/strict";
import {
  autoBalanceWeights,
  computeSensitivityGrid,
  calculateMultiMetricGradient,
  calculateOptionScores,
} from "../lib/engine.ts";

test("autoBalanceWeights strictly conserves sum(weights) == 100", () => {
  const criteria = [
    { id: "c1", name: "Speed", weight: 40 },
    { id: "c2", name: "Cost", weight: 30 },
    { id: "c3", name: "Quality", weight: 30 },
  ];

  // User increases Speed to 60
  const balanced = autoBalanceWeights(criteria, "c1", 60);

  const total = balanced.reduce((sum, c) => sum + c.weight, 0);
  assert.equal(total, 100, `Expected total 100, got ${total}`);

  const c1 = balanced.find((c) => c.id === "c1");
  const c2 = balanced.find((c) => c.id === "c2");
  const c3 = balanced.find((c) => c.id === "c3");

  assert.equal(c1.weight, 60);
  // Remaining 40 was split equally between c2 and c3 (originally 30 and 30)
  assert.equal(c2.weight, 20);
  assert.equal(c3.weight, 20);
});

test("computeSensitivityGrid flags trailing metrics and break-even points", () => {
  const criteria = [
    { id: "c1", name: "Speed", weight: 50 },
    { id: "c2", name: "Cost", weight: 50 },
  ];

  const leader = {
    id: "l",
    name: "Leader",
    rawTotal: 7.5,
    confidenceAdjusted: 6.0,
    rank: 1,
    marginToLeader: 0,
    scores: { c1: 9, c2: 6 },
  };

  const runnerUp = {
    id: "r",
    name: "RunnerUp",
    rawTotal: 7.0,
    confidenceAdjusted: 5.6,
    rank: 2,
    marginToLeader: 0.5,
    scores: { c1: 6, c2: 8 }, // beats leader on Cost (c2)!
  };

  const grid = computeSensitivityGrid(leader, runnerUp, null, criteria);

  assert.equal(grid.length, 2);

  // On c1 (Speed): leader is ahead (9 vs 6). Margin is 0.5. Delta = 0.5 * 100 / 50 = 1.0 pt
  const rowC1 = grid.find((r) => r.criterionId === "c1");
  assert.equal(rowC1.runnerUpAdvantage, false);
  assert.equal(rowC1.runnerUpDelta, 1.0);
  assert.equal(rowC1.riskStatus, "SPOF_HIGH");

  // On c2 (Cost): runnerUp is ahead (8 vs 6). Leader is trailing!
  const rowC2 = grid.find((r) => r.criterionId === "c2");
  assert.equal(rowC2.runnerUpAdvantage, true);
  assert.equal(rowC2.riskStatus, "CRITICAL_DOWN");
});

test("calculateMultiMetricGradient computes shortest Euclidean distance to boundary", () => {
  const criteria = [
    { id: "c1", name: "Feature A", weight: 50 },
    { id: "c2", name: "Feature B", weight: 50 },
  ];

  const leader = {
    id: "l",
    name: "Leader",
    rawTotal: 7.0,
    confidenceAdjusted: 5.6,
    rank: 1,
    marginToLeader: 0,
    scores: { c1: 8, c2: 6 },
  };

  const runnerUp = {
    id: "r",
    name: "RunnerUp",
    rawTotal: 6.0,
    confidenceAdjusted: 4.8,
    rank: 2,
    marginToLeader: 1.0,
    scores: { c1: 6, c2: 6 }, // diff on c1 is 2, diff on c2 is 0
  };

  const mm = calculateMultiMetricGradient(leader, runnerUp, criteria);
  assert.ok(mm !== null);

  // Margin is 1.0. D = [2, 0]. ||D||_2 = 2.0. d* = 1.0 / 2.0 = 0.50
  assert.equal(mm.euclideanDistance, 0.5);
  assert.equal(mm.favorableMetricsCount, 1);
  assert.equal(mm.averageShiftNeeded, 1.0);
});
