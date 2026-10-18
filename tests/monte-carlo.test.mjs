import test from "node:test";
import assert from "node:assert/strict";
import { sampleBetaPert, getScoreRange, runMonteCarloSimulation } from "../lib/monte-carlo.ts";

test("sampleBetaPert stays strictly within bounds", () => {
  const min = 3;
  const mode = 7;
  const max = 9;

  for (let i = 0; i < 500; i++) {
    const s = sampleBetaPert(min, mode, max);
    assert.ok(s >= min && s <= max, `Sample ${s} out of bounds [${min}, ${max}]`);
  }
});

test("sampleBetaPert mean converges to theoretical PERT expectation", () => {
  const min = 2;
  const mode = 6;
  const max = 10;
  const theoreticalMean = (min + 4 * mode + max) / 6; // (2 + 24 + 10) / 6 = 6.0

  let sum = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) {
    sum += sampleBetaPert(min, mode, max);
  }
  const sampleMean = sum / N;

  // Should converge within 0.15 of theoretical mean
  assert.ok(
    Math.abs(sampleMean - theoreticalMean) < 0.15,
    `Sample mean ${sampleMean} drifted too far from theoretical ${theoreticalMean}`
  );
});

test("getScoreRange respects confidence bounds", () => {
  const option = { id: "opt1", name: "Test", scores: { c1: 8 } };
  const highConfidenceRange = getScoreRange(option, "c1", 90);
  const lowConfidenceRange = getScoreRange(option, "c1", 30);

  // High confidence should have tighter bounds than low confidence
  const highSpread = highConfidenceRange.max - highConfidenceRange.min;
  const lowSpread = lowConfidenceRange.max - lowConfidenceRange.min;

  assert.ok(
    lowSpread > highSpread,
    `Low confidence spread (${lowSpread}) should be wider than high confidence (${highSpread})`
  );
});

test("runMonteCarloSimulation computes sound win probabilities and percentiles", () => {
  const criteria = [
    { id: "c1", name: "Speed", weight: 60 },
    { id: "c2", name: "Cost", weight: 40 },
  ];
  const options = [
    { id: "o1", name: "Dominant Option", scores: { c1: 9, c2: 9 } },
    { id: "o2", name: "Weaker Option", scores: { c1: 3, c2: 4 } },
  ];

  const result = runMonteCarloSimulation(criteria, options, 80, 2000);

  assert.equal(result.options.length, 2);
  const totalProbability = result.options.reduce((sum, o) => sum + o.winProbability, 0);
  assert.ok(Math.abs(totalProbability - 100) < 0.5, "Win probabilities should sum to ~100%");

  // Dominant option should win > 95% of iterations
  assert.ok(
    result.options[0].winProbability > 95,
    `Dominant option win probability was ${result.options[0].winProbability}%, expected > 95%`
  );

  // Percentiles check: P10 <= P50 <= P90
  const opt1 = result.options[0];
  assert.ok(opt1.p10 <= opt1.p50, "P10 should be <= P50");
  assert.ok(opt1.p50 <= opt1.p90, "P50 should be <= P90");
  assert.ok(opt1.var95 <= opt1.p10, "VaR 95% should be <= P10");
  assert.equal(opt1.histogram.length, 20, "Should generate 20 histogram bins");
});
