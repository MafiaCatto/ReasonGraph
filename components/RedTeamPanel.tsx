"use client";

import React from "react";
import {
  OptionScore,
  BreakEvenInsight,
  RedTeamInsight,
  SensitivityRow,
  MultiMetricSensitivity,
} from "../lib/types";

type RedTeamPanelProps = {
  leader: OptionScore | null;
  runnerUp: OptionScore | null;
  thirdPlace: OptionScore | null;
  margin: number;
  breakEvens: BreakEvenInsight[];
  insights: RedTeamInsight[];
  sensitivityGrid: SensitivityRow[];
  multiMetric: MultiMetricSensitivity | null;
};

export function RedTeamPanel({
  leader,
  runnerUp,
  thirdPlace,
  margin,
  insights,
  sensitivityGrid,
  multiMetric,
}: RedTeamPanelProps) {
  return (
    <section className="insights" style={{ gridTemplateColumns: "1fr" }}>
      <div className="insight-intro" style={{ maxWidth: "100%" }}>
        <span>STRESS TEST & RED TEAM REVIEW</span>
        <h1 style={{ margin: "10px 0 6px" }}>
          Your model is useful.
          <br />
          Now try to break it.
        </h1>
        <p style={{ maxWidth: "800px" }}>
          ReasonGraph evaluates how vulnerable your top choice is to single-metric pivot swings,
          ranks breaking points against top competitors, and calculates multi-variable vector distance.
        </p>

        {/* Multi-Metric Systemic Resilience Card */}
        {multiMetric && leader && runnerUp && (
          <div
            className="break-even-card"
            style={{
              marginTop: "20px",
              background: "#fff",
              borderLeft:
                multiMetric.resilienceLevel === "HIGH_FRAGILITY"
                  ? "4px solid var(--orange)"
                  : multiMetric.resilienceLevel === "MODERATE_RESILIENCE"
                  ? "4px solid var(--acid)"
                  : "4px solid var(--blue)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span
                  className={`insight-tag ${
                    multiMetric.resilienceLevel === "HIGH_FRAGILITY"
                      ? "high"
                      : multiMetric.resilienceLevel === "MODERATE_RESILIENCE"
                      ? "medium"
                      : "low"
                  }`}
                >
                  SYSTEMIC RESILIENCE: {multiMetric.resilienceLevel.replace("_", " ")}
                </span>
                <h3 style={{ fontSize: "16px", margin: "4px 0" }}>
                  Multi-Metric Hyperplane Distance: {multiMetric.euclideanDistance}
                </h3>
              </div>
              <div style={{ font: "11px var(--font-geist-mono)", textAlign: "right" }}>
                <span>Simultaneous Drift Budget: </span>
                <strong style={{ fontSize: "14px", color: "var(--orange)" }}>
                  ±{multiMetric.averageShiftNeeded} pts
                </strong>
                <span style={{ color: "var(--muted)" }}> / metric</span>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--ink)", lineHeight: 1.5 }}>
              {multiMetric.interpretation}
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Sensitivity Matrix Table */}
      {leader && runnerUp && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontFamily: "var(--font-geist-mono)" }}>
              FULL SENSITIVITY MATRIX (ALL CRITERIA VS TOP CONTENDERS)
            </h3>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>
              Lead Margin: +{margin.toFixed(2)} pts over {runnerUp.name}
            </span>
          </div>

          <div className="matrix-wrap">
            <table>
              <thead>
                <tr>
                  <th>CRITERION (WEIGHT)</th>
                  <th>#1 {leader.name.toUpperCase()}</th>
                  <th>#2 {runnerUp.name.toUpperCase()}</th>
                  <th>Δ TO FLIP (#1 vs #2)</th>
                  {thirdPlace && <th>#3 {thirdPlace.name.toUpperCase()}</th>}
                  {thirdPlace && <th>Δ TO FLIP (#1 vs #3)</th>}
                  <th>RISK STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sensitivityGrid.map((row) => (
                  <tr key={row.criterionId}>
                    <td style={{ fontWeight: 700 }}>
                      {row.criterionName} <small>{row.weight}%</small>
                    </td>

                    <td>
                      <strong>{row.leaderScore}</strong> / 10
                    </td>

                    <td>
                      <span style={{ color: row.runnerUpAdvantage ? "var(--orange)" : "inherit", fontWeight: row.runnerUpAdvantage ? 700 : 400 }}>
                        {row.runnerUpScore} / 10
                      </span>
                    </td>

                    <td>
                      {row.runnerUpAdvantage ? (
                        <span style={{ color: "var(--orange)", fontWeight: 700 }}>
                          Leader Trailing
                        </span>
                      ) : row.runnerUpFeasible ? (
                        <strong style={{ color: row.runnerUpDelta <= 1.5 ? "var(--orange)" : "inherit" }}>
                          +{row.runnerUpDelta} pts
                        </strong>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>&gt;10 (Infeasible alone)</span>
                      )}
                    </td>

                    {thirdPlace && (
                      <td>
                        <span style={{ color: row.thirdAdvantage ? "var(--orange)" : "inherit" }}>
                          {row.thirdScore ?? "-"} / 10
                        </span>
                      </td>
                    )}

                    {thirdPlace && (
                      <td>
                        {row.thirdAdvantage ? (
                          <span style={{ color: "var(--orange)" }}>Leader Trailing</span>
                        ) : row.thirdFeasible && row.thirdDelta !== null ? (
                          <span>+{row.thirdDelta} pts</span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>&gt;10 (Infeasible)</span>
                        )}
                      </td>
                    )}

                    <td>
                      {row.riskStatus === "CRITICAL_DOWN" && (
                        <span className="insight-tag high" style={{ margin: 0 }}>
                          🔥 Trailing
                        </span>
                      )}
                      {row.riskStatus === "SPOF_HIGH" && (
                        <span className="insight-tag high" style={{ margin: 0 }}>
                          ⚠️ High SPOF
                        </span>
                      )}
                      {row.riskStatus === "MODERATE" && (
                        <span className="insight-tag medium" style={{ margin: 0 }}>
                          🟡 Moderate
                        </span>
                      )}
                      {row.riskStatus === "RESILIENT" && (
                        <span className="insight-tag low" style={{ margin: 0 }}>
                          🟢 Resilient
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Red-Team Insight Articles */}
      <div className="insight-list" style={{ marginTop: "20px" }}>
        {insights.length === 0 ? (
          <article>
            <div className="insight-num">01</div>
            <div>
              <span className="insight-tag low">STABLE</span>
              <h2>No Critical Vulnerabilities Found</h2>
              <p>The model displays consistent margins and balanced weights across all evaluated options.</p>
            </div>
          </article>
        ) : (
          insights.map((ins, idx) => (
            <article key={ins.id}>
              <div className="insight-num">0{idx + 1}</div>
              <div>
                <span className={`insight-tag ${ins.severity}`}>
                  {ins.type} · {ins.severity.toUpperCase()}
                </span>
                <h2>{ins.title}</h2>
                <p>{ins.detail}</p>
                <blockquote>↳ {ins.recommendation}</blockquote>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
