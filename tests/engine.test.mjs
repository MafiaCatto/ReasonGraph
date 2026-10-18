import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWeights,
  calculateOptionScores,
  calculateBreakEvens,
  detectParetoDominance,
  analyzeDecision,
} from "../lib/engine.ts";
import { generateMarkdownBrief } from "../lib/export.ts";

test("normalizeWeights ensures weights sum to 100", () => {
  const criteria = [
    { id: "1", name: "Speed", weight: 30 },
    { id: "2", name: "Cost", weight: 30 },
    { id: "3", name: "Quality", weight: 30 },
  ];
  const normalized = normalizeWeights(criteria);
  const total = normalized.reduce((sum, c) => sum + c.weight, 0);
  assert.equal(total, 100);
});

test("calculateOptionScores ranks options correctly", () => {
  const criteria = [
    { id: "c1", name: "A", weight: 50 },
    { id: "c2", name: "B", weight: 50 },
  ];
  const options = [
    { id: "o1", name: "Option 1", scores: { c1: 8, c2: 8 } }, // total: 8.0
    { id: "o2", name: "Option 2", scores: { c1: 6, c2: 4 } }, // total: 5.0
  ];
  const scores = calculateOptionScores(criteria, options, 80);
  assert.equal(scores[0].id, "o1");
  assert.equal(scores[0].rank, 1);
  assert.equal(scores[0].rawTotal, 8.0);
  assert.equal(scores[1].id, "o2");
  assert.equal(scores[1].rank, 2);
  assert.equal(scores[1].rawTotal, 5.0);
  assert.equal(scores[1].marginToLeader, 3.0);
});

test("calculateBreakEvens identifies single-variable pivot point", () => {
  const criteria = [
    { id: "c1", name: "Heavy Criterion", weight: 50 },
    { id: "c2", name: "Light Criterion", weight: 10 },
  ];
  const leader = {
    id: "l",
    name: "Leader",
    rawTotal: 7.0,
    confidenceAdjusted: 5.6,
    rank: 1,
    marginToLeader: 0,
    scores: { c1: 7, c2: 7 },
  };
  const runnerUp = {
    id: "r",
    name: "RunnerUp",
    rawTotal: 6.0,
    confidenceAdjusted: 4.8,
    rank: 2,
    marginToLeader: 1.0,
    scores: { c1: 5, c2: 5 },
  };

  const breakEvens = calculateBreakEvens(leader, runnerUp, criteria);
  // Margin is 1.0. For c1 (50%): 1.0 * 100 / 50 = 2.0 points needed.
  assert.equal(breakEvens[0].criterionId, "c1");
  assert.equal(breakEvens[0].pointsNeeded, 2.0);
  assert.equal(breakEvens[0].isFeasible, true);
});

test("detectParetoDominance finds strictly inferior options", () => {
  const criteria = [
    { id: "c1", name: "Speed", weight: 50 },
    { id: "c2", name: "Cost", weight: 50 },
  ];
  const options = [
    { id: "o1", name: "Superior Option", scores: { c1: 9, c2: 9 } },
    { id: "o2", name: "Inferior Option", scores: { c1: 6, c2: 5 } },
  ];
  const dominances = detectParetoDominance(options, criteria);
  assert.equal(dominances.length, 1);
  assert.equal(dominances[0].dominantName, "Superior Option");
  assert.equal(dominances[0].dominatedName, "Inferior Option");
});

test("analyzeDecision and generateMarkdownBrief run seamlessly", () => {
  const decision = {
    id: "test-dec",
    title: "Test Career Decision",
    confidence: 75,
    updatedAt: new Date().toISOString(),
    criteria: [
      { id: "c1", name: "Impact", weight: 60 },
      { id: "c2", name: "Fun", weight: 40 },
    ],
    options: [
      { id: "o1", name: "Job A", scores: { c1: 8, c2: 7 } },
      { id: "o2", name: "Job B", scores: { c1: 7, c2: 8 } },
    ],
  };

  const analysis = analyzeDecision(decision.criteria, decision.options, decision.confidence);
  assert.ok(analysis.leader);
  assert.ok(analysis.insights.length > 0);

  const brief = generateMarkdownBrief(decision, analysis);
  assert.match(brief, /# Decision Brief: Test Career Decision/);
  assert.match(brief, /Executive Verdict/);
  assert.match(brief, /Job A/);
});
