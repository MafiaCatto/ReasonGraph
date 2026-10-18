"use client";

import React, { useState } from "react";
import { Criterion, Option, MonteCarloResult } from "../lib/types";
import { runMonteCarloSimulation } from "../lib/monte-carlo";

type MonteCarloViewProps = {
  criteria: Criterion[];
  options: Option[];
  confidence: number;
  initialResult?: MonteCarloResult;
};

const OPTION_COLORS = [
  { stroke: "#3157d8", fill: "rgba(49, 87, 216, 0.2)", bar: "#3157d8" },
  { stroke: "#ff6b3d", fill: "rgba(255, 107, 61, 0.2)", bar: "#ff6b3d" },
  { stroke: "#2b8a3e", fill: "rgba(43, 138, 62, 0.2)", bar: "#2b8a3e" },
  { stroke: "#7950f2", fill: "rgba(121, 80, 242, 0.2)", bar: "#7950f2" },
  { stroke: "#f59f00", fill: "rgba(245, 159, 0, 0.2)", bar: "#f59f00" },
  { stroke: "#1098ad", fill: "rgba(16, 152, 173, 0.2)", bar: "#1098ad" },
];

export function MonteCarloView({
  criteria,
  options,
  confidence,
  initialResult,
}: MonteCarloViewProps) {
  const [iterations, setIterations] = useState<number>(10000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<MonteCarloResult>(() =>
    initialResult ?? runMonteCarloSimulation(criteria, options, confidence, 10000)
  );

  function handleRerun(customIterations?: number) {
    setIsRunning(true);
    const n = customIterations ?? iterations;
    setTimeout(() => {
      const res = runMonteCarloSimulation(criteria, options, confidence, n);
      setSimResult(res);
      setIsRunning(false);
    }, 50);
  }

  // Generate SVG path coordinates from 20-bin histogram
  function renderDensityPath(histogram: number[], width: number, height: number): string {
    const maxVal = Math.max(...histogram, 1);
    const points = histogram.map((count, i) => {
      const x = (i / (histogram.length - 1)) * width;
      const y = height - (count / maxVal) * (height * 0.85);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const startX = "0," + height;
    const endX = `${width},${height}`;
    return `M ${startX} L ${points.join(" L ")} L ${endX} Z`;
  }

  function renderStrokePath(histogram: number[], width: number, height: number): string {
    const maxVal = Math.max(...histogram, 1);
    const points = histogram.map((count, i) => {
      const x = (i / (histogram.length - 1)) * width;
      const y = height - (count / maxVal) * (height * 0.85);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(" L ")}`;
  }

  return (
    <section className="insights" style={{ gridTemplateColumns: "1fr" }}>
      <div className="insight-intro" style={{ maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <span>PROBABILISTIC UNCERTAINTY MODELING</span>
            <h1 style={{ margin: "10px 0 6px" }}>
              Monte Carlo Simulation
            </h1>
            <p style={{ margin: 0 }}>
              Simulates <strong>{simResult.iterations.toLocaleString()}</strong> alternate futures using Beta-PERT probability distributions to measure outcome volatility, Value-at-Risk (VaR), and true win likelihood.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              aria-label="Simulation iteration count"
              className="template-select"
              value={iterations}
              onChange={(e) => {
                const val = Number(e.target.value);
                setIterations(val);
                handleRerun(val);
              }}
            >
              <option value={2000}>2,000 Trials</option>
              <option value={5000}>5,000 Trials</option>
              <option value={10000}>10,000 Trials</option>
              <option value={25000}>25,000 Trials</option>
            </select>

            <button
              className="action-btn primary"
              onClick={() => handleRerun()}
              disabled={isRunning}
            >
              {isRunning ? "Simulating..." : "⚡ Re-Run Simulation"}
            </button>
          </div>
        </div>

        {/* Verdict Callout */}
        <div className="break-even-card" style={{ marginTop: "24px", background: "var(--paper)", borderLeft: "4px solid var(--blue)" }}>
          <h3 style={{ fontSize: "15px", margin: "0 0 4px" }}>Simulation Summary</h3>
          <p style={{ fontSize: "13px", color: "var(--ink)", margin: 0 }}>
            {simResult.summaryText}
          </p>
        </div>
      </div>

      {/* Probability Density Curve (SVG) */}
      <div style={{ background: "#fff", border: "1px solid var(--line)", padding: "24px 20px 16px", marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontFamily: "var(--font-geist-mono)" }}>
            OVERLAPPING SCORE DENSITY DISTRIBUTIONS (0 - 10)
          </h3>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "10px", fontFamily: "var(--font-geist-mono)" }}>
            {simResult.options.map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              return (
                <div key={opt.optionId} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", background: color.stroke, display: "inline-block" }} />
                  <strong>{opt.optionName}</strong> ({opt.winProbability}%)
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: "relative", width: "100%", height: "200px" }}>
          <svg
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            {/* Horizontal Grid lines */}
            <line x1="0" y1="199" x2="800" y2="199" stroke="var(--line)" strokeWidth="1" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#f0efe9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#f0efe9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="50" x2="800" y2="50" stroke="#f0efe9" strokeWidth="1" strokeDasharray="4 4" />

            {/* Density Curves */}
            {simResult.options.map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              return (
                <g key={opt.optionId}>
                  <path
                    d={renderDensityPath(opt.histogram, 800, 200)}
                    fill={color.fill}
                  />
                  <path
                    d={renderStrokePath(opt.histogram, 800, 200)}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth="2.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-Axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", font: "9px var(--font-geist-mono)", color: "var(--muted)" }}>
          <span>0 (Failure)</span>
          <span>2.5</span>
          <span>5.0 (Average)</span>
          <span>7.5</span>
          <span>10.0 (Optimal)</span>
        </div>
      </div>

      {/* Detailed Statistical Table */}
      <div className="matrix-wrap" style={{ marginTop: "24px" }}>
        <table>
          <thead>
            <tr>
              <th>OPTION</th>
              <th>WIN PROBABILITY</th>
              <th>EXPECTED (MEAN)</th>
              <th>VOLATILITY (STD DEV)</th>
              <th>P10 (BEAR CASE)</th>
              <th>P50 (MEDIAN)</th>
              <th>P90 (BULL CASE)</th>
              <th>VAR 95% (DOWNSIDE)</th>
            </tr>
          </thead>
          <tbody>
            {simResult.options.map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              const isWinner = idx === 0;

              return (
                <tr key={opt.optionId} className={isWinner ? "winner" : ""}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", background: color.stroke, display: "inline-block" }} />
                      <span>{opt.optionName}</span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                      <div style={{ width: "90px", height: "8px", background: "#e8e6dd", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${opt.winProbability}%`,
                            height: "100%",
                            background: color.bar,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <strong style={{ fontSize: "14px", color: isWinner ? "var(--blue)" : "inherit" }}>
                        {opt.winProbability}%
                      </strong>
                    </div>
                  </td>

                  <td><strong>{opt.mean}</strong> / 10</td>
                  <td style={{ color: opt.stdDev > 1.2 ? "var(--orange)" : "var(--muted)" }}>
                    ±{opt.stdDev}
                  </td>
                  <td>{opt.p10}</td>
                  <td><strong>{opt.p50}</strong></td>
                  <td>{opt.p90}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 700 }}>{opt.var95}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "14px", font: "10px/1.5 var(--font-geist-mono)", color: "var(--muted)" }}>
        * <strong>VaR 95% (Value-at-Risk)</strong>: In 95% of simulated scenarios, this option will achieve a score at or above this threshold. Lower VaR signals exposure to severe downside tail risk.
      </div>
    </section>
  );
}
